/** Touch controls: a virtual joystick plus action buttons for phones and tablets. */
import { h } from '../core/ui.js';

export function isCoarsePointer() { return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches; }

export function createTouchControls(host, { player, onInteract = () => {}, onJump = () => player.jump(), radius = 48 } = {}) {
    const stick = h('div', { class: 'touch-stick' }, h('div', { class: 'touch-knob' }));
    const btns = h('div', { class: 'touch-buttons' }, h('button', { class: 'touch-btn', type: 'button', onclick: onInteract }, 'E'), h('button', { class: 'touch-btn', type: 'button', onclick: onJump }, '⤒'));
    const root = h('div', { class: 'touch-controls' }, stick, btns);
    host.append(root);
    let active = null; const knob = stick.firstChild;
    const setAxis = (dx, dy) => { const len = Math.hypot(dx, dy); const k = len > radius ? radius / len : 1; const x = (dx * k) / radius; const y = (dy * k) / radius; knob.style.transform = `translate(${(x * radius).toFixed(1)}px, ${(y * radius).toFixed(1)}px)`; player.setAxis(x, y); };
    const down = (e) => { active = e.pointerId; stick.setPointerCapture?.(e.pointerId); const r = stick.getBoundingClientRect(); stick._c = { x: r.left + r.width / 2, y: r.top + r.height / 2 }; setAxis(e.clientX - stick._c.x, e.clientY - stick._c.y); e.preventDefault(); };
    const move = (e) => { if (e.pointerId !== active) return; setAxis(e.clientX - stick._c.x, e.clientY - stick._c.y); };
    const up = (e) => { if (e.pointerId !== active) return; active = null; knob.style.transform = ''; player.setAxis(0, 0); };
    stick.addEventListener('pointerdown', down); stick.addEventListener('pointermove', move); stick.addEventListener('pointerup', up); stick.addEventListener('pointercancel', up);
    return { root, setAxis, show(on = true) { root.classList.toggle('hidden', !on); }, dispose() { root.remove(); player.setAxis(0, 0); } };
}

export const FEATURES = [
    { id: 'game.touch.joystick', title: 'Virtual joystick drives the player analog axis', dom: true, test: () => { const host = h('div', { style: { position: 'fixed', width: '300px', height: '300px' } }); document.body.append(host); const axis = []; const player = { setAxis: (x, y) => axis.push([x, y]), jump() {} }; const t = createTouchControls(host, { player }); const stick = host.querySelector('.touch-stick'); const r = stick.getBoundingClientRect(); const cx = r.left + r.width / 2; const cy = r.top + r.height / 2; stick.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: cx + 100, clientY: cy, bubbles: true })); stick.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, clientX: cx + 100, clientY: cy, bubbles: true })); const ok = axis.length === 2 && Math.abs(axis[0][0] - 1) < 0.01 && axis[0][1] === 0 && axis[1][0] === 0; t.dispose(); host.remove(); return ok; } },
    { id: 'game.touch.buttons', title: 'Interact and jump buttons', dom: true, test: () => { const host = h('div'); document.body.append(host); let e = 0; let j = 0; const t = createTouchControls(host, { player: { setAxis() {}, jump() { j++; } }, onInteract: () => e++ }); const b = host.querySelectorAll('.touch-btn'); b[0].click(); b[1].click(); const ok = e === 1 && j === 1; t.dispose(); host.remove(); return ok; } }
];
