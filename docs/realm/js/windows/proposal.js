/** Proposal: price the job, apply the STC discount and produce a customer proposal. */
import { h, button, badge, toast, download, printHtml } from '../core/ui.js';
import { defaultLineItems, quoteTotals, lineTotal, pricePerWatt, proposalText, DEFAULT_RATES } from '../domain/pricing.js';
import { escapeHtml } from '../domain/report.js';
import { section, row, grid, jobPicker, statCard, form, money } from './_shared.js';
import { makeTestCtx, openWindow, q, qa, fire } from './_testing.js';

export function proposalHtml(text) { return `<pre style="font: 13px/1.5 ui-monospace, monospace; white-space: pre-wrap">${escapeHtml(text)}</pre>`; }

export function def(ctx) {
    return {
        id: 'proposal', title: 'Proposal', icon: '💲', hotkey: null, width: 900, height: 640,
        tabs: [{ id: 'items', label: 'Line items', icon: '☰' }, { id: 'preview', label: 'Proposal', icon: '🗎' }],
        render(body, { tab }) {
            body.append(jobPicker(ctx, { onChange: () => ctx.refresh('proposal') }));
            const job = ctx.currentJob(); if (!job) return;
            const d = ctx.design(job.id);
            const mod = d.moduleId ? ctx.products.byId.get(d.moduleId) : null; const inv = d.inverterId ? ctx.products.byId.get(d.inverterId) : null;
            if (!d.quote) ctx.saveDesign(job.id, { quote: { items: defaultLineItems({ moduleCount: d.moduleCount || Math.round((job.systemKw * 1000) / 440), moduleWatts: mod?.specifications?.power_watts || 440, inverterKw: inv?.specifications?.ac_power_kw || job.systemKw, batteryKwh: d.batteryUsableKwh || job.batteryKwh }), promoDiscount: 0, costOfGoods: null, validDays: 30 } });
            const quote = ctx.design(job.id).quote;
            const totals = () => quoteTotals(quote.items, { solarStcValue: d.stcValueAud || 0, batteryStcValue: d.batteryStcValueAud || 0, promoDiscount: quote.promoDiscount, costOfGoods: quote.costOfGoods });
            if (tab === 'preview') return renderPreview(body, ctx, job, d, quote, totals());
            const save = () => { ctx.saveDesign(job.id, { quote }); render(); };
            const table = h('div');
            const summary = h('div');
            const render = () => {
                table.replaceChildren(h('table', { class: 'data-table quote' }, h('thead', {}, h('tr', {}, h('th', {}, 'Item'), h('th', {}, 'Qty'), h('th', {}, 'Unit $'), h('th', {}, 'Category'), h('th', {}, 'Total'), h('th', {}, ''))), h('tbody', {}, quote.items.map((item, i) => h('tr', {}, h('td', {}, h('input', { class: 'input small wide', value: item.label, onchange: (e) => { item.label = e.target.value; save(); } })), h('td', {}, h('input', { type: 'number', class: 'input tiny', value: item.qty, step: 'any', onchange: (e) => { item.qty = Number(e.target.value) || 0; save(); } })), h('td', {}, h('input', { type: 'number', class: 'input small', value: item.unit, step: '0.01', onchange: (e) => { item.unit = Number(e.target.value) || 0; save(); } })), h('td', {}, h('select', { class: 'input small', onchange: (e) => { item.category = e.target.value; save(); } }, ['equipment', 'labour', 'services', 'other'].map((c) => h('option', { value: c, selected: item.category === c ? '' : null }, c)))), h('td', { class: 'num' }, money(lineTotal(item), 2)), h('td', {}, h('button', { class: 'btn tiny', title: 'Remove', onclick: () => { quote.items.splice(i, 1); save(); } }, '✕')))))));
                const t = totals();
                summary.replaceChildren(grid(4, statCard('Subtotal ex GST', money(t.subtotal)), statCard('STC discount', `−${money(t.stcDiscount)}`, d.stcs ? `${d.stcs} solar STCs${d.batteryStcs ? ` + ${d.batteryStcs} battery` : ''}` : 'Run STC calculator', 'var(--ok)'), statCard('GST', money(t.gst)), statCard('Total payable', money(t.total), `${pricePerWatt(t.total, d.arrayKwDc || job.systemKw) ?? '–'} $/W`, 'var(--gold)')), t.marginPct !== null ? h('div', { class: 'muted' }, `Gross margin ${t.marginPct} % on cost of goods ${money(quote.costOfGoods)}`) : null);
            };
            render();
            const extras = form([{ key: 'promoDiscount', label: 'Promotional discount ($)', value: quote.promoDiscount }, { key: 'costOfGoods', label: 'Cost of goods ($, for margin)', value: quote.costOfGoods ?? '' }, { key: 'validDays', label: 'Valid for (days)', value: quote.validDays, step: 1 }], { columns: 3, onChange: (v) => { quote.promoDiscount = v.promoDiscount || 0; quote.costOfGoods = v.costOfGoods ?? null; quote.validDays = v.validDays || 30; save(); } });
            body.append(section(`Quote for ${job.customer}`, table, row(button('＋ Add line', () => { quote.items.push({ id: `x${Date.now()}`, label: 'New item', qty: 1, unit: 0, category: 'other' }); save(); }, { small: true }), button('Rebuild from design', () => { quote.items = defaultLineItems({ moduleCount: d.moduleCount || Math.round((job.systemKw * 1000) / 440), moduleWatts: mod?.specifications?.power_watts || 440, inverterKw: inv?.specifications?.ac_power_kw || job.systemKw, batteryKwh: d.batteryUsableKwh || job.batteryKwh }); save(); toast('Line items rebuilt'); }, { small: true }), h('span', { class: 'muted small' }, `Default rates: $${DEFAULT_RATES.modulePerWatt}/W modules, $${DEFAULT_RATES.labourPerKw}/kW labour, $${DEFAULT_RATES.batteryPerKwh}/kWh battery`)), extras.el, summary));
        }
    };
}

