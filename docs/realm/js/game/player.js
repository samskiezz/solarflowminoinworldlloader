/** The player: third-person chibi with WASD/arrow movement, mouse-orbit camera, wheel zoom, click-to-move and jump. */
import * as THREE from 'three';
import { buildChibi, animate, face } from './characters.js';
import { step, resolveCollisions, clampToWorld, dist, headingTo } from './steer.js';

export const PLAYER_SPEED = 6;
export const WORLD_HALF = 292;

export function createPlayer(engine, { obstacles = () => [], position = { x: 0, z: 10 }, id = 'you', listen = true, element = null } = {}) {
    let chibi = buildChibi({ id, isPlayer: true });
    engine.scene.add(chibi);
    const state = { pos: { ...position }, heading: Math.PI, moving: false, moveTarget: null, onArrive: null, y: 0, vy: 0, jumping: false, cam: { yaw: 0, pitch: 0.42, dist: 12 }, keys: new Set(), drag: null, dragged: false, anim: 'idle', lastMoved: 0, axis: { x: 0, y: 0 } };
    chibi.position.set(state.pos.x, 0, state.pos.z); chibi.rotation.y = state.heading;
    const el = element || engine.renderer.domElement;

    const keyMap = { w: 'fwd', arrowup: 'fwd', s: 'back', arrowdown: 'back', a: 'left', arrowleft: 'left', d: 'right', arrowright: 'right', q: 'turnl', e: 'turnr', shift: 'run' };
    function typing(t) { return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable); }
    function onKeyDown(e) { if (typing(e.target) || e.ctrlKey || e.metaKey || e.altKey) return; const k = e.key.toLowerCase(); if (k === ' ' && !e.shiftKey) { jump(); e.preventDefault(); return; } const m = keyMap[k]; if (m) { state.keys.add(m); state.moveTarget = null; if (['fwd', 'back', 'left', 'right'].includes(m)) e.preventDefault(); } }
    function onKeyUp(e) { const m = keyMap[e.key.toLowerCase()]; if (m) state.keys.delete(m); }
    function onPointerDown(e) { if (e.target !== el) return; state.drag = { x: e.clientX, y: e.clientY, button: e.button }; state.dragged = false; }
    function onPointerMove(e) { if (!state.drag) return; const dx = e.clientX - state.drag.x; const dy = e.clientY - state.drag.y; if (Math.abs(dx) + Math.abs(dy) > 4) state.dragged = true; state.cam.yaw -= dx * 0.005; state.cam.pitch = Math.max(0.08, Math.min(1.3, state.cam.pitch + dy * 0.004)); state.drag.x = e.clientX; state.drag.y = e.clientY; }
    function onPointerUp(e) { if (!state.drag) return; const wasDrag = state.dragged; state.drag = null; if (!wasDrag && e.button === 0 && e.target === el) { const r = el.getBoundingClientRect(); const ndc = { x: ((e.clientX - r.left) / r.width) * 2 - 1, y: -(((e.clientY - r.top) / r.height) * 2 - 1) }; api.onClick(ndc, e); } }
    function onWheel(e) { if (e.target !== el) return; state.cam.dist = Math.max(4, Math.min(34, state.cam.dist + Math.sign(e.deltaY) * 1.2)); e.preventDefault(); }
    function onContextMenu(e) { if (e.target === el) e.preventDefault(); }
    function jump() { if (!state.jumping) { state.jumping = true; state.vy = 5.2; } }

    const api = {
        get chibi() { return chibi; }, state,
        /** Swap the body for the rigged model once the character kit has loaded. */
        refreshModel() { const fresh = buildChibi({ id, isPlayer: true }); fresh.position.copy(chibi.position); fresh.rotation.copy(chibi.rotation); engine.scene.remove(chibi); engine.scene.add(fresh); chibi = fresh; return fresh; },
        get pos() { return state.pos; },
        onClick(ndc) { const g = engine.groundPoint(ndc.x, ndc.y); if (g) api.moveTo(g); },
        moveTo(target, onArrive = null) { state.moveTarget = { x: target.x, z: target.z }; state.onArrive = onArrive; },
        stop() { state.moveTarget = null; state.onArrive = null; state.keys.clear(); },
        setPosition(p) { state.pos = { x: p.x, z: p.z }; chibi.position.set(p.x, state.y, p.z); },
        press(k) { state.keys.add(k); }, release(k) { state.keys.delete(k); },
        setAxis(x, y) { state.axis = { x, y }; if (x || y) state.moveTarget = null; },
        jump,
        update(dt) {
            let moved = 0; const speed = PLAYER_SPEED * (state.keys.has('run') ? 1.6 : 1);
            if (state.keys.has('turnl')) state.cam.yaw += dt * 2; if (state.keys.has('turnr')) state.cam.yaw -= dt * 2;
            const fwd = { x: -Math.sin(state.cam.yaw), z: -Math.cos(state.cam.yaw) }; const right = { x: -fwd.z, z: fwd.x };
            let dir = { x: 0, z: 0 };
            if (state.keys.has('fwd')) { dir.x += fwd.x; dir.z += fwd.z; } if (state.keys.has('back')) { dir.x -= fwd.x; dir.z -= fwd.z; }
            if (state.keys.has('left')) { dir.x -= right.x; dir.z -= right.z; } if (state.keys.has('right')) { dir.x += right.x; dir.z += right.z; }
            if (state.axis.x || state.axis.y) { dir.x += fwd.x * -state.axis.y + right.x * state.axis.x; dir.z += fwd.z * -state.axis.y + right.z * state.axis.x; }
            const len = Math.hypot(dir.x, dir.z);
            if (len > 0) {
                dir = { x: dir.x / len, z: dir.z / len };
                let next = { x: state.pos.x + dir.x * speed * dt, z: state.pos.z + dir.z * speed * dt };
                next = clampToWorld(resolveCollisions(next, obstacles(), 0.7), WORLD_HALF);
                moved = dist(state.pos, next); state.pos = next; state.heading = Math.atan2(dir.x, dir.z);
            } else if (state.moveTarget) {
                const r = step(state.pos, state.moveTarget, { speed, dt, arrive: 0.5, boxes: obstacles(), margin: 0.7 });
                moved = r.moved; state.heading = headingTo(state.pos, state.moveTarget); state.pos = clampToWorld(r.pos, WORLD_HALF);
                if (r.arrived || moved < 0.0005) { const cb = state.onArrive; state.moveTarget = null; state.onArrive = null; if (cb) cb(); }
            }
            if (state.jumping) { state.vy -= 14 * dt; state.y = Math.max(0, state.y + state.vy * dt); if (state.y === 0 && state.vy < 0) { state.jumping = false; state.vy = 0; } }
            state.moving = moved > 0.0001; state.anim = state.jumping ? 'cheer' : state.moving ? 'walk' : 'idle';
            chibi.position.set(state.pos.x, state.y, state.pos.z); face(chibi, state.heading, dt, 12);
            animate(chibi, dt, state.anim, { speed: state.keys.has('run') ? 1.5 : 1 });
            api.updateCamera(dt);
            return moved;
        },
        updateCamera(dt) {
            const { yaw, pitch, dist: d } = state.cam; const target = new THREE.Vector3(state.pos.x, 1.4 + state.y * 0.5, state.pos.z);
            const desired = new THREE.Vector3(target.x + Math.sin(yaw) * Math.cos(pitch) * d, target.y + Math.sin(pitch) * d, target.z + Math.cos(yaw) * Math.cos(pitch) * d);
            desired.y = Math.max(1.2, desired.y);
            engine.camera.position.lerp(desired, Math.min(1, dt * 8)); engine.camera.lookAt(target);
        },
        dispose() { if (listen) { window.removeEventListener('keydown', onKeyDown); window.removeEventListener('keyup', onKeyUp); window.removeEventListener('pointerdown', onPointerDown); window.removeEventListener('pointermove', onPointerMove); window.removeEventListener('pointerup', onPointerUp); el.removeEventListener('wheel', onWheel); el.removeEventListener('contextmenu', onContextMenu); } engine.scene.remove(chibi); }
    };
    if (listen) { window.addEventListener('keydown', onKeyDown); window.addEventListener('keyup', onKeyUp); window.addEventListener('pointerdown', onPointerDown); window.addEventListener('pointermove', onPointerMove); window.addEventListener('pointerup', onPointerUp); el.addEventListener('wheel', onWheel, { passive: false }); el.addEventListener('contextmenu', onContextMenu); }
    api.updateCamera(1);
    return api;
}

