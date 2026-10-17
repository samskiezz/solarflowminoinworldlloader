/**
 * Layout data for the outer districts of Solarhaven – pure data and
 * arithmetic, no renderer – so the steering, the minimap and the Node tests
 * can read it. The builders live in districts.js.
 */
/** Size targets by model name pattern (metres). Tripo models arrive at arbitrary scales, so every placement fits to one of these unless it gives its own. */
export const SIZE_RULES = [
    [/wind_turbine/, { h: 32 }], [/radio_tower|lighthouse/, { h: 24 }], [/clock_tower|skyscraper|apartment_modern/, { h: 22 }], [/silo|water_tower/, { h: 16 }],
    [/hospital|university|courthouse|museum|school|library|town_hall|market_hall|cinema|guild_|supply_depot|observatory|warehouse|command_atrium|ai_core_chamber|operations_war_room|townhouse|home_modern|cottage|greenhouse/, { h: 12 }],
    [/victory_arch|power_grid_substation|agi_core|jarvis_core|fx_hologram|fx_energy_core|hero_statue|fountain$|windmill|watermill/, { h: 8 }],
    [/quantum_computer|mainframe|gpu_pod|server_rack|fx_energy_pylon|fx_plasma|obelisk|transformer|generator|solar_array|scaffolding|conveyor|robot_arm|cnc|concrete_mixer|aip_neural|gotham|audit_ledger|statue_pedestal|solar_streetlight|street_lamp|light-/, { h: 4.5 }],
    [/bus|tram|truck|tractor|car|hovercar|motorcycle|drone|bicycle/, { w: 4.5 }],
    [/tree|orchard/, { h: 7 }], [/pond/, { w: 28 }], [/bench|swing/, { h: 1.3 }], [/lily|flower|rose|lavender|sunflower|bush|hedge|grass/, { h: 1.2 }],
    [/stall|cart|bench|swing|mailbox|signpost|notice_board|workstation|laptop|kanban|peer_review|terminal|desk|network_switch|battery_bank|barrel|crate|timber|tool_rack|workbench|hard_hat|warning_sign|barrier|lantern|banner|planter|rock|boulder|well|stairs|wall|fence|pillar|cone/, { h: 2.2 }]
];
export function sizeFor(key, own = null) { if (own) return own; const r = SIZE_RULES.find(([re]) => re.test(key)); return r ? r[1] : { h: 3 }; }

