/** Product vault: the real CEC approved product lists – search, filter, favourites, compare, design selection. */
import { h, button, badge, dataTable, toast, empty, download, richTooltip } from '../core/ui.js';
import { searchProducts, manufacturers, isApprovedOn, daysToExpiry, matchInverters, matchBatteries, designCompatibility } from '../domain/products.js';
import { section, statCard, grid, row, jobPicker, issueList } from './_shared.js';
import { makeTestCtx, openWindow, q, qa, fire } from './_testing.js';

export const CATEGORY_LABELS = { solar_panel: 'PV module', inverter: 'Inverter', battery: 'Battery' };
export const CATEGORY_ICONS = { solar_panel: '▦', inverter: '⚡', battery: '🔋' };

export function productCsv(products) {
    const cols = ['id', 'category', 'manufacturer', 'series', 'model', 'type', 'cerApproved', 'approvedDate', 'expiryDate'];
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    return [cols.join(','), ...products.map((p) => cols.map((c) => esc(p[c])).join(','))].join('\n');
}
export function approvalBadge(p, today) {
    if (!isApprovedOn(p, today)) return badge('Not approved', 'bad');
    const days = daysToExpiry(p, today);
    if (days !== null && days < 90) return badge(`Expires in ${days} d`, 'warn');
    return badge('Approved', 'ok');
}
export function specLine(p) {
    const s = p.specifications || {};
    if (p.category === 'inverter') return `${s.ac_power_kw ?? '?'} kW${s.phases ? ` ${s.phases}φ` : ''}${s.inverter_standard ? ` · ${s.inverter_standard}` : ''}`;
    if (p.category === 'battery') return `${s.usable_capacity_kwh ?? '?'} kWh usable / ${s.nominal_capacity_kwh ?? '?'} nominal`;
    return `${s.power_watts ? `${s.power_watts} W · ` : ''}${s.fire_tested ? 'fire tested' : 'fire test n/a'}${s.max_system_voltage ? ` · ${s.max_system_voltage} V` : ''}`;
}

export function def(ctx) {
    return {
        id: 'inventory', title: ctx.t('nav.inventory'), icon: '🎒', hotkey: 'B', width: 960, height: 640,
        tabs: [{ id: 'browse', label: 'Browse', icon: '🔍' }, { id: 'matches', label: 'Matches', icon: '🎯' }, { id: 'favourites', label: 'Favourites', icon: '★' }, { id: 'compare', label: 'Compare', icon: '⇄' }, { id: 'design', label: 'Job selection', icon: '📐' }, { id: 'about', label: 'Catalogue', icon: 'ℹ' }],
        render(body, { tab }) {
            if (!ctx.products.loaded) { body.append(h('div', { class: 'empty' }, 'Loading the CEC approved product lists…')); return; }
            ({ browse: renderBrowse, matches: renderMatches, favourites: renderFavourites, compare: renderCompare, design: renderDesign, about: renderAbout }[tab] || renderBrowse)(body, ctx);
        }
    };
}

const today = (ctx) => new Date(ctx.now()).toISOString().slice(0, 10);
function favourites(ctx) { return ctx.store.get('favourites', []); }
function toggleFavourite(ctx, id) { const list = favourites(ctx); const next = list.includes(id) ? list.filter((x) => x !== id) : [...list, id]; ctx.store.set('favourites', next); return next.includes(id); }
function compareList(ctx) { return ctx.store.get('ui.compare', []); }
function toggleCompare(ctx, id) { const list = compareList(ctx); if (list.includes(id)) ctx.store.set('ui.compare', list.filter((x) => x !== id)); else if (list.length >= 3) { toast('Compare holds three products', { kind: 'warn' }); return false; } else ctx.store.set('ui.compare', [...list, id]); return true; }

function useInDesign(ctx, p) {
    const job = ctx.currentJob();
    if (!job) { toast('Create or select a job first (O)', { kind: 'warn' }); return false; }
    const key = { solar_panel: 'moduleId', inverter: 'inverterId', battery: 'batteryId' }[p.category];
    const d = ctx.design(job.id);
    const next = { ...d, [key]: p.id };
    const compat = designCompatibility({ module: ctx.products.byId.get(next.moduleId), inverter: ctx.products.byId.get(next.inverterId), battery: ctx.products.byId.get(next.batteryId), moduleCount: next.moduleCount, dateIso: today(ctx) });
    ctx.saveDesign(job.id, { [key]: p.id, productsApproved: compat.compatible, productIssues: compat.issues });
    ctx.store.push('recent', p.id, 20);
    toast(`${p.manufacturer} ${p.model} set as ${CATEGORY_LABELS[p.category]} for ${job.id}`, { kind: compat.compatible ? 'ok' : 'warn' });
    return true;
}

