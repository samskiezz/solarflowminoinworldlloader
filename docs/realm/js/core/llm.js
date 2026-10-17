/**
 * Optional language-model adapter for crew dialogue (ported from the original
 * MinionCognitionEngine): OpenAI-compatible or Anthropic chat endpoints,
 * configured in Settings › AI, rate-limited, with the key kept only in this
 * browser. When configured it installs window.SOLARFLOW_LLM so dialogue.js
 * can use it; otherwise the template dialogue runs.
 */
import { mood } from '../sim/needs.js';
import { searchStandards } from '../domain/standards.js';

export const PROVIDERS = {
    openai: { label: 'OpenAI-compatible (chat/completions)', baseURL: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
    anthropic: { label: 'Anthropic Messages API', baseURL: 'https://api.anthropic.com/v1', model: 'claude-sonnet-5-5' },
    local: { label: 'Local server (Ollama / LM Studio, OpenAI-compatible)', baseURL: 'http://localhost:11434/v1', model: 'llama3' }
};
export const DEFAULT_CONFIG = { provider: 'openai', baseURL: PROVIDERS.openai.baseURL, model: PROVIDERS.openai.model, apiKey: '', enabled: false, maxTokens: 220, temperature: 0.7, rateLimitMs: 1500 };

export function buildRequest(config, { system, messages }) {
    const c = { ...DEFAULT_CONFIG, ...config };
    if (c.provider === 'anthropic') {
        return { url: `${c.baseURL.replace(/\/$/, '')}/messages`, headers: { 'content-type': 'application/json', 'x-api-key': c.apiKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' }, body: { model: c.model, max_tokens: c.maxTokens, temperature: c.temperature, system, messages: messages.map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content })) }, parse: (data) => (data.content || []).map((p) => p.text || '').join('').trim() };
    }
    return { url: `${c.baseURL.replace(/\/$/, '')}/chat/completions`, headers: { 'content-type': 'application/json', ...(c.apiKey ? { authorization: `Bearer ${c.apiKey}` } : {}) }, body: { model: c.model, max_tokens: c.maxTokens, temperature: c.temperature, messages: [{ role: 'system', content: system }, ...messages] }, parse: (data) => (data.choices?.[0]?.message?.content || '').trim() };
}

/** The persona prompt: who the minion is, how they feel, what they remember, what the standards say. */
export function personaPrompt(agent, { company = 'the company', player = 'the installer', memories = [], standardsHits = [] } = {}) {
    const m = mood(agent.needs); const meta = agent.meta || {};
    return [
        `You are ${agent.name}, a ${meta.title || agent.role} (tier ${agent.tier}${meta.legacyRole ? `, ${meta.legacyRole.toLowerCase()}` : ''}) in a solar installation crew at ${company} in the town of Solarhaven.`,
        `Traits: ${(agent.traits || []).join(', ')}. Specialties: ${(meta.specialties || []).join(', ') || 'general'}. Mood: ${m.label} (${m.score}/100)${m.moodlets.length ? `, feeling ${m.moodlets.map((x) => x.label.toLowerCase()).join(' and ')}` : ''}.`,
        agent.currentTask ? `You are currently working on: ${agent.currentTask.label}${agent.currentTask.jobId ? ` for job ${agent.currentTask.jobId}` : ''}.` : 'You are not on a task right now.',
        memories.length ? `Things you remember:\n${memories.map((t) => `- ${t}`).join('\n')}` : '',
        standardsHits.length ? `Relevant standard clauses (cite them when useful):\n${standardsHits.map((h) => `- ${h.standard} Cl ${h.ref} ${h.title}: ${h.summary}`).join('\n')}` : '',
        `You are talking to ${player}. Stay in character, be concrete about Australian/New Zealand solar and battery compliance (AS/NZS 3000, 5033, 4777.1, 5139), keep replies to two or three sentences, never invent clause numbers that are not listed above.`
    ].filter(Boolean).join('\n');
}

export function createLlm({ store, fetchFn = (...a) => globalThis.fetch(...a), now = () => Date.now() } = {}) {
    let last = 0; let inflight = Promise.resolve();
    const config = () => ({ ...DEFAULT_CONFIG, ...(store ? store.get('ui.llm', {}) : {}) });
    const api = {
        config,
        configured() { const c = config(); return Boolean(c.enabled && c.model && c.baseURL && (c.apiKey || c.provider === 'local')); },
        save(patch) { if (store) store.set('ui.llm', { ...config(), ...patch }); api.install(); return config(); },
        async complete(input, options = {}) {
            const c = config(); if (!api.configured()) throw new Error('LLM not configured');
            const req = typeof input === 'string' ? { system: options.system || 'You are a helpful solar compliance crew member.', messages: [{ role: 'user', content: input }] } : input;
            const built = buildRequest(c, req);
            const run = async () => {
                const wait = Math.max(0, c.rateLimitMs - (now() - last)); if (wait) await new Promise((r) => setTimeout(r, wait)); last = now();
                const res = await fetchFn(built.url, { method: 'POST', headers: built.headers, body: JSON.stringify(built.body) });
                if (!res.ok) throw new Error(`LLM ${res.status}`);
                return built.parse(await res.json());
            };
            inflight = inflight.then(run, run); return inflight;
        },
        /** Reply as an agent, with persona, memories and standards context. */
        async replyAs(agent, message, { ctx = null, history = [] } = {}) {
            const memories = agent.memory ? agent.memory.retrieve(message, { limit: 5, now: ctx ? ctx.world.time : undefined }).map((m) => m.text) : [];
            const standardsHits = searchStandards(message).slice(0, 3);
            const system = personaPrompt(agent, { company: ctx ? ctx.profile().company : undefined, player: ctx ? ctx.profile().name : undefined, memories, standardsHits });
            return api.complete({ system, messages: [...history.slice(-8).map((h) => ({ role: h.from === 'you' ? 'user' : 'assistant', content: h.text })), { role: 'user', content: message }] });
        },
        async test() { try { const out = await api.complete('Reply with the single word OK.'); return { ok: Boolean(out), sample: String(out).slice(0, 80) }; } catch (error) { return { ok: false, error: error.message }; } },
        install() { if (typeof window === 'undefined') return false; if (api.configured()) { window.SOLARFLOW_LLM = { complete: (prompt, options) => api.complete(prompt, options), replyAs: api.replyAs, configured: true }; return true; } if (window.SOLARFLOW_LLM && window.SOLARFLOW_LLM.replyAs === api.replyAs) delete window.SOLARFLOW_LLM; return false; }
    };
    return api;
}

const memStore = () => { const d = {}; return { get: (p, f) => d[p] ?? f, set: (p, v) => { d[p] = v; } }; };
export const FEATURES = [
    { id: 'core.llm.requests', title: 'Builds OpenAI-compatible and Anthropic requests', test: () => { const o = buildRequest({ provider: 'openai', apiKey: 'k', baseURL: 'https://x/v1', model: 'm' }, { system: 's', messages: [{ role: 'user', content: 'hi' }] }); const a = buildRequest({ provider: 'anthropic', apiKey: 'k', baseURL: 'https://a/v1', model: 'c' }, { system: 's', messages: [{ role: 'user', content: 'hi' }] }); return o.url.endsWith('/chat/completions') && o.headers.authorization === 'Bearer k' && o.body.messages[0].role === 'system' && a.url.endsWith('/messages') && a.headers['x-api-key'] === 'k' && a.body.system === 's' && o.parse({ choices: [{ message: { content: ' yo ' } }] }) === 'yo' && a.parse({ content: [{ text: 'a' }, { text: 'b' }] }) === 'ab'; } },
    { id: 'core.llm.persona', title: 'Persona prompt carries role, mood, memories and standard clauses', test: () => { const p = personaPrompt({ name: 'Atlas', role: 'Lead installer', tier: 3, traits: ['meticulous'], needs: { energy: 90, focus: 90, morale: 90, social: 90, mastery: 90, safety: 90 }, meta: { title: 'Solar Installation Specialist', specialties: ['governance'] } }, { memories: ['Isolator failed on JOB-1'], standardsHits: [{ standard: 'AS/NZS 5033:2021', ref: '4.4.5', title: 'Wiring', summary: 'x' }] }); return p.includes('Solar Installation Specialist') && p.includes('Thriving') && p.includes('Isolator failed') && p.includes('Cl 4.4.5'); } },
    { id: 'core.llm.notConfigured', title: 'Unconfigured adapter refuses and leaves the template dialogue in place', test: async () => { const llm = createLlm({ store: memStore() }); let threw = false; try { await llm.complete('x'); } catch (e) { threw = true; } return !llm.configured() && threw; } },
    { id: 'core.llm.completeAndRateLimit', title: 'Completes through fetch with rate limiting', test: async () => { let calls = 0; let t = 0; const llm = createLlm({ store: memStore(), now: () => t, fetchFn: async (url, init) => { calls++; return { ok: true, json: async () => ({ choices: [{ message: { content: `reply ${JSON.parse(init.body).messages.at(-1).content}` } }] }) }; } }); llm.save({ enabled: true, apiKey: 'k', rateLimitMs: 0 }); const out = await llm.complete('ping'); return out === 'reply ping' && calls === 1 && llm.configured(); } },
    { id: 'core.llm.replyAs', title: 'Replies as a minion with memories and clause context', test: async () => { let seenSystem = ''; const llm = createLlm({ store: memStore(), fetchFn: async (url, init) => { seenSystem = JSON.parse(init.body).messages[0].content; return { ok: true, json: async () => ({ choices: [{ message: { content: 'ok' } }] }) }; } }); llm.save({ enabled: true, apiKey: 'k', rateLimitMs: 0 }); const agent = { name: 'Nova', role: 'Designer', tier: 2, traits: [], needs: { energy: 50, focus: 50, morale: 50, social: 50, mastery: 50, safety: 50 }, meta: {}, memory: { retrieve: () => [{ text: 'We fixed the isolator' }] } }; const out = await llm.replyAs(agent, 'what about voltage rise?'); return out === 'ok' && seenSystem.includes('We fixed the isolator') && /4777/.test(seenSystem); } },
    { id: 'core.llm.errors', title: 'HTTP errors surface as test failures, not crashes', test: async () => { const llm = createLlm({ store: memStore(), fetchFn: async () => ({ ok: false, status: 401 }) }); llm.save({ enabled: true, apiKey: 'bad', rateLimitMs: 0 }); const r = await llm.test(); return r.ok === false && /401/.test(r.error); } }
];
