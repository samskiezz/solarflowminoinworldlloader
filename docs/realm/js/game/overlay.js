/** DOM overlay: nameplates, speech bubbles, quest markers and floating text anchored to 3D positions. */
import { h } from '../core/ui.js';

export function createOverlay(container, engine) {
    const layer = h('div', { class: 'game-overlay', 'aria-hidden': 'true' });
    container.append(layer);
    const items = new Map();
    function add(id, { el, anchor, offsetY = 2.2, maxDistance = 70, cls = '' }) {
        if (items.has(id)) remove(id);
        el.classList.add('ov-item'); if (cls) el.classList.add(cls);
        layer.append(el);
        items.set(id, { el, anchor, offsetY, maxDistance });
        return el;
    }
    function remove(id) { const it = items.get(id); if (it) { it.el.remove(); items.delete(id); } }
    function get(id) { return items.get(id)?.el || null; }
    function anchorPos(anchor) { if (typeof anchor === 'function') return anchor(); if (anchor && anchor.isObject3D) { const p = anchor.position; return { x: p.x, y: p.y, z: p.z }; } return anchor; }
    function update() {
        const w = layer.clientWidth; const hgt = layer.clientHeight; const cam = engine.camera.position;
        for (const it of items.values()) {
            const a = anchorPos(it.anchor); if (!a) { it.el.style.display = 'none'; continue; }
            const d = Math.hypot(a.x - cam.x, a.z - cam.z);
            if (d > it.maxDistance) { it.el.style.display = 'none'; continue; }
            const p = engine.project({ x: a.x, y: a.y + it.offsetY, z: a.z });
            if (p.behind || p.x < -0.1 || p.x > 1.1 || p.y < -0.1 || p.y > 1.1) { it.el.style.display = 'none'; continue; }
            it.el.style.display = ''; it.el.style.transform = `translate(-50%, -100%) translate(${(p.x * w).toFixed(1)}px, ${(p.y * hgt).toFixed(1)}px) scale(${Math.max(0.6, Math.min(1.1, 28 / d)).toFixed(2)})`;
        }
    }
    function floatText(text, anchor, { colour = 'var(--gold)', duration = 1400 } = {}) {
        const id = `float:${Date.now()}:${Math.random()}`;
        const el = add(id, { el: h('div', { class: 'ov-float', style: { color: colour } }, text), anchor: anchorPos(anchor), offsetY: 2.4, maxDistance: 120 });
        const start = performance.now();
        const tick = () => { const k = (performance.now() - start) / duration; if (k >= 1) { remove(id); return; } el.style.opacity = String(1 - k); el.style.marginTop = `${-k * 40}px`; requestAnimationFrame(tick); };
        requestAnimationFrame(tick);
        return el;
    }
    return { layer, add, remove, get, update, floatText, count: () => items.size, clear() { for (const id of [...items.keys()]) remove(id); } };
}

export function nameplate({ name, sub = '', colour = '#fff', portrait = null, tier = 0, cls = '' }) { return h('div', { class: `ov-nameplate ${cls}` }, portrait ? h('img', { class: 'ov-portrait', src: portrait, alt: '' }) : null, h('div', { class: 'ov-name', style: { color: colour } }, tier >= 3 ? '★ ' : '', name), sub ? h('div', { class: 'ov-sub' }, sub) : null); }
/** Sims-style needs widget (ported from the Dominion City health widget). */
export function needsWidget(agent, { activity = '', credits = null } = {}) {
    const bars = Object.entries(agent.needs || {}).map(([k, v]) => h('div', { class: 'ov-need' }, h('span', {}, k), h('span', { class: 'ov-need-bar' }, h('span', { class: 'ov-need-fill', style: { width: `${Math.round(v)}%`, background: v < 25 ? '#ff5f6d' : v < 50 ? '#ffb347' : '#3ddc84' } }))));
    return h('div', { class: 'ov-needs' }, h('div', { class: 'ov-needs-title' }, agent.name, agent.meta && agent.meta.title ? h('span', { class: 'ov-needs-role' }, ` · ${agent.meta.title}`) : null), bars, h('div', { class: 'ov-needs-foot' }, activity ? `${activity}` : '', credits !== null ? ` · ${credits} cr` : ''));
}
export function bubble(text, kind = 'say') { return h('div', { class: `ov-bubble ${kind}` }, text); }
export function marker(symbol) { return h('div', { class: `ov-marker ${symbol === '?' ? 'turnin' : 'available'}` }, symbol); }
export function prompt(text, key = 'E') { return h('div', { class: 'ov-prompt' }, h('kbd', {}, key), ' ', text); }

const fakeEngine = () => ({ camera: { position: { x: 0, y: 10, z: 10 } }, project: ({ x, y, z }) => ({ x: 0.5 + x / 100, y: 0.5 - y / 100 + z / 100, behind: false }) });
export const FEATURES = [
    { id: 'game.overlay.anchors', title: 'Overlay items project 3D anchors to screen positions', dom: true, test: () => { const host = h('div', { style: { width: '400px', height: '300px', position: 'fixed' } }); document.body.append(host); const ov = createOverlay(host, fakeEngine()); const el = ov.add('a', { el: nameplate({ name: 'Atlas' }), anchor: { x: 0, y: 0, z: 0 } }); ov.update(); const ok = /translate\(200(\.0)?px/.test(el.style.transform) && ov.count() === 1; ov.remove('a'); const gone = ov.count() === 0; host.remove(); return ok && gone; } },
    { id: 'game.overlay.distanceCull', title: 'Far-away plates are hidden', dom: true, test: () => { const host = h('div', { style: { width: '400px', height: '300px', position: 'fixed' } }); document.body.append(host); const ov = createOverlay(host, fakeEngine()); const el = ov.add('b', { el: bubble('hi'), anchor: { x: 500, y: 0, z: 0 }, maxDistance: 50 }); ov.update(); const ok = el.style.display === 'none'; host.remove(); return ok; } },
    { id: 'game.overlay.floatText', title: 'Floating reward text animates and removes itself', dom: true, test: async () => { const host = h('div', { style: { width: '400px', height: '300px', position: 'fixed' } }); document.body.append(host); const ov = createOverlay(host, fakeEngine()); ov.floatText('+5 credits', { x: 0, y: 0, z: 0 }, { duration: 60 }); const had = ov.count() === 1; await new Promise((r) => setTimeout(r, 200)); const ok = had && ov.count() === 0; host.remove(); return ok; } },
    { id: 'game.overlay.needsWidget', title: 'Sims-style needs widget with six bars', dom: true, test: () => { const w = needsWidget({ name: 'Atlas', needs: { energy: 10, focus: 60, morale: 80, social: 50, mastery: 40, safety: 90 }, meta: { title: 'Lead' } }, { activity: 'Working', credits: 12 }); return w.querySelectorAll('.ov-need').length === 6 && w.querySelector('.ov-need-fill').style.width === '10%' && /Working/.test(w.textContent) && /Lead/.test(w.textContent); } },
    { id: 'game.overlay.widgets', title: 'Nameplate, bubble, quest marker and key prompt widgets', dom: true, test: () => marker('?').classList.contains('turnin') && marker('!').classList.contains('available') && prompt('Talk', 'E').querySelector('kbd').textContent === 'E' && bubble('x', 'think').classList.contains('think') && nameplate({ name: 'N', sub: 'S' }).querySelector('.ov-sub').textContent === 'S' }
];
