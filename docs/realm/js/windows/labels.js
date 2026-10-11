/** Labels: the signage a job requires, generated from its design, as a printable sheet. */
import { h, button, badge, download, printHtml } from '../core/ui.js';
import { requiredLabels, labelSheet } from '../domain/labels.js';
import { escapeHtml } from '../domain/report.js';
import { section, row, jobPicker, form, clauseRef, statCard, grid } from './_shared.js';
import { makeTestCtx, openWindow, q, qa, fire } from './_testing.js';

export function labelParams(job, design = {}) {
    return { hasPv: job.systemKw > 0, hasBattery: job.batteryKwh > 0 || Boolean(design.batteryId), hasBackup: Boolean(design.hasBackup), supplyType: design.supplyType || 'alternative', arrayVocV: design.arrayVocV ?? design.maxArrayVoltage ?? 0, arrayIscA: design.arrayIscA ?? 0, inverterMainSwitches: design.inverterMainSwitches ?? 1 };
}
export function labelsHtml(job, labels) {
    const colourStyle = (c) => ({ 'black on yellow': 'background:#ffd400;color:#000', 'red on white': 'background:#fff;color:#c00;border-color:#c00', 'black on white': 'background:#fff;color:#000' }[c] || 'background:#fff;color:#000');
    return `<style>body{font-family:Arial,sans-serif}.lbl{border:3px solid #000;padding:12px;margin:10px 0;font-weight:bold;font-size:18px;page-break-inside:avoid;${''}}.meta{font-size:11px;font-weight:normal;color:#444;margin-top:6px}</style><h1>Labels – ${escapeHtml(job.id)} ${escapeHtml(job.customer)}</h1>${labels.map((l) => `<div class="lbl" style="${colourStyle(l.colour)}">${escapeHtml(l.text)}<div class="meta">${escapeHtml(l.location)} · ${escapeHtml(l.reference)}${l.minTextMm ? ` · min text ${l.minTextMm} mm` : ''}</div></div>`).join('')}`;
}

export function def(ctx) {
    return {
        id: 'labels', title: ctx.t('nav.labels'), icon: '🏷', hotkey: null, width: 820, height: 600,
        render(body) {
            body.append(jobPicker(ctx, { onChange: () => ctx.refresh('labels') }));
            const job = ctx.currentJob(); if (!job) return;
            const d = ctx.design(job.id);
            const f = form([{ key: 'hasBackup', label: 'Backup / off-grid circuits', type: 'checkbox', value: Boolean(d.hasBackup) }, { key: 'supplyType', label: 'Backup supply type', type: 'select', options: [{ value: 'alternative', label: 'Alternative supply' }, { value: 'independent', label: 'Independent supply' }], value: d.supplyType || 'alternative' }, { key: 'inverterMainSwitches', label: 'Inverter main switches', value: d.inverterMainSwitches ?? 1, step: 1 }, { key: 'arrayVocV', label: 'Array Voc (V, cold)', value: d.arrayVocV ?? 0 }, { key: 'arrayIscA', label: 'Array Isc (A)', value: d.arrayIscA ?? 0 }], { columns: 5 });
            const out = h('div');
            const run = () => { const v = f.values(); const labels = requiredLabels(labelParams(job, { ...d, ...v })); out.replaceChildren(grid(3, statCard('Labels required', labels.length), statCard('Battery labels', labels.filter((l) => l.id.startsWith('bess')).length), statCard('Backup labels', labels.filter((l) => l.id.startsWith('backup')).length)), h('div', { class: 'label-sheet' }, labels.map((l) => h('div', { class: `label-card ${String(l.colour || '').replace(/\s/g, '-')}` }, h('div', { class: 'label-text' }, l.text), h('div', { class: 'label-meta' }, l.location, ' · ', clauseRef(ctx, l.reference), l.minTextMm ? ` · text ≥ ${l.minTextMm} mm` : '')))), row(button('Save settings to design', () => { ctx.saveDesign(job.id, v); ctx.refresh('labels'); }, { kind: 'primary', small: true }), button('Print sheet', () => { printHtml(labelsHtml(job, labels), `Labels ${job.id}`); ctx.saveDesign(job.id, { labelsIssuedAt: new Date(ctx.now()).toISOString() }); const key = 'install:Labels fitted'; if (key in job.tasks) job.tasks[key] = true; ctx.saveWorld(); }, { small: true }), button('Download text', () => download(`${job.id}-labels.txt`, labelSheet(labelParams(job, { ...d, ...v }))), { small: true }))); };
            for (const { input } of Object.values(f.inputs)) input.addEventListener('input', run), input.addEventListener('change', run);
            body.append(section('Label requirements – AS/NZS 5033:2021 Cl 5.3, AS/NZS 4777.1:2024 App. A, AS/NZS 5139:2019 Section 7', f.el, out));
            run();
        }
    };
}

export const FEATURES = [
    { id: 'win.labels.generate', title: 'Label list generated from the job and design', dom: true, test: () => { const t = makeTestCtx(); const b = openWindow(t.ctx, def(t.ctx)); const ok = qa(b, '.label-card').length === 11 && /SHUTDOWN PROCEDURE/.test(b.textContent); t.done(); return ok; } },
    { id: 'win.labels.backup', title: 'Backup circuits add supply-type labels', dom: true, test: () => { const t = makeTestCtx(); const b = openWindow(t.ctx, def(t.ctx)); const cb = q(b, '.form input[type=checkbox]'); cb.checked = true; fire(cb, 'change'); const ok = qa(b, '.label-card').length === 13 && /ALTERNATIVE SUPPLY/.test(b.textContent); t.done(); return ok; } },
    { id: 'win.labels.masterSwitch', title: 'More than two inverter main switches adds the master switch label', dom: true, test: () => { const t = makeTestCtx(); const b = openWindow(t.ctx, def(t.ctx)); const i = qa(b, '.form input[type=number]')[0]; i.value = '3'; fire(i); const ok = /MASTER SWITCH/.test(b.textContent); t.done(); return ok; } },
    { id: 'win.labels.save', title: 'Label settings persist in the design', dom: true, test: () => { const t = makeTestCtx(); const b = openWindow(t.ctx, def(t.ctx)); const cb = q(b, '.form input[type=checkbox]'); cb.checked = true; fire(cb, 'change'); qa(b, 'button').find((x) => x.textContent.startsWith('Save settings')).click(); const ok = t.ctx.design(t.job.id).hasBackup === true; t.done(); return ok; } },
    { id: 'win.labels.html', title: 'Printable label sheet HTML', test: () => { const html = labelsHtml({ id: 'J', customer: 'C' }, requiredLabels({ hasPv: true, arrayVocV: 450, arrayIscA: 11 })); return html.includes('450 V') && (html.match(/class="lbl"/g) || []).length === 8; } }
];
