/**
 * The original SolarFlow minion roster (docs/minions.json), carried into the
 * game: 24 named minions with tiers, modes, specialties, reputation and
 * identicon portraits, mapped onto solar crew roles, traits and starting
 * skills. The founding crew is hired; the rest live in town and can be
 * recruited at the Guild Hall.
 */
export const LEGACY_ROSTER = [
    { id: 'ATLAS', tier: 3, role: 'OVERSEER', mode: 'COLLAB', specialties: ['orchestration', 'governance', 'standards-oversight', 'neural-coordination'], energy_credits: 160, reputation: 0.65 },
    { id: 'LUMEN', tier: 3, role: 'OVERSEER', mode: 'COLLAB', specialties: ['paradox-resolution', 'priorities'], energy_credits: 160, reputation: 0.63 },
    { id: 'BOLT', tier: 2, role: 'SPECIALIST', mode: 'EXECUTION', specialties: ['ci-fix', 'react', 'AS/NZS-3000', 'neural-optimization'], energy_credits: 120, reputation: 0.6 },
    { id: 'SABLE', tier: 2, role: 'SPECIALIST', mode: 'EXECUTION', specialties: ['doc-discovery', 'sitemaps', 'AS/NZS-standards', 'compliance-checking'], energy_credits: 120, reputation: 0.58 },
    { id: 'PRISM', tier: 2, role: 'SPECIALIST', mode: 'EXECUTION', specialties: ['ui', 'status-feed', 'solar-compliance', 'battery-safety'], energy_credits: 120, reputation: 0.57 },
    { id: 'NOVA', tier: 2, role: 'SPECIALIST', mode: 'EXECUTION', specialties: ['ocr', 'pdf-parse', 'AS/NZS-extraction', 'document-processing'], energy_credits: 110, reputation: 0.5 },
    { id: 'ORBIT', tier: 2, role: 'SPECIALIST', mode: 'COLLAB', specialties: ['memory', 'chroma'], energy_credits: 120, reputation: 0.54 },
    { id: 'SAGE', tier: 2, role: 'SPECIALIST', mode: 'EXECUTION', specialties: ['knowledge-refresh', 'entropy'], energy_credits: 120, reputation: 0.55 },
    { id: 'VAULT', tier: 2, role: 'SPECIALIST', mode: 'EXECUTION', specialties: ['snapshots', 'black-start'], energy_credits: 120, reputation: 0.56 },
    { id: 'SENTRY', tier: 2, role: 'SPECIALIST', mode: 'EXECUTION', specialties: ['audit', 'schema-validation'], energy_credits: 110, reputation: 0.53 },
    { id: 'RUNE', tier: 2, role: 'SPECIALIST', mode: 'EXECUTION', specialties: ['ranking', 'source-scoring'], energy_credits: 110, reputation: 0.52 },
    { id: 'CIPHER', tier: 2, role: 'SPECIALIST', mode: 'EXECUTION', specialties: ['normalization', 'model-matching'], energy_credits: 110, reputation: 0.52 },
    { id: 'QUILL', tier: 2, role: 'SPECIALIST', mode: 'EXECUTION', specialties: ['reporting', 'war-room'], energy_credits: 120, reputation: 0.52 },
    { id: 'FORGE', tier: 2, role: 'SPECIALIST', mode: 'EXECUTION', specialties: ['pipelines', 'queues'], energy_credits: 110, reputation: 0.51 },
    { id: 'HAMMER', tier: 2, role: 'SPECIALIST', mode: 'EXECUTION', specialties: ['load-shedding', 'kinetic'], energy_credits: 120, reputation: 0.5 },
    { id: 'EMBER', tier: 1, role: 'OPERATOR', mode: 'EXECUTION', specialties: ['fetch', 'retry-backoff', 'grid-connection', 'inverter-standards'], energy_credits: 90, reputation: 0.48 },
    { id: 'AURORA', tier: 1, role: 'OPERATOR', mode: 'EXECUTION', specialties: ['link-extract', 'html-parse'], energy_credits: 90, reputation: 0.47 },
    { id: 'ECHO', tier: 1, role: 'OPERATOR', mode: 'EXECUTION', specialties: ['logging', 'undercurrent'], energy_credits: 90, reputation: 0.47 },
    { id: 'KITE', tier: 1, role: 'OPERATOR', mode: 'EXECUTION', specialties: ['dedupe', 'hashing'], energy_credits: 90, reputation: 0.46 },
    { id: 'DELTA', tier: 1, role: 'OPERATOR', mode: 'EXECUTION', specialties: ['pagination', 'cursoring'], energy_credits: 90, reputation: 0.46 },
    { id: 'SPARROW', tier: 1, role: 'OPERATOR', mode: 'EXECUTION', specialties: ['unit-tests', 'lint'], energy_credits: 90, reputation: 0.46 },
    { id: 'GLINT', tier: 1, role: 'OPERATOR', mode: 'EXECUTION', specialties: ['sitemaps', 'robots'], energy_credits: 90, reputation: 0.45 },
    { id: 'WREN', tier: 1, role: 'OPERATOR', mode: 'EXECUTION', specialties: ['url-patterns', 'regex'], energy_credits: 90, reputation: 0.45 },
    { id: 'MOSS', tier: 1, role: 'OPERATOR', mode: 'EXECUTION', specialties: ['content-sniff', 'mime-detect'], energy_credits: 90, reputation: 0.44 }
];

