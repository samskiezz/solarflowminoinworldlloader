/**
 * Persistent application state.
 * - JSON document in localStorage (or any Storage-like object) with a
 *   versioned key and a migration chain, so upgrades never destroy data.
 * - Path-based get/set/patch with change subscriptions.
 * - Export/import for backup and transfer between devices.
 * - Optional IndexedDB blob cache for large downloads (the product catalogue).
 */
export const STORAGE_KEY = 'solarflow.realm.v1';
export const STATE_VERSION = 1;

export const DEFAULT_STATE = Object.freeze({
    version: STATE_VERSION,
    profile: { name: 'Installer', company: 'My Solar Co', accreditation: '', jurisdiction: 'AU', locale: 'en', postcode: '2000', city: 'Sydney', phases: 1, theme: 'dusk', createdAt: null },
    ui: { windows: {}, hotbar: ['dashboard', 'jobs', 'crew', 'spellbook', 'inventory', 'codex', 'checklists', 'quests', 'reports'], minimap: true, chatOpen: true, tutorialDone: false, speed: 'normal', soundOn: false, layoutPreset: 'default' },
    keybinds: {},
    world: null,
    designs: {},
    favourites: [],
    journal: [],
    recent: [],
    onboarding: { step: 0, done: false },
    stats: { sessions: 0, featuresRun: 0, lastSelfTest: null }
});

export function createMemoryStorage() {
    const map = new Map();
    return { getItem: (k) => (map.has(k) ? map.get(k) : null), setItem: (k, v) => map.set(k, String(v)), removeItem: (k) => map.delete(k), get length() { return map.size; }, key: (i) => [...map.keys()][i] ?? null };
}

