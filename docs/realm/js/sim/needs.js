/**
 * Needs-based motivation (The Sims style) with Dave Mark response curves.
 * Each need is 0–100 (100 = fully satisfied). Needs decay per simulated hour;
 * urgency = curve(1 − value/100) so a starving need dominates scoring.
 */

export const CURVES = {
    linear: (x) => clamp01(x),
    quadratic: (x) => clamp01(x * x),
    sqrt: (x) => clamp01(Math.sqrt(clamp01(x))),
    /** Steep logistic: near 0 while satisfied, rises sharply when depleted. */
    logistic: (x, k = 10, mid = 0.6) => clamp01(1 / (1 + Math.exp(-k * (clamp01(x) - mid)))),
    inverse: (x) => clamp01(1 - clamp01(x))
};

export function clamp01(x) {
    return Math.max(0, Math.min(1, Number.isFinite(x) ? x : 0));
}

/** Need definitions: decay per simulated hour of work, curve and what restores them. */
export const NEED_DEFINITIONS = [
    { key: 'energy', label: 'Energy', decayPerHour: 6, curve: 'logistic', restoredBy: ['rest', 'break'], description: 'Physical/mental stamina. Low energy slows work and raises error rates.' },
    { key: 'focus', label: 'Focus', decayPerHour: 8, curve: 'quadratic', restoredBy: ['break', 'walk', 'deep_work'], description: 'Attention reserve. Audits and calculations consume it.' },
    { key: 'morale', label: 'Morale', decayPerHour: 2, curve: 'quadratic', restoredBy: ['praise', 'completion', 'social'], description: 'Sense of progress and recognition.' },
    { key: 'social', label: 'Social', decayPerHour: 3, curve: 'sqrt', restoredBy: ['social', 'handover', 'mentoring'], description: 'Need for interaction with crew and customers.' },
    { key: 'mastery', label: 'Mastery', decayPerHour: 1.5, curve: 'linear', restoredBy: ['study', 'reflection', 'challenge'], description: 'Hunger to learn and apply standards knowledge.' },
    { key: 'safety', label: 'Safety confidence', decayPerHour: 1, curve: 'logistic', restoredBy: ['inspection', 'checklist'], description: 'Confidence that work is compliant. Drops when defects are found.' }
];

export function createNeeds(initial = {}) {
    const needs = {};
    for (const def of NEED_DEFINITIONS) needs[def.key] = clamp100(initial[def.key] ?? 80 + Math.random() * 20);
    return needs;
}

export function clamp100(value) {
    return Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
}

/** Decay needs for `hours` of simulated time; traits may scale decay per need. */
export function decayNeeds(needs, hours, modifiers = {}) {
    const next = { ...needs };
    for (const def of NEED_DEFINITIONS) {
        const scale = modifiers[def.key] ?? 1;
        next[def.key] = clamp100(next[def.key] - def.decayPerHour * hours * scale);
    }
    return next;
}

/** Apply an activity's effects: { needKey: delta }. */
export function applyEffects(needs, effects = {}) {
    const next = { ...needs };
    for (const [key, delta] of Object.entries(effects)) {
        if (key in next) next[key] = clamp100(next[key] + delta);
    }
    return next;
}

/** Urgency in 0–1 for each need through its response curve. */
export function urgency(needs) {
    const result = {};
    for (const def of NEED_DEFINITIONS) {
        const depletion = 1 - clamp100(needs[def.key]) / 100;
        result[def.key] = CURVES[def.curve](depletion);
    }
    return result;
}

export function mostUrgentNeed(needs) {
    const u = urgency(needs);
    return Object.entries(u).sort((a, b) => b[1] - a[1])[0][0];
}

/** Mood summary derived from needs (Sims-style moodlets). */
export function mood(needs) {
    const avg = NEED_DEFINITIONS.reduce((sum, d) => sum + clamp100(needs[d.key]), 0) / NEED_DEFINITIONS.length;
    const moodlets = [];
    if (needs.energy < 25) moodlets.push({ id: 'exhausted', label: 'Exhausted', effect: 'work speed −40 %' });
    else if (needs.energy < 50) moodlets.push({ id: 'tired', label: 'Tired', effect: 'work speed −15 %' });
    if (needs.focus < 30) moodlets.push({ id: 'scattered', label: 'Scattered', effect: 'error chance ×2' });
    if (needs.morale > 85) moodlets.push({ id: 'inspired', label: 'Inspired', effect: 'XP +20 %' });
    if (needs.morale < 30) moodlets.push({ id: 'discouraged', label: 'Discouraged', effect: 'XP −20 %' });
    if (needs.social < 25) moodlets.push({ id: 'lonely', label: 'Lonely', effect: 'seeks collaboration' });
    if (needs.mastery < 30) moodlets.push({ id: 'curious', label: 'Curious', effect: 'prefers study tasks' });
    if (needs.safety < 40) moodlets.push({ id: 'uneasy', label: 'Uneasy', effect: 'requests inspection' });
    const label = avg >= 80 ? 'Thriving' : avg >= 60 ? 'Steady' : avg >= 40 ? 'Strained' : 'Depleted';
    return { score: Math.round(avg), label, moodlets };
}

/** Work-speed multiplier from needs. */
export function efficiency(needs) {
    let factor = 1;
    if (needs.energy < 25) factor *= 0.6; else if (needs.energy < 50) factor *= 0.85;
    if (needs.focus < 30) factor *= 0.8;
    if (needs.morale > 85) factor *= 1.1;
    return Math.round(factor * 100) / 100;
}

export const FEATURES = [
    { id: 'needs.curves', title: 'Response curves (linear, quadratic, sqrt, logistic, inverse)', test: () => CURVES.logistic(0) < 0.01 && CURVES.logistic(1) > 0.97 && CURVES.quadratic(0.5) === 0.25 && CURVES.inverse(0.3) === 0.7 },
    { id: 'needs.create', title: 'Create needs in range', test: () => Object.values(createNeeds()).every((v) => v >= 0 && v <= 100) },
    { id: 'needs.decay', title: 'Needs decay with trait modifiers', test: () => { const n = createNeeds({ energy: 100 }); const d = decayNeeds(n, 2, { energy: 0.5 }); return d.energy === 94; } },
    { id: 'needs.applyEffects', title: 'Apply activity effects with clamping', test: () => applyEffects({ energy: 95, focus: 10 }, { energy: 20, focus: -50 }).energy === 100 },
    { id: 'needs.urgency', title: 'Urgency ranking', test: () => mostUrgentNeed(createNeeds({ energy: 5, focus: 90, morale: 90, social: 90, mastery: 90, safety: 90 })) === 'energy' },
    { id: 'needs.mood', title: 'Mood and moodlets', test: () => { const m = mood(createNeeds({ energy: 10, focus: 20, morale: 90, social: 90, mastery: 90, safety: 90 })); return m.moodlets.some((x) => x.id === 'exhausted') && m.moodlets.some((x) => x.id === 'inspired'); } },
    { id: 'needs.efficiency', title: 'Efficiency multiplier', test: () => efficiency({ energy: 10, focus: 10, morale: 50 }) === 0.48 && efficiency({ energy: 90, focus: 90, morale: 90 }) === 1.1 }
];
