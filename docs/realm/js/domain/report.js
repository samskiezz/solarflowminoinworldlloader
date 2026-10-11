/**
 * Report builder: turns a job/design into a printable HTML document
 * (design summary, compliance checklists, commissioning results, labels).
 * All interpolated text is escaped.
 */
import { CHECKLISTS, evaluateChecklist } from './checklists.js';
import { TEST_DEFINITIONS } from './commissioning.js';
import { requiredLabels } from './labels.js';
import { jobProgress } from './jobs.js';

export function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

function section(title, body) {
    return `<section><h2>${escapeHtml(title)}</h2>${body}</section>`;
}

function kv(rows) {
    return `<table class="kv">${rows.filter(([, v]) => v !== undefined && v !== null && v !== '').map(([k, v]) => `<tr><th>${escapeHtml(k)}</th><td>${escapeHtml(v)}</td></tr>`).join('')}</table>`;
}

export function designSection(design = {}) {
    return section('System design', kv([
        ['Array (kW DC)', design.arrayKw], ['Modules', design.module ? `${design.moduleCount} × ${design.module}` : undefined], ['Inverter', design.inverter],
        ['Battery', design.battery], ['Strings', design.strings], ['Modules per string', design.modulesPerString],
        ['Array max voltage (cold)', design.arrayMaxVoltage ? `${design.arrayMaxVoltage} V` : undefined], ['Voltage rise', design.voltageRisePct !== undefined ? `${design.voltageRisePct} %` : undefined],
        ['DC/AC ratio', design.dcAcRatio], ['Estimated annual yield', design.annualKwh ? `${design.annualKwh} kWh` : undefined], ['STCs', design.stcs]
    ]));
}

export function checklistSection(job) {
    const parts = [];
    for (const [id, answers] of Object.entries(job.checklists || {})) {
        const def = CHECKLISTS[id];
        if (!def) continue;
        const result = evaluateChecklist(id, answers);
        const rows = def.items.map((item) => `<tr class="${escapeHtml(answers[item.id] || 'pending')}"><td>${escapeHtml(item.text)}</td><td>${escapeHtml(item.reference)}</td><td>${escapeHtml((answers[item.id] || 'pending').toUpperCase())}</td></tr>`).join('');
        parts.push(`<h3>${escapeHtml(def.title)} – ${escapeHtml(result.status)} (${result.scorePct} %)</h3><table class="grid"><thead><tr><th>Item</th><th>Reference</th><th>Result</th></tr></thead><tbody>${rows}</tbody></table>`);
    }
    return section('Compliance checklists', parts.join('') || '<p>No checklists recorded.</p>');
}

export function testsSection(job) {
    const readings = (job.tests && job.tests.readings) || {};
    const results = (job.tests && job.tests.results) || [];
    const rows = TEST_DEFINITIONS.map((def) => {
        const result = results.find((r) => r.id === def.id);
        return `<tr><td>${escapeHtml(def.title)}</td><td>${escapeHtml(readings[def.id] ?? '')} ${escapeHtml(def.unit === 'pass/fail' ? '' : def.unit)}</td><td>${escapeHtml(def.criterion)}</td><td>${escapeHtml(result ? result.status.toUpperCase() : 'PENDING')}</td></tr>`;
    }).join('');
    return section('Commissioning tests', `<p>Overall: <strong>${escapeHtml(job.tests?.status || 'INCOMPLETE')}</strong></p><table class="grid"><thead><tr><th>Test</th><th>Reading</th><th>Criterion</th><th>Result</th></tr></thead><tbody>${rows}</tbody></table>`);
}

export function labelsSection(job) {
    const labels = requiredLabels({ hasPv: job.systemKw > 0, hasBattery: job.batteryKwh > 0, hasBackup: Boolean(job.design?.hasBackup), supplyType: job.design?.supplyType, arrayVocV: job.design?.arrayMaxVoltage, arrayIscA: job.design?.arrayIsc, inverterMainSwitches: job.design?.inverterMainSwitches });
    return section('Required labels', `<ol>${labels.map((l) => `<li><strong>${escapeHtml(l.text)}</strong><br><small>${escapeHtml(l.location)} – ${escapeHtml(l.reference)}</small></li>`).join('')}</ol>`);
}

