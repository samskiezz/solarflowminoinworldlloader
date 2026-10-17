/** Compliance engine: ask a question through the six-tier hierarchy and the court-safe tests, run the AS/NZS 5033:2021 check on the current job, validate a system record per tier, and watch the engines. */
import { h, button, badge, progressBar, toast, select } from '../core/ui.js';
import { TIERS, precedence } from '../domain/hierarchy.js';
import { checkAS5033_2021, FUNCTION_DOMAINS } from '../domain/compliance.js';
import { validateSystemData } from '../domain/pipeline.js';
import { DNSPS } from '../domain/dnsp.js';
import { section, row, grid, statCard, jobPicker, form, clauseRef } from './_shared.js';
import { makeTestCtx, openWindow, q, qa, fire } from './_testing.js';

const STATUS_KIND = { pass: 'ok', fail: 'bad', advisory: 'warn', skipped: 'neutral' };
const tierBadge = (t) => h('span', { class: 'badge tier-badge', style: { background: t.colour, color: '#fff' } }, `Tier ${t.tier} · ${t.name}`);

function renderTests(tests) {
    return h('div', { class: 'five-tests' }, tests.tests.map((t) => h('div', { class: `five-test ${t.passed ? 'pass' : 'fail'}` }, h('div', { class: 'five-test-head' }, badge(t.passed ? 'PASS' : 'FAIL', t.passed ? 'ok' : 'bad'), h('strong', {}, `${t.testId} ${t.name}`), h('span', { class: 'muted small' }, t.question)), progressBar(Math.round(t.score * 100), { small: true, colour: t.passed ? 'var(--ok)' : 'var(--bad)', label: `threshold ${Math.round(t.threshold * 100)} %` }), h('div', { class: 'muted small' }, t.reasoning.join(' · ')))));
}

function renderAsk(body, ctx) {
    const last = ctx.store.get('ui.complianceQuery') || '';
    const input = h('input', { class: 'input compliance-query', type: 'text', value: last, placeholder: 'e.g. Can I fit the isolator while the string is live? · What export limit applies on single phase?' });
    const dnspSel = select([{ value: '', label: '— no network context —' }, ...DNSPS.map((d) => ({ value: d.id, label: `${d.name} (${d.state})` }))], { value: ctx.design()?.dnspApplication?.dnspId || '' });
    const out = h('div', { class: 'compliance-result' });
    const run = () => {
        const query = input.value.trim(); if (!query) { out.replaceChildren(h('div', { class: 'empty inline' }, 'Type a question first.')); return; }
        ctx.store.set('ui.complianceQuery', query);
        const r = ctx.bridge.ask(query, { dnsp: dnspSel.value || null });
        ctx.world.recordStat('complianceQueries');
        out.replaceChildren();
        if (r.route === 'product') { out.append(section('Product knowledge', h('p', {}, r.result.answer), r.result.hits.length > 1 ? h('ul', { class: 'results' }, r.result.hits.slice(1).map((x) => h('li', { class: 'result' }, h('span', { class: 'result-label' }, x.product), h('span', { class: 'result-value' }, x.answer)))) : null, h('p', { class: 'muted small' }, r.result.basis))); return; }
        const c = r.result;
        if (c.refused) { out.append(section('Refused by the court-safe framework', row(c.tier ? tierBadge(c.tier) : null, badge('COURT_SAFE_REFUSAL', 'bad')), h('ul', { class: 'issues' }, c.refusal.specificReasons.map((x) => h('li', { class: 'issue' }, '⚠ ', x))), h('p', {}, h('strong', {}, 'Do: '), c.refusal.recommendedAction, ' – ', c.refusal.conservativeGuidance.professionalReferral), h('ul', {}, c.refusal.conservativeGuidance.recommendations.map((x) => h('li', {}, x))))); return; }
        out.append(section('Governing tier', row(tierBadge(c.tier), badge(c.verdict, c.verdict === 'defensible' ? 'ok' : 'warn'), c.conservativeDefault ? badge('conservative default', 'neutral') : null), h('p', { class: 'muted' }, c.reason), c.alsoApplies.length ? h('p', { class: 'muted small' }, 'Also applies: ', c.alsoApplies.map((t) => `tier ${t.tier} ${t.name}`).join(', ')) : null, h('p', { class: 'small' }, c.basis)));
        out.append(section('Court-safe answer', h('p', { class: 'compliance-answer' }, c.answer), c.evidence.length ? h('ul', { class: 'results' }, c.evidence.map((e) => { const m = e.match(/^(AS\/NZS [\d.]+:\d{4}(?: \(\+Amd [^)]*\))?) Cl ([\d.]+)/); return h('li', { class: 'result' }, m ? clauseRef(ctx, `${m[1]} Cl ${m[2]}`) : null, h('span', { class: 'result-value' }, e)); })) : null, c.hazards.length ? h('p', {}, h('strong', {}, 'Hazards: '), c.hazards.join(', '), h('br'), h('strong', {}, 'Controls: '), c.controls.join('; ')) : null));
        out.append(section('The five tests', renderTests(c.tests)));
        out.append(section('Disclaimer and framing', h('p', { class: 'small' }, c.disclaimer.general, ' ', c.disclaimer.specific), h('p', { class: 'muted small' }, Object.values(c.legalFraming).join(' ')), h('p', { class: 'muted small mono' }, `audit ${c.auditTrail.timestamp} · engine ${c.systemVersion}`)));
        const owner = ctx.world.crew().find((a) => /Compliance|Standards|Inspection/.test(a.meta?.title || '')) || ctx.world.crew()[0];
        if (owner) out.append(row(button(`Ask ${owner.name} about this`, () => { ctx.store.set('ui.chatAgent', owner.id); ctx.store.set('ui.chatSeed', `About "${query}": ${c.answer.slice(0, 240)} What would you do first?`); ctx.open('chat', { tab: 'talk' }); }, { small: true })));
    };
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') run(); });
    body.append(section('Ask the compliance engine', h('p', { class: 'muted small' }, 'Every answer is governed by the highest regulatory tier that applies, cites the Codex and the network register, is rewritten in court-safe language and must pass the five defensibility tests (479–483).'), row(input, dnspSel, button('Ask', run, { kind: 'primary', small: true }))), out);
    if (last) run();
}

