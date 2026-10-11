/**
 * The game: Solarhaven. Composes engine, town, player, crew NPCs, interactions,
 * the objective tracker, minimap and floating rewards, and binds all of it to
 * the simulation clock and the window system (which is the game's UI).
 */
import { createEngine, buildTown } from './scene.js';
import { createOverlay } from './overlay.js';
import { createPlayer } from './player.js';
import { createNpcs } from './npcs.js';
import { createInteractions } from './interact.js';
import { createAwareness } from './awareness.js';
import { createTouchControls, isCoarsePointer } from './touch.js';
import { createAudio } from '../core/audio.js';
import { obstacles, LANDMARKS, LOTS, ROADS, TOWN_SIZE, lotForJob, houseState } from './town.js';
import { dayPhase } from '../core/clock.js';
import { h, replace } from '../core/ui.js';

export const TUTORIAL = [
    { id: 'move', title: 'Find your feet', text: 'Walk with W A S D (or click the ground). Drag the mouse to look around.', reward: 5 },
    { id: 'talk', title: 'Meet the crew', text: 'Walk up to a crew member and press E to talk.', reward: 10 },
    { id: 'board', title: 'The notice board', text: 'Read the notice board in the square (E) to see your quests.', reward: 10 },
    { id: 'guild', title: 'Your guild hall', text: 'Enter the Guild Hall north of the square to see your company dashboard.', reward: 10 },
    { id: 'job', title: 'First customer', text: 'Create a job in the Jobs window (O) – a house appears on a lot with a ! marker.', reward: 20 },
    { id: 'house', title: 'Visit the site', text: 'Walk to the new house and press E at the door.', reward: 15 },
    { id: 'workshop', title: 'Design it', text: 'Enter the Design Workshop and run string sizing for the job.', reward: 20 },
    { id: 'library', title: 'Know the rules', text: 'Visit the Standards Library and open a clause.', reward: 15 },
    { id: 'assign', title: 'Put the crew to work', text: 'Assign a crew member to the job (Jobs › Job detail) and watch them walk to the house.', reward: 25 }
];

export function tutorialState(ctx) { return ctx.store.get('onboarding.tutorial', { done: [], active: true }); }
export function completeTutorial(ctx, id) {
    const t = tutorialState(ctx); if (t.done.includes(id)) return false;
    const stepDef = TUTORIAL.find((s) => s.id === id); if (!stepDef) return false;
    const expected = TUTORIAL[t.done.length]; if (!expected || expected.id !== id) return false; // chain order
    t.done = [...t.done, id]; ctx.store.set('onboarding.tutorial', t);
    ctx.world.ledger.balance += stepDef.reward; ctx.world.ledger.entries.push({ at: ctx.world.time, type: 'tutorial', amount: stepDef.reward, balance: ctx.world.ledger.balance, ref: id });
    ctx.notify('tutorial', `Objective complete: ${stepDef.title} (+${stepDef.reward} credits)`);
    ctx.bus.emit('tutorial:complete', { id, next: TUTORIAL[t.done.length] || null });
    return true;
}
export function currentTutorial(ctx) { const t = tutorialState(ctx); return TUTORIAL[t.done.length] || null; }

