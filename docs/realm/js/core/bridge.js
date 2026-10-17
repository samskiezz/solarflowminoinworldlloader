/**
 * Engine bridge (ported from ml-llm-api-bridge.js): one place that knows every
 * engine in the Realm, routes a plain question to the right one – product
 * knowledge, the compliance pipeline, or a minion speaking through the LLM –
 * reports each minion's capabilities and keeps the metrics the Engines tab
 * shows. The original bridged to external ML services; this one bridges to
 * the engines that exist and are tested here.
 */
import { processQuery, systemHealth, catalogue } from '../domain/compliance.js';
import { indexProducts, queryKnowledge, FACT_WORDS_LIST } from '../domain/pipeline.js';
import { autoCite } from '../domain/hierarchy.js';
import { archetypeFor, ARCHETYPES } from '../sim/narrative.js';
import { stats as libraryStats } from '../domain/library.js';

export const CAPABILITY_BY_TIER = { 3: { level: 'strategic', label: 'Strategic (orchestrates the others)' }, 2: { level: 'specialist', label: 'Specialist (owns a domain)' }, 1: { level: 'assistant', label: 'Assistant (learning the trade)' } };

/** Which engines a minion actually draws on, from their specialties. */
export function integrationsFor(agent, { llmConfigured = false } = {}) {
    const spec = (agent.meta?.specialties || []).join(' ').toLowerCase();
    const list = ['narrative', 'shifts'];
    if (/standard|compliance|audit|inspection|governance|safety|as\/nzs/.test(spec) || agent.tier >= 3) list.push('hierarchy', 'courtsafe', 'compliance');
    if (/document|data|ocr|pipeline|research|product|catalogue|serial/.test(spec)) list.push('pipeline');
    if (/grid|dnsp|connection|export/.test(spec)) list.push('dnsp');
    if (llmConfigured) list.push('llm');
    return [...new Set(list)];
}

/** Route a question: a product fact lookup, the compliance pipeline, or small talk for the chat window. */
export function routeFor(question, index = []) {
    const q = String(question || '').toLowerCase();
    if (!q.trim()) return 'empty';
    const namesProduct = index.some((k) => (k.model && q.includes(k.model.toLowerCase())) || (k.manufacturer && q.includes(k.manufacturer.toLowerCase())));
    const asksFact = FACT_WORDS_LIST.some((w) => q.includes(w));
    if (namesProduct || (asksFact && /\b(panel|module|inverter|battery|product|model)\b/.test(q))) return 'product';
    return 'compliance';
}

export function createBridge(ctx) {
    let indexed = { source: null, index: [] };
    const metrics = { asked: 0, product: 0, compliance: 0, refused: 0, llm: 0 };
    const index = () => { if (indexed.source !== ctx.products.list) indexed = { source: ctx.products.list, index: indexProducts(ctx.products.list) }; return indexed.index; };
    const bridge = {
        metrics,
        index,
        route(question) { return routeFor(question, index()); },
        /** Synchronous answer from the engines. */
        ask(question, context = {}) {
            const route = bridge.route(question);
            metrics.asked++;
            if (route === 'empty') return { route, result: null };
            if (route === 'product') {
                metrics.product++;
                const hits = queryKnowledge(question, index());
                const cite = autoCite(question, { product: true, now: ctx.now() });
                return { route, result: { hits, answer: hits.length ? hits[0].answer : 'No product in the catalogue matches that question.', tier: cite.tier, basis: cite.basis } };
            }
            metrics.compliance++;
            const result = processQuery(question, { library: ctx.library, ...context, now: ctx.now() });
            if (result.refused) metrics.refused++;
            return { route, result };
        },
        /** A minion answers through the LLM with the engines' findings in their context; null when no LLM is configured. */
        async askAs(agent, question, context = {}) {
            if (!ctx.llm.configured()) return null;
            const engine = bridge.ask(question, context);
            const brief = engine.route === 'product' ? engine.result.answer : engine.result.refused ? `The court-safe framework refused: ${engine.result.refusal.specificReasons.join('; ')}` : `${engine.result.basis} ${engine.result.answer}`;
            metrics.llm++;
            return ctx.llm.replyAs(agent, `${question}\n\n(Engine findings to rely on, cite them rather than inventing: ${brief})`, { ctx });
        },
        capabilities() {
            const llmConfigured = ctx.llm.configured();
            return ctx.world.crew().map((a) => ({ id: a.id, name: a.name, tier: a.tier, title: a.meta?.title || a.role, capability: (CAPABILITY_BY_TIER[a.tier] || CAPABILITY_BY_TIER[1]).level, label: (CAPABILITY_BY_TIER[a.tier] || CAPABILITY_BY_TIER[1]).label, archetype: ARCHETYPES[archetypeFor(a)].label, integrations: integrationsFor(a, { llmConfigured }), status: a.currentTask ? 'working' : (a.meta.shift?.status || 'ready') }));
        },
        status() {
            const last = ctx.store.get('stats.lastSelfTest') || null;
            return { ...systemHealth({ crew: ctx.world.crew().length, selfTest: last, llmConfigured: ctx.llm.configured(), businessLoaded: Boolean(ctx.business?.model), library: libraryStats(ctx.library) }), metrics: { ...metrics }, catalogue: catalogue(), products: ctx.products.list.length };
        }
    };
    return bridge;
}

