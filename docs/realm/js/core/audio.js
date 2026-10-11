/**
 * Sound without assets: a small WebAudio synthesiser for UI clicks, rewards,
 * level-ups, footsteps, rain, campfire crackle and day/night ambience.
 * Everything is generated from oscillators and filtered noise, so it ships
 * with no audio files and works offline. Off by default (Settings › Sound).
 */
export const SOUNDS = ['click', 'open', 'close', 'reward', 'levelup', 'achievement', 'step', 'error', 'greet'];
export const LOOPS = ['rain', 'fire', 'day', 'night'];

export function createAudio({ store = null, AudioContextClass = (typeof AudioContext !== 'undefined' ? AudioContext : null) } = {}) {
    let ctx = null; const loops = new Map(); let master = null; let unlocked = false;
    const enabled = () => (store ? Boolean(store.get('ui.soundOn')) : true);
    function context() {
        if (ctx || !AudioContextClass) return ctx;
        try { ctx = new AudioContextClass(); master = ctx.createGain(); master.gain.value = store ? (store.get('ui.volume', 0.5)) : 0.5; master.connect(ctx.destination); } catch (error) { ctx = null; }
        return ctx;
    }
    function noiseBuffer(c, seconds = 1) { const b = c.createBuffer(1, Math.floor(c.sampleRate * seconds), c.sampleRate); const d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return b; }
    function tone(c, { freq = 440, type = 'sine', attack = 0.005, decay = 0.15, gain = 0.25, slide = 0, at = 0 }) {
        const o = c.createOscillator(); const g = c.createGain(); o.type = type; o.frequency.setValueAtTime(freq, c.currentTime + at); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), c.currentTime + at + decay);
        g.gain.setValueAtTime(0, c.currentTime + at); g.gain.linearRampToValueAtTime(gain, c.currentTime + at + attack); g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + at + attack + decay);
        o.connect(g); g.connect(master); o.start(c.currentTime + at); o.stop(c.currentTime + at + attack + decay + 0.05); return o;
    }
    const recipes = {
        click: (c) => tone(c, { freq: 1200, type: 'square', decay: 0.04, gain: 0.08 }),
        open: (c) => { tone(c, { freq: 520, decay: 0.08, gain: 0.12 }); tone(c, { freq: 780, decay: 0.12, gain: 0.1, at: 0.06 }); },
        close: (c) => { tone(c, { freq: 780, decay: 0.08, gain: 0.1 }); tone(c, { freq: 520, decay: 0.12, gain: 0.1, at: 0.06 }); },
        reward: (c) => { [660, 880, 1320].forEach((f, i) => tone(c, { freq: f, type: 'triangle', decay: 0.18, gain: 0.14, at: i * 0.07 })); },
        levelup: (c) => { [523, 659, 784, 1047].forEach((f, i) => tone(c, { freq: f, type: 'triangle', decay: 0.3, gain: 0.16, at: i * 0.11 })); },
        achievement: (c) => { [784, 988, 1175, 1568, 1175, 1568].forEach((f, i) => tone(c, { freq: f, type: 'sine', decay: 0.25, gain: 0.14, at: i * 0.1 })); },
        step: (c) => { const s = c.createBufferSource(); s.buffer = noiseBuffer(c, 0.08); const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 600; const g = c.createGain(); g.gain.setValueAtTime(0.18, c.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.08); s.connect(f); f.connect(g); g.connect(master); s.start(); },
        error: (c) => tone(c, { freq: 220, type: 'sawtooth', decay: 0.25, gain: 0.12, slide: -120 }),
        greet: (c) => { tone(c, { freq: 440, decay: 0.1, gain: 0.08 }); tone(c, { freq: 554, decay: 0.14, gain: 0.08, at: 0.09 }); }
    };
    function startLoop(name) {
        const c = context(); if (!c || loops.has(name)) return false;
        const g = c.createGain(); g.gain.value = 0; g.connect(master);
        const src = c.createBufferSource(); src.buffer = noiseBuffer(c, 2); src.loop = true;
        const f = c.createBiquadFilter(); src.connect(f); f.connect(g);
        const level = { rain: 0.18, fire: 0.08, day: 0.03, night: 0.05 }[name] || 0.05;
        if (name === 'rain') { f.type = 'highpass'; f.frequency.value = 900; }
        else if (name === 'fire') { f.type = 'bandpass'; f.frequency.value = 300; f.Q.value = 0.7; const lfo = c.createOscillator(); const lg = c.createGain(); lfo.frequency.value = 6; lg.gain.value = 0.04; lfo.connect(lg); lg.connect(g.gain); lfo.start(); }
        else if (name === 'day') { f.type = 'bandpass'; f.frequency.value = 2500; f.Q.value = 2; }
        else { f.type = 'lowpass'; f.frequency.value = 250; }
        src.start(); g.gain.linearRampToValueAtTime(level, c.currentTime + 1.5);
        loops.set(name, { src, g }); return true;
    }
    function stopLoop(name) { const l = loops.get(name); if (!l) return false; const c = context(); l.g.gain.linearRampToValueAtTime(0, c.currentTime + 1); setTimeout(() => { try { l.src.stop(); } catch (e) { /* already stopped */ } }, 1200); loops.delete(name); return true; }
    const api = {
        get enabled() { return enabled(); },
        unlock() { const c = context(); if (c && c.state === 'suspended' && c.resume) c.resume(); unlocked = Boolean(c); return unlocked; },
        play(name) { if (!enabled() || !recipes[name]) return false; const c = context(); if (!c) return false; try { recipes[name](c); return true; } catch (error) { return false; } },
        loop(name, on = true) { if (!enabled() && on) return false; return on ? startLoop(name) : stopLoop(name); },
        stopAll() { for (const n of [...loops.keys()]) stopLoop(n); },
        setVolume(v) { if (store) store.set('ui.volume', v); if (master) master.gain.value = v; },
        activeLoops() { return [...loops.keys()]; },
        /** Ambience follows the world: phase → day/night bed, storm → rain, near the campfire → crackle. */
        ambience({ phase = 'day', weather = 'none', nearFire = false } = {}) { if (!enabled()) { api.stopAll(); return; } const want = new Set([phase === 'night' || phase === 'dusk' ? 'night' : 'day']); if (weather === 'storm') want.add('rain'); if (nearFire) want.add('fire'); for (const n of LOOPS) api.loop(n, want.has(n)); }
    };
    return api;
}

