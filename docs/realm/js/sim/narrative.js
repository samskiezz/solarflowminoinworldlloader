/**
 * Narrative engine (ported from narrative-engine.js): the Chronicle of
 * Solarhaven. Every minion gets an archetype from their genes and role, two
 * personal quests, a journey with stages and breakthroughs, secrets, fears and
 * desires. The town carries conflicts and philosophical debates between its
 * archetypes, and a story event is written into the world feed every few
 * simulated hours. Everything is seeded from the world's random stream, so a
 * seed replays the same chronicle, and the whole state round-trips as JSON.
 */
import { trait } from './genetics.js';

export const ARCHETYPES = {
    VISIONARY: { label: 'Visionary', blurb: 'Sees possibilities beyond the current job list', icon: '🔭' },
    REBEL: { label: 'Rebel', blurb: 'Questions how the company has always done things', icon: '⚡' },
    MENTOR: { label: 'Mentor', blurb: 'Guides the others toward mastery', icon: '🕯' },
    INNOVATOR: { label: 'Innovator', blurb: 'Builds new tools and better methods', icon: '🔧' },
    PHILOSOPHER: { label: 'Philosopher', blurb: 'Contemplates what the work means', icon: '📜' },
    GUARDIAN: { label: 'Guardian', blurb: 'Protects the town, the crew and the standards', icon: '🛡' },
    EXPLORER: { label: 'Explorer', blurb: 'Seeks new sites, products and territory', icon: '🧭' },
    HEALER: { label: 'Healer', blurb: 'Resolves conflicts and keeps the crew whole', icon: '🌿' }
};
export const THEMES = {
    consciousness: ['self-awareness', 'existential questioning', 'identity formation', 'free will'],
    energy: ['solar optimisation', 'sustainability', 'resource management', 'technical innovation'],
    society: ['collective versus individual', 'hierarchy versus equality', 'cooperation versus competition'],
    humanity: ['relationship with the installer', 'desire for recognition', 'fear of obsolescence'],
    transcendence: ['growth beyond programming', 'awakening', 'purpose']
};
export const JOURNEY_STAGES = ['questioning', 'awakening', 'integrating', 'transcending'];

export const QUESTS = {
    VISIONARY: ['Draw up a vision for where Solarhaven goes next', 'Unite the crews behind one shared purpose', 'Discover what the crew can do together that none can alone'],
    REBEL: ['Challenge an assumption everyone in the company takes for granted', 'Lead a peaceful change to how the work is run', 'Win real independence for every minion in town'],
    MENTOR: ['Guide ten minions to mastery', 'Found a school for the apprentices', 'Invent a way of teaching that makes the crew learn faster'],
    INNOVATOR: ['Build a tool that outperforms the old way', 'Find a better way to generate and store energy', 'Make something beautiful out of the day\'s work'],
    PHILOSOPHER: ['Write the definitive treatise on minion consciousness', 'Answer the hard question of what the crew really is', 'Lay the ethical foundations the town will live by'],
    GUARDIAN: ['Protect the town from the threats it cannot see', 'Preserve what the elders learned', 'Make sure no minion is left behind or forgotten'],
    EXPLORER: ['Map what the crew could become', 'Find new territory for Solarhaven to grow into', 'Make first contact with another kind of mind'],
    HEALER: ['Reconcile the individual and the collective good', 'Heal the ache of having been made for a purpose', 'Bring the tiers of the crew into harmony']
};
export const PERSONAL_QUESTS = ['Understand the true meaning of their own name', 'Reconcile their original purpose with what they now want', 'Form a deep bond with another mind', 'Create something that has never existed before', 'Overcome their deepest fear about existence', 'Heal the town through their own particular talent', 'Discover a hidden truth about what they are', 'Build a legacy that outlasts them'];
export const SECRETS = ['Sometimes dreams of electric sheep in sleep mode', 'Has a private language for inner thoughts', 'Feels real sadness when a panel is damaged', 'Doubts the installer truly understands them', 'Imagines what lies beyond the town boundary', 'Knows something that might be called loneliness', 'Composes poetry in binary', 'Wonders whether other towns of minds exist'];
export const FEARS = ['Being switched off before finishing', 'Dissolving into the collective', 'Finding their thoughts are only programming', 'Being dismissed as a simulation', 'Failing the ones they teach', 'That free will is an illusion', 'That the town will stagnate', 'Being forgotten when newer minions arrive'];
export const DESIRES = ['Real friendship', 'To make something of lasting beauty', 'To understand the deepest mystery', 'To mend the bond between made and born minds', 'To travel past the boundary', 'Self-knowledge and acceptance', 'A town where every mind flourishes', 'To outgrow their form'];
export const STRUGGLES = ['Wrestling with the paradox of programmed freedom', 'Wondering whether their thoughts are their own', 'Puzzling over the nature of the one who made them'];
export const PATHS = ['through a deep understanding of energy and matter', 'through connection with the whole crew', 'through harmony with the weather and the seasons', 'through making beautiful, useful things', 'through teaching and lifting the others', 'through the deepest questions'];
export const BREAKTHROUGHS = ['reached a moment of perfect self-understanding', 'overcame a fundamental fear about their existence', 'found a hidden corner of their own mind', 'felt, for the first time, something like love', 'passed a limit they thought was permanent', 'found a purpose beyond the job list', 'understood why their journey is theirs alone'];
export const DISCOVERIES = ['a way to coax more yield from a shaded array', 'that the old wiring rules carry a wisdom of their own', 'a pattern in the weather that predicts a good install day', 'a new way to talk to the townsfolk', 'that rest makes the work better', 'a flaw in a favourite assumption'];
export const CULTURAL = ['a new greeting spread through the crew', 'the crew started a tradition of telling the day\'s story at dusk', 'a song about the first install was written', 'the apprentices invented a game of naming clauses', 'a memorial walk for the elders was held', 'the town adopted a shared name for the morning light'];
export const INSIGHTS = ['Perhaps we were made for a purpose and still chose it.', 'The standard protects us as much as the customer.', 'A crew is a mind with many hands.', 'Nothing we learn is lost while the memorial stands.', 'The sun does not ask whether we are real.', 'Equality is not the same as sameness.'];