export function deepGet(obj, path) {
    if (!path) return obj;
    return String(path).split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

export function deepSet(obj, path, value) {
    const keys = String(path).split('.');
    let cursor = obj;
    for (let i = 0; i < keys.length - 1; i++) {
        if (cursor[keys[i]] == null || typeof cursor[keys[i]] !== 'object') cursor[keys[i]] = {};
        cursor = cursor[keys[i]];
    }
    cursor[keys.at(-1)] = value;
    return obj;
}

export function clone(value) { return value === undefined ? undefined : JSON.parse(JSON.stringify(value)); }

/** Migration chain: each entry upgrades from (version) to (version + 1). */
export const MIGRATIONS = {
    0: (data) => ({ ...clone(DEFAULT_STATE), ...data, version: 1 })
};

export function migrate(data) {
    let doc = data && typeof data === 'object' ? clone(data) : {};
    let version = Number(doc.version || 0);
    while (version < STATE_VERSION) {
        const step = MIGRATIONS[version];
        doc = step ? step(doc) : { ...doc, version: version + 1 };
        version = Number(doc.version || version + 1);
    }
    // Fill in any keys introduced after the user's document was written.
    for (const [key, value] of Object.entries(DEFAULT_STATE)) {
        if (doc[key] === undefined) doc[key] = clone(value);
        else if (value && typeof value === 'object' && !Array.isArray(value) && doc[key] && typeof doc[key] === 'object') doc[key] = { ...clone(value), ...doc[key] };
    }
    return doc;
}

export class Store {
    constructor({ storage = null, key = STORAGE_KEY, initial = null, debounceMs = 250, now = () => Date.now() } = {}) {
        this.storage = storage;
        this.key = key;
        this.debounceMs = debounceMs;
        this.now = now;
        this.subscribers = new Set();
        this.timer = null;
        this.dirty = false;
        this.lastSavedAt = null;
        this.state = initial ? migrate(initial) : this.load();
    }

    load() {
        try {
            const raw = this.storage && this.storage.getItem(this.key);
            if (raw) return migrate(JSON.parse(raw));
        } catch (error) { /* corrupt document: start from defaults but keep the raw copy */
            try { this.storage.setItem(`${this.key}.corrupt-${this.now()}`, this.storage.getItem(this.key)); } catch (e) { /* ignore */ }
        }
        return clone(DEFAULT_STATE);
    }

    get(path, fallback) { const v = deepGet(this.state, path); return v === undefined ? fallback : v; }

    set(path, value) {
        deepSet(this.state, path, value);
        this.notify(path, value);
        this.scheduleSave();
        return value;
    }

    patch(path, partial) {
        const current = this.get(path) || {};
        return this.set(path, { ...current, ...partial });
    }

    push(path, item, limit = Infinity) {
        const list = [...(this.get(path) || []), item];
        if (list.length > limit) list.splice(0, list.length - limit);
        return this.set(path, list);
    }

    subscribe(fn, pathPrefix = '') {
        const entry = { fn, pathPrefix };
        this.subscribers.add(entry);
        return () => this.subscribers.delete(entry);
    }

    notify(path, value) {
        for (const { fn, pathPrefix } of [...this.subscribers]) {
            if (!pathPrefix || path === pathPrefix || path.startsWith(`${pathPrefix}.`) || pathPrefix.startsWith(`${path}.`)) {
                try { fn(path, value, this.state); } catch (error) { /* subscriber errors are isolated */ }
            }
        }
    }

    scheduleSave() {
        this.dirty = true;
        if (!this.storage) return;
        if (this.debounceMs <= 0) { this.save(); return; }
        if (this.timer) return;
        this.timer = setTimeout(() => { this.timer = null; this.save(); }, this.debounceMs);
    }

    save() {
        if (!this.storage) return false;
        try {
            this.storage.setItem(this.key, JSON.stringify(this.state));
            this.dirty = false;
            this.lastSavedAt = this.now();
            return true;
        } catch (error) { return false; }
    }

    flush() { if (this.timer) { clearTimeout(this.timer); this.timer = null; } return this.save(); }

    export() { return JSON.stringify({ exportedAt: new Date(this.now()).toISOString(), app: 'solarflow-realm', state: this.state }, null, 2); }

    import(json) {
        const parsed = typeof json === 'string' ? JSON.parse(json) : json;
        const incoming = parsed && parsed.state ? parsed.state : parsed;
        if (!incoming || typeof incoming !== 'object' || !('profile' in incoming)) throw new Error('Not a SolarFlow Realm backup');
        this.state = migrate(incoming);
        this.notify('', this.state);
        this.scheduleSave();
        return this.state;
    }

    reset() {
        this.state = clone(DEFAULT_STATE);
        this.notify('', this.state);
        return this.flush();
    }

    sizeBytes() { return new TextEncoder().encode(JSON.stringify(this.state)).length; }
}

/* ---------- IndexedDB blob cache (browser only; resolves to null elsewhere) ---------- */
const DB_NAME = 'solarflow-realm-cache';
function openDb() {
    return new Promise((resolve) => {
        if (typeof indexedDB === 'undefined') return resolve(null);
        try {
            const req = indexedDB.open(DB_NAME, 1);
            req.onupgradeneeded = () => req.result.createObjectStore('blobs');
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => resolve(null);
        } catch (error) { resolve(null); }
    });
}
export async function cacheGet(key) {
    const db = await openDb();
    if (!db) return null;
    return new Promise((resolve) => { const tx = db.transaction('blobs', 'readonly'); const req = tx.objectStore('blobs').get(key); req.onsuccess = () => resolve(req.result ?? null); req.onerror = () => resolve(null); });
}
export async function cacheSet(key, value) {
    const db = await openDb();
    if (!db) return false;
    return new Promise((resolve) => { const tx = db.transaction('blobs', 'readwrite'); tx.objectStore('blobs').put(value, key); tx.oncomplete = () => resolve(true); tx.onerror = () => resolve(false); });
}

export const FEATURES = [
    { id: 'core.store.defaults', title: 'Default state document', test: () => { const s = new Store({ storage: createMemoryStorage() }); return s.get('profile.jurisdiction') === 'AU' && s.get('ui.hotbar').length === 9; } },
    { id: 'core.store.getSet', title: 'Path-based get/set/patch', test: () => { const s = new Store({ storage: createMemoryStorage(), debounceMs: 0 }); s.set('profile.name', 'Ada'); s.patch('profile', { company: 'X' }); return s.get('profile.name') === 'Ada' && s.get('profile.company') === 'X' && s.get('profile.jurisdiction') === 'AU'; } },
    { id: 'core.store.persist', title: 'Persists to storage and reloads', test: () => { const st = createMemoryStorage(); const a = new Store({ storage: st, debounceMs: 0 }); a.set('profile.name', 'Zed'); const b = new Store({ storage: st }); return b.get('profile.name') === 'Zed'; } },
    { id: 'core.store.subscribe', title: 'Change subscriptions with path prefixes', test: () => { const s = new Store({ storage: createMemoryStorage(), debounceMs: 0 }); let hits = 0; s.subscribe(() => hits++, 'profile'); s.set('profile.name', 'A'); s.set('ui.minimap', false); return hits === 1; } },
    { id: 'core.store.push', title: 'Bounded list append', test: () => { const s = new Store({ storage: createMemoryStorage(), debounceMs: 0 }); for (let i = 0; i < 5; i++) s.push('journal', i, 3); return s.get('journal').join() === '2,3,4'; } },
    { id: 'core.store.exportImport', title: 'Backup export/import round-trip', test: () => { const s = new Store({ storage: createMemoryStorage(), debounceMs: 0 }); s.set('profile.name', 'Backup'); const b = new Store({ storage: createMemoryStorage(), debounceMs: 0 }); b.import(s.export()); return b.get('profile.name') === 'Backup'; } },
    { id: 'core.store.importRejectsGarbage', title: 'Import rejects non-backup documents', test: () => { const s = new Store({ storage: createMemoryStorage() }); try { s.import('{"foo":1}'); return false; } catch (e) { return /backup/.test(e.message); } } },
    { id: 'core.store.migrate', title: 'Migration fills new keys without losing data', test: () => { const d = migrate({ version: 0, profile: { name: 'Old' } }); return d.version === 1 && d.profile.name === 'Old' && d.profile.jurisdiction === 'AU' && Array.isArray(d.ui.hotbar); } },
    { id: 'core.store.corruptRecovery', title: 'Corrupt storage falls back to defaults and keeps a copy', test: () => { const st = createMemoryStorage(); st.setItem(STORAGE_KEY, '{not json'); const s = new Store({ storage: st, now: () => 5 }); return s.get('profile.name') === 'Installer' && st.getItem(`${STORAGE_KEY}.corrupt-5`) === '{not json'; } },
    { id: 'core.store.reset', title: 'Reset to defaults', test: () => { const s = new Store({ storage: createMemoryStorage(), debounceMs: 0 }); s.set('profile.name', 'Q'); s.reset(); return s.get('profile.name') === 'Installer'; } },
    { id: 'core.store.size', title: 'Reports document size', test: () => new Store({ storage: createMemoryStorage() }).sizeBytes() > 100 }
];
