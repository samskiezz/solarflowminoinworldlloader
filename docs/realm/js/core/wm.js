/**
 * Window manager: draggable, resizable, tabbed windows with z-ordering,
 * minimise/maximise, viewport clamping, persisted geometry and a taskbar
 * feed through the bus. Modelled on the WoW/Elder-Scrolls frame system:
 * one hotkey toggles one window, Escape closes the top-most.
 */
import { h, clear, replace, contextMenu } from './ui.js';

export const DEFAULT_GEOMETRY = { x: 120, y: 80, w: 720, h: 480 };

export function clampRect(rect, viewport, minVisible = 40) {
    const w = Math.max(240, Math.min(rect.w, viewport.w));
    const hh = Math.max(120, Math.min(rect.h, viewport.h));
    const x = Math.min(Math.max(rect.x, minVisible - w), viewport.w - minVisible);
    const y = Math.min(Math.max(rect.y, 0), viewport.h - minVisible);
    return { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(hh) };
}

export function cascadeRects(count, viewport, size = { w: 720, h: 480 }, step = 32) {
    return Array.from({ length: count }, (_, i) => clampRect({ x: 80 + i * step, y: 60 + i * step, ...size }, viewport));
}

export function tileRects(count, viewport, gap = 8) {
    if (count === 0) return [];
    const cols = Math.ceil(Math.sqrt(count));
    const rows = Math.ceil(count / cols);
    const w = Math.floor((viewport.w - gap * (cols + 1)) / cols);
    const hh = Math.floor((viewport.h - gap * (rows + 1)) / rows);
    return Array.from({ length: count }, (_, i) => ({ x: gap + (i % cols) * (w + gap), y: gap + Math.floor(i / cols) * (hh + gap), w, h: hh }));
}

export class WindowManager {
    constructor({ root, store = null, bus = null, viewport = null }) {
        this.root = root;
        this.store = store;
        this.bus = bus;
        this.defs = new Map();
        this.windows = new Map();
        this.z = 10;
        this.viewportFn = viewport || (() => ({ w: root.clientWidth || window.innerWidth, h: root.clientHeight || window.innerHeight }));
    }

    register(def) {
        if (!def.id || typeof def.render !== 'function') throw new Error('window def needs id and render()');
        this.defs.set(def.id, { width: DEFAULT_GEOMETRY.w, height: DEFAULT_GEOMETRY.h, resizable: true, ...def });
        return def.id;
    }
    has(id) { return this.defs.has(id); }
    list() { return [...this.defs.values()].map((d) => ({ id: d.id, title: d.title, icon: d.icon, open: this.isOpen(d.id) })); }
    isOpen(id) { return this.windows.has(id) && !this.windows.get(id).minimized; }
    openIds() { return [...this.windows.keys()]; }

    geometry(id) {
        const saved = this.store ? this.store.get(`ui.windows.${id}`) : null;
        const def = this.defs.get(id);
        const count = this.windows.size;
        const base = saved && Number.isFinite(saved.x) ? saved : { x: 100 + (count % 6) * 36, y: 70 + (count % 6) * 30, w: def.width, h: def.height };
        return clampRect({ ...base, w: saved?.w ?? def.width, h: saved?.h ?? def.height }, this.viewportFn());
    }
    saveGeometry(id) {
        const win = this.windows.get(id);
        if (!win || !this.store) return;
        this.store.patch(`ui.windows.${id}`, { x: win.rect.x, y: win.rect.y, w: win.rect.w, h: win.rect.h, tab: win.tab });
    }

    open(id, options = {}) {
        const def = this.defs.get(id);
        if (!def) return null;
        if (this.windows.has(id)) { const win = this.windows.get(id); win.minimized = false; win.el.classList.remove('minimized'); this.focus(id); if (options.tab) this.setTab(id, options.tab); if (options.refresh !== false) this.refresh(id); return win; }
        const rect = this.geometry(id);
        const saved = this.store ? this.store.get(`ui.windows.${id}`, {}) : {};
        const win = { id, def, rect, minimized: false, maximized: false, tab: options.tab || saved.tab || (def.tabs ? def.tabs[0].id : null), el: null, body: null, context: options.context || {} };
        win.el = this.buildFrame(win);
        this.root.append(win.el);
        this.windows.set(id, win);
        this.applyRect(win);
        this.focus(id);
        this.refresh(id);
        if (this.bus) this.bus.emit('wm:open', { id, title: def.title });
        if (def.onOpen) def.onOpen(win);
        return win;
    }

