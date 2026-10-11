/**
 * Shell: the chrome around the windows – top bar (clock, speed, credits, level),
 * hotbar, micro-menu, minimap, feed/console dock, command palette, keybind
 * wiring, world-event toasts, autosave, theme, session restore and onboarding.
 */
import { h, button, badge, progressBar, toast, richTooltip, replace, dialog, contextMenu } from './core/ui.js';
import { SPEEDS, dayPhase } from './core/clock.js';
import { t, setLocale } from './core/i18n.js';
import * as registry from './core/registry.js';
import { COAST, TASMANIA, project, postcodePosition } from './windows/map.js';
import { makeTestCtx } from './windows/_testing.js';

export const MICRO_MENU = ['character', 'crew', 'quests', 'inventory', 'spellbook', 'wizard', 'map', 'journal', 'codex', 'achievements', 'market', 'settings', 'help'];
export const TOAST_EVENTS = { achievement: 'gold', level_up: 'ok', event: 'warn', task_failed: 'warn', stage_advanced: 'ok', hired: 'ok' };

/** Register every window module's definition with the window manager. */
export function registerWindows(ctx, modules) {
    let n = 0;
    for (const [id, mod] of Object.entries(modules)) {
        if (!id.startsWith('windows/') || typeof mod.def !== 'function') continue;
        const def = mod.def(ctx);
        def.hotkey = ctx.keys.keyFor(`window.${def.id}`) || def.hotkey || null;
        ctx.wm.register(def); n++;
    }
    return n;
}

function svgEl(tag, attrs = {}) { const el = document.createElementNS('http://www.w3.org/2000/svg', tag); for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v); return el; }

/* ---------- top bar ---------- */
export function buildTopbar(ctx, host) {
    const clockEl = h('span', { class: 'clock' });
    const speedEl = h('span', { class: 'speed-controls' });
    const creditsEl = h('span', { class: 'top-stat' }, '💰 ', h('span', { class: 'gold credits' }, '0'));
    const levelEl = h('span', { class: 'top-stat xp-wrap' });
    const eventEl = h('span', { class: 'event-chip hidden' });
    const saveEl = h('span', { class: 'save-state' }, 'saved');
    const brand = h('span', { class: 'brand', tooltip: richTooltip({ title: t('app.title'), lines: [t('app.tagline'), `${registry.count()} registered features`], footer: 'Press F1 for help · Ctrl+K for commands' }) }, '☀ SolarFlow Realm', h('small', {}, 'Workstation'));
    const bell = h('button', { class: 'btn small bell', title: 'Notifications (Z)', onclick: () => ctx.open('notifications') }, '🔔', h('span', { class: 'bell-count hidden' }, '0'));
    replace(host, brand, clockEl, speedEl, creditsEl, levelEl, eventEl, h('span', { class: 'top-spacer' }), saveEl, bell, button('💡', () => ctx.open('suggestions'), { small: true, title: 'Crew suggestions (X)' }), button('🧪', () => ctx.open('selftest'), { small: true, title: 'System check' }), button('❔', () => ctx.open('help'), { small: true, title: 'Help (F1)' }));
    const renderBell = async () => { const { unreadCount } = await import('./windows/notifications.js'); const n = unreadCount(ctx); const el = bell.querySelector('.bell-count'); el.textContent = String(n); el.classList.toggle('hidden', n === 0); };
    renderBell(); ctx.bus.on('world:event', renderBell); ctx.bus.on('notifications:read', renderBell);
    const render = () => {
        const c = ctx.world.clock; const phase = dayPhase(c.hourOfDay);
        replace(clockEl, h('span', { class: 'phase' }, { night: '🌙', dawn: '🌅', day: '☀', dusk: '🌇' }[phase]), `${t('clock.day', { day: c.day })} ${String(c.hourOfDay).padStart(2, '0')}:${String(Math.floor((ctx.world.hour % 1) * 60)).padStart(2, '0')}`);
        document.body.dataset.phase = phase;
        replace(speedEl, SPEEDS.map((s) => h('button', { class: `btn small ${ctx.clock.speed.id === s.id ? 'active' : ''}`, title: s.label, onclick: () => ctx.clock.setSpeed(s.id) }, s.icon)));
        creditsEl.querySelector('.credits').textContent = String(ctx.world.ledger.balance);
        const lvl = ctx.level();
        replace(levelEl, h('span', { tooltip: `${lvl.xp} XP · ${lvl.title}` }, `${t('level')} ${lvl.level}`), progressBar(lvl.pct, { small: true, showValue: false }));
        const ev = ctx.world.activeEvent;
        if (ev && ev.id !== 'quiet_day') { eventEl.textContent = `🌦 ${ev.label}`; eventEl.classList.remove('hidden'); eventEl.title = ev.note; } else eventEl.classList.add('hidden');
        saveEl.textContent = ctx.store.dirty ? 'unsaved' : 'saved'; saveEl.classList.toggle('dirty', Boolean(ctx.store.dirty));
    };
    render();
    ctx.bus.on('clock:tick', render); ctx.bus.on('clock:speed', render); ctx.bus.on('world:event', render); ctx.bus.on('store:saved', render);
    return { el: host, render };
}

