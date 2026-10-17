/** Programme: the thousand-feature programme – what is live, what is a register, what is a policy, what the minions have specified – its progress through the workforce, and every item's evidence. */
import { h, button, badge, select, textInput, progressBar, empty, download } from '../core/ui.js';
import { STATUSES, STATUS_LABEL, BATCH_BY_MODE } from '../sim/programme.js';
import { REGISTER_BY_ID } from '../core/registers.js';
import { POLICY_BY_ID } from '../core/policies.js';
import { section, row, grid, statCard } from './_shared.js';
import { makeTestCtx, openWindow, q, qa, fire } from './_testing.js';

const STATUS_KIND = { live: 'ok', register: 'accent', policy: 'neutral', spec: 'warn' };
const STATE_KIND = { open: 'neutral', queued: 'accent', signed: 'ok' };

function renderOverview(body, ctx) {
    const p = ctx.world.programme; if (!p.loaded) { body.append(empty('The programme file has not loaded yet (docs/data/programme.json).')); return; }
    const s = p.summary(); const wf = ctx.world.workforce.summary();
    body.append(grid(5, statCard('Items', s.total, 'the thousand'), statCard('Signed off by Ultron', s.signedTotal, `${s.pct} %`, 'var(--ok)'), statCard('In the pipeline', s.queued, `${wf.busy} workers busy`), statCard('Verified by self-test', s.verified, `of ${s.by.live} live`), statCard('Specified', s.specs, `of ${s.by.spec} server-side`)));
    body.append(section('Progress', progressBar(s.pct, { label: `${s.signedTotal} of ${s.total} signed off` }),
        h('div', { class: 'status-legend' }, STATUSES.map((st) => h('span', { class: 'legend-item' }, badge(`${st} ${s.by[st]}`, STATUS_KIND[st]), h('span', { class: 'muted small' }, ` ${STATUS_LABEL[st]} · ${s.signed[st]} signed`))))));
    const mode = select(Object.keys(BATCH_BY_MODE).map((m) => ({ value: m, label: `${m} (${BATCH_BY_MODE[m]} per sweep)` })), { value: p.mode }); mode.classList.add('programme-mode');
    mode.addEventListener('change', () => { p.setMode(mode.value); ctx.policies.set('automation.mode', mode.value); ctx.saveWorld(); ctx.refresh('programme'); });
    body.append(section('Run mode', row(mode, button('Sweep now', () => { const n = p.sweep(ctx.world, { library: ctx.library }); ctx.saveWorld(); ctx.refresh('programme'); ctx.notify('workforce', `${n} programme items queued for the workforce`); }, { kind: 'primary', small: true }), button('Run the next shift (8 h)', () => { for (let i = 0; i < 16; i++) ctx.world.tick(0.5); ctx.saveWorld(); ctx.refresh(); ctx.bus.emit('clock:tick', { clock: ctx.world.clock }); }, { small: true }), button('Export state', () => download('programme-state.json', JSON.stringify({ summary: s, state: p.state }, null, 2), 'application/json'), { small: true })),
        h('p', { class: 'muted small' }, 'Full mode sweeps eighty items into the workforce every six simulated hours until every item is signed. Each item is researched against the library, executed by its team, audited, reviewed and signed off at the top; server-side items get a specification record instead of code.')));
    body.append(section('By domain', h('table', { class: 'data-table domain-table' }, h('thead', {}, h('tr', {}, h('th', {}, 'Domain'), h('th', {}, 'Team'), h('th', {}, 'Items'), h('th', {}, 'Live'), h('th', {}, 'Signed'), h('th', {}, ''))), h('tbody', {}, s.domains.map((d) => h('tr', { class: 'domain-row', onclick: () => { ctx.store.set('ui.programmeDomain', d.id); ctx.open('programme', { tab: 'items' }); ctx.refresh('programme'); } }, h('td', {}, d.title), h('td', { class: 'small' }, ctx.world.workforce.team(d.team)?.name || d.team), h('td', {}, String(d.total)), h('td', {}, String(d.live)), h('td', {}, String(d.signed)), h('td', { style: { width: '160px' } }, progressBar(d.total ? Math.round((d.signed / d.total) * 100) : 0, { small: true, showValue: false }))))))));
}

