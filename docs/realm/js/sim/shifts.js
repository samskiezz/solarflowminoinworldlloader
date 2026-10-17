/**
 * Shift roster (ported from minion-roster-system.js): the crew works three
 * shifts around the clock. On shift and between job tasks a minion studies –
 * spec sheets, manuals, standards – earning credits into a personal purse and
 * XP in the matching skill, takes breaks on a work cycle, spends on upgrades
 * and chases a savings goal. State lives in `agent.meta.shift`, so it rides
 * along with the agent's own JSON.
 */
import { awardXp } from './skills.js';
import { applyEffects } from './needs.js';
import { trait } from './genetics.js';
import { studyPick } from '../domain/library.js';

export const SHIFTS = [
    { id: 'morning', label: 'Morning', start: 7, end: 15, icon: '🌅' },
    { id: 'afternoon', label: 'Afternoon', start: 15, end: 23, icon: '🌇' },
    { id: 'night', label: 'Night', start: 23, end: 7, icon: '🌙' }
];
export const WORK_CYCLES = {
    standard: { label: 'Standard', work: 6, break: 1.5 },
    intensive: { label: 'Intensive', work: 4, break: 2 },
    maintenance: { label: 'Maintenance', work: 8, break: 0.5 }
};
export const STUDY_TASKS = [
    { id: 'spec_sheet_processing', label: 'Spec sheet processing', credits: 25, difficulty: 'easy', hours: 2, skill: 'pv_arrays', domain: 'solar panels' },
    { id: 'installation_manual_study', label: 'Installation manual study', credits: 45, difficulty: 'medium', hours: 3, skill: 'wiring_rules', domain: 'installation procedures' },
    { id: 'standards_analysis', label: 'Standards analysis', credits: 75, difficulty: 'hard', hours: 4, skill: 'wiring_rules', domain: 'electrical standards' },
    { id: 'product_comparison', label: 'Product comparison', credits: 35, difficulty: 'medium', hours: 3, skill: 'grid_connection', domain: 'inverters' },
    { id: 'technical_qa_response', label: 'Technical Q&A response', credits: 15, difficulty: 'easy', hours: 2, skill: 'customer', domain: 'Australian regulations' },
    { id: 'document_ocr_processing', label: 'Document OCR processing', credits: 20, difficulty: 'easy', hours: 2, skill: 'battery_systems', domain: 'batteries' },
    { id: 'knowledge_synthesis', label: 'Knowledge synthesis', credits: 55, difficulty: 'hard', hours: 4, skill: 'grid_connection', domain: 'grid connection' }
];
export const SHOP = [
    { id: 'learning_module', item: 'Advanced learning module', cost: 100, benefit: 'learning' },
    { id: 'energy_booster', item: 'Energy booster', cost: 50, benefit: 'energy' },
    { id: 'knowledge_access', item: 'Knowledge database access', cost: 150, benefit: 'expertise' },
    { id: 'collab_tools', item: 'Collaboration tools', cost: 75, benefit: 'collaboration' },
    { id: 'consciousness', item: 'Consciousness enhancer', cost: 200, benefit: 'consciousness' }
];
export const SHORT_GOALS = ['Master 50 new product specifications this week', 'Process 25 installation manuals completely', 'Reach 90 % accuracy in technical Q&A', 'Learn every AS/NZS 5033 safety requirement', 'Earn 500 credits from document processing', 'Help 10 other minions with their study', 'Master battery installation expertise', 'Master inverter spacing requirements'];
export const LONG_GOALS = ['Become the leading expert in panel specifications', 'Develop autonomous installation planning', 'Build a complete Australian standards compliance system', 'Build predictive maintenance knowledge', 'Found a training academy for new recruits', 'Provide real-time technical support', 'Master every battery chemistry and safety protocol', 'Automate compliance checking'];

const hashOf = (text) => { let x = 2166136261; for (const c of String(text)) { x ^= c.charCodeAt(0); x = Math.imul(x, 16777619) >>> 0; } return x; };

export function shiftFor(agent, index = null) { return SHIFTS[(index != null ? index : hashOf(agent.id)) % 3].id; }
export function cycleFor(agent) { const t = agent.traits || []; return t.includes('sprinter') ? 'intensive' : t.includes('steady') || t.includes('meticulous') ? 'maintenance' : 'standard'; }
export function isOnShift(shiftId, hourOfDay) { const s = SHIFTS.find((x) => x.id === shiftId); if (!s) return false; return s.start < s.end ? hourOfDay >= s.start && hourOfDay < s.end : hourOfDay >= s.start || hourOfDay < s.end; }
export function shiftNow(hourOfDay) { return SHIFTS.find((s) => isOnShift(s.id, hourOfDay)); }

