/**
 * Keybinds: WoW-style single-key window toggles, rebindable and persisted.
 * Typing in an input never triggers a bind (except Escape).
 */
export const DEFAULT_BINDINGS = Object.freeze({
    'window.character': 'C', 'window.crew': 'P', 'window.quests': 'L', 'window.inventory': 'B', 'window.spellbook': 'K', 'window.map': 'M',
    'window.journal': 'J', 'window.codex': 'N', 'window.achievements': 'Y', 'window.jobs': 'O', 'window.settings': 'I', 'window.help': 'F1',
    'window.chat': 'Enter', 'window.market': 'U', 'window.reports': 'R', 'window.checklists': 'H', 'window.commissioning': 'T', 'window.dashboard': 'Shift+D',
    'window.proposal': 'Shift+Q', 'window.serials': 'Shift+S', 'window.dnsp': 'G', 'window.survey': 'V', 'window.schedule': 'Shift+E', 'window.suggestions': 'X', 'window.analytics': 'Shift+A', 'window.notifications': 'Z', 'window.labels': 'Shift+L', 'window.loads': 'Shift+O', 'window.handover': 'Shift+H', 'window.wizard': 'Shift+W',
    'window.business': 'Shift+B', 'window.insights': 'Shift+K', 'window.sites': 'Shift+I', 'window.inbox': 'Shift+N', 'window.finance': 'Shift+F', 'window.calendar': 'Shift+G', 'window.documents': 'Shift+T', 'window.intel': 'Shift+M', 'window.staff': 'Shift+Y',
    'game.interact': 'E', 'game.toggleHud': 'Shift+Z', 'game.resetCamera': 'Shift+C',
    'palette.open': 'Ctrl+K', 'console.open': '/', 'wm.closeTop': 'Escape', 'wm.cycle': 'Tab', 'clock.pause': 'Shift+Space', 'clock.faster': '=', 'clock.slower': '-',
    'hotbar.1': '1', 'hotbar.2': '2', 'hotbar.3': '3', 'hotbar.4': '4', 'hotbar.5': '5', 'hotbar.6': '6', 'hotbar.7': '7', 'hotbar.8': '8', 'hotbar.9': '9',
    'wm.closeAll': 'Shift+Escape', 'selftest.run': 'Ctrl+Shift+T', 'save.now': 'Ctrl+S'
});

const KEY_ALIASES = { ' ': 'Space', esc: 'Escape', return: 'Enter', '+': '=' };

/** Normalise a KeyboardEvent (or a {key, ctrlKey...} literal) into 'Ctrl+Shift+K'. */
export function normalize(event) {
    const parts = [];
    if (event.ctrlKey || event.metaKey) parts.push('Ctrl');
    if (event.altKey) parts.push('Alt');
    let key = String(event.key ?? '');
    key = KEY_ALIASES[key] ?? KEY_ALIASES[key.toLowerCase()] ?? key;
    if (event.shiftKey && (key.length > 1 || /[a-z]/i.test(key))) parts.push('Shift');
    if (key.length === 1) key = key.toUpperCase();
    if (['Control', 'Shift', 'Alt', 'Meta'].includes(key)) return null;
    parts.push(key);
    return parts.join('+');
}

export function isTypingTarget(target) {
    if (!target || !target.tagName) return false;
    const tag = target.tagName.toUpperCase();
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable === true;
}

export class Keybinds {
    constructor({ store = null, bus = null, bindings = {} } = {}) {
        this.store = store;
        this.bus = bus;
        this.bindings = { ...DEFAULT_BINDINGS, ...(store ? store.get('keybinds', {}) : {}), ...bindings };
        this.handlers = new Map();
        this.enabled = true;
    }

    keyFor(action) { return this.bindings[action] ?? null; }
    actionFor(key) { return Object.entries(this.bindings).find(([, k]) => k === key)?.[0] ?? null; }

    bind(action, key) {
        if (!action || !key) return { ok: false, reason: 'Action and key are required' };
        const conflict = this.actionFor(key);
        if (conflict && conflict !== action) return { ok: false, reason: `${key} is already bound to ${conflict}`, conflict };
        this.bindings[action] = key;
        this.persist();
        return { ok: true };
    }

    unbind(action) { delete this.bindings[action]; this.persist(); }
    reset() { this.bindings = { ...DEFAULT_BINDINGS }; this.persist(); }
    persist() { if (this.store) this.store.set('keybinds', { ...this.bindings }); }

