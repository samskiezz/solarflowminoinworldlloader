/**
 * Lifecycle (ported from the Underworld lifecycle service): minions age
 * through infant → child → adolescent → adult → elder, make friends and
 * rivals, pair up, breed children who inherit genes, looks and a share of
 * their parents' skills, and eventually die of old age – their soul passing
 * to the next child born. Everything here is pure and deterministic given
 * the world's random source, so it is testable without the renderer.
 */
import { trait, breed, kinship, traitsFromDna, aptitudes, appearance, isDna, dnaFromSeed, seededRandom } from './genetics.js';

export const DAY = 86400000;
export const LIFE_STAGES = [{ id: 'infant', fromDays: 0, capability: 0 }, { id: 'child', fromDays: 7, capability: 0.3 }, { id: 'adolescent', fromDays: 30, capability: 0.7 }, { id: 'adult', fromDays: 60, capability: 1 }];
export const ELDER_CAPABILITY = 0.8;
export const RELATIONSHIPS = ['friend', 'rival', 'partner', 'parent', 'child', 'sibling'];
export const POPULATION_CAP = 60;
export const BREED_COOLDOWN_DAYS = 45;

export const GIVEN_NAMES = ['Ash', 'Blaze', 'Cinder', 'Dawn', 'Ember', 'Flint', 'Gale', 'Halo', 'Iris', 'Jet', 'Kestrel', 'Lark', 'Mica', 'North', 'Opal', 'Pike', 'Quest', 'Reed', 'Sol', 'Tide', 'Umber', 'Vale', 'Wisp', 'Xen', 'Yarrow', 'Zephyr', 'Arc', 'Beam', 'Cove', 'Drift', 'Fern', 'Glow', 'Haze', 'Ion', 'Juniper', 'Kelp', 'Luna', 'Moth', 'Nook', 'Onyx', 'Pearl', 'Quartz', 'Ridge', 'Spark', 'Thorn', 'Volt', 'Wren', 'Zinc'];

export function ensureGenes(agent) {
    if (!isDna(agent.dna)) agent.dna = dnaFromSeed(agent.id);
    if (!agent.relationships) agent.relationships = {};
    if (!agent.lineage) agent.lineage = { births: 0, lastBirth: null };
    if (agent.generation == null) agent.generation = 0;
    if (!agent.parents) agent.parents = [];
    return agent;
}

export function ageDays(agent, now) { return agent.born == null ? null : Math.max(0, (now - agent.born) / DAY); }
/** Days a minion can expect to live: the longevity gene carries most of it (≈1.5–3 simulated years). */
export function lifespanDays(agent) { return Math.round(540 + 540 * trait(agent.dna, 'longevity') + 60 * trait(agent.dna, 'intelligence')); }
export function lifeStage(agent, now) {
    const age = ageDays(agent, now);
    if (age == null) return 'adult'; // founding minions arrive grown
    if (age > lifespanDays(agent) * 0.8) return 'elder';
    let stage = LIFE_STAGES[0];
    for (const s of LIFE_STAGES) if (age >= s.fromDays) stage = s;
    return stage.id;
}
export function capability(stage) { return stage === 'elder' ? ELDER_CAPABILITY : (LIFE_STAGES.find((s) => s.id === stage) || LIFE_STAGES[3]).capability; }

/** How well two minions get on: agreeableness and extraversion carry it, shared role and similar openness help. */
export function compatibility(a, b) {
    const ta = (n) => trait(a.dna, n); const tb = (n) => trait(b.dna, n);
    const agree = (ta('agreeableness') + tb('agreeableness')) / 2; const extra = (ta('extraversion') + tb('extraversion')) / 2;
    const openGap = Math.abs(ta('openness') - tb('openness'));
    return Math.round((0.45 * agree + 0.3 * extra + (a.role === b.role ? 0.1 : 0) + 0.15 * (1 - openGap)) * 1000) / 1000;
}
export function relationship(a, otherId) { return (a.relationships || {})[otherId] || null; }
function setRel(a, b, kind, strength, now) { a.relationships[b.id] = { kind, strength: Math.round(Math.min(1, Math.max(0, strength)) * 1000) / 1000, since: (a.relationships[b.id] && a.relationships[b.id].kind === kind ? a.relationships[b.id].since : now) }; }
function family(a, b) { const r = relationship(a, b.id); return r && ['parent', 'child', 'sibling'].includes(r.kind); }