/** Make sure an agent carries a shift record; returns it. */
export function ensureShift(agent, index = null) {
    if (!agent.meta.shift) {
        const h = hashOf(`goal:${agent.id}`);
        agent.meta.shift = { id: shiftFor(agent, index), cycle: cycleFor(agent), status: 'off', hoursWorked: 0, breakRemaining: 0, task: null, taskProgressH: 0, credits: 0, earned: 0, spent: 0, tasksDone: 0, breaks: 0, purchases: [], savingsGoal: 500, goalsMet: 0, learningBonus: 0, goals: { short: SHORT_GOALS[h % SHORT_GOALS.length], long: LONG_GOALS[(h >> 3) % LONG_GOALS.length] } };
    }
    return agent.meta.shift;
}

/** Average skill level stands in for the legacy "expertise level": easy tasks drop away as a minion grows, hard ones need a base. */
export function expertise(agent) { const keys = Object.keys(agent.skills || {}); if (!keys.length) return 0; return keys.reduce((n, k) => n + agent.level(k), 0) / keys.length; }
export function pickTask(agent, random = Math.random) {
    const level = expertise(agent);
    const pool = STUDY_TASKS.filter((t) => !(t.difficulty === 'easy' && level > 8) && !(t.difficulty === 'hard' && level < 3));
    return (pool.length ? pool : STUDY_TASKS)[Math.floor(random() * (pool.length || STUDY_TASKS.length))];
}

function complete(world, agent, s, task) {
    const bonus = 1 + (trait(agent.dna, 'conscientiousness') - 0.5) + s.learningBonus;
    const credits = Math.max(1, Math.floor(task.credits * bonus));
    s.credits += credits; s.earned += credits; s.tasksDone++; s.task = null; s.taskProgressH = 0;
    agent.skills = awardXp(agent.skills, task.skill, 6 + (task.difficulty === 'hard' ? 6 : task.difficulty === 'medium' ? 3 : 0), agent.aptitude(task.skill) * (1 + s.learningBonus)).skills;
    agent.needs = applyEffects(agent.needs, { mastery: 4, morale: 2 });
    // Completions go to the minion's own memory (the Roster window reads them); the world feed only hears about purchases and savings goals, so it is not flooded.
    // When the Library has books, the minion reads a real passage and remembers it.
    const pick = world.library ? studyPick(world.library, world.random, { studied: s.studied || {} }) : null;
    if (pick) { s.studied = s.studied || {}; s.studied[pick.bookId] = (s.studied[pick.bookId] || 0) + 1; agent.remember(`Studied ${pick.summary}`, { tags: ['study', 'shift', 'library'], importance: 4 }); }
    agent.remember(`Finished ${task.label.toLowerCase()} on the ${s.id} shift (+${credits} credits)`, { tags: ['study', 'shift'], importance: 3 });
    if (world.random() < 0.3) spend(world, agent, s);
    if (s.credits >= s.savingsGoal) { const prize = Math.floor(s.savingsGoal * 0.1); s.credits += prize; s.earned += prize; s.goalsMet++; s.savingsGoal = Math.floor(s.savingsGoal * 1.5); agent.needs = applyEffects(agent.needs, { morale: 10 }); world.emit({ type: 'shift', agentId: agent.id, text: `${agent.name} hit a savings goal (+${prize} bonus credits); next goal ${s.savingsGoal}` }); }
}
export function spend(world, agent, s) {
    const affordable = SHOP.filter((p) => p.cost <= s.credits); if (!affordable.length) return null;
    const p = affordable[Math.floor(world.random() * affordable.length)];
    s.credits -= p.cost; s.spent += p.cost; s.purchases.push({ id: p.id, item: p.item, cost: p.cost, at: world.time });
    if (p.benefit === 'learning') s.learningBonus = Math.round((s.learningBonus + 0.1) * 100) / 100;
    else if (p.benefit === 'energy') agent.needs = applyEffects(agent.needs, { energy: 20 });
    else if (p.benefit === 'expertise') { const keys = Object.keys(agent.skills); const k = keys[Math.floor(world.random() * keys.length)]; agent.skills = awardXp(agent.skills, k, 25, 1).skills; }
    else if (p.benefit === 'collaboration') agent.needs = applyEffects(agent.needs, { social: 15 });
    else if (p.benefit === 'consciousness') agent.needs = applyEffects(agent.needs, { mastery: 15, focus: 5 });
    agent.remember(`Bought ${p.item.toLowerCase()} for ${p.cost} credits`, { tags: ['shift', 'purchase'], importance: 3 });
    return p;
}