function productTable(ctx, rows, { onSelect }) {
    const t = today(ctx);
    return dataTable({
        columns: [
            { key: 'category', label: '', width: '28px', render: (p) => h('span', { title: CATEGORY_LABELS[p.category] }, CATEGORY_ICONS[p.category]) },
            { key: 'manufacturer', label: 'Manufacturer' }, { key: 'model', label: 'Model', render: (p) => h('span', { class: 'product-model', tooltip: richTooltip({ title: `${p.manufacturer} ${p.model}`, subtitle: `${CATEGORY_LABELS[p.category]} · ${p.type || ''}`, colour: isApprovedOn(p, t) ? '#1eff00' : '#ff6b6b', lines: [['Approved', p.approvedDate || '–'], ['Expires', p.expiryDate || '–'], specLine(p)], footer: p.source }) }, p.model) },
            { key: 'spec', label: 'Specification', sortable: false, render: (p) => specLine(p) }, { key: 'expiryDate', label: 'Status', render: (p) => approvalBadge(p, t) },
            { key: 'actions', label: '', sortable: false, render: (p) => h('span', { class: 'row-actions' }, h('button', { class: `btn tiny ${favourites(ctx).includes(p.id) ? 'gold' : ''}`, title: 'Favourite', onclick: (e) => { e.stopPropagation(); const on = toggleFavourite(ctx, p.id); e.target.classList.toggle('gold', on); } }, '★'), h('button', { class: 'btn tiny', title: 'Compare', onclick: (e) => { e.stopPropagation(); toggleCompare(ctx, p.id); } }, '⇄'), h('button', { class: 'btn tiny', title: 'Use in current job design', onclick: (e) => { e.stopPropagation(); useInDesign(ctx, p); } }, '📐')) }
        ],
        rows, pageSize: 20, searchable: false, onRow: onSelect, emptyText: 'No products match'
    });
}

function renderBrowse(body, ctx) {
    const state = ctx.store.get('ui.vault', { q: '', category: '', manufacturer: '', approvedOnly: true, sort: 'manufacturer' });
    const save = () => ctx.store.set('ui.vault', state);
    const qInput = h('input', { type: 'search', class: 'input', placeholder: 'Search manufacturer, model, series…', value: state.q, oninput: () => { state.q = qInput.value; save(); run(); } });
    const cat = h('select', { class: 'input', onchange: () => { state.category = cat.value; state.manufacturer = ''; save(); fillManufacturers(); run(); } }, h('option', { value: '' }, 'All categories'), Object.entries(CATEGORY_LABELS).map(([k, l]) => h('option', { value: k, selected: state.category === k ? '' : null }, l)));
    const man = h('select', { class: 'input', onchange: () => { state.manufacturer = man.value; save(); run(); } });
    const fillManufacturers = () => { man.replaceChildren(h('option', { value: '' }, 'All manufacturers'), ...manufacturers(ctx.products.list, state.category || null).map((m) => h('option', { value: m.name, selected: state.manufacturer === m.name ? '' : null }, `${m.name} (${m.count})`))); };
    fillManufacturers();
    const approved = h('input', { type: 'checkbox', checked: state.approvedOnly ? '' : null, onchange: () => { state.approvedOnly = approved.checked; save(); run(); } });
    const sort = h('select', { class: 'input', onchange: () => { state.sort = sort.value; save(); run(); } }, [['manufacturer', 'Manufacturer'], ['approved', 'Recently approved'], ['expiry', 'Expiring soonest'], ['power', 'Power / capacity']].map(([v, l]) => h('option', { value: v, selected: state.sort === v ? '' : null }, l)));
    const count = h('span', { class: 'muted' });
    const detail = h('div', { class: 'product-detail' });
    let table = null; let current = [];
    const run = () => { const r = searchProducts(ctx.products.list, { ...state, date: today(ctx), limit: 500 }); current = r.items; count.textContent = `${r.total.toLocaleString()} match${r.total === 1 ? '' : 'es'}${r.total > 500 ? ' (first 500 shown)' : ''}`; table.update(r.items); };
    table = productTable(ctx, [], { onSelect: (p) => showDetail(ctx, p, detail) });
    body.append(section(null, row(qInput, cat, man, h('label', { class: 'field inline' }, approved, ' approved today'), sort, count, button('CSV', () => download('cec-products.csv', productCsv(current), 'text/csv'), { small: true, title: 'Export the current result set' })), h('div', { class: 'vault-layout' }, table.el, detail)));
    run();
}

