/**
 * World: simulated clock, weather/events, crew of agents, jobs and the
 * credit ledger. One `tick(hours)` advances everything.
 */
import { Agent } from './agent.js';
import { rollEvent, mulberry32, evaluateAchievements, questsForJob, ACHIEVEMENTS } from './events.js';
import { createLedger, earn, effects as upgradeEffects } from './economy.js';
import { createJob, completeTask, stageTasks } from '../domain/jobs.js';

export const HOURS_PER_DAY = 24;

export class World {
    constructor({ seed = 1, startTime = Date.UTC(2026, 0, 5, 7), agents = [], jobs = [], ledger, stats, unlocked } = {}) {
        this.seed = seed;
        this.random = mulberry32(seed);
        this.time = startTime; // ms
        this.hour = 0; // simulated hours elapsed
        this.agents = agents.map((a) => (a instanceof Agent ? a : Agent.fromJSON(a, { now: () => this.time })));
        for (const a of this.agents) a.now = () => this.time;
        this.jobs = jobs;
        this.ledger = ledger || createLedger(100);
        this.stats = { jobsCreated: jobs.length, checklistsPassed: 0, checklistStreak: 0, commissioningPassed: 0, stcReady: 0, highVoltageDesigns: 0, batteryAssessmentsPassed: 0, clausesViewed: 0, expertAgents: 0, upgradesOwned: 0, reflections: 0, ...(stats || {}) };
        this.unlocked = unlocked || [];
        this.activeEvent = null;
        this.eventEndsAt = 0;
        this.feed = [];
        this.listeners = [];
    }

    on(listener) { this.listeners.push(listener); return () => { this.listeners = this.listeners.filter((l) => l !== listener); }; }
    emit(entry) {
        const item = { at: this.time, hour: this.hour, ...entry };
        this.feed.push(item);
        if (this.feed.length > 300) this.feed.splice(0, this.feed.length - 300);
        for (const l of this.listeners) { try { l(item); } catch (error) { /* listener errors never break the sim */ } }
        return item;
    }

    get clock() {
        const d = new Date(this.time);
        return { iso: d.toISOString(), day: Math.floor(this.hour / HOURS_PER_DAY) + 1, hourOfDay: d.getUTCHours(), isDaytime: d.getUTCHours() >= 6 && d.getUTCHours() < 19, label: d.toISOString().slice(0, 16).replace('T', ' ') };
    }

    addAgent(spec) {
        const agent = spec instanceof Agent ? spec : new Agent({ ...spec, now: () => this.time });
        agent.now = () => this.time;
        this.agents.push(agent);
        return agent;
    }

    agent(id) { return this.agents.find((a) => a.id === String(id).toUpperCase()) || null; }

    addJob(spec) {
        const job = spec.tasks ? spec : createJob({ ...spec, createdAt: new Date(this.time).toISOString() });
        this.jobs.push(job);
        this.stats.jobsCreated++;
        this.emit({ type: 'job_created', jobId: job.id, text: `New job ${job.id} for ${job.customer}` });
        this.checkAchievements();
        return job;
    }

    job(id) { return this.jobs.find((j) => j.id === id) || null; }

    /** Assign the next open stage task of a job to an agent. */
    assignNextTask(agentId, jobId, { tag = null, hours = 2, difficulty = 5 } = {}) {
        const agent = this.agent(agentId);
        const job = this.job(jobId);
        if (!agent || !job) return null;
        const next = stageTasks(job).find((t) => !t.done);
        if (!next) return null;
        const inferredTag = tag || inferTag(next.title, job.stage);
        const task = agent.assign({ id: next.key, label: next.title, tag: inferredTag, hours, difficulty, jobId: job.id });
        job.assignedTo = agent.id;
        this.emit({ type: 'assigned', agentId: agent.id, jobId: job.id, text: `${agent.name} takes "${next.title}" on ${job.id}` });
        return task;
    }

