/** Settings: general, keybinds (rebind by pressing a key), hotbar layout, data backup/restore. */
import { h, button, badge, toast, confirm, download, dataTable } from '../core/ui.js';
import { SPEEDS } from '../core/clock.js';
import { DEFAULT_BINDINGS, normalize } from '../core/keybinds.js';
import { LOCALES, setLocale } from '../core/i18n.js';
import { THEMES } from './character.js';
import { section, grid, row, statCard, form } from './_shared.js';
import { makeTestCtx, openWindow, q, qa, fire } from './_testing.js';

export const HOTBAR_CHOICES = ['dashboard', 'jobs', 'crew', 'quests', 'inventory', 'spellbook', 'codex', 'checklists', 'commissioning', 'labels', 'loads', 'reports', 'map', 'journal', 'chat', 'market', 'achievements', 'character', 'settings', 'help', 'selftest'];

export function def(ctx) {
    return {
        id: 'settings', title: ctx.t('nav.settings'), icon: '⚙', hotkey: 'I', width: 820, height: 600,
        tabs: [{ id: 'general', label: 'General', icon: '⚙' }, { id: 'keys', label: 'Keybinds', icon: '⌨' }, { id: 'hotbar', label: 'Hotbar', icon: '▦' }, { id: 'data', label: 'Data', icon: '💾' }],
        render(body, { tab }) { ({ keys: renderKeys, hotbar: renderHotbar, data: renderData }[tab] || renderGeneral)(body, ctx); }
    };
}

function renderGeneral(body, ctx) {
    const ui = ctx.store.get('ui'); const p = ctx.profile();
    const f = form([
        { key: 'speed', label: 'Default clock speed', type: 'select', options: SPEEDS.map((s) => ({ value: s.id, label: s.label })), value: ui.speed },
        { key: 'locale', label: 'Language', type: 'select', options: LOCALES.map((l) => ({ value: l.id, label: l.label })), value: p.locale },
        { key: 'theme', label: 'Theme', type: 'select', options: THEMES.map((t) => ({ value: t.id, label: t.label })), value: p.theme },
        { key: 'minimap', label: 'Show minimap', type: 'checkbox', value: ui.minimap !== false }, { key: 'chatOpen', label: 'Show crew feed dock', type: 'checkbox', value: ui.chatOpen !== false }, { key: 'soundOn', label: 'Sound cues', type: 'checkbox', value: Boolean(ui.soundOn) },
        { key: 'autosaveSeconds', label: 'Autosave interval (s)', value: ui.autosaveSeconds ?? 15, min: 5, step: 5 }, { key: 'llmEndpoint', label: 'LLM endpoint (optional)', type: 'text', value: ui.llmEndpoint || '', hint: 'Leave empty for built-in dialogue' }
    ]);
    body.append(section('General', f.el, row(button('Save', () => { const v = f.values(); ctx.store.patch('ui', { speed: v.speed, minimap: v.minimap, chatOpen: v.chatOpen, soundOn: v.soundOn, autosaveSeconds: v.autosaveSeconds, llmEndpoint: v.llmEndpoint }); ctx.store.patch('profile', { locale: v.locale, theme: v.theme }); setLocale(v.locale); ctx.clock.setSpeed(v.speed); ctx.bus.emit('settings:updated', ctx.store.get('ui')); ctx.bus.emit('profile:updated', ctx.profile()); toast(ctx.t('toast.saved'), { kind: 'ok' }); ctx.refresh(); }, { kind: 'primary' }), button('Replay tutorial', () => { ctx.store.patch('onboarding', { step: 0, done: false }); ctx.bus.emit('tutorial:restart'); }, { small: true }))));
}

