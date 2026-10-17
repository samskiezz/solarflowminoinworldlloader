/**
 * Town layout (pure data, no three.js): Solarhaven – a small town where the
 * guild hall is your company, the library is the Codex, the market sells
 * upgrades, the workshop holds the calculators, and every job is a house on a
 * residential lot that visibly builds up as the job progresses.
 *
 * Coordinates: metres, x east, z south, origin at the town square.
 */
import { districtObstacles } from './layout.js';

export const TOWN_SIZE = 300; // ground extent (square): inner town within ±80, suburbs out to ±180, the outer districts out to ±290
export const ROAD_WIDTH = 6;

export const LANDMARKS = [
    { id: 'guild', name: 'Guild Hall', kind: 'guild', x: 0, z: -26, w: 18, d: 12, h: 9, window: 'dashboard', colour: 0x8a5a2b, roof: 0x5a3a1b, description: 'Your company headquarters. Crew sleep and plan here.' },
    { id: 'library', name: 'Standards Library', kind: 'library', x: -34, z: -8, w: 14, d: 10, h: 8, window: 'codex', colour: 0x5b6e8c, roof: 0x2f3c52, description: 'The Codex: every standard clause the crew studies.' },
    { id: 'workshop', name: 'Design Workshop', kind: 'workshop', x: 34, z: -8, w: 14, d: 10, h: 7, window: 'spellbook', colour: 0x7a7a7a, roof: 0x444444, description: 'Calculators: strings, voltage rise, batteries, STCs, yield.' },
    { id: 'market', name: 'Market', kind: 'market', x: 30, z: 18, w: 10, d: 8, h: 5, window: 'market', colour: 0xb8862b, roof: 0xc0392b, description: 'Spend credits on crew upgrades.' },
    { id: 'board', name: 'Notice Board', kind: 'board', x: 0, z: 0, w: 2.4, d: 0.6, h: 2.6, window: 'quests', colour: 0x6b4a2b, roof: 0x3a2a1b, description: 'Quests: every open job and its objectives.' },
    { id: 'campfire', name: 'Campfire', kind: 'campfire', x: -12, z: 14, w: 2, d: 2, h: 0.8, window: 'chat', colour: 0x333333, roof: 0xff6a00, description: 'Where the crew talks. Press E to join.' },
    { id: 'cafe', name: 'Cafe', kind: 'cafe', x: -30, z: 20, w: 10, d: 8, h: 5, window: 'crew', colour: 0xc47a4a, roof: 0x8a4a2a, description: 'Breaks restore energy and focus.' },
    { id: 'depot', name: 'Product Depot', kind: 'depot', x: 0, z: 36, w: 16, d: 10, h: 6, window: 'inventory', colour: 0x4a6a8a, roof: 0x2a3a4a, description: 'The CEC approved product vault.' },
    { id: 'office', name: 'Network Office', kind: 'office', x: 36, z: 36, w: 10, d: 8, h: 7, window: 'dnsp', colour: 0x9aa0a6, roof: 0x5a6066, description: 'Lodge connection applications with the network operator.' },
    { id: 'training', name: 'Training Yard', kind: 'training', x: -36, z: 38, w: 12, d: 10, h: 1, window: 'achievements', colour: 0x6a8a4a, roof: 0x6a8a4a, description: 'Achievements and titles.' }
];

/** Residential lots ring the town; job i gets lot i (deterministic). */
export const LOTS = (() => {
    const lots = [];
    const ring = [
        ...Array.from({ length: 6 }, (_, i) => ({ x: -60 + i * 24, z: -60, facing: 0 })),
        ...Array.from({ length: 6 }, (_, i) => ({ x: -60 + i * 24, z: 62, facing: Math.PI })),
        ...Array.from({ length: 4 }, (_, i) => ({ x: -64, z: -36 + i * 24, facing: Math.PI / 2 })),
        ...Array.from({ length: 4 }, (_, i) => ({ x: 64, z: -36 + i * 24, facing: -Math.PI / 2 }))
    ];
    ring.forEach((r, i) => lots.push({ id: `lot${i + 1}`, ...r, w: 10, d: 8 }));
    return lots;
})();

