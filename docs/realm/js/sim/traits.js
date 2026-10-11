/**
 * Personality traits: each trait re-weights action advertisements and need decay.
 */

export const TRAITS = {
    meticulous: { label: 'Meticulous', description: 'Drawn to audits and checklists; fewer errors, slower.', actionWeights: { audit: 1.5, checklist: 1.4, design: 1.1, rush: 0.5 }, decay: { focus: 1.2 }, errorRate: 0.6, speed: 0.9 },
    gregarious: { label: 'Gregarious', description: 'Thrives on handovers and mentoring.', actionWeights: { handover: 1.5, mentor: 1.5, social: 1.4 }, decay: { social: 1.6 }, errorRate: 1.0, speed: 1.0 },
    tinkerer: { label: 'Tinkerer', description: 'Loves calculations and design puzzles.', actionWeights: { design: 1.5, calculate: 1.5, study: 1.2 }, decay: { mastery: 1.5 }, errorRate: 1.0, speed: 1.1 },
    sentinel: { label: 'Sentinel', description: 'Safety first; requests inspections and flags risks.', actionWeights: { inspect: 1.6, audit: 1.2, checklist: 1.2 }, decay: { safety: 1.5 }, errorRate: 0.7, speed: 0.95 },
    sprinter: { label: 'Sprinter', description: 'Fast, burns energy quickly, slightly error-prone.', actionWeights: { install: 1.4, rush: 1.5 }, decay: { energy: 1.4 }, errorRate: 1.3, speed: 1.3 },
    scholar: { label: 'Scholar', description: 'Studies standards; XP gains are higher.', actionWeights: { study: 1.8, reflect: 1.4 }, decay: { mastery: 1.8 }, errorRate: 0.9, speed: 0.95, xpBonus: 1.25 },
    steady: { label: 'Steady', description: 'Even temperament; slow need decay.', actionWeights: {}, decay: { energy: 0.8, morale: 0.7, focus: 0.85 }, errorRate: 1.0, speed: 1.0 },
    optimist: { label: 'Optimist', description: 'Morale recovers fast; lifts crew morale.', actionWeights: { social: 1.2 }, decay: { morale: 0.5 }, errorRate: 1.0, speed: 1.0, crewMorale: 2 }
};

export const TRAIT_IDS = Object.keys(TRAITS);

export function traitById(id) {
    return TRAITS[id] || null;
}

/** Combined action weight for a set of traits. */
export function actionWeight(traitIds = [], actionTag) {
    const w = traitIds.reduce((acc, id) => acc * ((TRAITS[id] && TRAITS[id].actionWeights[actionTag]) ?? 1), 1);
    return Math.round(w * 1e6) / 1e6;
}

/** Combined need decay modifiers. */
export function decayModifiers(traitIds = []) {
    const mods = {};
    for (const id of traitIds) {
        const trait = TRAITS[id];
        if (!trait) continue;
        for (const [need, factor] of Object.entries(trait.decay)) mods[need] = (mods[need] ?? 1) * factor;
    }
    return mods;
}

export function errorRateMultiplier(traitIds = []) {
    return traitIds.reduce((m, id) => m * ((TRAITS[id] && TRAITS[id].errorRate) ?? 1), 1);
}

export function speedMultiplier(traitIds = []) {
    return traitIds.reduce((m, id) => m * ((TRAITS[id] && TRAITS[id].speed) ?? 1), 1);
}

export function xpMultiplier(traitIds = []) {
    return traitIds.reduce((m, id) => m * ((TRAITS[id] && TRAITS[id].xpBonus) ?? 1), 1);
}

/** Deterministic trait pick from a seed string (so a minion's traits are stable). */
export function traitsFromSeed(seed, count = 2) {
    let h = 2166136261;
    for (const ch of String(seed)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
    const ids = [...TRAIT_IDS];
    const picked = [];
    while (picked.length < count && ids.length) {
        h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
        picked.push(ids.splice(h % ids.length, 1)[0]);
    }
    return picked;
}

export const FEATURES = [
    { id: 'traits.catalogue', title: 'Trait catalogue (8 traits)', test: () => TRAIT_IDS.length === 8 && TRAIT_IDS.every((id) => TRAITS[id].label) },
    { id: 'traits.actionWeight', title: 'Trait action weighting', test: () => actionWeight(['meticulous'], 'audit') === 1.5 && actionWeight(['meticulous', 'sentinel'], 'audit') === 1.8 && actionWeight([], 'audit') === 1 },
    { id: 'traits.decayModifiers', title: 'Trait decay modifiers combine', test: () => Math.abs(decayModifiers(['sprinter', 'steady']).energy - 1.12) < 1e-9 },
    { id: 'traits.multipliers', title: 'Error/speed/XP multipliers', test: () => errorRateMultiplier(['sprinter']) === 1.3 && speedMultiplier(['sprinter', 'meticulous']) > 1.1 && xpMultiplier(['scholar']) === 1.25 },
    { id: 'traits.fromSeed', title: 'Deterministic traits from seed', test: () => { const a = traitsFromSeed('ATLAS'); return a.length === 2 && a[0] !== a[1] && JSON.stringify(a) === JSON.stringify(traitsFromSeed('ATLAS')); } }
];