/* ---------- hotbar + micro menu ---------- */
export function buildHotbar(ctx, host) {
    const bar = h('div', { class: 'hotbar', role: 'toolbar', 'aria-label': 'Hotbar' });
    const micro = h('div', { class: 'micro-menu', role: 'menubar' });
    replace(host, h('span', { class: 'muted small' }, ''), bar, micro);
    const render = () => {
        const slots = ctx.store.get('ui.hotbar', []);
        replace(bar, Array.from({ length: 9 }, (_, i) => { const id = slots[i]; const def = id && ctx.wm.has(id) ? ctx.wm.defs.get(id) : null; return h('button', { class: `hot-slot ${def ? '' : 'empty'} ${def && ctx.wm.isOpen(def.id) ? 'open' : ''}`, dataset: { slot: i + 1, win: def?.id || '' }, onclick: () => { if (def) ctx.toggle(def.id); }, oncontextmenu: (e) => { e.preventDefault(); contextMenu(e.clientX, e.clientY, [...[...ctx.wm.defs.values()].map((w) => ({ label: `${w.icon} ${w.title}`, run: () => { const next = [...ctx.store.get('ui.hotbar', [])]; while (next.length < 9) next.push(''); next[i] = w.id; ctx.store.set('ui.hotbar', next); ctx.bus.emit('hotbar:updated'); } })), '-', { label: 'Clear slot', run: () => { const next = [...ctx.store.get('ui.hotbar', [])]; while (next.length < 9) next.push(''); next[i] = ''; ctx.store.set('ui.hotbar', next); ctx.bus.emit('hotbar:updated'); } }]); }, tooltip: def ? richTooltip({ title: def.title, lines: [`Hotkey ${def.hotkey || '–'} · slot ${i + 1}`], footer: 'Right-click to assign a window to this slot' }) : `Empty slot ${i + 1}` }, h('span', { class: 'key' }, String(i + 1)), h('span', { class: 'icon' }, def ? def.icon : '·'), h('span', { class: 'label' }, def ? def.title : '')); }));
        replace(micro, MICRO_MENU.filter((id) => ctx.wm.has(id)).map((id) => { const def = ctx.wm.defs.get(id); return h('button', { class: `micro-btn ${ctx.wm.isOpen(id) ? 'open' : ''}`, dataset: { win: id }, onclick: () => ctx.toggle(id), tooltip: richTooltip({ title: def.title, lines: [`Hotkey ${def.hotkey || '–'}`] }) }, def.icon); }));
    };
    render();
    ctx.bus.on('wm:open', render); ctx.bus.on('wm:close', render); ctx.bus.on('wm:minimize', render); ctx.bus.on('hotbar:updated', render);
    return { el: host, render };
}

/* ---------- minimap ---------- */
export function buildMinimap(ctx, host) {
    host.addEventListener('click', () => ctx.open('map'));
    const render = () => {
        if (ctx.store.get('ui.minimap') === false) { host.classList.add('hidden'); return; } host.classList.remove('hidden');
        const svg = svgEl('svg', { viewBox: '0 0 840 700', preserveAspectRatio: 'xMidYMid meet' });
        const path = (pts) => `M${pts.map((p) => project(p).join(',')).join('L')}Z`;
        svg.append(svgEl('path', { d: path(COAST), class: 'land' }), svgEl('path', { d: path(TASMANIA), class: 'land' }));
        for (const job of ctx.jobs()) { const pos = postcodePosition(job.postcode); if (!pos) continue; const [x, y] = project([pos.lon, pos.lat]); svg.append(svgEl('circle', { cx: x, cy: y, r: 14, class: 'pin' })); }
        const home = postcodePosition(ctx.profile().postcode); if (home) { const [x, y] = project([home.lon, home.lat]); svg.append(svgEl('rect', { x: x - 12, y: y - 12, width: 24, height: 24, class: 'home' })); }
        replace(host, svg, h('span', { class: 'mm-label' }, `${ctx.jobs().length} jobs · M`));
    };
    render();
    ctx.bus.on('world:job_created', render); ctx.bus.on('profile:updated', render); ctx.bus.on('settings:updated', render);
    return { el: host, render };
}

