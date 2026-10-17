/**
 * The outer districts of Solarhaven, laid out from the model kits: the Ultron
 * Campus (north), the Old Town (east), the Industrial Yard and solar farm
 * (west), the Park and lake (south), the civic corners, streetlights along
 * the main roads and instanced vegetation across the whole map. Everything is
 * declarative – a placement names a model, a position, a size target – so a
 * missing model simply leaves a gap instead of breaking the town.
 */
import * as THREE from 'three';
import { has, instance, fitTo } from './assets.js';
import { DISTRICTS, STREETLIGHTS, sizeFor, districtObstacles } from './layout.js';
import { SUBURB_LOTS } from './town.js';
export { DISTRICTS, STREETLIGHTS, sizeFor, districtObstacles };

function place(parent, p, { tune = null } = {}) {
    let key = p.key; if (!has(key) && p.alt && has(p.alt)) key = p.alt; if (!has(key)) return null;
    const m = instance(key); fitTo(m, sizeFor(key, p.size)); m.position.set(p.x, p.y || 0, p.z); if (p.rot) m.rotation.y = p.rot; m.name = `district:${key}`; if (tune) tune(m); parent.add(m); return m;
}

/** Build every district into `parent`. Returns counts. */
export function buildDistricts(parent, { tune = null } = {}) {
    let placed = 0; let missing = 0;
    for (const d of DISTRICTS) {
        if (d.w && d.d && d.ground) { const g = new THREE.Mesh(new THREE.PlaneGeometry(d.w, d.d), new THREE.MeshStandardMaterial({ color: d.ground, roughness: 1 })); g.rotation.x = -Math.PI / 2; g.position.set(d.x, 0.015, d.z); g.receiveShadow = true; g.name = `district-ground:${d.id}`; parent.add(g); }
        for (const p of d.placements) { if (place(parent, p, { tune })) placed++; else missing++; }
    }
    for (const p of STREETLIGHTS) { if (place(parent, p, { tune })) placed++; else missing++; }
    return { placed, missing };
}

/** Instanced vegetation across the map, avoiding roads, lots and district blocks. */
export function buildVegetation(parent, { count = 700, seed = 7, avoid = [], roads = [], size = 300 } = {}) {
    const keys = ['nature/tree_oak', 'nature/tree_detailed', 'nature/tree_default', 'nature/tree_pineTallA', 'nature/tree_pineRoundA', 'nature/plant_bush', 'nature/plant_bushLarge', 'nature/grass_large', 'nature/flower_yellowA', 'nature/flower_purpleA', 'nature/rock_smallA'].filter((k) => has(k));
    if (!keys.length) return 0;
    let s = seed; const random = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    const blocked = (x, z) => { if (Math.hypot(x, z) < 20) return true; for (const r of roads) if (Math.abs(x - r.x) <= r.w / 2 + 2 && Math.abs(z - r.z) <= r.d / 2 + 2) return true; for (const b of avoid) if (Math.abs(x - b.x) <= b.w / 2 + 1.5 && Math.abs(z - b.z) <= b.d / 2 + 1.5) return true; return false; };
    const perKey = new Map();
    for (let i = 0; i < count * 3 && [...perKey.values()].reduce((n, l) => n + l.length, 0) < count; i++) {
        const x = (random() * 2 - 1) * (size - 8); const z = (random() * 2 - 1) * (size - 8); if (blocked(x, z)) continue;
        const key = keys[Math.floor(random() * keys.length)]; if (!perKey.has(key)) perKey.set(key, []);
        perKey.get(key).push({ x, z, rot: random() * Math.PI * 2, scale: 0.8 + random() * 0.6 });
    }
    let total = 0;
    for (const [key, list] of perKey) {
        const proto = instance(key, { shadows: true }); const target = /tree/.test(key) ? { h: 6 } : /bush/.test(key) ? { h: 1.6 } : { h: 0.7 }; const fit = fitTo(proto, target); const base = fit.scale || 1; proto.updateMatrixWorld(true);
        proto.traverse((mesh) => {
            if (!mesh.isMesh) return;
            const inst = new THREE.InstancedMesh(mesh.geometry, mesh.material, list.length); inst.castShadow = /tree/.test(key); inst.receiveShadow = true; inst.name = `veg:${key}`;
            const local = mesh.matrixWorld.clone(); const m = new THREE.Matrix4(); const t = new THREE.Matrix4();
            list.forEach((p, i) => { t.compose(new THREE.Vector3(p.x, 0, p.z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), p.rot), new THREE.Vector3(p.scale, p.scale, p.scale)); m.multiplyMatrices(t, local); inst.setMatrixAt(i, m); });
            inst.instanceMatrix.needsUpdate = true; parent.add(inst); total += list.length;
        });
        void base;
    }
    return total;
}

/** Instance one model many times (one InstancedMesh per mesh of the model). `list` is [{x, z, rot, scale}]. Returns the meshes. */
export function instanceMany(parent, key, list, target, { shadows = true, name = key } = {}) {
    if (!has(key) || !list.length) return [];
    const proto = instance(key, { shadows }); fitTo(proto, target); proto.updateMatrixWorld(true); const meshes = [];
    const m = new THREE.Matrix4(); const t = new THREE.Matrix4(); const pos = new THREE.Vector3(); const q = new THREE.Quaternion(); const up = new THREE.Vector3(0, 1, 0); const scl = new THREE.Vector3();
    proto.traverse((mesh) => {
        if (!mesh.isMesh) return;
        const inst = new THREE.InstancedMesh(mesh.geometry, mesh.material, list.length); inst.castShadow = shadows; inst.receiveShadow = true; inst.name = `many:${name}`; inst.userData.list = list;
        const local = mesh.matrixWorld.clone();
        list.forEach((p, i) => { pos.set(p.x, p.y || 0, p.z); q.setFromAxisAngle(up, p.rot || 0); const s = p.scale || 1; scl.set(s, s, s); t.compose(pos, q, scl); m.multiplyMatrices(t, local); inst.setMatrixAt(i, m); });
        inst.instanceMatrix.needsUpdate = true; parent.add(inst); meshes.push({ inst, local });
    });
    return meshes;
}

