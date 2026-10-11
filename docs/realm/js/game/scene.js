/**
 * The 3D world: renderer, camera, lighting that follows the simulated clock,
 * weather, and the town of Solarhaven – landmark buildings and one house per
 * job that visibly builds up as the job progresses.
 */
import * as THREE from 'three';
import { TOWN_SIZE, LANDMARKS, LOTS, ROADS, TREES, lotForJob, houseState, doorOf } from './town.js';

const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0.02, ...extra });
export const PHASE_SKY = { night: 0x0a1030, dawn: 0xf0a070, day: 0x8fd0ff, dusk: 0xf08050 };
export const PHASE_FOG = { night: 0x0a1030, dawn: 0xd0a090, day: 0xc8e8ff, dusk: 0xd09070 };

export function createEngine(canvas, { pixelRatio = Math.min(2, globalThis.devicePixelRatio || 1), shadows = true } = {}) {
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(pixelRatio);
    renderer.shadowMap.enabled = shadows; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(PHASE_SKY.day);
    scene.fog = new THREE.Fog(PHASE_FOG.day, 90, 220);
    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 400);
    camera.position.set(0, 14, 22);
    const hemi = new THREE.HemisphereLight(0xbfdfff, 0x4a6a3a, 0.9); scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xffffff, 2.2); sun.castShadow = shadows; sun.shadow.mapSize.set(2048, 2048); sun.shadow.camera.left = -70; sun.shadow.camera.right = 70; sun.shadow.camera.top = 70; sun.shadow.camera.bottom = -70; sun.shadow.camera.near = 10; sun.shadow.camera.far = 260; sun.shadow.bias = -0.0008; scene.add(sun); scene.add(sun.target);
    const moon = new THREE.DirectionalLight(0x9fb5ff, 0.35); scene.add(moon);
    const ambient = new THREE.AmbientLight(0xffffff, 0.15); scene.add(ambient);
    const updaters = new Set(); let raf = null; let last = null; const clock = { elapsed: 0, dt: 0 };
    const rain = makeRain(); rain.visible = false; scene.add(rain);
    const state = { phase: 'day', hourOfDay: 12, weather: 'none', frames: 0 };

    function resize() { const w = canvas.clientWidth || canvas.parentElement?.clientWidth || window.innerWidth; const h = canvas.clientHeight || canvas.parentElement?.clientHeight || window.innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
    function frame(now) {
        const dt = Math.min(0.1, last === null ? 0.016 : (now - last) / 1000); last = now; clock.dt = dt; clock.elapsed += dt;
        for (const fn of updaters) { try { fn(dt, clock.elapsed); } catch (error) { console.error(error); } }
        if (rain.visible) animateRain(rain, dt);
        renderer.render(scene, camera); state.frames++;
        raf = requestAnimationFrame(frame);
    }
    function setPhase(phase, hourOfDay = 12) {
        state.phase = phase; state.hourOfDay = hourOfDay;
        const sky = new THREE.Color(PHASE_SKY[phase] || PHASE_SKY.day); const fog = new THREE.Color(PHASE_FOG[phase] || PHASE_FOG.day);
        if (state.weather === 'storm') { sky.multiplyScalar(0.55); fog.multiplyScalar(0.6); }
        if (state.weather === 'heatwave') { sky.lerp(new THREE.Color(0xffc080), 0.25); }
        scene.background.copy(sky); scene.fog.color.copy(fog);
        const a = ((hourOfDay - 6) / 12) * Math.PI; // 6h → 0, 18h → π
        const day = hourOfDay >= 5.5 && hourOfDay <= 18.5;
        sun.position.set(Math.cos(a) * 120, Math.max(8, Math.sin(a) * 120), 40); sun.target.position.set(0, 0, 0);
        sun.intensity = day ? (0.6 + Math.max(0, Math.sin(a)) * 1.8) * (state.weather === 'storm' ? 0.4 : 1) : 0;
        sun.color.set(phase === 'dawn' || phase === 'dusk' ? 0xffc890 : 0xffffff);
        moon.position.set(-60, 90, -40); moon.intensity = day ? 0 : 0.35;
        hemi.intensity = day ? 0.9 : 0.25; ambient.intensity = day ? 0.15 : 0.08;
        scene.traverse((o) => { if (o.userData.lamp) o.intensity = day ? 0 : o.userData.lamp; if (o.userData.windowGlow) o.material.emissiveIntensity = day ? 0 : 1; });
        return state;
    }
    function setWeather(kind) { state.weather = kind || 'none'; rain.visible = state.weather === 'storm'; setPhase(state.phase, state.hourOfDay); return state.weather; }
    const raycaster = new THREE.Raycaster(); const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    function groundPoint(ndcX, ndcY) { raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera); const p = new THREE.Vector3(); return raycaster.ray.intersectPlane(groundPlane, p) ? { x: p.x, z: p.z } : null; }
    function pick(ndcX, ndcY, objects) { raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera); const hits = raycaster.intersectObjects(objects, true); return hits.length ? hits[0] : null; }
    function project(v3) { const p = new THREE.Vector3(v3.x, v3.y, v3.z).project(camera); return { x: (p.x + 1) / 2, y: (1 - p.y) / 2, behind: p.z > 1 }; }
    resize();
    return { renderer, scene, camera, sun, hemi, state, clock, resize, setPhase, setWeather, groundPoint, pick, project, onUpdate: (fn) => { updaters.add(fn); return () => updaters.delete(fn); }, start() { if (!raf) raf = requestAnimationFrame(frame); }, stop() { if (raf) cancelAnimationFrame(raf); raf = null; last = null; }, renderOnce() { for (const fn of updaters) fn(0.016, clock.elapsed); renderer.render(scene, camera); state.frames++; }, dispose() { this.stop(); renderer.dispose(); } };
}