    tick(hours = 1) {
        this.hour += hours;
        this.time += hours * 3600000;
        if (!this.activeEvent || this.hour >= this.eventEndsAt) {
            if (this.random() < 0.15 * hours || !this.activeEvent) {
                const previous = this.activeEvent && this.activeEvent.id;
                this.activeEvent = rollEvent(this.random);
                this.eventEndsAt = this.hour + this.activeEvent.durationH;
                if (this.activeEvent.id !== 'quiet_day' && this.activeEvent.id !== previous) this.emit({ type: 'event', eventId: this.activeEvent.id, text: `${this.activeEvent.label}: ${this.activeEvent.note}` });
            }
        }
        const upgrades = upgradeEffects(this.ledger);
        const context = {
            random: this.random,
            installBlocked: Boolean(this.activeEvent && this.activeEvent.effects.installBlocked),
            xpBonus: (upgrades.xpBonus || 0) + ((this.activeEvent && this.activeEvent.effects.studyBonus) ? 0.5 : 0),
            energyRecovery: upgrades.energyRecovery || 0,
            speedBonus: (upgrades.installSpeed || 0) * 0.5 + (upgrades.designSpeed || 0) * 0.3,
            explore: true
        };
        const summary = [];
        for (const agent of this.agents) {
            const result = agent.step(hours, context);
            for (const event of result.events) this.handleAgentEvent(agent, event);
            summary.push({ agentId: agent.id, events: result.events, mood: result.mood });
        }
        this.stats.expertAgents = this.agents.filter((a) => Object.keys(a.skills).some((k) => a.level(k) >= 10)).length;
        this.stats.reflections = this.agents.reduce((n, a) => n + a.stats.reflections, 0);
        this.stats.upgradesOwned = this.ledger.owned.length;
        this.checkAchievements();
        return summary;
    }

    handleAgentEvent(agent, event) {
        if (event.type === 'task_complete') {
            const job = event.jobId ? this.job(event.jobId) : null;
            if (job && event.task in job.tasks) completeTask(job, event.task, true, new Date(this.time).toISOString());
            earn(this.ledger, 'task_complete', { at: this.time, agentId: agent.id, ref: event.task });
            this.emit({ type: 'task_complete', agentId: agent.id, jobId: event.jobId, text: `${agent.name} completed "${event.task.split(':')[1] || event.task}" (${event.chance} % skill chance)` });
        } else if (event.type === 'task_failed') {
            this.stats.checklistStreak = 0;
            earn(this.ledger, 'defect_found', { at: this.time, agentId: agent.id, ref: event.task });
            this.emit({ type: 'task_failed', agentId: agent.id, jobId: event.jobId, text: `${agent.name} found a defect in "${event.task.split(':')[1] || event.task}" and must rework it` });
        } else if (event.type === 'level_up') {
            this.emit({ type: 'level_up', agentId: agent.id, text: `${agent.name} reached ${event.key.replace(/_/g, ' ')} level ${event.to} (${agent.rankOf(event.key)})` });
        } else if (event.type === 'reflection') {
            for (const text of event.texts) this.emit({ type: 'reflection', agentId: agent.id, text: `${agent.name} reflects: ${text}` });
        }
    }

    recordChecklistResult(status) {
        if (status === 'PASS') { this.stats.checklistsPassed++; this.stats.checklistStreak++; earn(this.ledger, 'checklist_pass', { at: this.time }); }
        else if (status === 'FAIL') this.stats.checklistStreak = 0;
        this.checkAchievements();
    }

    recordCommissioning(status) {
        if (status === 'PASS') { this.stats.commissioningPassed++; earn(this.ledger, 'commissioning_pass', { at: this.time }); }
        this.checkAchievements();
    }

    recordStat(key, delta = 1) {
        this.stats[key] = (this.stats[key] || 0) + delta;
        this.checkAchievements();
    }

    checkAchievements() {
        const { unlocked, newly } = evaluateAchievements(this.stats, this.unlocked);
        this.unlocked = unlocked;
        for (const id of newly) this.emit({ type: 'achievement', achievementId: id, text: `Achievement unlocked: ${(ACHIEVEMENTS.find((a) => a.id === id) || { title: id }).title}` });
        return newly;
    }

    quests() { return this.jobs.filter((j) => j.stage !== 'complete').map(questsForJob); }

    toJSON() {
        return { seed: this.seed, time: this.time, hour: this.hour, agents: this.agents.map((a) => a.toJSON()), jobs: this.jobs, ledger: this.ledger, stats: this.stats, unlocked: this.unlocked, activeEvent: this.activeEvent, eventEndsAt: this.eventEndsAt, feed: this.feed.slice(-100) };
    }