function renderHierarchy(body, ctx) {
    body.append(section('The six tiers – the higher governs when more than one applies', h('table', { class: 'data-table' }, h('thead', {}, h('tr', {}, h('th', {}, 'Tier'), h('th', {}, 'Authority'), h('th', {}, 'Examples'), h('th', {}, 'Enforced by'))), h('tbody', {}, TIERS.map((t) => h('tr', {}, h('td', {}, tierBadge(t), h('div', { class: 'muted small' }, t.priority.replace(/_/g, ' ').toLowerCase())), h('td', {}, t.authority), h('td', { class: 'small' }, t.examples.join(' · ')), h('td', { class: 'small' }, t.enforceability)))))));
    const a = select(TIERS.map((t) => ({ value: t.tier, label: `${t.tier} ${t.name}` })), { value: 6 }); const b = select(TIERS.map((t) => ({ value: t.tier, label: `${t.tier} ${t.name}` })), { value: 2 });
    const out = h('div', { class: 'precedence-out' });
    const run = () => { const p = precedence({ tier: Number(a.value), text: 'Source A' }, { tier: Number(b.value), text: 'Source B' }); out.replaceChildren(h('p', {}, h('strong', {}, p.winner.text), ' wins: ', p.reason)); };
    a.addEventListener('change', run); b.addEventListener('change', run); run();
    body.append(section('Precedence – when two sources disagree', row(h('span', { class: 'field-label' }, 'Source A'), a, h('span', { class: 'field-label' }, 'Source B'), b), out, h('p', { class: 'muted small' }, 'A manufacturer\'s manual never overrides a standard; a standard never overrides safety law. ', clauseRef(ctx, 'AS/NZS 3000:2018'))));
}

