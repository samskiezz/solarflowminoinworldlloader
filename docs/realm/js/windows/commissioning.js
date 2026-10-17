/** Commissioning: record test readings per job and evaluate them against the acceptance criteria. */
import { h, button, badge, toast, download } from '../core/ui.js';
import { TEST_DEFINITIONS, evaluateTests, expectedStringVoc, expectedIsc, irradianceAdequate } from '../domain/commissioning.js';
import { section, row, grid, jobPicker, clauseRef, form, statCard } from './_shared.js';
import { makeTestCtx, openWindow, q, qa, fire } from './_testing.js';

export function testsCsv(readings = {}, results = []) {
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    return ['test,reading,unit,criterion,result,detail', ...TEST_DEFINITIONS.map((d) => { const r = results.find((x) => x.id === d.id); return [d.title, readings[d.id] ?? '', d.unit, d.criterion, r?.status || 'pending', r?.detail || ''].map(esc).join(','); })].join('\n');
}

export function def(ctx) {
    return {
        id: 'commissioning', title: ctx.t('nav.commissioning'), icon: '🔌', hotkey: 'T', width: 900, height: 620,
        tabs: [{ id: 'tests', label: 'Test sheet', icon: '🔌' }, { id: 'reference', label: 'Reference', icon: '📖' }],
        render(body, { tab }) {
            if (tab === 'reference') return renderReference(body, ctx);
            body.append(jobPicker(ctx, { onChange: () => ctx.refresh('commissioning') }));
            const job = ctx.currentJob(); if (!job) return;
            renderTests(body, ctx, job);
        }
    };
}