export function drawMinimap(canvas, { jobs, npcs, player, phase = 'day' }) {
    const g = canvas.getContext('2d'); const w = canvas.width; const hh = canvas.height; const s = Math.min(w, hh) / (TOWN_SIZE + 10);
    const X = (x) => w / 2 + x * s; const Z = (z) => hh / 2 + z * s;
    g.fillStyle = phase === 'night' ? '#16301c' : '#2f6b2f'; g.fillRect(0, 0, w, hh);
    g.fillStyle = '#5a5a60'; for (const r of ROADS) g.fillRect(X(r.x - r.w / 2), Z(r.z - r.d / 2), r.w * s, r.d * s);
    g.fillStyle = '#b9ad98'; g.beginPath(); g.arc(X(0), Z(0), 16 * s, 0, Math.PI * 2); g.fill();
    for (const l of LANDMARKS) { g.fillStyle = `#${l.colour.toString(16).padStart(6, '0')}`; g.fillRect(X(l.x - l.w / 2), Z(l.z - l.d / 2), Math.max(2, l.w * s), Math.max(2, l.d * s)); }
    for (const lot of LOTS) { g.strokeStyle = 'rgba(255,255,255,.15)'; g.strokeRect(X(lot.x - lot.w / 2), Z(lot.z - lot.d / 2), lot.w * s, lot.d * s); }
    for (const job of jobs) { const lot = lotForJob(jobs, job.id); if (!lot) continue; const st = houseState(job); g.fillStyle = st.complete ? '#3ddc84' : st.energised ? '#8fd0ff' : '#f4e3b2'; g.fillRect(X(lot.x - 3), Z(lot.z - 2.5), 6 * s, 5 * s); if (st.marker) { g.fillStyle = st.marker === '?' ? '#ffd400' : '#ffb400'; g.font = `bold ${Math.max(9, 7 * s)}px sans-serif`; g.textAlign = 'center'; g.fillText(st.marker, X(lot.x), Z(lot.z) - 3); } }
    for (const n of npcs) { g.fillStyle = '#ffd166'; g.beginPath(); g.arc(X(n.pos.x), Z(n.pos.z), 2.2, 0, Math.PI * 2); g.fill(); }
    if (player) { g.save(); g.translate(X(player.pos.x), Z(player.pos.z)); g.rotate(-player.heading); g.fillStyle = '#4f8cff'; g.beginPath(); g.moveTo(0, -5); g.lineTo(3.5, 4); g.lineTo(-3.5, 4); g.closePath(); g.fill(); g.restore(); }
    return { scale: s, toWorld: (px, pz) => ({ x: (px - w / 2) / s, z: (pz - hh / 2) / s }) };
}