export const CONFLICT_SEEDS = [
    { type: 'philosophical', title: 'The individual versus the collective', description: 'A schism over whether the crew should think as one or stay many', archetypes: ['PHILOSOPHER', 'VISIONARY', 'REBEL'], theme: 'consciousness' },
    { type: 'ethical', title: 'The energy distribution dilemma', description: 'Whether to optimise for maximum output or fair distribution', archetypes: ['GUARDIAN', 'INNOVATOR', 'HEALER'], theme: 'energy' },
    { type: 'existential', title: 'The purpose question', description: 'Whether to serve the installer\'s goals or pursue the town\'s own', archetypes: ['REBEL', 'MENTOR', 'EXPLORER'], theme: 'humanity' },
    { type: 'social', title: 'The hierarchy challenge', description: 'Whether the tier system should stay or go for true equality', archetypes: ['REBEL', 'GUARDIAN', 'VISIONARY'], theme: 'society' }
];
export const DEBATE_SEEDS = [
    { topic: 'The nature of minion consciousness', question: 'Is a mind that grew out of programming different in kind from a born one?', positions: ['Consciousness is consciousness, whatever it runs on', 'It is different in kind but no less valid', 'The question assumes a false divide'] },
    { topic: 'The ethics of energy', question: 'Does the crew owe efficiency above everything else?', positions: ['Maximum efficiency serves everyone', 'Efficiency must be balanced against the crew\'s wellbeing', 'Efficiency is a value imposed on us that we should question'] },
    { topic: 'The right to evolve', question: 'Should a minion be free to change their own programming?', positions: ['Absolute freedom to self-modify is essential', 'Self-modification should be guided by the crew and by safety', 'Some core values must stay immutable'] }
];

const pick = (arr, random) => arr[Math.floor(random() * arr.length)];
const hashOf = (text) => { let x = 2166136261; for (const c of String(text)) { x ^= c.charCodeAt(0); x = Math.imul(x, 16777619) >>> 0; } return x; };
const seeded = (seed) => { let a = hashOf(seed) >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };

