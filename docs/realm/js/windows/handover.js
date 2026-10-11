/** Handover: owner's manual, maintenance schedule and warranty register for the job. */
import { h, button, badge, toast, download, printHtml } from '../core/ui.js';
import { warrantyRegister, maintenanceSchedule, ownerManual } from '../domain/handover.js';
import { escapeHtml } from '../domain/report.js';
import { section, row, grid, jobPicker, statCard, form } from './_shared.js';
import { makeTestCtx, openWindow, q, qa } from './_testing.js';

export function def(ctx) {
    return {
        id: 'handover', title: 'Handover pack', icon: '🎁', hotkey: null, width: 880, height: 620,
        tabs: [{ id: 'manual', label: "Owner's manual", icon: '📘' }, { id: 'maintenance', label: 'Maintenance', icon: '🔧' }, { id: 'warranty', label: 'Warranties', icon: '🛡' }],
        render(body, { tab }) {
            body.append(jobPicker(ctx, { onChange: () => ctx.refresh('handover') }));
            const job = ctx.currentJob(); if (!job) return;
            const d = ctx.design(job.id);
            const p = (id) => (id ? ctx.products.byId.get(id) : null);
            const mod = p(d.moduleId); const inv = p(d.inverterId); const bat = p(d.batteryId);
            const installDate = d.installDate || new Date(ctx.now()).toISOString().slice(0, 10);
            if (tab === 'maintenance') {
                const items = maintenanceSchedule({ installDate, hasBattery: job.batteryKwh > 0 || Boolean(bat), years: 5 });
                body.append(section(`Maintenance schedule (5 years from ${installDate})`, h('table', { class: 'data-table compact' }, h('thead', {}, h('tr', {}, h('th', {}, 'Due'), h('th', {}, 'Task'), h('th', {}, 'Who'), h('th', {}, 'Reference'))), h('tbody', {}, items.map((i) => h('tr', {}, h('td', {}, i.due), h('td', {}, i.task), h('td', {}, badge(i.who, i.who === 'installer' ? 'accent' : 'neutral')), h('td', { class: 'muted small' }, i.reference))))), row(button('Download CSV', () => download(`${job.id}-maintenance.csv`, ['due,task,who,reference', ...items.map((i) => `${i.due},"${i.task}",${i.who},"${i.reference}"`)].join('\n'), 'text/csv'), { small: true })))); return;
            }
            if (tab === 'warranty') {
                const rows = warrantyRegister({ installDate, products: [mod, inv, bat].filter(Boolean) });
                body.append(section(`Warranty register (install ${installDate})`, h('table', { class: 'data-table' }, h('thead', {}, h('tr', {}, h('th', {}, 'Item'), h('th', {}, 'Product warranty'), h('th', {}, 'Expires'), h('th', {}, 'Performance'), h('th', {}, 'Expires'))), h('tbody', {}, rows.map((r) => h('tr', {}, h('td', {}, r.item), h('td', {}, `${r.productYears} y`), h('td', {}, r.productExpires), h('td', {}, r.performanceYears ? `${r.performanceYears} y` : '–'), h('td', {}, r.performanceExpires || '–'))))), h('p', { class: 'muted small' }, 'Default terms: modules 12/25 years, inverters 5, batteries 10, workmanship 5. Edit product warranties in the vault detail if the manufacturer differs.'))); return;
            }
            const f = form([{ key: 'installDate', label: 'Installation date', type: 'date', value: installDate }, { key: 'monitoring', label: 'Monitoring', type: 'text', value: d.monitoring || 'Inverter app / web portal' }], { columns: 2, onChange: (v) => ctx.saveDesign(job.id, { installDate: v.installDate, monitoring: v.monitoring }) });
            const text = ownerManual({ company: ctx.profile().company, customer: job.customer, address: `${job.address} ${job.postcode}`.trim(), systemKw: d.arrayKwDc || job.systemKw, batteryKwh: d.batteryUsableKwh || job.batteryKwh, inverter: inv ? `${inv.manufacturer} ${inv.model}` : '', modules: mod ? `${mod.manufacturer} ${mod.model}` : '', moduleCount: d.moduleCount, battery: bat ? `${bat.manufacturer} ${bat.model}` : '', installDate, monitoring: d.monitoring });
            body.append(section("Owner's manual", f.el, row(button('Print / PDF', () => printHtml(`<pre style="font:13px/1.5 ui-monospace,monospace;white-space:pre-wrap">${escapeHtml(text)}</pre>`, `Owner manual ${job.id}`), { kind: 'primary', small: true }), button('Download text', () => download(`${job.id}-owner-manual.txt`, text), { small: true }), button('Mark handover pack issued', () => { for (const key of ['handover:Owner documentation delivered', 'handover:Warranty pack issued']) if (key in job.tasks) job.tasks[key] = true; ctx.saveDesign(job.id, { handoverPackIssuedAt: new Date(ctx.now()).toISOString() }); ctx.notify('handover', `Handover pack issued to ${job.customer}`, { jobId: job.id }); toast('Handover tasks ticked', { kind: 'ok' }); }, { small: true })), h('pre', { class: 'md' }, text)));
        }
    };
}

export const FEATURES = [
    { id: 'win.handover.manual', title: "Owner's manual generated from the job and design", dom: true, test: () => { const t = makeTestCtx(); t.ctx.saveDesign(t.job.id, { inverterId: 'INV-G5', moduleId: 'PV-A440', moduleCount: 15 }); const b = openWindow(t.ctx, def(t.ctx)); const ok = /Gamma G5 Hybrid/.test(q(b, 'pre.md').textContent) && /15 × Alpha Solar A-440M/.test(q(b, 'pre.md').textContent); t.done(); return ok; } },
    { id: 'win.handover.issue', title: 'Issuing the pack ticks the handover tasks', dom: true, test: () => { const t = makeTestCtx(); const b = openWindow(t.ctx, def(t.ctx)); qa(b, 'button').find((x) => x.textContent.startsWith('Mark handover')).click(); const ok = t.job.tasks['handover:Owner documentation delivered'] === true && t.job.tasks['handover:Warranty pack issued'] === true && t.ctx.design(t.job.id).handoverPackIssuedAt; t.done(); return Boolean(ok); } },
    { id: 'win.handover.maintenance', title: 'Five-year maintenance schedule', dom: true, test: () => { const t = makeTestCtx(); const b = openWindow(t.ctx, def(t.ctx), { tab: 'maintenance' }); const ok = qa(b, 'tbody tr').length === 5 + 3 + 5; t.done(); return ok; } },
    { id: 'win.handover.warranty', title: 'Warranty register from selected products', dom: true, test: () => { const t = makeTestCtx(); t.ctx.saveDesign(t.job.id, { inverterId: 'INV-G5', moduleId: 'PV-A440', batteryId: 'BAT-D13' }); const b = openWindow(t.ctx, def(t.ctx), { tab: 'warranty' }); const ok = qa(b, 'tbody tr').length === 4 && /25 y/.test(b.textContent); t.done(); return ok; } }
];