function renderKeys(body, ctx) {
    const list = ctx.keys.list();
    let capture = null;
    const table = h('table', { class: 'data-table keys' }, h('thead', {}, h('tr', {}, h('th', {}, 'Action'), h('th', {}, 'Key'), h('th', {}, ''))), h('tbody', {}, list.map((b) => { const keyCell = h('td', { class: 'mono' }, b.key); const btn = h('button', { class: 'btn tiny', onclick: () => { if (capture) capture.cell.textContent = capture.old; capture = { action: b.action, cell: keyCell, old: b.key }; keyCell.textContent = 'press a key…'; status.textContent = `Press the new key for ${b.action} (Esc cancels)`; } }, 'Rebind'); return h('tr', { dataset: { action: b.action } }, h('td', {}, b.action), keyCell, h('td', {}, btn, b.isDefault ? null : [' ', badge('custom', 'accent')])); })));
    const status = h('div', { class: 'muted' }, 'Click Rebind, then press the new key combination.');
    const onKey = (e) => { if (!capture) return; e.preventDefault(); e.stopPropagation(); const key = normalize(e); if (!key) return; if (key === 'Escape') { capture.cell.textContent = capture.old; capture = null; status.textContent = 'Cancelled'; return; } const r = ctx.keys.bind(capture.action, key); if (r.ok) { capture.cell.textContent = key; status.textContent = `${capture.action} → ${key}`; } else { capture.cell.textContent = capture.old; status.textContent = r.reason; } capture = null; };
    body.addEventListener('keydown', onKey, true);
    body.append(section('Keybinds', status, table, row(button('Reset to defaults', () => { ctx.keys.reset(); ctx.refresh('settings'); }, { small: true }), h('span', { class: 'muted' }, `${list.length} bindings · ${ctx.keys.conflicts().length} conflicts`))));
    body.tabIndex = 0;
}

function renderHotbar(body, ctx) {
    const slots = [...ctx.store.get('ui.hotbar', [])]; while (slots.length < 9) slots.push('');
    const names = (id) => (ctx.wm && ctx.wm.has(id) ? ctx.wm.defs.get(id).title : id);
    body.append(section('Hotbar slots (keys 1–9)', h('div', { class: 'hotbar-editor' }, slots.map((slot, i) => h('label', { class: 'field' }, h('span', { class: 'field-label' }, `Slot ${i + 1}`), h('select', { class: 'input', onchange: (e) => { slots[i] = e.target.value; ctx.store.set('ui.hotbar', slots.filter(Boolean).length ? slots : []); ctx.bus.emit('hotbar:updated', slots); } }, h('option', { value: '' }, '— empty —'), HOTBAR_CHOICES.map((id) => h('option', { value: id, selected: slot === id ? '' : null }, names(id))))))),
        row(button('Reset hotbar', () => { ctx.store.set('ui.hotbar', ['dashboard', 'jobs', 'crew', 'spellbook', 'inventory', 'codex', 'checklists', 'quests', 'reports']); ctx.bus.emit('hotbar:updated'); ctx.refresh('settings'); }, { small: true }))));
}