const testEngine = () => { const c = document.createElement('canvas'); c.width = 200; c.height = 120; document.body.append(c); const { createEngine } = window.__realmSceneModule || {}; return { c }; };
export const FEATURES = [
    { id: 'game.player.move', title: 'WASD moves the player relative to the camera', dom: true, test: async () => { const { createEngine } = await import('./scene.js'); const c = document.createElement('canvas'); document.body.append(c); const e = createEngine(c, { shadows: false }); const p = createPlayer(e, { listen: false }); const z0 = p.pos.z; p.press('fwd'); for (let i = 0; i < 30; i++) p.update(1 / 30); p.release('fwd'); const forward = p.pos.z < z0 - 3; p.press('right'); for (let i = 0; i < 30; i++) p.update(1 / 30); const strafed = p.pos.x > 3; const walking = p.state.anim === 'walk'; p.dispose(); e.dispose(); c.remove(); return forward && strafed && walking; } },
    { id: 'game.player.collide', title: 'Buildings block the player', dom: true, test: async () => { const { createEngine } = await import('./scene.js'); const c = document.createElement('canvas'); document.body.append(c); const e = createEngine(c, { shadows: false }); const p = createPlayer(e, { listen: false, obstacles: () => [{ id: 'wall', x: 0, z: 0, w: 6, d: 6 }], position: { x: 0, z: 8 } }); p.press('fwd'); for (let i = 0; i < 120; i++) p.update(1 / 30); const ok = p.pos.z >= 3.6; p.dispose(); e.dispose(); c.remove(); return ok; } },
    { id: 'game.player.clickToMove', title: 'Click-to-move walks to the point and calls back on arrival', dom: true, test: async () => { const { createEngine } = await import('./scene.js'); const c = document.createElement('canvas'); document.body.append(c); const e = createEngine(c, { shadows: false }); const p = createPlayer(e, { listen: false, position: { x: 0, z: 0 } }); let arrived = false; p.moveTo({ x: 6, z: 2 }, () => { arrived = true; }); for (let i = 0; i < 200 && !arrived; i++) p.update(1 / 30); const ok = arrived && Math.abs(p.pos.x - 6) < 0.8; p.dispose(); e.dispose(); c.remove(); return ok; } },
    { id: 'game.player.camera', title: 'Third-person camera orbits and zooms', dom: true, test: async () => { const { createEngine } = await import('./scene.js'); const c = document.createElement('canvas'); document.body.append(c); const e = createEngine(c, { shadows: false }); const p = createPlayer(e, { listen: false, position: { x: 0, z: 0 } }); p.updateCamera(1); const behind = e.camera.position.z > 5; p.state.cam.yaw = Math.PI / 2; p.updateCamera(1); const side = e.camera.position.x > 5; p.state.cam.dist = 6; p.updateCamera(1); const near = Math.hypot(e.camera.position.x, e.camera.position.z) < 7; p.dispose(); e.dispose(); c.remove(); return behind && side && near; } },
    { id: 'game.player.jump', title: 'Space jumps with gravity', dom: true, test: async () => { const { createEngine } = await import('./scene.js'); const c = document.createElement('canvas'); document.body.append(c); const e = createEngine(c, { shadows: false }); const p = createPlayer(e, { listen: false }); p.jump(); p.update(0.1); const up = p.state.y > 0; for (let i = 0; i < 60; i++) p.update(0.05); const down = p.state.y === 0 && !p.state.jumping; p.dispose(); e.dispose(); c.remove(); return up && down; } },
    { id: 'game.player.axis', title: 'Analog axis input (touch joystick) moves the player', dom: true, test: async () => { const { createEngine } = await import('./scene.js'); const c = document.createElement('canvas'); document.body.append(c); const e = createEngine(c, { shadows: false }); const p = createPlayer(e, { listen: false, position: { x: 0, z: 0 } }); p.setAxis(0, -1); for (let i = 0; i < 30; i++) p.update(1 / 30); const ok = p.pos.z < -3 && p.state.anim === 'walk'; p.setAxis(0, 0); p.update(0.1); const stopped = p.state.anim === 'idle'; p.dispose(); e.dispose(); c.remove(); return ok && stopped; } },
    { id: 'game.player.worldBounds', title: 'The player cannot leave the town', dom: true, test: async () => { const { createEngine } = await import('./scene.js'); const c = document.createElement('canvas'); document.body.append(c); const e = createEngine(c, { shadows: false }); const p = createPlayer(e, { listen: false, position: { x: 0, z: 70 } }); p.press('back'); for (let i = 0; i < 200; i++) p.update(1 / 30); const ok = p.pos.z <= WORLD_HALF; p.dispose(); e.dispose(); c.remove(); return ok; } }
];