function renderTests(body, ctx, job) {
    const d = ctx.design(job.id);
    job.tests = job.tests || {}; job.tests.readings = job.tests.readings || {}; job.tests.context = job.tests.context || {};
    const ctxForm = form([
        { key: 'modules', label: 'Modules per string', value: job.tests.context.modules ?? d.modulesPerString ?? 10, step: 1 }, { key: 'voc', label: 'Module Voc STC (V)', value: job.tests.context.voc ?? 49.5 }, { key: 'tempCoeffVoc', label: 'Voc coeff (%/°C)', value: job.tests.context.tempCoeffVoc ?? -0.27, step: 0.01 },
        { key: 'tempC', label: 'Cell temp at test (°C)', value: job.tests.context.tempC ?? 35 }, { key: 'isc', label: 'Module Isc STC (A)', value: job.tests.context.isc ?? 11.3 }, { key: 'irradiance', label: 'Irradiance (W/m²)', value: job.tests.context.irradiance ?? 800 }, { key: 'deviceMaxEfliOhm', label: 'Max EFLI for device (Ω)', value: job.tests.context.deviceMaxEfliOhm ?? 1.37 }
    ], { columns: 4 });
    const expected = h('div', { class: 'muted' });
    const refresh = () => { const c = ctxForm.values(); job.tests.context = c; const ev = expectedStringVoc({ modules: c.modules, voc: c.voc, tempCoeffVoc: c.tempCoeffVoc, tempC: c.tempC }); const ei = expectedIsc({ isc: c.isc, irradiance: c.irradiance }); const irr = irradianceAdequate(c.irradiance); expected.replaceChildren(`Expected string Voc ${ev} V (±5 %), expected Isc ${ei} A (±10 %). `, irr.adequate === false || irr === false ? badge('Irradiance too low for Isc/Voc tests (< 400 W/m²)', 'warn') : badge('Irradiance adequate', 'ok')); return { ev, ei }; };
    for (const { input } of Object.values(ctxForm.inputs)) input.addEventListener('input', refresh);
    const { ev, ei } = refresh();
    const readings = job.tests.readings;
    const rows = TEST_DEFINITIONS.map((t) => {
        const isPf = t.unit === 'pass/fail';
        const input = isPf ? h('select', { class: 'input small' }, h('option', { value: '' }, '— pending —'), h('option', { value: 'pass', selected: readings[t.id] === 'pass' ? '' : null }, 'Pass'), h('option', { value: 'fail', selected: readings[t.id] === 'fail' ? '' : null }, 'Fail')) : h('input', { type: 'number', class: 'input small', step: 'any', value: readings[t.id] ?? '', placeholder: t.unit });
        input.addEventListener(isPf ? 'change' : 'input', () => { readings[t.id] = input.value === '' ? undefined : (isPf ? input.value : Number(input.value)); evaluate(false); });
        return h('tr', { dataset: { test: t.id } }, h('td', {}, t.title, h('div', { class: 'muted small' }, clauseRef(ctx, t.reference))), h('td', {}, input), h('td', { class: 'muted' }, t.criterion), h('td', { class: 'result-cell' }, '–'));
    });
    const table = h('table', { class: 'data-table tests' }, h('thead', {}, h('tr', {}, h('th', {}, 'Test'), h('th', {}, 'Reading'), h('th', {}, 'Acceptance criterion'), h('th', {}, 'Result'))), h('tbody', {}, rows));
    const summary = h('div', { class: 'checklist-header' });
    const evaluate = (announce) => {
        const c = ctxForm.values();
        const r = evaluateTests(readings, { expectedVoc: expectedStringVoc({ modules: c.modules, voc: c.voc, tempCoeffVoc: c.tempCoeffVoc, tempC: c.tempC }), expectedIsc: expectedIsc({ isc: c.isc, irradiance: c.irradiance }), deviceMaxEfliOhm: c.deviceMaxEfliOhm });
        job.tests.results = r.results; job.tests.status = r.status; job.tests.evaluatedAt = new Date(ctx.now()).toISOString();
        for (const row of rows) { const res = r.results.find((x) => x.id === row.dataset.test); const cell = row.querySelector('.result-cell'); cell.replaceChildren(badge(res.status, res.status === 'pass' ? 'ok' : res.status === 'fail' ? 'bad' : 'neutral'), ' ', h('span', { class: 'muted small' }, res.detail)); }
        summary.replaceChildren(row(badge(r.status, r.status === 'PASS' ? 'ok' : r.status === 'FAIL' ? 'bad' : 'neutral'), h('span', {}, `${r.passed} passed · ${r.failed.length} failed · ${r.pending.length} pending`)));
        ctx.saveWorld();
        if (announce) { if (r.status === 'INCOMPLETE') toast(`${r.pending.length} test(s) not recorded`, { kind: 'warn' }); else { ctx.world.recordCommissioning(r.status); ctx.notify('commissioning', `${job.customer}: commissioning ${r.status}`, { jobId: job.id }); toast(`Commissioning ${r.status}${r.status === 'PASS' ? ' (+30 credits)' : ''}`, { kind: r.status === 'PASS' ? 'ok' : 'warn' }); } }
        return r;
    };
    evaluate(false);
    body.append(section('Test context', ctxForm.el, expected), section('Commissioning test sheet – AS/NZS 3000 Cl 8.3, AS/NZS 5033 Cl 6, IEC 62446-1', summary, table,
        row(button('Evaluate & record', () => evaluate(true), { kind: 'primary', small: true }), button('Fill typical passing readings', () => { Object.assign(readings, { earth_continuity: 0.2, insulation_resistance_dc: 50, insulation_resistance_ac: 100, polarity: 'pass', string_voc: ev, string_isc: ei, efli: 0.6, rcd: 25, grid_voltage: 238, grid_frequency: 50.0, anti_islanding: 0.5, protection_settings: 'pass', functional: 'pass' }); ctx.refresh('commissioning'); }, { small: true, title: 'For training/demo – replace with instrument readings' }), button('Clear', () => { job.tests = {}; ctx.saveWorld(); ctx.refresh('commissioning'); }, { small: true }), button('Export CSV', () => download(`${job.id}-commissioning.csv`, testsCsv(readings, job.tests.results), 'text/csv'), { small: true }))));
}