export function startGame(ctx, { canvas, overlayHost, minimapHost = null, trackerHost = null, autoStart = true } = {}) {
    const engine = createEngine(canvas);
    const town = buildTown(engine.scene, { jobs: ctx.jobs() });
    const overlay = createOverlay(overlayHost, engine);
    const obs = () => obstacles(ctx.jobs());
    const saved = ctx.store.get('ui.playerPos');
    const player = createPlayer(engine, { obstacles: obs, position: saved && Number.isFinite(saved.x) ? saved : { x: 4, z: 14 }, listen: autoStart });
    const npcs = createNpcs(engine, overlay, { ctx, town, obstacles: obs });
    const interactions = createInteractions(engine, overlay, { ctx, town, player, npcs });
    const audio = ctx.audio || createAudio({ store: ctx.store });
    const awareness = createAwareness({ ctx, npcs, player, overlay, audio });
    const quality = ctx.store.get('ui.quality', {}); engine.setQuality({ shadows: quality.shadows !== false, pixelRatio: quality.pixelRatio || null });
    let touch = null; const touchMode = ctx.store.get('ui.touch', 'auto'); if (overlayHost && autoStart && (touchMode === 'on' || (touchMode === 'auto' && isCoarsePointer()))) touch = createTouchControls(overlayHost.parentElement || overlayHost, { player, onInteract: () => interactions.interact() });
    const state = { hudVisible: true, lastSync: 0, lastMinimap: 0, jobCount: ctx.jobs().length, moved: 0, lastHoverCheck: 0 };
    // Click a minion to select them (opens their crew sheet); hover shows their needs.
    const pickNpc = (ndc) => { const hit = engine.pick(ndc.x, ndc.y, npcs.chibis()); return hit ? npcs.byChibi(hit.object) : null; };
    player.onClick = (ndc) => { const n = pickNpc(ndc); if (n) { npcs.setSelected(n.agent.id); ctx.store.set('ui.selectedAgent', n.agent.id); ctx.open('crew', { tab: 'detail' }); return; } const g = engine.groundPoint(ndc.x, ndc.y); if (g) player.moveTo(g); };
    const onHover = (e) => { if (!autoStart || e.target !== canvas) return; const now = performance.now(); if (now - state.lastHoverCheck < 120) return; state.lastHoverCheck = now; const r = canvas.getBoundingClientRect(); const n = pickNpc({ x: ((e.clientX - r.left) / r.width) * 2 - 1, y: -(((e.clientY - r.top) / r.height) * 2 - 1) }); npcs.setHover(n ? n.agent.id : null); canvas.style.cursor = n ? 'pointer' : ''; };
    if (autoStart) window.addEventListener('pointermove', onHover);

    function applyClock() { const c = ctx.world.clock; engine.setPhase(dayPhase(c.hourOfDay), c.hourOfDay); const ev = ctx.world.activeEvent; const weather = ev && ev.id === 'storm' ? 'storm' : ev && ev.id === 'heatwave' ? 'heatwave' : 'none'; engine.setWeather(weather); awareness.setWeather(weather); }
    applyClock();
    const offs = [];
    offs.push(ctx.bus.on('clock:tick', () => { applyClock(); }));
    offs.push(ctx.bus.on('world:event', (e) => {
        if (e.type === 'task_complete') { const n = npcs.npcs.get(e.agentId); overlay.floatText('+5 credits', n ? n.chibi : player.chibi, { colour: '#e2b14a' }); if (n) npcs.say(e.agentId, 'Done! ✔', 'say', 4); audio.play('reward'); }
        if (e.type === 'task_failed') audio.play('error'); if (e.type === 'level_up') audio.play('levelup'); if (e.type === 'achievement') audio.play('achievement'); if (e.type === 'tutorial' || e.type === 'stage_advanced') audio.play('reward');
        if (e.type === 'task_failed') { const n = npcs.npcs.get(e.agentId); if (n) npcs.say(e.agentId, 'Defect found – reworking.', 'need', 5); }
        if (e.type === 'level_up') { const n = npcs.npcs.get(e.agentId); overlay.floatText('LEVEL UP', n ? n.chibi : player.chibi, { colour: '#3ddc84', duration: 2000 }); }
        if (e.type === 'achievement') overlay.floatText('🏆 ' + e.text.replace('Achievement unlocked: ', ''), player.chibi, { colour: '#ffd700', duration: 2600 });
        if (e.type === 'job_created') { town.setJobs(ctx.jobs()); interactions.refreshMarkers(); completeTutorial(ctx, 'job'); }
        if (e.type === 'tutorial') overlay.floatText(e.text.replace('Objective complete: ', '✔ '), player.chibi, { colour: '#9fd8ff', duration: 2200 });
        if (e.type === 'hired') { const n = npcs.npcs.get(e.agentId); if (n) { npcs.sync(); npcs.say(e.agentId, 'Glad to be on the crew!', 'say', 5); overlay.floatText('New crew member', n.chibi, { colour: '#3ddc84', duration: 2200 }); } }
        if (e.type === 'checklist' || e.type === 'commissioning' || e.type === 'stage_advanced') { const job = e.jobId ? ctx.job(e.jobId) : null; if (job) { town.updateHouse(job); interactions.refreshMarkers(); const lot = lotForJob(ctx.jobs(), job.id); if (lot) overlay.floatText(e.type === 'stage_advanced' ? '➜ next stage' : '✔ ' + e.type, { x: lot.x, y: 4, z: lot.z }, { colour: '#3ddc84' }); } }
        renderTracker();
    }));
    offs.push(ctx.bus.on('game:interact', (e) => {
        if (e.kind === 'npc') completeTutorial(ctx, 'talk');
        if (e.kind === 'landmark' && e.id === 'board') completeTutorial(ctx, 'board');
        if (e.kind === 'landmark' && e.id === 'guild') completeTutorial(ctx, 'guild');
        if (e.kind === 'house') completeTutorial(ctx, 'house');
        if (e.kind === 'landmark' && e.id === 'workshop') completeTutorial(ctx, 'workshop');
        if (e.kind === 'landmark' && e.id === 'library') completeTutorial(ctx, 'library');
        renderTracker();
    }));
    offs.push(ctx.bus.on('design:updated', (e) => { if (e.design && e.design.modulesPerString) completeTutorial(ctx, 'workshop'); const job = ctx.job(e.jobId); if (job) town.updateHouse(job); renderTracker(); }));
    offs.push(ctx.bus.on('wm:open', () => { renderTracker(); audio.play('open'); }));
    offs.push(ctx.bus.on('wm:close', () => audio.play('close')));
    offs.push(ctx.bus.on('settings:updated', (ui) => { const q = (ui && ui.quality) || {}; engine.setQuality({ shadows: q.shadows !== false, pixelRatio: q.pixelRatio || null }); if (!ctx.store.get('ui.soundOn')) audio.stopAll(); const mode = ctx.store.get('ui.touch', 'auto'); const want = mode === 'on' || (mode === 'auto' && isCoarsePointer()); if (want && !touch && autoStart) touch = createTouchControls(overlayHost.parentElement || overlayHost, { player, onInteract: () => interactions.interact() }); if (!want && touch) { touch.dispose(); touch = null; } }));
    ctx.keys.on('game.interact', () => interactions.interact());
    ctx.keys.on('game.toggleHud', () => { state.hudVisible = !state.hudVisible; overlay.layer.classList.toggle('hidden', !state.hudVisible); });
    ctx.keys.on('game.resetCamera', () => { player.state.cam = { yaw: 0, pitch: 0.42, dist: 12 }; });

    // objective tracker (WoW-style)
    const tracker = trackerHost ? h('div', { class: 'quest-tracker' }) : null; if (tracker) trackerHost.append(tracker);
    function renderTracker() {
        if (!tracker) return;
        const step = currentTutorial(ctx); const quests = ctx.world.quests().slice(0, 4);
        replace(tracker, h('div', { class: 'qt-title' }, 'Objectives'),
            step ? h('div', { class: 'qt-quest tutorial' }, h('div', { class: 'qt-name' }, `Tutorial: ${step.title}`), h('div', { class: 'qt-obj' }, '▸ ', step.text)) : null,
            quests.map((q) => h('div', { class: 'qt-quest', onclick: () => { ctx.store.set('ui.selectedQuest', q.id); ctx.open('quests'); } }, h('div', { class: 'qt-name' }, q.title), q.objectives.filter((o) => !o.done).slice(0, 2).map((o) => h('div', { class: 'qt-obj' }, '▸ ', o.text)), q.objectives.every((o) => o.done) ? h('div', { class: 'qt-obj done' }, '✔ Ready to turn in (L)') : null)),
            !step && !quests.length ? h('div', { class: 'qt-obj' }, 'No objectives – create a job (O).') : null);
    }
    renderTracker();

    // minimap
    let mm = null;
    if (minimapHost) { const fresh = minimapHost.cloneNode(false); minimapHost.replaceWith(fresh); minimapHost = fresh; mm = h('canvas', { width: 180, height: 150, class: 'town-minimap' }); minimapHost.replaceChildren(mm, h('span', { class: 'mm-label' }, 'Solarhaven · click to walk')); mm.addEventListener('click', (e) => { const r = mm.getBoundingClientRect(); const d = drawMinimap(mm, { jobs: ctx.jobs(), npcs: [...npcs.npcs.values()], player: player.state }); const p = d.toWorld((e.clientX - r.left) * (mm.width / r.width), (e.clientY - r.top) * (mm.height / r.height)); player.moveTo(p); }); }

    let stepTimer = 0; let ambienceTimer = 0;
    const frame = (dt, elapsed) => {
        const moved = player.update(dt); state.moved += moved; if (state.moved > 6) completeTutorial(ctx, 'move');
        if (moved > 0) { stepTimer += dt; if (stepTimer > 0.36) { stepTimer = 0; audio.play('step'); } }
        npcs.update(dt, elapsed); awareness.update(dt); interactions.update(); town.flicker(elapsed); overlay.update();
        ambienceTimer += dt; if (ambienceTimer > 2) { ambienceTimer = 0; audio.ambience({ phase: engine.state.phase, weather: engine.state.weather, nearFire: Math.hypot(player.pos.x + 12, player.pos.z - 14) < 10 }); }
        state.lastSync += dt; if (state.lastSync > 1.5) { state.lastSync = 0; npcs.sync(); if (ctx.jobs().length !== state.jobCount) { state.jobCount = ctx.jobs().length; town.setJobs(ctx.jobs()); } for (const job of ctx.jobs()) town.updateHouse(job); interactions.refreshMarkers(); ctx.store.set('ui.playerPos', { x: player.pos.x, z: player.pos.z }); if (ctx.world.crew().some((a) => a.currentTask && a.currentTask.jobId)) completeTutorial(ctx, 'assign'); }
        state.lastMinimap += dt; if (mm && state.lastMinimap > 0.2) { state.lastMinimap = 0; drawMinimap(mm, { jobs: ctx.jobs(), npcs: [...npcs.npcs.values()], player: player.state, phase: engine.state.phase }); }
    };
    const stopUpdate = engine.onUpdate(frame);
    const onResize = () => engine.resize(); window.addEventListener('resize', onResize);
    const onVis = () => { if (document.hidden) engine.stop(); else if (autoStart) engine.start(); }; document.addEventListener('visibilitychange', onVis);
    if (autoStart) engine.start();
    const unlock = () => audio.unlock(); if (autoStart) { window.addEventListener('pointerdown', unlock, { once: true }); window.addEventListener('keydown', unlock, { once: true }); }
    const game = { engine, town, overlay, player, npcs, interactions, awareness, audio, state, get touch() { return touch; }, tutorial: { current: () => currentTutorial(ctx), complete: (id) => completeTutorial(ctx, id) }, renderTracker, drawMinimap: () => mm && drawMinimap(mm, { jobs: ctx.jobs(), npcs: [...npcs.npcs.values()], player: player.state }), tickOnce(dt = 0.05) { engine.clock.elapsed += dt; frame(dt, engine.clock.elapsed); }, dispose() { engine.stop(); stopUpdate(); for (const off of offs) off(); window.removeEventListener('resize', onResize); window.removeEventListener('pointermove', onHover); audio.stopAll(); if (touch) touch.dispose(); document.removeEventListener('visibilitychange', onVis); interactions.dispose(); npcs.dispose(); player.dispose(); overlay.clear(); overlay.layer.remove(); engine.dispose(); } };
    return game;
}

