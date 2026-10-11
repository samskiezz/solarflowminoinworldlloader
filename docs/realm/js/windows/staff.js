/** People: who does the work and what they cost – staff, contractors, on-site job counts. */
import { h, button, badge, empty } from '../core/ui.js';
import { section, row, grid, statCard, money } from './_shared.js';
import { needsModel, makeBusinessCtx } from './_business.js';
import { openWindow, q, qa } from './_testing.js';

export function def(ctx) {
    return {
        id: 'staff', title: 'People', icon: '🧑‍🔧', hotkey: 'Shift+Y', width: 900, height: 620,
        tabs: [{ id: 'roster', label: 'Roster', icon: '🧑‍🔧' }, { id: 'cost', label: 'Cost', icon: '💸' }],
        render(body, { tab }) { if (needsModel(ctx, body)) return; (tab === 'cost' ? renderCost : renderRoster)(body, ctx); }
    };
}
function renderRoster(body, ctx) {
    const m = ctx.business.model; const s = m.stats.staff;
    body.append(section('People', grid(4, statCard('Staff', s.headcount), statCard('Contractors', s.contractors), statCard('Labour (period)', money(s.totalLabour)), statCard('Largest share', `${s.topShare} %`))));
    body.append(section('Roster', h('table', { class: 'data-table roster' }, h('thead', {}, h('tr', {}, h('th', {}, 'Name'), h('th', {}, 'Kind'), h('th', {}, 'Jobs on site'), h('th', {}, 'Cost (period)'), h('th', {}, 'Weekly'), h('th', {}, 'Cost / job'), h('th', {}, 'Sources'))), h('tbody', {}, m.staff.map((p) => h('tr', {}, h('td', {}, p.name), h('td', {}, badge(p.kind, p.kind === 'staff' ? 'ok' : 'neutral')), h('td', {}, String(p.jobsOnSite)), h('td', {}, p.annualCost ? money(p.annualCost) : ''), h('td', {}, p.weeklyCost ? money(p.weeklyCost) : ''), h('td', {}, p.costPerJob ? money(p.costPerJob) : (p.annualCost > 20000 ? h('span', { class: 'muted' }, 'no jobs named') : '')), h('td', { class: 'muted small' }, (p.source || []).join(', '))))))),
        h('p', { class: 'muted small' }, 'Jobs on site come from the "Team onsite:" line in ServiceM8 job descriptions. Name the crew on every job and cost per job becomes real.'));
}
function renderCost(body, ctx) {
    const m = ctx.business.model; const k = m.finance.kpis || {}; const labour = m.staff.filter((p) => p.annualCost > 0);
    body.append(section('Labour cost', grid(4, statCard('Labour & contractors', money(k.labourCost), `${k.labourSharePct ?? '–'} % of expenses`), statCard('Revenue per labour $', k.labourCost ? `${(k.revenue / k.labourCost).toFixed(2)}x` : '–'), statCard('Materials', money(k.materialsCost)), statCard('Vehicles', money(k.vehicleCost))), labour.length ? h('div', { class: 'bar-list' }, labour.map((p) => h('div', { class: 'bar-row' }, h('span', { class: 'bar-label' }, p.name), h('div', { class: 'bar-track' }, h('div', { class: 'bar-fill', style: { width: `${Math.round((p.annualCost / labour[0].annualCost) * 100)}%` } })), h('span', { class: 'bar-value' }, money(p.annualCost))))) : empty('No contractor accounts in the P&L')));
    body.append(section('Suggestions', h('ul', { class: 'notes' }, h('li', {}, 'Match each contractor invoice to a ServiceM8 job (reference the job number) so labour cost per install is known.'), h('li', {}, 'Compare cost per job across crews; move the busiest high-cost contractor to a fixed piece rate.'), h('li', {}, 'Weekly fixed payments with no jobs named are the first thing to review.'))));
}

export const FEATURES = [
    { id: 'win.staff.roster', title: 'Roster merges ServiceM8 staff with contractor accounts, weekly payments and on-site counts', dom: true, test: () => { const t = makeBusinessCtx(); const b = openWindow(t.ctx, def(t.ctx)); const ok = qa(b, 'table.roster tbody tr').length >= 2 && /Sam Example/.test(b.textContent) && /staff\+contractor|contractor/.test(b.textContent); t.done(); return ok; } },
    { id: 'win.staff.cost', title: 'Cost tab ranks labour cost with revenue per labour dollar', dom: true, test: () => { const t = makeBusinessCtx(); const b = openWindow(t.ctx, def(t.ctx), { tab: 'cost' }); const ok = /Revenue per labour/.test(b.textContent) && qa(b, '.bar-row').length >= 1; t.done(); return ok; } }
];