/* ---------- dock (feed + console) ---------- */
export function buildDock(ctx, host) {
    const log = h('div', { class: 'dock-log', role: 'log', 'aria-live': 'polite' });
    const input = h('input', { class: 'dock-input', type: 'text', placeholder: '/help for commands · type to chat with the crew', 'aria-label': 'Console' });
    const head = h('div', { class: 'dock-head', onclick: () => { host.classList.toggle('collapsed'); ctx.store.set('ui.chatOpen', !host.classList.contains('collapsed')); } }, h('span', {}, '📡 Crew channel & console'), h('span', { class: 'muted' }, '▾'));
    replace(host, head, log, input);
    if (ctx.store.get('ui.chatOpen') === false) host.classList.add('collapsed');
    const line = (text, cls = '') => { const el = h('div', { class: `dock-line ${cls}` }, text); log.append(el); while (log.children.length > 60) log.firstChild.remove(); log.scrollTop = log.scrollHeight; return el; };
    ctx.bus.on('world:event', (e) => { if (e.type === 'action') return; line(h('span', {}, e.agentId ? h('span', { class: 'who' }, `${ctx.world.agent(e.agentId)?.name || e.agentId}: `) : null, e.text), e.type); });
    ctx.bus.on('error', (e) => line(`Error: ${e.error?.message || e.error}`, 'error'));
    input.addEventListener('keydown', async (e) => {
        if (e.key === 'Escape') { input.blur(); return; }
        if (e.key !== 'Enter') { e.stopPropagation(); return; }
        e.stopPropagation(); const text = input.value.trim(); if (!text) return; input.value = '';
        if (text.startsWith('/')) { line(text, 'console'); const r = await ctx.commands.exec(text); for (const l of String(r.message).split('\n')) line(l, r.ok ? 'console' : 'error'); return; }
        const agent = ctx.world.agent(ctx.store.get('ui.chatAgent')) || ctx.world.agents[0];
        if (!agent) { line('No crew to talk to', 'error'); return; }
        const { reply } = await import('./sim/dialogue.js');
        line(h('span', {}, h('span', { class: 'who' }, `${ctx.profile().name}: `), text));
        agent.remember(`${ctx.profile().name} said: ${text}`, { tags: ['conversation'], importance: 3 });
        const answer = reply(agent, text, { memory: agent.memory, random: ctx.world.random, now: ctx.world.time });
        line(h('span', {}, h('span', { class: 'who' }, `${agent.name}: `), answer));
        ctx.store.push(`chat.${agent.id}`, { from: 'you', text, at: new Date(ctx.now()).toISOString() }, 60); ctx.store.push(`chat.${agent.id}`, { from: agent.id, text: answer, at: new Date(ctx.now()).toISOString() }, 60);
    });
    return { el: host, line, input, focus: () => { host.classList.remove('collapsed'); input.focus(); if (!input.value) input.value = '/'; } };
}

/* ---------- command palette ---------- */
export function buildPalette(ctx) {
    let el = null; let active = 0; let results = [];
    const close = () => { if (el) { el.remove(); el = null; } };
    const open = () => {
        if (el) { el.querySelector('input').focus(); return; }
        const input = h('input', { type: 'text', placeholder: 'Type a command… (windows, time, jobs, save)', 'aria-label': 'Command palette' });
        const list = h('div', { class: 'palette-list', role: 'listbox' });
        const render = () => { results = ctx.commands.search(input.value, 14); active = Math.min(active, Math.max(0, results.length - 1)); replace(list, results.map((c, i) => h('div', { class: `palette-item ${i === active ? 'active' : ''}`, role: 'option', onclick: () => run(c) }, h('span', {}, c.icon || '▸'), h('span', {}, c.title), c.key ? h('span', { class: 'key' }, c.key) : null, h('span', { class: 'cat' }, c.category)))); };
        const run = async (c) => { close(); const r = await ctx.commands.run(c.id); if (r && r.message && !r.ok) toast(r.message, { kind: 'warn' }); };
        input.addEventListener('input', () => { active = 0; render(); });
        input.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Escape') close(); else if (e.key === 'ArrowDown') { active = Math.min(results.length - 1, active + 1); render(); } else if (e.key === 'ArrowUp') { active = Math.max(0, active - 1); render(); } else if (e.key === 'Enter' && results[active]) run(results[active]); });
        el = h('div', { id: 'realm-palette', onclick: (e) => { if (e.target === el) close(); } }, h('div', { class: 'palette' }, input, list));
        document.body.append(el); render(); input.focus();
    };
    return { open, close, get isOpen() { return Boolean(el); } };
}

