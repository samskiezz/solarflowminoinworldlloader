/** Serial register: record module/inverter/battery serials for the STC claim evidence. */
import { h, button, badge, toast, download } from '../core/ui.js';
import { parseSerialList, registerStatus, serialsCsv } from '../domain/serials.js';
import { section, row, grid, jobPicker, statCard, issueList } from './_shared.js';
import { makeTestCtx, openWindow, q, qa, fire } from './_testing.js';

const CATS = [['module', 'PV modules'], ['inverter', 'Inverters'], ['battery', 'Batteries']];

export function def(ctx) {
    return {
        id: 'serials', title: 'Serial register', icon: '🔢', hotkey: null, width: 860, height: 600,
        render(body) {
            body.append(jobPicker(ctx, { onChange: () => ctx.refresh('serials') }));
            const job = ctx.currentJob(); if (!job) return;
            const d = ctx.design(job.id);
            job.serials = job.serials || { module: [], inverter: [], battery: [] };
            const status = registerStatus(job.serials, d);
            body.append(grid(4, ...CATS.map(([k, l]) => statCard(l, `${status.counts[k]}/${status.required[k] || '?'}`)), statCard('Register', status.complete ? 'Complete' : 'Incomplete', null, status.complete ? 'var(--ok)' : 'var(--warn)')), issueList(status.issues, 'All required serials recorded, no duplicates'));
            for (const [key, label] of CATS) {
                const ta = h('textarea', { class: 'input', rows: 3, placeholder: 'Paste or scan serials – one per line or comma separated' });
                const list = h('div', { class: 'serial-list' }, job.serials[key].map((s, i) => h('span', { class: 'badge' }, s, ' ', h('button', { class: 'btn tiny', onclick: () => { job.serials[key].splice(i, 1); ctx.saveWorld(); ctx.refresh('serials'); } }, '✕'))));
                body.append(section(`${label} (${job.serials[key].length})`, list, row(ta, button('Add', () => { const r = parseSerialList(ta.value); const existing = new Set(job.serials[key]); const added = r.valid.filter((s) => !existing.has(s)); job.serials[key].push(...added); ctx.saveWorld(); toast(`${added.length} added${r.invalid.length ? `, ${r.invalid.length} invalid` : ''}${r.duplicates.length + (r.valid.length - added.length) ? `, ${r.duplicates.length + (r.valid.length - added.length)} duplicate` : ''}`, { kind: r.invalid.length ? 'warn' : 'ok' }); ctx.refresh('serials'); }, { kind: 'primary', small: true }))));
            }
            body.append(row(button('Mark serial photos uploaded', () => { if (!registerStatus(job.serials, d).complete) { toast('Register is incomplete', { kind: 'warn' }); return; } job.evidence = { ...(job.evidence || {}), serialPhotos: true }; const key = 'claim:Serial numbers and photos uploaded'; if (key in job.tasks) job.tasks[key] = true; ctx.saveWorld(); toast('Evidence recorded for the STC claim', { kind: 'ok' }); ctx.refresh('serials'); }, { kind: 'primary', small: true }), button('Export CSV', () => download(`${job.id}-serials.csv`, serialsCsv(job.serials), 'text/csv'), { small: true })));
        }
    };
}

export const FEATURES = [
    { id: 'win.serials.add', title: 'Paste serials with validation and de-duplication', dom: true, test: () => { const t = makeTestCtx(); const b = openWindow(t.ctx, def(t.ctx)); const ta = qa(b, 'textarea')[0]; ta.value = 'MOD-0001\nMOD-0002\nmod-0001\nbad'; qa(b, 'button').filter((x) => x.textContent === 'Add')[0].click(); const ok = t.job.serials.module.length === 2; t.done(); return ok; } },
    { id: 'win.serials.status', title: 'Register status against the design counts', dom: true, test: () => { const t = makeTestCtx(); t.ctx.saveDesign(t.job.id, { moduleCount: 2, inverterId: 'INV-G5', batteryId: 'BAT-D13' }); t.job.serials = { module: ['MOD-0001'], inverter: [], battery: [] }; const b = openWindow(t.ctx, def(t.ctx)); const ok = /1 module serial missing/.test(b.textContent) && /1 inverter serial missing/.test(b.textContent) && /Incomplete/.test(b.textContent); t.done(); return ok; } },
    { id: 'win.serials.evidence', title: 'Complete register records STC evidence', dom: true, test: () => { const t = makeTestCtx(); t.ctx.saveDesign(t.job.id, { moduleCount: 1, inverterId: 'INV-G5', batteryId: 'BAT-D13' }); t.job.serials = { module: ['MOD-0001'], inverter: ['INV-0001'], battery: ['BAT-0001'] }; const b = openWindow(t.ctx, def(t.ctx)); qa(b, 'button').find((x) => x.textContent.startsWith('Mark serial photos')).click(); const ok = t.job.evidence.serialPhotos === true && t.job.tasks['claim:Serial numbers and photos uploaded'] === true; t.done(); return ok; } },
    { id: 'win.serials.remove', title: 'Remove a serial', dom: true, test: () => { const t = makeTestCtx(); t.job.serials = { module: ['MOD-0001'], inverter: [], battery: [] }; const b = openWindow(t.ctx, def(t.ctx)); q(b, '.serial-list .btn.tiny').click(); const ok = t.job.serials.module.length === 0; t.done(); return ok; } }
];