function renderItems(body, ctx) {
    const p = ctx.world.programme; if (!p.loaded) { body.append(empty('Programme not loaded.')); return; }
    const domain = ctx.store.get('ui.programmeDomain', ''); const status = ctx.store.get('ui.programmeStatus', ''); const query = ctx.store.get('ui.programmeQuery', '');
    const dSel = select([{ value: '', label: 'Every domain' }, ...p.domains.map((d) => ({ value: d.id, label: d.title }))], { value: domain }); dSel.classList.add('programme-domain'); dSel.addEventListener('change', () => { ctx.store.set('ui.programmeDomain', dSel.value); ctx.refresh('programme'); });
    const sSel = select([{ value: '', label: 'Every status' }, ...STATUSES.map((s) => ({ value: s, label: s }))], { value: status }); sSel.classList.add('programme-status'); sSel.addEventListener('change', () => { ctx.store.set('ui.programmeStatus', sSel.value); ctx.refresh('programme'); });
    const search = textInput({ value: query, placeholder: 'Search by title or number…' }); search.classList.add('programme-search'); search.addEventListener('change', () => { ctx.store.set('ui.programmeQuery', search.value); ctx.refresh('programme'); });
    const rows = p.rows({ domain: domain || null, status: status || null, query });
    const selected = ctx.store.get('ui.programmeItem'); const item = selected ? p.item(selected) : null;
    body.append(section(null, row(dSel, sSel, search, h('span', { class: 'muted small' }, `${rows.length} item${rows.length === 1 ? '' : 's'}`))));
    if (item) {
        const st = p.stateOf(item.n);
        body.append(section(`#${item.n} ${item.title}`, row(badge(item.status, STATUS_KIND[item.status]), badge(st.status, STATE_KIND[st.status] || 'neutral'), st.verified === true ? badge('verified', 'ok') : st.verified === false ? badge('self-test failed', 'bad') : null, h('span', { class: 'muted small' }, `${item.domainTitle} · ${ctx.world.workforce.team(item.team)?.name || item.team}`)),
            h('div', { class: 'programme-evidence' },
                item.features.length ? h('p', {}, h('b', {}, 'Backed by features: '), item.features.map((f) => h('code', { class: 'mono' }, f, ' '))) : null,
                item.registers.length ? h('p', {}, h('b', {}, 'Register: '), item.registers.map((r) => button(REGISTER_BY_ID[r]?.title || r, () => { ctx.store.set('ui.register', r); ctx.open('registers', { tab: 'rows' }); }, { small: true }))) : null,
                item.policies.length ? h('p', {}, h('b', {}, 'Policy: '), item.policies.map((id) => button(POLICY_BY_ID[id]?.title || id, () => { ctx.store.set('ui.policyDomain', POLICY_BY_ID[id]?.domain || 'automation'); ctx.open('policies'); }, { small: true }))) : null,
                st.citations && st.citations.length ? h('p', {}, h('b', {}, 'Research citations: '), st.citations.map((c) => h('span', { class: 'badge badge-neutral' }, `${c.code}${c.heading ? ` – ${c.heading}` : ''} `))) : h('p', { class: 'muted small' }, st.status === 'open' ? 'Not yet swept into the workforce.' : 'No library passage matched; the research stage found nothing to cite.'),
                st.spec ? h('div', { class: 'programme-spec' }, h('b', {}, `Specification (depends on: ${st.spec.dependsOn})`), h('ol', {}, st.spec.requirements.map((r) => h('li', {}, r))), h('b', {}, 'Acceptance'), h('ul', {}, st.spec.acceptance.map((a) => h('li', {}, a)))) : null,
                st.signedAt ? h('p', { class: 'muted small' }, `Signed off after ${st.handoffs} hand-offs${st.reworks ? ` and ${st.reworks} rework` : ''}.`) : null),
            row(button('Close', () => { ctx.store.set('ui.programmeItem', null); ctx.refresh('programme'); }, { small: true }))));
    }
    body.append(section('Items', rows.length ? h('div', { class: 'table-scroll' }, h('table', { class: 'data-table programme-table' }, h('thead', {}, h('tr', {}, h('th', {}, '#'), h('th', {}, 'Feature'), h('th', {}, 'How'), h('th', {}, 'Team'), h('th', {}, 'Workforce'), h('th', {}, 'Verified'))), h('tbody', {}, rows.slice(0, 400).map((r) => h('tr', { class: 'programme-row', onclick: () => { ctx.store.set('ui.programmeItem', r.n); ctx.refresh('programme'); } }, h('td', { class: 'mono' }, String(r.n)), h('td', {}, r.title), h('td', {}, badge(r.status, STATUS_KIND[r.status])), h('td', { class: 'small' }, ctx.world.workforce.team(r.team)?.name || r.team), h('td', {}, badge(r.state.status, STATE_KIND[r.state.status] || 'neutral')), h('td', {}, r.state.verified === true ? '✔' : r.state.verified === false ? '✘' : r.status === 'live' ? '…' : '–')))))) : empty('Nothing matches.'), rows.length > 400 ? h('p', { class: 'muted small' }, `…and ${rows.length - 400} more; narrow the filter.`) : null));
}

