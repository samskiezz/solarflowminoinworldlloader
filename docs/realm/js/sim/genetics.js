/**
 * Digital DNA (ported from the Underworld genetics service): every minion
 * carries a base-pair string. Named loci project windows of it onto traits
 * in [0, 1] – personality, cognition, body, social, and an aptitude for each
 * realm skill. Breeding is real single-point crossover plus point mutation,
 * so traits drift and recombine across generations; forking is a high-rate
 * mutation without a partner. Deterministic from the DNA, so the same code
 * always expresses the same minion.
 */
import { TRAIT_IDS } from './traits.js';

export const BASE_PAIRS = ['A', 'T', 'G', 'C'];
export const DNA_LENGTH = 768;

export const LOCI = [
    // personality (Big Five)
    { name: 'openness', start: 0, length: 32 }, { name: 'conscientiousness', start: 32, length: 32 }, { name: 'extraversion', start: 64, length: 32 }, { name: 'agreeableness', start: 96, length: 32 }, { name: 'neuroticism', start: 128, length: 32 },
    // cognition
    { name: 'intelligence', start: 160, length: 48 }, { name: 'creativity', start: 208, length: 48 }, { name: 'memory', start: 256, length: 32 }, { name: 'focus', start: 288, length: 32 },
    // body
    { name: 'longevity', start: 320, length: 48 }, { name: 'vitality', start: 368, length: 32 }, { name: 'immune', start: 400, length: 32 }, { name: 'dexterity', start: 432, length: 32 },
    // social
    { name: 'charisma', start: 464, length: 32 }, { name: 'empathy', start: 496, length: 32 },
    // aptitude for each realm skill
    { name: 'apt_wiring_rules', start: 528, length: 30 }, { name: 'apt_pv_arrays', start: 558, length: 30 }, { name: 'apt_grid_connection', start: 588, length: 30 }, { name: 'apt_battery_systems', start: 618, length: 30 },
    { name: 'apt_cable_selection', start: 648, length: 30 }, { name: 'apt_verification', start: 678, length: 30 }, { name: 'apt_incentives', start: 708, length: 30 }, { name: 'apt_customer', start: 738, length: 30 }
];
export const LOCUS_BY_NAME = Object.fromEntries(LOCI.map((l) => [l.name, l]));
export const TRAIT_NAMES = LOCI.map((l) => l.name);

/** Small deterministic PRNG so tests and seeds are stable. */
export function seededRandom(seed) {
    let h = 2166136261 >>> 0;
    for (const ch of String(seed)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
    let a = h || 1;
    return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export function randomDna(random = Math.random, length = DNA_LENGTH) {
    let s = '';
    for (let i = 0; i < length; i++) s += BASE_PAIRS[Math.floor(random() * 4) % 4];
    return s;
}
/** Stable DNA for a named minion (the original roster keeps the same genes forever). */
export function dnaFromSeed(seed) { return randomDna(seededRandom(`dna:${seed}`)); }
export function isDna(s) { return typeof s === 'string' && s.length === DNA_LENGTH && /^[ATGC]+$/.test(s); }

function hashWindow(text) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
    return (h ^ (h >>> 16)) >>> 0;
}

/** Project one locus to [0, 1]. Same DNA + locus → same value. */
export function trait(dna, name) {
    const l = LOCUS_BY_NAME[name]; if (!l) throw new Error(`unknown locus ${name}`);
    return (hashWindow(dna.slice(l.start, l.start + l.length)) % 10000) / 10000;
}
export function traitVector(dna) { return Object.fromEntries(LOCI.map((l) => [l.name, Math.round(trait(dna, l.name) * 1000) / 1000])); }

export function crossover(a, b, random = Math.random) {
    const cut = 1 + Math.floor(random() * (a.length - 2));
    return a.slice(0, cut) + b.slice(cut);
}
export function mutate(dna, { rate = 0.004, random = Math.random } = {}) {
    const out = dna.split('');
    for (let i = 0; i < out.length; i++) if (random() < rate) { const choices = BASE_PAIRS.filter((x) => x !== out[i]); out[i] = choices[Math.floor(random() * 3) % 3]; }
    return out.join('');
}
/** Child DNA: crossover of two parents plus point mutation. */
export function breed(a, b, { mutationRate = 0.004, random = Math.random } = {}) { return mutate(crossover(a, b, random), { rate: mutationRate, random }); }
/** Digital clone with divergence, no partner. */
export function fork(dna, { divergence = 0.02, random = Math.random } = {}) { return mutate(dna, { rate: divergence, random }); }
export function hamming(a, b) { let n = 0; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) n++; return n; }
/** 1 = identical, ~0.25 = unrelated (chance matches). */
export function kinship(a, b) { return (a.length - hamming(a, b)) / a.length; }