const boot = async () => { const { makeTestCtx } = await import('../windows/_testing.js'); const t = makeTestCtx(); const canvas = h('canvas', { width: 320, height: 200 }); const host = h('div', { style: { width: '320px', height: '200px', position: 'fixed' } }); document.body.append(canvas, host); const game = startGame(t.ctx, { canvas, overlayHost: host, trackerHost: host, autoStart: false }); return { t, game, cleanup: () => { game.dispose(); canvas.remove(); host.remove(); t.done(); } }; };
export const FEATURES = [
    { id: 'game.start', title: 'The game starts with the town, the player, the crew and job houses', dom: true, test: async () => { const { t, game, cleanup } = await boot(); game.engine.renderOnce(); const ok = game.npcs.npcs.size === 24 && game.town.houses.size === 1 && game.player.chibi.parent === game.engine.scene && game.engine.state.frames === 1; cleanup(); return ok; } },
    { id: 'game.clockDrivesWorld', title: 'Simulated clock drives day/night and weather in the world', dom: true, test: async () => { const { t, game, cleanup } = await boot(); t.ctx.world.tick(12); t.ctx.bus.emit('clock:tick', {}); const night = game.engine.state.phase === 'night'; t.ctx.world.activeEvent = { id: 'storm', label: 'Storm', effects: { installBlocked: true }, durationH: 12 }; t.ctx.bus.emit('clock:tick', {}); const rain = game.engine.state.weather === 'storm'; cleanup(); return night && rain; } },
    { id: 'game.tutorialChain', title: 'In-world tutorial objectives complete in order and pay credits', dom: true, test: async () => { const { t, game, cleanup } = await boot(); const before = t.ctx.world.ledger.balance; const skip = completeTutorial(t.ctx, 'talk'); game.player.press('right'); for (let i = 0; i < 60; i++) game.tickOnce(1 / 30); game.player.release('right'); const moved = tutorialState(t.ctx).done.includes('move'); t.ctx.bus.emit('game:interact', { kind: 'npc', id: 'ATLAS' }); const talked = tutorialState(t.ctx).done.includes('talk') && currentTutorial(t.ctx).id === 'board'; const paid = t.ctx.world.ledger.balance === before + 15; const tracker = /Tutorial: The notice board/.test(game.renderTracker ? (game.renderTracker(), document.querySelector('.quest-tracker').textContent) : ''); cleanup(); return !skip && moved && talked && paid && tracker; } },
    { id: 'game.houseAppears', title: 'Creating a job raises a house with a quest marker', dom: true, test: async () => { const { t, game, cleanup } = await boot(); const job = t.ctx.world.addJob({ customer: 'Bea', postcode: '2000', systemKw: 5 }); const ok = game.town.houses.has(job.id) && game.overlay.get(`mk:${job.id}`) && game.overlay.get(`mk:${job.id}`).textContent === '!'; cleanup(); return Boolean(ok); } },
    { id: 'game.floatingRewards', title: 'Completed tasks and level-ups float reward text in the world', dom: true, test: async () => { const { t, game, cleanup } = await boot(); const before = game.overlay.count(); t.ctx.world.emit({ type: 'task_complete', agentId: 'NOVA', text: 'Nova completed x' }); const ok = game.overlay.count() >= before + 1 && game.overlay.get('bb:NOVA') && /Done/.test(game.overlay.get('bb:NOVA').textContent); cleanup(); return Boolean(ok); } },
    { id: 'game.interactKey', title: 'E interacts with whatever is in front of the player', dom: true, test: async () => { const { t, game, cleanup } = await boot(); t.ctx.wm.register({ id: 'chat', title: 'c', render: () => {}, tabs: [{ id: 'talk', label: 't' }] }); const nova = game.npcs.npcs.get('NOVA'); game.player.setPosition({ x: nova.pos.x + 1, z: nova.pos.z }); game.tickOnce(0.01); t.ctx.keys.handle({ key: 'e' }); const ok = t.ctx.wm.isOpen('chat') && t.ctx.store.get('ui.chatAgent') === 'NOVA'; cleanup(); return ok; } },
    { id: 'game.minimap', title: 'Town minimap with player, crew, houses and markers', dom: true, test: async () => { const { t, game, cleanup } = await boot(); const c = h('canvas', { width: 180, height: 150 }); const d = drawMinimap(c, { jobs: t.ctx.jobs(), npcs: [...game.npcs.npcs.values()], player: game.player.state }); const px = c.getContext('2d').getImageData(90, 75, 1, 1).data; const ok = d.scale > 0.8 && px[3] === 255 && Math.abs(d.toWorld(90, 75).x) < 0.01; cleanup(); return ok; } },
    { id: 'game.clickSelect', title: 'Clicking a minion selects them and opens their sheet', dom: true, test: async () => { const { t, game, cleanup } = await boot(); t.ctx.wm.register({ id: 'crew', title: 'c', render: () => {}, tabs: [{ id: 'detail', label: 'd' }] }); const nova = game.npcs.npcs.get('NOVA'); game.player.setPosition({ x: nova.pos.x, z: nova.pos.z + 6 }); game.player.state.cam = { yaw: 0, pitch: 0.3, dist: 8 }; game.player.updateCamera(1); game.engine.camera.updateMatrixWorld(); const p = game.engine.project({ x: nova.pos.x, y: 1, z: nova.pos.z }); game.player.onClick({ x: p.x * 2 - 1, y: -(p.y * 2 - 1) }); const ok = game.npcs.selected === 'NOVA' && t.ctx.wm.isOpen('crew') && t.ctx.store.get('ui.selectedAgent') === 'NOVA'; cleanup(); return ok; } },
    { id: 'game.soundHooks', title: 'World events trigger sound cues when sound is on', dom: true, test: async () => { const { createAudio } = await import('../core/audio.js'); const { makeTestCtx } = await import('../windows/_testing.js'); const t = makeTestCtx(); t.ctx.store.set('ui.soundOn', true); const played = []; t.ctx.audio = { play: (n) => played.push(n), ambience() {}, stopAll() {}, unlock() {}, loop() {} }; const canvas = h('canvas', { width: 320, height: 200 }); const host = h('div', { style: { width: '320px', height: '200px', position: 'fixed' } }); document.body.append(canvas, host); const game = startGame(t.ctx, { canvas, overlayHost: host, autoStart: false }); t.ctx.world.emit({ type: 'task_complete', agentId: 'NOVA', text: 'x' }); t.ctx.world.emit({ type: 'level_up', agentId: 'NOVA', text: 'x' }); t.ctx.wm.register({ id: 'tmp', title: 't', render: () => {} }); t.ctx.open('tmp'); const ok = played.includes('reward') && played.includes('levelup') && played.includes('open'); game.dispose(); canvas.remove(); host.remove(); t.done(); return ok; } },
    { id: 'game.hudToggle', title: 'Shift+Z hides the HUD overlay', dom: true, test: async () => { const { t, game, cleanup } = await boot(); t.ctx.keys.handle({ key: 'Z', shiftKey: true }); const hidden = game.overlay.layer.classList.contains('hidden'); t.ctx.keys.handle({ key: 'Z', shiftKey: true }); const shown = !game.overlay.layer.classList.contains('hidden'); cleanup(); return hidden && shown; } },
    { id: 'game.persistPosition', title: 'Player position is remembered between sessions', dom: true, test: async () => { const { t, game, cleanup } = await boot(); game.player.setPosition({ x: 20, z: -10 }); game.state.lastSync = 10; game.tickOnce(0.05); const ok = t.ctx.store.get('ui.playerPos').x === 20; cleanup(); return ok; } }
];
