/**
 * Procedural chibi characters (no external models): hard-hat crew with
 * animated walk, work, read, sit, sleep, talk, look and idle states.
 */
import * as THREE from 'three';

export const SKIN_TONES = [0xf1c27d, 0xe0ac69, 0xc68642, 0x8d5524, 0xffdbac, 0xa1665e];
export const HAT_COLOURS = { player: 0xffffff, 'Lead installer': 0xff7a00, Designer: 0x2f80ed, Electrician: 0xffd400, Apprentice: 0x27ae60, 'Commissioning tech': 0x9b51e0, 'Project manager': 0xeb5757, default: 0xff7a00 };
export const VEST = 0xffb400;

function hashOf(text) { let x = 7; for (const c of String(text)) x = (x * 31 + c.charCodeAt(0)) >>> 0; return x; }
const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0.05, ...extra });

export function buildChibi({ id = 'x', role = 'default', isPlayer = false, tier = 1 } = {}) {
    const h = hashOf(id);
    const skin = SKIN_TONES[h % SKIN_TONES.length];
    const hat = HAT_COLOURS[isPlayer ? 'player' : role] ?? HAT_COLOURS.default;
    const g = new THREE.Group();
    g.name = `chibi:${id}`;
    const root = new THREE.Group(); root.name = 'root'; g.add(root);

    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.34, 0.42, 4, 10), mat(isPlayer ? 0x3b6fd6 : VEST)); body.position.y = 0.78; body.castShadow = true; root.add(body);
    const stripe = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.035, 6, 20), mat(0xdddddd, { emissive: 0x666666 })); stripe.rotation.x = Math.PI / 2; stripe.position.y = 0.8; root.add(stripe);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.33, 16, 14), mat(skin)); head.position.y = 1.42; head.castShadow = true; root.add(head);
    const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.36, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat(hat, { roughness: 0.5 })); helmet.position.y = 1.47; head.add(helmet); helmet.position.set(0, 0.05, 0);
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.04, 20), mat(hat, { roughness: 0.5 })); brim.position.set(0, 0.06, 0.04); head.add(brim);
    const eyeGeo = new THREE.SphereGeometry(0.045, 8, 8); const eyeMat = mat(0x111111);
    for (const side of [-1, 1]) { const eye = new THREE.Mesh(eyeGeo, eyeMat); eye.position.set(side * 0.12, 0.02, 0.29); head.add(eye); }
    const armGeo = new THREE.CapsuleGeometry(0.09, 0.3, 3, 8);
    const arms = [-1, 1].map((side) => { const pivot = new THREE.Group(); pivot.position.set(side * 0.42, 1.05, 0); const arm = new THREE.Mesh(armGeo, mat(skin)); arm.position.y = -0.22; pivot.add(arm); root.add(pivot); return pivot; });
    const legGeo = new THREE.CapsuleGeometry(0.11, 0.26, 3, 8);
    const legs = [-1, 1].map((side) => { const pivot = new THREE.Group(); pivot.position.set(side * 0.16, 0.5, 0); const leg = new THREE.Mesh(legGeo, mat(0x334155)); leg.position.y = -0.22; pivot.add(leg); root.add(pivot); return pivot; });
    const tool = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.5, 0.08), mat(0x8b5a2b)); tool.position.set(0, -0.4, 0.1); tool.visible = false; arms[1].add(tool);
    const toolHead = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.12, 0.12), mat(0x9aa0a6, { metalness: 0.6, roughness: 0.3 })); toolHead.position.y = -0.3; tool.add(toolHead);
    const book = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.04, 0.26), mat(0xf4e3b2)); book.position.set(0, 0.95, 0.42); book.rotation.x = -0.6; book.visible = false; root.add(book);
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.45, 16), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25 })); shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.02; g.add(shadow);
    if (tier >= 3) { const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.08), mat(0xffd700, { emissive: 0xaa8800 })); star.position.set(0, 0.5, 0); helmet.add(star); }

    const parts = { root, body, head, arms, legs, tool, book, helmet };
    const state = { anim: 'idle', t: 0, speed: 0, heading: 0 };
    g.userData = { id, parts, state, isPlayer };
    return g;
}

