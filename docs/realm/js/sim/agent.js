/**
 * Agent: a crew member with needs, traits, skills, memory and a planner.
 * `step()` advances the agent by simulated hours: decays needs, chooses an
 * action (job task if assigned, else self-care/growth), applies effects,
 * records memories and reflects when due.
 */
import { createNeeds, decayNeeds, applyEffects, mood, efficiency } from './needs.js';
import { traitsFromSeed, decayModifiers, errorRateMultiplier, speedMultiplier, xpMultiplier } from './traits.js';
import { createSkills, awardXp, levelFromXp, skillForTask, successChance, rank } from './skills.js';
import { MemoryStream } from './memory.js';
import { chooseAction, BASE_ACTIONS } from './planner.js';

export const AUTONOMY_LEVELS = ['observe', 'suggest', 'semi', 'full'];

export class Agent {
    constructor({ id, name, tier = 1, role = 'OPERATOR', traits, needs, skills, memory, autonomy = 'semi', avatar = null, now = () => Date.now() } = {}) {
        this.id = String(id || name || 'MINION').toUpperCase();
        this.name = name || this.id;
        this.tier = tier;
        this.role = role;
        this.avatar = avatar;
        this.traits = traits || traitsFromSeed(this.id);
        this.needs = createNeeds(needs);
        this.skills = createSkills(skills);
        this.memory = memory instanceof MemoryStream ? memory : (memory ? MemoryStream.fromJSON(memory, { now }) : new MemoryStream({ now }));
        this.autonomy = AUTONOMY_LEVELS.includes(autonomy) ? autonomy : 'semi';
        this.now = now;
        this.currentTask = null;
        this.lastActions = {};
        this.hoursWorked = 0;
        this.stats = { tasksDone: 0, tasksFailed: 0, defectsFound: 0, reflections: 0 };
        this.log = [];
    }

    get mood() { return mood(this.needs); }
    get efficiency() { return Math.round(efficiency(this.needs) * speedMultiplier(this.traits) * 100) / 100; }
    level(skillKey) { return levelFromXp(this.skills[skillKey] ?? 0); }
    rankOf(skillKey) { return rank(this.level(skillKey)); }
    bestSkill() { return Object.entries(this.skills).sort((a, b) => b[1] - a[1])[0]; }

    assign(task) {
        // task: { id, label, tag, difficulty, hours, jobId }
        this.currentTask = { ...task, remainingH: task.hours ?? 2, startedAt: this.now() };
        this.remember(`Assigned to ${task.label}${task.jobId ? ` for ${task.jobId}` : ''}`, { tags: [task.tag, 'assignment'] });
        return this.currentTask;
    }

    remember(text, options = {}) {
        return this.memory.add(text, { ...options, at: options.at ?? this.now() });
    }

    /** Advance the agent by `hours`. Returns a summary of what happened. */
    step(hours = 1, context = {}) {
        const random = context.random ?? Math.random;
        const at = this.now();
        const events = [];
        this.needs = decayNeeds(this.needs, hours, decayModifiers(this.traits));

        const m = mood(this.needs);
        const canWork = this.needs.energy > 15 && !(context.installBlocked && this.currentTask && this.currentTask.tag === 'install');

        if (this.currentTask && canWork && (this.autonomy !== 'observe')) {
            const progress = hours * this.efficiency * (1 + (context.speedBonus || 0));
            this.currentTask.remainingH -= progress;
            this.hoursWorked += hours;
            this.needs = applyEffects(this.needs, { energy: -4 * hours, focus: -6 * hours, mastery: 4 * hours });
            events.push({ type: 'work', task: this.currentTask.id, progress: Math.round(progress * 100) / 100 });
            if (this.currentTask.remainingH <= 0) {
                const skill = skillForTask(this.currentTask.tag);
                const chance = successChance(this.level(skill), this.currentTask.difficulty ?? 5, errorRateMultiplier(this.traits));
                const success = random() < chance;
                const xp = awardXp(this.skills, skill, success ? 20 + (this.currentTask.difficulty ?? 5) * 2 : 8, xpMultiplier(this.traits) * (m.moodlets.some((x) => x.id === 'inspired') ? 1.2 : 1) * (1 + (context.xpBonus || 0)));
                this.skills = xp.skills;
                if (xp.levelUp) events.push({ type: 'level_up', ...xp.levelUp });
                this.stats[success ? 'tasksDone' : 'tasksFailed']++;
                this.needs = applyEffects(this.needs, success ? { morale: 15, safety: 5 } : { morale: -10, safety: -10 });
                this.remember(`${success ? 'Completed' : 'Had to rework'} ${this.currentTask.label}${this.currentTask.jobId ? ` on ${this.currentTask.jobId}` : ''} (${success ? 'pass' : 'defect found'})`, { tags: [this.currentTask.tag, success ? 'pass' : 'defect'], importance: success ? 4 : 7 });
                events.push({ type: success ? 'task_complete' : 'task_failed', task: this.currentTask.id, jobId: this.currentTask.jobId, chance: Math.round(chance * 100) });
                this.currentTask = null;
            }
        } else {
            const actions = context.actions || BASE_ACTIONS;
            const choice = chooseAction(this, actions, { now: this.hoursWorked, lastActions: this.lastActions, explore: context.explore, random });
            if (choice) {
                const effects = { ...choice.action.effects };
                if (context.energyRecovery && effects.energy > 0) effects.energy = Math.round(effects.energy * (1 + context.energyRecovery));
                this.needs = applyEffects(this.needs, effects);
                this.lastActions[choice.id] = this.hoursWorked;
                this.hoursWorked += choice.action.durationH || 1;
                if (choice.action.xp) {
                    const skill = skillForTask(choice.action.tags[0]);
                    const xp = awardXp(this.skills, skill, choice.action.xp, xpMultiplier(this.traits) * (1 + (context.xpBonus || 0)));
                    this.skills = xp.skills;
                    if (xp.levelUp) events.push({ type: 'level_up', ...xp.levelUp });
                }
                if (choice.id === 'reflect' || this.memory.shouldReflect(at)) {
                    const reflections = this.memory.reflect({ now: at });
                    this.stats.reflections += reflections.length;
                    if (reflections.length) events.push({ type: 'reflection', texts: reflections.map((r) => r.text) });
                }
                this.remember(`${choice.action.label}`, { tags: choice.action.tags, importance: 2 });
                events.push({ type: 'action', action: choice.id, score: choice.score });
            }
        }
        if (this.memory.shouldReflect(at)) {
            const reflections = this.memory.reflect({ now: at });
            this.stats.reflections += reflections.length;
            if (reflections.length) events.push({ type: 'reflection', texts: reflections.map((r) => r.text) });
        }
        this.log.push({ at, hours, events });
        if (this.log.length > 200) this.log.splice(0, this.log.length - 200);
        return { events, mood: mood(this.needs), needs: { ...this.needs } };
    }

