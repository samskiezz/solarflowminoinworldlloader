/**
 * World: simulated clock, weather/events, crew of agents, jobs and the
 * credit ledger. One `tick(hours)` advances everything.
 */
import { Agent } from './agent.js';
import { rollEvent, mulberry32, evaluateAchievements, questsForJob, ACHIEVEMENTS } from './events.js';
import { createLedger, earn, effects as upgradeEffects } from './economy.js';
import { createJob, completeTask, stageTasks } from '../domain/jobs.js';
import { ensureGenes, lifeStage, capability, socialise, maybePartner, canBreed, makeChild, linkFamily, determineDeath, partnerOf, familyTree, POPULATION_CAP, DAY } from './lifecycle.js';
import { trait } from './genetics.js';
import { epochProgress, companyIndex, epochInputs } from './epochs.js';
import { Chronicle } from './narrative.js';
import { tickShifts } from './shifts.js';
import { Workforce } from './workforce.js';
import { Programme } from './programme.js';

export const HOURS_PER_DAY = 24;

export class World {
    constructor({ seed = 1, startTime = Date.UTC(2026, 0, 5, 7), agents = [], jobs = [], ledger, stats, unlocked, population = null, memorial = [], chronicle = null, workforce = null, findings = [], programme = null } = {}) {
        this.seed = seed;
        this.random = mulberry32(seed);
        this.time = startTime; // ms
        this.hour = 0; // simulated hours elapsed
        this.agents = agents.map((a) => (a instanceof Agent ? a : Agent.fromJSON(a, { now: () => this.time })));
        for (const a of this.agents) a.now = () => this.time;
        this.jobs = jobs;
        this.ledger = ledger || createLedger(100);
        this.stats = { jobsCreated: jobs.length, checklistsPassed: 0, checklistStreak: 0, commissioningPassed: 0, stcReady: 0, highVoltageDesigns: 0, batteryAssessmentsPassed: 0, clausesViewed: 0, expertAgents: 0, upgradesOwned: 0, reflections: 0, births: 0, deaths: 0, findingsResolved: 0, ...(stats || {}) };
        // Lifecycle: population cap, counters and the pacing accumulators; the memorial remembers the dead (and lends their souls to the newborn).
        this.population = { cap: POPULATION_CAP, births: 0, deaths: 0, generation: 0, mortality: true, breeding: true, hoursSinceSocial: 0, hoursSinceDaily: 0, ...(population || {}) };
        this.memorial = memorial || [];
        for (const a of this.agents) ensureGenes(a);
        this.unlocked = unlocked || [];
        // The Chronicle: archetypes, quests, conflicts, debates and the stories the town tells (sim/narrative.js).
        this.chronicle = chronicle instanceof Chronicle ? chronicle : Chronicle.fromJSON(chronicle);
        // The Workforce: Ultron, the managers and a thousand workers passing every task research → execute → audit → review → sign-off (sim/workforce.js).
        this.workforce = workforce instanceof Workforce ? workforce : Workforce.fromJSON(workforce);
        this.findings = findings || [];
        // The Programme: the thousand-feature list as workforce tasks (sim/programme.js). Items load from docs/data/programme.json; the state lives here.
        this.programme = programme instanceof Programme ? programme : Programme.fromJSON(programme);
        this.programmeHours = 0;
        this.activeEvent = null;
        this.eventEndsAt = 0;
        this.feed = [];
        this.listeners = [];
    }

    on(listener) { this.listeners.push(listener); return () => { this.listeners = this.listeners.filter((l) => l !== listener); }; }
    emit(entry) {
        const item = { at: this.time, hour: this.hour, ...entry };
        this.feed.push(item);
        if (this.feed.length > 600) this.feed.splice(0, this.feed.length - 600);
        for (const l of this.listeners) { try { l(item); } catch (error) { /* listener errors never break the sim */ } }
        return item;
    }

    get clock() {
        const d = new Date(this.time);
        return { iso: d.toISOString(), day: Math.floor(this.hour / HOURS_PER_DAY) + 1, hourOfDay: d.getUTCHours(), isDaytime: d.getUTCHours() >= 6 && d.getUTCHours() < 19, label: d.toISOString().slice(0, 16).replace('T', ' ') };
    }

