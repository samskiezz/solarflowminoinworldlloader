/**
 * Skills = standards mastery. XP is earned from verified work; levels use a
 * quadratic curve (level n needs 50·n² XP), capped at 20.
 */

export const SKILL_DEFINITIONS = [
    { key: 'wiring_rules', label: 'Wiring Rules (AS/NZS 3000)', standard: 'AS_NZS_3000_2018' },
    { key: 'pv_arrays', label: 'PV arrays (AS/NZS 5033)', standard: 'AS_NZS_5033_2021' },
    { key: 'grid_connection', label: 'Grid connection (AS/NZS 4777.1/2)', standard: 'AS_NZS_4777_1_2024' },
    { key: 'battery_systems', label: 'Battery systems (AS/NZS 5139)', standard: 'AS_NZS_5139_2019' },
    { key: 'cable_selection', label: 'Cable selection (AS/NZS 3008)', standard: 'AS_NZS_3008_1_1' },
    { key: 'verification', label: 'Verification & testing (AS/NZS 3017)', standard: 'AS_NZS_3017_2022' },
    { key: 'incentives', label: 'Incentives & STCs', standard: null },
    { key: 'customer', label: 'Customer handover', standard: null }
];

export const MAX_LEVEL = 20;

export function xpForLevel(level) {
    return 50 * level * level;
}

export function levelFromXp(xp) {
    let level = 0;
    while (level < MAX_LEVEL && xp >= xpForLevel(level + 1)) level++;
    return level;
}

export function progressToNext(xp) {
    const level = levelFromXp(xp);
    if (level >= MAX_LEVEL) return { level, pct: 100, remaining: 0 };
    const current = xpForLevel(level);
    const next = xpForLevel(level + 1);
    return { level, pct: Math.round(((xp - current) / (next - current)) * 100), remaining: next - xp };
}

export function createSkills(initial = {}) {
    const skills = {};
    for (const def of SKILL_DEFINITIONS) skills[def.key] = Math.max(0, Math.round(initial[def.key] ?? 0));
    return skills;
}

/** Award XP; returns the new skills map plus any level-ups. */
export function awardXp(skills, key, amount, multiplier = 1) {
    if (!(key in skills)) throw new Error(`Unknown skill ${key}`);
    const before = levelFromXp(skills[key]);
    const next = { ...skills, [key]: skills[key] + Math.max(0, Math.round(amount * multiplier)) };
    const after = levelFromXp(next[key]);
    return { skills: next, levelUp: after > before ? { key, from: before, to: after } : null };
}

export function rank(level) {
    if (level >= 18) return 'Grandmaster';
    if (level >= 14) return 'Master';
    if (level >= 10) return 'Expert';
    if (level >= 6) return 'Journeyman';
    if (level >= 3) return 'Apprentice';
    return 'Novice';
}

/** Skill that a task tag maps to. */
export const TASK_SKILL_MAP = {
    design: 'pv_arrays', calculate: 'cable_selection', audit: 'wiring_rules', checklist: 'verification', install: 'pv_arrays',
    commission: 'verification', battery: 'battery_systems', grid: 'grid_connection', stc: 'incentives', handover: 'customer', study: 'wiring_rules', inspect: 'verification'
};

export function skillForTask(tag) {
    return TASK_SKILL_MAP[tag] || 'wiring_rules';
}

/** Success probability for a task of a difficulty given skill level. */
export function successChance(level, difficulty = 5, errorMultiplier = 1) {
    const base = 0.55 + (level - difficulty) * 0.05;
    const chance = Math.max(0.05, Math.min(0.99, base)) / errorMultiplier;
    return Math.round(Math.max(0.05, Math.min(0.99, chance)) * 100) / 100;
}

export const FEATURES = [
    { id: 'skills.definitions', title: 'Skill tree (8 skills)', test: () => SKILL_DEFINITIONS.length === 8 },
    { id: 'skills.levelCurve', title: 'Level curve and progress', test: () => levelFromXp(0) === 0 && levelFromXp(50) === 1 && levelFromXp(200) === 2 && progressToNext(125).pct === 50 },
    { id: 'skills.awardXp', title: 'Award XP with level-up detection', test: () => { const r = awardXp(createSkills(), 'pv_arrays', 60); return r.skills.pv_arrays === 60 && r.levelUp && r.levelUp.to === 1; } },
    { id: 'skills.rank', title: 'Rank titles', test: () => rank(0) === 'Novice' && rank(10) === 'Expert' && rank(20) === 'Grandmaster' },
    { id: 'skills.maxLevel', title: 'Level cap', test: () => levelFromXp(1e9) === MAX_LEVEL },
    { id: 'skills.skillForTask', title: 'Task tag → skill mapping', test: () => skillForTask('battery') === 'battery_systems' && skillForTask('unknown') === 'wiring_rules' },
    { id: 'skills.successChance', title: 'Success probability from skill vs difficulty', test: () => successChance(10, 5) > successChance(2, 5) && successChance(0, 10) === 0.05 }
];
