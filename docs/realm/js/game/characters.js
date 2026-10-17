/**
 * Characters: rigged, animated minions from the CC0 mini-characters kit
 * (idle, walk, sprint, sit, pick-up, holding, emotes, jump…) wearing a hard
 * hat coloured by role, with the procedural chibi kept as the fallback that
 * renders before the models arrive or when they cannot load. Both share one
 * API: buildChibi() → group, animate(group, dt, anim), face(group, heading, dt).
 */
import * as THREE from 'three';
import { has, instance, fitTo, pickFor, MANIFEST } from './assets.js';

export const SKIN_TONES = [0xf1c27d, 0xe0ac69, 0xc68642, 0x8d5524, 0xffdbac, 0xa1665e];
export const HAT_COLOURS = { player: 0xffffff, 'Lead installer': 0xff7a00, Designer: 0x2f80ed, Electrician: 0xffd400, Apprentice: 0x27ae60, 'Commissioning tech': 0x9b51e0, 'Project manager': 0xeb5757, default: 0xff7a00 };
export const VEST = 0xffb400;
export const CHARACTER_HEIGHT = 1.75;
/** Realm animation → clip in the kit (looped), with a fallback clip. */
export const CLIP_FOR = { idle: 'idle', walk: 'walk', run: 'sprint', work: 'pick-up', read: 'holding-both', sit: 'sit', sleep: 'die', talk: 'emote-yes', look: 'holding-right', cheer: 'jump' };

function hashOf(text) { let x = 7; for (const c of String(text)) x = (x * 31 + c.charCodeAt(0)) >>> 0; return x; }
const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0.05, ...extra });

/** Build a character: the rigged model when its kit has loaded, otherwise the procedural chibi. */
export function buildChibi({ id = 'x', role = 'default', isPlayer = false, tier = 1 } = {}) {
    const key = `characters/${pickFor(id, MANIFEST.characters)}`;
    if (has(key)) { const g = buildRigged({ id, role, isPlayer, tier, key }); if (g) return g; }
    return buildProcedural({ id, role, isPlayer, tier });
}

function hardHat(colour, scale) {
    const g = new THREE.Group(); g.name = 'hat';
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.2 / scale, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(colour, { roughness: 0.45 })); g.add(dome);
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.24 / scale, 0.24 / scale, 0.025 / scale, 16), mat(colour, { roughness: 0.45 })); brim.position.set(0, 0.01 / scale, 0.03 / scale); g.add(brim);
    return g;
}

export function buildRigged({ id, role, isPlayer, tier, key }) {
    const obj = instance(key); if (!obj) return null;
    const g = new THREE.Group(); g.name = `chibi:${id}`;
    const fit = fitTo(obj, { h: CHARACTER_HEIGHT }); g.add(obj);
    const scale = fit.scale || 1;
    const bone = (n) => obj.getObjectByName(n) || obj;
    const head = bone('head'); const torso = bone('torso'); const arms = [bone('arm-left'), bone('arm-right')]; const legs = [bone('leg-left'), bone('leg-right')];
    const hat = HAT_COLOURS[isPlayer ? 'player' : role] ?? HAT_COLOURS.default;
    const hatGroup = hardHat(hat, scale); hatGroup.position.y = (0.19 / scale); head.add(hatGroup); const helmet = hatGroup.children[0]; // the dome mesh carries the material the selection highlight tints
    if (tier >= 3) { const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.05 / scale), mat(0xffd700, { emissive: 0xaa8800 })); star.position.set(0, 0.26 / scale, 0); hatGroup.add(star); }
    const stripe = new THREE.Mesh(new THREE.TorusGeometry(0.2 / scale, 0.02 / scale, 6, 20), mat(isPlayer ? 0x3b6fd6 : VEST, { emissive: isPlayer ? 0x102040 : 0x553300, emissiveIntensity: 0.3 })); stripe.rotation.x = Math.PI / 2; stripe.position.y = 0.42 / scale; torso.add(stripe);
    const tool = new THREE.Mesh(new THREE.BoxGeometry(0.06 / scale, 0.45 / scale, 0.06 / scale), mat(0x8b5a2b)); tool.position.set(0, -0.3 / scale, 0.08 / scale); tool.visible = false; arms[1].add(tool);
    const toolHead = new THREE.Mesh(new THREE.BoxGeometry(0.2 / scale, 0.1 / scale, 0.1 / scale), mat(0x9aa0a6, { metalness: 0.6, roughness: 0.3 })); toolHead.position.y = -0.25 / scale; tool.add(toolHead);
    const book = new THREE.Mesh(new THREE.BoxGeometry(0.34 / scale, 0.04 / scale, 0.24 / scale), mat(0xf4e3b2)); book.position.set(0, 0.3 / scale, 0.3 / scale); book.rotation.x = -0.5; book.visible = false; torso.add(book);
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.42, 16), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22 })); shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.02; g.add(shadow);
    const mixer = new THREE.AnimationMixer(obj);
    const clips = new Map((obj.userData.animations || []).map((c) => [c.name, c]));
    const actions = new Map();
    const action = (name) => { if (actions.has(name)) return actions.get(name); const clip = clips.get(name) || clips.get('idle'); if (!clip) return null; const a = mixer.clipAction(clip); a.setLoop(THREE.LoopRepeat, Infinity); a.clampWhenFinished = false; actions.set(name, a); return a; };
    const parts = { root: obj, body: torso, head, arms, legs, tool, book, helmet, mixer, action, current: null };
    g.userData = { id, parts, state: { anim: 'idle', t: 0, speed: 0, heading: 0 }, isPlayer, rigged: true, asset: key };
    const idle = action('idle'); if (idle) { idle.play(); parts.current = 'idle'; }
    return g;
}

