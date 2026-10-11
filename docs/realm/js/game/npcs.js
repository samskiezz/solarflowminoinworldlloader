/** Minion NPCs: every simulated crew member walks the town according to its needs, tasks and chosen actions. */
import { buildChibi, animate, face } from './characters.js';
import { step, dist, headingTo } from './steer.js';
import { placeFor, bubbleFor, ACTIVITY_ANIM } from './behaviour.js';
import { landmark } from './town.js';
import { nameplate, bubble, needsWidget } from './overlay.js';
import { mood } from '../sim/needs.js';

export const NPC_SPEED = 2.8;
const MOOD_EMOJI = { Thriving: '😄', Steady: '🙂', Strained: '😓', Depleted: '😩' };

export function createNpcs(engine, overlay, { ctx, town, obstacles = () => [] }) {
    const npcs = new Map();
    let bubbleClock = 0; let hovered = null; let selected = null;
    function ensure(agent, index) {
        let n = npcs.get(agent.id);
        if (!n) {
            const chibi = buildChibi({ id: agent.id, role: agent.role, tier: agent.tier });
            const start = placeFor(agent, { jobs: ctx.jobs(), index, hourOfDay: ctx.world.clock.hourOfDay });
            n = { agent, chibi, pos: { ...start.position }, target: { ...start.position }, place: start, anim: 'idle', bubbleText: null, bubbleUntil: 0, index };
            chibi.position.set(n.pos.x, 0, n.pos.z); chibi.userData.agentId = agent.id; engine.scene.add(chibi); npcs.set(agent.id, n);
            overlay.add(`np:${agent.id}`, { el: nameplate({ name: agent.name, sub: agent.role, colour: agent.meta && agent.meta.hired === false ? '#cfd6e6' : '#ffd166', portrait: agent.meta && agent.meta.avatarUrl, tier: agent.tier, cls: agent.meta && agent.meta.hired === false ? 'townsfolk' : 'crew' }), anchor: chibi, offsetY: 2.1, maxDistance: 60 });
        }
        n.agent = agent; n.index = index; return n;
    }
    const api = {
        npcs,
        sync() {
            const agents = ctx.world.agents; const ids = new Set(agents.map((a) => a.id));
            for (const [id, n] of npcs) if (!ids.has(id)) { engine.scene.remove(n.chibi); overlay.remove(`np:${id}`); overlay.remove(`bb:${id}`); npcs.delete(id); }
            agents.forEach((agent, index) => {
                const n = ensure(agent, index);
                const place = placeFor(agent, { jobs: ctx.jobs(), index, hourOfDay: ctx.world.clock.hourOfDay });
                if (place.place === 'house') { const door = town.houseDoor(place.jobId, ctx.jobs()); if (door) place.position = { x: door.x + (index % 3) * 1.2 - 1.2, z: door.z }; }
                n.place = place; n.target = { ...place.position };
                const m = mood(agent.needs); const plate = overlay.get(`np:${agent.id}`); if (plate) { plate.querySelector('.ov-sub').textContent = `${MOOD_EMOJI[m.label] || ''} ${place.label || agent.role}`; }
                const b = bubbleFor(agent, ctx.world.feed, ctx.world.time);
                if (b && b.text !== n.bubbleText) { n.bubbleText = b.text; n.bubbleUntil = bubbleClock + 7; overlay.add(`bb:${agent.id}`, { el: bubble(b.text.slice(0, 90), b.kind === 'reflection' ? 'think' : b.kind === 'need' ? 'need' : 'say'), anchor: n.chibi, offsetY: 3.1, maxDistance: 45 }); }
            });
            return npcs.size;
        },
        update(dt, elapsed) {
            bubbleClock += dt;
            for (const n of npcs.values()) {
                const d = dist(n.pos, n.target);
                if (d > 0.5) {
                    const r = step(n.pos, n.target, { speed: NPC_SPEED, dt, arrive: 0.5, boxes: obstacles(), margin: 0.5, allowInside: n.place.inside });
                    n.pos = r.pos; n.anim = 'walk'; face(n.chibi, headingTo(n.pos, n.target), dt, 8);
                } else {
                    n.anim = ACTIVITY_ANIM[n.place.activity] || n.place.activity || 'idle';
                    if (n.place.place === 'house' || n.place.inside) { const lm = n.place.inside ? landmark(n.place.inside) : null; if (lm) face(n.chibi, headingTo(n.pos, { x: lm.x, z: lm.z }), dt, 6); }
                    if (n.place.place === 'campfire') face(n.chibi, headingTo(n.pos, { x: -12, z: 14 }), dt, 6);
                }
                n.chibi.position.set(n.pos.x, 0, n.pos.z);
                animate(n.chibi, dt, n.anim);
                if (n.bubbleText && bubbleClock > n.bubbleUntil) { overlay.remove(`bb:${n.agent.id}`); n.bubbleText = null; }
                if ((hovered === n.agent.id || selected === n.agent.id) && Math.floor(elapsed * 2) !== Math.floor((elapsed - dt) * 2)) api.showNeeds(n.agent.id);
                if (n.anim === 'sleep' && !overlay.get(`bb:${n.agent.id}`) && Math.floor(elapsed) % 4 === 0) { overlay.add(`bb:${n.agent.id}`, { el: bubble('z z z', 'think'), anchor: n.chibi, offsetY: 2.4, maxDistance: 40 }); n.bubbleText = 'z z z'; n.bubbleUntil = bubbleClock + 3; }
            }
        },
        nearest(pos, maxDist = 2.6) { let best = null; for (const n of npcs.values()) { const d = dist(pos, n.pos); if (d <= maxDist && (!best || d < best.dist)) best = { npc: n, agent: n.agent, dist: d }; } return best; },
        chibis() { return [...npcs.values()].map((n) => n.chibi); },
        /** Show the needs widget for a hovered/selected minion (Sims-style). */
        setHover(agentId) { if (hovered === agentId) return; if (hovered && hovered !== selected) overlay.remove(`nw:${hovered}`); hovered = agentId; if (agentId) api.showNeeds(agentId); },
        setSelected(agentId) { if (selected && selected !== agentId) overlay.remove(`nw:${selected}`); selected = agentId; if (agentId) api.showNeeds(agentId); for (const n of npcs.values()) n.chibi.userData.parts.helmet.material.emissive?.setHex(n.agent.id === agentId ? 0x335577 : 0x000000); },
        showNeeds(agentId) { const n = npcs.get(agentId); if (!n) return; overlay.add(`nw:${agentId}`, { el: needsWidget(n.agent, { activity: n.place.label || n.anim, credits: n.agent.meta && n.agent.meta.energyCredits }), anchor: n.chibi, offsetY: 4.2, maxDistance: 70, cls: 'needs' }); },
        get hovered() { return hovered; }, get selected() { return selected; },
        byChibi(obj) { let o = obj; while (o) { if (o.userData && o.userData.agentId) return npcs.get(o.userData.agentId) || null; o = o.parent; } return null; },
        say(agentId, text, kind = 'say', seconds = 6) { const n = npcs.get(agentId); if (!n) return; n.bubbleText = text; n.bubbleUntil = bubbleClock + seconds; overlay.add(`bb:${agentId}`, { el: bubble(text.slice(0, 120), kind), anchor: n.chibi, offsetY: 3.1, maxDistance: 60 }); },
        dispose() { for (const [id, n] of npcs) { engine.scene.remove(n.chibi); overlay.remove(`np:${id}`); overlay.remove(`bb:${id}`); } npcs.clear(); }
    };
    api.sync();
    return api;
}

