/**
 * Awareness: minions notice the player (turn, greet), talk to each other at
 * the campfire, shelter from storms, and remark on jobs that need attention.
 * This is the "alert and conscious" layer on top of the needs/planner sim.
 */
import { approachLine, conversation, shelterFor, noticeLine } from '../sim/social.js';
import { dist, headingTo } from './steer.js';
import { face } from './characters.js';
import { lotForJob, houseState } from './town.js';

export const GREET_RADIUS = 4.5; export const GREET_COOLDOWN_S = 45; export const CHAT_INTERVAL_S = 18; export const NOTICE_COOLDOWN_S = 150;

export function createAwareness({ ctx, npcs, player, overlay = null, audio = null, random = null }) {
    const rnd = random || (() => ctx.world.random());
    const greeted = new Map(); const noticed = new Map(); let chatTimer = 6; let clock = 0; let lastWeather = 'none';
    const state = { greetings: 0, conversations: 0, notices: 0, sheltering: false };
    // Storm: override where everyone goes.
    npcs.placeHook = (agent, place, index) => (state.sheltering && !(agent.currentTask && agent.currentTask.jobId && place.place === 'house' && false) ? shelterFor(agent, index) : place);
    const api = {
        state,
        setWeather(kind) { const storm = kind === 'storm'; if (storm !== state.sheltering) { state.sheltering = storm; npcs.sync(); if (storm) for (const n of npcs.npcs.values()) if (rnd() < 0.35) npcs.say(n.agent.id, 'Storm coming – heading inside!', 'need', 4); } lastWeather = kind; },
        update(dt) {
            clock += dt;
            for (const n of npcs.npcs.values()) {
                const d = dist(n.pos, player.pos);
                n.facePlayer = d < GREET_RADIUS && n.anim !== 'sleep';
                if (n.facePlayer) {
                    face(n.chibi, headingTo(n.pos, player.pos), dt, 5);
                    const last = greeted.get(n.agent.id) ?? -Infinity;
                    if (clock - last > GREET_COOLDOWN_S && !n.bubbleText) { greeted.set(n.agent.id, clock); npcs.say(n.agent.id, approachLine(n.agent, ctx.profile().name, rnd), 'say', 5); state.greetings++; if (audio) audio.play('greet'); n.agent.needs.social = Math.min(100, n.agent.needs.social + 2); }
                }
            }
            chatTimer -= dt;
            if (chatTimer <= 0) { chatTimer = CHAT_INTERVAL_S; api.campfireChat(); api.noticeJobs(); }
        },
        /** Two minions sharing the campfire (or cafe) talk; others nearby listen. */
        campfireChat() {
            const groups = {};
            for (const n of npcs.npcs.values()) if (n.anim !== 'walk' && ['campfire', 'cafe', 'square'].includes(n.place.place)) (groups[n.place.place] = groups[n.place.place] || []).push(n);
            for (const list of Object.values(groups)) {
                if (list.length < 2) continue;
                const a = list[Math.floor(rnd() * list.length)]; let b = list[Math.floor(rnd() * list.length)]; if (b === a) b = list[(list.indexOf(a) + 1) % list.length];
                if (dist(a.pos, b.pos) > 9 || a.bubbleText || b.bubbleText) continue;
                const c = conversation(a.agent, b.agent, { random: rnd, now: ctx.world.time });
                npcs.say(a.agent.id, c.lines[0].text, 'say', 5); setTimeout(() => npcs.say(b.agent.id, c.lines[1].text, 'say', 6), 2200);
                face(a.chibi, headingTo(a.pos, b.pos), 1, 1); face(b.chibi, headingTo(b.pos, a.pos), 1, 1);
                for (const n of [a, b]) n.agent.needs.social = Math.min(100, n.agent.needs.social + 6);
                state.conversations++; ctx.bus.emit('game:conversation', { a: a.agent.id, b: b.agent.id, topic: c.topic });
                return c;
            }
            return null;
        },
        /** Idle crew passing a job house with an open stage remark on it. */
        noticeJobs() {
            const jobs = ctx.jobs();
            for (const n of npcs.npcs.values()) {
                if (n.agent.meta.hired === false || n.agent.currentTask || n.bubbleText) continue;
                for (const job of jobs) {
                    const lot = lotForJob(jobs, job.id); if (!lot || !houseState(job).marker) continue;
                    if (dist(n.pos, lot) > 12) continue;
                    const key = `${n.agent.id}:${job.id}`; if (clock - (noticed.get(key) ?? -Infinity) < NOTICE_COOLDOWN_S) continue;
                    noticed.set(key, clock); npcs.say(n.agent.id, noticeLine(n.agent, job, rnd), 'think', 6); state.notices++; ctx.bus.emit('game:notice', { agentId: n.agent.id, jobId: job.id });
                    return job;
                }
            }
            return null;
        }
    };
    return api;
}