function renderData(body, ctx) {
    const size = ctx.store.sizeBytes();
    const fileInput = h('input', { type: 'file', accept: '.json,application/json', class: 'input' });
    body.append(grid(3, statCard('Saved document', `${(size / 1024).toFixed(1)} KB`), statCard('Last saved', ctx.store.lastSavedAt ? new Date(ctx.store.lastSavedAt).toLocaleTimeString() : 'not yet'), statCard('Jobs / crew', `${ctx.jobs().length} / ${ctx.world.agents.length}`)),
        section('Backup', h('p', { class: 'muted' }, 'Everything (profile, jobs, designs, crew, journal, settings) lives in this browser. Export regularly or to move between devices.'), row(button('Export backup (JSON)', () => { ctx.saveWorld(); download(`solarflow-realm-${new Date(ctx.now()).toISOString().slice(0, 10)}.json`, ctx.store.export(), 'application/json'); }, { kind: 'primary', small: true }), button('Save now', () => { ctx.saveWorld(); toast(ctx.store.flush() ? 'Saved' : 'Save failed', { kind: 'ok' }); ctx.refresh('settings'); }, { small: true }))),
        section('Restore', row(fileInput, button('Import', () => { const file = fileInput.files && fileInput.files[0]; if (!file) { toast('Choose a backup file', { kind: 'warn' }); return; } file.text().then((text) => { if (!confirm) return; importBackup(ctx, text); }); }, { small: true })), h('p', { class: 'muted small' }, 'Importing replaces the current document. Export first if unsure.')),
        section('Danger zone', row(button('Reset everything', async () => { if (await confirm('Delete all jobs, crew progress, designs and settings in this browser?', { okLabel: 'Reset' })) { ctx.store.reset(); location.reload(); } }, { kind: 'danger', small: true }))));
}
export async function importBackup(ctx, text) {
    try { ctx.store.import(text); ctx.store.flush(); toast('Backup imported – reloading', { kind: 'ok' }); setTimeout(() => location.reload(), 500); return true; } catch (error) { toast(`Import failed: ${error.message}`, { kind: 'bad', timeout: 6000 }); return false; }
}

export const FEATURES = [
    { id: 'win.settings.general', title: 'General settings save and apply', dom: true, test: () => { const t = makeTestCtx(); const b = openWindow(t.ctx, def(t.ctx)); const sel = q(b, 'select'); sel.value = 'fast'; qa(b, 'button').find((x) => x.textContent === 'Save').click(); const ok = t.ctx.store.get('ui.speed') === 'fast' && t.ctx.clock.speed.id === 'fast'; t.done(); return ok; } },
    { id: 'win.settings.keysList', title: 'Keybind table with custom markers', dom: true, test: () => { const t = makeTestCtx(); t.ctx.keys.bind('window.crew', 'Shift+P'); const b = openWindow(t.ctx, def(t.ctx), { tab: 'keys' }); const row = q(b, 'tr[data-action="window.crew"]'); const ok = /Shift\+P/.test(row.textContent) && /custom/.test(row.textContent); t.done(); return ok; } },
    { id: 'win.settings.rebind', title: 'Rebind by pressing a key, with conflict refusal', dom: true, test: () => { const t = makeTestCtx(); const b = openWindow(t.ctx, def(t.ctx), { tab: 'keys' }); const row = q(b, 'tr[data-action="window.crew"]'); row.querySelector('button').click(); b.dispatchEvent(new KeyboardEvent('keydown', { key: 'c', bubbles: true })); const refused = t.ctx.keys.keyFor('window.crew') === 'P'; row.querySelector('button').click(); b.dispatchEvent(new KeyboardEvent('keydown', { key: 'p', shiftKey: true, bubbles: true })); const ok = refused && t.ctx.keys.keyFor('window.crew') === 'Shift+P'; t.done(); return ok; } },
    { id: 'win.settings.hotbar', title: 'Hotbar slot editor', dom: true, test: () => { const t = makeTestCtx(); const b = openWindow(t.ctx, def(t.ctx), { tab: 'hotbar' }); const sel = qa(b, 'select')[8]; sel.value = 'map'; fire(sel, 'change'); const ok = t.ctx.store.get('ui.hotbar')[8] === 'map'; t.done(); return ok; } },
    { id: 'win.settings.data', title: 'Backup size and export controls', dom: true, test: () => { const t = makeTestCtx(); const b = openWindow(t.ctx, def(t.ctx), { tab: 'data' }); const ok = /KB/.test(b.textContent) && qa(b, 'button').some((x) => x.textContent.startsWith('Export backup')); t.done(); return ok; } },
    { id: 'win.settings.importRejects', title: 'Import rejects invalid backups', dom: true, test: async () => { const t = makeTestCtx(); const ok = (await importBackup(t.ctx, '{"nope":1}')) === false; t.done(); return ok; } }
];