/** Advance the character's animation by dt seconds. */
export function animate(chibi, dt, anim = chibi.userData.state.anim, { speed = 1 } = {}) {
    const { parts, state } = chibi.userData;
    state.t += dt; state.anim = anim;
    const t = state.t; const { root, head, arms, legs, tool, book, body } = parts;
    // reset
    root.position.set(0, 0, 0); root.rotation.set(0, 0, 0); head.rotation.set(0, 0, 0); body.scale.set(1, 1, 1);
    tool.visible = false; book.visible = false;
    for (const a of arms) a.rotation.set(0, 0, 0); for (const l of legs) l.rotation.set(0, 0, 0);
    switch (anim) {
        case 'walk': { const s = Math.sin(t * 9 * speed); legs[0].rotation.x = s * 0.7; legs[1].rotation.x = -s * 0.7; arms[0].rotation.x = -s * 0.6; arms[1].rotation.x = s * 0.6; root.position.y = Math.abs(Math.sin(t * 9 * speed)) * 0.06; break; }
        case 'work': { tool.visible = true; const s = Math.sin(t * 7); arms[1].rotation.x = -1.6 + s * 0.8; arms[0].rotation.x = -0.4; root.position.y = -0.05 + Math.max(0, s) * 0.03; head.rotation.x = 0.25; break; }
        case 'read': { book.visible = true; arms[0].rotation.x = -1.2; arms[1].rotation.x = -1.2; head.rotation.x = 0.35 + Math.sin(t * 0.8) * 0.03; break; }
        case 'sit': { root.position.y = -0.3; legs[0].rotation.x = -1.4; legs[1].rotation.x = -1.4; arms[0].rotation.x = -0.6; arms[1].rotation.x = -0.6 + Math.sin(t * 2) * 0.15; break; }
        case 'sleep': { root.rotation.x = -Math.PI / 2 + 0.1; root.position.y = 0.35; root.position.z = -0.6; body.scale.set(1 + Math.sin(t * 1.5) * 0.02, 1, 1); break; }
        case 'talk': { head.rotation.x = Math.sin(t * 3) * 0.08; head.rotation.y = Math.sin(t * 1.3) * 0.2; arms[1].rotation.x = -0.8 + Math.sin(t * 4) * 0.3; arms[1].rotation.z = -0.4; break; }
        case 'look': { head.rotation.y = Math.sin(t * 0.9) * 0.7; arms[0].rotation.x = -1.3; arms[0].rotation.z = 0.5; break; }
        case 'cheer': { arms[0].rotation.x = -2.8; arms[1].rotation.x = -2.8; root.position.y = Math.abs(Math.sin(t * 6)) * 0.25; break; }
        default: { body.scale.set(1, 1 + Math.sin(t * 1.6) * 0.015, 1); head.rotation.y = Math.sin(t * 0.5) * 0.15; }
    }
    return state;
}

/** Face a heading (radians, y axis) smoothly. */
export function face(chibi, heading, dt, rate = 10) {
    let diff = heading - chibi.rotation.y;
    while (diff > Math.PI) diff -= Math.PI * 2; while (diff < -Math.PI) diff += Math.PI * 2;
    chibi.rotation.y += diff * Math.min(1, dt * rate);
    return chibi.rotation.y;
}

export const ANIMS = ['idle', 'walk', 'work', 'read', 'sit', 'sleep', 'talk', 'look', 'cheer'];

export const FEATURES = [
    { id: 'game.chibi.build', title: 'Procedural chibi character with hard hat, vest, arms, legs and tool', dom: true, test: () => { const c = buildChibi({ id: 'ATLAS', role: 'Lead installer', tier: 3 }); const p = c.userData.parts; return c.name === 'chibi:ATLAS' && p.arms.length === 2 && p.legs.length === 2 && p.helmet.material.color.getHex() === 0xff7a00 && p.helmet.children.length === 1; } },
    { id: 'game.chibi.playerLook', title: 'Player gets a distinct blue outfit and white hat', dom: true, test: () => { const c = buildChibi({ id: 'you', isPlayer: true }); return c.userData.parts.body.material.color.getHex() === 0x3b6fd6 && c.userData.parts.helmet.material.color.getHex() === 0xffffff; } },
    { id: 'game.chibi.animations', title: 'Nine animation states move the right parts', dom: true, test: () => { const c = buildChibi({ id: 'z' }); const p = c.userData.parts; animate(c, 0.1, 'walk'); const walk = p.legs[0].rotation.x !== 0; animate(c, 0.1, 'work'); const work = p.tool.visible && p.arms[1].rotation.x < -0.5; animate(c, 0.1, 'read'); const read = p.book.visible; animate(c, 0.1, 'sleep'); const sleep = p.root.rotation.x < -1; animate(c, 0.1, 'sit'); const sit = p.root.position.y < -0.2; animate(c, 0.1, 'idle'); const idle = !p.tool.visible && !p.book.visible && p.root.rotation.x === 0; return ANIMS.length === 9 && walk && work && read && sleep && sit && idle; } },
    { id: 'game.chibi.face', title: 'Characters turn smoothly toward a heading', dom: true, test: () => { const c = buildChibi({ id: 'f' }); c.rotation.y = 0; for (let i = 0; i < 60; i++) face(c, Math.PI / 2, 1 / 60); return Math.abs(c.rotation.y - Math.PI / 2) < 0.02; } },
    { id: 'game.chibi.deterministicSkin', title: 'Skin tone and hat derive from id and role deterministically', dom: true, test: () => buildChibi({ id: 'NOVA', role: 'Designer' }).userData.parts.head.material.color.getHex() === buildChibi({ id: 'NOVA', role: 'Designer' }).userData.parts.head.material.color.getHex() && buildChibi({ id: 'NOVA', role: 'Designer' }).userData.parts.helmet.material.color.getHex() === 0x2f80ed }
];