    buildFrame(win) {
        const { def } = win;
        const titlebar = h('div', { class: 'win-title', onpointerdown: (e) => this.startDrag(win, e), ondblclick: () => this.toggleMaximize(win.id), oncontextmenu: (e) => { e.preventDefault(); contextMenu(e.clientX, e.clientY, [{ label: 'Minimise', run: () => this.minimize(win.id) }, { label: win.maximized ? 'Restore' : 'Maximise', run: () => this.toggleMaximize(win.id) }, { label: 'Close', hint: 'Esc', run: () => this.close(win.id) }, { label: 'Close others', run: () => { for (const id of [...this.windows.keys()]) if (id !== win.id) this.close(id); } }, '-', { label: 'Cascade all', run: () => this.cascade() }, { label: 'Tile all', run: () => this.tile() }]); } },
            h('span', { class: 'win-icon' }, def.icon || '▣'),
            h('span', { class: 'win-name' }, def.title),
            def.hotkey ? h('span', { class: 'win-key' }, def.hotkey) : null,
            h('span', { class: 'win-buttons' },
                h('button', { class: 'win-btn', title: 'Minimise', onclick: (e) => { e.stopPropagation(); this.minimize(win.id); } }, '–'),
                h('button', { class: 'win-btn', title: 'Maximise', onclick: (e) => { e.stopPropagation(); this.toggleMaximize(win.id); } }, '▢'),
                h('button', { class: 'win-btn close', title: 'Close (Esc)', onclick: (e) => { e.stopPropagation(); this.close(win.id); } }, '✕')));
        const tabstrip = def.tabs ? h('div', { class: 'win-tabs', role: 'tablist' }) : null;
        win.body = h('div', { class: 'win-body' });
        const resize = def.resizable ? h('div', { class: 'win-resize', onpointerdown: (e) => this.startResize(win, e) }) : null;
        const el = h('section', { class: `win win-${def.id}`, role: 'dialog', 'aria-label': def.title, dataset: { win: def.id }, onpointerdown: () => this.focus(win.id) }, titlebar, tabstrip, win.body, resize);
        win.tabstrip = tabstrip;
        return el;
    }

    renderTabs(win) {
        if (!win.tabstrip) return;
        replace(win.tabstrip, win.def.tabs.map((t) => h('button', { class: `win-tab ${t.id === win.tab ? 'active' : ''}`, role: 'tab', onclick: () => this.setTab(win.id, t.id) }, t.icon ? h('span', { class: 'tab-icon' }, t.icon) : null, t.label)));
    }

    setTab(id, tabId) {
        const win = this.windows.get(id);
        if (!win || !win.def.tabs || !win.def.tabs.find((t) => t.id === tabId)) return false;
        win.tab = tabId;
        this.saveGeometry(id);
        this.refresh(id);
        if (this.bus) this.bus.emit('wm:tab', { id, tab: tabId });
        return true;
    }

    /** Re-render a window's body (called after state changes). */
    refresh(id) {
        const win = this.windows.get(id);
        if (!win) return false;
        this.renderTabs(win);
        clear(win.body);
        try {
            const scroll = win.body.scrollTop;
            win.def.render(win.body, { tab: win.tab, win, wm: this, ...win.context });
            win.body.scrollTop = scroll;
        } catch (error) {
            win.body.append(h('div', { class: 'error' }, `Window failed to render: ${error.message}`));
            if (this.bus) this.bus.emit('error', { source: `window:${id}`, error });
        }
        return true;
    }
    refreshAll() { for (const id of this.windows.keys()) this.refresh(id); }

    close(id) {
        const win = this.windows.get(id);
        if (!win) return false;
        this.saveGeometry(id);
        if (win.def.onClose) win.def.onClose(win);
        win.el.remove();
        this.windows.delete(id);
        if (this.bus) this.bus.emit('wm:close', { id });
        return true;
    }
    closeAll() { for (const id of [...this.windows.keys()]) this.close(id); }
    closeTop() { const top = this.topWindow(); if (top) return this.close(top.id); return false; }
    toggle(id, options) { if (this.isOpen(id)) { this.close(id); return false; } this.open(id, options); return true; }