function renderPreview(body, ctx, job, d, quote, totals) {
    const text = proposalText({ company: ctx.profile().company, customer: job.customer, address: `${job.address} ${job.postcode}`.trim(), systemKw: d.arrayKwDc || job.systemKw, batteryKwh: d.batteryUsableKwh || job.batteryKwh, annualKwh: d.annualKwh, year1Savings: d.year1SavingsAud, paybackYears: d.paybackYears, items: quote.items, totals, validDays: quote.validDays, generatedAt: new Date(ctx.now()).toISOString() });
    body.append(section('Customer proposal', row(button('Print / PDF', () => printHtml(proposalHtml(text), `Proposal ${job.id}`), { kind: 'primary', small: true }), button('Download text', () => download(`${job.id}-proposal.txt`, text), { small: true }), button('Mark proposal issued', () => { const key = 'quote:Proposal issued'; if (key in job.tasks) { job.tasks[key] = true; } ctx.saveDesign(job.id, { proposalIssuedAt: new Date(ctx.now()).toISOString(), proposalTotal: totals.total }); ctx.notify('proposal', `Proposal issued to ${job.customer}: ${money(totals.total)}`, { jobId: job.id }); toast('Proposal issued – quote stage task ticked', { kind: 'ok' }); }, { small: true })), h('pre', { class: 'md' }, text)));
}

export const FEATURES = [
    { id: 'win.proposal.items', title: 'Line items generated from the design', dom: true, test: () => { const t = makeTestCtx(); const b = openWindow(t.ctx, def(t.ctx)); const ok = qa(b, 'table.quote tbody tr').length === 9 && /Total payable/.test(b.textContent) && t.ctx.design(t.job.id).quote.items.length === 9; t.done(); return ok; } },
    { id: 'win.proposal.edit', title: 'Editing quantities/prices updates totals and persists', dom: true, test: () => { const t = makeTestCtx(); const b = openWindow(t.ctx, def(t.ctx)); const unit = q(b, 'table.quote tbody tr input[type=number]:nth-of-type(1)'); const inputs = qa(b, 'table.quote tbody tr:first-child input[type=number]'); inputs[1].value = '1000'; fire(inputs[1], 'change'); const ok = t.ctx.design(t.job.id).quote.items[0].unit === 1000 && /Total payable/.test(b.textContent); t.done(); return ok; } },
    { id: 'win.proposal.stcDiscount', title: 'STC values from the design discount the quote', dom: true, test: () => { const t = makeTestCtx(); t.ctx.saveDesign(t.job.id, { stcValueAud: 2000, stcs: 60 }); const b = openWindow(t.ctx, def(t.ctx)); const ok = /−\$2,000/.test(b.textContent) && /60 solar STCs/.test(b.textContent); t.done(); return ok; } },
    { id: 'win.proposal.addRemove', title: 'Add and remove lines', dom: true, test: () => { const t = makeTestCtx(); let b = openWindow(t.ctx, def(t.ctx)); qa(b, 'button').find((x) => x.textContent.includes('Add line')).click(); const added = t.ctx.design(t.job.id).quote.items.length === 10; b = t.ctx.wm.windows.get('proposal').body; q(b, 'table.quote tbody tr .btn.tiny').click(); const ok = added && t.ctx.design(t.job.id).quote.items.length === 9; t.done(); return ok; } },
    { id: 'win.proposal.preview', title: 'Proposal document with payment schedule', dom: true, test: () => { const t = makeTestCtx(); const b = openWindow(t.ctx, def(t.ctx), { tab: 'preview' }); const ok = /Proposal for Test Customer/.test(q(b, 'pre.md').textContent) && /Deposit on acceptance/.test(b.textContent); t.done(); return ok; } },
    { id: 'win.proposal.issue', title: 'Issuing the proposal ticks the quote-stage task', dom: true, test: () => { const t = makeTestCtx(); const b = openWindow(t.ctx, def(t.ctx), { tab: 'preview' }); qa(b, 'button').find((x) => x.textContent === 'Mark proposal issued').click(); const ok = t.job.tasks['quote:Proposal issued'] === true && t.ctx.design(t.job.id).proposalTotal > 0; t.done(); return ok; } }
];
