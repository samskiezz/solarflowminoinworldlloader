/** Interaction: proximity prompts, quest markers over houses, landmark labels, and what E does. */
import { LANDMARKS, landmark, lotForJob, doorOf, houseState } from './town.js';
import { dist } from './steer.js';
import { marker, nameplate, prompt } from './overlay.js';
import { STAGES } from '../domain/jobs.js';

export function createInteractions(engine, overlay, { ctx, town, player, npcs }) {
    let current = null;
    for (const l of LANDMARKS) overlay.add(`lm:${l.id}`, { el: nameplate({ name: l.name, sub: l.description, colour: '#9fd8ff' }), anchor: { x: l.x, y: 0, z: l.z }, offsetY: l.h + 2.2, maxDistance: 48, cls: 'landmark' });
    const api = {
        get current() { return current; },
        refreshMarkers() {
            const jobs = ctx.jobs(); const seen = new Set();
            for (const job of jobs) {
                const lot = lotForJob(jobs, job.id); if (!lot) continue; const s = houseState(job); const id = `mk:${job.id}`; seen.add(id);
                if (!s.marker) { overlay.remove(id); continue; }
                const existing = overlay.get(id);
                if (!existing || existing.textContent !== s.marker) overlay.add(id, { el: marker(s.marker), anchor: { x: lot.x, y: 0, z: lot.z }, offsetY: 8.2, maxDistance: 140 });
                overlay.add(`hn:${job.id}`, { el: nameplate({ name: `${job.customer}'s house`, sub: `${STAGES.find((x) => x.id === job.stage)?.title || job.stage} · ${job.systemKw} kW`, colour: '#ffd166' }), anchor: { x: lot.x, y: 0, z: lot.z }, offsetY: 6.6, maxDistance: 40 });
            }
            for (const key of [...overlay.layer.querySelectorAll('.ov-marker')].map((el) => [...overlay.layer.children].indexOf(el))) void key;
            return seen.size;
        },
        /** Find what the player could interact with right now. */
        find() {
            const pos = player.pos;
            const near = npcs.nearest(pos, 2.8);
            if (near) return { kind: 'npc', agent: near.agent, npc: near.npc, label: `Talk to ${near.agent.name}${near.agent.meta && near.agent.meta.hired === false ? ' (not on the crew yet)' : ''}`, dist: near.dist };
            const jobs = ctx.jobs(); let best = null;
            for (const job of jobs) { const lot = lotForJob(jobs, job.id); if (!lot) continue; const door = doorOf({ ...lot, w: lot.w - 2, d: lot.d - 2 }); const d = Math.min(dist(pos, door), dist(pos, lot) - 4); if (d < 3.2 && (!best || d < best.dist)) best = { kind: 'house', job, label: `Visit ${job.customer}'s job (${STAGES.find((x) => x.id === job.stage)?.title})`, dist: d }; }
            for (const l of LANDMARKS) { const door = ['board', 'campfire', 'training'].includes(l.kind) ? { x: l.x, z: l.z } : doorOf(l); const d = Math.min(dist(pos, door), dist(pos, l) - Math.max(l.w, l.d) / 2); if (d < 3.4 && (!best || d < best.dist)) best = { kind: 'landmark', landmark: l, label: { board: 'Read the notice board', campfire: 'Sit at the campfire', training: 'Enter the training yard' }[l.kind] || `Enter the ${l.name}`, dist: d }; }
            return best;
        },
        update() {
            const next = api.find();
            const key = next ? `${next.kind}:${next.agent?.id || next.job?.id || next.landmark?.id}` : null;
            const prev = current ? `${current.kind}:${current.agent?.id || current.job?.id || current.landmark?.id}` : null;
            if (key !== prev) { overlay.remove('prompt'); if (next) overlay.add('prompt', { el: prompt(next.label, ctx.keys.keyFor('game.interact') || 'E'), anchor: () => ({ x: player.pos.x, y: 0, z: player.pos.z }), offsetY: 2.9, maxDistance: 999, cls: 'prompt' }); }
            current = next;
            return current;
        },
        interact(target = current) {
            if (!target) return null;
            if (target.kind === 'npc') { ctx.store.set('ui.chatAgent', target.agent.id); ctx.store.set('ui.selectedAgent', target.agent.id); target.agent.remember(`${ctx.profile().name} came over to talk`, { tags: ['social', 'conversation'], importance: 3 }); target.agent.needs.social = Math.min(100, target.agent.needs.social + 4); ctx.open('chat', { tab: 'talk' }); ctx.bus.emit('game:interact', { kind: 'npc', id: target.agent.id }); return 'chat'; }
            if (target.kind === 'house') { ctx.setCurrentJob(target.job.id); ctx.open('jobs', { tab: 'detail' }); ctx.bus.emit('game:interact', { kind: 'house', id: target.job.id }); return 'jobs'; }
            const l = target.landmark; const tab = l.kind === 'campfire' ? 'channel' : undefined;
            ctx.open(l.window, tab ? { tab } : {}); ctx.bus.emit('game:interact', { kind: 'landmark', id: l.id }); return l.window;
        },
        dispose() { overlay.remove('prompt'); for (const l of LANDMARKS) overlay.remove(`lm:${l.id}`); for (const j of ctx.jobs()) { overlay.remove(`mk:${j.id}`); overlay.remove(`hn:${j.id}`); } }
    };
    api.refreshMarkers();
    return api;
}