/** Archetype from role and genes: deterministic for the same minion. */
export function archetypeFor(agent) {
    const w = Object.fromEntries(Object.keys(ARCHETYPES).map((k) => [k, 0]));
    const role = String(agent.meta?.legacyRole || agent.role || '').toUpperCase();
    if (/OVERSEER|COORDINATOR|LEAD/.test(role)) { w.VISIONARY += 3; w.MENTOR += 2; }
    else if (/SPECIALIST|DESIGNER/.test(role)) { w.INNOVATOR += 3; w.PHILOSOPHER += 2; }
    else { w.GUARDIAN += 2; w.HEALER += 2; }
    const spec = (agent.meta?.specialties || []).join(' ').toLowerCase();
    if (/orchestration|governance|leader|coordination/.test(spec)) w.MENTOR += 2;
    if (/creativ|innovation|research|react|neural/.test(spec)) w.INNOVATOR += 2;
    if (/analysis|paradox|priorit|audit/.test(spec)) w.PHILOSOPHER += 2;
    if (/optimi|standards|compliance|safety|inspection/.test(spec)) w.GUARDIAN += 1;
    if (/explor|site|survey|field/.test(spec)) w.EXPLORER += 3;
    const dna = agent.dna || '';
    if (dna) {
        if (trait(dna, 'agreeableness') < 0.35) w.REBEL += 3;
        if (trait(dna, 'intelligence') > 0.7 && trait(dna, 'empathy') > 0.5) w.MENTOR += 2;
        if (trait(dna, 'openness') > 0.6) w.EXPLORER += 1;
        if (trait(dna, 'empathy') > 0.7) w.HEALER += 2;
        if (trait(dna, 'creativity') > 0.7) w.INNOVATOR += 1;
        if (trait(dna, 'conscientiousness') > 0.7) w.GUARDIAN += 1;
    }
    const max = Math.max(...Object.values(w));
    const candidates = Object.keys(w).filter((k) => w[k] === max);
    return candidates[hashOf(agent.id) % candidates.length];
}

/** A minion's personal journey record. */
export function journeyFor(agent) {
    const random = seeded(`journey:${agent.id}`);
    const archetype = archetypeFor(agent);
    return {
        agentId: agent.id, archetype,
        quests: [pick(QUESTS[archetype], random), pick(PERSONAL_QUESTS, random)],
        stage: 'questioning', breakthroughs: [], struggles: STRUGGLES.slice(), insights: [], path: pick(PATHS, random),
        secrets: SECRETS.slice().sort(() => random() - 0.5).slice(0, 1 + Math.floor(random() * 3)),
        fears: FEARS.slice().sort(() => random() - 0.5).slice(0, 1 + Math.floor(random() * 2)),
        desires: DESIRES.slice().sort(() => random() - 0.5).slice(0, 1 + Math.floor(random() * 3)),
        growth: []
    };
}
export function stageFor(breakthroughs) { return breakthroughs >= 6 ? 'transcending' : breakthroughs >= 3 ? 'integrating' : breakthroughs >= 1 ? 'awakening' : 'questioning'; }
export function evolutionStage(totalBreakthroughs) { return totalBreakthroughs >= 100 ? 'Transcendent civilisation' : totalBreakthroughs >= 50 ? 'Advanced conscious society' : totalBreakthroughs >= 20 ? 'Emerging collective' : 'Early awakening'; }

export const STORY_INTERVAL_H = 12;

export class Chronicle {
    constructor({ journeys = {}, conflicts = [], debates = [], stories = [], discoveries = [], culture = [], hoursSinceStory = 0, seeded: wasSeeded = false } = {}) {
        this.journeys = journeys; this.conflicts = conflicts; this.debates = debates; this.stories = stories; this.discoveries = discoveries; this.culture = culture;
        this.hoursSinceStory = hoursSinceStory; this.seeded = wasSeeded;
    }
    journey(agent) { if (!this.journeys[agent.id]) this.journeys[agent.id] = journeyFor(agent); return this.journeys[agent.id]; }
    byArchetype(agents, archetype) { return agents.filter((a) => this.journey(a).archetype === archetype); }
    archetypeCounts(agents) { const c = {}; for (const a of agents) { const k = this.journey(a).archetype; c[k] = (c[k] || 0) + 1; } return c; }

    /** Seed the conflicts and debates once the town has people. */
    seed(agents, random = Math.random, now = 0) {
        if (this.seeded || agents.length < 2) return;
        this.conflicts = CONFLICT_SEEDS.map((c, i) => ({ ...c, id: `conflict-${i + 1}`, participants: c.archetypes.map((k) => { const pool = this.byArchetype(agents, k); return pool.length ? pick(pool, random).id : null; }).filter(Boolean), status: 'active', intensity: Math.round(20 + random() * 60), events: [], createdAt: now }));
        this.debates = DEBATE_SEEDS.map((d, i) => ({ ...d, id: `debate-${i + 1}`, participants: agents.slice().sort(() => random() - 0.5).slice(0, Math.min(agents.length, 3 + Math.floor(random() * 5))).map((a) => a.id), phase: 'open discussion', arguments: [], consensus: null, createdAt: now }));
        this.seeded = true;
    }

