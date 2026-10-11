/** Sites: every address the business has quoted, installed or serviced – the installed base as a map of suburbs. */
import { h, button, badge, empty } from '../core/ui.js';
import { section, row, grid, statCard, money } from './_shared.js';
import { needsModel, link, fmtDate, makeBusinessCtx } from './_business.js';
import { table as dataTable } from './_business.js';
import { openWindow, q, qa } from './_testing.js';

export function def(ctx) {
    return {
        id: 'sites', title: 'Sites & suburbs', icon: '🏘', hotkey: 'Shift+I', width: 980, height: 680,
        tabs: [{ id: 'sites', label: 'Sites', icon: '🏠' }, { id: 'suburbs', label: 'Suburbs', icon: '🗺' }, { id: 'site', label: 'Site file', icon: '📁' }],
        render(body, { tab }) { if (needsModel(ctx, body)) return; ({ suburbs: renderSuburbs, site: renderSite }[tab] || renderSites)(body, ctx); }
    };
}

function renderSites(body, ctx) {
    const m = ctx.business.model; const sites = m.sites;
    const rows = sites.map((s) => ({ id: s.id, customer: s.customer || '(unknown)', address: `${s.address.line1}, ${s.address.suburb}`, suburb: s.address.suburb, status: s.status, installed: s.installed ? 'yes' : '', system: s.system ? [s.system.pvKw ? `${s.system.pvKw} kW` : null, s.system.batteryKwh ? `${s.system.batteryKwh} kWh` : null].filter(Boolean).join(' + ') : '', revenue: s.revenue || 0, overdue: s.overdue || 0, waiting: s.waiting || 0, pack: s.packId ? 'yes' : (s.installed ? 'missing' : ''), jobs: s.jobs.length, partner: s.partner }));
    body.append(section(`${sites.length} sites · ${sites.filter((s) => s.installed).length} installed`, grid(4, statCard('Installed base', sites.filter((s) => s.installed).length), statCard('Revenue linked', money(sites.reduce((a, s) => a + (s.revenue || 0), 0))), statCard('Sites with overdue', sites.filter((s) => s.overdue).length, '', sites.some((s) => s.overdue) ? 'var(--warn)' : null), statCard('Missing handover pack', sites.filter((s) => s.installed && !s.packId).length, '', sites.some((s) => s.installed && !s.packId) ? 'var(--warn)' : null))));
    body.append(dataTable({ columns: [{ key: 'customer', label: 'Customer' }, { key: 'address', label: 'Address' }, { key: 'status', label: 'Stage', render: (v) => badge(v, v === 'complete' ? 'ok' : v === 'lost' ? 'bad' : 'neutral') }, { key: 'system', label: 'System' }, { key: 'revenue', label: 'Revenue', render: (v) => money(v) }, { key: 'overdue', label: 'Overdue', render: (v) => (v ? h('span', { class: 'bad' }, money(v)) : '') }, { key: 'waiting', label: 'Waiting emails' }, { key: 'pack', label: 'Pack', render: (v) => (v === 'missing' ? badge('missing', 'warn') : v) }, { key: 'jobs', label: 'Jobs' }, { key: 'partner', label: 'Channel' }], rows, pageSize: 20, searchKeys: ['customer', 'address', 'suburb', 'partner'], onRow: (r) => { ctx.store.set('ui.selectedSite', r.id); ctx.open('sites', { tab: 'site' }); }, initialSort: { key: 'revenue', dir: 'desc' } }));
}

function renderSuburbs(body, ctx) {
    const d = ctx.business.districts();
    body.append(section(`${d.length} suburbs`, h('p', { class: 'muted small' }, 'Each suburb is a district in Solarhaven; the houses there are these sites.'), h('table', { class: 'data-table suburbs' }, h('thead', {}, h('tr', {}, h('th', {}, 'Suburb'), h('th', {}, 'Postcode'), h('th', {}, 'Sites'), h('th', {}, 'Installed'), h('th', {}, 'Revenue'), h('th', {}, 'Overdue'), h('th', {}, 'Waiting'))), h('tbody', {}, d.map((x) => h('tr', { onclick: () => { const game = typeof window !== 'undefined' ? window.GAME : null; if (game && game.goToSuburb) game.goToSuburb(x.name); } }, h('td', {}, x.name), h('td', {}, x.postcode || ''), h('td', {}, String(x.sites.length)), h('td', {}, String(x.installed)), h('td', {}, money(x.revenue)), h('td', {}, x.overdue ? h('span', { class: 'bad' }, money(x.overdue)) : ''), h('td', {}, String(x.waiting))))))));
}