/** Called by World.tick after the agents have stepped. Non-invasive: job tasks keep priority; study fills the rest of the shift. */
export function tickShifts(world, hours = 1) {
    const hour = world.clock.hourOfDay;
    const crew = world.agents.filter((a) => a.meta.hired !== false && (a.capability ?? 1) >= 0.5);
    crew.forEach((agent, i) => {
        const s = ensureShift(agent, i);
        if (!isOnShift(s.id, hour)) { if (s.status !== 'off') { s.status = 'off'; s.hoursWorked = 0; s.task = null; s.taskProgressH = 0; } return; }
        if (s.status === 'break') { s.breakRemaining -= hours; if (s.breakRemaining <= 0) { s.status = 'ready'; s.breakRemaining = 0; s.hoursWorked = 0; agent.needs = applyEffects(agent.needs, { energy: 10 }); } return; }
        s.status = 'working'; s.hoursWorked += hours;
        if (agent.currentTask) { s.task = null; s.taskProgressH = 0; }
        else {
            if (!s.task) s.task = pickTask(agent, world.random).id;
            s.taskProgressH += hours;
            const task = STUDY_TASKS.find((t) => t.id === s.task);
            if (task && s.taskProgressH >= task.hours) complete(world, agent, s, task);
        }
        const cycle = WORK_CYCLES[s.cycle] || WORK_CYCLES.standard;
        if (s.hoursWorked >= cycle.work) { s.status = 'break'; s.breakRemaining = cycle.break; s.breaks++; s.task = null; s.taskProgressH = 0; }
    });
}

/** The board the Roster window shows: every shift with who is on it and what they are doing now. */
export function rosterBoard(world) {
    const hour = world.clock.hourOfDay;
    const crew = world.agents.filter((a) => a.meta.hired !== false);
    const shifts = SHIFTS.map((sh) => ({ ...sh, onNow: isOnShift(sh.id, hour), members: crew.filter((a) => ensureShift(a).id === sh.id).map((a) => { const s = a.meta.shift; const task = s.task ? STUDY_TASKS.find((t) => t.id === s.task) : null; return { agent: a, status: s.status, doing: a.currentTask ? a.currentTask.label : task ? task.label : s.status === 'break' ? 'On a break' : s.status === 'working' ? 'Choosing a task' : 'Off shift', hoursWorked: Math.round(s.hoursWorked * 10) / 10, credits: s.credits, cycle: s.cycle }; }) }));
    return { hour, current: shiftNow(hour)?.id || null, shifts, onDuty: shifts.flatMap((s) => s.members).filter((m) => m.status === 'working').length, onBreak: shifts.flatMap((s) => s.members).filter((m) => m.status === 'break').length, offShift: shifts.flatMap((s) => s.members).filter((m) => m.status === 'off' || m.status === 'ready').length };
}
export function economySummary(world) {
    const crew = world.agents.filter((a) => a.meta.hired !== false).map((a) => ({ agent: a, s: ensureShift(a) }));
    return { credits: crew.reduce((n, x) => n + x.s.credits, 0), earned: crew.reduce((n, x) => n + x.s.earned, 0), spent: crew.reduce((n, x) => n + x.s.spent, 0), tasksDone: crew.reduce((n, x) => n + x.s.tasksDone, 0), purchases: crew.flatMap((x) => x.s.purchases.map((p) => ({ ...p, agentId: x.agent.id, name: x.agent.name }))).sort((a, b) => b.at - a.at), goalsMet: crew.reduce((n, x) => n + x.s.goalsMet, 0), richest: crew.slice().sort((a, b) => b.s.credits - a.s.credits).slice(0, 5).map((x) => ({ id: x.agent.id, name: x.agent.name, credits: x.s.credits, tasksDone: x.s.tasksDone })) };
}