/** Which two personality traits the genes express (continuous genes → the realm's named traits). */
export const TRAIT_FORMULAS = {
    meticulous: (t) => t.conscientiousness * 0.7 + t.focus * 0.3,
    gregarious: (t) => t.extraversion * 0.6 + t.charisma * 0.4,
    tinkerer: (t) => t.creativity * 0.5 + t.intelligence * 0.3 + t.openness * 0.2,
    sentinel: (t) => t.conscientiousness * 0.4 + t.neuroticism * 0.3 + t.empathy * 0.3,
    sprinter: (t) => t.vitality * 0.5 + t.dexterity * 0.3 + (1 - t.conscientiousness) * 0.2,
    scholar: (t) => t.memory * 0.5 + t.intelligence * 0.3 + t.openness * 0.2,
    steady: (t) => (1 - t.neuroticism) * 0.6 + t.focus * 0.4,
    optimist: (t) => (1 - t.neuroticism) * 0.4 + t.agreeableness * 0.3 + t.extraversion * 0.3
};
export function traitsFromDna(dna, count = 2) {
    const t = traitVector(dna);
    return Object.entries(TRAIT_FORMULAS).filter(([id]) => TRAIT_IDS.includes(id)).map(([id, f]) => [id, f(t)]).sort((a, b) => b[1] - a[1]).slice(0, count).map(([id]) => id);
}
/** Skill aptitudes 0.5–1.5: multiply XP gains for the skill. */
export function aptitudes(dna) {
    const out = {};
    for (const l of LOCI) if (l.name.startsWith('apt_')) out[l.name.slice(4)] = Math.round((0.5 + trait(dna, l.name)) * 100) / 100;
    return out;
}
/** Looks derived from the genes so children resemble parents (hue 0-360, build, height). */
export function appearance(dna) {
    const t = traitVector(dna);
    return { hue: Math.round(trait(dna, 'charisma') * 360), height: Math.round((0.9 + 0.2 * t.vitality) * 100) / 100, build: Math.round((0.9 + 0.2 * t.dexterity) * 100) / 100, skin: Math.floor(trait(dna, 'immune') * 5) };
}

export const FEATURES = [
    { id: 'genes.dna', title: 'Every minion carries deterministic digital DNA (768 base pairs over 23 loci)', test: () => { const a = dnaFromSeed('ATLAS'); return isDna(a) && a === dnaFromSeed('ATLAS') && a !== dnaFromSeed('BOLT') && LOCI.length === 23 && LOCI.every((l) => l.start + l.length <= DNA_LENGTH); } },
    { id: 'genes.traits', title: 'Loci project to stable traits in [0, 1]; the named personality traits and skill aptitudes derive from them', test: () => { const d = dnaFromSeed('NOVA'); const v = traitVector(d); const ids = traitsFromDna(d); const apt = aptitudes(d); return Object.keys(v).length === 23 && Object.values(v).every((x) => x >= 0 && x <= 1) && Math.round(trait(d, 'longevity') * 1000) / 1000 === v.longevity && ids.length === 2 && ids.every((i) => TRAIT_IDS.includes(i)) && Object.keys(apt).length === 8 && Object.values(apt).every((x) => x >= 0.5 && x <= 1.5); } },
    { id: 'genes.breed', title: 'Breeding is crossover plus mutation: children are related to both parents and never identical to either', test: () => { const r = seededRandom(5); const a = randomDna(r); const b = randomDna(r); const c = breed(a, b, { random: r }); const stranger = randomDna(r); return c.length === DNA_LENGTH && kinship(a, c) > 0.5 && kinship(b, c) > 0.3 && kinship(a, c) + kinship(b, c) > 1.2 && kinship(a, stranger) < 0.4 && c !== a && c !== b && hamming(a, fork(a, { random: r })) > 0 && kinship(a, fork(a, { random: r })) > 0.95; } },
    { id: 'genes.appearance', title: 'Looks (hue, height, build, skin) come from the genes so families resemble each other', test: () => { const ap = appearance(dnaFromSeed('KITE')); return ap.hue >= 0 && ap.hue < 360 && ap.height >= 0.9 && ap.height <= 1.1 && ap.skin >= 0 && ap.skin <= 4; } }
];