export const FEATURES = [
    { id: 'game.npcs.spawn', title: 'Every crew member spawns as a chibi with a nameplate', dom: true, test: async () => { const { makeTestCtx } = await import('../windows/_testing.js'); const { createEngine, buildTown } = await import('./scene.js'); const { createOverlay } = await import('./overlay.js'); const t = makeTestCtx(); const c = document.createElement('canvas'); document.body.append(c); const e = createEngine(c, { shadows: false }); const town = buildTown(e.scene, { jobs: t.ctx.jobs() }); const ov = createOverlay(t.root, e); const n = createNpcs(e, ov, { ctx: t.ctx, town }); const ok = n.npcs.size === 24 && ov.get('np:ATLAS') && n.chibis().length === 24; n.dispose(); e.dispose(); c.remove(); t.done(); return Boolean(ok); } },
    { id: 'game.npcs.walkToWork', title: 'An agent assigned to a job walks to that house and works', dom: true, test: async () => { const { makeTestCtx } = await import('../windows/_testing.js'); const { createEngine, buildTown } = await import('./scene.js'); const { createOverlay } = await import('./overlay.js'); const t = makeTestCtx(); const c = document.createElement('canvas'); document.body.append(c); const e = createEngine(c, { shadows: false }); const town = buildTown(e.scene, { jobs: t.ctx.jobs() }); const ov = createOverlay(t.root, e); const n = createNpcs(e, ov, { ctx: t.ctx, town }); t.ctx.world.assignNextTask('NOVA', t.job.id); n.sync(); const nova = n.npcs.get('NOVA'); const door = town.houseDoor(t.job.id, t.ctx.jobs()); let i = 0; while (i++ < 2000 && dist(nova.pos, nova.target) > 0.5) n.update(0.05, i * 0.05); n.update(0.05, 100); const ok = nova.place.place === 'house' && dist(nova.pos, door) < 4 && ['work', 'read'].includes(nova.anim); n.dispose(); e.dispose(); c.remove(); t.done(); return ok; } },
    { id: 'game.npcs.restAtNight', title: 'At night the crew sleeps at the guild hall', dom: true, test: async () => { const { makeTestCtx } = await import('../windows/_testing.js'); const { createEngine, buildTown } = await import('./scene.js'); const { createOverlay } = await import('./overlay.js'); const t = makeTestCtx(); const c = document.createElement('canvas'); document.body.append(c); const e = createEngine(c, { shadows: false }); const town = buildTown(e.scene, { jobs: t.ctx.jobs() }); const ov = createOverlay(t.root, e); const n = createNpcs(e, ov, { ctx: t.ctx, town }); t.ctx.world.time = Date.UTC(2026, 0, 5, 23); n.sync(); const atlas = n.npcs.get('ATLAS'); let i = 0; while (i++ < 3000 && dist(atlas.pos, atlas.target) > 0.5) n.update(0.05, i * 0.05); n.update(0.05, 4); const ok = atlas.place.place === 'guild' && atlas.anim === 'sleep'; n.dispose(); e.dispose(); c.remove(); t.done(); return ok; } },
    { id: 'game.npcs.bubbles', title: 'Crew speak in bubbles when something happens', dom: true, test: async () => { const { makeTestCtx } = await import('../windows/_testing.js'); const { createEngine, buildTown } = await import('./scene.js'); const { createOverlay } = await import('./overlay.js'); const t = makeTestCtx(); const c = document.createElement('canvas'); document.body.append(c); const e = createEngine(c, { shadows: false }); const town = buildTown(e.scene, { jobs: t.ctx.jobs() }); const ov = createOverlay(t.root, e); const n = createNpcs(e, ov, { ctx: t.ctx, town }); t.ctx.world.emit({ type: 'task_complete', agentId: 'BOLT', text: 'Bolt completed "Labels fitted"' }); n.sync(); const ok = ov.get('bb:BOLT') && /Labels fitted/.test(ov.get('bb:BOLT').textContent); n.say('ATLAS', 'Hello there'); const said = ov.get('bb:ATLAS').textContent === 'Hello there'; n.dispose(); e.dispose(); c.remove(); t.done(); return Boolean(ok && said); } },
    { id: 'game.npcs.needsWidget', title: 'Hovering or selecting a minion shows their needs widget', dom: true, test: async () => { const { makeTestCtx } = await import('../windows/_testing.js'); const { createEngine, buildTown } = await import('./scene.js'); const { createOverlay } = await import('./overlay.js'); const t = makeTestCtx(); const c = document.createElement('canvas'); document.body.append(c); const e = createEngine(c, { shadows: false }); const town = buildTown(e.scene, { jobs: t.ctx.jobs() }); const ov = createOverlay(t.root, e); const n = createNpcs(e, ov, { ctx: t.ctx, town }); n.setHover('NOVA'); const shown = ov.get('nw:NOVA') && ov.get('nw:NOVA').querySelectorAll('.ov-need').length === 6; n.setHover(null); const hidden = !ov.get('nw:NOVA'); n.setSelected('ATLAS'); const sel = ov.get('nw:ATLAS') && n.selected === 'ATLAS'; n.dispose(); e.dispose(); c.remove(); t.done(); return Boolean(shown && hidden && sel); } },
    { id: 'game.npcs.roster', title: 'The whole 24-minion roster walks the town; townsfolk plates look different', dom: true, test: async () => { const { makeTestCtx } = await import('../windows/_testing.js'); const { createEngine, buildTown } = await import('./scene.js'); const { createOverlay } = await import('./overlay.js'); const t = makeTestCtx(); const c = document.createElement('canvas'); document.body.append(c); const e = createEngine(c, { shadows: false }); const town = buildTown(e.scene, { jobs: t.ctx.jobs() }); const ov = createOverlay(t.root, e); const n = createNpcs(e, ov, { ctx: t.ctx, town }); const ok = n.npcs.size === 24 && ov.get('np:WREN').classList.contains('townsfolk') && ov.get('np:ATLAS').classList.contains('crew') && ov.get('np:ATLAS').querySelector('.ov-portrait') && /★/.test(ov.get('np:ATLAS').textContent); n.dispose(); e.dispose(); c.remove(); t.done(); return Boolean(ok); } },
    { id: 'game.npcs.nearest', title: 'Nearest crew member lookup for interaction', dom: true, test: async () => { const { makeTestCtx } = await import('../windows/_testing.js'); const { createEngine, buildTown } = await import('./scene.js'); const { createOverlay } = await import('./overlay.js'); const t = makeTestCtx(); const c = document.createElement('canvas'); document.body.append(c); const e = createEngine(c, { shadows: false }); const town = buildTown(e.scene, { jobs: t.ctx.jobs() }); const ov = createOverlay(t.root, e); const n = createNpcs(e, ov, { ctx: t.ctx, town }); const nova = n.npcs.get('NOVA'); const near = n.nearest({ x: nova.pos.x + 1, z: nova.pos.z }); const far = n.nearest({ x: 999, z: 999 }); const ok = near && near.agent.id === 'NOVA' && far === null && n.byChibi(nova.chibi.userData.parts.head) === nova; n.dispose(); e.dispose(); c.remove(); t.done(); return Boolean(ok); } }
];