/* ---------- commands ---------- */
export function registerCommands(ctx, palette, dock) {
    const cmds = [];
    for (const def of ctx.wm.defs.values()) {
        cmds.push({ id: `open-${def.id}`, title: `Open ${def.title}`, category: 'Windows', icon: def.icon, key: def.hotkey, keywords: [def.id, 'window', 'show'], aliases: [def.id], run: () => { ctx.open(def.id); return `Opened ${def.title}`; } });
        cmds.push({ id: `close-${def.id}`, title: `Close ${def.title}`, category: 'Windows', icon: '✕', keywords: [def.id, 'hide'], console: false, run: () => { ctx.wm.close(def.id); return `Closed ${def.title}`; } });
    }
    cmds.push(
        { id: 'open', title: 'Open a window by id', usage: '<window>', category: 'Windows', run: ({ args }) => { const id = String(args[0] || ''); if (!ctx.wm.has(id)) throw new Error(`No window "${id}". Windows: ${[...ctx.wm.defs.keys()].join(', ')}`); ctx.open(id); return `Opened ${id}`; } },
        { id: 'close', title: 'Close a window (or the top one)', usage: '[window|all]', category: 'Windows', run: ({ args }) => { if (args[0] === 'all') { ctx.wm.closeAll(); return 'Closed all'; } if (args[0]) { ctx.wm.close(String(args[0])); return `Closed ${args[0]}`; } ctx.wm.closeTop(); return 'Closed top window'; } },
        { id: 'cascade', title: 'Cascade windows', category: 'Windows', icon: '🗗', run: () => { ctx.wm.cascade(); return 'Cascaded'; } },
        { id: 'tile', title: 'Tile windows', category: 'Windows', icon: '▦', run: () => { ctx.wm.tile(); return 'Tiled'; } },
        { id: 'reset-layout', title: 'Reset window layout', category: 'Windows', run: () => { ctx.wm.resetLayout(); return 'Layout reset'; } },
        { id: 'time', title: 'Set clock speed', usage: '<pause|slow|normal|fast|ultra>', category: 'Clock', icon: '⏱', keywords: ['speed', 'pause', 'clock'], run: ({ args }) => { const s = ctx.clock.setSpeed(String(args[0] || 'normal')); return `Clock: ${s.label}`; } },
        { id: 'pause', title: 'Pause / resume the clock', category: 'Clock', icon: '⏸', key: 'Space', run: () => `Clock: ${ctx.clock.togglePause().label}` },
        { id: 'morning', title: 'Skip to next morning (07:00)', category: 'Clock', icon: '🌅', run: () => { let n = 0; while (ctx.world.clock.hourOfDay !== 7 && n < 48) { ctx.world.tick(0.5); n++; } ctx.saveWorld(); ctx.refresh(); ctx.bus.emit('clock:tick', { clock: ctx.world.clock }); return `It is now ${ctx.world.clock.label}`; } },
        { id: 'skip', title: 'Advance the world by N hours', usage: '<hours>', category: 'Clock', icon: '⏩', run: ({ args }) => { const hours = Math.min(240, Math.max(1, Number(args[0]) || 8)); for (let i = 0; i < hours * 2; i++) ctx.world.tick(0.5); ctx.saveWorld(); ctx.refresh(); ctx.bus.emit('clock:tick', { clock: ctx.world.clock }); return `Advanced ${hours} h`; } },
        { id: 'job', title: 'Create a job', usage: 'new <customer> <kW> [--postcode=NNNN] [--battery=kWh]', category: 'Jobs', icon: '📋', keywords: ['new job', 'customer'], run: ({ args, flags }) => { if (args[0] !== 'new') { ctx.open('jobs', { tab: 'new' }); return 'Opened new job form'; } const job = ctx.world.addJob({ customer: String(args[1] || 'Customer'), systemKw: Number(args[2]) || 6.6, postcode: String(flags.postcode || ctx.profile().postcode), batteryKwh: Number(flags.battery) || 0 }); ctx.setCurrentJob(job.id); ctx.saveWorld(); return `Created ${job.id} for ${job.customer}`; } },
        { id: 'save', title: 'Save now', category: 'Data', icon: '💾', key: 'Ctrl+S', run: () => { ctx.saveWorld(); const ok = ctx.store.flush(); ctx.bus.emit('store:saved'); return ok ? 'Saved' : 'Save failed'; } },
        { id: 'export', title: 'Export backup', category: 'Data', icon: '⬇', run: async () => { const { download } = await import('./core/ui.js'); ctx.saveWorld(); download(`solarflow-realm-${new Date(ctx.now()).toISOString().slice(0, 10)}.json`, ctx.store.export(), 'application/json'); return 'Backup downloaded'; } },
        { id: 'selftest', title: 'Run system check', category: 'System', icon: '🧪', key: 'Ctrl+Shift+T', run: () => { ctx.open('selftest'); return 'Opened system check'; } },
        { id: 'palette', title: 'Command palette', category: 'System', icon: '⌘', key: 'Ctrl+K', console: false, run: () => { palette.open(); } },
        { id: 'locale', title: 'Set language', usage: '<en|de|es|fr|ja|zh>', category: 'System', icon: '🌐', run: ({ args }) => { const id = String(args[0] || 'en'); if (!setLocale(id)) throw new Error(`Unknown locale ${id}`); ctx.store.set('profile.locale', id); ctx.refresh(); return `Locale ${id}`; } },
        { id: 'theme', title: 'Set theme', usage: '<dusk|parchment|obsidian|daylight>', category: 'System', icon: '🎨', run: ({ args }) => { const id = String(args[0] || 'dusk'); ctx.store.set('profile.theme', id); applyTheme(ctx); return `Theme ${id}`; } },
        { id: 'tutorial', title: 'Restart the tutorial', category: 'System', icon: '🚀', run: () => { ctx.store.patch('onboarding', { step: 0, done: false }); showOnboarding(ctx); return 'Tutorial restarted'; } },
        { id: 'stats', title: 'Show world statistics', category: 'System', icon: '📊', run: () => Object.entries(ctx.world.stats).map(([k, v]) => `${k}: ${v}`).join('\n') },
        { id: 'features', title: 'Count registered features', category: 'System', icon: '#', run: () => `${registry.count()} features in ${Object.keys(registry.byModule()).length} modules` }
    );
    return ctx.commands.registerAll(cmds);
}

