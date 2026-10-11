/**
 * Business sync: loads the model (server API, cached copy or an imported
 * snapshot), keeps insight state (resolved/snoozed), and mirrors the real
 * pipeline into the realm's world so every real site is a house and every
 * finding can be a quest.
 */
import { buildModel, isModel, modelDigest } from './model.js';
import { applyState, toQuest, summarise } from './insights.js';
import { STAGE_IDS, STAGES } from '../domain/jobs.js';
import { cacheGet, cacheSet } from '../core/store.js';

export const CACHE_KEY = 'business.model.v1';
export const MAX_WORLD_JOBS = 220;

/** Realm stage for an imported job; completed sites keep their house. */
const STAGE_MAP = { lead: 'lead', quote: 'quote', approval: 'approval', install: 'install', claim: 'claim', handover: 'handover', complete: 'complete', lost: null };

export function createBusiness({ store, bus = null, world = null, fetchFn = (...a) => globalThis.fetch(...a), configUrl = () => (typeof window !== 'undefined' && window.SOLARFLOW_CONFIG && typeof window.SOLARFLOW_CONFIG.getVpsUrl === 'function' ? window.SOLARFLOW_CONFIG.getVpsUrl() : null), now = () => new Date() } = {}) {
    let model = null; let loading = null;
    const emit = (type, data = {}) => { if (bus) bus.emit(`business:${type}`, data); };
    const api = {
        get model() { return model; },
        status() { return { loaded: Boolean(model), generatedAt: model?.generatedAt || null, sources: model?.sources || {}, digest: modelDigest(model), loadedFrom: store.get('business.loadedFrom', null), loadedAt: store.get('business.loadedAt', null), server: configUrl() }; },
        /** Accept a built model or a raw connector payload. */
        setModel(json, { from = 'import', persist = true } = {}) {
            model = isModel(json) ? json : buildModel(json, { now: now() });
            store.set('business.loadedAt', now().toISOString()); store.set('business.loadedFrom', from); store.set('business.digest', modelDigest(model));
            if (persist) cacheSet(CACHE_KEY, model).catch(() => {});
            emit('loaded', { from, digest: modelDigest(model) });
            return model;
        },
        async load({ prefer = 'server' } = {}) {
            if (loading) return loading;
            loading = (async () => {
                // Only ask the server when there is a token to send (the API needs one) or it served the model before; avoids 401/404 noise on the static site.
                const tryServer = prefer === 'server' && Boolean(store.get('ui.cloud.token', '') || store.get('business.loadedFrom') === 'server');
                if (tryServer) { const fromServer = await api.pullServer().catch(() => null); if (fromServer) { loading = null; return fromServer; } }
                const cached = await cacheGet(CACHE_KEY).catch(() => null);
                if (cached && isModel(cached)) { api.setModel(cached, { from: 'cache', persist: false }); loading = null; return model; }
                loading = null; return null;
            })();
            return loading;
        },
        async pullServer() {
            const base = configUrl(); if (!base) return null;
            const headers = {}; const token = store.get('ui.cloud.token', ''); if (token) headers.authorization = `Bearer ${token}`;
            const res = await fetchFn(`${base.replace(/\/$/, '')}/api/business/model`, { headers, cache: 'no-cache' });
            if (!res.ok) { if (res.status === 404 || res.status === 204) return null; throw new Error(`Server ${res.status}`); }
            const json = await res.json(); if (!json || (!isModel(json) && !json.servicem8 && !json.xero)) return null;
            return api.setModel(json, { from: 'server' });
        },
        async requestSync() {
            const base = configUrl(); if (!base) throw new Error('No server configured');
            const headers = { 'content-type': 'application/json' }; const token = store.get('ui.cloud.token', ''); if (token) headers.authorization = `Bearer ${token}`;
            const res = await fetchFn(`${base.replace(/\/$/, '')}/api/business/sync`, { method: 'POST', headers, body: '{}' });
            if (!res.ok) throw new Error(res.status === 401 || res.status === 403 ? 'Log in as an admin to sync' : `Server ${res.status}`);
            return res.json();
        },
        async importFile(file) { const text = await file.text(); return api.setModel(JSON.parse(text), { from: `file:${file.name}` }); },
        exportJson() { return JSON.stringify(model, null, 0); },
        clear() { model = null; store.set('business.loadedAt', null); store.set('business.digest', null); cacheSet(CACHE_KEY, null).catch(() => {}); emit('cleared'); },
        /* ---------- insights ---------- */
        findings({ owner = null, category = null, includeInfo = true } = {}) {
            if (!model) return [];
            let list = applyState(model.insights || [], store.get('business.insights', {}));
            if (owner) list = list.filter((f) => f.owner === owner); if (category) list = list.filter((f) => f.category === category); if (!includeInfo) list = list.filter((f) => f.severity !== 'info');
            return list;
        },
        summary() { return summarise(api.findings()); },
        resolve(id, { note = '' } = {}) { const st = store.get('business.insights', {}); st.resolved = { ...(st.resolved || {}), [id]: { at: now().toISOString(), note } }; store.set('business.insights', st); if (world) { const f = (model?.insights || []).find((x) => x.id === id); if (f) { world.ledger.balance += toQuest(f).reward; world.ledger.earned = (world.ledger.earned || 0) + toQuest(f).reward; world.emit({ type: 'insight_resolved', text: `Resolved: ${f.title}`, insightId: id }); } } emit('resolved', { id }); },
        snooze(id, days = 7) { const st = store.get('business.insights', {}); st.snoozed = { ...(st.snoozed || {}), [id]: now().getTime() + days * 86400000 }; store.set('business.insights', st); emit('snoozed', { id, days }); },
        reopen(id) { const st = store.get('business.insights', {}); if (st.resolved) delete st.resolved[id]; if (st.snoozed) delete st.snoozed[id]; store.set('business.insights', st); emit('reopened', { id }); },
        quests() { return api.findings({ includeInfo: false }).map(toQuest); },
        /* ---------- world ---------- */
        /** Mirror real site jobs into the world: one realm job (and house) per ServiceM8 site job. */
        syncWorld({ limit = MAX_WORLD_JOBS } = {}) {
            if (!model || !world) return { created: 0, updated: 0, skipped: 0 };
            const candidates = model.jobs.filter((j) => j.isSite && j.kind !== 'test' && STAGE_MAP[j.stage] !== null);
            const active = candidates.filter((j) => j.stage !== 'complete'); const done = candidates.filter((j) => j.stage === 'complete');
            const chosen = [...active, ...done].slice(0, limit);
            let created = 0, updated = 0;
            for (const bj of chosen) {
                const stage = STAGE_MAP[bj.stage] || 'lead'; const idx = STAGE_IDS.indexOf(stage);
                let job = world.job(bj.id);
                const spec = { customer: bj.customer || bj.partner || 'Customer', address: bj.address.raw, postcode: bj.address.postcode, systemKw: bj.system.pvKw || 0, batteryKwh: bj.system.batteryKwh || 0, phases: bj.phases || 1 };
                if (!job) { job = world.addJob({ id: bj.id, ...spec }); created++; } else { Object.assign(job, spec); updated++; }
                job.source = 'servicem8'; job.real = true; job.stage = stage; job.suburb = bj.address.suburb; job.partner = bj.partner; job.kind = bj.kind;
                job.business = { number: bj.number, url: bj.url, status: bj.status, invoiceAmount: bj.invoiceAmount, paid: bj.paid, invoice: bj.invoice || null, overdue: bj.overdue || 0, isScheduled: bj.isScheduled, team: bj.team, system: bj.system, nmi: bj.nmi };
                for (const s of STAGES) { const si = STAGE_IDS.indexOf(s.id); for (const t of s.tasks) { const key = `${s.id}:${t}`; if (si < idx) job.tasks[key] = true; else if (si > idx) job.tasks[key] = false; } }
                if (stage === 'complete') for (const k of Object.keys(job.tasks)) job.tasks[k] = true;
                if (stage === 'install' && bj.system.pvKw) { const installTasks = Object.keys(job.tasks).filter((k) => k.startsWith('install:')); installTasks.forEach((k, i) => { job.tasks[k] = i < Math.floor(installTasks.length * 0.5); }); }
                job.updatedAt = now().toISOString();
            }
            store.set('business.worldSyncedAt', now().toISOString());
            emit('worldSynced', { created, updated, total: chosen.length });
            return { created, updated, skipped: candidates.length - chosen.length, total: chosen.length };
        },
        /** Sites grouped by suburb for the world map and the Sites window. */
        districts() {
            if (!model) return [];
            const by = new Map();
            for (const s of model.sites) { const name = s.address.suburb || 'Unknown'; if (!by.has(name)) by.set(name, { name, postcode: s.address.postcode, sites: [], installed: 0, revenue: 0, waiting: 0, overdue: 0 }); const d = by.get(name); d.sites.push(s.id); if (s.installed) d.installed++; d.revenue += s.revenue || 0; d.waiting += s.waiting || 0; d.overdue += s.overdue || 0; }
            return [...by.values()].sort((a, b) => b.sites.length - a.sites.length);
        },
        site(id) { return model?.sites.find((s) => s.id === id) || null; },
        job(id) { return model?.jobs.find((j) => j.id === id) || null; }
    };
    return api;
}

