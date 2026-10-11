/**
 * Town layout (pure data, no three.js): Solarhaven – a small town where the
 * guild hall is your company, the library is the Codex, the market sells
 * upgrades, the workshop holds the calculators, and every job is a house on a
 * residential lot that visibly builds up as the job progresses.
 *
 * Coordinates: metres, x east, z south, origin at the town square.
 */
export const TOWN_SIZE = 160; // ground extent (square)
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

export const ROADS = [
    { x: 0, z: 0, w: ROAD_WIDTH, d: 140, axis: 'z' }, // main street north-south
    { x: 0, z: -50, w: 140, d: ROAD_WIDTH, axis: 'x' }, // north avenue
    { x: 0, z: 52, w: 140, d: ROAD_WIDTH, axis: 'x' }, // south avenue
    { x: -54, z: 0, w: ROAD_WIDTH, d: 110, axis: 'z' }, // west lane
    { x: 54, z: 0, w: ROAD_WIDTH, d: 110, axis: 'z' }, // east lane
    { x: 0, z: 0, w: 60, d: ROAD_WIDTH, axis: 'x' } // square crossing
];

export const TREES = Array.from({ length: 48 }, (_, i) => {
    const a = (i / 48) * Math.PI * 2; const r = 74 + (i % 3) * 3;
    return { x: Math.round(Math.cos(a) * r), z: Math.round(Math.sin(a) * r * 0.95), s: 1 + (i % 4) * 0.25 };
}).concat([{ x: -20, z: -14, s: 1.3 }, { x: 20, z: -14, s: 1.2 }, { x: -22, z: 6, s: 1.1 }, { x: 22, z: 6, s: 1.4 }, { x: 14, z: 26, s: 1 }, { x: -16, z: 30, s: 1.2 }]);

/** Named spots agents go to for each behaviour. */
export const SPOTS = {
    bunk: Array.from({ length: 8 }, (_, i) => ({ x: -7 + i * 2, z: -34.5, inside: 'guild' })),
    desk: Array.from({ length: 6 }, (_, i) => ({ x: 28 + i * 2, z: -0.8, inside: 'workshop' })),
    shelf: Array.from({ length: 6 }, (_, i) => ({ x: -39 + i * 2, z: -0.8, inside: 'library' })),
    fire: Array.from({ length: 8 }, (_, i) => ({ x: -12 + Math.cos((i / 8) * Math.PI * 2) * 3, z: 14 + Math.sin((i / 8) * Math.PI * 2) * 3 })),
    cafe: Array.from({ length: 6 }, (_, i) => ({ x: -34 + (i % 3) * 3, z: 26 + Math.floor(i / 3) * 2, inside: 'cafe' })),
    yard: Array.from({ length: 6 }, (_, i) => ({ x: -40 + (i % 3) * 4, z: 35 + Math.floor(i / 3) * 4 })),
    square: Array.from({ length: 8 }, (_, i) => ({ x: Math.cos((i / 8) * Math.PI * 2) * 7, z: 4 + Math.sin((i / 8) * Math.PI * 2) * 5 }))
};

export function landmark(id) { return LANDMARKS.find((l) => l.id === id) || null; }

/** Lot assigned to a job: by its index among all jobs (stable while jobs exist). */
export function lotForJob(jobs, jobId) {
    const index = jobs.findIndex((j) => j.id === jobId);
    if (index < 0) return null;
    return LOTS[index % LOTS.length];
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
    jobs.forEach((j) => { const lot = lotForJob(jobs, j.id); if (lot) list.push({ id: `house:${j.id}`, x: lot.x, z: lot.z, w: lot.w, d: lot.d }); });
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
    { id: 'game.town.obstacles', title: 'Obstacle boxes include landmarks and job houses', test: () => obstacles([{ id: 'J' }]).some((o) => o.id === 'house:J') && !obstacles().some((o) => o.id === 'board') },
    { id: 'game.town.houseState', title: 'House build state follows the job stage', test: () => { const lead = houseState({ stage: 'lead', tasks: { 'lead:a': false } }); const install = houseState({ stage: 'install', tasks: { 'install:a': true, 'install:b': false }, batteryKwh: 13 }); const done = houseState({ stage: 'complete', tasks: {} }); return lead.forSale && lead.marker === '!' && install.scaffold && install.panelsPct === 0.5 && install.inverter && !install.battery && done.complete && done.marker === null && houseState({ stage: 'lead', tasks: { 'lead:a': true } }).marker === '?'; } },
    { id: 'game.town.spots', title: 'Behaviour spots for bunks, desks, shelves, fire, cafe, yard', test: () => ['bunk', 'desk', 'shelf', 'fire', 'cafe', 'yard', 'square'].every((k) => SPOTS[k].length >= 6) },
    { id: 'game.town.roadsTrees', title: 'Roads and trees are laid out', test: () => ROADS.length === 6 && TREES.length === 54 }
];