    addAgent(spec) {
        const agent = spec instanceof Agent ? spec : new Agent({ ...spec, now: () => this.time });
        agent.now = () => this.time; ensureGenes(agent);
        agent.capability = capability(lifeStage(agent, this.time));
        this.agents.push(agent);
        return agent;
    }

    agent(id) { return this.agents.find((a) => a.id === String(id).toUpperCase()) || null; }
    /** Hired crew only (townsfolk minions wait to be recruited). */
    crew() { return this.agents.filter((a) => a.meta.hired !== false); }
    townsfolk() { return this.agents.filter((a) => a.meta.hired === false); }
    recruit(id, cost = 0) {
        const agent = this.agent(id); if (!agent) return { ok: false, reason: 'Unknown minion' };
        if (agent.meta.hired !== false) return { ok: false, reason: 'Already in the crew' };
        if ((agent.capability ?? 1) < 1 && lifeStage(agent, this.time) !== 'elder') return { ok: false, reason: `${agent.name} is still ${lifeStage(agent, this.time) === 'infant' ? 'an' : 'a'} ${lifeStage(agent, this.time)} – too young to work` };
        if (this.ledger.balance < cost) return { ok: false, reason: `Need ${cost - this.ledger.balance} more credits` };
        if (cost) { this.ledger.balance -= cost; this.ledger.entries.push({ at: this.time, type: 'recruit', amount: -cost, balance: this.ledger.balance, ref: agent.id }); }
        agent.meta.hired = true; agent.remember('Joined the crew', { tags: ['social', 'assignment'], importance: 6 });
        this.emit({ type: 'hired', agentId: agent.id, text: `${agent.name} (${agent.meta.title || agent.role}) joined the crew` });
        return { ok: true, agent };
    }

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
        if (!agent || !job || (agent.capability ?? 1) < 0.5) return null;
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
        this.tickLife(hours);
        tickShifts(this, hours);
        this.chronicle.tick(this, hours);
        this.workforce.tick(this, hours);
        this.programmeHours += hours; if (this.programmeHours >= 6) { this.programmeHours = 0; if (this.programme.loaded) this.programme.sweep(this, { library: this.library || null }); }
        this.stats.expertAgents = this.agents.filter((a) => Object.keys(a.skills).some((k) => a.level(k) >= 10)).length;
        this.stats.reflections = this.agents.reduce((n, a) => n + a.stats.reflections, 0);
        this.stats.upgradesOwned = this.ledger.owned.length;
        this.checkAchievements();
        return summary;
    }

    /** Ageing, friendships, partners, births and deaths. Social encounters every 6 simulated hours, the daily roll once a day. */
    tickLife(hours = 1) {
        const p = this.population;
        for (const a of this.agents) { const stage = lifeStage(a, this.time); a.capability = capability(stage); if (a.meta.stage !== stage) { const was = a.meta.stage; a.meta.stage = stage; if (was && stage === 'adult') this.emit({ type: 'grown', agentId: a.id, text: `${a.name} is grown up and can be recruited` }); if (stage === 'elder') { a.meta.elder = true; this.emit({ type: 'elder', agentId: a.id, text: `${a.name} has become an elder of Solarhaven` }); } } }
        p.hoursSinceSocial += hours;
        while (p.hoursSinceSocial >= 6) {
            p.hoursSinceSocial -= 6;
            const pool = this.agents.filter((a) => (a.capability ?? 1) >= 0.3);
            const pairs = Math.max(1, Math.ceil(pool.length / 4));
            for (let i = 0; i < pairs && pool.length > 1; i++) {
                const a = pool[Math.floor(this.random() * pool.length)]; const b = pool[Math.floor(this.random() * pool.length)]; if (a === b) continue;
                const before = (a.relationships[b.id] || {}).kind; const r = socialise(a, b, { now: this.time });
                if (r && r.kind !== before && r.kind === 'rival') this.emit({ type: 'rivalry', agentId: a.id, text: `${a.name} and ${b.name} have fallen out` });
                if (r && r.kind === 'friend' && maybePartner(a, b, this.agents, { now: this.time, random: this.random })) this.emit({ type: 'partnered', agentId: a.id, text: `${a.name} and ${b.name} are now partners` });
            }
        }
        p.hoursSinceDaily += hours;
        while (p.hoursSinceDaily >= 24) {
            p.hoursSinceDaily -= 24;
            if (p.breeding !== false) {
                const seen = new Set();
                for (const a of this.agents) {
                    const b = partnerOf(a, this.agents); if (!b || seen.has(b.id)) continue; seen.add(a.id);
                    if (!canBreed(a, b, { now: this.time, agents: this.agents, cap: p.cap })) continue;
                    const chance = 0.05 + 0.1 * ((trait(a.dna, 'empathy') + trait(b.dna, 'empathy')) / 2);
                    if (this.random() < chance) this.birth(a, b);
                }
            }
            if (p.mortality !== false) for (const a of [...this.agents]) { const cause = determineDeath(a, { now: this.time, random: this.random }); if (cause) this.die(a, cause); }
        }
    }
    birth(a, b) {
        const soul = this.memorial.find((m) => !m.soulTaken) || null;
        const child = this.addAgent(makeChild(a, b, { now: this.time, random: this.random, taken: new Set(this.agents.map((x) => x.id)), soul }));
        linkFamily(child, a, b, this.agents, this.time);
        if (soul) soul.soulTaken = true;
        this.population.births++; this.stats.births++; this.population.generation = Math.max(this.population.generation, child.generation);
        child.remember(`Born to ${a.name} and ${b.name}`, { tags: ['family'], importance: 8 }); a.remember(`${child.name} was born`, { tags: ['family'], importance: 9 }); b.remember(`${child.name} was born`, { tags: ['family'], importance: 9 });
        this.emit({ type: 'birth', agentId: child.id, text: `${a.name} and ${b.name} welcome ${child.name} ${child.surname || ''} (generation ${child.generation})${soul ? `, who carries the soul of ${soul.name}` : ''}` });
        this.checkAchievements();
        return child;
    }
    die(agent, cause = 'old age') {
        const idx = this.agents.indexOf(agent); if (idx < 0) return null;
        this.agents.splice(idx, 1);
        for (const j of this.jobs) if (j.assignedTo === agent.id) j.assignedTo = null;
        for (const other of this.agents) if (other.relationships[agent.id]) delete other.relationships[agent.id];
        const entry = { id: agent.id, name: agent.name, surname: agent.surname, generation: agent.generation, parents: agent.parents, relationships: agent.relationships, born: agent.born, died: this.time, ageDays: agent.born == null ? null : Math.round((this.time - agent.born) / DAY), cause, title: agent.meta.title || agent.role, skills: { ...agent.skills }, tasksDone: agent.stats.tasksDone, soulTaken: false };
        this.memorial.push(entry); if (this.memorial.length > 200) this.memorial.splice(0, this.memorial.length - 200);
        this.population.deaths++; this.stats.deaths++;
        this.emit({ type: 'death', agentId: agent.id, text: `${agent.name} (${entry.title}) died of ${cause}${entry.ageDays ? ` at ${Math.round(entry.ageDays)} days` : ''} – remembered at the memorial` });
        return entry;
    }
    /** The player arranges a match between two adults (credits). */
    arrangeMatch(aId, bId, cost = 60) {
        const a = this.agent(aId); const b = this.agent(bId); if (!a || !b || a === b) return { ok: false, reason: 'Pick two different minions' };
        if (lifeStage(a, this.time) !== 'adult' || lifeStage(b, this.time) !== 'adult') return { ok: false, reason: 'Both must be adults' };
        if (partnerOf(a, this.agents) || partnerOf(b, this.agents)) return { ok: false, reason: 'One of them already has a partner' };
        if (['parent', 'child', 'sibling'].includes((a.relationships[b.id] || {}).kind)) return { ok: false, reason: 'They are family' };
        if (this.ledger.balance < cost) return { ok: false, reason: `Need ${cost} credits` };
        this.ledger.balance -= cost; this.ledger.entries.push({ at: this.time, type: 'match', amount: -cost, balance: this.ledger.balance, ref: `${a.id}+${b.id}` });
        a.relationships[b.id] = { kind: 'partner', strength: 0.7, since: this.time }; b.relationships[a.id] = { kind: 'partner', strength: 0.7, since: this.time };
        this.emit({ type: 'partnered', agentId: a.id, text: `${a.name} and ${b.name} are now partners (arranged)` });
        return { ok: true };
    }
    family() { return familyTree(this.agents, this.memorial); }
    /** Where the company stands on the epoch ladder (pass the business model when one is loaded). */
    epoch(model = null) { return epochProgress(companyIndex(epochInputs(this, model))); }

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
        return { seed: this.seed, time: this.time, hour: this.hour, agents: this.agents.map((a) => a.toJSON()), jobs: this.jobs, ledger: this.ledger, stats: this.stats, unlocked: this.unlocked, activeEvent: this.activeEvent, eventEndsAt: this.eventEndsAt, feed: this.feed.slice(-100), population: this.population, memorial: this.memorial, chronicle: this.chronicle.toJSON(), programme: this.programme.toJSON(), workforce: this.workforce.toJSON() };
    }

    static fromJSON(data) {
        const world = new World({ seed: data.seed, startTime: data.time, agents: data.agents || [], jobs: data.jobs || [], ledger: data.ledger, stats: data.stats, unlocked: data.unlocked, population: data.population, memorial: data.memorial, chronicle: data.chronicle || null, workforce: data.workforce || null, programme: data.programme || null });
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
    { id: 'world.recruit', title: 'Townsfolk minions can be recruited into the crew for credits', test: () => { const w = new World({ seed: 3 }); w.addAgent({ id: 'X', meta: { hired: false } }); w.addAgent({ id: 'Y' }); const before = w.crew().length; const poor = w.recruit('X', 999); w.ledger.balance = 500; const ok = w.recruit('X', 100); const dup = w.recruit('X', 100); return before === 1 && !poor.ok && ok.ok && w.crew().length === 2 && w.townsfolk().length === 0 && !dup.ok && w.ledger.balance === 400; } },
    { id: 'world.create', title: 'World with seeded clock and ledger', test: () => { const w = new World({ seed: 3 }); return w.clock.day === 1 && w.ledger.balance === 100; } },
    { id: 'world.addAgentAndJob', title: 'Add agents and jobs', test: () => { const w = new World(); w.addAgent({ id: 'atlas', name: 'Atlas' }); w.addJob({ customer: 'Ann', postcode: '2000', systemKw: 6.6 }); return w.agents.length === 1 && w.jobs.length === 1 && w.stats.jobsCreated === 1 && w.unlocked.includes('first_job'); } },
    { id: 'world.assignNextTask', title: 'Assign next open stage task', test: () => { const w = new World(); w.addAgent({ id: 'bolt' }); const j = w.addJob({ customer: 'B' }); const t = w.assignNextTask('bolt', j.id); return t && t.jobId === j.id && w.agent('bolt').currentTask.label === 'Capture site address and postcode'; } },
    { id: 'world.tick', title: 'Tick advances time, agents and completes job tasks', test: () => { const w = new World({ seed: 5 }); const a = w.addAgent({ id: 'bolt', traits: ['steady'], needs: { energy: 100, focus: 100, morale: 90, social: 90, mastery: 90, safety: 90 } }); const j = w.addJob({ customer: 'B' }); w.assignNextTask('bolt', j.id, { hours: 1, difficulty: 1 }); for (let i = 0; i < 4; i++) w.tick(1); return w.hour === 4 && Object.values(j.tasks).some(Boolean) && a.hoursWorked > 0 && w.feed.some((f) => f.type === 'task_complete' || f.type === 'task_failed'); } },
    { id: 'world.events', title: 'World events roll over time', test: () => { const w = new World({ seed: 9 }); for (let i = 0; i < 30; i++) w.tick(2); return w.activeEvent !== null; } },
    { id: 'world.quests', title: 'Quests derived from open jobs', test: () => { const w = new World(); w.addJob({ customer: 'Q' }); return w.quests().length === 1 && w.quests()[0].objectives.length === 3; } },
    { id: 'world.recordResults', title: 'Checklist/commissioning results earn credits and achievements', test: () => { const w = new World(); w.recordChecklistResult('PASS'); w.recordCommissioning('PASS'); return w.ledger.balance === 150 && w.unlocked.includes('first_pass') && w.unlocked.includes('commissioned'); } },
    { id: 'world.serialise', title: 'World round-trips through JSON', test: () => { const w = new World({ seed: 2 }); w.addAgent({ id: 'nova' }); w.addJob({ customer: 'S' }); w.tick(1); const b = World.fromJSON(JSON.parse(JSON.stringify(w.toJSON()))); return b.agents.length === 1 && b.jobs.length === 1 && b.hour === 1 && b.agent('nova').memory.records.length >= 1; } },
    { id: 'world.lifecycle', title: 'Over time minions befriend each other, pair up and have children who grow, inherit and can be recruited when grown', test: () => { const w = new World({ seed: 11 }); for (let i = 0; i < 12; i++) w.addAgent({ id: `M${i}`, needs: { energy: 100, focus: 100, morale: 90, social: 90, mastery: 90, safety: 90 } }); for (let i = 0; i < 400 && !w.population.births; i++) w.tick(6); const child = w.agents.find((a) => a.generation === 1); const young = child ? w.recruit(child.id, 0) : { ok: false }; const townsfolk = child && child.meta.hired === false; for (let i = 0; i < 70 * 4; i++) w.tick(6); const grown = child ? w.recruit(child.id, 0) : { ok: false }; const fam = w.family(); return w.population.births >= 1 && child && child.parents.length === 2 && townsfolk && !young.ok && /too young/.test(young.reason) && grown.ok && child.capability === 1 && fam.find((f) => f.id === child.id).parents.length === 2 && w.feed.some((f) => f.type === 'birth') && w.feed.some((f) => f.type === 'partnered'); } },
    { id: 'world.death', title: 'The old die and are remembered at the memorial; the next child born carries their soul and a share of their skills', test: () => { const w = new World({ seed: 4 }); const old = w.addAgent({ id: 'OLD', name: 'Old', born: w.time - 5000 * DAY, skills: { pv_arrays: 2000 } }); const a = w.addAgent({ id: 'A' }); const b = w.addAgent({ id: 'B' }); w.arrangeMatch('A', 'B', 0); for (let i = 0; i < 40 && w.agents.includes(old); i++) w.tick(24); const gone = !w.agents.includes(old) && w.memorial[0].cause === 'old age'; const child = w.birth(a, b); const copy = World.fromJSON(JSON.parse(JSON.stringify(w.toJSON()))); return gone && child.meta.soulOf === 'Old' && child.skills.pv_arrays >= 300 && w.memorial[0].soulTaken && copy.memorial.length === 1 && copy.population.births === 1 && copy.agent(child.id).parents.includes('A'); } },
    { id: 'world.arrangeMatch', title: 'The player can arrange a match between two adults for credits; family and the already-partnered are refused', test: () => { const w = new World({ seed: 2 }); w.addAgent({ id: 'A' }); w.addAgent({ id: 'B' }); w.addAgent({ id: 'C' }); const poor = w.arrangeMatch('A', 'B', 999); const ok = w.arrangeMatch('A', 'B', 50); const taken = w.arrangeMatch('A', 'C', 50); return !poor.ok && ok.ok && w.ledger.balance === 50 && !taken.ok && /partner/.test(taken.reason) && w.agent('A').relationships.B.kind === 'partner'; } },
    { id: 'world.epoch', title: 'The world reports its company epoch from installed work, crew and resolved findings', test: () => { const w = new World({ seed: 1 }); const e0 = w.epoch(); w.addJob({ customer: 'X', systemKw: 10 }).stage = 'complete'; w.recordStat('findingsResolved', 20); const e1 = w.epoch(); return e0.id === 'first_quote' && e1.index > e0.index && e1.next && e1.total === 24; } },
    { id: 'world.inferTag', title: 'Task title → skill tag inference', test: () => inferTag('String sizing and array voltage check', 'design') === 'design' && inferTag('Battery installed', 'install') === 'battery' && inferTag('STC entitlement calculated', 'quote') === 'stc' }
];