/** One encounter between two minions: friendships strengthen, incompatible pairs become rivals, partners stay partners. */
export function socialise(a, b, { now = 0 } = {}) {
    ensureGenes(a); ensureGenes(b);
    if (family(a, b)) return relationship(a, b.id);
    const c = compatibility(a, b); const existing = relationship(a, b.id);
    if (existing && existing.kind === 'partner') { setRel(a, b, 'partner', existing.strength + 0.02, now); setRel(b, a, 'partner', (relationship(b, a.id)?.strength || existing.strength) + 0.02, now); return relationship(a, b.id); }
    if (c >= 0.5) { const s = (existing && existing.kind === 'friend' ? existing.strength : 0.3) + 0.1 * c; setRel(a, b, 'friend', s, now); setRel(b, a, 'friend', s, now); a.needs.social = Math.min(100, a.needs.social + 4); b.needs.social = Math.min(100, b.needs.social + 4); }
    else if (c < 0.35) { const s = (existing && existing.kind === 'rival' ? existing.strength : 0.3) + 0.08; setRel(a, b, 'rival', s, now); setRel(b, a, 'rival', s, now); a.needs.morale = Math.max(0, a.needs.morale - 2); b.needs.morale = Math.max(0, b.needs.morale - 2); }
    else if (!existing) { setRel(a, b, 'friend', 0.2, now); setRel(b, a, 'friend', 0.2, now); }
    return relationship(a, b.id);
}
export function partnerOf(a, agents) { const id = Object.keys(a.relationships || {}).find((k) => a.relationships[k].kind === 'partner'); return id ? agents.find((x) => x.id === id) || null : null; }
/** Two close adult friends with no partners may pair up. */
export function maybePartner(a, b, agents, { now = 0, random = Math.random } = {}) {
    const ra = relationship(a, b.id);
    if (!ra || ra.kind !== 'friend' || ra.strength < 0.7) return false;
    if (lifeStage(a, now) !== 'adult' || lifeStage(b, now) !== 'adult') return false;
    if (partnerOf(a, agents) || partnerOf(b, agents) || kinship(a.dna, b.dna) > 0.9) return false;
    if (random() > 0.35 * compatibility(a, b)) return false;
    setRel(a, b, 'partner', ra.strength, now); setRel(b, a, 'partner', ra.strength, now);
    return true;
}
export function canBreed(a, b, { now = 0, agents = [], cap = POPULATION_CAP, cooldownDays = BREED_COOLDOWN_DAYS } = {}) {
    if (!a || !b || a.id === b.id || agents.length >= cap) return false;
    const r = relationship(a, b.id); if (!r || r.kind !== 'partner') return false;
    if (lifeStage(a, now) !== 'adult' || lifeStage(b, now) !== 'adult') return false;
    if (family(a, b) || kinship(a.dna, b.dna) > 0.9) return false;
    const last = Math.max(a.lineage?.lastBirth || 0, b.lineage?.lastBirth || 0); if (last && (now - last) / DAY < cooldownDays) return false;
    return a.needs.energy > 30 && b.needs.energy > 30;
}