/** Solar-crew titles from the old LLM config plus derived ones for the rest. */
export const SOLAR_TITLES = { ATLAS: 'Solar Installation Specialist', LUMEN: 'Energy Systems Analyst', ORBIT: 'Field Operations Coordinator', PRISM: 'Compliance & Documentation Expert', NOVA: 'Innovation & Research Specialist', BOLT: 'Maintenance & Troubleshooting Expert', SABLE: 'Standards Librarian', SENTRY: 'Inspection & Audit Lead', EMBER: 'Grid Connection Officer', HAMMER: 'Rigging & Mounting Lead', VAULT: 'Battery Systems Specialist', QUILL: 'Reporting & Handover Writer', SAGE: 'Training Mentor', FORGE: 'Scheduling & Logistics', CIPHER: 'Product Matching Analyst', RUNE: 'Site Assessor', AURORA: 'Apprentice Electrician', ECHO: 'Site Logger', KITE: 'Serial Register Clerk', DELTA: 'Apprentice Installer', SPARROW: 'Test Technician', GLINT: 'Roof Surveyor', WREN: 'Labelling & Signage', MOSS: 'Site Safety Officer' };
export const FOUNDING_CREW = ['ATLAS', 'NOVA', 'BOLT', 'SABLE', 'PRISM', 'LUMEN'];

const GAME_ROLE = { OVERSEER: 'Project manager', SPECIALIST: 'Electrician', OPERATOR: 'Apprentice' };
const ROLE_BY_SPECIALTY = [[/audit|schema|compliance|safety/, 'Commissioning tech'], [/ocr|pdf|extraction|document|standards|doc-/, 'Designer'], [/kinetic|load|pipelines|queues|orchestration/, 'Lead installer'], [/grid|inverter|black-start|snapshots/, 'Electrician']];
const TRAITS_BY_SPECIALTY = [[/audit|schema|safety|sentry|validation/, 'sentinel'], [/compliance|standards|doc|ocr|pdf|extraction|reporting/, 'scholar'], [/ui|status|feed|war-room|memory|chroma|coordination/, 'gregarious'], [/ci-fix|react|optimization|regex|normalization|matching|ranking|hashing/, 'tinkerer'], [/kinetic|load-shedding|fetch|retry|queues/, 'sprinter'], [/orchestration|governance|priorities|paradox|knowledge/, 'meticulous'], [/logging|pagination|cursoring|sitemaps|robots|mime|sniff|dedupe/, 'steady'], [/entropy|refresh|link|html|unit-tests|lint/, 'optimist']];
const SKILL_BY_SPECIALTY = [[/AS\/NZS-3000|grid|inverter|black-start/, 'wiring_rules'], [/compliance|standards|AS\/NZS|doc|ocr|pdf/, 'standards'], [/battery|snapshots/, 'battery'], [/kinetic|load|pipelines|mounting/, 'installation'], [/audit|schema|validation|unit-tests|lint/, 'commissioning'], [/ui|status|reporting|war-room|memory/, 'customer'], [/ranking|matching|normalization|model/, 'pv_arrays'], [/orchestration|governance|priorities|paradox/, 'electrical']];

