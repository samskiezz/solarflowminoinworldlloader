/** Steering (pure): arrive, obstacle avoidance against axis-aligned boxes, wander. */
export function dist(a, b) { return Math.hypot(a.x - b.x, a.z - b.z); }
export function norm(v) { const l = Math.hypot(v.x, v.z) || 1; return { x: v.x / l, z: v.z / l }; }
export function insideBox(p, box, margin = 0) { return Math.abs(p.x - box.x) < box.w / 2 + margin && Math.abs(p.z - box.z) < box.d / 2 + margin; }

/** Push a point out of any box it penetrates (with margin). Returns the corrected point. */
export function resolveCollisions(p, boxes, margin = 0.6) {
    let out = { x: p.x, z: p.z };
    for (const box of boxes) {
        if (!insideBox(out, box, margin)) continue;
        const dx = out.x - box.x; const dz = out.z - box.z;
        const px = box.w / 2 + margin - Math.abs(dx); const pz = box.d / 2 + margin - Math.abs(dz);
        if (px < pz) out.x = box.x + Math.sign(dx || 1) * (box.w / 2 + margin); else out.z = box.z + Math.sign(dz || 1) * (box.d / 2 + margin);
    }
    return out;
}

/**
 * Move toward target at speed for dt seconds, slowing within `arrive` radius,
 * sliding around boxes. Returns { pos, arrived, moved }.
 */
export function step(pos, target, { speed = 3, dt = 0.016, arrive = 0.6, boxes = [], margin = 0.6, allowInside = null } = {}) {
    const d = dist(pos, target);
    if (d <= arrive) return { pos: { ...pos }, arrived: true, moved: 0 };
    const dir = norm({ x: target.x - pos.x, z: target.z - pos.z });
    const v = Math.min(speed, speed * Math.min(1, d / (arrive * 3)) + 0.4) * dt;
    let next = { x: pos.x + dir.x * v, z: pos.z + dir.z * v };
    const active = boxes.filter((b) => b.id !== allowInside);
    const blocked = active.find((b) => insideBox(next, b, margin));
    if (blocked) {
        // Round the obstacle: head for the expanded corner that makes the shortest detour.
        const m = margin + 0.8; const hw = blocked.w / 2 + m; const hd = blocked.d / 2 + m;
        const corners = [{ x: blocked.x - hw, z: blocked.z - hd }, { x: blocked.x + hw, z: blocked.z - hd }, { x: blocked.x - hw, z: blocked.z + hd }, { x: blocked.x + hw, z: blocked.z + hd }]
            .filter((c) => !active.some((b) => b !== blocked && insideBox(c, b, margin)))
            .sort((a, b) => (dist(pos, a) + dist(a, target)) - (dist(pos, b) + dist(b, target)));
        const corner = corners[0] || { x: pos.x, z: pos.z };
        const cdir = norm({ x: corner.x - pos.x, z: corner.z - pos.z });
        next = { x: pos.x + cdir.x * speed * dt, z: pos.z + cdir.z * speed * dt };
    }
    next = resolveCollisions(next, active, margin);
    return { pos: next, arrived: dist(next, target) <= arrive, moved: dist(pos, next) };
}

export function clampToWorld(p, half) { return { x: Math.max(-half, Math.min(half, p.x)), z: Math.max(-half, Math.min(half, p.z)) }; }

/** Deterministic wander point around a centre. */
export function wanderPoint(centre, radius, random = Math.random) { const a = random() * Math.PI * 2; const r = radius * (0.3 + random() * 0.7); return { x: centre.x + Math.cos(a) * r, z: centre.z + Math.sin(a) * r }; }

export function headingTo(from, to) { return Math.atan2(to.x - from.x, to.z - from.z); }

export const FEATURES = [
    { id: 'game.steer.arrive', title: 'Arrive steering reaches the target and stops', test: () => { let p = { x: 0, z: 0 }; let arrived = false; for (let i = 0; i < 400 && !arrived; i++) ({ pos: p, arrived } = step(p, { x: 10, z: 0 }, { speed: 4, dt: 0.05 })); return arrived && Math.abs(p.x - 10) < 0.7; } },
    { id: 'game.steer.avoid', title: 'Movement slides around boxes instead of entering them', test: () => { const boxes = [{ id: 'b', x: 5, z: 0, w: 4, d: 4 }]; let p = { x: 0, z: 0.2 }; let entered = false; for (let i = 0; i < 600; i++) { const r = step(p, { x: 10, z: 0 }, { speed: 4, dt: 0.05, boxes }); p = r.pos; if (insideBox(p, boxes[0], 0.5)) entered = true; if (r.arrived) break; } return !entered && dist(p, { x: 10, z: 0 }) < 1; } },
    { id: 'game.steer.resolve', title: 'Collision resolution pushes out of boxes', test: () => { const r = resolveCollisions({ x: 0.5, z: 0 }, [{ x: 0, z: 0, w: 4, d: 4 }], 0.5); return Math.abs(r.x) >= 2.5 || Math.abs(r.z) >= 2.5; } },
    { id: 'game.steer.allowInside', title: 'Agents may enter the building they are visiting', test: () => { const boxes = [{ id: 'guild', x: 0, z: 0, w: 10, d: 10 }]; const r = step({ x: -8, z: 0 }, { x: 0, z: 0 }, { speed: 4, dt: 1, boxes, allowInside: 'guild' }); return r.pos.x > -5; } },
    { id: 'game.steer.helpers', title: 'Distance, heading, clamping and wander helpers', test: () => dist({ x: 0, z: 0 }, { x: 3, z: 4 }) === 5 && Math.abs(headingTo({ x: 0, z: 0 }, { x: 1, z: 0 }) - Math.PI / 2) < 1e-9 && clampToWorld({ x: 999, z: -999 }, 80).x === 80 && dist(wanderPoint({ x: 0, z: 0 }, 5, () => 0.5), { x: 0, z: 0 }) <= 5 }
];