const boot = async () => { const { makeTestCtx } = await import('../windows/_testing.js'); const { createEngine, buildTown } = await import('./scene.js'); const { createOverlay } = await import('./overlay.js'); const { createPlayer } = await import('./player.js'); const { createNpcs } = await import('./npcs.js'); const t = makeTestCtx(); const c = document.createElement('canvas'); document.body.append(c); const e = createEngine(c, { shadows: false }); const town = buildTown(e.scene, { jobs: t.ctx.jobs() }); const ov = createOverlay(t.root, e); const p = createPlayer(e, { listen: false }); const n = createNpcs(e, ov, { ctx: t.ctx, town }); return { t, e, ov, p, n, town, cleanup: () => { n.dispose(); p.dispose(); e.dispose(); c.remove(); t.done(); } }; };
export const FEATURES = [
    { id: 'game.aware.greet', title: 'Minions turn to face the player and greet them once per approach', dom: true, test: async () => { const { t, ov, p, n, cleanup } = await boot(); const aw = createAwareness({ ctx: t.ctx, npcs: n, player: p, random: () => 0.1 }); const nova = n.npcs.get('NOVA'); nova.pos = { x: 60, z: 0 }; nova.target = { ...nova.pos }; p.setPosition({ x: 62, z: 0 }); aw.update(0.1); aw.update(0.1); const ok = aw.state.greetings === 1 && ov.get('bb:NOVA') && nova.facePlayer; cleanup(); return Boolean(ok); } },
    { id: 'game.aware.conversation', title: 'Minions sharing the campfire talk to each other and gain social', dom: true, test: async () => { const { t, ov, n, p, cleanup } = await boot(); const aw = createAwareness({ ctx: t.ctx, npcs: n, player: p, random: () => 0.2 }); const [a, b] = [n.npcs.get('ATLAS'), n.npcs.get('BOLT')]; for (const x of [a, b]) { x.place = { place: 'campfire', position: { x: -12, z: 14 }, activity: 'talk' }; x.pos = { x: -12 + (x === a ? 2 : -2), z: 14 }; x.anim = 'talk'; } const before = a.agent.needs.social; const c = aw.campfireChat(); const speaker = c && n.npcs.get(c.lines[0].speaker); const ok = c && c.lines.length === 2 && speaker && ov.get(`bb:${speaker.agent.id}`) && speaker.agent.needs.social > 0 && aw.state.conversations === 1; cleanup(); return Boolean(ok); } },
    { id: 'game.aware.shelter', title: 'A storm sends everyone indoors; clearing it sends them back', dom: true, test: async () => { const { t, n, p, cleanup } = await boot(); const aw = createAwareness({ ctx: t.ctx, npcs: n, player: p, random: () => 0.9 }); aw.setWeather('storm'); const inside = [...n.npcs.values()].every((x) => ['guild', 'cafe', 'library'].includes(x.place.place) && x.place.activity === 'sit'); aw.setWeather('none'); const back = [...n.npcs.values()].some((x) => !['guild', 'cafe', 'library'].includes(x.place.place) || x.place.activity !== 'sit'); cleanup(); return inside && back; } },
    { id: 'game.aware.notice', title: 'Idle crew near a job house remark on what it needs', dom: true, test: async () => { const { t, ov, n, p, town, cleanup } = await boot(); const aw = createAwareness({ ctx: t.ctx, npcs: n, player: p, random: () => 0.3 }); const door = town.houseDoor(t.job.id, t.ctx.jobs()); const atlas = n.npcs.get('ATLAS'); atlas.pos = { x: door.x, z: door.z + 2 }; const job = aw.noticeJobs(); const ok = job && job.id === t.job.id && ov.get('bb:ATLAS') && /Nguyen|Test Customer/.test(ov.get('bb:ATLAS').textContent); cleanup(); return Boolean(ok); } },
    { id: 'game.aware.cooldowns', title: 'Greetings and notices respect cooldowns', dom: true, test: async () => { const { t, p, n, cleanup } = await boot(); const aw = createAwareness({ ctx: t.ctx, npcs: n, player: p, random: () => 0.1 }); const nova = n.npcs.get('NOVA'); nova.pos = { x: 60, z: 0 }; nova.target = { ...nova.pos }; p.setPosition({ x: 62, z: 0 }); aw.update(0.1); nova.bubbleText = null; aw.update(0.1); aw.update(0.1); const ok = aw.state.greetings === 1; cleanup(); return ok; } }
];
