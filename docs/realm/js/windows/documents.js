/** Documents: handover packs in Drive against the installed base, and what each pack is missing. */
import { h, button, badge, empty, progressBar } from '../core/ui.js';
import { section, row, grid, statCard } from './_shared.js';
import { needsModel, link, fmtDate, makeBusinessCtx } from './_business.js';
import { REQUIRED_PACK_DOCS } from '../business/drive.js';
import { openWindow, q, qa } from './_testing.js';

export function def(ctx) {
    return {
        id: 'documents', title: 'Handover packs', icon: '📁', hotkey: 'Shift+T', width: 920, height: 640,
        tabs: [{ id: 'packs', label: 'Packs', icon: '📁' }, { id: 'missing', label: 'Missing', icon: '⚠' }, { id: 'standard', label: 'Standard', icon: '📋' }],
        render(body, { tab }) { if (needsModel(ctx, body)) return; ({ missing: renderMissing, standard: renderStandard }[tab] || renderPacks)(body, ctx); }
    };
}
function renderPacks(body, ctx) {
    const m = ctx.business.model; const s = m.stats.documents; const packs = m.packs || [];
    body.append(section('Coverage', grid(4, statCard('Packs in Drive', s.packs), statCard('Matched to sites', s.matched), statCard('Installed without pack', s.uncovered, '', s.uncovered ? 'var(--warn)' : null), statCard('Average completeness', s.avgScore != null ? `${s.avgScore} %` : 'files not scanned')), row(m.documents?.root ? link('Open Handover Documents', m.documents.root.url || m.documents.root) : null)));
    body.append(section(`Packs (${packs.length})`, packs.length ? h('table', { class: 'data-table packs' }, h('thead', {}, h('tr', {}, h('th', {}, 'Customer folder'), h('th', {}, 'Created'), h('th', {}, 'Site'), h('th', {}, 'Complete'), h('th', {}, 'Missing'), h('th', {}, ''))), h('tbody', {}, packs.map((p) => { const site = p.siteId ? ctx.business.site(p.siteId) : null; return h('tr', {}, h('td', {}, p.customer, p.duplicate ? badge('duplicate', 'warn') : null), h('td', {}, fmtDate(p.created)), h('td', {}, site ? `${site.address.line1}, ${site.address.suburb}` : h('span', { class: 'muted' }, 'no matching job')), h('td', {}, p.score == null ? h('span', { class: 'muted' }, 'not scanned') : progressBar(p.score, { small: true })), h('td', { class: 'muted small' }, p.missing.slice(0, 3).join(', ') + (p.missing.length > 3 ? ` +${p.missing.length - 3}` : '')), h('td', {}, link('Drive', p.url))); }))) : empty('No handover folders found')));
}
function renderMissing(body, ctx) {
    const m = ctx.business.model; const ids = new Set(m.stats.documents.uncoveredSites || []); const sites = m.sites.filter((s) => ids.has(s.id));
    body.append(section(`${sites.length} installed sites with no handover pack`, h('p', { class: 'muted small' }, 'Every completed install needs a customer folder with the documents on the Standard tab. These sites have none in Drive.'), sites.length ? h('table', { class: 'data-table uncovered' }, h('thead', {}, h('tr', {}, h('th', {}, 'Customer'), h('th', {}, 'Address'), h('th', {}, 'Last job'), h('th', {}, ''))), h('tbody', {}, sites.map((s) => h('tr', {}, h('td', {}, s.customer || '(unknown)'), h('td', {}, s.address.raw), h('td', {}, `#${s.lastJob}`), h('td', {}, button('Site file', () => { ctx.store.set('ui.selectedSite', s.id); ctx.open('sites', { tab: 'site' }); }, { small: true }), ' ', button('Handover window', () => { if (ctx.job(s.jobs[0])) ctx.setCurrentJob(s.jobs[0]); ctx.open('handover'); }, { small: true })))))) : empty('Every installed site has a pack.')));
}
function renderStandard(body, ctx) {
    body.append(section('What a handover pack must contain', h('ol', { class: 'notes' }, REQUIRED_PACK_DOCS.map((d) => h('li', {}, h('strong', {}, d.label)))), h('p', { class: 'muted small' }, 'Name files so the scanner recognises them (for example "CCEW 12345.pdf", "Commissioning sheet.pdf", "Warranty inverter.pdf", "SLD.pdf", "Ausgrid approval.pdf"). The realm\'s Handover window generates the manual, labels and commissioning sheet for the current job.'), row(button('Open Handover generator', () => ctx.open('handover'), { small: true }))));
}

export const FEATURES = [
    { id: 'win.documents.packs', title: 'Packs tab shows coverage KPIs and every Drive folder with its completeness and missing documents', dom: true, test: () => { const t = makeBusinessCtx(); const b = openWindow(t.ctx, def(t.ctx)); const ok = qa(b, 'table.packs tbody tr').length === 1 && /STC assignment form/.test(b.textContent) && qa(b, '.stat').length === 4; t.done(); return ok; } },
    { id: 'win.documents.missing', title: 'Missing tab lists installed sites without a pack with a jump to the site file', dom: true, test: () => { const t = makeBusinessCtx(); const b = openWindow(t.ctx, def(t.ctx), { tab: 'missing' }); const ok = qa(b, 'table.uncovered tbody tr').length === 1 && /Alex Demo|Partner Energy/.test(b.textContent); t.done(); return ok; } },
    { id: 'win.documents.standard', title: 'Standard tab lists the ten required documents', dom: true, test: () => { const t = makeBusinessCtx(); const b = openWindow(t.ctx, def(t.ctx), { tab: 'standard' }); const ok = qa(b, 'ol li').length === 10; t.done(); return ok; } }
];