/* ---------- keybinds ---------- */
export function wireKeybinds(ctx, palette, dock) {
    for (const def of ctx.wm.defs.values()) ctx.keys.on(`window.${def.id}`, () => ctx.toggle(def.id));
    ctx.keys.on('palette.open', () => palette.open());
    ctx.keys.on('console.open', () => dock.focus());
    ctx.keys.on('wm.closeTop', () => { if (palette.isOpen) palette.close(); else ctx.wm.closeTop(); });
    ctx.keys.on('wm.closeAll', () => ctx.wm.closeAll());
    ctx.keys.on('wm.cycle', () => ctx.wm.cycle());
    ctx.keys.on('clock.pause', () => { const s = ctx.clock.togglePause(); toast(s.label, { timeout: 1200 }); });
    ctx.keys.on('clock.faster', () => toast(ctx.clock.faster().label, { timeout: 1200 }));
    ctx.keys.on('clock.slower', () => toast(ctx.clock.slower().label, { timeout: 1200 }));
    for (let i = 1; i <= 9; i++) ctx.keys.on(`hotbar.${i}`, () => { const id = ctx.store.get('ui.hotbar', [])[i - 1]; if (id && ctx.wm.has(id)) ctx.toggle(id); });
    ctx.keys.on('selftest.run', () => ctx.open('selftest'));
    ctx.keys.on('save.now', () => ctx.commands.run('save').then((r) => toast(r.message, { kind: 'ok', timeout: 1200 })));
    const handler = (e) => ctx.keys.handle(e);
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
}

/* ---------- toasts for world events, live refresh ---------- */
export function wireWorldFeedback(ctx) {
    ctx.bus.on('world:event', (e) => { const kind = TOAST_EVENTS[e.type]; if (kind) toast(e.text, { kind, timeout: e.type === 'achievement' ? 6000 : 3500 }); });
    let pending = false;
    ctx.bus.on('clock:tick', () => { if (pending) return; pending = true; setTimeout(() => { pending = false; for (const id of ['dashboard', 'crew', 'quests', 'jobs', 'chat']) if (ctx.wm.isOpen(id)) ctx.wm.refresh(id); }, 900); });
    ctx.bus.on('design:updated', () => { for (const id of ['reports', 'labels', 'jobs']) if (ctx.wm.isOpen(id)) ctx.wm.refresh(id); });
    ctx.bus.on('job:selected', () => { for (const id of ['spellbook', 'checklists', 'commissioning', 'labels', 'loads', 'reports', 'inventory']) if (ctx.wm.isOpen(id)) ctx.wm.refresh(id); });
    ctx.bus.on('products:error', (e) => toast(`Product catalogue unavailable: ${e.error}`, { kind: 'bad', timeout: 8000 }));
    ctx.bus.on('products:loaded', (e) => { if (e.source === 'network') toast(`${e.count.toLocaleString()} CEC products loaded`, { kind: 'ok', timeout: 2500 }); });
}

/* ---------- autosave, theme, session ---------- */
export function startAutosave(ctx, { intervalMs = null, setIntervalFn = (fn, ms) => globalThis.setInterval(fn, ms) } = {}) {
    const ms = intervalMs ?? (ctx.store.get('ui.autosaveSeconds', 15) * 1000);
    const save = () => { ctx.saveWorld(); ctx.store.set('ui.openWindows', ctx.wm.snapshot()); if (ctx.store.flush()) ctx.bus.emit('store:saved'); };
    const id = setIntervalFn(save, ms);
    if (typeof window !== 'undefined') { window.addEventListener('beforeunload', save); document.addEventListener('visibilitychange', () => { if (document.hidden) save(); }); }
    return { stop: () => clearInterval(id), save };
}
export function applyTheme(ctx) { document.body.dataset.theme = ctx.profile().theme || 'dusk'; return document.body.dataset.theme; }
export function restoreSession(ctx) {
    const snap = ctx.store.get('ui.openWindows', []);
    const restored = ctx.wm.restore(snap);
    if (!restored && ctx.store.get('onboarding.done')) ctx.open('dashboard');
    return restored;
}

