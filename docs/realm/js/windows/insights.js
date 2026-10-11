/** Findings: what the minions found across the business, who owns it, what it is worth and what to do. */
import { h, button, badge, empty } from '../core/ui.js';
import { section, row, money } from './_shared.js';
import { needsModel, findingCard, sevBadge, makeBusinessCtx } from './_business.js';
import { openWindow, q, qa } from './_testing.js';

export function def(ctx) {
    return {
        id: 'insights', title: 'Findings', icon: '🔎', hotkey: 'Shift+K', width: 940, height: 680,
        tabs: [{ id: 'open', label: 'Open', icon: '🔎' }, { id: 'owners', label: 'By minion', icon: '🧑‍🔧' }, { id: 'resolved', label: 'Resolved', icon: '✔' }],
        render(body, { tab }) { if (needsModel(ctx, body)) return; ({ owners: renderOwners, resolved: renderResolved }[tab] || renderOpen)(body, ctx); }
    };
}

function renderOpen(body, ctx) {
    const all = ctx.business.findings(); const sum = ctx.business.summary();
    const filter = ctx.store.get('ui.insightFilter', { severity: '', category: '', q: '' });
    const cats = [...new Set(all.map((f) => f.category))].sort();
    const sevSel = h('select', { class: 'input', onchange: (e) => { ctx.store.set('ui.insightFilter', { ...filter, severity: e.target.value }); ctx.refresh('insights'); } }, h('option', { value: '' }, 'All severities'), ['critical', 'high', 'medium', 'low', 'info'].map((s) => h('option', { value: s, selected: filter.severity === s ? '' : null }, `${s} (${sum.bySeverity[s] || 0})`)));
    const catSel = h('select', { class: 'input', onchange: (e) => { ctx.store.set('ui.insightFilter', { ...filter, category: e.target.value }); ctx.refresh('insights'); } }, h('option', { value: '' }, 'All categories'), cats.map((c) => h('option', { value: c, selected: filter.category === c ? '' : null }, `${c} (${sum.byCategory[c]})`)));
    const search = h('input', { class: 'input', type: 'search', placeholder: 'search findings', value: filter.q, oninput: (e) => { ctx.store.set('ui.insightFilter', { ...filter, q: e.target.value }); } , onchange: () => ctx.refresh('insights') });
    let list = all; if (filter.severity) list = list.filter((f) => f.severity === filter.severity); if (filter.category) list = list.filter((f) => f.category === filter.category); if (filter.q) list = list.filter((f) => `${f.title} ${f.detail}`.toLowerCase().includes(filter.q.toLowerCase()));
    body.append(section(`${sum.actionable} open findings · ${money(sum.impact)} at stake · health ${sum.score}`, row(sevSel, catSel, search, button('Make quests', () => { ctx.store.set('ui.questSource', 'insights'); ctx.open('quests'); }, { small: true }))));
    body.append(list.length ? h('div', { class: 'finding-list' }, list.map((f) => findingCard(ctx, f))) : empty('Nothing matches – or everything is resolved.'));
}
function renderOwners(body, ctx) {
    const all = ctx.business.findings({ includeInfo: false }); const by = {}; for (const f of all) (by[f.owner] = by[f.owner] || []).push(f);
    const owners = Object.entries(by).sort((a, b) => b[1].length - a[1].length);
    body.append(section('Who is carrying what', h('div', { class: 'agent-grid' }, owners.map(([id, list]) => { const a = ctx.world.agent(id); const impact = list.reduce((s, f) => s + (f.impact || 0), 0); return h('div', { class: 'card agent-card owner-card' }, h('div', { class: 'card-title' }, a ? a.name : id, ' ', badge(String(list.length), 'accent')), h('div', { class: 'card-sub' }, a?.meta?.title || ''), h('div', { class: 'muted small' }, `${money(impact)} at stake · ${list.filter((f) => f.severity === 'critical' || f.severity === 'high').length} urgent`), h('ul', { class: 'owner-list' }, list.slice(0, 4).map((f) => h('li', {}, sevBadge(f.severity), ' ', f.title))), row(button('Open findings', () => { ctx.store.set('ui.insightFilter', { severity: '', category: '', q: '' }); ctx.open('insights', { tab: 'open' }); }, { small: true }), a ? button(`Talk to ${a.name}`, () => { ctx.store.set('ui.chatAgent', id); ctx.open('chat', { tab: 'talk' }); }, { small: true }) : null)); }))));
}
function renderResolved(body, ctx) {
    const st = ctx.store.get('business.insights', {}); const resolved = Object.entries(st.resolved || {}); const snoozed = Object.entries(st.snoozed || {}).filter(([, until]) => until > Date.now());
    const titleOf = (id) => (ctx.business.model.insights || []).find((f) => f.id === id)?.title || id;
    body.append(section(`Resolved (${resolved.length})`, resolved.length ? h('ul', { class: 'notes' }, resolved.map(([id, r]) => h('li', {}, h('span', { class: 'muted' }, String(r.at || '').slice(0, 10)), ` ${titleOf(id)} `, button('Reopen', () => { ctx.business.reopen(id); ctx.refresh('insights'); }, { small: true })))) : empty('Nothing resolved yet')));
    body.append(section(`Snoozed (${snoozed.length})`, snoozed.length ? h('ul', { class: 'notes' }, snoozed.map(([id, until]) => h('li', {}, h('span', { class: 'muted' }, `until ${new Date(until).toISOString().slice(0, 10)}`), ` ${titleOf(id)} `, button('Wake', () => { ctx.business.reopen(id); ctx.refresh('insights'); }, { small: true })))) : empty('Nothing snoozed')));
}

export const FEATURES = [
    { id: 'win.insights.list', title: 'Open findings list with severity/category filters, impact and owners', dom: true, test: () => { const t = makeBusinessCtx(); const b = openWindow(t.ctx, def(t.ctx)); const n = qa(b, '.finding').length; const sel = qa(b, 'select')[0]; sel.value = 'critical'; sel.dispatchEvent(new Event('change', { bubbles: true })); const b2 = t.ctx.wm.windows.get('insights').body; const crit = qa(b2, '.finding').length; t.done(); return n >= 10 && crit >= 1 && crit < n && qa(b2, '.finding').every((el) => el.classList.contains('sev-critical')); } },
    { id: 'win.insights.resolve', title: 'Resolving from the card pays credits and moves the finding to the Resolved tab', dom: true, test: () => { const t = makeBusinessCtx(); let b = openWindow(t.ctx, def(t.ctx)); const before = qa(b, '.finding').length; const bal = t.ctx.world.ledger.balance; qa(b, 'button').find((x) => /Resolve/.test(x.textContent)).click(); b = t.ctx.wm.windows.get('insights').body; const after = qa(b, '.finding').length; const r = openWindow(t.ctx, def(t.ctx), { tab: 'resolved' }); const ok = after === before - 1 && t.ctx.world.ledger.balance > bal && qa(r, 'li').length >= 1; t.done(); return ok; } },
    { id: 'win.insights.owners', title: 'By-minion tab groups findings per owner with a talk button', dom: true, test: () => { const t = makeBusinessCtx(); const b = openWindow(t.ctx, def(t.ctx), { tab: 'owners' }); const ok = qa(b, '.owner-card').length >= 5 && qa(b, 'button').some((x) => /Talk to/.test(x.textContent)); t.done(); return ok; } }
];