export function childName(parents, { random = Math.random, taken = new Set() } = {}) {
    const surname = parents[0].surname || parents[0].name;
    for (let i = 0; i < 200; i++) {
        const given = GIVEN_NAMES[Math.floor(random() * GIVEN_NAMES.length) % GIVEN_NAMES.length];
        const id = `${given}-${surname}`.toUpperCase().replace(/[^A-Z0-9-]/g, '');
        if (!taken.has(id)) return { given, surname, id };
        if (i > 60) { const id2 = `${id}-${i}`; if (!taken.has(id2)) return { given: `${given} ${i}`, surname, id: id2 }; }
    }
    return { given: 'Nova', surname, id: `NOVA-${surname}-${Date.now()}`.toUpperCase() };
}
/** Agent spec for a new child of two minions. */
export function makeChild(a, b, { now = 0, random = Math.random, taken = new Set(), soul = null } = {}) {
    ensureGenes(a); ensureGenes(b);
    const dna = breed(a.dna, b.dna, { random });
    const name = childName([a, b], { random, taken });
    const upbringing = Math.round(Math.max(0.6, Math.min(1.6, 0.7 + 0.3 * ((a.needs.morale + b.needs.morale) / 200) + 0.3 * ((trait(a.dna, 'empathy') + trait(b.dna, 'empathy')) / 2) + 0.2 * (1 - (a.needs.energy < 30 || b.needs.energy < 30 ? 1 : 0)))) * 100) / 100;
    const skills = {};
    for (const p of [a, b]) for (const [k, xp] of Object.entries(p.skills || {})) skills[k] = Math.min(2000, (skills[k] || 0) + Math.round(xp * 0.25));
    if (soul) for (const [k, xp] of Object.entries(soul.skills || {})) skills[k] = Math.min(2500, (skills[k] || 0) + Math.round(xp * 0.15));
    const apt = aptitudes(dna); const spec = Object.entries(apt).sort((x, y) => y[1] - x[1]).slice(0, 2).map(([k]) => k.replace(/_/g, '-'));
    return { id: name.id, name: name.given, surname: name.surname, dna, traits: traitsFromDna(dna), tier: 1, role: 'Apprentice', born: now, generation: Math.max(a.generation || 0, b.generation || 0) + 1, parents: [a.id, b.id], skills, needs: { energy: 100, focus: 80, morale: 90, social: 90, mastery: 40, safety: 90 },
        meta: { hired: false, title: `Child of ${a.name} and ${b.name}`, family: true, upbringing, specialties: spec, appearance: appearance(dna), reputation: 0.3, soulOf: soul ? soul.name : null } };
}
/** Register the family links after a child is added to the world. */
export function linkFamily(child, a, b, agents, now) {
    setRel(child, a, 'parent', 0.9, now); setRel(child, b, 'parent', 0.9, now); setRel(a, child, 'child', 0.9, now); setRel(b, child, 'child', 0.9, now);
    for (const s of agents) if (s !== child && (s.parents || []).includes(a.id) && (s.parents || []).includes(b.id)) { setRel(child, s, 'sibling', 0.7, now); setRel(s, child, 'sibling', 0.7, now); }
    a.lineage.births++; b.lineage.births++; a.lineage.lastBirth = now; b.lineage.lastBirth = now;
    a.needs.energy = Math.max(0, a.needs.energy - 20); b.needs.energy = Math.max(0, b.needs.energy - 10);
}
/** Cause of death this day, or null. Only old age; the young and the healthy live. */
export function determineDeath(agent, { now = 0, random = Math.random } = {}) {
    const age = ageDays(agent, now); if (age == null) return null;
    const expected = lifespanDays(agent);
    if (age > expected) { const excess = age - expected; if (random() < Math.min(0.4, 0.01 + excess * 0.004)) return 'old age'; }
    return null;
}
/** Family tree rows: generation, parents, children, partner, siblings. */
export function familyTree(agents, memorial = []) {
    const all = [...agents, ...memorial.map((m) => ({ ...m, memorial: true }))];
    const byId = new Map(all.map((a) => [a.id, a]));
    return all.map((a) => ({ id: a.id, name: a.name, surname: a.surname || null, generation: a.generation || 0, memorial: Boolean(a.memorial), parents: (a.parents || []).map((p) => byId.get(p)?.name || p), partner: Object.entries(a.relationships || {}).filter(([, r]) => r.kind === 'partner').map(([id]) => byId.get(id)?.name || id)[0] || null, children: all.filter((c) => (c.parents || []).includes(a.id)).map((c) => c.name), siblings: Object.entries(a.relationships || {}).filter(([, r]) => r.kind === 'sibling').map(([id]) => byId.get(id)?.name || id), friends: Object.values(a.relationships || {}).filter((r) => r.kind === 'friend').length, rivals: Object.values(a.relationships || {}).filter((r) => r.kind === 'rival').length })).sort((x, y) => x.generation - y.generation || x.name.localeCompare(y.name));
}