function renderSite(body, ctx) {
    const m = ctx.business.model; const id = ctx.store.get('ui.selectedSite') || m.sites[0]?.id; const s = m.sites.find((x) => x.id === id);
    if (!s) { body.append(empty('Pick a site from the Sites tab')); return; }
    const jobs = m.jobs.filter((j) => s.jobs.includes(j.id)); const threads = m.threads.filter((t) => t.siteId === s.id); const invoices = m.invoices.filter((i) => i.siteId === s.id); const pack = (m.packs || []).find((p) => p.id === s.packId);
    body.append(section(`${s.customer || 'Unknown customer'} · ${s.address.raw}`, grid(4, statCard('Stage', s.status), statCard('System', s.system ? `${s.system.pvKw || 0} kW / ${s.system.batteryKwh || 0} kWh` : '–'), statCard('Revenue', money(s.revenue || 0), s.overdue ? `${money(s.overdue)} overdue` : '', s.overdue ? 'var(--bad)' : null), statCard('Channel', s.partner)), row(s.email ? h('span', { class: 'muted' }, s.email) : null, s.phone ? h('span', { class: 'muted' }, s.phone) : null, ctx.job(s.jobs[0]) ? button('Visit in Solarhaven', () => { ctx.setCurrentJob(s.jobs[0]); const game = typeof window !== 'undefined' ? window.GAME : null; if (game && game.goToJob) game.goToJob(s.jobs[0]); }, { kind: 'primary', small: true }) : null)));
    body.append(section(`Jobs (${jobs.length})`, h('table', { class: 'data-table' }, h('thead', {}, h('tr', {}, h('th', {}, '#'), h('th', {}, 'Status'), h('th', {}, 'Kind'), h('th', {}, 'Invoice'), h('th', {}, 'Paid'), h('th', {}, 'Team'), h('th', {}, ''))), h('tbody', {}, jobs.map((j) => h('tr', {}, h('td', {}, j.number), h('td', {}, badge(j.status, j.status === 'Completed' ? 'ok' : 'neutral')), h('td', {}, j.marker || j.kind), h('td', {}, j.invoiceAmount ? money(j.invoiceAmount) : (j.invoice ? money(j.invoice.total) : '')), h('td', {}, j.paid ? money(j.paid) : ''), h('td', { class: 'muted small' }, (j.team || []).join(', ')), h('td', {}, link('ServiceM8', j.url), ' ', j.invoice ? (j.invoice.url ? link(j.invoice.number, j.invoice.url) : h('span', { class: 'muted small' }, j.invoice.number)) : null)))))));
    body.append(section(`Conversations (${threads.length})`, threads.length ? h('ul', { class: 'notes' }, threads.map((t) => h('li', {}, badge(t.category, t.unanswered ? 'warn' : 'neutral'), ' ', t.subject || '(no subject)', ' ', h('span', { class: 'muted small' }, fmtDate(t.lastDate), t.unanswered ? ` · waiting ${t.waitingDays} d` : ''), ' ', link('Gmail', t.url)))) : empty('No emails linked to this site')));
    body.append(section('Handover pack', pack ? row(badge(pack.score == null ? 'present' : `${pack.score} % complete`, pack.score === 100 ? 'ok' : 'warn'), link('Open folder', pack.url), pack.missing.length ? h('span', { class: 'muted small' }, `Missing: ${pack.missing.join(', ')}`) : null) : (s.installed ? h('div', { class: 'issue' }, '⚠ Installed site with no handover pack folder') : h('span', { class: 'muted' }, 'Not installed yet'))));
}

export const FEATURES = [
    { id: 'win.sites.table', title: 'Sites table: every address with stage, system, revenue, overdue, waiting emails and pack status', dom: true, test: () => { const t = makeBusinessCtx(); const b = openWindow(t.ctx, def(t.ctx)); const ok = qa(b, 'tbody tr').length === 4 && /missing/.test(b.textContent) && qa(b, '.stat').length === 4; t.done(); return ok; } },
    { id: 'win.sites.suburbs', title: 'Suburbs tab aggregates sites into districts', dom: true, test: () => { const t = makeBusinessCtx(); const b = openWindow(t.ctx, def(t.ctx), { tab: 'suburbs' }); const ok = qa(b, 'table.suburbs tbody tr').length === 4 && /Greenwich/.test(b.textContent); t.done(); return ok; } },
    { id: 'win.sites.file', title: 'Site file shows jobs, invoices, conversations and the handover pack for one address', dom: true, test: () => { const t = makeBusinessCtx(); const s = t.ctx.business.model.sites.find((x) => x.customer === 'Jane Example'); t.ctx.store.set('ui.selectedSite', s.id); const b = openWindow(t.ctx, def(t.ctx), { tab: 'site' }); const ok = /Jane Example/.test(b.textContent) && /INV-0534/.test(b.textContent) && /Question about my battery/.test(b.textContent) && /20 % complete/.test(b.textContent) && qa(b, 'button').some((x) => /Visit in Solarhaven/.test(x.textContent)); t.done(); return ok; } }
];