function renderSpecs(body, ctx) {
    const p = ctx.world.programme; const specs = p.items.filter((i) => p.stateOf(i.n).spec);
    body.append(section(`Specifications the minions have written (${specs.length})`, specs.length ? h('table', { class: 'data-table spec-table' }, h('thead', {}, h('tr', {}, h('th', {}, '#'), h('th', {}, 'Feature'), h('th', {}, 'Depends on'), h('th', {}, 'Citations'))), h('tbody', {}, specs.map((i) => { const st = p.stateOf(i.n); return h('tr', { class: 'spec-row', onclick: () => { ctx.store.set('ui.programmeItem', i.n); ctx.open('programme', { tab: 'items' }); ctx.refresh('programme'); } }, h('td', { class: 'mono' }, String(i.n)), h('td', {}, i.title), h('td', {}, badge(st.spec.dependsOn, st.spec.dependsOn === 'server' ? 'accent' : st.spec.dependsOn === 'device' ? 'neutral' : 'warn')), h('td', { class: 'small' }, st.spec.citations.map((c) => c.code).join(', ') || '–')); }))) : empty('No specifications yet – they appear as the workforce signs off server-side items.'),
        row(button('Export specifications', () => download('programme-specs.json', JSON.stringify(specs.map((i) => ({ n: i.n, title: i.title, domain: i.domainTitle, ...p.stateOf(i.n).spec })), null, 2), 'application/json'), { small: true }))));
}

export function def(ctx) {
    return {
        id: 'programme', title: 'Programme – the thousand', icon: '🎯', hotkey: null, width: 1040, height: 700,
        tabs: [{ id: 'overview', label: 'Overview', icon: '🎯' }, { id: 'items', label: 'Items', icon: '≡' }, { id: 'specs', label: 'Specifications', icon: '📄' }],
        render(body, { tab }) { if (tab === 'items') return renderItems(body, ctx); if (tab === 'specs') return renderSpecs(body, ctx); return renderOverview(body, ctx); }
    };
}

const loadSample = async (t) => { const { sampleProgramme } = await import('../sim/programme.js'); const p = sampleProgramme(); t.ctx.world.programme.load({ items: p.items, domains: p.domains }); };
export const FEATURES = [
    { id: 'win.programme.overview', title: 'Overview shows totals, the status legend, the run mode and progress by domain', dom: true, test: async () => { const t = makeTestCtx(); await loadSample(t); const b = openWindow(t.ctx, def(t.ctx)); const ok = /Signed off by Ultron/.test(b.textContent) && qa(b, '.domain-row').length === 2 && q(b, '.programme-mode').value === 'full' && /live 1/.test(b.textContent); t.done(); return ok; } },
    { id: 'win.programme.sweepRun', title: 'Sweep now queues items; running a shift signs them off and the counts move', dom: true, test: async () => { const t = makeTestCtx(); await loadSample(t); let b = openWindow(t.ctx, def(t.ctx)); qa(b, 'button').find((x) => /Sweep now/.test(x.textContent)).click(); b = t.ctx.wm.windows.get('programme').body; const queued = t.ctx.world.programme.summary().queued === 6; for (let i = 0; i < 6; i++) qa(b, 'button').find((x) => /Run the next shift/.test(x.textContent)).click(); const s = t.ctx.world.programme.summary(); const ok = queued && s.signedTotal >= 4; t.done(); return ok; } },
    { id: 'win.programme.items', title: 'Items filter by domain, status and search; selecting one shows its backing and evidence', dom: true, test: async () => { const t = makeTestCtx(); await loadSample(t); t.ctx.store.set('ui.programmeStatus', 'spec'); let b = openWindow(t.ctx, def(t.ctx), { tab: 'items' }); const three = qa(b, '.programme-row').length === 3; q(b, '.programme-row').click(); b = t.ctx.wm.windows.get('programme').body; const detail = /#4 Modbus/.test(b.textContent) && /Not yet swept/.test(b.textContent); t.ctx.store.set('ui.programmeStatus', 'register'); t.ctx.store.set('ui.programmeItem', 2); b = openWindow(t.ctx, def(t.ctx), { tab: 'items' }); const reg = /Risk register/.test(b.textContent); t.done(); return three && detail && reg; } },
    { id: 'win.programme.specs', title: 'Signed-off server-side items appear as specifications with their dependency', dom: true, test: async () => { const t = makeTestCtx(); await loadSample(t); const p = t.ctx.world.programme; p.sweep(t.ctx.world); for (let i = 0; i < 60 && p.summary().signedTotal < 6; i++) t.ctx.world.tick(1); const b = openWindow(t.ctx, def(t.ctx), { tab: 'specs' }); const ok = qa(b, '.spec-row').length === 3 && /external/.test(b.textContent); t.done(); return ok; } }
];
