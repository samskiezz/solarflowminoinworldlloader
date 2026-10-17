/** Registers: every typed register – risks, test records, suppliers, permits, breaches – with rows, an add/edit form built from the definition, history, alerts, CSV/JSON export and import. */
import { h, button, badge, select, empty, download, toast } from '../core/ui.js';
import { REGISTER_DEFS, REGISTER_DOMAINS } from '../core/registers.js';
import { section, row, grid, statCard, form } from './_shared.js';
import { makeTestCtx, openWindow, q, qa, fire } from './_testing.js';

const DOMAIN_LABEL = { accounts: 'Accounts', projects: 'Projects', design: 'Design', battery: 'Batteries', compliance: 'Compliance', supply: 'Supply chain', documents: 'Documents', automation: 'Automation', knowledge: 'Knowledge', realm: 'Realm', install: 'Install', monitoring: 'Monitoring', economics: 'Economics', notifications: 'Notifications', reports: 'Reports', integrations: 'Integrations', security: 'Security', reliability: 'Reliability', testing: 'Testing' };

function specFor(def, values = {}) {
    return def.fields.map((f) => ({ key: f.key, label: f.label + (f.required ? ' *' : ''), type: f.type === 'select' ? 'select' : f.type === 'bool' ? 'checkbox' : f.type === 'textarea' ? 'textarea' : f.type === 'date' ? 'date' : f.type === 'number' || f.type === 'money' ? 'number' : 'text', options: f.options ? f.options.map((o) => ({ value: o, label: o })) : undefined, value: values[f.key] ?? (f.type === 'bool' ? false : '') }));
}
function cell(f, v) { if (v === undefined || v === null || v === '') return '–'; if (f.type === 'bool') return v ? '✔' : '✘'; if (f.type === 'money') return `$${Number(v).toLocaleString()}`; return String(v); }