export const FEATURES = [
    { id: 'bridge.route', title: 'Questions route to product knowledge or the compliance pipeline', test: async () => { const { createContext } = await import('./context.js'); const ctx = createContext({ products: { categories: { inverters: [{ id: 'I1', manufacturer: 'Gamma', model: 'G5 Hybrid', category: 'inverter', cerApproved: true, specifications: { ac_power_kw: 5, max_dc_voltage: 600 } }] } } }); const b = createBridge(ctx); return b.route('What is the max dc voltage of the Gamma G5?') === 'product' && b.route('What export limit does Ausgrid allow?') === 'compliance' && b.route('') === 'empty' && b.route('what is the voc of this panel') === 'product'; } },
    { id: 'bridge.ask', title: 'Asking returns the product fact or the full court-safe compliance record and counts the metrics', test: async () => { const { createContext } = await import('./context.js'); const ctx = createContext({ products: { categories: { inverters: [{ id: 'I1', manufacturer: 'Gamma', model: 'G5 Hybrid', category: 'inverter', cerApproved: true, specifications: { ac_power_kw: 5, max_dc_voltage: 600 } }] } } }); const b = createBridge(ctx); const p = b.ask('What is the max dc voltage of the Gamma G5 Hybrid?'); const c = b.ask('What is the voltage rise limit at the inverter?'); const r = b.ask('Design the 2 MW farm', { params: { powerKw: 2000 } }); return p.route === 'product' && /600 V/.test(p.result.answer) && p.result.tier.tier >= 2 && p.result.basis && c.route === 'compliance' && c.result.tier.tier === 2 && c.result.tests.allPassed && r.result.refused && b.metrics.asked === 3 && b.metrics.product === 1 && b.metrics.compliance === 2 && b.metrics.refused === 1; } },
    { id: 'bridge.capabilities', title: 'Every crew minion reports a capability level, archetype and the engines they draw on', test: async () => { const { createContext } = await import('./context.js'); const ctx = createContext(); const caps = createBridge(ctx).capabilities(); const atlas = caps.find((c) => c.id === 'ATLAS'); return caps.length === 6 && atlas && atlas.capability === 'strategic' && atlas.integrations.includes('compliance') && atlas.integrations.includes('narrative') && !atlas.integrations.includes('llm') && caps.every((c) => c.archetype && c.label); } },
    { id: 'bridge.status', title: 'Status rolls up engine health, the catalogue, metrics, products and the LLM state', test: async () => { const { createContext } = await import('./context.js'); const ctx = createContext(); const b = createBridge(ctx); const s = b.status(); const none = await b.askAs(ctx.world.agent('ATLAS'), 'hello'); return s.engines.length === 9 && s.engines.find((e) => e.id === 'llm').status === 'standby' && s.catalogue.reserved === 500 && s.metrics.asked === 0 && s.products === 0 && none === null && s.minionsOperational === 6; } }
];