export function showDetail(ctx, p, host) {
    const t = today(ctx); const s = p.specifications || {}; const days = daysToExpiry(p, t);
    host.replaceChildren(h('div', { class: 'card' }, h('div', { class: 'card-title' }, CATEGORY_ICONS[p.category], ' ', p.manufacturer), h('div', {}, h('strong', {}, p.model)), p.series ? h('div', { class: 'muted' }, p.series) : null, h('div', { class: 'muted' }, p.type || CATEGORY_LABELS[p.category]), approvalBadge(p, t),
        h('dl', { class: 'kv-list' }, h('dt', {}, 'Approved'), h('dd', {}, p.approvedDate || '–'), h('dt', {}, 'Expires'), h('dd', {}, p.expiryDate ? `${p.expiryDate}${days !== null ? ` (${days} days)` : ''}` : '–'), ...Object.entries(s).filter(([, v]) => v !== null && v !== undefined && v !== '').flatMap(([k, v]) => [h('dt', {}, k.replace(/_/g, ' ')), h('dd', {}, String(v))]), h('dt', {}, 'ID'), h('dd', { class: 'mono' }, p.id), h('dt', {}, 'Source'), h('dd', {}, p.source || 'CEC list')),
        row(button('Use in job design', () => useInDesign(ctx, p), { kind: 'primary', small: true }), button(favourites(ctx).includes(p.id) ? '★ Unfavourite' : '☆ Favourite', () => { toggleFavourite(ctx, p.id); showDetail(ctx, p, host); }, { small: true }), button('Compare', () => { if (toggleCompare(ctx, p.id)) toast('Added to compare'); }, { small: true }))));
}

function renderMatches(body, ctx) {
    body.append(jobPicker(ctx, { onChange: () => ctx.refresh('inventory') }));
    const job = ctx.currentJob(); if (!job) return;
    const d = ctx.design(job.id); const kw = d.arrayKwDc || job.systemKw; const kwh = d.batteryUsableKwh || job.batteryKwh;
    const inv = matchInverters(ctx.products.list, kw, { phases: job.phases }).slice(0, 40);
    const bat = kwh ? matchBatteries(ctx.products.list, kwh).slice(0, 40) : [];
    const detail = h('div', { class: 'product-detail' });
    body.append(section(`Inverters suited to a ${kw} kW array (DC/AC 1.0–1.33, approved today)`, inv.length ? productTable(ctx, inv, { onSelect: (p) => showDetail(ctx, p, detail) }).el : empty('No approved inverter in the 1.0–1.33 window; adjust the array size.')));
    if (kwh) body.append(section(`Batteries near ${kwh} kWh usable (±25 %)`, bat.length ? productTable(ctx, bat, { onSelect: (p) => showDetail(ctx, p, detail) }).el : empty('No matches')));
    body.append(detail);
}

function renderFavourites(body, ctx) {
    const rows = favourites(ctx).map((id) => ctx.products.byId.get(id)).filter(Boolean);
    const detail = h('div', { class: 'product-detail' });
    body.append(section(`Favourites (${rows.length})`, rows.length ? h('div', { class: 'vault-layout' }, productTable(ctx, rows, { onSelect: (p) => showDetail(ctx, p, detail) }).el, detail) : empty('Star products in Browse to keep them here.')));
}

function renderCompare(body, ctx) {
    const rows = compareList(ctx).map((id) => ctx.products.byId.get(id)).filter(Boolean);
    if (!rows.length) { body.append(empty('Add up to three products with ⇄ to compare side by side.')); return; }
    const keys = [...new Set(rows.flatMap((p) => Object.keys(p.specifications || {})))];
    body.append(section('Side-by-side comparison', h('table', { class: 'data-table compare' }, h('thead', {}, h('tr', {}, h('th', {}, ''), rows.map((p) => h('th', {}, `${p.manufacturer} ${p.model}`)))), h('tbody', {},
        h('tr', {}, h('td', {}, 'Category'), rows.map((p) => h('td', {}, CATEGORY_LABELS[p.category]))), h('tr', {}, h('td', {}, 'Status'), rows.map((p) => h('td', {}, approvalBadge(p, today(ctx))))), h('tr', {}, h('td', {}, 'Approved'), rows.map((p) => h('td', {}, p.approvedDate || '–'))), h('tr', {}, h('td', {}, 'Expires'), rows.map((p) => h('td', {}, p.expiryDate || '–'))),
        keys.map((k) => h('tr', {}, h('td', {}, k.replace(/_/g, ' ')), rows.map((p) => h('td', {}, String(p.specifications?.[k] ?? '–'))))))),
        row(button('Clear comparison', () => { ctx.store.set('ui.compare', []); ctx.refresh('inventory'); }, { small: true }))));
}