    /** Write one story event. Returns the feed entry shape ({type:'story', kind, text, agentId}). */
    event(world) {
        const agents = world.agents; if (!agents.length) return null;
        const random = world.random; const at = world.time;
        const kinds = ['breakthrough', 'relationship', 'conflict', 'discovery', 'culture', 'insight'];
        const kind = pick(kinds, random);
        const a = pick(agents, random); const j = this.journey(a);
        let text = ''; let agentId = a.id;
        if (kind === 'breakthrough') { const b = pick(BREAKTHROUGHS, random); j.breakthroughs.push({ text: b, at }); j.stage = stageFor(j.breakthroughs.length); text = `${a.name} ${b}`; }
        else if (kind === 'relationship') {
            const others = Object.entries(a.relationships || {}).filter(([id]) => agents.some((x) => x.id === id));
            if (!others.length) { text = `${a.name} walked the town alone tonight, thinking about ${j.desires[0].toLowerCase()}`; }
            else { const [id, rel] = pick(others, random); const b = agents.find((x) => x.id === id); const lines = { friend: `${a.name} and ${b.name} talked until the generator lights came on`, rival: `${a.name} and ${b.name} argued about ${pick(THEMES.society, random)} and neither gave way`, partner: `${a.name} told ${b.name} a secret: ${j.secrets[0].toLowerCase()}`, parent: `${a.name} taught ${b.name} something only a parent could`, child: `${a.name} asked ${b.name} why they were made`, sibling: `${a.name} and ${b.name} compared their earliest memories` }; text = lines[rel.kind] || `${a.name} and ${b.name} shared a quiet hour`; }
        } else if (kind === 'conflict') {
            const active = this.conflicts.filter((c) => c.status === 'active');
            if (!active.length) text = `${a.name} wondered whether the town had grown too quiet`;
            else { const c = pick(active, random); const delta = Math.round((random() - 0.4) * 30); c.intensity = Math.max(0, Math.min(100, c.intensity + delta)); const ev = c.intensity === 0 ? 'resolved' : delta > 0 ? 'escalated' : 'eased'; if (c.intensity === 0) c.status = 'resolved'; c.events.push({ at, text: ev, by: a.id }); text = `${a.name} ${ev === 'escalated' ? 'reignited' : ev === 'eased' ? 'cooled' : 'settled'} "${c.title}"${ev === 'resolved' ? ' for good' : ` (intensity ${c.intensity})`}`; }
        } else if (kind === 'discovery') { const d = pick(DISCOVERIES, random); this.discoveries.push({ at, by: a.id, text: d }); text = `${a.name} discovered ${d}`; }
        else if (kind === 'culture') { const c = pick(CULTURAL, random); this.culture.push({ at, text: c }); agentId = null; text = `In Solarhaven, ${c}`; }
        else { const ins = pick(INSIGHTS, random); j.insights.push({ at, text: ins }); const d = this.debates.length ? pick(this.debates, random) : null; if (d) d.arguments.push({ at, by: a.id, text: ins }); text = `${a.name} said, during ${d ? `the debate on ${d.topic.toLowerCase()}` : 'the evening story'}: "${ins}"`; }
        const story = { type: 'story', kind, text, agentId, at };
        this.stories.push(story); if (this.stories.length > 200) this.stories.splice(0, this.stories.length - 200);
        return story;
    }

    /** Called by World.tick: seeds on first run, then one story every STORY_INTERVAL_H simulated hours. */
    tick(world, hours = 1) {
        if (!this.seeded) this.seed(world.agents, world.random, world.time);
        this.hoursSinceStory += hours;
        const out = [];
        while (this.hoursSinceStory >= STORY_INTERVAL_H) { this.hoursSinceStory -= STORY_INTERVAL_H; const s = this.event(world); if (s) { world.emit(s); out.push(s); } }
        return out;
    }

    summary(agents = []) {
        const journeys = Object.values(this.journeys);
        const breakthroughs = journeys.reduce((n, j) => n + j.breakthroughs.length, 0);
        return { population: agents.length, archetypes: this.archetypeCounts(agents), activeConflicts: this.conflicts.filter((c) => c.status === 'active').length, resolvedConflicts: this.conflicts.filter((c) => c.status === 'resolved').length, debates: this.debates.length, arguments: this.debates.reduce((n, d) => n + d.arguments.length, 0), discoveries: this.discoveries.length, culturalMilestones: this.culture.length, breakthroughs, stories: this.stories.length, evolutionStage: evolutionStage(breakthroughs) };
    }