    topWindow() {
        let best = null;
        for (const win of this.windows.values()) if (!win.minimized && (!best || win.zIndex > best.zIndex)) best = win;
        return best;
    }
    focus(id) {
        const win = this.windows.get(id);
        if (!win) return;
        win.zIndex = ++this.z;
        win.el.style.zIndex = String(win.zIndex);
        for (const other of this.windows.values()) other.el.classList.toggle('focused', other === win);
        if (this.bus) this.bus.emit('wm:focus', { id });
    }
    cycle() {
        const open = [...this.windows.values()].filter((w) => !w.minimized).sort((a, b) => a.zIndex - b.zIndex);
        if (open.length < 2) return open[0]?.id ?? null;
        this.focus(open[0].id);
        return open[0].id;
    }
    minimize(id) { const win = this.windows.get(id); if (!win) return; win.minimized = true; win.el.classList.add('minimized'); if (this.bus) this.bus.emit('wm:minimize', { id }); }
    toggleMaximize(id) {
        const win = this.windows.get(id);
        if (!win) return;
        if (win.maximized) { win.rect = win.restoreRect; win.maximized = false; }
        else { win.restoreRect = { ...win.rect }; const v = this.viewportFn(); win.rect = { x: 0, y: 0, w: v.w, h: v.h }; win.maximized = true; }
        win.el.classList.toggle('maximized', win.maximized);
        this.applyRect(win);
    }
    applyRect(win) {
        Object.assign(win.el.style, { left: `${win.rect.x}px`, top: `${win.rect.y}px`, width: `${win.rect.w}px`, height: `${win.rect.h}px` });
    }
    move(id, x, y) { const win = this.windows.get(id); if (!win) return; win.rect = clampRect({ ...win.rect, x, y }, this.viewportFn()); this.applyRect(win); this.saveGeometry(id); }
    resize(id, w, hh) { const win = this.windows.get(id); if (!win) return; win.rect = clampRect({ ...win.rect, w, h: hh }, this.viewportFn()); this.applyRect(win); this.saveGeometry(id); }

    startDrag(win, e) {
        if (e.target.closest('.win-btn') || win.maximized) return;
        const start = { x: e.clientX, y: e.clientY, rx: win.rect.x, ry: win.rect.y };
        const onMove = (ev) => { win.rect = clampRect({ ...win.rect, x: start.rx + ev.clientX - start.x, y: start.ry + ev.clientY - start.y }, this.viewportFn()); this.applyRect(win); };
        const onUp = () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); win.el.classList.remove('dragging'); this.saveGeometry(win.id); };
        win.el.classList.add('dragging');
        window.addEventListener('pointermove', onMove); window.addEventListener('pointerup', onUp);
        e.preventDefault();
    }
    startResize(win, e) {
        const start = { x: e.clientX, y: e.clientY, w: win.rect.w, h: win.rect.h };
        const onMove = (ev) => { win.rect = clampRect({ ...win.rect, w: start.w + ev.clientX - start.x, h: start.h + ev.clientY - start.y }, this.viewportFn()); this.applyRect(win); };
        const onUp = () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); this.saveGeometry(win.id); if (this.bus) this.bus.emit('wm:resize', { id: win.id, rect: win.rect }); };
        window.addEventListener('pointermove', onMove); window.addEventListener('pointerup', onUp);
        e.preventDefault(); e.stopPropagation();
    }

    cascade() { const ids = [...this.windows.keys()]; const rects = cascadeRects(ids.length, this.viewportFn()); ids.forEach((id, i) => { const win = this.windows.get(id); win.rect = rects[i]; win.maximized = false; this.applyRect(win); this.saveGeometry(id); }); }
    tile() { const ids = [...this.windows.keys()]; const rects = tileRects(ids.length, this.viewportFn()); ids.forEach((id, i) => { const win = this.windows.get(id); win.rect = rects[i]; win.maximized = false; this.applyRect(win); this.saveGeometry(id); }); }
    resetLayout() { if (this.store) this.store.set('ui.windows', {}); this.cascade(); }

    /** Session restore: reopen the windows that were open when the page last closed. */
    snapshot() { return [...this.windows.values()].filter((w) => !w.minimized).map((w) => ({ id: w.id, tab: w.tab })); }
    restore(snapshot = []) { for (const item of snapshot) if (this.defs.has(item.id)) this.open(item.id, { tab: item.tab }); return this.windows.size; }
}

const viewport = { w: 1280, h: 800 };
const makeWm = () => { const root = document.createElement('div'); document.body.append(root); const wm = new WindowManager({ root, viewport: () => viewport }); wm.register({ id: 't1', title: 'One', render: (b) => b.append('one'), tabs: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }] }); wm.register({ id: 't2', title: 'Two', render: (b, ctx) => b.append(`two:${ctx.tab}`) }); return { wm, root }; };