function makeRain() {
    const n = 1500; const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { pos[i * 3] = (Math.random() - 0.5) * 160; pos[i * 3 + 1] = Math.random() * 40; pos[i * 3 + 2] = (Math.random() - 0.5) * 160; }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const points = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xaac8ff, size: 0.25, transparent: true, opacity: 0.7 })); points.name = 'rain'; return points;
}
function animateRain(points, dt) { const a = points.geometry.attributes.position; for (let i = 0; i < a.count; i++) { let y = a.getY(i) - 30 * dt; if (y < 0) y = 40; a.setY(i, y); } a.needsUpdate = true; }

/* ---------------- town ---------------- */
function groundTexture() {
    const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
    g.fillStyle = '#4f8f3a'; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 900; i++) { g.fillStyle = `hsl(${100 + Math.random() * 20} ${40 + Math.random() * 25}% ${28 + Math.random() * 18}%)`; g.fillRect(Math.random() * 256, Math.random() * 256, 2 + Math.random() * 3, 2 + Math.random() * 3); }
    const tex = new THREE.CanvasTexture(c); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(40, 40); tex.colorSpace = THREE.SRGBColorSpace; return tex;
}

function box(w, h, d, color, extra) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color, extra)); m.castShadow = true; m.receiveShadow = true; return m; }
function windowsFor(group, w, h, d, { rows = 1, cols = 3, y = 1.6 } = {}) {
    const geo = new THREE.PlaneGeometry(0.9, 1.1);
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const x = -w / 2 + (w / (cols + 1)) * (c + 1); const yy = y + r * 2.4;
        for (const [z, rot] of [[d / 2 + 0.01, 0], [-d / 2 - 0.01, Math.PI]]) { const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x9fd8ff, emissive: 0xffd080, emissiveIntensity: 0, roughness: 0.2 })); m.position.set(x, yy, z); m.rotation.y = rot; m.userData.windowGlow = true; group.add(m); }
    }
}
function roofPyramid(w, d, h, color) { const geo = new THREE.ConeGeometry(Math.max(w, d) * 0.72, h, 4); const m = new THREE.Mesh(geo, mat(color, { roughness: 0.7 })); m.rotation.y = Math.PI / 4; m.scale.set(w / Math.max(w, d), 1, d / Math.max(w, d)); m.castShadow = true; return m; }
function door(w, h, d) { const m = box(1.2, 2.2, 0.15, 0x3b2a1a); m.position.set(0, 1.1, d / 2 + 0.05); return m; }
function sign(text, color = 0xffffff) {
    const c = document.createElement('canvas'); c.width = 256; c.height = 64; const g = c.getContext('2d'); g.fillStyle = '#2b1d10'; g.fillRect(0, 0, 256, 64); g.fillStyle = '#f4e3b2'; g.font = 'bold 28px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 128, 32);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; const m = new THREE.Mesh(new THREE.PlaneGeometry(4, 1), new THREE.MeshBasicMaterial({ map: tex })); return m;
}