function installFromJob(ctx, job) {
    const d = ctx.design(job.id); const mod = d.moduleId ? ctx.products.byId.get(d.moduleId) : null; const inv = d.inverterId ? ctx.products.byId.get(d.inverterId) : null;
    const s = mod?.specifications || {}; const is = inv?.specifications || {};
    const modulesPerString = Number(d.modulesPerString ?? d.stringSize ?? 10);
    return { modulesPerString, voc: s.voc ?? 49.5, vmp: s.vmp ?? 41, isc: s.isc ?? 13.9, imp: s.imp ?? 13, tempCoeffVoc: s.temp_coeff_voc ?? -0.28, tMin: d.tMin ?? 2, installationClass: d.installationClass || 'domestic', stringsInParallel: d.strings ?? 2, cableRatingA: d.cableRatingA ?? 30, cableMm2: d.dcCableMm2 ?? 6, cableLengthM: d.dcCableLengthM ?? 20, arrayKwDc: d.arrayKwDc ?? job.systemKw ?? 6.6, inverterKwAc: is.ac_power_kw ?? (job.systemKw ? Math.round(job.systemKw / 1.2 * 10) / 10 : 5), gridConnected: true, inverters: inv ? [{ model: `${inv.manufacturer} ${inv.model}`, standard: is.inverter_standard || (inv.cerApproved ? 'AS/NZS 4777.2:2020' : '') }] : [], dcIsolatorAtInverter: d.dcIsolatorAtInverter ?? true, arcDetection: d.arcDetection ?? false, labelsFitted: d.labelsFitted ?? 0, hasBattery: Boolean(job.batteryKwh) };
}
function renderAs5033(body, ctx) {
    body.append(jobPicker(ctx, { onChange: () => ctx.refresh('compliance') }));
    const job = ctx.currentJob(); if (!job) return;
    const base = installFromJob(ctx, job);
    const f = form([
        { key: 'modulesPerString', label: 'Modules per string', value: base.modulesPerString, step: 1 }, { key: 'voc', label: 'Module Voc (V)', value: base.voc }, { key: 'vmp', label: 'Module Vmp (V)', value: base.vmp }, { key: 'isc', label: 'Module Isc (A)', value: base.isc },
        { key: 'tempCoeffVoc', label: 'Voc temp. coeff. (%/°C)', value: base.tempCoeffVoc }, { key: 'tMin', label: 'Site minimum temp (°C)', value: base.tMin }, { key: 'installationClass', label: 'Installation class', type: 'select', value: base.installationClass, options: [{ value: 'domestic', label: 'Domestic (1000 V)' }, { value: 'domestic_pre_2024', label: 'Domestic pre-2024 (600 V)' }, { value: 'commercial', label: 'Non-domestic (1500 V)' }] },
        { key: 'stringsInParallel', label: 'Strings in parallel', value: base.stringsInParallel, step: 1 }, { key: 'cableRatingA', label: 'Fitted cable rating (A)', value: base.cableRatingA }, { key: 'cableMm2', label: 'd.c. cable (mm²)', value: base.cableMm2 }, { key: 'cableLengthM', label: 'd.c. run (m, one way)', value: base.cableLengthM },
        { key: 'arrayKwDc', label: 'Array (kW d.c.)', value: base.arrayKwDc }, { key: 'inverterKwAc', label: 'Inverter (kW a.c.)', value: base.inverterKwAc }, { key: 'labelsFitted', label: 'Labels fitted', value: base.labelsFitted, step: 1 },
        { key: 'dcIsolatorAtInverter', label: 'd.c. isolator at the inverter', type: 'checkbox', value: base.dcIsolatorAtInverter }, { key: 'arcDetection', label: 'Arc-fault detection fitted', type: 'checkbox', value: base.arcDetection }
    ], { columns: 3 });
    const out = h('div', { class: 'as5033-out' });
    const run = () => { const r = checkAS5033_2021({ ...base, ...f.values() }); out.replaceChildren(row(badge(r.compliant ? 'COMPLIANT' : 'NOT COMPLIANT', r.compliant ? 'ok' : 'bad'), h('span', { class: 'muted' }, r.summary)), h('ul', { class: 'results as5033-checks' }, r.checks.map((c) => h('li', { class: `result ${c.status === 'fail' ? 'bad' : c.status === 'pass' ? 'ok' : ''}` }, badge(c.status, STATUS_KIND[c.status]), h('span', { class: 'result-label' }, c.section), h('span', { class: 'result-value' }, c.detail), h('span', { class: 'result-ref small' }, c.citation)))), r.recommendations.length ? h('div', {}, h('strong', {}, 'Do: '), h('ul', {}, r.recommendations.map((x) => h('li', {}, x)))) : null); return r; };
    body.append(section(`AS/NZS 5033:2021 check – ${job.customer}`, h('p', { class: 'muted small' }, 'Array voltage, cable current, voltage drop, d.c.:a.c. ratio, isolation, arc hazards, inverter standards and labels, computed with the Realm\'s own calculators. ', clauseRef(ctx, 'AS/NZS 5033:2021')), f.el, row(button('Run check', () => { const r = run(); ctx.saveDesign(job.id, { ...f.values(), as5033: { compliant: r.compliant, summary: r.summary, at: new Date(ctx.now()).toISOString() } }); ctx.world.recordStat('as5033Checks'); toast(r.compliant ? 'AS/NZS 5033:2021: compliant' : `AS/NZS 5033:2021: ${r.criticalIssues.length} issue(s)`, { kind: r.compliant ? 'ok' : 'warn' }); }, { kind: 'primary', small: true }))), out);
    run();
}