export const FEATURES = [
    { id: 'core.wm.clamp', title: 'Windows clamp to the viewport', test: () => { const r = clampRect({ x: -5000, y: -50, w: 5000, h: 5000 }, viewport); return r.x === -1240 && r.y === 0 && r.w === 1280 && r.h === 800; } },
    { id: 'core.wm.cascade', title: 'Cascade layout algorithm', test: () => { const r = cascadeRects(3, viewport); return r.length === 3 && r[1].x === r[0].x + 32 && r[2].y === r[0].y + 64; } },
    { id: 'core.wm.tile', title: 'Tile layout algorithm', test: () => { const r = tileRects(4, viewport); return r.length === 4 && r[0].w === r[3].w && r[3].x > r[2].x && r[2].y > r[0].y; } },
    { id: 'core.wm.openClose', title: 'Open, toggle and close windows', dom: true, test: () => { const { wm, root } = makeWm(); wm.open('t1'); const opened = wm.isOpen('t1') && root.querySelector('.win-t1 .win-body').textContent === 'one'; const toggled = wm.toggle('t1') === false && !wm.isOpen('t1'); root.remove(); return opened && toggled; } },
    { id: 'core.wm.zOrder', title: 'Focus brings a window to the front', dom: true, test: () => { const { wm, root } = makeWm(); wm.open('t1'); wm.open('t2'); const a = wm.topWindow().id === 't2'; wm.focus('t1'); const b = wm.topWindow().id === 't1'; root.remove(); return a && b; } },
    { id: 'core.wm.tabs', title: 'Window tabs re-render the body', dom: true, test: () => { const { wm, root } = makeWm(); wm.open('t1'); const ok = wm.setTab('t1', 'b') && wm.windows.get('t1').tab === 'b' && root.querySelector('.win-tab.active').textContent === 'B' && !wm.setTab('t1', 'zzz'); root.remove(); return ok; } },
    { id: 'core.wm.minMax', title: 'Minimise and maximise', dom: true, test: () => { const { wm, root } = makeWm(); wm.open('t2'); wm.toggleMaximize('t2'); const max = wm.windows.get('t2').rect.w === 1280; wm.toggleMaximize('t2'); const restored = wm.windows.get('t2').rect.w === 720; wm.minimize('t2'); const min = !wm.isOpen('t2') && wm.windows.has('t2'); root.remove(); return max && restored && min; } },
    { id: 'core.wm.moveResize', title: 'Programmatic move/resize with clamping', dom: true, test: () => { const { wm, root } = makeWm(); wm.open('t2'); wm.move('t2', 9999, 9999); const r = wm.windows.get('t2').rect; wm.resize('t2', 100, 100); const r2 = wm.windows.get('t2').rect; root.remove(); return r.x === 1240 && r.y === 760 && r2.w === 240 && r2.h === 120; } },
    { id: 'core.wm.closeTop', title: 'Escape closes the top-most window', dom: true, test: () => { const { wm, root } = makeWm(); wm.open('t1'); wm.open('t2'); wm.closeTop(); const ok = wm.isOpen('t1') && !wm.isOpen('t2'); wm.closeAll(); const none = wm.openIds().length === 0; root.remove(); return ok && none; } },
    { id: 'core.wm.layouts', title: 'Cascade/tile all open windows', dom: true, test: () => { const { wm, root } = makeWm(); wm.open('t1'); wm.open('t2'); wm.tile(); const t = wm.windows.get('t1').rect.w === wm.windows.get('t2').rect.w; wm.cascade(); const c = wm.windows.get('t2').rect.x === wm.windows.get('t1').rect.x + 32; root.remove(); return t && c; } },
    { id: 'core.wm.snapshot', title: 'Session restore of open windows', dom: true, test: () => { const { wm, root } = makeWm(); wm.open('t1', { tab: 'b' }); const snap = wm.snapshot(); wm.closeAll(); wm.restore(snap); const ok = wm.isOpen('t1') && wm.windows.get('t1').tab === 'b'; root.remove(); return ok; } },
    { id: 'core.wm.cycle', title: 'Tab cycles focus through windows', dom: true, test: () => { const { wm, root } = makeWm(); wm.open('t1'); wm.open('t2'); const id = wm.cycle(); root.remove(); return id === 't1' && wm.topWindow().id === 't1'; } },
    { id: 'core.wm.contextMenu', title: 'Title-bar context menu (close others, cascade, tile)', dom: true, test: () => { const { wm, root } = makeWm(); wm.open('t1'); wm.open('t2'); root.querySelector('.win-t2 .win-title').dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 5, clientY: 5 })); const item = [...document.querySelectorAll('#realm-menus .menu-item')].find((x) => x.textContent === 'Close others'); item.click(); const ok = wm.isOpen('t2') && !wm.isOpen('t1'); root.remove(); return ok; } },
    { id: 'core.wm.renderErrorIsolation', title: 'A crashing window shows an error instead of breaking the shell', dom: true, test: () => { const { wm, root } = makeWm(); wm.register({ id: 'bad', title: 'Bad', render: () => { throw new Error('nope'); } }); wm.open('bad'); const ok = root.querySelector('.win-bad .error') !== null; root.remove(); return ok; } }
];