    toJSON() {
        return { id: this.id, name: this.name, tier: this.tier, role: this.role, avatar: this.avatar, traits: this.traits, needs: this.needs, skills: this.skills, memory: this.memory.toJSON(), autonomy: this.autonomy, currentTask: this.currentTask, lastActions: this.lastActions, hoursWorked: this.hoursWorked, stats: this.stats };
    }

    static fromJSON(data, options = {}) {
        const agent = new Agent({ ...data, ...options });
        agent.currentTask = data.currentTask || null;
        agent.lastActions = data.lastActions || {};
        agent.hoursWorked = data.hoursWorked || 0;
        agent.stats = { tasksDone: 0, tasksFailed: 0, defectsFound: 0, reflections: 0, ...(data.stats || {}) };
        return agent;
    }
}

export const FEATURES = [
    { id: 'agent.create', title: 'Agent creation with deterministic traits', test: () => { const a = new Agent({ id: 'atlas', name: 'Atlas' }); return a.id === 'ATLAS' && a.traits.length === 2 && Object.keys(a.needs).length === 6; } },
    { id: 'agent.assignAndWork', title: 'Assigned task progresses and completes with XP', test: () => { let t = 0; const a = new Agent({ id: 'bolt', traits: ['steady'], needs: { energy: 100, focus: 100, morale: 80, social: 80, mastery: 80, safety: 80 }, now: () => t }); a.assign({ id: 'T1', label: 'String sizing', tag: 'design', difficulty: 3, hours: 2, jobId: 'J1' }); const r1 = a.step(1, { random: () => 0.1 }); t += 3600000; const r2 = a.step(1.5, { random: () => 0.1 }); return r1.events[0].type === 'work' && r2.events.some((e) => e.type === 'task_complete') && a.skills.pv_arrays > 0 && a.currentTask === null; } },
    { id: 'agent.idleBehaviour', title: 'Idle agent chooses self-care actions', test: () => { const a = new Agent({ id: 'nova', traits: ['steady'], needs: { energy: 10, focus: 90, morale: 90, social: 90, mastery: 90, safety: 90 }, now: () => 0 }); const r = a.step(1); return r.events.some((e) => e.type === 'action' && (e.action === 'rest' || e.action === 'break')) && a.needs.energy > 10; } },
    { id: 'agent.observeAutonomy', title: 'Observe autonomy never works tasks', test: () => { const a = new Agent({ id: 'x', autonomy: 'observe', now: () => 0 }); a.assign({ id: 'T', label: 'x', tag: 'design', hours: 1 }); a.step(5); return a.currentTask !== null && a.currentTask.remainingH === 1; } },
    { id: 'agent.reflection', title: 'Agent reflects after important memories', test: () => { const a = new Agent({ id: 'sable', needs: { energy: 90, focus: 90, morale: 90, social: 90, mastery: 90, safety: 90 }, now: () => 0 }); a.memory.reflectionThreshold = 10; a.remember('Isolator failed inspection', { tags: ['isolator'] }); a.remember('Another isolator defect', { tags: ['isolator'] }); const r = a.step(0.5); return r.events.some((e) => e.type === 'reflection') && a.stats.reflections >= 1; } },
    { id: 'agent.serialise', title: 'Agent round-trips through JSON', test: () => { const a = new Agent({ id: 'kite', now: () => 0 }); a.remember('hello'); const b = Agent.fromJSON(JSON.parse(JSON.stringify(a.toJSON())), { now: () => 0 }); return b.id === 'KITE' && b.memory.records.length === 1 && JSON.stringify(b.traits) === JSON.stringify(a.traits); } },
    { id: 'agent.efficiency', title: 'Efficiency combines needs and traits', test: () => new Agent({ id: 'z', traits: ['sprinter'], needs: { energy: 100, focus: 100, morale: 50, social: 50, mastery: 50, safety: 50 } }).efficiency === 1.3 },
    { id: 'agent.installBlocked', title: 'Storm blocks install tasks', test: () => { const a = new Agent({ id: 'q', needs: { energy: 100, focus: 100, morale: 50, social: 50, mastery: 50, safety: 50 }, now: () => 0 }); a.assign({ id: 'I', label: 'Install', tag: 'install', hours: 2 }); a.step(1, { installBlocked: true }); return a.currentTask.remainingH === 2; } }
];
