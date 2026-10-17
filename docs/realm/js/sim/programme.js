/**
 * The Programme: the thousand-feature list as work for the Workforce. Every
 * item becomes a task that flows research → execute → audit → review →
 * sign-off; the research stage pulls citations from the library, the execute
 * stage checks what backs the item (a self-tested feature, a register, a
 * policy) or writes a specification record for anything the static realm
 * cannot run itself, and Ultron's sign-off marks it done with its evidence.
 * In "full" run mode the sweep keeps feeding the queue until every item has
 * been signed; "test" mode feeds a handful; "paused" feeds none.
 */
import { searchLibrary } from '../domain/library.js';

export const STATUSES = ['live', 'register', 'policy', 'spec'];
export const STATUS_LABEL = { live: 'Live – self-tested feature', register: 'Register – typed rows, history, export', policy: 'Policy – configurable, enforced', spec: 'Specified – needs a server, device or external system' };
export const BATCH_BY_MODE = { full: 80, test: 5, paused: 0 };

/** What a spec item depends on, from its title: a server, a device, or an external system. */
export function dependencyOf(title) {
    const t = title.toLowerCase();
    if (/saml|openid|sso|provision|sms|push notif|email notif|webhook|openapi|api |sdk|database|migration|backup|deploy|probe|logging|tracing|server|pool|canary|blue-green|cache|load shed|circuit|restore|recovery|tenant|residency|key rotation|encryption key|secret|csrf|content security|rate limit|idempot|pagination|cursor|retry|dead-letter|malware|ocr|handwrit|table structure|diagram region|signature|watermark|resumable|upload/.test(t)) return 'server';
    if (/offline|camera|voice|device|location|gps|photo|lidar|drone|barcode|qr |scan|mobile|glove|sunlight|metered|bandwidth|wake|screen-reader/.test(t)) return 'device';
    if (/connector|ingestion|telemetry|modbus|mqtt|sunspec|ocpp|retailer|distributor|manufacturer portal|gis|weather|crm|accounting|job management|support|e-signature|electronic signature|cloud document|remote|firmware|inverter|meter|smart meter/.test(t)) return 'external';
    return 'server';
}

/** A specification record: what the minions hand to whoever builds the server-side piece. */
export function writeSpec(item, citations = []) {
    const dep = dependencyOf(item.title);
    const reqs = [
        `Data: a ${item.title.toLowerCase()} record with owner, timestamps and an audit entry for every change`,
        'Permissions: readable by the project team, writable by its owner and administrators, visible to auditors read-only',
        dep === 'server' ? 'Server: an authenticated endpoint under /api with validation, idempotency keys and structured errors' : dep === 'device' ? 'Device: the mobile shell captures it offline and synchronises with conflict detection' : 'External: an adapter with credentials in the environment, health checks and a replayable delivery log',
        'Realm: a window or register surface, a command-palette entry, and a self-test registered in FEATURES',
        'Evidence: acceptance evidence recorded in the acceptance_evidence register before sign-off'
    ];
    const acceptance = ['Self-test passes in Node or the browser', 'Audit team reproduces the behaviour from the record alone', citations.length ? `Cites ${citations.map((c) => c.code).join(', ')}` : 'No standard applies; cites product documentation'];
    return { dependsOn: dep, requirements: reqs, acceptance, citations };
}