/* ---------- onboarding ---------- */
export async function showOnboarding(ctx) {
    const p = ctx.profile();
    const name = h('input', { type: 'text', class: 'input', value: p.name === 'Installer' ? '' : p.name, placeholder: 'Your name' });
    const company = h('input', { type: 'text', class: 'input', value: p.company === 'My Solar Co' ? '' : p.company, placeholder: 'Company' });
    const postcode = h('input', { type: 'text', class: 'input', value: p.postcode, placeholder: 'Home postcode', maxlength: 4 });
    const body = h('div', { class: 'onboard' }, h('p', {}, t('onboarding.body')), h('div', { class: 'grid cols-3' }, h('label', { class: 'field' }, h('span', { class: 'field-label' }, 'Name'), name), h('label', { class: 'field' }, h('span', { class: 'field-label' }, 'Company'), company), h('label', { class: 'field' }, h('span', { class: 'field-label' }, 'Postcode'), postcode)),
        h('ul', { class: 'notes' }, h('li', {}, h('b', {}, 'Hotbar 1–9'), ' and letter keys open windows (C character, P crew, O jobs, B products, K calculators, N codex…).'), h('li', {}, h('b', {}, 'Space'), ' runs the world clock; your crew works jobs, rests, learns and remembers.'), h('li', {}, h('b', {}, 'Ctrl+K'), ' opens the command palette; ', h('b', {}, '/'), ' the console; ', h('b', {}, 'F1'), ' help.')));
    const choice = await dialog({ title: t('onboarding.title'), body, buttons: [{ id: 'skip', label: 'Skip' }, { id: 'start', label: 'Start', primary: true }], closeOnBackdrop: false });
    if (choice === 'start') { ctx.store.patch('profile', { name: name.value.trim() || p.name, company: company.value.trim() || p.company, postcode: /^\d{4}$/.test(postcode.value) ? postcode.value : p.postcode }); ctx.bus.emit('profile:updated', ctx.profile()); }
    ctx.store.patch('onboarding', { done: true, step: 1 });
    ctx.open('dashboard'); ctx.open('help', { tab: 'start' });
    return choice;
}

/* ---------- mount everything ---------- */
export function mountShell(ctx, { top, bottom, minimap, dock: dockHost }) {
    applyTheme(ctx);
    const topbar = buildTopbar(ctx, top);
    const hotbar = buildHotbar(ctx, bottom);
    const minimapEl = buildMinimap(ctx, minimap);
    const dock = buildDock(ctx, dockHost);
    const palette = buildPalette(ctx);
    registerCommands(ctx, palette, dock);
    const unwire = wireKeybinds(ctx, palette, dock);
    wireWorldFeedback(ctx);
    ctx.bus.on('profile:updated', () => { applyTheme(ctx); topbar.render(); });
    ctx.bus.on('settings:updated', () => { minimapEl.render(); if (ctx.store.get('ui.chatOpen') === false) dockHost.classList.add('collapsed'); else dockHost.classList.remove('collapsed'); });
    window.addEventListener('error', (e) => ctx.bus.emit('error', { source: 'window', error: e.error || new Error(e.message) }));
    window.addEventListener('unhandledrejection', (e) => ctx.bus.emit('error', { source: 'promise', error: e.reason }));
    return { topbar, hotbar, minimap: minimapEl, dock, palette, unwire };
}

/* ---------- self-tests ---------- */
const hosts = () => { const top = h('header'); const bottom = h('footer'); const minimap = h('div'); const dock = h('div'); document.body.append(top, bottom, minimap, dock); return { top, bottom, minimap, dock, remove: () => { top.remove(); bottom.remove(); minimap.remove(); dock.remove(); } }; };
const withWindows = async (t) => { const { loadAll } = await import('./modules.js'); const modules = await loadAll(); registerWindows(t.ctx, modules); };