const mk = (id, over = {}) => ensureGenes({ id, name: id, role: 'Electrician', dna: dnaFromSeed(id), born: null, generation: 0, parents: [], relationships: {}, lineage: { births: 0, lastBirth: null }, needs: { energy: 90, focus: 80, morale: 80, social: 60, mastery: 50, safety: 80 }, skills: { pv_arrays: 800, customer: 200 }, ...over });
export const FEATURES = [
    { id: 'life.stages', title: 'Minions age through infant, child, adolescent, adult and elder with rising capability; founders arrive grown', test: () => { const kid = mk('K', { born: 0 }); const d = (n) => n * DAY; const old = mk('O', { born: 0 }); return lifeStage(kid, d(1)) === 'infant' && lifeStage(kid, d(10)) === 'child' && lifeStage(kid, d(40)) === 'adolescent' && lifeStage(kid, d(90)) === 'adult' && lifeStage(old, d(lifespanDays(old) * 0.9)) === 'elder' && capability('child') === 0.3 && capability('adult') === 1 && lifeStage(mk('F'), 1e15) === 'adult' && lifespanDays(old) >= 540 && lifespanDays(old) <= 1140; } },
    { id: 'life.social', title: 'Encounters build friendships or rivalries from genetic compatibility and can turn close adult friends into partners', test: () => { const ids = GIVEN_NAMES; let a, b; for (let i = 0; i < ids.length && !b; i++) for (let j = i + 1; j < ids.length; j++) { const x = mk(ids[i]); const y = mk(ids[j]); if (compatibility(x, y) >= 0.6) { a = x; b = y; break; } } for (let i = 0; i < 8; i++) socialise(a, b, { now: i }); const r = relationship(a, b.id); const paired = maybePartner(a, b, [a, b], { now: 10, random: () => 0 }); let rival = null; for (let i = 0; i < ids.length && !rival; i++) { const x = mk(`${ids[i]}2`); const y = mk(`${ids[(i * 7) % ids.length]}3`); if (compatibility(x, y) < 0.35) { socialise(x, y, { now: 0 }); rival = relationship(x, y.id); } } return r.kind === 'friend' && r.strength >= 0.7 && paired && relationship(a, b.id).kind === 'partner' && partnerOf(a, [a, b]) === b && (!rival || rival.kind === 'rival'); } },
    { id: 'life.breed', title: 'Partners breed a child that inherits genes, looks, two traits, a quarter of each parent\'s skills and a surname; family links and cooldowns apply', test: () => { const a = mk('AMBER', { surname: 'Amber', generation: 1 }); const b = mk('BRACKEN', { skills: { customer: 1000 } }); a.relationships[b.id] = { kind: 'partner', strength: 0.9, since: 0 }; b.relationships[a.id] = { kind: 'partner', strength: 0.9, since: 0 }; const ok = canBreed(a, b, { now: 100 * DAY, agents: [a, b] }); const child = makeChild(a, b, { now: 100 * DAY, random: seededRandom(3) }); linkFamily(ensureGenes(child), a, b, [a, b, child], 100 * DAY); const again = canBreed(a, b, { now: 101 * DAY, agents: [a, b, child] }); const later = canBreed(a, b, { now: 200 * DAY, agents: [a, b, child] }); return ok && child.generation === 2 && child.surname === 'Amber' && child.id.endsWith('-AMBER') && child.parents.length === 2 && child.traits.length === 2 && child.skills.pv_arrays === 200 && child.skills.customer === 300 && kinship(child.dna, a.dna) + kinship(child.dna, b.dna) > 1.2 && child.meta.hired === false && child.meta.upbringing >= 0.6 && relationship(child, a.id).kind === 'parent' && relationship(a, child.id).kind === 'child' && a.lineage.births === 1 && !again && later && !canBreed(a, child, { now: 300 * DAY, agents: [a, b, child] }); } },
    { id: 'life.death', title: 'Only the very old die, probabilistically past their genetic lifespan; the family tree lists the living and the remembered', test: () => { const a = mk('ELDER', { born: 0 }); const young = determineDeath(a, { now: 100 * DAY, random: () => 0 }); const old = determineDeath(a, { now: (lifespanDays(a) + 200) * DAY, random: () => 0 }); const tree = familyTree([a], [{ id: 'GONE', name: 'Gone', generation: 0, parents: [], relationships: {} }]); return young === null && old === 'old age' && tree.length === 2 && tree.find((t) => t.id === 'GONE').memorial; } }
];