/** Districts: id, name, bounds (for obstacles/vegetation exclusion) and placements [{key, x, z, rot?, size?, block?, y?}]. */
export const DISTRICTS = [
    { id: 'campus', name: 'Ultron Campus', x: 0, z: -245, w: 190, d: 100, ground: 0x7d8597, placements: [
        { key: 'jarvis/jarvis_core_avatar', x: 0, z: -245, size: { h: 9 }, block: true, alt: 'tripo/agi_core' }, { key: 'tripo/statue_pedestal', x: 0, z: -245, size: { h: 1.2 } },
        ...Array.from({ length: 8 }, (_, i) => ({ key: 'tripo/server_rack', x: Math.round(Math.cos((i / 8) * Math.PI * 2) * 14), z: Math.round(-245 + Math.sin((i / 8) * Math.PI * 2) * 14), rot: -(i / 8) * Math.PI * 2 })),
        { key: 'tripo/agi_core', x: -28, z: -252, block: true }, { key: 'tripo/quantum_computer', x: 28, z: -252, block: true }, { key: 'tripo/foundation_model_gpu_pod', x: -28, z: -232 }, { key: 'tripo/mainframe', x: 28, z: -232 },
        { key: 'tripo/fx_hologram', x: 0, z: -266 }, { key: 'tripo/fx_energy_core', x: 0, z: -224 }, { key: 'jarvis/aip_neural_mesh', x: -14, z: -266, size: { h: 4 } }, { key: 'jarvis/gotham_command_globe', x: 14, z: -266, size: { h: 4 } },
        ...[[-44, -222], [44, -222], [-44, -270], [44, -270]].map(([x, z]) => ({ key: 'tripo/fx_energy_pylon', x, z })),
        ...Array.from({ length: 6 }, (_, i) => ({ key: 'tripo/network_switch_node', x: -30 + i * 12, z: -205 })),
        ...Array.from({ length: 12 }, (_, i) => ({ key: 'tripo/workstation', x: -22 + (i % 6) * 8, z: -212 + Math.floor(i / 6) * 5, rot: Math.PI })),
        { key: 'tripo/guild_computing_hall', x: -66, z: -250, block: true, rot: Math.PI / 2 }, { key: 'tripo/university', x: 66, z: -250, block: true, rot: -Math.PI / 2 },
        { key: 'tripo/library', x: -66, z: -212, block: true, rot: Math.PI / 2 }, { key: 'tripo/observatory', x: 66, z: -212, block: true, rot: -Math.PI / 2 },
        { key: 'jarvis/01_command_atrium', x: 0, z: -284, block: true }, { key: 'jarvis/02_ai_core_chamber', x: -46, z: -284, block: true }, { key: 'jarvis/05_operations_war_room', x: 46, z: -284, block: true },
        { key: 'tripo/radio_tower', x: 86, z: -282, block: true }, { key: 'tripo/guild_patent_office', x: -86, z: -282, block: true },
        { key: 'tripo/citation_graph_display', x: -10, z: -200, size: { h: 3 } }, { key: 'tripo/project_stage_kanban', x: 10, z: -200, size: { h: 3 } }, { key: 'tripo/peer_review_verdict_board', x: 0, z: -200, size: { h: 3 } },
        ...Array.from({ length: 10 }, (_, i) => ({ key: 'tripo/tree_cypress', x: -90 + i * 20, z: -196, size: { h: 7 } })),
        ...Array.from({ length: 8 }, (_, i) => ({ key: 'tripo/solar_streetlight', x: -70 + i * 20, z: -238 }))
    ] },
    { id: 'oldtown', name: 'Old Town', x: 245, z: 0, w: 100, d: 190, ground: 0xb9ad98, placements: [
        { key: 'fantasy/fountain-round-detail', x: 245, z: 0, size: { h: 3.5 } },
        { key: 'tripo/victory_arch', x: 204, z: 0, rot: Math.PI / 2 }, { key: 'tripo/clock_tower', x: 276, z: 0, block: true },
        { key: 'tripo/market_hall', x: 245, z: -44, block: true }, { key: 'tripo/museum', x: 245, z: 44, block: true, rot: Math.PI }, { key: 'tripo/cinema_marquee', x: 245, z: 80, block: true, rot: Math.PI },
        { key: 'fantasy/windmill', x: 278, z: -48, block: true }, { key: 'fantasy/watermill', x: 278, z: 48, block: true },
        ...Array.from({ length: 6 }, (_, i) => ({ key: ['fantasy/stall-red', 'fantasy/stall-green', 'fantasy/stall'][i % 3], x: Math.round(245 + Math.cos((i / 6) * Math.PI * 2) * 11), z: Math.round(Math.sin((i / 6) * Math.PI * 2) * 11), rot: -(i / 6) * Math.PI * 2 + Math.PI / 2, size: { h: 2.6 } })),
        ...Array.from({ length: 12 }, (_, i) => ({ key: 'fantasy/lantern', x: Math.round(245 + Math.cos((i / 12) * Math.PI * 2) * 18), z: Math.round(Math.sin((i / 12) * Math.PI * 2) * 18), size: { h: 2.8 } })),
        ...Array.from({ length: 4 }, (_, i) => ({ key: i % 2 ? 'fantasy/banner-red' : 'fantasy/banner-green', x: 212 + i * 4, z: i % 2 ? 6 : -6, size: { h: 3 } })),
        { key: 'fantasy/cart', x: 230, z: -14, rot: 0.6, size: { h: 1.8 } }, { key: 'fantasy/cart-high', x: 262, z: 16, rot: -0.4, size: { h: 2.2 } },
        ...Array.from({ length: 10 }, (_, i) => ({ key: 'fantasy/hedge-large', x: 206 + i * 8, z: -84, size: { h: 1.4 } })), ...Array.from({ length: 10 }, (_, i) => ({ key: 'fantasy/hedge-large', x: 206 + i * 8, z: 84, size: { h: 1.4 } })),
        { key: 'castle/tower-square-base', x: 220, z: -70, size: { h: 7 }, block: true }, { key: 'castle/tower-square-top', x: 220, z: -70, size: { h: 3 }, y: 7 }, { key: 'castle/flag', x: 220, z: -70, size: { h: 2 }, y: 10 },
        { key: 'castle/tower-square-base', x: 270, z: -70, size: { h: 7 }, block: true }, { key: 'castle/tower-square-top', x: 270, z: -70, size: { h: 3 }, y: 7 },
        { key: 'tripo/cottage_iron', x: 222, z: 32, block: true, rot: Math.PI / 2 }, { key: 'tripo/cottage_iron', x: 222, z: 56, block: true, rot: Math.PI / 2 },
        { key: 'tripo/fountain', x: 262, z: -22, size: { h: 2.4 }, alt: 'fantasy/fountain-round' }, ...Array.from({ length: 6 }, (_, i) => ({ key: 'fantasy/tree-high', x: 206 + i * 14, z: 70, size: { h: 8 } }))
    ] },
    { id: 'yard', name: 'Industrial Yard', x: -245, z: 0, w: 100, d: 190, ground: 0x8a8a84, placements: [
        { key: 'tripo/supply_depot_warehouse', x: -245, z: -46, block: true }, { key: 'tripo/supply_depot_warehouse', x: -245, z: 46, block: true, rot: Math.PI },
        { key: 'tripo/silo', x: -278, z: -22, block: true }, { key: 'tripo/water_tower', x: -278, z: 22, block: true }, { key: 'tripo/power_grid_substation', x: -214, z: -46, block: true },
        ...Array.from({ length: 3 }, (_, i) => ({ key: 'tripo/transformer_unit', x: -214 + i * 6, z: -30 })), ...Array.from({ length: 4 }, (_, i) => ({ key: 'tripo/battery_bank', x: -214 + i * 5, z: -20, size: { h: 2.2 } })),
        ...Array.from({ length: 24 }, (_, i) => ({ key: 'tripo/solar_array', x: -284 + (i % 6) * 8, z: 62 + Math.floor(i / 6) * 8, size: { w: 7 } })),
        ...[[-286, -84], [-286, -56], [-286, 84]].map(([x, z]) => ({ key: 'tripo/wind_turbine', x, z, block: true })),
        { key: 'tripo/generator', x: -230, z: -18 }, { key: 'tripo/scaffolding', x: -225, z: 10 }, { key: 'tripo/concrete_mixer', x: -232, z: 24, size: { h: 2.8 } },
        { key: 'tripo/delivery_truck', x: -212, z: 4, rot: Math.PI / 2 }, { key: 'tripo/delivery_truck', x: -212, z: 18, rot: Math.PI / 2 }, { key: 'tripo/farm_tractor', x: -262, z: 0, rot: 1 },
        { key: 'tripo/oil_barrel_stack', x: -258, z: -10 }, ...Array.from({ length: 3 }, (_, i) => ({ key: 'tripo/wooden_crate_stack', x: -256 + i * 4, z: 14 })), { key: 'tripo/timber_stack', x: -266, z: 20 },
        { key: 'tripo/industrial_robot_arm', x: -240, z: -8 }, { key: 'tripo/assembly_line_conveyor', x: -240, z: 2, rot: Math.PI / 2, size: { w: 10 } }, { key: 'tripo/workbench_vice', x: -252, z: -4 },
        ...Array.from({ length: 4 }, (_, i) => ({ key: 'tripo/warning_sign', x: -200, z: -40 + i * 26 })), ...Array.from({ length: 6 }, (_, i) => ({ key: 'tripo/barrier', x: -205, z: -60 + i * 22, rot: Math.PI / 2 })),
        ...Array.from({ length: 3 }, (_, i) => ({ key: 'tripo/cargo_drone', x: -240 + i * 14, z: -70 + i * 6, y: 7 + i * 2, size: { w: 3 } })), { key: 'tripo/tool_rack', x: -230, z: 34 }, { key: 'tripo/workbench_vice', x: -236, z: 34 }
    ] },
    { id: 'park', name: 'Solar Park', x: 0, z: 245, w: 190, d: 100, ground: 0x6aa14a, placements: [
        { key: 'tripo/pond', x: 0, z: 252, size: { w: 22 }, y: -0.9 }, ...Array.from({ length: 5 }, (_, i) => ({ key: 'tripo/water_lily_patch', x: -8 + i * 4, z: 250 + (i % 2) * 5, size: { w: 2.5 }, y: 0.15 })),
        { key: 'tripo/fountain', x: 0, z: 212 }, { key: 'tripo/hero_statue', x: -34, z: 224 }, { key: 'tripo/playground_swing', x: 34, z: 224, size: { h: 3 } },
        ...Array.from({ length: 6 }, (_, i) => ({ key: 'tripo/tree_cherry_blossom', x: -40 + i * 16, z: 232 })), ...Array.from({ length: 4 }, (_, i) => ({ key: 'tripo/tree_willow', x: -24 + i * 16, z: 272, size: { h: 9 } })),
        ...Array.from({ length: 6 }, (_, i) => ({ key: 'tripo/tree_birch', x: -70 + i * 6, z: 240 + (i % 2) * 10 })), ...Array.from({ length: 4 }, (_, i) => ({ key: 'tripo/tree_maple_autumn', x: 52 + i * 8, z: 246 + (i % 2) * 12 })),
        ...Array.from({ length: 8 }, (_, i) => ({ key: i % 2 ? 'tripo/park_bench' : 'tripo/iron_park_bench', x: Math.round(Math.cos((i / 8) * Math.PI * 2) * 22), z: Math.round(252 + Math.sin((i / 8) * Math.PI * 2) * 22), rot: -(i / 8) * Math.PI * 2 - Math.PI / 2, size: { h: 1.2 } })),
        ...Array.from({ length: 8 }, (_, i) => ({ key: ['tripo/flower_mixed_bed', 'tripo/rose_bush', 'tripo/lavender_patch', 'tripo/sunflower_patch'][i % 4], x: -60 + i * 17, z: 206 })),
        ...Array.from({ length: 8 }, (_, i) => ({ key: 'tripo/solar_streetlight', x: Math.round(Math.cos((i / 8) * Math.PI * 2) * 36), z: Math.round(252 + Math.sin((i / 8) * Math.PI * 2) * 36) })),
        { key: 'tripo/lighthouse', x: 44, z: 278, block: true }, { key: 'tripo/greenhouse', x: -48, z: 276, block: true },
        ...Array.from({ length: 8 }, (_, i) => ({ key: 'tripo/orchard_tree', x: -82 + (i % 4) * 8, z: 262 + Math.floor(i / 4) * 10, size: { h: 5 } })), { key: 'tripo/mailbox', x: -4, z: 200, size: { h: 1.4 } }
    ] },
    { id: 'civic', name: 'Civic corners', x: 0, z: 0, w: 0, d: 0, placements: [
        { key: 'tripo/hospital', x: 240, z: -240, block: true }, { key: 'tripo/apartment_modern', x: 270, z: -215, block: true }, { key: 'tripo/apartment_modern', x: 215, z: -270, block: true },
        { key: 'tripo/courthouse', x: -240, z: -240, block: true }, { key: 'tripo/school', x: -270, z: -215, block: true }, { key: 'tripo/town_hall', x: -215, z: -270, block: true },
        { key: 'tripo/home_modern', x: 240, z: 240, block: true }, { key: 'tripo/townhouse_industrial', x: 270, z: 215, block: true }, { key: 'tripo/home_modern', x: 215, z: 270, block: true, rot: Math.PI },
        { key: 'tripo/guild_energy_plant', x: -240, z: 240, block: true }, { key: 'tripo/guild_safety_station', x: -270, z: 215, block: true }, { key: 'tripo/guild_electrical_workshop', x: -215, z: 270, block: true },
        ...[[-240, 262], [-262, 240]].map(([x, z]) => ({ key: 'tripo/guild_banner_safety', x, z })), { key: 'tripo/guild_banner_energy', x: -218, z: 240 }, { key: 'tripo/guild_banner_electrical', x: -240, z: 218 },
        ...[[0, -196], [0, 196], [196, 0], [-196, 0]].map(([x, z], i) => ({ key: 'roads/sign-highway', x: x + (x ? 0 : 5), z: z + (z ? 0 : 5), rot: i < 2 ? 0 : Math.PI / 2, size: { h: 5 } })),
        { key: 'tripo/city_bus', x: 8, z: -176, rot: Math.PI }, { key: 'tripo/tram_car', x: -8, z: 182 }, { key: 'tripo/electric_car', x: 190, z: 8, rot: Math.PI / 2 }, { key: 'tripo/car_modern', x: -190, z: -8, rot: Math.PI / 2 }, { key: 'tripo/motorcycle', x: 70, z: -56, rot: 0.3, size: { w: 2 } }, { key: 'tripo/bicycle', x: -70, z: 58, size: { w: 1.6 } }, { key: 'tripo/hovercar', x: 0, z: -188, y: 3, size: { w: 4 } }
    ] }
];