export class Programme {
    constructor({ items = [], domains = [], state = {}, mode = 'full', cursor = 0 } = {}) {
        this.items = items; this.domains = domains; this.state = state; this.mode = mode; this.cursor = cursor; this.counts = null;
    }
    /** Load the programme file (docs/data/programme.json). */
    load(data) { this.items = data.items || []; this.domains = data.domains || []; this.counts = data.counts || null; return this; }
    get loaded() { return this.items.length > 0; }
    item(n) { return this.items.find((i) => i.n === n) || null; }
    stateOf(n) { return this.state[n] || { status: 'open' }; }
    /** Items not yet queued or signed. */
    pending() { return this.items.filter((i) => { const s = this.state[i.n]; return !s || s.status === 'open'; }); }
    setMode(mode) { this.mode = BATCH_BY_MODE[mode] !== undefined ? mode : 'full'; return this.mode; }
    /** Queue the next batch into the workforce. Research evidence (library citations) is attached as the task is created. */
    sweep(world, { library = null, batch = null } = {}) {
        if (!world || !world.workforce) return 0;
        const size = batch ?? BATCH_BY_MODE[this.mode] ?? 0; if (!size) return 0;
        let added = 0;
        for (const item of this.pending().slice(0, size)) {
            const citations = library ? searchLibrary(library, item.title, { limit: 3 }).map((h) => ({ book: h.bookId, code: h.code, heading: h.heading || null, url: h.url || null })) : [];
            const priority = item.status === 'live' ? 1 : item.status === 'spec' ? 3 : 2;
            const t = world.workforce.addTask({ kind: 'feature', subject: `#${item.n} ${item.title}`, ref: `feature:${item.n}`, executeTeam: item.team, priority, meta: { n: item.n, status: item.status } }, world.time);
            if (!t) continue;
            this.state[item.n] = { status: 'queued', taskId: t.id, queuedAt: world.time, citations, verified: null };
            added++;
        }
        return added;
    }
    /** Ultron signed a feature task off: record it, and write the spec for anything the realm cannot run. */
    onSignoff(task, world) {
        const n = task.meta && task.meta.n; const item = this.item(n); if (!item) return null;
        const s = this.state[n] || {}; const rec = { ...s, status: 'signed', signedAt: world.time, taskId: task.id, handoffs: task.history.length, reworks: task.reworks };
        if (item.status === 'spec') rec.spec = writeSpec(item, s.citations || []);
        this.state[n] = rec; return rec;
    }
    /** Adopt a shipped state (the nightly headless run): signed items the world has not signed itself are taken over, nothing the world signed is lost. */
    adopt(state = {}) {
        let taken = 0;
        for (const [n, rec] of Object.entries(state)) { const mine = this.state[n]; if (rec && rec.status === 'signed' && (!mine || mine.status !== 'signed')) { this.state[n] = rec; taken++; } }
        return taken;
    }
    /** Mark live items verified from a self-test run (map of feature id → passed). */
    verify(results) {
        let verified = 0; let failed = 0;
        for (const item of this.items) {
            if (item.status !== 'live' || !item.features.length) continue;
            const known = item.features.filter((id) => id in results); if (!known.length) continue;
            const ok = known.every((id) => results[id] === true);
            this.state[item.n] = { ...(this.state[item.n] || { status: 'open' }), verified: ok, verifiedAt: Date.now() };
            if (ok) verified++; else failed++;
        }
        return { verified, failed };
    }
    summary() {
        const by = { live: 0, register: 0, policy: 0, spec: 0 }; const signed = { live: 0, register: 0, policy: 0, spec: 0 }; let queued = 0; let verified = 0; let specs = 0;
        for (const i of this.items) { by[i.status]++; const s = this.state[i.n]; if (!s) continue; if (s.status === 'signed') signed[i.status]++; else if (s.status === 'queued') queued++; if (s.verified === true) verified++; if (s.spec) specs++; }
        const total = this.items.length; const signedTotal = Object.values(signed).reduce((a, b) => a + b, 0);
        const domains = this.domains.map((d) => { const its = this.items.filter((i) => i.domain === d.id); return { ...d, total: its.length, signed: its.filter((i) => (this.state[i.n] || {}).status === 'signed').length, live: its.filter((i) => i.status === 'live').length }; });
        return { total, by, signed, signedTotal, queued, open: total - signedTotal - queued, verified, specs, mode: this.mode, pct: total ? Math.round((signedTotal / total) * 100) : 0, domains };
    }
    rows({ domain = null, status = null, query = '' } = {}) {
        const q = query.trim().toLowerCase();
        return this.items.filter((i) => (!domain || i.domain === domain) && (!status || i.status === status) && (!q || i.title.toLowerCase().includes(q) || String(i.n) === q)).map((i) => ({ ...i, state: this.stateOf(i.n) }));
    }
    toJSON() { return { state: this.state, mode: this.mode }; }
    static fromJSON(data) { return new Programme({ state: (data && data.state) || {}, mode: (data && data.mode) || 'full' }); }
}

