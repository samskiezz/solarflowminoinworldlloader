/**
 * Dialogue: deterministic template lines driven by mood, traits, memory and
 * context, with an optional LLM hook (window.SOLARFLOW_LLM.complete(prompt)).
 */
import { mood } from './needs.js';
import { searchStandards } from '../domain/standards.js';

const GREETINGS = {
    Thriving: ['Ready when you are.', 'Good day for clean installs.', 'Let us get this one right the first time.'],
    Steady: ['On it.', 'What is next?', 'Show me the job.'],
    Strained: ['I can push through, but I would like a break after this.', 'Let me double-check my numbers today.', 'Running a bit low.'],
    Depleted: ['I need rest before I touch anything live.', 'Not safe for me to audit right now.', 'Give me an hour to recover.']
};

const TRAIT_LINES = {
    meticulous: 'I will re-check the isolator wiring before we sign off.',
    gregarious: 'I will walk the owner through the shutdown procedure myself.',
    tinkerer: 'Let me run the string sizing again at the real site minimum temperature.',
    sentinel: 'Has anyone measured the clearance from that window?',
    sprinter: 'We can have the array up before lunch.',
    scholar: 'AS/NZS 4777.1:2024 changed that clause; let me quote it.',
    steady: 'One step at a time; the checklist does not lie.',
    optimist: 'This one is going to pass clean, I can feel it.'
};

export function greeting(agent, random = Math.random) {
    const m = mood(agent.needs);
    const lines = GREETINGS[m.label] || GREETINGS.Steady;
    return lines[Math.floor(random() * lines.length)];
}

export function traitLine(agent, random = Math.random) {
    const traits = (agent.traits || []).filter((t) => TRAIT_LINES[t]);
    if (!traits.length) return 'Let us look at the standards together.';
    return TRAIT_LINES[traits[Math.floor(random() * traits.length)]];
}

