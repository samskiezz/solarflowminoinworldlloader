/** Checklists: answer compliance checklist items per job with evidence notes; results gate the commissioning stage. */
import { h, button, badge, progressBar, toast, empty, download } from '../core/ui.js';
import { CHECKLISTS, evaluateChecklist, applicableChecklists, ANSWER_VALUES } from '../domain/checklists.js';
import { section, row, jobPicker, clauseRef, statCard, grid } from './_shared.js';
import { makeTestCtx, openWindow, q, qa, fire } from './_testing.js';

export function checklistCsv(checklistId, answers = {}, notes = {}) {
    const cl = CHECKLISTS[checklistId]; const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    return ['item,text,reference,critical,answer,note', ...cl.items.map((i) => [i.id, i.text, i.reference, i.critical, answers[i.id] || 'pending', notes[i.id] || ''].map(esc).join(','))].join('\n');
}

export function def(ctx) {
    return {
        id: 'checklists', title: ctx.t('nav.checklists'), icon: '📝', hotkey: 'H', width: 900, height: 620,
        tabs: [{ id: 'work', label: 'Checklist', icon: '📝' }, { id: 'summary', label: 'Job summary', icon: '📊' }, { id: 'catalogue', label: 'Catalogue', icon: '📚' }],
        render(body, { tab }) {
            if (tab === 'catalogue') return renderCatalogue(body, ctx);
            body.append(jobPicker(ctx, { onChange: () => ctx.refresh('checklists') }));
            const job = ctx.currentJob(); if (!job) return;
            if (tab === 'summary') return renderSummary(body, ctx, job);
            return renderWork(body, ctx, job);
        }
    };
}