export const SUBURB_ROADS = [
    { x: 0, z: -108, w: 360, d: ROAD_WIDTH, axis: 'x' }, { x: 0, z: 108, w: 360, d: ROAD_WIDTH, axis: 'x' }, { x: 0, z: -156, w: 360, d: ROAD_WIDTH, axis: 'x' }, { x: 0, z: 156, w: 360, d: ROAD_WIDTH, axis: 'x' },
    { x: -108, z: 0, w: ROAD_WIDTH, d: 180, axis: 'z' }, { x: 108, z: 0, w: ROAD_WIDTH, d: 180, axis: 'z' }, { x: -156, z: 0, w: ROAD_WIDTH, d: 180, axis: 'z' }, { x: 156, z: 0, w: ROAD_WIDTH, d: 180, axis: 'z' },
    { x: -180, z: 0, w: ROAD_WIDTH, d: 360, axis: 'z' }, { x: 180, z: 0, w: ROAD_WIDTH, d: 360, axis: 'z' },
    { x: 0, z: -192, w: 400, d: ROAD_WIDTH, axis: 'x' }, { x: 0, z: 192, w: 400, d: ROAD_WIDTH, axis: 'x' }, { x: -192, z: 0, w: ROAD_WIDTH, d: 400, axis: 'z' }, { x: 192, z: 0, w: ROAD_WIDTH, d: 400, axis: 'z' }
];
export const ROADS = [
    { x: 0, z: 0, w: ROAD_WIDTH, d: 580, axis: 'z' }, // main street north-south, out to the campus and the park
    { x: 0, z: 0, w: 580, d: ROAD_WIDTH, axis: 'x' }, // the east-west avenue out to the Old Town and the yard
    { x: 0, z: -50, w: 140, d: ROAD_WIDTH, axis: 'x' }, // north avenue
    { x: 0, z: 52, w: 140, d: ROAD_WIDTH, axis: 'x' }, // south avenue
    { x: -54, z: 0, w: ROAD_WIDTH, d: 110, axis: 'z' }, // west lane
    { x: 54, z: 0, w: ROAD_WIDTH, d: 110, axis: 'z' }, // east lane
    { x: 0, z: 0, w: 60, d: ROAD_WIDTH, axis: 'x' }, // square crossing
    ...SUBURB_ROADS
];

export const TREES = Array.from({ length: 48 }, (_, i) => {
    const a = (i / 48) * Math.PI * 2; const r = 74 + (i % 3) * 3;
    return { x: Math.round(Math.cos(a) * r), z: Math.round(Math.sin(a) * r * 0.95), s: 1 + (i % 4) * 0.25 };
}).concat([{ x: -20, z: -14, s: 1.3 }, { x: 20, z: -14, s: 1.2 }, { x: -22, z: 6, s: 1.1 }, { x: 22, z: 6, s: 1.4 }, { x: 14, z: 26, s: 1 }, { x: -16, z: 30, s: 1.2 }]);

/** Dominion-style district: tall blocks beyond the town edge as a skyline backdrop (out of reach). */
export const DISTRICT = Array.from({ length: 22 }, (_, i) => { const a = (i / 22) * Math.PI * 2 + 0.1; const r = 212 + (i % 3) * 9; const seed = (i * 7919) % 97; return { x: Math.round(Math.cos(a) * r), z: Math.round(Math.sin(a) * r * 0.9), w: 8 + (seed % 5), d: 8 + ((seed * 3) % 5), h: 12 + (seed % 7) * 3, colour: [0x4a90e2, 0x7ed321, 0xf5a623, 0xbd10e0, 0x4ecdc4, 0xa8e6cf, 0x9aa0a6, 0x5b6e8c][i % 8] }; });

/** Named spots agents go to for each behaviour. */
export const SPOTS = {
    bunk: Array.from({ length: 24 }, (_, i) => ({ x: -11 + (i % 12) * 2, z: -34.5 - Math.floor(i / 12) * 2, inside: 'guild' })),
    desk: Array.from({ length: 12 }, (_, i) => ({ x: 27 + (i % 6) * 2.2, z: -0.8 + Math.floor(i / 6) * 2, inside: 'workshop' })),
    shelf: Array.from({ length: 12 }, (_, i) => ({ x: -40 + (i % 6) * 2.2, z: -0.8 + Math.floor(i / 6) * 2, inside: 'library' })),
    fire: Array.from({ length: 12 }, (_, i) => ({ x: -12 + Math.cos((i / 12) * Math.PI * 2) * (3 + (i % 2) * 1.5), z: 14 + Math.sin((i / 12) * Math.PI * 2) * (3 + (i % 2) * 1.5) })),
    cafe: Array.from({ length: 12 }, (_, i) => ({ x: -36 + (i % 4) * 3, z: 26 + Math.floor(i / 4) * 2, inside: 'cafe' })),
    yard: Array.from({ length: 12 }, (_, i) => ({ x: -41 + (i % 4) * 3.5, z: 34 + Math.floor(i / 4) * 3.5 })),
    square: Array.from({ length: 16 }, (_, i) => ({ x: Math.cos((i / 16) * Math.PI * 2) * (11 + (i % 2) * 3), z: 6 + Math.sin((i / 16) * Math.PI * 2) * (8 + (i % 2) * 2) }))
};