export const FEATURES = [
    { id: 'shell.registerWindows', title: 'All window modules register with the window manager', dom: true, test: async () => { const t = makeTestCtx(); await withWindows(t); const ok = t.ctx.wm.defs.size >= 21 && t.ctx.wm.defs.get('crew').hotkey === 'P'; t.done(); return ok; } },
    { id: 'shell.topbar', title: 'Top bar shows clock, speed, credits and level', dom: true, test: () => { const t = makeTestCtx(); const hh = hosts(); const tb = buildTopbar(t.ctx, hh.top); const ok = /Day 1/.test(hh.top.textContent) && hh.top.querySelectorAll('.speed-controls .btn').length === 5 && hh.top.querySelector('.credits').textContent === '100' && /Level 1/.test(hh.top.textContent); t.ctx.clock.setSpeed('fast'); const active = hh.top.querySelector('.speed-controls .btn.active').title.startsWith('Fast'); hh.remove(); t.done(); return ok && active; } },
    { id: 'shell.bell', title: 'Notification bell shows the unread count', dom: true, test: async () => { const t = makeTestCtx(); const hh = hosts(); buildTopbar(t.ctx, hh.top); t.ctx.world.emit({ type: 'achievement', text: 'x' }); await new Promise((r) => setTimeout(r, 20)); const el = hh.top.querySelector('.bell-count'); const ok = !el.classList.contains('hidden') && Number(el.textContent) >= 2; t.ctx.store.set('ui.readAt', t.ctx.world.time); t.ctx.bus.emit('notifications:read'); await new Promise((r) => setTimeout(r, 20)); const cleared = el.classList.contains('hidden'); hh.remove(); t.done(); return ok && cleared; } },
    { id: 'shell.dayPhase', title: 'Backdrop phase follows the world clock', dom: true, test: () => { const t = makeTestCtx(); const hh = hosts(); buildTopbar(t.ctx, hh.top); const before = document.body.dataset.phase; t.ctx.world.tick(14); t.ctx.bus.emit('clock:tick', {}); const after = document.body.dataset.phase; hh.remove(); t.done(); return before === 'day' && after === 'night'; } },
    { id: 'shell.hotbar', title: 'Nine-slot hotbar toggles windows and highlights open ones', dom: true, test: async () => { const t = makeTestCtx(); await withWindows(t); const hh = hosts(); buildHotbar(t.ctx, hh.bottom); const slots = hh.bottom.querySelectorAll('.hot-slot'); slots[1].click(); const ok = slots.length === 9 && t.ctx.wm.isOpen('jobs') && hh.bottom.querySelector('.hot-slot[data-win=jobs]').classList.contains('open'); hh.remove(); t.done(); return ok; } },
    { id: 'shell.hotbarAssign', title: 'Right-click a hotbar slot to assign a window', dom: true, test: async () => { const t = makeTestCtx(); await withWindows(t); const hh = hosts(); buildHotbar(t.ctx, hh.bottom); hh.bottom.querySelectorAll('.hot-slot')[8].dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 10, clientY: 10 })); const item = [...document.querySelectorAll('#realm-menus .menu-item')].find((x) => /Map/.test(x.textContent)); item.click(); const ok = t.ctx.store.get('ui.hotbar')[8] === 'map' && hh.bottom.querySelector('.hot-slot[data-slot="9"]').dataset.win === 'map'; hh.remove(); t.done(); return ok; } },
    { id: 'shell.microMenu', title: 'Micro-menu buttons for the main windows', dom: true, test: async () => { const t = makeTestCtx(); await withWindows(t); const hh = hosts(); buildHotbar(t.ctx, hh.bottom); const btns = hh.bottom.querySelectorAll('.micro-btn'); btns[0].click(); const ok = btns.length === MICRO_MENU.length && t.ctx.wm.isOpen('character'); hh.remove(); t.done(); return ok; } },
    { id: 'shell.minimap', title: 'Minimap draws jobs and home and opens the map', dom: true, test: async () => { const t = makeTestCtx(); await withWindows(t); const hh = hosts(); buildMinimap(t.ctx, hh.minimap); const pins = hh.minimap.querySelectorAll('.pin').length; hh.minimap.click(); const ok = pins === 1 && hh.minimap.querySelector('.home') && t.ctx.wm.isOpen('map'); hh.remove(); t.done(); return Boolean(ok); } },
    { id: 'shell.dockFeed', title: 'Dock shows crew events as they happen', dom: true, test: () => { const t = makeTestCtx(); const hh = hosts(); buildDock(t.ctx, hh.dock); t.ctx.world.emit({ type: 'task_complete', agentId: 'NOVA', text: 'Nova completed sizing' }); const ok = /Nova: Nova completed sizing/.test(hh.dock.querySelector('.dock-log').textContent); hh.remove(); t.done(); return ok; } },
    { id: 'shell.dockConsole', title: 'Console runs slash commands from the dock', dom: true, test: async () => { const t = makeTestCtx(); await withWindows(t); const hh = hosts(); const dock = buildDock(t.ctx, hh.dock); registerCommands(t.ctx, buildPalette(t.ctx), dock); dock.input.value = '/time fast'; dock.input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' })); await new Promise((r) => setTimeout(r, 20)); const ok = t.ctx.clock.speed.id === 'fast' && /Clock: Fast/.test(hh.dock.textContent); hh.remove(); t.done(); return ok; } },
    { id: 'shell.dockChat', title: 'Plain text in the dock talks to the crew', dom: true, test: async () => { const t = makeTestCtx(); const hh = hosts(); const dock = buildDock(t.ctx, hh.dock); dock.input.value = 'how are you'; dock.input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' })); await new Promise((r) => setTimeout(r, 30)); const ok = /Atlas: /.test(hh.dock.textContent) && t.ctx.store.get('chat.ATLAS').length === 2; hh.remove(); t.done(); return ok; } },
    { id: 'shell.palette', title: 'Command palette searches and runs commands', dom: true, test: async () => { const t = makeTestCtx(); await withWindows(t); const palette = buildPalette(t.ctx); registerCommands(t.ctx, palette, { focus() {} }); palette.open(); const input = document.querySelector('#realm-palette input'); input.value = 'open crew'; input.dispatchEvent(new Event('input')); const first = document.querySelector('#realm-palette .palette-item.active').textContent; input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' })); await new Promise((r) => setTimeout(r, 20)); const ok = /Open Crew/.test(first) && t.ctx.wm.isOpen('crew') && !palette.isOpen; palette.close(); t.done(); return ok; } },
    { id: 'shell.commands', title: 'Built-in commands (job new, skip, stats, features)', dom: true, test: async () => { const t = makeTestCtx(); await withWindows(t); registerCommands(t.ctx, buildPalette(t.ctx), { focus() {} }); const a = await t.ctx.commands.exec('/job new Ada 5 --postcode=3000 --battery=10'); const b = await t.ctx.commands.exec('/skip 4'); const hourAfterSkip = t.ctx.world.hour; const c = await t.ctx.commands.exec('/features'); const d = await t.ctx.commands.exec('/open nope'); const m = await t.ctx.commands.exec('/morning'); if (!m.ok || t.ctx.world.clock.hourOfDay !== 7) return false; const ok = a.ok && t.ctx.jobs().length === 2 && t.ctx.jobs()[1].batteryKwh === 10 && b.ok && hourAfterSkip === 4 && /features in/.test(c.message) && !d.ok; t.done(); return ok; } },
    { id: 'shell.keybinds', title: 'Keyboard toggles windows, pauses the clock and cycles', dom: true, test: async () => { const t = makeTestCtx(); await withWindows(t); const unwire = wireKeybinds(t.ctx, buildPalette(t.ctx), { focus() {} }); window.dispatchEvent(new KeyboardEvent('keydown', { key: 'p' })); const opened = t.ctx.wm.isOpen('crew'); window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' })); const paused = t.ctx.clock.isPaused; window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); const closed = !t.ctx.wm.isOpen('crew'); unwire(); t.done(); return opened && paused && closed; } },
    { id: 'shell.hotbarKeys', title: 'Number keys trigger hotbar slots', dom: true, test: async () => { const t = makeTestCtx(); await withWindows(t); const unwire = wireKeybinds(t.ctx, buildPalette(t.ctx), { focus() {} }); window.dispatchEvent(new KeyboardEvent('keydown', { key: '1' })); const ok = t.ctx.wm.isOpen('dashboard'); unwire(); t.done(); return ok; } },
    { id: 'shell.eventToasts', title: 'Achievements and level-ups raise toasts', dom: true, test: () => { const t = makeTestCtx(); wireWorldFeedback(t.ctx); const before = document.querySelectorAll('#realm-toasts .toast').length; t.ctx.world.emit({ type: 'achievement', text: 'Achievement unlocked: test' }); const ok = document.querySelectorAll('#realm-toasts .toast').length === before + 1; t.done(); return ok; } },
    { id: 'shell.autosave', title: 'Autosave persists world and open windows', dom: true, test: async () => { const t = makeTestCtx(); await withWindows(t); t.ctx.open('crew'); let fn = null; const auto = startAutosave(t.ctx, { setIntervalFn: (f) => { fn = f; return 1; } }); fn(); const ok = t.ctx.store.get('ui.openWindows').some((w) => w.id === 'crew') && t.ctx.store.get('world').jobs.length === 1 && !t.ctx.store.dirty; auto.stop(); t.done(); return ok; } },
    { id: 'shell.restoreSession', title: 'Reopens the windows from the last session', dom: true, test: async () => { const t = makeTestCtx(); await withWindows(t); t.ctx.store.set('ui.openWindows', [{ id: 'codex', tab: 'search' }, { id: 'quests' }]); const n = restoreSession(t.ctx); const ok = n === 2 && t.ctx.wm.isOpen('codex') && t.ctx.wm.windows.get('codex').tab === 'search'; t.done(); return ok; } },
    { id: 'shell.theme', title: 'Themes apply to the document', dom: true, test: () => { const t = makeTestCtx(); t.ctx.store.set('profile.theme', 'parchment'); const ok = applyTheme(t.ctx) === 'parchment' && document.body.dataset.theme === 'parchment'; t.ctx.store.set('profile.theme', 'dusk'); applyTheme(t.ctx); t.done(); return ok; } },
    { id: 'shell.onboarding', title: 'First-run onboarding captures profile and opens the dashboard', dom: true, test: async () => { const t = makeTestCtx(); await withWindows(t); const p = showOnboarding(t.ctx); await new Promise((r) => setTimeout(r, 10)); const inputs = document.querySelectorAll('#realm-dialogs .onboard input'); inputs[0].value = 'Ada'; inputs[1].value = 'Sunworks'; inputs[2].value = '4000'; document.querySelector('#realm-dialogs .dialog-buttons .primary').click(); const choice = await p; const ok = choice === 'start' && t.ctx.profile().name === 'Ada' && t.ctx.profile().postcode === '4000' && t.ctx.store.get('onboarding.done') === true && t.ctx.wm.isOpen('dashboard') && t.ctx.wm.isOpen('help'); t.done(); return ok; } }
];