    static fromJSON(data) {
        const world = new World({ seed: data.seed, startTime: data.time, agents: data.agents || [], jobs: data.jobs || [], ledger: data.ledger, stats: data.stats, unlocked: data.unlocked });
        world.hour = data.hour || 0;
        world.activeEvent = data.activeEvent || null;
        world.eventEndsAt = data.eventEndsAt || 0;
        world.feed = data.feed || [];
        return world;
    }
}

export function inferTag(title, stage) {
    const t = String(title).toLowerCase();
    if (/string|array|design|layout|yield/.test(t)) return 'design';
    if (/voltage|cable/.test(t)) return 'calculate';
    if (/battery/.test(t)) return 'battery';
    if (/stc|incentive|certificate|serial|assignment/.test(t)) return 'stc';
    if (/dnsp|export|approval/.test(t)) return 'grid';
    if (/install|array and|labels|safety/.test(t)) return 'install';
    if (/test|commission|settings|checklist/.test(t)) return 'commission';
    if (/owner|monitoring|warranty|proposal|customer|handover/.test(t)) return 'handover';
    return stage === 'lead' ? 'handover' : 'audit';
}

export const FEATURES = [
    { id: 'world.create', title: 'World with seeded clock and ledger', test: () => { const w = new World({ seed: 3 }); return w.clock.day === 1 && w.ledger.balance === 100; } },
    { id: 'world.addAgentAndJob', title: 'Add agents and jobs', test: () => { const w = new World(); w.addAgent({ id: 'atlas', name: 'Atlas' }); w.addJob({ customer: 'Ann', postcode: '2000', systemKw: 6.6 }); return w.agents.length === 1 && w.jobs.length === 1 && w.stats.jobsCreated === 1 && w.unlocked.includes('first_job'); } },
    { id: 'world.assignNextTask', title: 'Assign next open stage task', test: () => { const w = new World(); w.addAgent({ id: 'bolt' }); const j = w.addJob({ customer: 'B' }); const t = w.assignNextTask('bolt', j.id); return t && t.jobId === j.id && w.agent('bolt').currentTask.label === 'Capture site address and postcode'; } },
    { id: 'world.tick', title: 'Tick advances time, agents and completes job tasks', test: () => { const w = new World({ seed: 5 }); const a = w.addAgent({ id: 'bolt', traits: ['steady'], needs: { energy: 100, focus: 100, morale: 90, social: 90, mastery: 90, safety: 90 } }); const j = w.addJob({ customer: 'B' }); w.assignNextTask('bolt', j.id, { hours: 1, difficulty: 1 }); for (let i = 0; i < 4; i++) w.tick(1); return w.hour === 4 && Object.values(j.tasks).some(Boolean) && a.hoursWorked > 0 && w.feed.some((f) => f.type === 'task_complete' || f.type === 'task_failed'); } },
    { id: 'world.events', title: 'World events roll over time', test: () => { const w = new World({ seed: 9 }); for (let i = 0; i < 30; i++) w.tick(2); return w.activeEvent !== null; } },
    { id: 'world.quests', title: 'Quests derived from open jobs', test: () => { const w = new World(); w.addJob({ customer: 'Q' }); return w.quests().length === 1 && w.quests()[0].objectives.length === 3; } },
    { id: 'world.recordResults', title: 'Checklist/commissioning results earn credits and achievements', test: () => { const w = new World(); w.recordChecklistResult('PASS'); w.recordCommissioning('PASS'); return w.ledger.balance === 150 && w.unlocked.includes('first_pass') && w.unlocked.includes('commissioned'); } },
    { id: 'world.serialise', title: 'World round-trips through JSON', test: () => { const w = new World({ seed: 2 }); w.addAgent({ id: 'nova' }); w.addJob({ customer: 'S' }); w.tick(1); const b = World.fromJSON(JSON.parse(JSON.stringify(w.toJSON()))); return b.agents.length === 1 && b.jobs.length === 1 && b.hour === 1 && b.agent('nova').memory.records.length >= 1; } },
    { id: 'world.inferTag', title: 'Task title → skill tag inference', test: () => inferTag('String sizing and array voltage check', 'design') === 'design' && inferTag('Battery installed', 'install') === 'battery' && inferTag('STC entitlement calculated', 'quote') === 'stc' }
];