/** Full job report as a standalone HTML document. */
export function buildJobReport(job, { company = 'SolarFlow Realm', generatedAt = new Date().toISOString(), extraSections = [] } = {}) {
    const progress = jobProgress(job);
    const body = [
        `<header><h1>${escapeHtml(company)} – Job report</h1><p>${escapeHtml(job.id)} · ${escapeHtml(job.customer)} · ${escapeHtml(job.address)} ${escapeHtml(job.postcode)}</p><p>Stage: ${escapeHtml(job.stage)} · ${progress.done}/${progress.total} tasks · generated ${escapeHtml(generatedAt)}</p></header>`,
        designSection(job.design || {}),
        checklistSection(job),
        testsSection(job),
        labelsSection(job),
        ...extraSections.map((s) => section(s.title, s.html)),
        section('Notes', `<ul>${(job.notes || []).map((n) => `<li><small>${escapeHtml(n.at)} ${escapeHtml(n.author)}</small> ${escapeHtml(n.text)}</li>`).join('') || '<li>None</li>'}</ul>`),
        '<footer><p>Automated screening report. A licensed electrical worker / SAA accredited person must verify compliance against the full standards. Standards are copyrighted by Standards Australia.</p></footer>'
    ].join('\n');
    return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>${escapeHtml(job.id)} report</title><style>
body{font-family:system-ui,sans-serif;margin:32px;color:#111}h1{font-size:22px}h2{font-size:18px;margin-top:28px;border-bottom:1px solid #ccc}h3{font-size:15px}
table{border-collapse:collapse;width:100%;font-size:13px}th,td{border:1px solid #ddd;padding:6px;text-align:left;vertical-align:top}table.kv th{width:30%;background:#f4f4f4}
tr.fail td{background:#fde8e8}tr.pass td{background:#e9f7ea}tr.pending td{background:#fff8e1}footer{margin-top:32px;font-size:12px;color:#555}@media print{body{margin:12mm}}
</style></head><body>${body}</body></html>`;
}

export const FEATURES = [
    { id: 'report.escapeHtml', title: 'HTML escaping', test: () => escapeHtml('<b>&"') === '&lt;b&gt;&amp;&quot;' },
    { id: 'report.designSection', title: 'Design section renders provided fields only', test: () => { const html = designSection({ arrayKw: 6.6, stcs: 45 }); return html.includes('6.6') && html.includes('45') && !html.includes('Inverter'); } },
    { id: 'report.buildJobReport', title: 'Full job report document', test: () => { const job = { id: 'JOB-1', customer: '<Bob>', address: '1 St', postcode: '2000', stage: 'design', systemKw: 6.6, batteryKwh: 13.5, tasks: { a: true, b: false }, checklists: { handover: { ho_serials: 'pass' } }, tests: { status: 'INCOMPLETE', readings: { earth_continuity: 0.2 }, results: [{ id: 'earth_continuity', status: 'pass' }] }, design: { arrayKw: 6.6 }, notes: [{ at: 'now', author: 'me', text: 'x' }] }; const html = buildJobReport(job); return html.startsWith('<!DOCTYPE html>') && html.includes('&lt;Bob&gt;') && html.includes('BESS') && html.includes('Commissioning tests'); } }
    ,{ id: 'report.extraSections', title: 'Reports accept extra sections (proposal, serials, warranties)', test: () => buildJobReport({ id: 'J', customer: 'C', address: '', postcode: '', stage: 'lead', tasks: {}, notes: [] }, { extraSections: [{ title: 'Serial register', html: '<p>MOD-1</p>' }] }).includes('Serial register') }
];