export const FEATURES = [
    { id: 'shifts.shifts', title: 'Three shifts cover the clock: 07–15, 15–23, 23–07', test: () => SHIFTS.length === 3 && isOnShift('morning', 7) && !isOnShift('morning', 15) && isOnShift('afternoon', 22) && isOnShift('night', 23) && isOnShift('night', 3) && !isOnShift('night', 7) && [...Array(24).keys()].every((h) => SHIFTS.filter((s) => isOnShift(s.id, h)).length === 1) },
    { id: 'shifts.assignment', title: 'Crew are spread across the shifts in roster order and get a work cycle from their traits', test: () => { const a = { id: 'A', traits: ['sprinter'], meta: {} }; const b = { id: 'B', traits: ['meticulous'], meta: {} }; const c = { id: 'C', traits: ['optimist'], meta: {} }; return shiftFor(a, 0) === 'morning' && shiftFor(b, 1) === 'afternoon' && shiftFor(c, 2) === 'night' && cycleFor(a) === 'intensive' && cycleFor(b) === 'maintenance' && cycleFor(c) === 'standard' && ensureShift(a, 0).goals.short && ensureShift(a, 0).savingsGoal === 500; } },
    { id: 'shifts.pickTask', title: 'Study tasks match expertise: easy ones fall away as a minion grows, hard ones need a base', test: () => { const low = { skills: { wiring_rules: 0 }, level: () => 0 }; const high = { skills: { wiring_rules: 0 }, level: () => 12 }; const r = () => 0; return pickTask(low, r).difficulty !== 'hard' && pickTask(high, r).difficulty !== 'easy' && STUDY_TASKS.length === 7; } },
    { id: 'shifts.world', title: 'Over a day the crew study on shift, earn credits and XP, take breaks on their cycle and the purse round-trips', test: async () => { const { World } = await import('./world.js'); const w = new World({ seed: 5 }); for (let i = 0; i < 3; i++) w.addAgent({ id: `W${i}`, needs: { energy: 100, focus: 100, morale: 90, social: 90, mastery: 90, safety: 90 } }); for (let i = 0; i < 48; i++) w.tick(0.5); const e = economySummary(w); const breaks = w.agents.reduce((n, a) => n + a.meta.shift.breaks, 0); const copy = World.fromJSON(JSON.parse(JSON.stringify(w.toJSON()))); return e.tasksDone >= 3 && e.earned > 0 && breaks >= 1 && w.agents.some((a) => a.memory.records.some((m) => /shift/.test(m.text))) && copy.agent('W0').meta.shift.id === w.agent('W0').meta.shift.id && copy.agent('W0').meta.shift.earned === w.agent('W0').meta.shift.earned; } },
    { id: 'shifts.library', title: 'With a library on the shelf, each finished study task reads a real passage into the minion\'s memory', test: async () => { const { World } = await import('./world.js'); const { createLibrary, FIXTURE } = await import('../domain/library.js'); const w = new World({ seed: 5 }); w.library = createLibrary(FIXTURE); for (let i = 0; i < 3; i++) w.addAgent({ id: `L${i}`, needs: { energy: 100, focus: 100, morale: 90, social: 90, mastery: 90, safety: 90 } }); for (let i = 0; i < 48; i++) w.tick(0.5); const studied = w.agents.flatMap((a) => a.memory.records.filter((m) => /^Studied (AS\/NZS 5139|CER)/.test(m.text))); return studied.length >= 3 && w.agents.some((a) => a.meta.shift.studied && Object.keys(a.meta.shift.studied).length >= 1); } },
    { id: 'shifts.board', title: 'The roster board shows every shift, who is on it and what they are doing', test: async () => { const { World } = await import('./world.js'); const w = new World({ seed: 2 }); for (let i = 0; i < 6; i++) w.addAgent({ id: `B${i}` }); w.addAgent({ id: 'TOWN', meta: { hired: false } }); w.tick(1); const b = rosterBoard(w); return b.shifts.length === 3 && b.shifts.flatMap((s) => s.members).length === 6 && b.current === 'morning' && b.shifts.find((s) => s.id === 'morning').onNow && b.onDuty + b.onBreak + b.offShift === 6 && b.shifts[0].members.every((m) => typeof m.doing === 'string'); } },
    { id: 'shifts.spending', title: 'Minions spend their purse in the shop and the benefit lands on needs, skills or learning speed', test: async () => { const { World } = await import('./world.js'); const w = new World({ seed: 3 }); const a = w.addAgent({ id: 'RICH', needs: { energy: 50, focus: 50, morale: 50, social: 50, mastery: 50, safety: 50 } }); const s = ensureShift(a); s.credits = 1000; const before = { ...a.needs, skills: { ...a.skills }, lb: s.learningBonus }; const p = spend(w, a, s); const changed = p.benefit === 'learning' ? s.learningBonus > before.lb : p.benefit === 'expertise' ? Object.keys(a.skills).some((k) => a.skills[k] > before.skills[k]) : p.benefit === 'energy' ? a.needs.energy > before.energy : p.benefit === 'collaboration' ? a.needs.social > before.social : a.needs.mastery > before.mastery; return p && s.credits === 1000 - p.cost && s.purchases.length === 1 && changed && a.memory.records.some((m) => /Bought/.test(m.text)); } }
];