function renderValidate(body, ctx) {
    body.append(jobPicker(ctx, { onChange: () => ctx.refresh('compliance') }));
    const job = ctx.currentJob(); if (!job) return;
    const d = ctx.design(job.id);
    const f = form([
        { key: 'systemVoltage', label: 'Array Voc at site minimum (V)', value: d.arrayVocV ?? 560 }, { key: 'installationClass', label: 'Installation class', type: 'select', value: d.installationClass || 'domestic', options: [{ value: 'domestic', label: 'Domestic' }, { value: 'domestic_pre_2024', label: 'Domestic pre-2024' }, { value: 'commercial', label: 'Non-domestic' }] },
        { key: 'dcIsolation', label: 'd.c. isolation', type: 'checkbox', value: d.dcIsolatorAtInverter ?? true }, { key: 'acIsolation', label: 'a.c. isolation', type: 'checkbox', value: true }, { key: 'shutdown', label: 'Shutdown procedure label', type: 'checkbox', value: d.labelsFitted == null ? true : d.labelsFitted > 0 },
        { key: 'inverterCompliance', label: 'Inverter listed to AS/NZS 4777.2', type: 'checkbox', value: d.inverterId ? Boolean(ctx.products.byId.get(d.inverterId)?.cerApproved) : true }, { key: 'batteryCapacity', label: 'Battery (kWh, 0 = none)', value: job.batteryKwh ?? 0 }, { key: 'batteryCompliance', label: 'Battery location assessed OK', type: 'checkbox', value: Boolean(d.batteryAssessment?.ok) }, { key: 'batteryClearanceMm', label: 'Battery clearance (mm)', value: d.batteryClearanceMm ?? 600 },
        { key: 'dnspId', label: 'Network operator', type: 'select', value: d.dnspApplication?.dnspId || '', options: [{ value: '', label: '— default allowance —' }, ...DNSPS.map((x) => ({ value: x.id, label: x.name }))] }, { key: 'phases', label: 'Phases', value: job.phases ?? 1, step: 1 }, { key: 'exportCapacity', label: 'Export (kW)', value: d.exportLimitKw ?? 5 }, { key: 'systemSize', label: 'Inverter capacity (kVA)', value: job.systemKw ?? 5 },
        { key: 'productsApproved', label: 'Products on the approved lists', type: 'checkbox', value: d.productsApproved ?? true }, { key: 'manufacturerInstructions', label: 'Manufacturer instructions followed', type: 'checkbox', value: true }
    ], { columns: 3 });
    const out = h('div', { class: 'validate-out' });
    const run = () => { const v = f.values(); const r = validateSystemData({ ...v, safetyFeatures: [v.dcIsolation && 'dc_isolation', v.acIsolation && 'ac_isolation', v.shutdown && 'shutdown_procedure'].filter(Boolean) }); out.replaceChildren(row(badge(r.valid ? 'VALID' : `GOVERNING FAILURE: TIER ${r.governing}`, r.valid ? 'ok' : 'bad'), h('span', { class: 'muted' }, r.summary)), grid(5, ...r.byTier.map((t) => statCard(`Tier ${t.tier}`, `${t.passed}/${t.passed + t.failed}`, t.name, t.failed ? 'var(--bad)' : 'var(--ok)'))), h('ul', { class: 'results validate-rules' }, r.results.map((x) => h('li', { class: `result ${x.compliant ? 'ok' : 'bad'}` }, badge(x.id, x.compliant ? 'ok' : 'bad'), h('span', { class: 'result-label' }, x.rule), h('span', { class: 'result-value' }, x.message), x.recommendation ? h('span', { class: 'result-ref small' }, `→ ${x.recommendation}`) : null)))); };
    body.append(section(`Validate the system record – ${job.customer}`, h('p', { class: 'muted small' }, 'Eight rules across the tiers: safety law, standards, network, CER and manufacturer. The highest failing tier is the one that governs the fix.'), f.el, row(button('Validate', run, { kind: 'primary', small: true }))), out);
    run();
}