export function traitsFor(minion) {
    const traits = [];
    for (const s of minion.specialties) for (const [re, t] of TRAITS_BY_SPECIALTY) if (re.test(s) && !traits.includes(t)) traits.push(t);
    if (traits.length < 2) traits.push(minion.tier >= 3 ? 'meticulous' : 'steady');
    return [...new Set(traits)].slice(0, 2);
}
export function gameRoleFor(minion) {
    for (const s of minion.specialties) for (const [re, role] of ROLE_BY_SPECIALTY) if (re.test(s)) return minion.role === 'OVERSEER' ? GAME_ROLE.OVERSEER : role;
    return GAME_ROLE[minion.role] || 'Apprentice';
}
export function startingSkills(minion) {
    const base = Math.round(minion.reputation * 600 * (minion.tier / 2));
    const skills = {};
    for (const s of minion.specialties) for (const [re, key] of SKILL_BY_SPECIALTY) if (re.test(s)) skills[key] = (skills[key] || 0) + base;
    if (!Object.keys(skills).length) skills[minion.tier >= 2 ? 'installation' : 'customer'] = base;
    return skills;
}
export function recruitCost(minion) { return { 1: 120, 2: 220, 3: 400 }[minion.tier] || 150; }

/** Agent spec for the simulation. */
export function rosterAgentSpec(minion, { hired = FOUNDING_CREW.includes(minion.id) } = {}) {
    const name = minion.id.charAt(0) + minion.id.slice(1).toLowerCase();
    return { id: minion.id, name, tier: minion.tier, role: gameRoleFor(minion), traits: traitsFor(minion), skills: startingSkills(minion), avatar: null, meta: { title: SOLAR_TITLES[minion.id] || gameRoleFor(minion), legacyRole: minion.role, mode: minion.mode, specialties: minion.specialties, reputation: minion.reputation, energyCredits: minion.energy_credits, avatarUrl: `../avatars/identicons/${minion.id}.svg`, hired } };
}
export function rosterSpecs() { return LEGACY_ROSTER.map((m) => rosterAgentSpec(m)); }
export function rosterById(id) { return LEGACY_ROSTER.find((m) => m.id === String(id).toUpperCase()) || null; }

export const FEATURES = [
    { id: 'roster.legacy', title: 'All 24 original minions are in the roster with tiers, modes and specialties', test: () => LEGACY_ROSTER.length === 24 && LEGACY_ROSTER.filter((m) => m.tier === 3).length === 2 && LEGACY_ROSTER.every((m) => m.specialties.length >= 2 && m.reputation > 0) },
    { id: 'roster.mapping', title: 'Specialties map to solar roles, traits and starting skills', test: () => { const atlas = rosterAgentSpec(rosterById('ATLAS')); const sentry = rosterAgentSpec(rosterById('SENTRY')); const moss = rosterAgentSpec(rosterById('moss')); return atlas.role === 'Project manager' && atlas.traits.length === 2 && atlas.meta.title === 'Solar Installation Specialist' && sentry.role === 'Commissioning tech' && sentry.traits.includes('sentinel') && sentry.skills.commissioning > 0 && moss.role === 'Apprentice' && moss.meta.hired === false; } },
    { id: 'roster.founding', title: 'Six founding crew are hired; the rest can be recruited by tier cost', test: () => rosterSpecs().filter((s) => s.meta.hired).length === 6 && recruitCost(rosterById('LUMEN')) === 400 && recruitCost(rosterById('WREN')) === 120 },
    { id: 'roster.portraits', title: 'Every minion has an identicon portrait path', test: () => rosterSpecs().every((s) => /avatars\/identicons\/[A-Z]+\.svg$/.test(s.meta.avatarUrl)) },
    { id: 'roster.uniqueTitles', title: 'Every minion has a distinct solar title', test: () => new Set(Object.values(SOLAR_TITLES)).size === 24 }
];