    on(action, handler) { this.handlers.set(action, handler); return () => this.handlers.delete(action); }

    conflicts() {
        const byKey = {};
        for (const [action, key] of Object.entries(this.bindings)) (byKey[key] = byKey[key] || []).push(action);
        return Object.entries(byKey).filter(([, list]) => list.length > 1).map(([key, actions]) => ({ key, actions }));
    }

    /** Resolve a keyboard event to an action id (or null) and invoke the handler. */
    handle(event) {
        if (!this.enabled) return null;
        const key = normalize(event);
        if (!key) return null;
        const typing = isTypingTarget(event.target);
        if (typing && key !== 'Escape' && !key.startsWith('Ctrl+')) return null;
        const action = this.actionFor(key);
        if (!action) return null;
        const handler = this.handlers.get(action);
        if (handler) { if (event.preventDefault) event.preventDefault(); handler(action, event); }
        if (this.bus) this.bus.emit('keybind', { action, key });
        return action;
    }

    list() { return Object.entries(this.bindings).map(([action, key]) => ({ action, key, isDefault: DEFAULT_BINDINGS[action] === key })).sort((a, b) => a.action.localeCompare(b.action)); }
}

export const FEATURES = [
    { id: 'core.keys.normalize', title: 'Keyboard event normalisation', test: () => normalize({ key: 'k', ctrlKey: true }) === 'Ctrl+K' && normalize({ key: ' ' }) === 'Space' && normalize({ key: ' ', shiftKey: true }) === 'Shift+Space' && normalize({ key: 'Escape', shiftKey: true }) === 'Shift+Escape' && normalize({ key: 'P', shiftKey: true }) === 'Shift+P' && normalize({ key: '+', shiftKey: true }) === '=' && normalize({ key: 'Shift' }) === null },
    { id: 'core.keys.defaults', title: 'Default WoW-style window bindings', test: () => { const k = new Keybinds(); return k.keyFor('window.character') === 'C' && k.keyFor('window.inventory') === 'B' && k.keyFor('window.map') === 'M' && k.conflicts().length === 0 && !Object.values(DEFAULT_BINDINGS).some((v) => ['W', 'A', 'S', 'D', 'Q', 'E', 'Space'].includes(v) && v !== 'E') && k.keyFor('game.interact') === 'E'; } },
    { id: 'core.keys.handle', title: 'Dispatch key events to actions', test: () => { const k = new Keybinds(); let hit = null; k.on('window.crew', (a) => { hit = a; }); return k.handle({ key: 'p' }) === 'window.crew' && hit === 'window.crew'; } },
    { id: 'core.keys.typingGuard', title: 'Keys ignored while typing (except Escape/Ctrl)', test: () => { const k = new Keybinds(); const input = { tagName: 'INPUT' }; return k.handle({ key: 'p', target: input }) === null && k.handle({ key: 'Escape', target: input }) === 'wm.closeTop' && k.handle({ key: 'k', ctrlKey: true, target: input }) === 'palette.open'; } },
    { id: 'core.keys.rebind', title: 'Rebinding with conflict detection', test: () => { const k = new Keybinds(); const bad = k.bind('window.crew', 'C'); const good = k.bind('window.crew', 'Shift+P'); return !bad.ok && bad.conflict === 'window.character' && good.ok && k.keyFor('window.crew') === 'Shift+P'; } },
    { id: 'core.keys.persist', title: 'Bindings persist through the store', test: () => { const mem = { data: {}, get(p, f) { return this.data[p] ?? f; }, set(p, v) { this.data[p] = v; } }; const k = new Keybinds({ store: mem }); k.bind('window.crew', 'Shift+P'); const k2 = new Keybinds({ store: mem }); return k2.keyFor('window.crew') === 'Shift+P'; } },
    { id: 'core.keys.reset', title: 'Reset to defaults', test: () => { const k = new Keybinds(); k.bind('window.crew', 'Shift+P'); k.reset(); return k.keyFor('window.crew') === 'P'; } },
    { id: 'core.keys.list', title: 'List bindings with default markers', test: () => { const k = new Keybinds(); k.bind('window.crew', 'Shift+P'); const l = k.list(); return l.length > 30 && l.find((b) => b.action === 'window.crew').isDefault === false; } }
];
