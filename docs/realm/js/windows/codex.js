/** Codex: the standards library – browse standards and clauses, search, jurisdictions and reading history. */
import { h, button, badge, empty, dataTable } from '../core/ui.js';
import { STANDARDS, searchStandards } from '../domain/standards.js';
import { JURISDICTIONS, listJurisdictions } from '../domain/jurisdictions.js';
import { CHECKLISTS } from '../domain/checklists.js';
import { section, grid, row, statCard } from './_shared.js';
import { makeTestCtx, openWindow, q, qa, fire } from './_testing.js';

export function def(ctx) {
    return {
        id: 'codex', title: ctx.t('nav.codex'), icon: '📚', hotkey: 'N', width: 900, height: 600,
        tabs: [{ id: 'library', label: 'Library', icon: '📚' }, { id: 'search', label: 'Search', icon: '🔍' }, { id: 'jurisdictions', label: 'Jurisdictions', icon: '🌏' }, { id: 'history', label: 'Reading log', icon: '🕮' }],
        render(body, { tab, query }) {
            if (tab === 'search') return renderSearch(body, ctx, query);
            if (tab === 'jurisdictions') return renderJurisdictions(body, ctx);
            if (tab === 'history') return renderHistory(body, ctx);
            return renderLibrary(body, ctx);
        }
    };
}

export function clauseKey(stdId, ref) { return `${stdId}#${ref}`; }
function bookmarks(ctx) { return ctx.store.get('codexBookmarks', []); }
function toggleBookmark(ctx, key) { const list = bookmarks(ctx); ctx.store.set('codexBookmarks', list.includes(key) ? list.filter((k) => k !== key) : [...list, key]); }
function markRead(ctx, stdId, ref) {
    const log = ctx.store.get('codexLog', []);
    const key = clauseKey(stdId, ref);
    if (!log.some((e) => e.key === key)) { ctx.store.set('codexLog', [...log, { key, at: new Date(ctx.now()).toISOString() }]); ctx.world.recordStat('clausesViewed'); ctx.saveWorld(); }
}

function renderLibrary(body, ctx) {
    const selected = ctx.store.get('ui.codexStandard') || STANDARDS[0].id;
    const std = STANDARDS.find((s) => s.id === selected) || STANDARDS[0];
    const log = ctx.store.get('codexLog', []);
    const list = h('div', { class: 'codex-list' }, STANDARDS.map((s) => h('div', { class: `codex-item ${s.id === std.id ? 'selected' : ''}`, onclick: () => { ctx.store.set('ui.codexStandard', s.id); ctx.refresh('codex'); } }, h('div', { class: 'card-title' }, s.code), h('div', { class: 'card-sub' }, s.title), h('div', { class: 'muted' }, `${s.clauses.length} clauses`))));
    const open = ctx.store.get('ui.codexClause');
    const detail = section(null, h('h2', { class: 'job-heading' }, std.code), h('div', { class: 'muted' }, `${std.title} · ${std.edition} · ${std.committee}`), h('p', {}, std.scope),
        h('div', { class: 'clauses' }, std.clauses.map((c) => { const key = clauseKey(std.id, c.ref); const isOpen = open === key; return h('details', { class: `clause-row ${log.some((e) => e.key === key) ? 'read' : ''}`, open: isOpen ? '' : null, ontoggle: (e) => { if (e.target.open) { ctx.store.set('ui.codexClause', key); markRead(ctx, std.id, c.ref); e.target.classList.add('read'); } } }, h('summary', {}, h('span', { class: 'clause-ref' }, `Cl ${c.ref}`), ' ', c.title, log.some((e) => e.key === key) ? badge('read', 'ok') : null, ' ', h('button', { class: `btn tiny bookmark ${bookmarks(ctx).includes(key) ? 'gold' : ''}`, title: 'Bookmark', onclick: (e) => { e.preventDefault(); e.stopPropagation(); toggleBookmark(ctx, key); e.target.classList.toggle('gold'); } }, '★')), h('p', {}, c.summary), c.note ? h('p', { class: 'muted' }, c.note) : null, h('div', { class: 'muted' }, 'Related checklist items: ', relatedChecklistCount(std.code, c.ref))); })),
        h('p', { class: 'muted small' }, 'Summaries are the author\'s plain-language notes for screening. The standards themselves are copyrighted by Standards Australia and must be consulted for compliance decisions.'));
    body.append(h('div', { class: 'codex-layout' }, list, detail));
}
export function relatedChecklistCount(code, ref) {
    const prefix = code.split(':')[0];
    let n = 0;
    for (const cl of Object.values(CHECKLISTS)) for (const item of cl.items) if (item.reference.includes(prefix) && item.reference.includes(ref)) n++;
    return n;
}