const HOUSE_KEYS = Array.from({ length: 21 }, (_, i) => `suburban/building-type-${String.fromCharCode(97 + i)}`);
const CAR_KEYS = ['cars/sedan', 'cars/suv', 'cars/taxi', 'cars/hatchback-sports', 'cars/van', 'cars/delivery'];
/**
 * The neighbourhood: a house on every suburb lot that no job is using yet,
 * fences along the street and a car on every third driveway – all instanced,
 * so three hundred houses cost a couple of dozen draws. `refresh(usedLots)`
 * hides the houses on lots a job has since taken.
 */
export function buildNeighbourhood(parent, { lots = SUBURB_LOTS, seed = 5 } = {}) {
    let s = seed; const random = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    const keys = HOUSE_KEYS.filter((k) => has(k)); const cars = CAR_KEYS.filter((k) => has(k)); const fence = ['suburban/fence-1x4', 'suburban/fence-1x3', 'suburban/fence'].find((k) => has(k));
    if (!keys.length) return { houses: 0, refresh() {} };
    const byKey = new Map(); const carList = new Map(); const fences = [];
    lots.forEach((lot, i) => {
        const key = keys[Math.floor(random() * keys.length)]; if (!byKey.has(key)) byKey.set(key, []);
        byKey.get(key).push({ lot, x: lot.x, z: lot.z, rot: lot.facing, scale: 0.95 + random() * 0.15 });
        const fx = lot.x + Math.sin(lot.facing) * 5.5; const fz = lot.z + Math.cos(lot.facing) * 5.5; // towards the street
        if (fence) fences.push({ lot, x: fx - Math.cos(lot.facing) * 2.5, z: fz + Math.sin(lot.facing) * 2.5, rot: lot.facing + Math.PI / 2 });
        if (i % 3 === 0 && cars.length) { const ck = cars[Math.floor(random() * cars.length)]; if (!carList.has(ck)) carList.set(ck, []); carList.get(ck).push({ lot, x: fx + Math.cos(lot.facing) * 3.2, z: fz - Math.sin(lot.facing) * 3.2, rot: lot.facing + (random() > 0.5 ? 0 : Math.PI) }); }
    });
    const groups = [];
    for (const [key, list] of byKey) groups.push(...instanceMany(parent, key, list, { w: 7.5 }, { name: 'house' }));
    for (const [key, list] of carList) groups.push(...instanceMany(parent, key, list, { w: 2.1 }, { name: 'car', shadows: false }));
    if (fence) groups.push(...instanceMany(parent, fence, fences, { w: 3.8 }, { name: 'fence', shadows: false }));
    const m = new THREE.Matrix4(); const t = new THREE.Matrix4(); const pos = new THREE.Vector3(); const q = new THREE.Quaternion(); const up = new THREE.Vector3(0, 1, 0); const scl = new THREE.Vector3();
    const api = {
        houses: lots.length, groups,
        /** Hide every instance that sits on a lot in `usedLots` (a Set of lot ids), show the rest. */
        refresh(usedLots = new Set()) {
            for (const { inst, local } of groups) {
                inst.userData.list.forEach((p, i) => { const used = usedLots.has(p.lot.id); const sc = used ? 0.0001 : (p.scale || 1); pos.set(p.x, p.y || 0, p.z); q.setFromAxisAngle(up, p.rot || 0); scl.set(sc, sc, sc); t.compose(pos, q, scl); m.multiplyMatrices(t, local); inst.setMatrixAt(i, m); });
                inst.instanceMatrix.needsUpdate = true;
            }
        }
    };
    return api;
}

export const FEATURES = [
    { id: 'game.neighbourhood.instanced', title: 'Every suburb lot gets an instanced background house (fences, parked cars) and a job taking the lot hides it', dom: true, test: () => { const g = new THREE.Group(); const n = buildNeighbourhood(g, { lots: SUBURB_LOTS.slice(0, 30) }); if (!n.groups.length) return 'suburban kit not loaded here'; const draws = g.children.length; n.refresh(new Set([SUBURB_LOTS[0].id])); const mm = new THREE.Matrix4(); const grp = n.groups.find((x) => x.inst.userData.list.some((p) => p.lot.id === SUBURB_LOTS[0].id)); grp.inst.getMatrixAt(grp.inst.userData.list.findIndex((p) => p.lot.id === SUBURB_LOTS[0].id), mm); const sc = new THREE.Vector3().setFromMatrixScale(mm); return n.houses === 30 && draws < 60 && sc.x < 0.01; } },
    { id: 'game.districts.build', title: 'Districts build with whatever models are loaded and report what is missing', dom: true, test: () => { const g = new THREE.Group(); const r = buildDistricts(g); return r.placed + r.missing === DISTRICTS.reduce((n, d) => n + d.placements.length, 0) + STREETLIGHTS.length && g.children.length >= 4; } }
];