function renderDesign(body, ctx) {
    body.append(jobPicker(ctx, { onChange: () => ctx.refresh('inventory') }));
    const job = ctx.currentJob(); if (!job) return;
    const d = ctx.design(job.id);
    const slots = [['moduleId', 'PV module', 'solar_panel'], ['inverterId', 'Inverter', 'inverter'], ['batteryId', 'Battery', 'battery']];
    const compat = designCompatibility({ module: ctx.products.byId.get(d.moduleId), inverter: ctx.products.byId.get(d.inverterId), battery: ctx.products.byId.get(d.batteryId), moduleCount: d.moduleCount, dateIso: today(ctx) });
    body.append(section(`Selected products for ${job.id}`, grid(3, slots.map(([key, label, cat]) => { const p = d[key] ? ctx.products.byId.get(d[key]) : null; return h('div', { class: 'card slot' }, h('div', { class: 'card-title' }, CATEGORY_ICONS[cat], ' ', label), p ? [h('div', {}, h('strong', {}, p.manufacturer), ' ', p.model), h('div', { class: 'muted' }, specLine(p)), approvalBadge(p, today(ctx)), row(button('Remove', () => { ctx.saveDesign(job.id, { [key]: null, productsApproved: false }); ctx.refresh('inventory'); }, { small: true }))] : [h('div', { class: 'muted' }, 'Not selected'), button('Browse', () => { ctx.store.patch('ui.vault', { category: cat }); ctx.wm.setTab('inventory', 'browse'); }, { small: true })]); })),
        h('h4', {}, 'Compatibility'), issueList(compat.issues, 'All selected products are approved today and within the DC/AC limit'), compat.arrayKw ? h('div', { class: 'muted' }, `Array ${compat.arrayKw} kW, DC/AC ${compat.dcAcRatio}`) : null,
        row(button('Confirm products approved for STC claim', () => { ctx.saveDesign(job.id, { productsApproved: compat.compatible, productIssues: compat.issues, productsCheckedOn: today(ctx) }); toast(compat.compatible ? 'Products confirmed on the CEC lists' : 'Issues remain – see list', { kind: compat.compatible ? 'ok' : 'warn' }); ctx.refresh('inventory'); }, { kind: 'primary', small: true }))));
}

function renderAbout(body, ctx) {
    const s = ctx.products.summary || {}; const list = ctx.products.list; const t = today(ctx);
    const approved = list.filter((p) => isApprovedOn(p, t)).length; const expiring = list.filter((p) => { const d = daysToExpiry(p, t); return d !== null && d >= 0 && d < 90; }).length;
    body.append(grid(4, statCard('Products', list.length.toLocaleString()), statCard('Approved today', approved.toLocaleString()), statCard('Expiring < 90 d', expiring.toLocaleString(), null, 'var(--warn)'), statCard('Source', ctx.products.source || '–')),
        section('About this catalogue', h('p', {}, s.source || 'Clean Energy Council approved product lists.'), s.generatedAt ? h('p', { class: 'muted' }, `Generated ${s.generatedAt}`) : null, s.simulated === false ? badge('Real data', 'ok') : badge('Simulated data', 'warn'), s.sourceUrls ? h('ul', { class: 'notes' }, Object.entries(s.sourceUrls).map(([k, u]) => h('li', {}, `${k}: `, h('a', { href: u, target: '_blank', rel: 'noopener' }, u)))) : null, h('p', { class: 'muted' }, 'Approval status is evaluated against the simulated "today". Always confirm on the CEC website before an STC claim.')));
}