/** Compose a reply to a user message using memory retrieval. */
export function reply(agent, message, { memory, random = Math.random, now } = {}) {
    const text = String(message || '').trim();
    const lower = text.toLowerCase();
    if (!text) return greeting(agent, random);
    if (/^(hi|hello|hey|g'day)/.test(lower)) return `${greeting(agent, random)} ${traitLine(agent, random)}`;
    if (/how are you|status|feeling/.test(lower)) {
        const m = mood(agent.needs);
        const worst = Object.entries(agent.needs).sort((a, b) => a[1] - b[1])[0];
        return `${m.label} (${m.score}/100). Lowest need: ${worst[0]} at ${Math.round(worst[1])}.${m.moodlets.length ? ' Moodlets: ' + m.moodlets.map((x) => x.label).join(', ') + '.' : ''}`;
    }
    if (/remember|recall|what did you|last time|memory/.test(lower) && memory) {
        const hits = memory.retrieve(text, { limit: 3, now });
        return hits.length ? `I remember: ${hits.map((h) => h.text).join(' | ')}` : 'Nothing relevant in my memory yet.';
    }
    if (/who are you|what do you do|your (job|role|specialt)|introduce/.test(lower)) { const meta = agent.meta || {}; return `I am ${agent.name}, ${meta.title || agent.role}${meta.specialties ? ` – my specialties are ${meta.specialties.slice(0, 3).join(', ')}` : ''}. Ask me about a standard, a job, or how I am doing.`; }
    if (/as\/nzs|clause|standard|voltage|isolator|battery|clearance|earth|rcd|export|inverter|cable|label|rise|drop/.test(lower)) {
        const words = lower.replace(/[^a-z0-9/ .:-]/g, ' ').split(/\s+/).filter((w) => w.length > 3 && !['about', 'what', 'where', 'which', 'should', 'there', 'their', 'limit', 'maximum', 'this', 'that', 'with', 'from', 'does', 'have'].includes(w));
        const phrases = words.slice(0, -1).map((w, i) => `${w} ${words[i + 1]}`);
        const score = new Map();
        const add = (hit, n) => { const key = `${hit.standardId}#${hit.ref}`; const e = score.get(key) || { hit, n: 0 }; e.n += n; score.set(key, e); };
        for (const ph of phrases) for (const hit of searchStandards(ph)) add(hit, 4);
        for (const w of words) for (const hit of searchStandards(w)) add(hit, 1);
        const hits = [...score.values()].sort((a, b) => b.n - a.n).slice(0, 2).map((e) => e.hit);
        if (hits.length) return `${hits.map((h) => `${h.standard} Cl ${h.ref} (${h.title}): ${h.summary}`).join(' ')} Check the Codex (N) for the full note.`;
    }
    if (/skill|level|good at/.test(lower)) {
        const best = Object.entries(agent.skills || {}).sort((a, b) => b[1] - a[1])[0];
        return best ? `My strongest area is ${best[0].replace(/_/g, ' ')} (${best[1]} XP).` : 'I am still learning everything.';
    }
    if (memory) {
        const hits = memory.retrieve(text, { limit: 1, now });
        if (hits.length && hits[0].relevance > 0.2) return `That reminds me: ${hits[0].text}`;
    }
    return `${traitLine(agent, random)} What should I do about "${text.slice(0, 60)}"?`;
}

/** Optional LLM-backed reply; falls back to templates. */
export async function replyWithLlm(agent, message, options = {}) {
    const llm = options.llm ?? (typeof window !== 'undefined' ? window.SOLARFLOW_LLM : null);
    if (llm && typeof llm.complete === 'function') {
        try {
            const context = options.memory ? options.memory.retrieve(message, { limit: 5, now: options.now }).map((m) => `- ${m.text}`).join('\n') : '';
            const prompt = `You are ${agent.name}, a solar compliance crew member with traits ${agent.traits.join(', ')}. Mood: ${mood(agent.needs).label}.\nRelevant memories:\n${context}\nUser: ${message}\nReply in two sentences, cite AS/NZS clauses when relevant.`;
            const out = typeof llm.replyAs === 'function' ? await llm.replyAs(agent, message, { ctx: options.ctx, history: options.history || [] }) : await llm.complete(prompt);
            if (out && String(out).trim()) return String(out).trim();
        } catch (error) {
            // fall through to templates
        }
    }
    return reply(agent, message, options);
}

export const FEATURES = [
    { id: 'dialogue.greeting', title: 'Mood-based greeting', test: () => GREETINGS.Depleted.includes(greeting({ needs: { energy: 5, focus: 5, morale: 5, social: 5, mastery: 5, safety: 5 } }, () => 0)) },
    { id: 'dialogue.traitLine', title: 'Trait flavour lines', test: () => traitLine({ traits: ['sentinel'] }, () => 0).includes('clearance') },
    { id: 'dialogue.reply.status', title: 'Status reply reports mood and lowest need', test: () => reply({ needs: { energy: 20, focus: 90, morale: 90, social: 90, mastery: 90, safety: 90 }, traits: [], skills: {} }, 'how are you').includes('energy') },
    { id: 'dialogue.reply.skills', title: 'Skills reply', test: () => reply({ needs: {}, traits: [], skills: { pv_arrays: 120, wiring_rules: 30 } }, 'what are you good at').includes('pv arrays') },
    { id: 'dialogue.reply.standards', title: 'Crew quote standard clauses when asked about the rules', test: () => /AS\/NZS 4777\.1.*Cl/.test(reply({ needs: {}, traits: [], skills: {} }, 'what is the voltage rise limit?')) },
    { id: 'dialogue.reply.intro', title: 'Crew introduce themselves with title and specialties', test: () => reply({ name: 'Sentry', role: 'Commissioning tech', needs: {}, traits: [], skills: {}, meta: { title: 'Inspection & Audit Lead', specialties: ['audit', 'schema-validation'] } }, 'who are you?').includes('Inspection & Audit Lead') },
    { id: 'dialogue.replyWithLlm.fallback', title: 'LLM hook with template fallback', test: async () => (await replyWithLlm({ name: 'X', needs: { energy: 90 }, traits: ['optimist'], skills: {} }, 'hello', { llm: { complete: async () => { throw new Error('offline'); } }, random: () => 0 })).length > 5 },
    { id: 'dialogue.replyWithLlm.hook', title: 'LLM hook used when available', test: async () => (await replyWithLlm({ name: 'X', needs: { energy: 90 }, traits: [], skills: {} }, 'hi', { llm: { complete: async () => 'LLM says hi' } })) === 'LLM says hi' }
];