function renderRows(body, ctx) {
    const reg = ctx.registers; const current = ctx.store.get('ui.register', 'risks'); const def = REGISTER_DEFS.find((d) => d.id === current) || REGISTER_DEFS[0];
    const picker = select(REGISTER_DEFS.map((d) => ({ value: d.id, label: `${DOMAIN_LABEL[d.domain] || d.domain} · ${d.title}` })), { value: def.id }); picker.classList.add('register-picker');
    picker.addEventListener('change', () => { ctx.store.set('ui.register', picker.value); ctx.store.set('ui.registerEdit', null); ctx.refresh('registers'); });
    const jobOnly = def.scope === 'job' && ctx.store.get('ui.registerJobOnly', true); const jobId = jobOnly ? ctx.currentJobId() : null;
    const rows = reg.list(def.id, { jobId }); const alerts = reg.alerts(def.id, { jobId });
    const editId = ctx.store.get('ui.registerEdit'); const editing = editId ? reg.get(def.id, editId) : null;
    const f = form(specFor(def, editing || {}), { columns: Math.min(3, def.fields.length) });
    const save = () => {
        const v = f.values(); const res = editing ? reg.update(def.id, editing.id, v) : reg.add(def.id, v, { jobId: def.scope === 'job' ? ctx.currentJobId() : null });
        if (!res.ok) { toast(`Check: ${Object.entries(res.errors).map(([k, e]) => `${k} ${e}`).join(', ')}`, { kind: 'warn' }); return; }
        ctx.store.set('ui.registerEdit', null); toast(editing ? 'Row updated' : 'Row added', { kind: 'ok', timeout: 1200 }); ctx.refresh('registers');
    };
    const tools = row(picker, def.scope === 'job' ? h('label', { class: 'field inline' }, h('input', { type: 'checkbox', class: 'checkbox register-joblock', checked: jobOnly ? 'checked' : null, onchange: (e) => { ctx.store.set('ui.registerJobOnly', e.target.checked); ctx.refresh('registers'); } }), h('span', { class: 'field-label' }, 'This job only')) : badge('organisation-wide', 'neutral'),
        h('span', { class: 'muted small' }, `${rows.length} row${rows.length === 1 ? '' : 's'} · items ${def.items.map((n) => `#${n}`).join(' ')}`));
    body.append(grid(4, statCard('Register', def.title, DOMAIN_LABEL[def.domain] || def.domain), statCard('Rows', rows.length, def.scope === 'job' ? (jobOnly ? 'this job' : 'all jobs') : 'organisation'), statCard('Alerts', alerts.length, alerts.length ? `${alerts.filter((a) => a.kind === 'overdue').length} overdue` : 'nothing due', alerts.length ? 'var(--warn)' : null), statCard('History', reg.history(def.id).length, 'journaled changes')));
    body.append(section(null, tools));
    body.append(section(editing ? `Edit row ${editing.id}` : 'Add a row', f.el, row(button(editing ? 'Save changes' : 'Add row', save, { kind: 'primary', small: true }), editing ? button('Cancel', () => { ctx.store.set('ui.registerEdit', null); ctx.refresh('registers'); }, { small: true }) : null, editing ? button('Delete', () => { reg.remove(def.id, editing.id); ctx.store.set('ui.registerEdit', null); ctx.refresh('registers'); }, { kind: 'danger', small: true }) : null)));
    body.append(section('Rows', rows.length ? h('div', { class: 'table-scroll' }, h('table', { class: 'data-table register-table' }, h('thead', {}, h('tr', {}, def.fields.map((fl) => h('th', {}, fl.label)), h('th', {}, ''))), h('tbody', {}, rows.map((r) => { const al = alerts.find((a) => a.row.id === r.id); return h('tr', { class: `register-row ${al ? al.kind : ''}`, onclick: () => { ctx.store.set('ui.registerEdit', r.id); ctx.refresh('registers'); } }, def.fields.map((fl) => h('td', {}, cell(fl, r[fl.key]))), h('td', {}, al ? badge(al.kind === 'overdue' ? `${-al.days} d overdue` : `due in ${al.days} d`, al.kind === 'overdue' ? 'bad' : 'warn') : '')); })))) : empty('No rows yet. Fill the form above, or import JSON.'),
        row(button('Export CSV', () => download(`${def.id}.csv`, reg.exportCsv(def.id), 'text/csv'), { small: true }), button('Export JSON', () => download(`${def.id}.json`, reg.exportJson(def.id), 'application/json'), { small: true }), button('Import JSON', () => { const inp = h('input', { type: 'file', accept: '.json,application/json' }); inp.addEventListener('change', async () => { const file = inp.files[0]; if (!file) return; try { const r = reg.importRows(def.id, JSON.parse(await file.text()), { jobId: def.scope === 'job' ? ctx.currentJobId() : null }); toast(`${r.added} added, ${r.rejected.length} rejected`, { kind: r.rejected.length ? 'warn' : 'ok' }); ctx.refresh('registers'); } catch (e) { toast(`Import failed: ${e.message}`, { kind: 'bad' }); } }); inp.click(); }, { small: true }), button('Remove duplicates', () => { const n = reg.dedupe(def.id); toast(`${n} duplicate${n === 1 ? '' : 's'} removed`, { kind: 'ok' }); ctx.refresh('registers'); }, { small: true }))));
}

function renderCatalogue(body, ctx) {
    const s = ctx.registers.summary();
    body.append(grid(4, statCard('Registers', s.registers), statCard('Rows', s.rows), statCard('Programme items', s.items, 'implemented as registers'), statCard('Alerts', s.alerts, null, s.alerts ? 'var(--warn)' : null)));
    for (const dom of REGISTER_DOMAINS) {
        const defs = s.defs.filter((d) => d.domain === dom);
        body.append(section(DOMAIN_LABEL[dom] || dom, h('div', { class: 'register-grid' }, defs.map((d) => h('button', { class: 'register-card', onclick: () => { ctx.store.set('ui.register', d.id); ctx.store.set('ui.registerEdit', null); ctx.open('registers', { tab: 'rows' }); ctx.refresh('registers'); } }, h('strong', {}, d.title), h('span', { class: 'muted small' }, `${d.rows} row${d.rows === 1 ? '' : 's'}${d.alerts ? ` · ${d.alerts} alert${d.alerts === 1 ? '' : 's'}` : ''}`))))));
    }
}

function renderAlerts(body, ctx) {
    const all = ctx.registers.allAlerts();
    body.append(section('Due and overdue across every register', all.length ? h('table', { class: 'data-table alerts-table' }, h('thead', {}, h('tr', {}, h('th', {}, 'Register'), h('th', {}, 'Row'), h('th', {}, 'Field'), h('th', {}, 'When'))), h('tbody', {}, all.slice(0, 200).map((a) => { const def = REGISTER_DEFS.find((d) => d.id === a.register); return h('tr', { class: 'alert-row', onclick: () => { ctx.store.set('ui.register', a.register); ctx.store.set('ui.registerEdit', a.row.id); ctx.open('registers', { tab: 'rows' }); ctx.refresh('registers'); } }, h('td', {}, a.title), h('td', {}, String(a.row[def.fields[0].key] || a.row.id)), h('td', {}, a.field.replace(/_/g, ' ')), h('td', {}, badge(a.kind === 'overdue' ? `${-a.days} d overdue` : `in ${a.days} d`, a.kind === 'overdue' ? 'bad' : 'warn'))); }))) : empty('Nothing due in the next 30 days.')));
}

function renderHistory(body, ctx) {
    const current = ctx.store.get('ui.register', 'risks'); const def = REGISTER_DEFS.find((d) => d.id === current) || REGISTER_DEFS[0]; const hist = ctx.registers.history(def.id).slice().reverse();
    body.append(section(`History – ${def.title}`, hist.length ? h('ul', { class: 'feed register-history' }, hist.slice(0, 100).map((e) => h('li', { class: 'feed-item' }, h('span', { class: 'feed-icon' }, { add: '＋', update: '✎', remove: '✕', dedupe: '⧉' }[e.action] || '•'), h('span', {}, `${e.action} ${e.summary || e.rowId || ''}${e.fields ? ` (${e.fields.join(', ')})` : ''}${e.removed ? ` ${e.removed} removed` : ''}`), h('span', { class: 'muted small' }, `${e.by} · ${new Date(e.at).toISOString().slice(0, 16).replace('T', ' ')}`)))) : empty('No changes yet.')));
}

export function def(ctx) {
    return {
        id: 'registers', title: 'Registers', icon: '🗂', hotkey: null, width: 1000, height: 680,
        tabs: [{ id: 'catalogue', label: 'Catalogue', icon: '🗂' }, { id: 'rows', label: 'Rows', icon: '≡' }, { id: 'alerts', label: 'Due', icon: '⏰' }, { id: 'history', label: 'History', icon: '🕓' }],
        render(body, { tab }) {
            if (tab === 'rows') return renderRows(body, ctx);
            if (tab === 'alerts') return renderAlerts(body, ctx);
            if (tab === 'history') return renderHistory(body, ctx);
            return renderCatalogue(body, ctx);
        }
    };
}

export const FEATURES = [
    { id: 'win.registers.catalogue', title: 'Catalogue lists every register by domain with row counts; a card opens its rows', dom: true, test: () => { const t = makeTestCtx(); let b = openWindow(t.ctx, def(t.ctx)); const cards = qa(b, '.register-card').length; cards && qa(b, '.register-card').find((c) => /Supplier directory/.test(c.textContent)).click(); b = t.ctx.wm.windows.get('registers').body; const ok = cards >= 150 && t.ctx.store.get('ui.register') === 'suppliers' && q(b, '.register-picker') && q(b, '.register-picker').value === 'suppliers'; t.done(); return ok; } },
    { id: 'win.registers.addEdit', title: 'The row form is built from the definition; adding, editing and deleting rows works with validation', dom: true, test: () => { const t = makeTestCtx(); t.ctx.store.set('ui.register', 'risks'); let b = openWindow(t.ctx, def(t.ctx), { tab: 'rows' }); qa(b, 'button').find((x) => /Add row/.test(x.textContent)).click(); const refused = t.ctx.registers.count('risks') === 0; const inp = q(b, 'input.input'); inp.value = 'Roof access'; fire(inp); qa(b, 'button').find((x) => /Add row/.test(x.textContent)).click(); b = t.ctx.wm.windows.get('registers').body; const added = t.ctx.registers.count('risks') === 1 && qa(b, '.register-row').length === 1; q(b, '.register-row').click(); b = t.ctx.wm.windows.get('registers').body; const editing = /Edit row/.test(b.textContent); qa(b, 'button').find((x) => /Delete/.test(x.textContent)).click(); const ok = refused && added && editing && t.ctx.registers.count('risks') === 0; t.done(); return ok; } },
    { id: 'win.registers.alerts', title: 'The Due tab lists overdue and due-soon rows across registers', dom: true, test: () => { const t = makeTestCtx(); t.ctx.registers.add('instruments', { instrument: 'Fluke', calibrated_until: '2020-01-01' }); const b = openWindow(t.ctx, def(t.ctx), { tab: 'alerts' }); const ok = qa(b, '.alert-row').length === 1 && /overdue/.test(b.textContent); t.done(); return ok; } },
    { id: 'win.registers.history', title: 'History tab journals adds, edits and removals for the chosen register', dom: true, test: () => { const t = makeTestCtx(); t.ctx.store.set('ui.register', 'suppliers'); const r = t.ctx.registers.add('suppliers', { name: 'Acme' }); t.ctx.registers.update('suppliers', r.row.id, { score: 4 }); const b = openWindow(t.ctx, def(t.ctx), { tab: 'history' }); const ok = qa(b, '.register-history .feed-item').length === 2 && /update/.test(b.textContent); t.done(); return ok; } }
];
