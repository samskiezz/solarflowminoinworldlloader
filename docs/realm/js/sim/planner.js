/**
 * Decision making: utility scoring of advertised actions (Infinite Axis
 * style) plus a small GOAP planner for multi-step goals.
 */
import { urgency } from './needs.js';
import { actionWeight } from './traits.js';
import { levelFromXp, skillForTask } from './skills.js';

/** Actions an agent can take when idle. Effects restore needs; tags drive trait weighting. */
export const BASE_ACTIONS = [
    { id: 'rest', label: 'Take a rest', tags: ['rest'], durationH: 1, effects: { energy: 35, focus: 10 }, category: 'self' },
    { id: 'break', label: 'Short break', tags: ['break'], durationH: 0.5, effects: { energy: 12, focus: 20 }, category: 'self' },
    { id: 'study', label: 'Study a standard', tags: ['study'], durationH: 1, effects: { mastery: 30, focus: -10 }, category: 'growth', xp: 15 },
    { id: 'reflect', label: 'Reflect on recent work', tags: ['reflect'], durationH: 0.5, effects: { mastery: 15, morale: 5 }, category: 'growth' },
    { id: 'social', label: 'Talk with the crew', tags: ['social'], durationH: 0.5, effects: { social: 30, morale: 10 }, category: 'self' },
    { id: 'inspect', label: 'Inspect recent installation', tags: ['inspect', 'checklist'], durationH: 1, effects: { safety: 30, focus: -15 }, category: 'work', xp: 10 },
    { id: 'mentor', label: 'Mentor a crew member', tags: ['mentor', 'social'], durationH: 1, effects: { social: 20, morale: 15, energy: -5 }, category: 'work', xp: 8 }
];

/**
 * Score one action for an agent.
 * considerations: need satisfaction (through urgency curves), trait weight,
 * skill fit for work tasks, and a small cooldown/novelty factor.
 */
export function scoreAction(agent, action, context = {}) {
    const u = urgency(agent.needs);
    let needGain = 0;
    let total = 0;
    for (const [need, delta] of Object.entries(action.effects || {})) {
        if (delta > 0) { needGain += (u[need] ?? 0) * (delta / 35); total += 1; }
    }
    const needScore = total ? Math.min(1, needGain / total) : 0.15;
    const traitScore = Math.min(2, (action.tags || []).reduce((w, tag) => w * actionWeight(agent.traits, tag), 1));
    let skillScore = 1;
    if (action.category === 'work' || action.category === 'job') {
        const skill = skillForTask((action.tags || [])[0]);
        const level = levelFromXp(agent.skills[skill] ?? 0);
        const difficulty = action.difficulty ?? 5;
        skillScore = Math.max(0.3, Math.min(1.5, 0.8 + (level - difficulty) * 0.07));
    }
    const priority = action.priority ?? (action.category === 'job' ? 1.4 : 1);
    const lastDone = context.lastActions ? context.lastActions[action.id] : undefined;
    const novelty = lastDone !== undefined && (context.now ?? 0) - lastDone < (action.durationH || 1) * 2 ? 0.6 : 1;
    const score = needScore * traitScore * skillScore * priority * novelty;
    return { id: action.id, score: Math.round(score * 1000) / 1000, parts: { needScore: Math.round(needScore * 100) / 100, traitScore, skillScore: Math.round(skillScore * 100) / 100, priority, novelty } };
}

/** Choose the best action (or weighted-random among the top N when `explore` is true). */
export function chooseAction(agent, actions = BASE_ACTIONS, context = {}) {
    const scored = actions.map((a) => ({ action: a, ...scoreAction(agent, a, context) })).sort((a, b) => b.score - a.score);
    if (!scored.length) return null;
    if (context.explore && scored.length > 1) {
        const top = scored.slice(0, 3);
        const sum = top.reduce((s, x) => s + x.score, 0) || 1;
        let r = (context.random ?? Math.random)() * sum;
        for (const item of top) { r -= item.score; if (r <= 0) return { ...item, ranking: scored }; }
    }
    return { ...scored[0], ranking: scored };
}

/**
 * GOAP-lite: breadth-first search over actions with preconditions/effects on a
 * boolean world state. Returns the shortest plan satisfying the goal.
 */