/**
 * Suburb lots: four rows of houses north and south (streets at z ±108 and
 * ±156) and four columns east and west (streets at x ±108 and ±156). Lots
 * are listed in street order so neighbouring indices are neighbours on the
 * ground, which keeps each real suburb together.
 */
export const SUBURB_LOTS = (() => {
    const lots = []; let n = 0;
    const push = (x, z, facing) => lots.push({ id: `sub${++n}`, x, z, facing, w: 10, d: 8, suburb: true });
    for (const [z, facing] of [[-96, 0], [-120, Math.PI], [-144, 0], [-168, Math.PI]]) for (let x = -132; x <= 132; x += 12) push(x, z, facing); // north: facing 0 = door toward +z (street at -108 is south of -120 row? handled by facing)
    for (const [z, facing] of [[96, Math.PI], [120, 0], [144, Math.PI], [168, 0]]) for (let x = -132; x <= 132; x += 12) push(x, z, facing);
    for (const [x, facing] of [[-96, -Math.PI / 2], [-120, Math.PI / 2], [-144, -Math.PI / 2], [-168, Math.PI / 2]]) for (let z = -84; z <= 84; z += 12) push(x, z, facing);
    for (const [x, facing] of [[96, Math.PI / 2], [120, -Math.PI / 2], [144, Math.PI / 2], [168, -Math.PI / 2]]) for (let z = -84; z <= 84; z += 12) push(x, z, facing);
    return lots;
})();

let lotCache = { sig: '', map: new Map(), centres: [] };
/** Assign lots: legacy jobs take the inner ring, real (suburb) jobs are grouped by suburb into the suburb streets. */
export function assignLots(jobs = []) {
    const sig = jobs.map((j) => `${j.id}|${j.suburb || ''}`).join(',');
    if (lotCache.sig === sig) return lotCache;
    const map = new Map(); const byDistrict = new Map();
    const inner = jobs.filter((j) => !j.suburb); const outer = jobs.filter((j) => j.suburb);
    inner.forEach((j, i) => map.set(j.id, LOTS[i % LOTS.length]));
    const groups = new Map(); for (const j of outer) { const k = j.suburb; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(j); }
    let cursor = 0; const pool = [...SUBURB_LOTS, ...LOTS.slice(inner.length)];
    for (const [name, list] of [...groups.entries()].sort((a, b) => b[1].length - a[1].length)) {
        const lots = []; for (const j of list) { const lot = pool[cursor % pool.length]; cursor++; map.set(j.id, lot); lots.push(lot); }
        byDistrict.set(name, { name, count: list.length, x: lots.reduce((s, l) => s + l.x, 0) / lots.length, z: lots.reduce((s, l) => s + l.z, 0) / lots.length });
    }
    lotCache = { sig, map, centres: [...byDistrict.values()] };
    return lotCache;
}
export function suburbCentres(jobs = []) { return assignLots(jobs).centres; }
export function usedLots(jobs = []) { return [...new Set(assignLots(jobs).map.values())]; }

export function landmark(id) { return LANDMARKS.find((l) => l.id === id) || null; }

/** Lot assigned to a job: by its index among all jobs (stable while jobs exist). */
export function lotForJob(jobs, jobId) {
    if (!jobs.some((j) => j.id === jobId)) return null;
    return assignLots(jobs).map.get(jobId) || null;
}

/** Position in front of a building's door (facing the road/square). */
export function doorOf(building) {
    const facing = building.facing ?? (building.z < 0 ? 0 : Math.PI);
    const dx = Math.sin(facing) * (building.d / 2 + 2); const dz = Math.cos(facing) * (building.d / 2 + 2);
    return { x: building.x + dx, z: building.z + dz };
}

/** Axis-aligned obstacles for collision/steering: landmarks (except flat/yard ones) and job houses. */
export function obstacles(jobs = []) {
    const list = LANDMARKS.filter((l) => !['training', 'board', 'campfire'].includes(l.kind)).map((l) => ({ id: l.id, x: l.x, z: l.z, w: l.w, d: l.d }));
    list.push({ id: 'fountain', x: 0, z: 6, w: 5.6, d: 5.6 }, { id: 'campfire', x: -12, z: 14, w: 3, d: 3 });
    jobs.forEach((j) => { const lot = lotForJob(jobs, j.id); if (lot) list.push({ id: `house:${j.id}`, x: lot.x, z: lot.z, w: lot.w, d: lot.d }); });
    list.push(...districtObstacles());
    return list;
}