function renderSearch(body, ctx, initial = '') {
    const saved = initial || ctx.store.get('ui.codexQuery', '');
    const input = h('input', { type: 'search', class: 'input', placeholder: 'Search clauses: "voltage rise", "600 mm", "isolator"…', value: saved, oninput: () => { ctx.store.set('ui.codexQuery', input.value); run(); } });
    const out = h('div');
    const run = () => { out.replaceChildren(); const qv = input.value.trim(); if (!qv) { out.append(empty('Type to search every clause summary across the library.')); return; } const hits = searchStandards(qv); const checklistHits = Object.values(CHECKLISTS).flatMap((cl) => cl.items.filter((i) => `${i.text} ${i.reference}`.toLowerCase().includes(qv.toLowerCase())).map((i) => ({ ...i, checklist: cl.title }))); out.append(h('div', { class: 'muted' }, `${hits.length} clause hit${hits.length === 1 ? '' : 's'}, ${checklistHits.length} checklist item${checklistHits.length === 1 ? '' : 's'}`)); for (const hit of hits) out.append(h('div', { class: 'card hit', onclick: () => { ctx.store.set('ui.codexStandard', hit.standardId); ctx.store.set('ui.codexClause', clauseKey(hit.standardId, hit.ref)); markRead(ctx, hit.standardId, hit.ref); ctx.wm.setTab('codex', 'library'); } }, h('div', { class: 'card-title' }, `${hit.standard} Cl ${hit.ref} – ${hit.title}`), h('div', {}, hit.summary))); for (const item of checklistHits) out.append(h('div', { class: 'card hit checklist-hit' }, h('div', { class: 'card-title' }, badge('checklist'), ' ', item.checklist), h('div', {}, item.text), h('div', { class: 'muted' }, item.reference))); };
    body.append(section('Search the Codex', input, out));
    run();
}

function renderJurisdictions(body, ctx) {
    const current = ctx.profile().jurisdiction;
    const keys = ['voltageRisePct', 'voltageDropPct', 'dcVoltageDropPct', 'domesticArrayMaxV', 'commercialArrayMaxV', 'dcAcRatio', 'singlePhaseMaxKva', 'phaseImbalanceKva'];
    const js = listJurisdictions();
    body.append(section('Design limits by jurisdiction', h('table', { class: 'data-table compare' }, h('thead', {}, h('tr', {}, h('th', {}, 'Limit'), js.map((j) => h('th', { class: j.id === current ? 'current' : '' }, j.name, j.complete ? '' : ' *')))), h('tbody', {}, keys.map((k) => h('tr', {}, h('td', {}, k.replace(/([A-Z])/g, ' $1').replace(/Pct/, ' %').toLowerCase()), js.map((j) => h('td', {}, JURISDICTIONS[j.id].limits[k] ?? '–')))), h('tr', {}, h('td', {}, 'voltage'), js.map((j) => h('td', {}, `${JURISDICTIONS[j.id].voltage.singlePhase}/${JURISDICTIONS[j.id].voltage.threePhase} V ${JURISDICTIONS[j.id].voltage.frequency} Hz`))), h('tr', {}, h('td', {}, 'accreditation'), js.map((j) => h('td', {}, JURISDICTIONS[j.id].accreditation))), h('tr', {}, h('td', {}, 'product lists'), js.map((j) => h('td', {}, JURISDICTIONS[j.id].productLists))), h('tr', {}, h('td', {}, 'network operator'), js.map((j) => h('td', {}, JURISDICTIONS[j.id].dnspTerm))))), h('p', { class: 'muted' }, '* Reference-only jurisdictions: limits are indicative and the calculators enforce the Australian/New Zealand rules. Choose your jurisdiction in the Character window.')),
        grid(2, js.map((j) => section(`${j.name} standards`, h('ul', { class: 'notes' }, JURISDICTIONS[j.id].standards.map((s) => h('li', {}, s))), h('div', { class: 'muted' }, 'Incentives: ', JURISDICTIONS[j.id].incentives.join('; '))))));
}

function renderHistory(body, ctx) {
    const log = ctx.store.get('codexLog', []);
    const marks = bookmarks(ctx);
    if (marks.length) body.append(section('Bookmarked clauses', h('ul', { class: 'notes' }, marks.map((key) => { const [stdId, ref] = key.split('#'); const std = STANDARDS.find((s) => s.id === stdId); const c = std?.clauses.find((x) => x.ref === ref); return h('li', {}, h('a', { href: '#', onclick: (e) => { e.preventDefault(); ctx.store.set('ui.codexStandard', stdId); ctx.store.set('ui.codexClause', key); ctx.wm.setTab('codex', 'library'); } }, `${std?.code || stdId} Cl ${ref}`), ` – ${c?.title || ''}`); }))));
    const total = STANDARDS.reduce((n, s) => n + s.clauses.length, 0);
    body.append(grid(3, statCard('Clauses read', log.length), statCard('Library size', total), statCard('Coverage', `${Math.round((log.length / total) * 100)} %`)),
        section('Reading log', log.length ? dataTable({ columns: [{ key: 'at', label: 'When', render: (r) => r.at.slice(0, 16).replace('T', ' ') }, { key: 'standard', label: 'Standard' }, { key: 'ref', label: 'Clause' }, { key: 'title', label: 'Title' }], rows: [...log].reverse().map((e) => { const [stdId, ref] = e.key.split('#'); const std = STANDARDS.find((s) => s.id === stdId); const c = std?.clauses.find((x) => x.ref === ref); return { at: e.at, standard: std?.code || stdId, ref, title: c?.title || '' }; }), searchable: false }).el : empty('Open clauses in the Library to build your reading log (and the Codex reader achievement).')));
}