function renderReference(body, ctx) {
    body.append(grid(3, statCard('Tests', TEST_DEFINITIONS.length), statCard('Standards cited', new Set(TEST_DEFINITIONS.map((t) => t.reference.split(' ')[0] + ' ' + t.reference.split(' ')[1])).size), statCard('Min irradiance', '400 W/m²')),
        section('Acceptance criteria', h('table', { class: 'data-table' }, h('thead', {}, h('tr', {}, h('th', {}, 'Test'), h('th', {}, 'Unit'), h('th', {}, 'Criterion'), h('th', {}, 'Reference'))), h('tbody', {}, TEST_DEFINITIONS.map((t) => h('tr', {}, h('td', {}, t.title), h('td', {}, t.unit), h('td', {}, t.criterion), h('td', {}, clauseRef(ctx, t.reference))))))));
}

export const FEATURES = [
    { id: 'win.comm.sheet', title: 'Thirteen-test commissioning sheet', dom: true, test: () => { const t = makeTestCtx(); const b = openWindow(t.ctx, def(t.ctx)); const ok = qa(b, 'table.tests tbody tr').length === 13 && /Expected string Voc/.test(b.textContent); t.done(); return ok; } },
    { id: 'win.comm.expected', title: 'Expected Voc/Isc derived from context', dom: true, test: () => { const t = makeTestCtx(); const b = openWindow(t.ctx, def(t.ctx)); const read = () => Number((b.textContent.match(/Expected string Voc ([\d.]+)/) || [])[1]); const before = read(); const i = qa(b, '.form input')[3]; i.value = '10'; fire(i); const after = read(); t.done(); return before > 0 && after > before; } },
    { id: 'win.comm.evaluate', title: 'Readings are evaluated live against criteria', dom: true, test: () => { const t = makeTestCtx(); const b = openWindow(t.ctx, def(t.ctx)); const row = q(b, 'tr[data-test=earth_continuity]'); const inp = row.querySelector('input'); inp.value = '0.9'; fire(inp); const fail = /fail/.test(row.querySelector('.result-cell').textContent); inp.value = '0.2'; fire(inp); const pass = /pass/.test(row.querySelector('.result-cell').textContent) && t.job.tests.readings.earth_continuity === 0.2; t.done(); return fail && pass; } },
    { id: 'win.comm.record', title: 'Recording a full PASS awards credits and stats', dom: true, test: () => { const t = makeTestCtx(); let b = openWindow(t.ctx, def(t.ctx)); qa(b, 'button').find((x) => x.textContent.startsWith('Fill typical')).click(); b = t.ctx.wm.windows.get('commissioning').body; const before = t.ctx.world.ledger.balance; qa(b, 'button').find((x) => x.textContent === 'Evaluate & record').click(); const ok = t.job.tests.status === 'PASS' && t.ctx.world.stats.commissioningPassed === 1 && t.ctx.world.ledger.balance === before + 30; t.done(); return ok; } },
    { id: 'win.comm.incomplete', title: 'Incomplete sheets are not recorded', dom: true, test: () => { const t = makeTestCtx(); const b = openWindow(t.ctx, def(t.ctx)); qa(b, 'button').find((x) => x.textContent === 'Evaluate & record').click(); const ok = t.job.tests.status === 'INCOMPLETE' && t.ctx.world.stats.commissioningPassed === 0; t.done(); return ok; } },
    { id: 'win.comm.irradiance', title: 'Low irradiance warning', dom: true, test: () => { const t = makeTestCtx(); const b = openWindow(t.ctx, def(t.ctx)); const i = qa(b, '.form input')[5]; i.value = '200'; fire(i); const ok = /too low/.test(b.textContent); t.done(); return ok; } },
    { id: 'win.comm.reference', title: 'Acceptance criteria reference', dom: true, test: () => { const t = makeTestCtx(); const b = openWindow(t.ctx, def(t.ctx), { tab: 'reference' }); const ok = qa(b, 'tbody tr').length === 13; t.done(); return ok; } },
    { id: 'win.comm.csv', title: 'Commissioning CSV export', test: () => testsCsv({ rcd: 25 }, [{ id: 'rcd', status: 'pass', detail: '25 ms' }]).split('\n').length === 14 }
];