function renderEngines(body, ctx) {
    const s = ctx.bridge.status();
    body.append(grid(4, statCard('Functions live', s.functionsImplemented, `of ${s.functionsReserved} reserved slots`), statCard('Coverage', `${s.coveragePct} %`, 'honest count'), statCard('Crew on the engines', s.minionsOperational), statCard('Compliance score', s.complianceScore === null ? '–' : `${s.complianceScore} %`, s.alert || 'from the last self-test', s.alert ? 'var(--warn)' : null)));
    body.append(section('Engines', h('ul', { class: 'results engine-list' }, s.engines.map((e) => h('li', { class: 'result' }, badge(e.status, e.status === 'active' ? 'ok' : 'neutral'), h('span', { class: 'result-label' }, e.name), h('span', { class: 'result-value muted' }, e.detail))))));
    body.append(section('Function catalogue – the 500 numbered slots of the original engine', h('p', { class: 'muted small' }, s.catalogue.note), h('table', { class: 'data-table' }, h('thead', {}, h('tr', {}, h('th', {}, 'Domain'), h('th', {}, 'Slots'), h('th', {}, 'Real functions'), h('th', {}, 'Where'))), h('tbody', {}, FUNCTION_DOMAINS.map((d) => h('tr', {}, h('td', {}, d.name), h('td', { class: 'mono' }, `${d.range[0]}–${d.range[1]}`), h('td', {}, String(d.implemented.length)), h('td', { class: 'small muted' }, d.implemented.join(', '))))))));
    body.append(section('Minion capabilities', h('table', { class: 'data-table' }, h('thead', {}, h('tr', {}, h('th', {}, 'Minion'), h('th', {}, 'Capability'), h('th', {}, 'Archetype'), h('th', {}, 'Engines'), h('th', {}, 'Now'))), h('tbody', {}, ctx.bridge.capabilities().map((c) => h('tr', {}, h('td', {}, `${c.name} `, h('span', { class: 'muted small' }, c.title)), h('td', {}, c.label), h('td', {}, c.archetype), h('td', { class: 'small' }, c.integrations.join(', ')), h('td', {}, badge(c.status, c.status === 'working' ? 'accent' : 'neutral'))))))), h('p', { class: 'muted small' }, `Questions asked ${s.metrics.asked} · product ${s.metrics.product} · compliance ${s.metrics.compliance} · refused ${s.metrics.refused} · via LLM ${s.metrics.llm} · products indexed ${s.products}`));
}

export function def(ctx) {
    return {
        id: 'compliance', title: 'Compliance engine', icon: '⚖️', hotkey: null, width: 940, height: 660,
        tabs: [{ id: 'ask', label: 'Ask', icon: '❓' }, { id: 'hierarchy', label: 'Hierarchy', icon: '🏛' }, { id: 'as5033', label: 'AS/NZS 5033', icon: '☀' }, { id: 'validate', label: 'Validate', icon: '✔' }, { id: 'engines', label: 'Engines', icon: '⚙' }],
        render(body, { tab }) {
            if (tab === 'hierarchy') return renderHierarchy(body, ctx);
            if (tab === 'as5033') return renderAs5033(body, ctx);
            if (tab === 'validate') return renderValidate(body, ctx);
            if (tab === 'engines') return renderEngines(body, ctx);
            return renderAsk(body, ctx);
        }
    };
}