export function buildLandmark(l) {
    const g = new THREE.Group(); g.name = `landmark:${l.id}`; g.position.set(l.x, 0, l.z); g.userData = { landmark: l.id, interactable: true, kind: 'landmark' };
    if (l.kind === 'board') { const post = box(0.2, 2.2, 0.2, 0x6b4a2b); post.position.y = 1.1; g.add(post); const b = box(2.4, 1.4, 0.12, 0x8a6a3a); b.position.y = 1.9; g.add(b); const paper = new THREE.Mesh(new THREE.PlaneGeometry(2, 1.1), new THREE.MeshBasicMaterial({ color: 0xf4e3b2 })); paper.position.set(0, 1.9, 0.07); g.add(paper); return g; }
    if (l.kind === 'campfire') { for (let i = 0; i < 6; i++) { const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(0.35), mat(0x777777)); stone.position.set(Math.cos((i / 6) * Math.PI * 2) * 1.2, 0.2, Math.sin((i / 6) * Math.PI * 2) * 1.2); g.add(stone); } for (let i = 0; i < 3; i++) { const log = box(1.4, 0.25, 0.25, 0x5a3a1b); log.position.y = 0.2; log.rotation.y = (i / 3) * Math.PI; g.add(log); } const fire = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.2, 8), new THREE.MeshBasicMaterial({ color: 0xff7a1a })); fire.position.y = 0.8; fire.name = 'flame'; g.add(fire); const light = new THREE.PointLight(0xff8a2a, 2.5, 14); light.position.y = 1.2; light.userData.flicker = true; g.add(light); for (let i = 0; i < 4; i++) { const seat = box(1.6, 0.4, 0.6, 0x7a5a3a); seat.position.set(Math.cos((i / 4) * Math.PI * 2 + 0.4) * 3, 0.2, Math.sin((i / 4) * Math.PI * 2 + 0.4) * 3); seat.rotation.y = -((i / 4) * Math.PI * 2 + 0.4); g.add(seat); } return g; }
    if (l.kind === 'training') { const pad = new THREE.Mesh(new THREE.BoxGeometry(l.w, 0.2, l.d), mat(0xb0a080)); pad.position.y = 0.1; pad.receiveShadow = true; g.add(pad); for (let i = 0; i < 3; i++) { const dummy = box(0.6, 1.6, 0.6, 0xd0b090); dummy.position.set(-3 + i * 3, 1, -2); g.add(dummy); } const flag = box(0.1, 4, 0.1, 0x444444); flag.position.set(4, 2, 3); g.add(flag); const cloth = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1), new THREE.MeshBasicMaterial({ color: 0xe2b14a, side: THREE.DoubleSide })); cloth.position.set(4.85, 3.5, 3); g.add(cloth); return g; }
    const body = box(l.w, l.h, l.d, l.colour); body.position.y = l.h / 2; g.add(body);
    if (l.kind === 'market') { const roof = box(l.w + 1, 0.2, l.d + 1, 0xc0392b); roof.position.y = l.h + 0.1; g.add(roof); for (let i = 0; i < 4; i++) { const stripe = box(1.2, 0.22, l.d + 1.1, 0xffffff); stripe.position.set(-l.w / 2 + 1 + i * 2.6, l.h + 0.1, 0); g.add(stripe); } const counter = box(l.w, 1, 1, 0x8a5a2b); counter.position.set(0, 0.5, l.d / 2 + 0.6); g.add(counter); for (let i = 0; i < 5; i++) { const crate = box(0.8, 0.6, 0.8, [0x3b6fd6, 0x27ae60, 0xeb5757, 0xffd400, 0x9b51e0][i]); crate.position.set(-3 + i * 1.5, 1.3, l.d / 2 + 0.6); g.add(crate); } }
    else if (l.kind === 'office') { const roof = box(l.w + 0.4, 0.4, l.d + 0.4, l.roof); roof.position.y = l.h + 0.2; g.add(roof); windowsFor(g, l.w, l.h, l.d, { rows: 2, cols: 3 }); const antenna = box(0.1, 3, 0.1, 0x999999); antenna.position.set(l.w / 3, l.h + 1.5, 0); g.add(antenna); }
    else if (l.kind === 'library') { const roof = roofPyramid(l.w, l.d, 3, l.roof); roof.position.y = l.h + 1.5; g.add(roof); for (let i = 0; i < 4; i++) { const col = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, l.h, 10), mat(0xe8e0d0)); col.position.set(-l.w / 2 + 1.5 + i * ((l.w - 3) / 3), l.h / 2, l.d / 2 + 0.8); g.add(col); } windowsFor(g, l.w, l.h, l.d, { rows: 1, cols: 4, y: 2.4 }); }
    else if (l.kind === 'guild') { const roof = roofPyramid(l.w, l.d, 4, l.roof); roof.position.y = l.h + 2; g.add(roof); windowsFor(g, l.w, l.h, l.d, { rows: 2, cols: 5 }); const banner = new THREE.Mesh(new THREE.PlaneGeometry(3, 4), new THREE.MeshBasicMaterial({ color: 0xe2b14a, side: THREE.DoubleSide })); banner.position.set(-l.w / 2 - 0.3, l.h / 2 + 1, 0); banner.rotation.y = Math.PI / 2; g.add(banner); const panel = box(3, 0.1, 2, 0x12305a, { metalness: 0.6, roughness: 0.3 }); panel.position.set(2, l.h + 2.2, 2); panel.rotation.x = -0.5; g.add(panel); }
    else if (l.kind === 'depot') { const roof = box(l.w + 0.6, 0.3, l.d + 0.6, l.roof); roof.position.y = l.h + 0.15; g.add(roof); const shutter = box(5, 4, 0.2, 0x7a8a9a); shutter.position.set(0, 2, l.d / 2 + 0.05); g.add(shutter); for (let i = 0; i < 6; i++) { const crate = box(1.2, 1.2, 1.2, 0x8a6a3a); crate.position.set(-l.w / 2 - 1.2, 0.6 + (i % 2) * 1.2, -3 + Math.floor(i / 2) * 2); g.add(crate); } }
    else { const roof = l.kind === 'workshop' ? box(l.w + 0.6, 0.3, l.d + 0.6, l.roof) : roofPyramid(l.w, l.d, 3, l.roof); roof.position.y = l.h + (l.kind === 'workshop' ? 0.15 : 1.5); g.add(roof); windowsFor(g, l.w, l.h, l.d, { rows: 1, cols: 3 }); if (l.kind === 'cafe') { const awning = box(l.w, 0.1, 2.5, 0xeb5757); awning.position.set(0, 3.2, l.d / 2 + 1.2); awning.rotation.x = 0.2; g.add(awning); for (let i = 0; i < 2; i++) { const table = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.1, 12), mat(0xf4e3b2)); table.position.set(-2 + i * 4, 0.8, l.d / 2 + 2.5); g.add(table); } } if (l.kind === 'workshop') { const chimney = box(0.8, 2, 0.8, 0x555555); chimney.position.set(l.w / 3, l.h + 1, 0); g.add(chimney); } }
    const dr = door(l.w, l.h, l.d); dr.name = 'door'; g.add(dr);
    const s = sign(l.name); s.position.set(0, l.h + 0.2 > 3.4 ? 3.4 : l.h + 0.2, l.d / 2 + 0.15); g.add(s);
    const lamp = new THREE.PointLight(0xffd080, 0, 12); lamp.position.set(0, 3, l.d / 2 + 1.5); lamp.userData.lamp = 1.4; g.add(lamp);
    return g;
}