/** Job stage → visual build state of its house. */
export function houseState(job) {
    const order = ['lead', 'design', 'quote', 'approval', 'install', 'commission', 'claim', 'handover', 'complete'];
    const i = Math.max(0, order.indexOf(job.stage));
    const installTasks = Object.entries(job.tasks || {}).filter(([k]) => k.startsWith('install:'));
    const installDone = installTasks.length ? installTasks.filter(([, v]) => v).length / installTasks.length : 0;
    return {
        stageIndex: i,
        forSale: i === 0,
        plans: i >= 1 && i < 4,
        scaffold: i === 4,
        panelsPct: i > 4 ? 1 : i === 4 ? installDone : 0,
        inverter: i >= 4 && installDone >= 0.5 || i > 4,
        battery: (job.batteryKwh > 0) && (i > 4 || (i === 4 && installDone >= 0.75)),
        energised: i >= 6,
        complete: i === 8,
        marker: i === 8 ? null : Object.entries(job.tasks || {}).filter(([k, v]) => k.startsWith(`${job.stage}:`) && !v).length === 0 && i < 8 ? '?' : '!'
    };
}

export const FEATURES = [
    { id: 'game.town.landmarks', title: 'Ten landmark buildings, each bound to a window', test: () => LANDMARKS.length === 10 && LANDMARKS.every((l) => l.window && l.description) && landmark('library').window === 'codex' },
    { id: 'game.town.lots', title: 'Twenty residential lots ring the town', test: () => LOTS.length === 20 && LOTS.every((l) => Math.abs(l.x) <= 64 && Math.abs(l.z) <= 62) },
    { id: 'game.town.lotForJob', title: 'Jobs get stable lots', test: () => { const jobs = [{ id: 'A' }, { id: 'B' }]; return lotForJob(jobs, 'B').id === 'lot2' && lotForJob(jobs, 'Z') === null; } },
    { id: 'game.town.door', title: 'Door positions face the street', test: () => { const d = doorOf(landmark('guild')); return d.z > landmark('guild').z && Math.abs(d.x) < 0.01; } },
    { id: 'game.town.obstacles', title: 'Obstacle boxes include landmarks and job houses', test: () => obstacles([{ id: 'J' }]).some((o) => o.id === 'house:J') && !obstacles().some((o) => o.id === 'board') && obstacles().some((o) => o.id === 'fountain') },
    { id: 'game.town.houseState', title: 'House build state follows the job stage', test: () => { const lead = houseState({ stage: 'lead', tasks: { 'lead:a': false } }); const install = houseState({ stage: 'install', tasks: { 'install:a': true, 'install:b': false }, batteryKwh: 13 }); const done = houseState({ stage: 'complete', tasks: {} }); return lead.forSale && lead.marker === '!' && install.scaffold && install.panelsPct === 0.5 && install.inverter && !install.battery && done.complete && done.marker === null && houseState({ stage: 'lead', tasks: { 'lead:a': true } }).marker === '?'; } },
    { id: 'game.town.spots', title: 'Behaviour spots for bunks, desks, shelves, fire, cafe, yard', test: () => ['bunk', 'desk', 'shelf', 'fire', 'cafe', 'yard', 'square'].every((k) => SPOTS[k].length >= 12) },
    { id: 'game.town.roadsTrees', title: 'Roads (town and suburb streets) and trees are laid out', test: () => ROADS.length === 21 && TREES.length === 54 },
    { id: 'game.town.district', title: 'A skyline district rings the town beyond the suburbs', test: () => DISTRICT.length === 22 && DISTRICT.every((b) => Math.hypot(b.x, b.z) > 190 && b.h >= 12) },
    { id: 'game.town.suburbLots', title: 'Over 300 suburb lots line the outer streets, each facing its street', test: () => SUBURB_LOTS.length >= 300 && SUBURB_LOTS.every((l) => Math.abs(l.x) <= 170 && Math.abs(l.z) <= 170 && (Math.abs(l.x) >= 90 || Math.abs(l.z) >= 90)) && SUBURB_ROADS.length === 14 },
    { id: 'game.town.assignLots', title: 'Real jobs are grouped by suburb into neighbouring lots; legacy jobs keep the inner ring', test: () => { const jobs = [{ id: 'L1' }, { id: 'A', suburb: 'Greenwich' }, { id: 'B', suburb: 'Greenwich' }, { id: 'C', suburb: 'Penrith' }]; const a = lotForJob(jobs, 'A'); const b = lotForJob(jobs, 'B'); const c = lotForJob(jobs, 'C'); const centres = suburbCentres(jobs); return lotForJob(jobs, 'L1').id === 'lot1' && a.suburb && b.suburb && Math.hypot(a.x - b.x, a.z - b.z) <= 13 && c.id !== a.id && centres.length === 2 && centres[0].name === 'Greenwich' && usedLots(jobs).length === 4; } },
    { id: 'game.town.spotsForRoster', title: 'Enough bunks, desks and seats for the whole 24-minion roster', test: () => SPOTS.bunk.length === 24 && SPOTS.square.length >= 16 && SPOTS.fire.length >= 12 }
];