function renderWork(body, ctx, job) {
    const ids = applicableChecklists({ hasPv: job.systemKw > 0, hasBattery: job.batteryKwh > 0 });
    const selected = ctx.store.get('ui.checklist');
    const id = ids.includes(selected) ? selected : ids[0];
    const cl = CHECKLISTS[id];
    job.checklists[id] = job.checklists[id] || {};
    job.checklistNotes = job.checklistNotes || {}; job.checklistNotes[id] = job.checklistNotes[id] || {};
    const answers = job.checklists[id]; const notes = job.checklistNotes[id];
    const result = evaluateChecklist(id, answers);
    const header = h('div', { class: 'checklist-header' });
    const renderHeader = () => { const r = evaluateChecklist(id, answers); header.replaceChildren(row(badge(r.status, r.status === 'PASS' ? 'ok' : r.status === 'FAIL' ? 'bad' : r.status === 'DEFECTS' ? 'warn' : 'neutral'), h('span', {}, `${r.passed}/${r.applicable} passed · ${r.completionPct} % answered · score ${r.scorePct} %`)), progressBar(r.completionPct, { small: true, showValue: false })); };
    renderHeader();
    const tabsEl = h('div', { class: 'tabs' }, ids.map((cid) => { const r = evaluateChecklist(cid, job.checklists[cid] || {}); return h('button', { class: `tab ${cid === id ? 'active' : ''}`, onclick: () => { ctx.store.set('ui.checklist', cid); ctx.refresh('checklists'); } }, CHECKLISTS[cid].title.split(' – ')[0], ' ', badge(r.status === 'INCOMPLETE' ? `${r.completionPct} %` : r.status, r.status === 'PASS' ? 'ok' : r.status === 'FAIL' ? 'bad' : 'neutral')); }));
    const items = h('div', { class: 'checklist-items' }, cl.items.map((item) => {
        const current = answers[item.id] || 'pending';
        const group = h('div', { class: 'answer-group' }, ANSWER_VALUES.filter((v) => v !== 'pending').map((v) => h('button', { class: `btn tiny answer ${current === v ? `on-${v}` : ''}`, dataset: { v }, onclick: () => { answers[item.id] = answers[item.id] === v ? 'pending' : v; job.updatedAt = new Date(ctx.now()).toISOString(); ctx.saveWorld(); for (const b of group.children) b.className = `btn tiny answer ${answers[item.id] === b.dataset.v ? `on-${b.dataset.v}` : ''}`; renderHeader(); } }, { pass: '✔ Pass', fail: '✗ Fail', na: 'N/A' }[v])));
        const note = h('input', { type: 'text', class: 'input small', placeholder: `Evidence (${item.evidence})`, value: notes[item.id] || '', onchange: () => { notes[item.id] = note.value; ctx.saveWorld(); } });
        return h('div', { class: `check-item ${item.critical ? 'critical' : ''}` }, h('div', { class: 'check-text' }, item.critical ? badge('critical', 'bad') : null, ' ', item.text, ' ', clauseRef(ctx, item.reference)), row(group, note));
    }));
    body.append(section(cl.title, tabsEl, header, items, row(
        button('Mark all remaining as Pass', () => { for (const i of cl.items) if (!answers[i.id] || answers[i.id] === 'pending') answers[i.id] = 'pass'; ctx.saveWorld(); ctx.refresh('checklists'); }, { small: true }),
        button('Clear answers', () => { job.checklists[id] = {}; ctx.saveWorld(); ctx.refresh('checklists'); }, { small: true }),
        button('Submit result', () => { const r = evaluateChecklist(id, answers); if (r.status === 'INCOMPLETE') { toast(`${r.pending.length} item(s) still pending`, { kind: 'warn' }); return; } ctx.world.recordChecklistResult(r.status); ctx.notify('checklist', `${job.customer}: ${cl.title.split(' – ')[0]} ${r.status}`, { jobId: job.id }); ctx.saveWorld(); toast(`Checklist ${r.status}${r.status === 'PASS' ? ' (+20 credits)' : ''}`, { kind: r.status === 'PASS' ? 'ok' : 'warn' }); ctx.refresh('checklists'); }, { kind: 'primary', small: true }),
        button('Export CSV', () => download(`${job.id}-${id}.csv`, checklistCsv(id, answers, notes), 'text/csv'), { small: true }))));
    if (result.criticalFailures.length) body.append(section('Critical failures', h('ul', { class: 'issues' }, result.criticalFailures.map((f) => h('li', { class: 'issue' }, '✗ ', f.text, ' ', h('span', { class: 'muted' }, f.reference))))));
}

function renderSummary(body, ctx, job) {
    const ids = applicableChecklists({ hasPv: job.systemKw > 0, hasBattery: job.batteryKwh > 0 });
    const results = ids.map((id) => evaluateChecklist(id, job.checklists[id] || {}));
    body.append(grid(3, statCard('Applicable checklists', ids.length), statCard('Passed', results.filter((r) => r.status === 'PASS').length), statCard('Items total', results.reduce((n, r) => n + r.total, 0))),
        section('Status per checklist', h('table', { class: 'data-table' }, h('thead', {}, h('tr', {}, h('th', {}, 'Checklist'), h('th', {}, 'Status'), h('th', {}, 'Answered'), h('th', {}, 'Score'), h('th', {}, 'Critical failures'))), h('tbody', {}, results.map((r) => h('tr', { onclick: () => { ctx.store.set('ui.checklist', r.checklistId); ctx.wm.setTab('checklists', 'work'); } }, h('td', {}, r.title), h('td', {}, badge(r.status, r.status === 'PASS' ? 'ok' : r.status === 'FAIL' ? 'bad' : 'neutral')), h('td', {}, `${r.completionPct} %`), h('td', {}, `${r.scorePct} %`), h('td', {}, String(r.criticalFailures.length))))))));
}

function renderCatalogue(body, ctx) {
    body.append(section('Checklist catalogue', h('p', { class: 'muted' }, 'Which checklists apply is decided by the job: PV present, battery present, grid connected. Every item cites the clause it screens.'), Object.values(CHECKLISTS).map((cl) => h('details', {}, h('summary', {}, h('strong', {}, cl.title), ` – ${cl.items.length} items, ${cl.items.filter((i) => i.critical).length} critical`), h('ul', { class: 'notes' }, cl.items.map((i) => h('li', {}, i.critical ? '⚠ ' : '', i.text, ' ', h('span', { class: 'muted' }, i.reference))))))));
}