/** A job's house: base, roof, and state-driven extras updated by updateHouse(). */
export function buildHouse(job, lot) {
    const g = new THREE.Group(); g.name = `house:${job.id}`; g.position.set(lot.x, 0, lot.z); g.rotation.y = lot.facing; g.userData = { jobId: job.id, interactable: true, kind: 'house', lot };
    const hue = (job.id.split('').reduce((n, c) => n + c.charCodeAt(0), 0) % 6);
    const walls = [0xf1e6d2, 0xd9c7a8, 0xe8d5c0, 0xc9d6e2, 0xe6e0d0, 0xd8e2c9][hue];
    const base = box(lot.w - 2, 3.2, lot.d - 2, walls); base.position.y = 1.6; g.add(base);
    const roof = roofPyramid(lot.w - 1.5, lot.d - 1.5, 2.6, 0x6b3a2a); roof.position.y = 3.2 + 1.3; roof.name = 'roof'; g.add(roof);
    const dr = door(lot.w - 2, 3.2, lot.d - 2); g.add(dr);
    windowsFor(g, lot.w - 2, 3.2, lot.d - 2, { rows: 1, cols: 2, y: 1.6 });
    const extras = new THREE.Group(); extras.name = 'extras'; g.add(extras);
    const panelGroup = new THREE.Group(); panelGroup.name = 'panels'; g.add(panelGroup);
    const cols = 4; const rows = 2; const pw = (lot.w - 3) / cols; const ph = 1.2;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { const p = box(pw - 0.08, 0.06, ph - 0.08, 0x12305a, { metalness: 0.7, roughness: 0.25, emissive: 0x0a2a6a, emissiveIntensity: 0 }); p.position.set(-((lot.w - 3) / 2) + pw / 2 + c * pw, 3.55 + r * 0.55 + 0.3, (lot.d - 1.5) / 4 - r * ph * 0.9 + 0.5); p.rotation.x = -0.52; p.visible = false; panelGroup.add(p); }
    const inverter = box(0.5, 0.7, 0.25, 0xcccccc, { metalness: 0.4, roughness: 0.4 }); inverter.position.set(-(lot.w - 2) / 2 - 0.15, 1.4, -1); inverter.name = 'inverter'; inverter.visible = false; g.add(inverter);
    const battery = box(0.7, 1.1, 0.3, 0xf5f5f5, { roughness: 0.4 }); battery.position.set(-(lot.w - 2) / 2 - 0.17, 0.55, 0.2); battery.name = 'battery'; battery.visible = false; g.add(battery);
    const glow = new THREE.PointLight(0x3ddc84, 0, 10); glow.position.set(0, 4.5, 0); glow.name = 'glow'; g.add(glow);
    const forSale = new THREE.Group(); forSale.name = 'forSale'; const post = box(0.1, 1.6, 0.1, 0xffffff); post.position.y = 0.8; forSale.add(post); const board = sign('SOLAR?', 0xffffff); board.scale.set(0.5, 0.5, 0.5); board.position.set(0, 1.5, 0); forSale.add(board); forSale.position.set((lot.w - 2) / 2 + 0.8, 0, (lot.d - 2) / 2 + 0.5); g.add(forSale);
    const scaffold = new THREE.Group(); scaffold.name = 'scaffold'; for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 4.2, 6), mat(0xb0b0b0, { metalness: 0.6 })); pole.position.set(x * ((lot.w - 2) / 2 + 0.6), 2.1, z * ((lot.d - 2) / 2 + 0.6)); scaffold.add(pole); } const plank = box(lot.w - 0.6, 0.08, 0.5, 0xc9a66b); plank.position.set(0, 3.0, (lot.d - 2) / 2 + 0.6); scaffold.add(plank); g.add(scaffold);
    const flag = new THREE.Group(); flag.name = 'flag'; const fp = box(0.08, 2.5, 0.08, 0x333333); fp.position.y = 5.6; flag.add(fp); const cloth = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.7), new THREE.MeshBasicMaterial({ color: 0x3ddc84, side: THREE.DoubleSide })); cloth.position.set(0.6, 6.5, 0); flag.add(cloth); g.add(flag);
    const plans = box(1.2, 0.8, 0.8, 0x8a6a3a); plans.name = 'plans'; plans.position.set((lot.w - 2) / 2 + 1.2, 0.4, -1); g.add(plans);
    updateHouse(g, job);
    return g;
}
export function updateHouse(houseGroup, job) {
    const s = houseState(job);
    const get = (n) => houseGroup.getObjectByName(n);
    get('forSale').visible = s.forSale; get('plans').visible = s.plans; get('scaffold').visible = s.scaffold; get('flag').visible = s.complete;
    const panels = get('panels').children; const n = Math.round(s.panelsPct * panels.length);
    panels.forEach((p, i) => { p.visible = i < n; p.material.emissiveIntensity = s.energised ? 0.6 : 0; });
    get('inverter').visible = s.inverter; get('battery').visible = s.battery; get('glow').intensity = s.energised ? 1.6 : 0;
    houseGroup.userData.state = s;
    return s;
}