export const FEATURES = [
    { id: 'win.vault.browse', title: 'Browse the catalogue with search', dom: true, test: () => { const t = makeTestCtx(); const b = openWindow(t.ctx, def(t.ctx)); const rowsBefore = qa(b, 'tbody tr').length; const inp = q(b, 'input[type=search]'); inp.value = 'gamma g10'; fire(inp); const ok = rowsBefore === 4 && qa(b, 'tbody tr').length === 1 && /G10 Three/.test(q(b, 'tbody tr').textContent); t.done(); return ok; } },
    { id: 'win.vault.filters', title: 'Category, manufacturer and approved-only filters', dom: true, test: () => { const t = makeTestCtx(); const b = openWindow(t.ctx, def(t.ctx)); const sel = qa(b, 'select')[0]; sel.value = 'solar_panel'; fire(sel, 'change'); const one = qa(b, 'tbody tr').length === 1; const cb = q(b, 'input[type=checkbox]'); cb.checked = false; fire(cb, 'change'); const two = qa(b, 'tbody tr').length === 2; t.done(); return one && two; } },
    { id: 'win.vault.sort', title: 'Sort by expiry / power / recency', dom: true, test: () => { const t = makeTestCtx(); const b = openWindow(t.ctx, def(t.ctx)); const sel = qa(b, 'select')[2]; sel.value = 'power'; fire(sel, 'change'); const ok = /G10/.test(q(b, 'tbody tr').textContent); t.done(); return ok; } },
    { id: 'win.vault.detail', title: 'Product detail panel with approval status and specs', dom: true, test: () => { const t = makeTestCtx(); const b = openWindow(t.ctx, def(t.ctx)); q(b, 'tbody tr').click(); const ok = /Approved/.test(q(b, '.product-detail').textContent) && q(b, '.product-detail .kv-list') !== null; t.done(); return ok; } },
    { id: 'win.vault.favourite', title: 'Favourites persist', dom: true, test: () => { const t = makeTestCtx(); let b = openWindow(t.ctx, def(t.ctx)); q(b, 'tbody tr .row-actions button').click(); const saved = t.ctx.store.get('favourites').length === 1; t.ctx.wm.setTab('inventory', 'favourites'); b = t.ctx.wm.windows.get('inventory').body; const ok = saved && qa(b, 'tbody tr').length === 1; t.done(); return ok; } },
    { id: 'win.vault.compare', title: 'Compare up to three products', dom: true, test: () => { const t = makeTestCtx(); let b = openWindow(t.ctx, def(t.ctx)); const btns = qa(b, 'tbody tr .row-actions button:nth-child(2)'); btns[0].click(); btns[1].click(); t.ctx.wm.setTab('inventory', 'compare'); b = t.ctx.wm.windows.get('inventory').body; const ok = qa(b, 'thead th').length === 3 && /Category/.test(b.textContent); t.done(); return ok; } },
    { id: 'win.vault.useInDesign', title: 'Use a product in the current job design', dom: true, test: () => { const t = makeTestCtx(); const b = openWindow(t.ctx, def(t.ctx)); const inp = q(b, 'input[type=search]'); inp.value = 'G5'; fire(inp); q(b, 'tbody tr .row-actions button:nth-child(3)').click(); const d = t.ctx.design(t.job.id); const ok = d.inverterId === 'INV-G5' && d.productsApproved === true; t.done(); return ok; } },
    { id: 'win.vault.matches', title: 'Inverter and battery matches for the job', dom: true, test: () => { const t = makeTestCtx(); const b = openWindow(t.ctx, def(t.ctx), { tab: 'matches' }); const ok = /G5 Hybrid/.test(b.textContent) && /D13/.test(b.textContent); t.done(); return ok; } },
    { id: 'win.vault.designSlots', title: 'Job selection slots with compatibility check', dom: true, test: () => { const t = makeTestCtx(); t.ctx.saveDesign(t.job.id, { moduleId: 'PV-B400', inverterId: 'INV-G5' }); const b = openWindow(t.ctx, def(t.ctx), { tab: 'design' }); const ok = qa(b, '.slot').length === 3 && /not approved/.test(b.textContent); qa(b, 'button').find((x) => x.textContent.startsWith('Confirm products')).click(); const d = t.ctx.design(t.job.id); t.done(); return ok && d.productsApproved === false && d.productIssues.length >= 1; } },
    { id: 'win.vault.csv', title: 'CSV export of the result set', test: () => { const csv = productCsv([{ id: 'a', category: 'inverter', manufacturer: 'X "Y"', model: 'M', cerApproved: true }]); return csv.split('\n').length === 2 && csv.includes('"X ""Y"""'); } },
    { id: 'win.vault.about', title: 'Catalogue summary and provenance', dom: true, test: () => { const t = makeTestCtx(); const b = openWindow(t.ctx, def(t.ctx), { tab: 'about' }); const ok = qa(b, '.stat').length === 4 && /Real data/.test(b.textContent); t.done(); return ok; } },
    { id: 'win.vault.tooltip', title: 'Rich item tooltips on models', dom: true, test: () => { const t = makeTestCtx(); const b = openWindow(t.ctx, def(t.ctx)); const ok = q(b, '.product-model').dataset.tooltip === '1'; t.done(); return ok; } }
];
