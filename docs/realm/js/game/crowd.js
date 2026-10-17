/**
 * The crowd: the workforce made visible. Hundreds of small instanced workers
 * (hard hat, vest, body) walk between waypoints on the Ultron Campus, the
 * Industrial Yard and the square, their number following the simulation's
 * busy count. Two InstancedMesh draws, whatever the headcount.
 */
import * as THREE from 'three';

export const CROWD_MAX = 600;
export const WAYPOINTS = {
    campus: [[-20, -210], [20, -210], [0, -228], [-26, -240], [26, -240], [0, -262], [-50, -232], [50, -232], [-12, -200], [12, -200], [0, -190], [-40, -205], [40, -205]],
    yard: [[-230, -30], [-230, 30], [-250, 0], [-262, -8], [-220, 10], [-240, -16], [-256, 24]],
    square: [[-10, 10], [10, 10], [0, 20], [-14, 0], [14, 0], [0, -14]],
    park: [[-20, 230], [20, 230], [0, 215], [-30, 250], [30, 250]]
};
const ZONE_SHARE = [['campus', 0.55], ['yard', 0.2], ['square', 0.15], ['park', 0.1]];
const TEAM_COLOURS = [0xff7a00, 0x2f80ed, 0xffd400, 0x27ae60, 0x9b51e0, 0xeb5757, 0x4f8cff, 0xe2b14a];

export function createCrowd(scene, { count = 400, seed = 11 } = {}) {
    count = Math.max(0, Math.min(CROWD_MAX, count));
    let s = seed; const random = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    const body = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.28, 0.5, 3, 8), new THREE.MeshStandardMaterial({ color: 0xffb400, roughness: 0.8 }), CROWD_MAX);
    const head = new THREE.InstancedMesh(new THREE.SphereGeometry(0.26, 10, 8), new THREE.MeshStandardMaterial({ color: 0xf1c27d, roughness: 0.8 }), CROWD_MAX);
    const hat = new THREE.InstancedMesh(new THREE.SphereGeometry(0.29, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 }), CROWD_MAX);
    for (const m of [body, head, hat]) { m.castShadow = true; m.frustumCulled = false; m.name = 'crowd'; scene.add(m); }
    const colour = new THREE.Color();
    const workers = [];
    const zoneOf = (i) => { let acc = 0; const r = (i + 0.5) / Math.max(1, count); for (const [z, share] of ZONE_SHARE) { acc += share; if (r <= acc) return z; } return 'campus'; };
    for (let i = 0; i < CROWD_MAX; i++) {
        const zone = zoneOf(i); const pts = WAYPOINTS[zone]; const a = pts[Math.floor(random() * pts.length)];
        const w = { zone, x: a[0] + (random() - 0.5) * 6, z: a[1] + (random() - 0.5) * 6, tx: 0, tz: 0, speed: 1 + random() * 0.8, phase: random() * Math.PI * 2, wait: 0 };
        pickTarget(w, random); workers.push(w);
        hat.setColorAt(i, colour.setHex(TEAM_COLOURS[i % TEAM_COLOURS.length]));
    }
    hat.instanceColor.needsUpdate = true;
    const m = new THREE.Matrix4(); const q = new THREE.Quaternion(); const up = new THREE.Vector3(0, 1, 0); const pos = new THREE.Vector3(); const scl = new THREE.Vector3(1, 1, 1);
    const api = {
        meshes: [body, head, hat], workers, get count() { return count; },
        setCount(n) { count = Math.max(0, Math.min(CROWD_MAX, Math.round(n))); body.count = count; head.count = count; hat.count = count; },
        update(dt, elapsed) {
            for (let i = 0; i < count; i++) {
                const w = workers[i];
                if (w.wait > 0) { w.wait -= dt; } else {
                    const dx = w.tx - w.x; const dz = w.tz - w.z; const d = Math.hypot(dx, dz);
                    if (d < 0.4) { w.wait = 1 + random() * 4; pickTarget(w, random); } else { w.x += (dx / d) * w.speed * dt; w.z += (dz / d) * w.speed * dt; w.heading = Math.atan2(dx, dz); }
                }
                const bob = w.wait > 0 ? 0 : Math.abs(Math.sin(elapsed * 8 + w.phase)) * 0.05;
                q.setFromAxisAngle(up, w.heading || 0);
                pos.set(w.x, 0.62 + bob, w.z); m.compose(pos, q, scl); body.setMatrixAt(i, m);
                pos.set(w.x, 1.2 + bob, w.z); m.compose(pos, q, scl); head.setMatrixAt(i, m);
                pos.set(w.x, 1.28 + bob, w.z); m.compose(pos, q, scl); hat.setMatrixAt(i, m);
            }
            body.instanceMatrix.needsUpdate = true; head.instanceMatrix.needsUpdate = true; hat.instanceMatrix.needsUpdate = true;
        },
        dispose() { for (const x of [body, head, hat]) { scene.remove(x); x.geometry.dispose(); x.material.dispose(); } }
    };
    api.setCount(count); api.update(0, 0);
    return api;
}
function pickTarget(w, random) { const pts = WAYPOINTS[w.zone]; const p = pts[Math.floor(random() * pts.length)]; w.tx = p[0] + (random() - 0.5) * 8; w.tz = p[1] + (random() - 0.5) * 8; }

export const FEATURES = [
    { id: 'game.crowd.instanced', title: 'The crowd is three instanced draws for up to 600 workers, split over the campus, yard, square and park', dom: true, test: () => { const scene = new THREE.Scene(); const c = createCrowd(scene, { count: 300 }); const zones = new Set(c.workers.slice(0, 300).map((w) => w.zone)); const ok = c.meshes.length === 3 && c.count === 300 && c.meshes[0].count === 300 && zones.has('campus') && zones.has('yard') && zones.size === 4; c.dispose(); return ok; } },
    { id: 'game.crowd.walks', title: 'Workers walk toward waypoints and the headcount follows the simulation', dom: true, test: () => { const scene = new THREE.Scene(); const c = createCrowd(scene, { count: 50 }); const before = c.workers.slice(0, 50).map((w) => [w.x, w.z]); for (let i = 0; i < 60; i++) c.update(1 / 30, i / 30); const moved = c.workers.slice(0, 50).filter((w, i) => Math.hypot(w.x - before[i][0], w.z - before[i][1]) > 0.1).length; c.setCount(120); const ok = moved >= 25 && c.count === 120 && c.meshes[1].count === 120; c.dispose(); return ok; } }
];