/** Streetlights along the main roads from the city road kit. */
export const STREETLIGHTS = (() => {
    const out = [];
    for (let z = -180; z <= 180; z += 24) { if (Math.abs(z) < 12) continue; out.push({ key: 'roads/light-curved', x: 4.2, z, rot: Math.PI }, { key: 'roads/light-curved', x: -4.2, z, rot: 0 }); }
    for (const zz of [-50, 52]) for (let x = -66; x <= 66; x += 22) { if (Math.abs(x) < 6) continue; out.push({ key: 'roads/light-square', x, z: zz + (zz < 0 ? -4.2 : 4.2), rot: zz < 0 ? Math.PI / 2 : -Math.PI / 2 }); }
    return out;
})();

/** Obstacle boxes for every blocking placement, for the steering and the player. */
export function districtObstacles() {
    const list = [];
    for (const d of DISTRICTS) for (const p of d.placements) if (p.block) { const s = sizeFor(p.key, p.size); const w = s.w || s.h || 8; list.push({ id: `district:${p.key}:${p.x},${p.z}`, x: p.x, z: p.z, w: Math.min(w, 24), d: Math.min(w, 24) }); }
    return list;
}


export const FEATURES = [
    { id: 'game.layout.districts', title: 'Five outer districts – Ultron Campus, Old Town, Industrial Yard, Solar Park and the civic corners – with hundreds of placements and streetlights', test: () => DISTRICTS.length === 5 && DISTRICTS.reduce((n, d) => n + d.placements.length, 0) >= 200 && STREETLIGHTS.length >= 30 && DISTRICTS.every((d) => d.placements.every((p) => /^(tripo|jarvis|fantasy|castle|roads|nature)\//.test(p.key) && Number.isFinite(p.x) && Number.isFinite(p.z))) },
    { id: 'game.layout.sizes', title: 'Size targets come from the model name, so Tripo models land at sensible metres', test: () => sizeFor('tripo/wind_turbine').h === 32 && sizeFor('tripo/park_bench').h === 1.3 && sizeFor('tripo/city_bus').w === 4.5 && sizeFor('x/unknown').h === 3 && sizeFor('tripo/hospital', { h: 1 }).h === 1 },
    { id: 'game.layout.obstacles', title: 'Blocking placements become obstacle boxes for steering', test: () => { const o = districtObstacles(); return o.length >= 40 && o.every((b) => b.w > 0 && b.w <= 24) && o.some((b) => /jarvis_core_avatar/.test(b.id)); } }
];