export function buildTown(scene, { jobs = [] } = {}) {
    const town = new THREE.Group(); town.name = 'town'; scene.add(town);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(TOWN_SIZE * 2, TOWN_SIZE * 2), new THREE.MeshStandardMaterial({ map: groundTexture(), roughness: 1 })); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; ground.name = 'ground'; town.add(ground);
    for (const r of ROADS) { const road = new THREE.Mesh(new THREE.PlaneGeometry(r.w, r.d), mat(0x5a5a60, { roughness: 1 })); road.rotation.x = -Math.PI / 2; road.position.set(r.x, 0.02, r.z); road.receiveShadow = true; town.add(road); }
    const square = new THREE.Mesh(new THREE.CircleGeometry(16, 32), mat(0xb9ad98, { roughness: 1 })); square.rotation.x = -Math.PI / 2; square.position.y = 0.03; square.receiveShadow = true; town.add(square);
    const fountain = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.6, 0.8, 20), mat(0x8fa3b8)); fountain.position.set(0, 0.4, 6); town.add(fountain); const water = new THREE.Mesh(new THREE.CircleGeometry(2, 20), new THREE.MeshStandardMaterial({ color: 0x3aa0ff, roughness: 0.1, metalness: 0.3 })); water.rotation.x = -Math.PI / 2; water.position.set(0, 0.82, 6); town.add(water);
    const landmarks = new Map();
    for (const l of LANDMARKS) { const g = buildLandmark(l); landmarks.set(l.id, g); town.add(g); }
    const trunk = new THREE.CylinderGeometry(0.25, 0.35, 2.2, 7); const leaves = new THREE.ConeGeometry(1.8, 3.6, 8); const tm = mat(0x6b4a2b); const lm = mat(0x2f7a3a); const lm2 = mat(0x3f9a4a);
    for (const t of TREES) { const g = new THREE.Group(); const tr = new THREE.Mesh(trunk, tm); tr.position.y = 1.1; tr.castShadow = true; g.add(tr); const lv = new THREE.Mesh(leaves, Math.random() > 0.5 ? lm : lm2); lv.position.y = 3.6; lv.castShadow = true; g.add(lv); g.position.set(t.x, 0, t.z); g.scale.setScalar(t.s); town.add(g); }
    for (const [x, z] of [[-10, -4], [10, -4], [-10, 10], [10, 10], [-50, -46], [50, -46], [-50, 48], [50, 48]]) { const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 4.5, 6), mat(0x333333)); pole.position.set(x, 2.25, z); town.add(pole); const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), new THREE.MeshStandardMaterial({ color: 0xffe0a0, emissive: 0xffd080, emissiveIntensity: 0 })); head.position.set(x, 4.6, z); head.userData.windowGlow = true; town.add(head); const lamp = new THREE.PointLight(0xffd080, 0, 16); lamp.position.set(x, 4.4, z); lamp.userData.lamp = 1.8; town.add(lamp); }
    const houses = new Map();
    const api = {
        group: town, landmarks, houses,
        setJobs(list) {
            const ids = new Set(list.map((j) => j.id));
            for (const [id, g] of houses) if (!ids.has(id)) { town.remove(g); houses.delete(id); }
            for (const job of list) { const lot = lotForJob(list, job.id); if (!lot) continue; let g = houses.get(job.id); if (!g) { g = buildHouse(job, lot); houses.set(job.id, g); town.add(g); } else { g.position.set(lot.x, 0, lot.z); g.rotation.y = lot.facing; updateHouse(g, job); } }
            return houses.size;
        },
        updateHouse(job) { const g = houses.get(job.id); return g ? updateHouse(g, job) : null; },
        houseDoor(jobId, list) { const lot = lotForJob(list, jobId); return lot ? doorOf({ ...lot, w: lot.w - 2, d: lot.d - 2 }) : null; },
        interactables() { return [...landmarks.values(), ...houses.values()]; },
        flicker(elapsed) { for (const g of landmarks.values()) g.traverse((o) => { if (o.userData.flicker) o.intensity = 2.2 + Math.sin(elapsed * 17) * 0.4 + Math.sin(elapsed * 5) * 0.3; if (o.name === 'flame') o.scale.y = 1 + Math.sin(elapsed * 12) * 0.12; }); }
    };
    api.setJobs(jobs);
    return api;
}