export const FEATURES = [
    { id: 'win.compliance.ask', title: 'A question gets a tier, a court-safe answer, the five tests and a disclaimer', dom: true, test: () => { const t = makeTestCtx(); const b = openWindow(t.ctx, def(t.ctx)); const inp = q(b, '.compliance-query'); inp.value = 'Can I fit the isolator while the string is live?'; fire(inp, 'input'); qa(b, 'button').find((x) => x.textContent === 'Ask').click(); const ok = /Tier 1 · Safety law/.test(b.textContent) && qa(b, '.five-test').length === 5 && /Hazards:/.test(b.textContent) && /educational purposes/.test(b.textContent) && t.ctx.store.get('ui.complianceQuery') === inp.value && t.ctx.world.stats.complianceQueries === 1; t.done(); return ok; } },
    { id: 'win.compliance.refusal', title: 'Beyond the envelope the window shows the refusal and the conservative guidance', dom: true, test: () => { const t = makeTestCtx(); t.ctx.store.set('ui.complianceQuery', 'Design the 1500 V string for the 2 MW farm'); const b = openWindow(t.ctx, def(t.ctx)); const ok = /Refused by the court-safe framework/.test(b.textContent) && /COURT_SAFE_REFUSAL/.test(b.textContent) && /Professional consultation required/.test(b.textContent) && qa(b, '.five-test').length === 0; t.done(); return ok; } },
    { id: 'win.compliance.hierarchy', title: 'Six tiers tabled and precedence resolved between two sources', dom: true, test: () => { const t = makeTestCtx(); const b = openWindow(t.ctx, def(t.ctx), { tab: 'hierarchy' }); const ok = qa(b, 'tbody tr').length === 6 && /Source B.*wins/.test(b.textContent.replace(/\n/g, ' ')); t.done(); return ok; } },
    { id: 'win.compliance.as5033', title: 'The AS/NZS 5033 check runs on the current job, saves the result into the design and counts the stat', dom: true, test: () => { const t = makeTestCtx(); t.ctx.saveDesign(t.job.id, { moduleId: 'PV-A440', inverterId: 'INV-G5', modulesPerString: 11 }); const b = openWindow(t.ctx, def(t.ctx), { tab: 'as5033' }); const checks = qa(b, '.as5033-checks .result').length; qa(b, 'button').find((x) => x.textContent === 'Run check').click(); const ok = checks === 8 && t.ctx.design(t.job.id).as5033 && typeof t.ctx.design(t.job.id).as5033.compliant === 'boolean' && t.ctx.world.stats.as5033Checks === 1; t.done(); return ok; } },
    { id: 'win.compliance.validate', title: 'The tier validator runs eight rules and names the governing failure', dom: true, test: () => { const t = makeTestCtx(); t.ctx.saveDesign(t.job.id, { exportLimitKw: 10, dnspApplication: { dnspId: 'ausgrid' }, batteryAssessment: { ok: true } }); const b = openWindow(t.ctx, def(t.ctx), { tab: 'validate' }); const ok = qa(b, '.validate-rules .result').length === 8 && /GOVERNING FAILURE: TIER 3/.test(b.textContent) && /Ausgrid/.test(b.textContent); t.done(); return ok; } },
    { id: 'win.compliance.engines', title: 'Engines tab: eight engines, the honest catalogue, crew capabilities and metrics', dom: true, test: () => { const t = makeTestCtx(); const b = openWindow(t.ctx, def(t.ctx), { tab: 'engines' }); const ok = qa(b, '.engine-list .result').length === 9 && /500 numbered slots/.test(b.textContent) && qa(b, 'tbody').length === 2 && qa(b, 'tbody')[1].children.length === 6; t.done(); return ok; } }
];