export const FEATURES = [
    { id: 'game.interact.markers', title: 'WoW-style ! and ? markers float over job houses', dom: true, test: async () => { const { makeTestCtx } = await import('../windows/_testing.js'); const { createEngine, buildTown } = await import('./scene.js'); const { createOverlay } = await import('./overlay.js'); const { createPlayer } = await import('./player.js'); const { createNpcs } = await import('./npcs.js'); const t = makeTestCtx(); const c = document.createElement('canvas'); document.body.append(c); const e = createEngine(c, { shadows: false }); const town = buildTown(e.scene, { jobs: t.ctx.jobs() }); const ov = createOverlay(t.root, e); const p = createPlayer(e, { listen: false }); const n = createNpcs(e, ov, { ctx: t.ctx, town }); const it = createInteractions(e, ov, { ctx: t.ctx, town, player: p, npcs: n }); const bang = ov.get(`mk:${t.job.id}`).textContent === '!'; for (const k of Object.keys(t.job.tasks)) if (k.startsWith('lead:')) t.job.tasks[k] = true; it.refreshMarkers(); const q = ov.get(`mk:${t.job.id}`).textContent === '?'; it.dispose(); n.dispose(); p.dispose(); e.dispose(); c.remove(); t.done(); return bang && q; } },
    { id: 'game.interact.house', title: 'Standing at a house and pressing E opens that job', dom: true, test: async () => { const { makeTestCtx } = await import('../windows/_testing.js'); const { createEngine, buildTown } = await import('./scene.js'); const { createOverlay } = await import('./overlay.js'); const { createPlayer } = await import('./player.js'); const { createNpcs } = await import('./npcs.js'); const t = makeTestCtx(); t.ctx.wm.register({ id: 'jobs', title: 'j', render: () => {}, tabs: [{ id: 'detail', label: 'd' }] }); const c = document.createElement('canvas'); document.body.append(c); const e = createEngine(c, { shadows: false }); const town = buildTown(e.scene, { jobs: t.ctx.jobs() }); const ov = createOverlay(t.root, e); const p = createPlayer(e, { listen: false }); const n = createNpcs(e, ov, { ctx: t.ctx, town }); for (const x of n.npcs.values()) x.pos = { x: 70, z: 70 }; const it = createInteractions(e, ov, { ctx: t.ctx, town, player: p, npcs: n }); const door = town.houseDoor(t.job.id, t.ctx.jobs()); p.setPosition(door); const cur = it.update(); const ok = cur && cur.kind === 'house' && ov.get('prompt') && it.interact() === 'jobs' && t.ctx.wm.isOpen('jobs'); it.dispose(); n.dispose(); p.dispose(); e.dispose(); c.remove(); t.done(); return Boolean(ok); } },
    { id: 'game.interact.npc', title: 'Talking to a crew member opens chat and they remember it', dom: true, test: async () => { const { makeTestCtx } = await import('../windows/_testing.js'); const { createEngine, buildTown } = await import('./scene.js'); const { createOverlay } = await import('./overlay.js'); const { createPlayer } = await import('./player.js'); const { createNpcs } = await import('./npcs.js'); const t = makeTestCtx(); t.ctx.wm.register({ id: 'chat', title: 'c', render: () => {}, tabs: [{ id: 'talk', label: 't' }] }); const c = document.createElement('canvas'); document.body.append(c); const e = createEngine(c, { shadows: false }); const town = buildTown(e.scene, { jobs: t.ctx.jobs() }); const ov = createOverlay(t.root, e); const p = createPlayer(e, { listen: false }); const n = createNpcs(e, ov, { ctx: t.ctx, town }); const it = createInteractions(e, ov, { ctx: t.ctx, town, player: p, npcs: n }); const nova = n.npcs.get('NOVA'); p.setPosition({ x: nova.pos.x + 1, z: nova.pos.z }); const cur = it.update(); const ok = cur.kind === 'npc' && it.interact() === 'chat' && t.ctx.store.get('ui.chatAgent') === 'NOVA' && t.ctx.world.agent('NOVA').memory.records.some((m) => /came over to talk/.test(m.text)); it.dispose(); n.dispose(); p.dispose(); e.dispose(); c.remove(); t.done(); return ok; } },
    { id: 'game.interact.landmark', title: 'Entering a landmark opens its window (library → Codex)', dom: true, test: async () => { const { makeTestCtx } = await import('../windows/_testing.js'); const { createEngine, buildTown } = await import('./scene.js'); const { createOverlay } = await import('./overlay.js'); const { createPlayer } = await import('./player.js'); const { createNpcs } = await import('./npcs.js'); const t = makeTestCtx(); t.ctx.wm.register({ id: 'codex', title: 'c', render: () => {} }); const c = document.createElement('canvas'); document.body.append(c); const e = createEngine(c, { shadows: false }); const town = buildTown(e.scene, { jobs: t.ctx.jobs() }); const ov = createOverlay(t.root, e); const p = createPlayer(e, { listen: false }); const n = createNpcs(e, ov, { ctx: t.ctx, town }); for (const x of n.npcs.values()) x.pos = { x: 70, z: 70 }; const it = createInteractions(e, ov, { ctx: t.ctx, town, player: p, npcs: n }); p.setPosition(doorOf(landmark('library'))); const cur = it.update(); const ok = cur && cur.kind === 'landmark' && cur.landmark.id === 'library' && it.interact() === 'codex' && t.ctx.wm.isOpen('codex'); it.dispose(); n.dispose(); p.dispose(); e.dispose(); c.remove(); t.done(); return Boolean(ok); } },
    { id: 'game.interact.labels', title: 'Landmark labels describe what each building does', dom: true, test: async () => { const { makeTestCtx } = await import('../windows/_testing.js'); const { createEngine, buildTown } = await import('./scene.js'); const { createOverlay } = await import('./overlay.js'); const { createPlayer } = await import('./player.js'); const { createNpcs } = await import('./npcs.js'); const t = makeTestCtx(); const c = document.createElement('canvas'); document.body.append(c); const e = createEngine(c, { shadows: false }); const town = buildTown(e.scene, { jobs: t.ctx.jobs() }); const ov = createOverlay(t.root, e); const p = createPlayer(e, { listen: false }); const n = createNpcs(e, ov, { ctx: t.ctx, town }); const it = createInteractions(e, ov, { ctx: t.ctx, town, player: p, npcs: n }); const ok = ov.get('lm:guild') && /headquarters/.test(ov.get('lm:guild').textContent) && ov.get(`hn:${t.job.id}`); it.dispose(); n.dispose(); p.dispose(); e.dispose(); c.remove(); t.done(); return Boolean(ok); } }
];