const canvasForTest = () => { const c = document.createElement('canvas'); c.width = 320; c.height = 200; document.body.append(c); return c; };
export const FEATURES = [
    { id: 'game.scene.engine', title: 'WebGL engine renders a frame', dom: true, test: () => { const c = canvasForTest(); const e = createEngine(c, { shadows: false }); e.renderOnce(); const ok = e.state.frames === 1 && e.renderer.getContext() !== null; e.dispose(); c.remove(); return ok; } },
    { id: 'game.scene.dayNight', title: 'Sun, sky, fog and lamps follow the world clock phase', dom: true, test: () => { const c = canvasForTest(); const e = createEngine(c, { shadows: false }); buildTown(e.scene); e.setPhase('day', 12); const dayLamp = e.scene.getObjectByProperty('userData', undefined); const sunDay = e.sun.intensity; e.setPhase('night', 23); const sunNight = e.sun.intensity; let lampOn = false; e.scene.traverse((o) => { if (o.userData.lamp && o.intensity > 0) lampOn = true; }); const sky = e.scene.background.getHex(); e.dispose(); c.remove(); return sunDay > 1 && sunNight === 0 && lampOn && sky === PHASE_SKY.night; } },
    { id: 'game.scene.weather', title: 'Storms rain and darken the sky; heatwaves warm it', dom: true, test: () => { const c = canvasForTest(); const e = createEngine(c, { shadows: false }); e.setPhase('day', 12); const clear = e.scene.background.getHex(); e.setWeather('storm'); const rain = e.scene.getObjectByName('rain').visible; const dark = e.scene.background.getHex() < clear; e.setWeather('none'); const back = !e.scene.getObjectByName('rain').visible; e.dispose(); c.remove(); return rain && dark && back; } },
    { id: 'game.scene.town', title: 'Town builds ground, roads, square, ten landmarks, trees and lamps', dom: true, test: () => { const c = canvasForTest(); const e = createEngine(c, { shadows: false }); const t = buildTown(e.scene); const ok = t.landmarks.size === 10 && t.group.getObjectByName('ground') && t.group.getObjectByName('landmark:library').getObjectByName('door') && t.group.children.length > 60; e.dispose(); c.remove(); return Boolean(ok); } },
    { id: 'game.scene.houses', title: 'One house per job; it builds up with the job stage', dom: true, test: () => { const c = canvasForTest(); const e = createEngine(c, { shadows: false }); const t = buildTown(e.scene); const job = { id: 'J1', stage: 'lead', tasks: { 'lead:a': false, 'install:a': false, 'install:b': false }, batteryKwh: 13 }; t.setJobs([job]); const h = t.houses.get('J1'); const sale = h.getObjectByName('forSale').visible && !h.getObjectByName('scaffold').visible; job.stage = 'install'; job.tasks['install:a'] = true; t.updateHouse(job); const mid = h.getObjectByName('scaffold').visible && h.getObjectByName('panels').children.filter((p) => p.visible).length === 4 && h.getObjectByName('inverter').visible; job.stage = 'claim'; t.updateHouse(job); const lit = h.getObjectByName('glow').intensity > 0 && h.getObjectByName('battery').visible; t.setJobs([]); const gone = t.houses.size === 0; e.dispose(); c.remove(); return sale && mid && lit && gone; } },
    { id: 'game.scene.picking', title: 'Ground and object picking from screen coordinates', dom: true, test: () => { const c = canvasForTest(); const e = createEngine(c, { shadows: false }); const t = buildTown(e.scene); e.camera.position.set(0, 30, 30); e.camera.lookAt(0, 0, 0); e.camera.updateMatrixWorld(); const g = e.groundPoint(0, 0); const hit = e.pick(0, 0, t.interactables().concat([t.group.getObjectByName('ground')])); const p = e.project({ x: 0, y: 0, z: 0 }); e.dispose(); c.remove(); return g && Math.abs(g.x) < 0.5 && Math.abs(g.z) < 0.5 && hit && Math.abs(p.x - 0.5) < 0.01; } }
];
