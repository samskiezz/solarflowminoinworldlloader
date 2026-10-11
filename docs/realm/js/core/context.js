/**
 * Application context: wires store, bus, world, window manager, keybinds,
 * clock and commands together, and exposes the helpers windows use.
 * Both app.js (browser) and the self-tests build a context this way, so a
 * window that works in a test works in the app.
 */
import { EventBus } from './bus.js';
import { Store, createMemoryStorage, cacheGet, cacheSet } from './store.js';
import { WindowManager } from './wm.js';
import { Keybinds } from './keybinds.js';
import { WorldClock } from './clock.js';
import { CommandRegistry } from './commands.js';
import { t, setLocale } from './i18n.js';
import { World } from '../sim/world.js';
import { flatten } from '../domain/products.js';

export const DEFAULT_CREW = [
    { id: 'ATLAS', name: 'Atlas', role: 'Lead installer', tier: 2, traits: ['meticulous', 'steady'], avatar: '🧑‍🔧', skills: { installation: 450, commissioning: 220 } },
    { id: 'NOVA', name: 'Nova', role: 'Designer', tier: 2, traits: ['tinkerer', 'scholar'], avatar: '👩‍💻', skills: { pv_arrays: 500, electrical: 320, standards: 260 } },
    { id: 'BOLT', name: 'Bolt', role: 'Apprentice', tier: 1, traits: ['sprinter', 'optimist'], avatar: '🧑‍🎓', skills: { installation: 60 } }
];

export function companyLevel(ledger) {
    const earned = (ledger.entries || []).filter((e) => e.amount > 0 && e.type !== 'opening').reduce((n, e) => n + e.amount, 0);
    const level = Math.floor(Math.sqrt(earned / 50)) + 1;
    const floor = 50 * (level - 1) ** 2; const next = 50 * level ** 2;
    return { level, xp: earned, floor, next, pct: Math.round(((earned - floor) / (next - floor)) * 100), title: LEVEL_TITLES[Math.min(LEVEL_TITLES.length - 1, Math.floor(level / 3))] };
}
export const LEVEL_TITLES = ['Apprentice outfit', 'Licensed crew', 'Accredited installer', 'Master installer', 'Regional guild', 'Realm champion'];

export function createContext({ storage = null, root = null, products = null, seed = 1, now = () => Date.now(), locale = null } = {}) {
    const bus = new EventBus();
    const store = new Store({ storage: storage || createMemoryStorage(), now });
    const savedWorld = store.get('world');
    const world = savedWorld ? World.fromJSON(savedWorld) : new World({ seed });
    if (!savedWorld) for (const spec of DEFAULT_CREW) world.addAgent(spec);
    if (!store.get('profile.createdAt')) store.set('profile.createdAt', new Date(now()).toISOString());
    setLocale(locale || store.get('profile.locale', 'en'));

    const wm = root ? new WindowManager({ root, store, bus }) : null;
    const keys = new Keybinds({ store, bus });
    const clock = new WorldClock({ world, bus, store });
    const commands = new CommandRegistry({ bus });

    const ctx = {
        store, bus, world, wm, keys, clock, commands, t,
        products: { list: [], byId: new Map(), summary: null, loaded: false, source: null },
        now,
        profile() { return store.get('profile'); },
        jobs() { return world.jobs; },
        job(id) { return world.jobs.find((j) => j.id === id) || null; },
        currentJobId() { const id = store.get('ui.currentJob'); return ctx.job(id) ? id : (world.jobs[0] ? world.jobs[0].id : null); },
        currentJob() { return ctx.job(ctx.currentJobId()); },
        setCurrentJob(id) { store.set('ui.currentJob', id); bus.emit('job:selected', { id }); },
        design(jobId = ctx.currentJobId()) { return jobId ? (store.get(`designs.${jobId}`) || {}) : {}; },
        saveDesign(jobId, patch) { if (!jobId) return null; const next = { ...ctx.design(jobId), ...patch, updatedAt: new Date(now()).toISOString() }; store.set(`designs.${jobId}`, next); const job = ctx.job(jobId); if (job) { job.design = { ...job.design, ...patch }; job.updatedAt = next.updatedAt; } ctx.saveWorld(); bus.emit('design:updated', { jobId, design: next }); return next; },
        saveWorld() { store.set('world', world.toJSON()); },
        level() { return companyLevel(world.ledger); },
        open(id, options) { return wm ? wm.open(id, options) : null; },
        toggle(id, options) { return wm ? wm.toggle(id, options) : null; },
        refresh(id) { if (!wm) return; if (id) wm.refresh(id); else wm.refreshAll(); },
        notify(type, text, extra = {}) { const entry = world.emit({ type, text, ...extra }); return entry; },
        setProducts(catalogue, source = 'inline') {
            const list = Array.isArray(catalogue) ? catalogue : flatten(catalogue);
            ctx.products = { list, byId: new Map(list.map((p) => [p.id, p])), summary: catalogue && catalogue.metadata ? catalogue.metadata : { totalProducts: list.length }, loaded: true, source };
            bus.emit('products:loaded', { count: list.length, source });
            if (wm) wm.refreshAll();
            return list.length;
        },
        async loadProducts(url) {
            try {
                const cached = await cacheGet(url);
                if (cached) { ctx.setProducts(cached, 'cache'); }
                const response = await fetch(url, { cache: 'no-cache' });
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const json = await response.json();
                ctx.setProducts(json, 'network');
                cacheSet(url, json);
                return ctx.products.list.length;
            } catch (error) {
                bus.emit('products:error', { error: error.message, url });
                return ctx.products.list.length;
            }
        }
    };

    world.on((entry) => { bus.emit('world:event', entry); bus.emit(`world:${entry.type}`, entry); });
    if (products) ctx.setProducts(products);
    return ctx;
}

