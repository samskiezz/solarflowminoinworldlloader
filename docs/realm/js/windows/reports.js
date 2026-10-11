/** Reports: assemble the job report (design, checklists, tests, labels) and export/print it. */
import { h, button, badge, download, printHtml, empty } from '../core/ui.js';
import { buildJobReport, escapeHtml } from '../domain/report.js';
import { quoteTotals, lineTotal } from '../domain/pricing.js';
import { warrantyRegister } from '../domain/handover.js';
import { validateForStcClaim, jobProgress } from '../domain/jobs.js';
import { section, row, grid, jobPicker, statCard, issueList } from './_shared.js';
import { makeTestCtx, openWindow, q, qa } from './_testing.js';

/** Map the workstation's design record onto the report's expected keys. */
export function reportDesign(ctx, job) {
    const d = ctx.design(job.id); const p = (id) => (id ? ctx.products.byId.get(id) : null);
    const mod = p(d.moduleId); const inv = p(d.inverterId); const bat = p(d.batteryId);
    return { ...job.design, ...d, arrayKw: d.arrayKwDc, module: mod ? `${mod.manufacturer} ${mod.model}` : undefined, moduleCount: d.moduleCount, inverter: inv ? `${inv.manufacturer} ${inv.model}` : undefined, battery: bat ? `${bat.manufacturer} ${bat.model}` : undefined, arrayMaxVoltage: d.arrayVocV ?? d.maxArrayVoltage, arrayIsc: d.arrayIscA };
}
export function extraSections(ctx, job) {
    const d = ctx.design(job.id); const out = [];
    if (d.quote && d.quote.items) { const totals = quoteTotals(d.quote.items, { solarStcValue: d.stcValueAud || 0, batteryStcValue: d.batteryStcValueAud || 0, promoDiscount: d.quote.promoDiscount }); out.push({ title: 'Proposal', html: `<table class="grid"><thead><tr><th>Item</th><th>Qty</th><th>Unit</th><th>Total</th></tr></thead><tbody>${d.quote.items.map((i) => `<tr><td>${escapeHtml(i.label)}</td><td>${escapeHtml(i.qty)}</td><td>$${Number(i.unit).toFixed(2)}</td><td>$${lineTotal(i).toFixed(2)}</td></tr>`).join('')}</tbody></table><p>Subtotal $${totals.subtotal.toFixed(2)} · STC discount −$${totals.stcDiscount.toFixed(2)} · GST $${totals.gst.toFixed(2)} · <strong>Total $${totals.total.toFixed(2)}</strong></p>` }); }
    if (job.serials && Object.values(job.serials).some((l) => l && l.length)) out.push({ title: 'Serial register', html: Object.entries(job.serials).map(([k, l]) => `<p><strong>${escapeHtml(k)}</strong>: ${(l || []).map(escapeHtml).join(', ') || '–'}</p>`).join('') });
    const products = [d.moduleId, d.inverterId, d.batteryId].map((id) => (id ? ctx.products.byId.get(id) : null)).filter(Boolean);
    if (products.length) out.push({ title: 'Warranty register', html: `<table class="grid"><thead><tr><th>Item</th><th>Product warranty</th><th>Expires</th><th>Performance</th></tr></thead><tbody>${warrantyRegister({ installDate: d.installDate || new Date(ctx.now()).toISOString().slice(0, 10), products }).map((r) => `<tr><td>${escapeHtml(r.item)}</td><td>${r.productYears} y</td><td>${r.productExpires}</td><td>${r.performanceYears ? `${r.performanceYears} y to ${r.performanceExpires}` : '–'}</td></tr>`).join('')}</tbody></table>` });
    return out;
}
export function reportFor(ctx, job) {
    const merged = { ...job, design: reportDesign(ctx, job) };
    return buildJobReport(merged, { company: ctx.profile().company, generatedAt: new Date(ctx.now()).toISOString(), extraSections: extraSections(ctx, job) });
}
export function summaryMarkdown(ctx, job) {
    const d = reportDesign(ctx, job); const p = jobProgress(job); const claim = validateForStcClaim(job);
    return [`# ${job.customer} – ${job.id}`, '', `Stage: ${job.stage} (${p.done}/${p.total} tasks)`, `Site: ${job.address} ${job.postcode}`, '', '## Design', `- Array: ${d.arrayKw ?? job.systemKw} kW (${d.moduleCount ?? '?'} × ${d.module ?? 'module TBD'})`, `- Inverter: ${d.inverter ?? 'TBD'}`, `- Battery: ${d.battery ?? (job.batteryKwh ? `${job.batteryKwh} kWh` : 'none')}`, `- Strings: ${d.strings ?? '?'} × ${d.modulesPerString ?? '?'} modules, Voc cold ${d.arrayMaxVoltage ?? '?'} V`, `- Voltage rise: ${d.voltageRisePct ?? '?'} % (limit 2 %)`, `- Yield: ${d.annualKwh ?? '?'} kWh/yr, payback ${d.paybackYears ?? '?'} yr`, `- STCs: ${d.stcs ?? '?'} (≈ $${d.stcValueAud ?? '?'})${d.batteryStcs ? ` + ${d.batteryStcs} battery STCs` : ''}`, '', '## STC claim', claim.eligible ? 'Eligible' : claim.issues.map((i) => `- ${i}`).join('\n'), ''].join('\n');
}

