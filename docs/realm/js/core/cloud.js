/**
 * Cloud save through the SolarFlow API (`/api/state` on the Node server or
 * the VPS): push the realm document, pull it on another device, log in for
 * authenticated writes, and auto-sync. The realm lives under `realm` inside
 * the shared state object so it coexists with the legacy pages' state.
 */
export function createCloud({ store, fetchFn = (...a) => globalThis.fetch(...a), now = () => Date.now(), configUrl = () => (typeof window !== 'undefined' && window.SOLARFLOW_CONFIG && typeof window.SOLARFLOW_CONFIG.getVpsUrl === 'function' ? window.SOLARFLOW_CONFIG.getVpsUrl() : null) } = {}) {
    const settings = () => ({ url: '', token: '', email: '', auto: false, lastPushAt: null, lastPullAt: null, ...(store.get('ui.cloud', {})) });
    const save = (patch) => store.set('ui.cloud', { ...settings(), ...patch });
    const base = () => (settings().url || configUrl() || '').replace(/\/+$/, '');
    const headers = (json = false) => ({ ...(json ? { 'content-type': 'application/json' } : {}), ...(settings().token ? { authorization: `Bearer ${settings().token}` } : {}) });
    const api = {
        settings, save, base,
        configured() { return Boolean(base()); },
        async status() {
            if (!base()) return { ok: false, reason: 'No API URL configured' };
            try { const res = await fetchFn(`${base()}/api/state`, { headers: headers() }); if (!res.ok && res.status !== 204) return { ok: false, reason: `HTTP ${res.status}` }; const writable = res.headers && typeof res.headers.get === 'function' ? res.headers.get('X-State-Writable') === 'true' : false; const body = res.status === 204 ? null : await res.json(); return { ok: true, writable: writable || Boolean(settings().token), remoteSavedAt: body && body.realm ? body.realm.savedAt : null, hasRemote: Boolean(body && body.realm) }; } catch (error) { return { ok: false, reason: error.message }; }
        },
        async login(email, password) {
            if (!base()) throw new Error('No API URL configured');
            const res = await fetchFn(`${base()}/api/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password }) });
            if (!res.ok) throw new Error(res.status === 401 ? 'Wrong email or password' : `Login failed (HTTP ${res.status})`);
            const data = await res.json(); save({ token: data.token, email }); return data.user || { email };
        },
        logout() { save({ token: '', email: '' }); },
        async push({ force = false } = {}) {
            if (!base()) throw new Error('No API URL configured');
            const res = await fetchFn(`${base()}/api/state`, { headers: headers() });
            const existing = res.status === 204 ? {} : (res.ok ? await res.json() : {});
            if (!force && existing.realm && existing.realm.savedAt && settings().lastPullAt && existing.realm.savedAt > settings().lastPullAt && existing.realm.savedAt !== settings().lastPushAt) throw new Error(`The server copy is newer (${existing.realm.savedAt}). Pull first or force.`);
            const savedAt = new Date(now()).toISOString();
            const body = { ...existing, realm: { app: 'solarflow-realm', savedAt, state: JSON.parse(JSON.stringify(store.state)) } };
            delete body.realm.state.ui?.cloud;
            const put = await fetchFn(`${base()}/api/state`, { method: 'POST', headers: headers(true), body: JSON.stringify(body) });
            if (put.status === 403) throw new Error('Server refuses anonymous writes – log in (or set ALLOW_ANONYMOUS_STATE_WRITES=true on the server)');
            if (!put.ok) throw new Error(`Push failed (HTTP ${put.status})`);
            save({ lastPushAt: savedAt, lastPullAt: savedAt }); return { savedAt, bytes: JSON.stringify(body).length };
        },
        async pull() {
            if (!base()) throw new Error('No API URL configured');
            const res = await fetchFn(`${base()}/api/state`, { headers: headers() });
            if (res.status === 204) throw new Error('Nothing saved on the server yet');
            if (!res.ok) throw new Error(`Pull failed (HTTP ${res.status})`);
            const data = await res.json(); if (!data.realm || !data.realm.state) throw new Error('No realm save on the server');
            const keepCloud = settings(); store.import(data.realm.state); store.set('ui.cloud', { ...keepCloud, lastPullAt: data.realm.savedAt }); return { savedAt: data.realm.savedAt };
        }
    };
    return api;
}

const memStore = () => { const data = { version: 1, profile: { name: 'A' }, ui: {} }; return { state: data, get: (p, f) => p.split('.').reduce((o, k) => (o == null ? undefined : o[k]), data) ?? f, set: (p, v) => { const ks = p.split('.'); let o = data; for (const k of ks.slice(0, -1)) o = o[k] = o[k] || {}; o[ks.at(-1)] = v; }, import(s) { Object.assign(data, s); } }; };
const fakeServer = (opts = {}) => { let state = opts.state || null; return { calls: [], async fetch(url, init = {}) { this.calls.push({ url, method: init.method || 'GET' }); if (url.endsWith('/api/auth/login')) { const b = JSON.parse(init.body); return b.password === 'pw' ? { ok: true, status: 200, json: async () => ({ token: 'T', user: { email: b.email } }) } : { ok: false, status: 401 }; } if (init.method === 'POST') { if (opts.requireAuth && !(init.headers.authorization || '').startsWith('Bearer')) return { ok: false, status: 403 }; state = JSON.parse(init.body); return { ok: true, status: 200, json: async () => ({ success: true }) }; } if (!state) return { ok: true, status: 204, headers: { get: () => String(!opts.requireAuth) } }; return { ok: true, status: 200, headers: { get: () => String(!opts.requireAuth) }, json: async () => state }; }, get state() { return state; } }; };
export const FEATURES = [
    { id: 'core.cloud.unconfigured', title: 'Cloud save is inert until an API URL is set', test: async () => { const c = createCloud({ store: memStore(), configUrl: () => null }); const s = await c.status(); return !c.configured() && !s.ok; } },
    { id: 'core.cloud.pushPull', title: 'Push and pull the realm document through /api/state', test: async () => { const srv = fakeServer(); const a = memStore(); const cloud = createCloud({ store: a, fetchFn: (u, i) => srv.fetch(u, i), configUrl: () => 'https://api.example', now: () => 1000 }); a.set('profile.name', 'Pushed'); const r = await cloud.push(); const b = memStore(); const cloud2 = createCloud({ store: b, fetchFn: (u, i) => srv.fetch(u, i), configUrl: () => 'https://api.example' }); await cloud2.pull(); return r.savedAt && srv.state.realm.state.profile.name === 'Pushed' && b.state.profile.name === 'Pushed' && b.state.ui.cloud.lastPullAt === r.savedAt; } },
    { id: 'core.cloud.login', title: 'Login stores a bearer token used for writes', test: async () => { const srv = fakeServer({ requireAuth: true }); const s = memStore(); const cloud = createCloud({ store: s, fetchFn: (u, i) => srv.fetch(u, i), configUrl: () => 'https://api.example' }); let refused = false; try { await cloud.push(); } catch (e) { refused = /log in/.test(e.message); } let bad = false; try { await cloud.login('a@b.c', 'nope'); } catch (e) { bad = true; } await cloud.login('a@b.c', 'pw'); const r = await cloud.push(); cloud.logout(); return refused && bad && r.savedAt && cloud.settings().token === ''; } },
    { id: 'core.cloud.conflict', title: 'A newer server copy blocks a push unless forced', test: async () => { const srv = fakeServer(); const s = memStore(); const cloud = createCloud({ store: s, fetchFn: (u, i) => srv.fetch(u, i), configUrl: () => 'https://api.example', now: () => 1000 }); await cloud.push(); srv.state.realm.savedAt = '2099-01-01T00:00:00.000Z'; let blocked = false; try { await cloud.push(); } catch (e) { blocked = /newer/.test(e.message); } const forced = await cloud.push({ force: true }); return blocked && Boolean(forced.savedAt); } },
    { id: 'core.cloud.legacyCoexists', title: 'Legacy state on the server is preserved next to the realm save', test: async () => { const srv = fakeServer({ state: { minions: [1, 2], hive: 'x' } }); const cloud = createCloud({ store: memStore(), fetchFn: (u, i) => srv.fetch(u, i), configUrl: () => 'https://api.example' }); await cloud.push(); return srv.state.hive === 'x' && srv.state.minions.length === 2 && srv.state.realm.app === 'solarflow-realm'; } }
];