class StubContext { constructor() { this.nodes = 0; this.currentTime = 0; this.sampleRate = 8000; this.state = 'running'; this.destination = {}; } _node() { this.nodes++; const p = { value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} }; return { connect() {}, start() {}, stop() {}, gain: p, frequency: p, Q: p, type: '', loop: false, buffer: null }; } createGain() { return this._node(); } createOscillator() { return this._node(); } createBiquadFilter() { return this._node(); } createBufferSource() { return this._node(); } createBuffer(ch, len) { return { getChannelData: () => new Float32Array(len) }; } resume() { this.state = 'running'; } }
const memStore = (on) => { const d = { 'ui.soundOn': on }; return { get: (p, f) => d[p] ?? f, set: (p, v) => { d[p] = v; } }; };
export const FEATURES = [
    { id: 'core.audio.off', title: 'Sound is off by default and plays nothing', test: () => { const a = createAudio({ store: memStore(false), AudioContextClass: StubContext }); return !a.enabled && a.play('click') === false && a.loop('rain') === false; } },
    { id: 'core.audio.synth', title: 'Nine synthesised cues play when enabled', test: () => { const a = createAudio({ store: memStore(true), AudioContextClass: StubContext }); return SOUNDS.every((s) => a.play(s) === true) && a.play('nope') === false; } },
    { id: 'core.audio.loops', title: 'Ambience loops follow phase, weather and the campfire', test: () => { const a = createAudio({ store: memStore(true), AudioContextClass: StubContext }); a.ambience({ phase: 'day' }); const day = a.activeLoops().join() === 'day'; a.ambience({ phase: 'night', weather: 'storm', nearFire: true }); const storm = new Set(a.activeLoops()); a.stopAll(); return day && storm.has('rain') && storm.has('night') && storm.has('fire') && !storm.has('day') && a.activeLoops().length === 0; } },
    { id: 'core.audio.noContext', title: 'Without WebAudio support everything is a safe no-op', test: () => { const a = createAudio({ store: memStore(true), AudioContextClass: null }); return a.play('click') === false && a.loop('rain') === false && a.unlock() === false; } }
];