export const FEATURES = [
    { id: 'win.codex.library', title: 'Standards library with clause list', dom: true, test: () => { const t = makeTestCtx(); const b = openWindow(t.ctx, def(t.ctx)); const ok = qa(b, '.codex-item').length === STANDARDS.length && qa(b, '.clause-row').length === STANDARDS[0].clauses.length; t.done(); return ok; } },
    { id: 'win.codex.selectStandard', title: 'Switch between standards', dom: true, test: () => { const t = makeTestCtx(); const b = openWindow(t.ctx, def(t.ctx)); qa(b, '.codex-item')[2].click(); const ok = t.ctx.store.get('ui.codexStandard') === STANDARDS[2].id && new RegExp(STANDARDS[2].code.replace(/[/.]/g, '.')).test(t.ctx.wm.windows.get('codex').body.textContent); t.done(); return ok; } },
    { id: 'win.codex.readClause', title: 'Opening a clause logs it and counts toward achievements', dom: true, test: () => { const t = makeTestCtx(); const b = openWindow(t.ctx, def(t.ctx)); const d = q(b, '.clause-row'); d.open = true; d.dispatchEvent(new Event('toggle')); const ok = t.ctx.store.get('codexLog').length === 1 && t.ctx.world.stats.clausesViewed === 1; t.done(); return ok; } },
    { id: 'win.codex.search', title: 'Full-text search across clauses and checklist items', dom: true, test: () => { const t = makeTestCtx(); const b = openWindow(t.ctx, def(t.ctx), { tab: 'search' }); const i = q(b, 'input[type=search]'); i.value = 'voltage rise'; fire(i); const ok = qa(b, '.hit').length >= 2 && /clause hit/.test(b.textContent); t.done(); return ok; } },
    { id: 'win.codex.searchJump', title: 'Search hit jumps to the clause in the library', dom: true, test: () => { const t = makeTestCtx(); const b = openWindow(t.ctx, def(t.ctx), { tab: 'search' }); const i = q(b, 'input[type=search]'); i.value = '600 mm'; fire(i); q(b, '.hit').click(); const ok = t.ctx.wm.windows.get('codex').tab === 'library' && t.ctx.store.get('ui.codexClause') && t.ctx.world.stats.clausesViewed === 1; t.done(); return Boolean(ok); } },
    { id: 'win.codex.contextQuery', title: 'Clause links open the codex pre-searched', dom: true, test: () => { const t = makeTestCtx(); const b = openWindow(t.ctx, def(t.ctx), { tab: 'search', context: { query: 'AS/NZS 5139' } }); const ok = q(b, 'input[type=search]').value === 'AS/NZS 5139' && qa(b, '.hit').length >= 1; t.done(); return ok; } },
    { id: 'win.codex.jurisdictions', title: 'Jurisdiction limits comparison table', dom: true, test: () => { const t = makeTestCtx(); const b = openWindow(t.ctx, def(t.ctx), { tab: 'jurisdictions' }); const ok = qa(b, 'thead th').length === 6 && /NEC Article 690/.test(b.textContent); t.done(); return ok; } },
    { id: 'win.codex.history', title: 'Reading log with coverage', dom: true, test: () => { const t = makeTestCtx(); t.ctx.store.set('codexLog', [{ key: `${STANDARDS[0].id}#3.6.2`, at: '2026-01-01T00:00:00Z' }]); const b = openWindow(t.ctx, def(t.ctx), { tab: 'history' }); const ok = qa(b, 'tbody tr').length === 1 && /Voltage drop/.test(b.textContent); t.done(); return ok; } },
    { id: 'win.codex.bookmarks', title: 'Bookmark clauses for quick return', dom: true, test: () => { const t = makeTestCtx(); let b = openWindow(t.ctx, def(t.ctx)); q(b, '.clause-row .bookmark').click(); const saved = t.ctx.store.get('codexBookmarks').length === 1; t.ctx.wm.setTab('codex', 'history'); b = t.ctx.wm.windows.get('codex').body; const ok = saved && /Bookmarked clauses/.test(b.textContent); t.done(); return ok; } },
    { id: 'win.codex.related', title: 'Clause → checklist cross-references', test: () => relatedChecklistCount('AS/NZS 5033:2021', '4.4.5') >= 1 }
];