export const FEATURES = [
    { id: 'biz.sync.import', title: 'Importing a raw snapshot builds the model, caches it and reports a digest', test: async () => { const { Store, createMemoryStorage } = await import('../core/store.js'); const { SAMPLE_RAW } = await import('./model.js'); const store = new Store({ storage: createMemoryStorage() }); const b = createBusiness({ store, configUrl: () => null, now: () => new Date('2026-10-12') }); b.setModel(SAMPLE_RAW(), { persist: false }); const st = b.status(); return st.loaded && st.digest.sites === 4 && st.loadedFrom === 'import' && b.findings().length >= 10 && b.summary().score > 0; } },
    { id: 'biz.sync.server', title: 'The model loads from /api/business/model with the cloud token, falling back when absent', test: async () => { const { Store, createMemoryStorage } = await import('../core/store.js'); const { SAMPLE_RAW } = await import('./model.js'); const store = new Store({ storage: createMemoryStorage() }); store.set('ui.cloud.token', 'T'); const calls = []; const b = createBusiness({ store, configUrl: () => 'https://api.example', fetchFn: async (url, init) => { calls.push({ url, auth: init.headers.authorization }); return { ok: true, status: 200, json: async () => SAMPLE_RAW() }; }, now: () => new Date('2026-10-12') }); const m = await b.load(); const none = createBusiness({ store, configUrl: () => 'https://api.example', fetchFn: async () => ({ ok: false, status: 404 }) }); const r = await none.pullServer(); return m && m.jobs.length === 5 && calls[0].url.endsWith('/api/business/model') && calls[0].auth === 'Bearer T' && b.status().loadedFrom === 'server' && r === null; } },
    { id: 'biz.sync.state', title: 'Resolving a finding pays its quest reward and hides it; snoozing hides it for a while', test: async () => { const { Store, createMemoryStorage } = await import('../core/store.js'); const { World } = await import('../sim/world.js'); const { SAMPLE_RAW } = await import('./model.js'); const store = new Store({ storage: createMemoryStorage() }); const world = new World({ seed: 1 }); const b = createBusiness({ store, world, configUrl: () => null, now: () => new Date('2026-10-12') }); b.setModel(SAMPLE_RAW(), { persist: false }); const before = b.findings().length; const bal = world.ledger.balance; const f = b.findings()[0]; b.resolve(f.id); b.snooze(b.findings()[0].id, 7); const q = b.quests(); return b.findings().length === before - 2 && world.ledger.balance > bal && q.every((x) => x.id.startsWith('insight:')) && q.length < before; } },
    { id: 'biz.sync.world', title: 'Real site jobs mirror into the world as realm jobs with the right stage, tasks and business links', test: async () => { const { Store, createMemoryStorage } = await import('../core/store.js'); const { World } = await import('../sim/world.js'); const { SAMPLE_RAW } = await import('./model.js'); const store = new Store({ storage: createMemoryStorage() }); const world = new World({ seed: 1 }); const b = createBusiness({ store, world, configUrl: () => null, now: () => new Date('2026-10-12') }); b.setModel(SAMPLE_RAW(), { persist: false }); const r = b.syncWorld(); const j1 = world.job('SM8-1001'); const j2 = world.job('SM8-1002'); const j3 = world.job('SM8-1003'); const again = b.syncWorld(); return r.created === 4 && !world.job('SM8-1005') && j1.stage === 'handover' && j1.real && j1.business.url.includes('servicem8') && j1.tasks['lead:Capture site address and postcode'] === true && j2.stage === 'approval' && j2.systemKw === 8.8 && j3.stage === 'complete' && Object.values(j3.tasks).every(Boolean) && again.updated === 4 && again.created === 0 && b.districts()[0].sites.length >= 1; } }
];