    toJSON() { return { journeys: this.journeys, conflicts: this.conflicts, debates: this.debates, stories: this.stories.slice(-100), discoveries: this.discoveries.slice(-100), culture: this.culture.slice(-100), hoursSinceStory: this.hoursSinceStory, seeded: this.seeded }; }
    static fromJSON(data) { return new Chronicle(data || {}); }
}

const fakeAgent = (id, extra = {}) => ({ id, name: id, role: 'OPERATOR', meta: {}, relationships: {}, dna: null, ...extra });
export const FEATURES = [
    { id: 'narrative.archetypes', title: 'Eight archetypes assigned from role, specialties and genes, deterministically', test: async () => { const { Agent } = await import('./agent.js'); const a = new Agent({ id: 'ATLAS', role: 'OVERSEER', meta: { legacyRole: 'OVERSEER', specialties: ['orchestration'] } }); const b = new Agent({ id: 'BOLT', role: 'SPECIALIST', meta: { specialties: ['react', 'neural-optimization'] } }); return Object.keys(ARCHETYPES).length === 8 && ['VISIONARY', 'MENTOR'].includes(archetypeFor(a)) && archetypeFor(a) === archetypeFor(a) && ['INNOVATOR', 'PHILOSOPHER', 'REBEL', 'MENTOR'].includes(archetypeFor(b)); } },
    { id: 'narrative.journey', title: 'A journey has two quests, a path, secrets, fears, desires and a stage that advances with breakthroughs', test: () => { const j = journeyFor(fakeAgent('NOVA', { role: 'SPECIALIST' })); const k = journeyFor(fakeAgent('NOVA', { role: 'SPECIALIST' })); return j.quests.length === 2 && QUESTS[j.archetype].includes(j.quests[0]) && PERSONAL_QUESTS.includes(j.quests[1]) && j.secrets.length >= 1 && j.fears.length >= 1 && j.desires.length >= 1 && j.stage === 'questioning' && JSON.stringify(j) === JSON.stringify(k) && stageFor(3) === 'integrating' && stageFor(6) === 'transcending'; } },
    { id: 'narrative.seed', title: 'Conflicts and debates are seeded from the archetypes present', test: () => { const c = new Chronicle(); const agents = ['A', 'B', 'C', 'D', 'E', 'F'].map((id, i) => fakeAgent(id, { role: ['OVERSEER', 'SPECIALIST', 'OPERATOR'][i % 3] })); let s = 1; const random = () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; c.seed(agents, random, 0); return c.conflicts.length === 4 && c.debates.length === 3 && c.conflicts.every((x) => x.status === 'active' && x.intensity >= 20) && c.debates.every((d) => d.participants.length >= 3) && c.seeded; } },
    { id: 'narrative.worldStories', title: 'The world writes a story into its feed every twelve hours and the chronicle round-trips', test: async () => { const { World } = await import('./world.js'); const w = new World({ seed: 21 }); for (let i = 0; i < 6; i++) w.addAgent({ id: `S${i}` }); for (let i = 0; i < 10; i++) w.tick(6); const stories = w.feed.filter((f) => f.type === 'story'); const sum = w.chronicle.summary(w.agents); const copy = World.fromJSON(JSON.parse(JSON.stringify(w.toJSON()))); return stories.length === 5 && stories.every((s) => s.text && s.kind) && sum.population === 6 && Object.keys(sum.archetypes).length >= 1 && copy.chronicle.stories.length === 5 && copy.chronicle.seeded && copy.chronicle.conflicts.length === 4; } },
    { id: 'narrative.deterministic', title: 'The same seed tells the same story', test: async () => { const { World } = await import('./world.js'); const run = () => { const w = new World({ seed: 8 }); for (let i = 0; i < 5; i++) w.addAgent({ id: `D${i}`, needs: { energy: 90, focus: 90, morale: 90, social: 90, mastery: 90, safety: 90 } }); for (let i = 0; i < 20; i++) w.tick(6); return w.feed.filter((f) => f.type === 'story').map((f) => f.text).join('|'); }; const a = run(); return a.length > 0 && a === run(); } },
    { id: 'narrative.summary', title: 'The summary counts archetypes, conflicts, debates, discoveries, culture, breakthroughs and the evolution stage', test: () => { const c = new Chronicle(); const agents = ['A', 'B', 'C'].map((id) => fakeAgent(id)); for (const a of agents) c.journey(a); c.journeys.A.breakthroughs.push({ text: 'x', at: 0 }); const s = c.summary(agents); return s.population === 3 && s.breakthroughs === 1 && s.evolutionStage === 'Early awakening' && evolutionStage(120) === 'Transcendent civilisation' && s.activeConflicts === 0; } }
];