export function buildProcedural({ id = 'x', role = 'default', isPlayer = false, tier = 1 } = {}) {
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
    g.userData = { id, parts, state, isPlayer, rigged: false };
    return g;
}

/** Advance the character's animation by dt seconds. */
export function animate(chibi, dt, anim = chibi.userData.state.anim, { speed = 1 } = {}) {
    const { parts, state } = chibi.userData;
    state.t += dt; state.anim = anim;
    if (chibi.userData.rigged) return animateRigged(chibi, dt, anim, speed);
    const t = state.t; const { root, head, arms, legs, tool, book, body } = parts;
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
function animateRigged(chibi, dt, anim, speed) {
    const { parts, state } = chibi.userData;
    const name = anim === 'walk' && speed > 1.2 ? 'run' : anim;
    const clipName = CLIP_FOR[name] || 'idle';
    if (parts.current !== clipName) {
        const next = parts.action(clipName); const prev = parts.current ? parts.action(parts.current) : null;
        if (next) { next.reset().setEffectiveTimeScale(anim === 'walk' ? speed : 1).setEffectiveWeight(1).play(); if (prev && prev !== next) prev.crossFadeTo(next, 0.18, false); parts.current = clipName; }
    }
    parts.tool.visible = anim === 'work'; parts.book.visible = anim === 'read';
    parts.mixer.update(dt);
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
    { id: 'game.chibi.build', title: 'Procedural chibi character with hard hat, vest, arms, legs and tool', dom: true, test: () => { const c = buildProcedural({ id: 'ATLAS', role: 'Lead installer', tier: 3 }); const p = c.userData.parts; return c.name === 'chibi:ATLAS' && p.arms.length === 2 && p.legs.length === 2 && p.tool.visible === false && p.helmet.children.length === 1; } },
    { id: 'game.chibi.playerLook', title: 'Player gets a distinct blue outfit and white hat', dom: true, test: () => { const c = buildProcedural({ id: 'you', isPlayer: true }); return c.userData.parts.body.material.color.getHex() === 0x3b6fd6 && c.userData.parts.helmet.material.color.getHex() === 0xffffff; } },
    { id: 'game.chibi.animations', title: 'Nine animation states move the right parts', dom: true, test: () => { const c = buildProcedural({ id: 'z' }); const p = c.userData.parts; animate(c, 0.1, 'walk'); const walk = p.legs[0].rotation.x !== 0; animate(c, 0.1, 'work'); const work = p.tool.visible; animate(c, 0.1, 'read'); const read = p.book.visible; animate(c, 0.1, 'sleep'); const sleep = p.root.rotation.x < -1; animate(c, 0.1, 'cheer'); const cheer = p.arms[0].rotation.x < -2; return walk && work && read && sleep && cheer && ANIMS.length === 9; } },
    { id: 'game.chibi.face', title: 'Characters turn smoothly toward a heading', dom: true, test: () => { const c = buildProcedural({ id: 'f' }); c.rotation.y = 0; for (let i = 0; i < 60; i++) face(c, Math.PI / 2, 1 / 60); return Math.abs(c.rotation.y - Math.PI / 2) < 0.01; } },
    { id: 'game.chibi.deterministicSkin', title: 'Skin tone and hat derive from id and role deterministically', dom: true, test: () => buildProcedural({ id: 'NOVA', role: 'Designer' }).userData.parts.head.material.color.getHex() === buildProcedural({ id: 'NOVA', role: 'Designer' }).userData.parts.head.material.color.getHex() && buildProcedural({ id: 'NOVA', role: 'Designer' }).userData.parts.helmet.material.color.getHex() === HAT_COLOURS.Designer },
    { id: 'game.chibi.rigged', title: 'With the character kit loaded, minions are rigged models with a hard hat, a vest stripe and real walk/sit/pick-up clips driven by the mixer', dom: true, test: async () => { const { load } = await import('./assets.js'); const key = `characters/${pickFor('ATLAS', MANIFEST.characters)}`; try { await load(key, { timeoutMs: 15000 }); } catch (error) { return `character kit not reachable here: ${error.message}`; } const c = buildChibi({ id: 'ATLAS', role: 'Lead installer', tier: 3 }); if (!c.userData.rigged) return 'not rigged'; const p = c.userData.parts; animate(c, 0.1, 'walk'); const walk = p.current === 'walk'; animate(c, 0.1, 'work'); const work = p.current === 'pick-up' && p.tool.visible; animate(c, 0.1, 'sit'); const box = new THREE.Box3().setFromObject(c); return walk && work && p.current === 'sit' && p.helmet.parent.parent === p.head && p.helmet.material && box.max.y > 1.2 && box.max.y < 2.4 && c.userData.asset.startsWith('characters/'); } }
];