export function def(ctx) {
    return {
        id: 'reports', title: ctx.t('nav.reports'), icon: '🗎', hotkey: 'R', width: 900, height: 640,
        tabs: [{ id: 'preview', label: 'Report', icon: '🗎' }, { id: 'summary', label: 'Summary', icon: '≡' }],
        render(body, { tab }) {
            body.append(jobPicker(ctx, { onChange: () => ctx.refresh('reports') }));
            const job = ctx.currentJob(); if (!job) return;
            if (tab === 'summary') return renderSummary(body, ctx, job);
            const html = reportFor(ctx, job);
            const frame = h('iframe', { class: 'report-frame', title: 'Job report preview', sandbox: '' });
            body.append(section(`Job report – ${job.id}`, row(button('Print / PDF', () => printHtml(html, `Report ${job.id}`), { kind: 'primary', small: true }), button('Download HTML', () => download(`${job.id}-report.html`, html, 'text/html'), { small: true }), button('Download Markdown summary', () => download(`${job.id}-summary.md`, summaryMarkdown(ctx, job), 'text/markdown'), { small: true }), button('Copy summary', async () => { try { await navigator.clipboard.writeText(summaryMarkdown(ctx, job)); } catch (e) { /* clipboard unavailable */ } }, { small: true })), frame));
            frame.srcdoc = html;
        }
    };
}

function renderSummary(body, ctx, job) {
    const d = reportDesign(ctx, job); const claim = validateForStcClaim(job); const p = jobProgress(job);
    const checklists = Object.keys(job.checklists || {}).length; const tests = job.tests?.status || 'INCOMPLETE';
    body.append(grid(4, statCard('Progress', `${p.pct} %`), statCard('Checklists started', checklists), statCard('Commissioning', tests), statCard('STC claim', claim.eligible ? 'Eligible' : `${claim.issues.length} issue(s)`, null, claim.eligible ? 'var(--ok)' : 'var(--warn)')),
        section('Design summary', h('pre', { class: 'md' }, summaryMarkdown(ctx, job))), section('STC claim issues', issueList(claim.issues, 'Eligible for STC claim')));
}

export const FEATURES = [
    { id: 'win.reports.build', title: 'Full HTML job report with design, checklists, tests and labels', dom: true, test: () => { const t = makeTestCtx(); t.ctx.saveDesign(t.job.id, { moduleId: 'PV-A440', inverterId: 'INV-G5', arrayKwDc: 6.6, moduleCount: 15, voltageRisePct: 1.2 }); const html = reportFor(t.ctx, t.job); t.done(); return html.includes('Alpha Solar A-440M') && html.includes('Commissioning tests') && html.includes('Required labels') && html.includes('1.2 %'); } },
    { id: 'win.reports.preview', title: 'Sandboxed report preview', dom: true, test: () => { const t = makeTestCtx(); const b = openWindow(t.ctx, def(t.ctx)); const f = q(b, 'iframe.report-frame'); const ok = f && f.srcdoc.includes('Job report') && f.getAttribute('sandbox') === ''; t.done(); return Boolean(ok); } },
    { id: 'win.reports.summary', title: 'Markdown design summary', dom: true, test: () => { const t = makeTestCtx(); const b = openWindow(t.ctx, def(t.ctx), { tab: 'summary' }); const ok = /# Test Customer/.test(q(b, 'pre.md').textContent) && qa(b, '.stat').length === 4; t.done(); return ok; } },
    { id: 'win.reports.extras', title: 'Report includes proposal, serials and warranties when present', dom: true, test: () => { const t = makeTestCtx(); t.ctx.saveDesign(t.job.id, { moduleId: 'PV-A440', quote: { items: [{ label: 'Panels', qty: 1, unit: 100 }], promoDiscount: 0 } }); t.job.serials = { module: ['MOD-1'] }; const html = reportFor(t.ctx, t.job); t.done(); return html.includes('Proposal') && html.includes('MOD-1') && html.includes('Warranty register') && html.includes('Total $110.00'); } },
    { id: 'win.reports.escaping', title: 'Customer input is HTML-escaped in reports', dom: true, test: () => { const t = makeTestCtx(); t.job.customer = '<script>alert(1)</script>'; const html = reportFor(t.ctx, t.job); t.done(); return !html.includes('<script>alert') && html.includes('&lt;script&gt;'); } }
];