export function plan(goal, state, actions, { maxDepth = 12 } = {}) {
    const satisfies = (s) => Object.entries(goal).every(([k, v]) => Boolean(s[k]) === Boolean(v));
    const applicable = (s, a) => Object.entries(a.preconditions || {}).every(([k, v]) => Boolean(s[k]) === Boolean(v));
    const apply = (s, a) => ({ ...s, ...(a.effects || {}) });
    const key = (s) => JSON.stringify(Object.keys(s).sort().map((k) => [k, Boolean(s[k])]));
    if (satisfies(state)) return { plan: [], cost: 0 };
    const queue = [{ state, steps: [] }];
    const seen = new Set([key(state)]);
    while (queue.length) {
        const current = queue.shift();
        if (current.steps.length >= maxDepth) continue;
        for (const action of actions) {
            if (!applicable(current.state, action)) continue;
            const next = apply(current.state, action);
            const k = key(next);
            if (seen.has(k)) continue;
            const steps = [...current.steps, action.id];
            if (satisfies(next)) return { plan: steps, cost: steps.reduce((c, id) => c + (actions.find((a) => a.id === id).cost ?? 1), 0) };
            seen.add(k);
            queue.push({ state: next, steps });
        }
    }
    return { plan: null, cost: Infinity };
}

/** Standard job-completion planning actions. */
export const JOB_PLAN_ACTIONS = [
    { id: 'select_products', preconditions: {}, effects: { productsSelected: true }, cost: 1 },
    { id: 'verify_approval', preconditions: { productsSelected: true }, effects: { productsApproved: true }, cost: 1 },
    { id: 'size_strings', preconditions: { productsSelected: true }, effects: { stringsSized: true }, cost: 2 },
    { id: 'check_voltage_rise', preconditions: { productsSelected: true }, effects: { voltageRiseOk: true }, cost: 1 },
    { id: 'assess_battery_location', preconditions: {}, effects: { batteryLocationOk: true }, cost: 1 },
    { id: 'complete_design', preconditions: { stringsSized: true, voltageRiseOk: true, productsApproved: true }, effects: { designComplete: true }, cost: 1 },
    { id: 'install', preconditions: { designComplete: true }, effects: { installed: true }, cost: 4 },
    { id: 'commission', preconditions: { installed: true }, effects: { tested: true }, cost: 2 },
    { id: 'complete_checklists', preconditions: { installed: true }, effects: { checklistsDone: true }, cost: 2 },
    { id: 'claim_stcs', preconditions: { tested: true, checklistsDone: true, productsApproved: true }, effects: { stcsClaimed: true }, cost: 1 },
    { id: 'handover', preconditions: { tested: true }, effects: { handedOver: true }, cost: 1 }
];

export const FEATURES = [
    { id: 'planner.scoreAction', title: 'Utility scoring with need, trait and skill considerations', test: () => { const agent = { needs: { energy: 10, focus: 90, morale: 90, social: 90, mastery: 90, safety: 90 }, traits: [], skills: {} }; const rest = scoreAction(agent, BASE_ACTIONS[0]); const social = scoreAction(agent, BASE_ACTIONS[4]); return rest.score > social.score; } },
    { id: 'planner.chooseAction', title: 'Best action selection', test: () => { const agent = { needs: { energy: 90, focus: 90, morale: 90, social: 5, mastery: 90, safety: 90 }, traits: ['gregarious'], skills: {} }; return chooseAction(agent).id === 'social'; } },
    { id: 'planner.chooseAction.explore', title: 'Weighted-random exploration among top actions', test: () => { const agent = { needs: { energy: 50, focus: 50, morale: 50, social: 50, mastery: 50, safety: 50 }, traits: [], skills: {} }; const r = chooseAction(agent, BASE_ACTIONS, { explore: true, random: () => 0.99 }); return r && r.ranking.length === BASE_ACTIONS.length; } },
    { id: 'planner.novelty', title: 'Recently done actions are discounted', test: () => { const agent = { needs: { energy: 10, focus: 90, morale: 90, social: 90, mastery: 90, safety: 90 }, traits: [], skills: {} }; const a = scoreAction(agent, BASE_ACTIONS[0], { now: 1, lastActions: { rest: 0.5 } }); const b = scoreAction(agent, BASE_ACTIONS[0], { now: 10, lastActions: { rest: 0.5 } }); return a.score < b.score; } },
    { id: 'planner.goap', title: 'GOAP plan to claim STCs', test: () => { const r = plan({ stcsClaimed: true }, {}, JOB_PLAN_ACTIONS); return r.plan && r.plan[0] === 'select_products' && r.plan.at(-1) === 'claim_stcs' && r.plan.includes('commission'); } },
    { id: 'planner.goap.satisfied', title: 'GOAP returns empty plan when goal already met', test: () => plan({ installed: true }, { installed: true }, JOB_PLAN_ACTIONS).plan.length === 0 },
    { id: 'planner.goap.impossible', title: 'GOAP reports impossible goals', test: () => plan({ flying: true }, {}, JOB_PLAN_ACTIONS).plan === null }
];