/** A tiny programme for tests. */
export function sampleProgramme() {
    return new Programme().load({ domains: [{ id: 'd', title: 'Design', team: 'design' }, { id: 'r', title: 'Reliability', team: 'audit' }], items: [
        { n: 1, title: 'String voltage calculations', domain: 'd', team: 'design', status: 'live', features: ['pv.stringSizing'], registers: [], policies: [] },
        { n: 2, title: 'Risk register', domain: 'd', team: 'design', status: 'register', features: [], registers: ['risks'], policies: [] },
        { n: 3, title: 'Session timeout', domain: 'r', team: 'audit', status: 'policy', features: [], registers: [], policies: ['session.timeoutMinutes'] },
        { n: 4, title: 'Modbus gateway ingestion', domain: 'r', team: 'audit', status: 'spec', features: [], registers: [], policies: [] },
        { n: 5, title: 'Offline photo capture', domain: 'r', team: 'audit', status: 'spec', features: [], registers: [], policies: [] },
        { n: 6, title: 'Passkey authentication', domain: 'r', team: 'audit', status: 'spec', features: [], registers: [], policies: [] }
    ] });
}

export const FEATURES = [
    { id: 'programme.load', title: 'The programme loads its items, classifies dependencies for specs, and reports counts by status and domain', test: () => { const p = sampleProgramme(); const s = p.summary(); return p.loaded && s.total === 6 && s.by.spec === 3 && s.domains.length === 2 && dependencyOf('Modbus gateway ingestion') === 'external' && dependencyOf('Offline photo capture') === 'device' && dependencyOf('Passkey authentication') === 'server' && s.pct === 0; } },
    { id: 'programme.sweepAndSign', title: 'Sweeping queues items into the workforce with library citations; the workforce signs them off and specs get written', test: async () => { const { World } = await import('./world.js'); const w = new World({ seed: 3 }); const p = sampleProgramme(); w.programme = p; const lib = { index: { books: [] }, books: { b: { id: 'b', code: 'AS/NZS 5033', passages: [{ id: 'p1', bookId: 'b', code: 'AS/NZS 5033', heading: 'String voltage', text: 'string voltage calculations shall use the corrected open-circuit voltage', terms: ['string', 'voltage', 'calculations'] }] } } }; const added = p.sweep(w, { library: lib }); const queued = p.summary().queued; for (let i = 0; i < 60 && p.summary().signedTotal < 6; i++) w.tick(1); const s = p.summary(); const st = p.stateOf(1); const spec = p.stateOf(4).spec; return added === 6 && queued === 6 && s.signedTotal === 6 && s.pct === 100 && st.citations.length >= 1 && st.citations[0].code === 'AS/NZS 5033' && spec && spec.dependsOn === 'external' && spec.requirements.length === 5 && s.specs === 3 && p.pending().length === 0; } },
    { id: 'programme.modes', title: 'Run modes: full feeds the queue, test feeds five, paused feeds none', test: async () => { const { World } = await import('./world.js'); const w = new World({ seed: 4 }); const p = sampleProgramme(); p.setMode('paused'); const none = p.sweep(w); p.setMode('test'); const five = p.sweep(w); p.setMode('full'); const rest = p.sweep(w); return none === 0 && five === 5 && rest === 1 && p.mode === 'full'; } },
    { id: 'programme.verifyAndPersist', title: 'Self-test results verify live items; state round-trips through the world save', test: async () => { const { World } = await import('./world.js'); const w = new World({ seed: 5 }); const p = sampleProgramme(); w.programme = p; p.sweep(w); const v = p.verify({ 'pv.stringSizing': true }); const bad = p.verify({ 'pv.stringSizing': false }); const w2 = World.fromJSON(JSON.parse(JSON.stringify(w.toJSON()))); const p2 = w2.programme; p2.load({ items: p.items, domains: p.domains }); const taken = p2.adopt({ 6: { status: 'signed', signedAt: 1 }, 1: { status: 'signed' } }); return v.verified === 1 && bad.failed === 1 && p2.stateOf(1).status === 'signed' && p2.stateOf(6).status === 'signed' && taken === 2 && p2.summary().queued === 4; } }
];
