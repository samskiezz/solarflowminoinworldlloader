/**
 * Event bus: typed publish/subscribe with wildcard listeners.
 * Every part of the workstation talks through the bus so windows stay
 * decoupled from the simulation and from each other.
 */
export class EventBus {
    constructor() { this.listeners = new Map(); this.history = []; this.historyLimit = 200; }

    on(type, handler) {
        if (typeof handler !== 'function') throw new TypeError('handler must be a function');
        if (!this.listeners.has(type)) this.listeners.set(type, new Set());
        this.listeners.get(type).add(handler);
        return () => this.off(type, handler);
    }

    once(type, handler) {
        const off = this.on(type, (payload, meta) => { off(); handler(payload, meta); });
        return off;
    }

    off(type, handler) {
        const set = this.listeners.get(type);
        if (!set) return false;
        const removed = set.delete(handler);
        if (set.size === 0) this.listeners.delete(type);
        return removed;
    }

    /** Emit an event. Returns the number of handlers invoked (wildcard included). */
    emit(type, payload = {}) {
        const meta = { type, at: Date.now() };
        this.history.push({ type, payload, at: meta.at });
        if (this.history.length > this.historyLimit) this.history.splice(0, this.history.length - this.historyLimit);
        let count = 0;
        for (const key of [type, '*']) {
            const set = this.listeners.get(key);
            if (!set) continue;
            for (const handler of [...set]) {
                try { handler(payload, meta); count++; } catch (error) { if (key !== 'error') this.emit('error', { source: type, error }); }
            }
        }
        return count;
    }

    count(type) { return this.listeners.has(type) ? this.listeners.get(type).size : 0; }
    clear() { this.listeners.clear(); this.history = []; }
}

export const bus = new EventBus();

export const FEATURES = [
    { id: 'core.bus.onEmit', title: 'Subscribe and emit events', test: () => { const b = new EventBus(); let got = null; b.on('x', (p) => { got = p.v; }); return b.emit('x', { v: 7 }) === 1 && got === 7; } },
    { id: 'core.bus.once', title: 'One-shot listeners', test: () => { const b = new EventBus(); let n = 0; b.once('x', () => n++); b.emit('x'); b.emit('x'); return n === 1 && b.count('x') === 0; } },
    { id: 'core.bus.off', title: 'Unsubscribe via returned disposer', test: () => { const b = new EventBus(); let n = 0; const off = b.on('x', () => n++); b.emit('x'); off(); b.emit('x'); return n === 1; } },
    { id: 'core.bus.wildcard', title: 'Wildcard listeners see every event', test: () => { const b = new EventBus(); const seen = []; b.on('*', (p, m) => seen.push(m.type)); b.emit('a'); b.emit('b'); return seen.join() === 'a,b'; } },
    { id: 'core.bus.errorIsolation', title: 'A throwing handler never breaks other handlers', test: () => { const b = new EventBus(); let ok = false; let err = 0; b.on('error', () => err++); b.on('x', () => { throw new Error('boom'); }); b.on('x', () => { ok = true; }); b.emit('x'); return ok && err === 1; } },
    { id: 'core.bus.history', title: 'Bounded event history for the debug console', test: () => { const b = new EventBus(); b.historyLimit = 3; for (let i = 0; i < 10; i++) b.emit('x', { i }); return b.history.length === 3 && b.history[0].payload.i === 7; } }
];