export const FEATURES = [
    { id: 'core.ctx.create', title: 'Context wires store, world, clock, keys and commands', test: () => { const c = createContext(); return c.world.agents.length === 3 && c.keys.keyFor('window.crew') === 'P' && c.clock.speed.id === 'normal' && typeof c.commands.search === 'function'; } },
    { id: 'core.ctx.persistWorld', title: 'World persists and restores through the store', test: () => { const storage = createMemoryStorage(); const a = createContext({ storage }); a.world.addJob({ customer: 'Zed', postcode: '2000' }); a.saveWorld(); a.store.flush(); const b = createContext({ storage }); return b.world.jobs.length === 1 && b.world.jobs[0].customer === 'Zed' && b.world.agents.length === 3; } },
    { id: 'core.ctx.currentJob', title: 'Current job selection with fallback', test: () => { const c = createContext(); const none = c.currentJob() === null; const j = c.world.addJob({ customer: 'A' }); const k = c.world.addJob({ customer: 'B' }); c.setCurrentJob(k.id); return none && c.currentJob().customer === 'B' && c.job(j.id).customer === 'A'; } },
    { id: 'core.ctx.design', title: 'Design records saved per job and mirrored into the job', test: () => { const c = createContext(); const j = c.world.addJob({ customer: 'A' }); c.saveDesign(j.id, { moduleId: 'PV1', productsApproved: true }); return c.design(j.id).moduleId === 'PV1' && c.job(j.id).design.productsApproved === true; } },
    { id: 'core.ctx.level', title: 'Company level from credits earned', test: () => { const c = createContext(); const l0 = c.level().level; c.world.ledger.entries.push({ at: 1, type: 'checklist_pass', amount: 450, balance: 550 }); return l0 === 1 && c.level().level === 4 && c.level().title === 'Licensed crew'; } },
    { id: 'core.ctx.products', title: 'Inline product catalogue indexing', test: () => { const c = createContext({ products: { categories: { inverters: [{ id: 'I1', manufacturer: 'X', model: 'M', category: 'inverter', cerApproved: true }] } } }); return c.products.loaded && c.products.byId.get('I1').model === 'M'; } },
    { id: 'core.ctx.worldEvents', title: 'World events are republished on the bus', test: () => { const c = createContext(); let seen = null; c.bus.on('world:job_created', (e) => { seen = e.jobId; }); const j = c.world.addJob({ customer: 'Q' }); return seen === j.id; } }
];
