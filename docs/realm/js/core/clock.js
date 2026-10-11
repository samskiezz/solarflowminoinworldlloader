/**
 * World clock: drives the simulation in real time at a selectable speed.
 * Speeds are expressed in simulated hours per real second; the clock
 * accumulates fractional time and ticks the world in fixed steps so the
 * simulation stays deterministic regardless of frame timing.
 */
export const SPEEDS = [
    { id: 'pause', label: 'Paused', hoursPerSecond: 0, icon: '⏸' },
    { id: 'slow', label: 'Slow (1 h / 20 s)', hoursPerSecond: 0.05, icon: '▶' },
    { id: 'normal', label: 'Normal (1 h / 4 s)', hoursPerSecond: 0.25, icon: '▶▶' },
    { id: 'fast', label: 'Fast (1 h / s)', hoursPerSecond: 1, icon: '▶▶▶' },
    { id: 'ultra', label: 'Ultra (1 day / 4 s)', hoursPerSecond: 6, icon: '⏩' }
];
export const STEP_HOURS = 0.5;

export function speedById(id) { return SPEEDS.find((s) => s.id === id) || SPEEDS[2]; }

/** Pure accumulator: returns { steps, remainder } for dt seconds at a speed. */
export function advance(accumulatedHours, dtSeconds, hoursPerSecond, step = STEP_HOURS) {
    const total = accumulatedHours + Math.max(0, dtSeconds) * hoursPerSecond;
    const steps = Math.floor(total / step);
    return { steps, remainder: total - steps * step };
}

export function dayPhase(hourOfDay) {
    if (hourOfDay < 5) return 'night';
    if (hourOfDay < 7) return 'dawn';
    if (hourOfDay < 17) return 'day';
    if (hourOfDay < 19) return 'dusk';
    return 'night';
}

export class WorldClock {
    constructor({ world, bus = null, store = null, speed = 'normal', setIntervalFn = (fn, ms) => globalThis.setInterval(fn, ms), clearIntervalFn = (id) => globalThis.clearInterval(id), now = () => performance?.now?.() ?? Date.now(), intervalMs = 250 } = {}) {
        this.world = world;
        this.bus = bus;
        this.store = store;
        this.speed = speedById(store ? store.get('ui.speed', speed) : speed);
        this.previousSpeed = this.speed.id === 'pause' ? speedById('normal') : this.speed;
        this.accumulated = 0;
        this.timer = null;
        this.lastAt = null;
        this.setIntervalFn = setIntervalFn;
        this.clearIntervalFn = clearIntervalFn;
        this.now = now;
        this.intervalMs = intervalMs;
        this.ticks = 0;
    }

    get running() { return this.timer !== null; }
    get isPaused() { return this.speed.id === 'pause'; }

    start() {
        if (this.timer) return;
        this.lastAt = this.now();
        this.timer = this.setIntervalFn(() => this.frame(), this.intervalMs);
        if (this.bus) this.bus.emit('clock:start', { speed: this.speed.id });
    }

    stop() { if (this.timer) { this.clearIntervalFn(this.timer); this.timer = null; } }

    frame(nowMs = this.now()) {
        const dt = Math.min(5, Math.max(0, (nowMs - (this.lastAt ?? nowMs)) / 1000));
        this.lastAt = nowMs;
        return this.update(dt);
    }

    /** Advance by dt real seconds; returns the number of simulation steps run. */
    update(dtSeconds) {
        const { steps, remainder } = advance(this.accumulated, dtSeconds, this.speed.hoursPerSecond);
        this.accumulated = remainder;
        for (let i = 0; i < steps; i++) {
            const summary = this.world.tick(STEP_HOURS);
            this.ticks++;
            if (this.bus) this.bus.emit('clock:tick', { clock: this.world.clock, summary, phase: dayPhase(this.world.clock.hourOfDay) });
        }
        return steps;
    }

    setSpeed(id) {
        const next = speedById(id);
        if (next.id !== 'pause') this.previousSpeed = next;
        this.speed = next;
        if (this.store) this.store.set('ui.speed', next.id);
        if (this.bus) this.bus.emit('clock:speed', { speed: next.id, label: next.label });
        return next;
    }

    togglePause() { return this.setSpeed(this.isPaused ? this.previousSpeed.id : 'pause'); }
    faster() { const i = SPEEDS.findIndex((s) => s.id === this.speed.id); return this.setSpeed(SPEEDS[Math.min(SPEEDS.length - 1, i + 1)].id); }
    slower() { const i = SPEEDS.findIndex((s) => s.id === this.speed.id); return this.setSpeed(SPEEDS[Math.max(0, i - 1)].id); }
}

const fakeWorld = () => ({ hours: 0, tick(h) { this.hours += h; return []; }, get clock() { return { hourOfDay: Math.floor(this.hours) % 24, day: 1 }; } });

export const FEATURES = [
    { id: 'core.clock.advance', title: 'Fixed-step accumulator', test: () => { const a = advance(0, 4, 0.25); const b = advance(a.remainder, 1, 0.25); return a.steps === 2 && b.steps === 0 && Math.abs(b.remainder - 0.25) < 1e-9; } },
    { id: 'core.clock.speeds', title: 'Five speed presets incl. pause', test: () => SPEEDS.length === 5 && speedById('pause').hoursPerSecond === 0 && speedById('nope').id === 'normal' },
    { id: 'core.clock.update', title: 'Clock ticks the world at the chosen speed', test: () => { const w = fakeWorld(); const c = new WorldClock({ world: w, speed: 'fast' }); const steps = c.update(3); return steps === 6 && w.hours === 3 && c.ticks === 6; } },
    { id: 'core.clock.pause', title: 'Pause/resume remembers previous speed', test: () => { const c = new WorldClock({ world: fakeWorld(), speed: 'fast' }); c.togglePause(); const paused = c.isPaused && c.update(10) === 0; c.togglePause(); return paused && c.speed.id === 'fast'; } },
    { id: 'core.clock.fasterSlower', title: 'Step through speeds', test: () => { const c = new WorldClock({ world: fakeWorld(), speed: 'normal' }); c.faster(); c.faster(); c.faster(); const top = c.speed.id; c.slower(); return top === 'ultra' && c.speed.id === 'fast'; } },
    { id: 'core.clock.startStop', title: 'Interval lifecycle with injectable timers', test: () => { let cb = null; const c = new WorldClock({ world: fakeWorld(), setIntervalFn: (f) => { cb = f; return 1; }, clearIntervalFn: () => { cb = null; }, now: () => 0 }); c.start(); const running = c.running && typeof cb === 'function'; c.stop(); return running && !c.running && cb === null; } },
    { id: 'core.clock.frameClamp', title: 'Background tabs never fast-forward more than 5 s', test: () => { const w = fakeWorld(); const c = new WorldClock({ world: w, speed: 'ultra', now: () => 0 }); c.lastAt = 0; c.frame(60000); return w.hours === 30; } },
    { id: 'core.clock.dayPhase', title: 'Day/night phase for the realm backdrop', test: () => dayPhase(3) === 'night' && dayPhase(6) === 'dawn' && dayPhase(12) === 'day' && dayPhase(18) === 'dusk' },
    { id: 'core.clock.busEvents', title: 'Emits clock:tick and clock:speed events', test: () => { const seen = []; const bus = { emit: (t) => seen.push(t) }; const c = new WorldClock({ world: fakeWorld(), bus, speed: 'fast' }); c.update(1); c.setSpeed('slow'); return seen.includes('clock:tick') && seen.includes('clock:speed'); } }
];