export const FEATURES = [
    { id: 'win.check.applicable', title: 'Applicable checklists derived from the job', dom: true, test: () => { const t = makeTestCtx(); const b = openWindow(t.ctx, def(t.ctx)); const ok = qa(b, '.tabs .tab').length === 5 && qa(b, '.check-item').length === CHECKLISTS.pv_array_5033.items.length; t.done(); return ok; } },
    { id: 'win.check.answer', title: 'Answer items pass/fail/na and persist on the job', dom: true, test: () => { const t = makeTestCtx(); const b = openWindow(t.ctx, def(t.ctx)); qa(b, '.check-item')[0].querySelector('.answer').click(); qa(b, '.check-item')[1].querySelectorAll('.answer')[1].click(); const a = t.job.checklists.pv_array_5033; const ok = a.pv_modules_approved === 'pass' && a.pv_max_voltage === 'fail' && /FAIL/.test(q(b, '.checklist-header').textContent); t.done(); return ok; } },
    { id: 'win.check.evidence', title: 'Evidence notes per item', dom: true, test: () => { const t = makeTestCtx(); const b = openWindow(t.ctx, def(t.ctx)); const n = q(b, '.check-item input.small'); n.value = 'Photo IMG_001'; fire(n, 'change'); const ok = t.job.checklistNotes.pv_array_5033.pv_modules_approved === 'Photo IMG_001'; t.done(); return ok; } },
    { id: 'win.check.submit', title: 'Submitting a PASS records stats and credits', dom: true, test: () => { const t = makeTestCtx(); const before = t.ctx.world.ledger.balance; let b = openWindow(t.ctx, def(t.ctx)); qa(b, 'button').find((x) => x.textContent.startsWith('Mark all remaining')).click(); b = t.ctx.wm.windows.get('checklists').body; qa(b, 'button').find((x) => x.textContent === 'Submit result').click(); const ok = t.ctx.world.stats.checklistsPassed === 1 && t.ctx.world.ledger.balance === before + 20; t.done(); return ok; } },
    { id: 'win.check.incompleteBlocked', title: 'Incomplete checklists cannot be submitted', dom: true, test: () => { const t = makeTestCtx(); const b = openWindow(t.ctx, def(t.ctx)); qa(b, 'button').find((x) => x.textContent === 'Submit result').click(); const ok = t.ctx.world.stats.checklistsPassed === 0; t.done(); return ok; } },
    { id: 'win.check.switch', title: 'Switch between applicable checklists', dom: true, test: () => { const t = makeTestCtx(); const b = openWindow(t.ctx, def(t.ctx)); qa(b, '.tabs .tab')[3].click(); const ok = t.ctx.store.get('ui.checklist') === 'battery_5139' && /5139/.test(t.ctx.wm.windows.get('checklists').body.textContent); t.done(); return ok; } },
    { id: 'win.check.summary', title: 'Per-job checklist summary', dom: true, test: () => { const t = makeTestCtx(); const b = openWindow(t.ctx, def(t.ctx), { tab: 'summary' }); const ok = qa(b, 'tbody tr').length === 5 && qa(b, '.stat').length === 3; t.done(); return ok; } },
    { id: 'win.check.catalogue', title: 'Checklist catalogue with clause references', dom: true, test: () => { const t = makeTestCtx(); const b = openWindow(t.ctx, def(t.ctx), { tab: 'catalogue' }); const ok = qa(b, 'details').length === Object.keys(CHECKLISTS).length; t.done(); return ok; } },
    { id: 'win.check.csv', title: 'Checklist CSV export', test: () => checklistCsv('handover', { }).split('\n').length === CHECKLISTS.handover.items.length + 1 }
];
