/**
 * Compliance engine (ported from solar_compliance_engine.js): the query
 * pipeline that every question goes through – competency gate, governing
 * tier, evidence from the Codex and the DNSP register, court-safe framing,
 * auto-citation and the five tests – plus the AS/NZS 5033:2021 installation
 * check and an honest catalogue of the function domains the original file
 * numbered 1–500, mapped to the code that actually exists in the Realm.
 */
import { autoCite, TIERS, tierByNumber } from './hierarchy.js';
import { assessDecision, exceedsCompetency, courtSafeRefusal } from './courtsafe.js';
import { searchStandards, findClause } from './standards.js';
import { DNSPS, dnspById } from './dnsp.js';
import { arrayMaxVoltage, systemVoltageLimit, stringCableCurrent, dcVoltageDrop, dcAcRatio, STRING_CABLE_CURRENT_FACTOR, DC_VOLTAGE_DROP_LIMIT_PCT } from './pv.js';
import { requiredLabels } from './labels.js';
import { searchLibrary, sourceOf } from './library.js';

export const VERSION = '2.9.0';

const HAZARD_RE = /\b(live|energised|arc|shock|fire|fall|height|roof edge|asbestos|wet|storm|flood)/i;

/** Hazards a question names, so the court-safe tests see them even when the asker did not list any. */
export function detectHazards(query) {
    const q = String(query || '');
    const found = [];
    if (/\b(live|energised)\b/i.test(q)) found.push('work on or near live conductors');
    if (/\barc\b/i.test(q)) found.push('d.c. arc');
    if (/\b(shock|electrocut)/i.test(q)) found.push('electric shock');
    if (/\bfire\b/i.test(q)) found.push('fire');
    if (/\b(fall|height|roof edge)\b/i.test(q)) found.push('fall from height');
    if (/\basbestos\b/i.test(q)) found.push('asbestos');
    if (/\b(wet|storm|flood)/i.test(q)) found.push('weather');
    return found;
}

/** Which disclaimer family a question belongs to. */
export function categoryFor(query, tier) {
    const q = String(query || '').toLowerCase();
    if (/battery|bess|5139/.test(q)) return 'battery';
    if (tier === 3 || /export|dnsp|grid|connection/.test(q)) return 'grid';
    if (tier === 5 || /stc|rebate|incentive|certificate/.test(q)) return 'incentive';
    if (/install|mount|isolator|cable/.test(q)) return 'install';
    if (/design|string|voltage|size|sizing|layout/.test(q)) return 'design';
    return 'general';
}

/** Numbers in the question that bear on competency: "1500 V", "2 MW", "120 A". */
export function inferParams(query) {
    const q = String(query || '').toLowerCase(); const out = {};
    const v = q.match(/(\d+(?:\.\d+)?)\s*(kv|v)\b/); if (v) out.voltage = Number(v[1]) * (v[2] === 'kv' ? 1000 : 1);
    const p = q.match(/(\d+(?:\.\d+)?)\s*(mw|kw|w)\b/); if (p) out.powerKw = Number(p[1]) * (p[2] === 'mw' ? 1000 : p[2] === 'w' ? 0.001 : 1);
    const a = q.match(/(\d+(?:\.\d+)?)\s*a\b/); if (a) out.current = Number(a[1]);
    return out;
}

/** Clauses matching the most of the question's words first (ties by standard order). */
export function rankedClauseHits(words) {
    const counts = new Map();
    for (const w of words) for (const h of searchStandards(w)) { const key = `${h.standard}|${h.ref}`; const e = counts.get(key) || { hit: h, n: 0 }; e.n++; counts.set(key, e); }
    return [...counts.values()].sort((a, b) => b.n - a.n).map((e) => e.hit);
}

/**
 * The whole pipeline for one question. Returns a record the Compliance window
 * (and the engine bridge) can render as-is: tier, citations, the court-safe
 * answer, the five tests, disclaimer, framing and the audit trail.
 */
export function processQuery(query, context = {}) {
    const q = String(query || '').trim();
    const now = context.now ?? null;
    const timestamp = new Date(now ?? Date.now()).toISOString();
    if (!q) return { query: q, refused: true, refusal: courtSafeRefusal(['No question was asked']), timestamp };
    const competency = exceedsCompetency({ ...inferParams(q), ...(context.params || {}) });
    const cite = autoCite(q, { ...context, hazard: context.hazard || HAZARD_RE.test(q), now: now ?? undefined });
    const category = categoryFor(q, cite.tier.tier);
    if (competency.exceeds) return { query: q, refused: true, tier: cite.tier, reason: cite.reason, refusal: courtSafeRefusal(competency.reasons, { category, tier: cite.tier.tier }), citations: cite.citations, basis: cite.basis, timestamp };

    const hits = searchStandards(q).slice(0, 4);
    const words = q.toLowerCase().split(/[^a-z0-9./]+/).filter((w) => w.length > 3);
    const wordHits = hits.length ? hits : rankedClauseHits(words).slice(0, 4);
    const dnsp = context.dnsp ? dnspById(context.dnsp) : null;
    const evidence = wordHits.map((h) => `${h.standard} Cl ${h.ref} (${h.title}): ${h.summary}`);
    const libraryHits = context.library ? searchLibrary(context.library, q, { limit: 3 }) : [];
    for (const p of libraryHits) { const src = sourceOf(context.library, p); evidence.push(`${p.code}${p.clauses && p.clauses.length ? ` Cl ${p.clauses[0]}` : ''} (${src && src.title ? src.title : 'library'}): ${p.text.slice(0, 260).replace(/\s+\S*$/, '')}…`); }
    if (dnsp) evidence.push(`${dnsp.name}: basic export allowance ${dnsp.exportLimitKw[1]} kW single-phase / ${dnsp.exportLimitKw[3]} kW three-phase. ${dnsp.notes || ''}`.trim());
    const hazards = context.hazards || detectHazards(q);
    const controls = context.controls || (hazards.length ? hazards.map((hz) => (/live|shock|arc/.test(hz) ? 'isolate and prove dead before work' : /fall/.test(hz) ? 'edge protection or harness' : /fire/.test(hz) ? 'isolation and clearances to AS/NZS standards' : /asbestos/.test(hz) ? 'licensed removalist and no cutting' : 'stop work until conditions clear')) : []);
    const raw = [
        `${cite.tier.name} governs this question (tier ${cite.tier.tier}).`,
        evidence.length ? `Applicable requirements: ${evidence.join(' ')}` : 'No specific clause in the Codex matched; apply the most restrictive interpretation of the governing tier and confirm with the authority before proceeding.',
        hazards.length ? `Hazards identified: ${hazards.join(', ')}. Controls: ${controls.join('; ')}.` : null
    ].filter(Boolean).join(' ');
    const assessed = assessDecision({ text: raw, tier: cite.tier.tier, citations: cite.citations, hazards, controls, assumptions: ['The facts stated in the question are accurate and complete', 'The installation is in Australia under the current editions of the cited standards'], evidence, safetyMargin: 0.1, verifiedBy: context.verifiedBy || null, scope: 'within' }, { now, category });
    return {
        query: q, refused: assessed.verdict === 'refused', verdict: assessed.verdict,
        tier: cite.tier, reason: cite.reason, alsoApplies: cite.alsoApplies, citations: cite.citations, basis: cite.basis, conservativeDefault: cite.conservativeDefault,
        evidence, libraryHits: libraryHits.map((p) => ({ id: p.id, bookId: p.bookId, code: p.code, clauses: p.clauses, heading: p.heading, text: p.text, source: sourceOf(context.library, p) })), hazards, controls, answer: assessed.courtSafeText, raw, tests: assessed.tests, disclaimer: assessed.disclaimer, legalFraming: assessed.legalFraming, conservativeAlternative: assessed.conservativeAlternative, refusal: assessed.refusal,
        auditTrail: assessed.package.auditTrail, category, courtSafe: true, systemVersion: VERSION, timestamp
    };
}

/**
 * AS/NZS 5033:2021 installation check, done with the Realm's own calculators
 * rather than flags. `install` = { modulesPerString, voc, vmp, isc, tempCoeffVoc, tMin,
 * installationClass, stringsInParallel, hasStringProtection, protectionRatingA, cableMm2, cableLengthM,
 * arrayKwDc, inverterKwAc, gridConnected, inverters: [{ model, standard, iec62109 }], dcIsolatorAtInverter,
 * arcDetection, labelsFitted, hasBattery }.
 */
export function checkAS5033_2021(install = {}) {
    const checks = []; const criticalIssues = []; const recommendations = [];
    const add = (c) => { checks.push(c); if (c.status === 'fail') { criticalIssues.push(`${c.section}: ${c.detail}`); if (c.recommendation) recommendations.push(c.recommendation); } else if (c.status === 'advisory' && c.recommendation) recommendations.push(c.recommendation); };
    const cl = (ref) => { const c = findClause('AS/NZS 5033', ref); return c ? `AS/NZS 5033:2021 Cl ${ref} – ${c.title}` : `AS/NZS 5033:2021 Cl ${ref}`; };
    const n = Number(install.modulesPerString); const voc = Number(install.voc);
    if (n > 0 && voc > 0) {
        const vmax = arrayMaxVoltage(n, voc, Number(install.tempCoeffVoc ?? -0.28), Number(install.tMin ?? 5));
        const limit = systemVoltageLimit(install.installationClass || 'domestic');
        add({ id: 'array_voltage', section: 'Array maximum voltage', status: vmax <= limit.limit ? 'pass' : 'fail', detail: `${n} × ${voc} V at ${install.tMin ?? 5} °C gives ${vmax} V against the ${limit.limit} V limit`, requirement: `Array open-circuit voltage at the site minimum temperature must not exceed ${limit.limit} V d.c.`, citation: `${cl('4.2')}; ${limit.reference}`, recommendation: vmax > limit.limit ? `Reduce the string to ${Math.floor(n * limit.limit / vmax)} modules or change the installation class` : null });
    } else add({ id: 'array_voltage', section: 'Array maximum voltage', status: 'skipped', detail: 'Modules per string and Voc not supplied', requirement: 'Array voltage within the system voltage limit', citation: cl('4.2') });
    const isc = Number(install.isc);
    if (isc > 0) {
        const cc = stringCableCurrent(isc, install.stringsInParallel || 1, Boolean(install.hasStringProtection), install.protectionRatingA || null);
        const rated = Number(install.cableRatingA);
        add({ id: 'cable_current', section: 'Cable current rating', status: rated > 0 ? (rated >= cc.arrayCableMinA ? 'pass' : 'fail') : 'advisory', detail: `String cable ≥ ${cc.stringCableMinA} A (${STRING_CABLE_CURRENT_FACTOR} × Isc); array cable ≥ ${cc.arrayCableMinA} A${rated > 0 ? `; fitted ${rated} A` : ''}`, requirement: 'Cables rated for at least 1.25 × Isc and the array fault current', citation: `${cl('4.3')}; ${cc.reference}`, recommendation: rated > 0 && rated < cc.arrayCableMinA ? `Fit cable rated ≥ ${cc.arrayCableMinA} A` : rated > 0 ? null : 'Record the fitted cable rating to close this check' });
        if (install.cableMm2 && install.cableLengthM && install.vmp && n > 0) {
            const vd = dcVoltageDrop({ currentA: Number(install.imp || isc * 0.95), lengthM: Number(install.cableLengthM), cableMm2: Number(install.cableMm2), voltageV: Number(install.vmp) * n });
            add({ id: 'voltage_drop', section: 'd.c. voltage drop', status: vd.withinLimit ? 'pass' : 'fail', detail: `${vd.dropPct} % over ${install.cableLengthM} m of ${install.cableMm2} mm² (limit ${DC_VOLTAGE_DROP_LIMIT_PCT} %)`, requirement: 'Array to inverter voltage drop within the guideline', citation: vd.reference, recommendation: vd.withinLimit ? null : 'Increase the cable size or shorten the run' });
        }
    }
    if (install.arrayKwDc && install.inverterKwAc) {
        const r = dcAcRatio(Number(install.arrayKwDc), Number(install.inverterKwAc));
        add({ id: 'dc_ac_ratio', section: 'Array to inverter ratio', status: r.withinLimit ? 'pass' : 'fail', detail: `${r.ratio} : 1 (limit ${r.limit})`, requirement: 'Inverter rating at least 75 % of the array rating', citation: r.reference, recommendation: r.withinLimit ? null : 'Reduce the array or upsize the inverter to keep STC eligibility' });
    }
    add({ id: 'dc_isolation', section: 'd.c. isolation at the inverter', status: install.dcIsolatorAtInverter === undefined ? 'skipped' : install.dcIsolatorAtInverter ? 'pass' : 'fail', detail: install.dcIsolatorAtInverter ? 'PV array d.c. isolator fitted adjacent to the inverter' : install.dcIsolatorAtInverter === false ? 'No d.c. isolator at the inverter' : 'Not recorded', requirement: 'A readily available d.c. isolator at the inverter; the 2021 edition no longer mandates a rooftop isolator', citation: cl('4.4.3'), recommendation: install.dcIsolatorAtInverter === false ? 'Fit a d.c. isolator at the inverter' : null });
    add({ id: 'arc_detection', section: 'd.c. arc hazards', status: install.arcDetection ? 'pass' : 'advisory', detail: install.arcDetection ? 'Arc-fault detection fitted' : 'No arc-fault detection; d.c. systems can sustain an arc at normal operating current', requirement: 'Arc detection is recommended for d.c. systems; not mandatory in Australia yet', citation: 'AS/NZS 5033:2021 commentary on d.c. arc hazards; IEC 63027', recommendation: install.arcDetection ? null : 'Consider an inverter with integrated arc-fault detection' });
    if (install.gridConnected !== false) {
        const inverters = install.inverters || [];
        const ok = inverters.filter((i) => i.iec62109 || /62109/.test(String(i.standard || '')) || /4777\.2/.test(String(i.standard || '')));
        add({ id: 'inverter_standard', section: 'Inverter standards', status: inverters.length ? (ok.length === inverters.length ? 'pass' : 'fail') : 'skipped', detail: inverters.length ? `${ok.length}/${inverters.length} inverters listed to IEC 62109-2 / AS/NZS 4777.2` : 'No inverters recorded', requirement: 'Grid-connected inverters conform to IEC 62109-2 and AS/NZS 4777.2:2020', citation: 'AS/NZS 5033:2021 with AS/NZS 4777.2:2020 (region settings Australia A/B/C)', recommendation: inverters.length && ok.length !== inverters.length ? 'Replace unlisted inverters with CEC-listed models' : null });
    }
    const labels = requiredLabels({ hasPv: true, hasBattery: Boolean(install.hasBattery), arrayVocV: n > 0 && voc > 0 ? n * voc : undefined, arrayIscA: isc || undefined });
    const fitted = Number(install.labelsFitted);
    add({ id: 'labels', section: 'Labelling and signage', status: Number.isFinite(fitted) ? (fitted >= labels.length ? 'pass' : 'fail') : 'advisory', detail: `${labels.length} labels required${Number.isFinite(fitted) ? `; ${fitted} fitted` : ''}`, requirement: 'Every isolator, the array rating, shutdown procedure and fire information labelled', citation: cl('5.3'), recommendation: Number.isFinite(fitted) && fitted < labels.length ? `Fit the missing ${labels.length - fitted} label(s) from the Labels window` : null });
    return { standard: 'AS/NZS 5033:2021', compliant: criticalIssues.length === 0, checks, criticalIssues, recommendations, requiredLabels: labels.length, summary: `${checks.filter((c) => c.status === 'pass').length} pass · ${checks.filter((c) => c.status === 'fail').length} fail · ${checks.filter((c) => c.status === 'advisory').length} advisory · ${checks.filter((c) => c.status === 'skipped').length} skipped` };
}

/**
 * The function catalogue. The original engine numbered 500 slots across six
 * domains and five critical tests; most slots were placeholders. This lists
 * the slots as reserved and the real Realm code that fills each domain, so the
 * coverage figure is honest.
 */
export const FUNCTION_DOMAINS = [
    { id: 'core', name: 'Core system intelligence', range: [1, 50], implemented: ['hierarchy.governingTier', 'hierarchy.autoCite', 'hierarchy.precedence', 'courtsafe.fiveTests', 'courtsafe.assessDecision', 'compliance.processQuery', 'compliance.checkAS5033_2021', 'pv.stringSizing', 'pv.arrayMaxVoltage', 'ac.voltageRise', 'battery.assessBatteryLocation', 'checklists.evaluateChecklist', 'commissioning.evaluateTests', 'labels.requiredLabels', 'incentives.solarStcs', 'battery.batteryStcs'] },
    { id: 'workforce', name: 'Minion workforce evolution', range: [51, 120], implemented: ['world.tick', 'agent.step', 'planner.chooseAction', 'skills.awardXp', 'memory.reflect', 'genetics.breed', 'lifecycle.socialise', 'lifecycle.makeChild', 'epochs.epochProgress', 'shifts.tickShifts', 'shifts.rosterBoard', 'narrative.Chronicle', 'narrative.archetypeFor', 'roster.rosterSpecs', 'social.conversation'] },
    { id: 'pipeline', name: 'Document and data pipeline', range: [121, 200], implemented: ['pipeline.classifyDocument', 'pipeline.buildQueue', 'pipeline.indexProducts', 'pipeline.queryKnowledge', 'pipeline.validateSystemData', 'products.flatten', 'drive.importDrive', 'drive.packChecklist', 'business.model.buildModel', 'business.servicem8.importJobs', 'business.xero.importInvoices', 'business.gmail.importThreads'] },
    { id: 'query', name: 'Query and interaction engine', range: [201, 260], implemented: ['bridge.ask', 'standards.searchStandards', 'standards.findClause', 'dialogue.reply', 'llm.replyAs', 'llm.personaPrompt', 'commands.search', 'suggestions.suggest'] },
    { id: 'commercial', name: 'Commercial and strategic layers', range: [261, 330], implemented: ['pricing.quote', 'incentives.solarStcs', 'yield.annualYield', 'report.jobReport', 'business.insights.analyse', 'business.market.compare', 'business.social.draft', 'economy.earn', 'economy.spend'] },
    { id: 'meta', name: 'Future-proofing and meta-controls', range: [331, 500], implemented: ['registry.runAll', 'registry.register', 'hierarchy.precedence', 'courtsafe.exceedsCompetency', 'compliance.systemHealth', 'store.flush', 'cloud.save', 'crypto.seal'] },
    { id: 'critical', name: 'Critical safety tests', range: [479, 483], implemented: ['courtsafe.personalAcceptability', 'courtsafe.coronerScrutiny', 'courtsafe.regulatorCompliance', 'courtsafe.judicialDefensibility', 'courtsafe.insurerAcceptability'] }
];
export function catalogue() {
    const domains = FUNCTION_DOMAINS.map((d) => ({ ...d, reserved: d.range[1] - d.range[0] + 1, count: d.implemented.length }));
    const reserved = 500; const implemented = [...new Set(domains.flatMap((d) => d.implemented))].length;
    return { domains, reserved, implemented, coveragePct: Math.round((implemented / reserved) * 100), note: 'The legacy engine reserved 500 numbered slots; the functions listed are the ones that exist as tested Realm code.' };
}

/** A health record for the Engines tab: what is live, how much of the catalogue exists, the crew on duty and the last self-test. */
export function systemHealth({ crew = 0, selfTest = null, llmConfigured = false, businessLoaded = false, library = null } = {}) {
    const cat = catalogue();
    const engines = [
        { id: 'hierarchy', name: 'Six-tier regulatory hierarchy', status: 'active', detail: `${TIERS.length} tiers` },
        { id: 'courtsafe', name: 'Court-safe framework', status: 'active', detail: '5 critical tests' },
        { id: 'compliance', name: 'Compliance query engine', status: 'active', detail: `v${VERSION}` },
        { id: 'pipeline', name: 'Document and data pipeline', status: 'active', detail: 'classify · queue · knowledge · validate' },
        { id: 'library', name: 'Library (web-compiled knowledge)', status: library && library.booksLoaded ? 'active' : 'standby', detail: library && library.booksLoaded ? `${library.booksLoaded} books · ${library.passages} passages` : 'run scripts/knowledge-harvest.mjs' },
        { id: 'narrative', name: 'Narrative engine', status: 'active', detail: 'archetypes · quests · conflicts' },
        { id: 'shifts', name: 'Shift roster', status: 'active', detail: 'three shifts · work cycles' },
        { id: 'llm', name: 'LLM bridge', status: llmConfigured ? 'active' : 'standby', detail: llmConfigured ? 'configured' : 'offline persona replies' },
        { id: 'business', name: 'Business model', status: businessLoaded ? 'active' : 'standby', detail: businessLoaded ? 'loaded' : 'no snapshot loaded' }
    ];
    const complianceScore = selfTest && selfTest.total ? Math.round((selfTest.passed / selfTest.total) * 100) : null;
    return { engines, functionsImplemented: cat.implemented, functionsReserved: cat.reserved, coveragePct: cat.coveragePct, minionsOperational: crew, complianceScore, safetyStatus: 'five tests armed', dnspsKnown: DNSPS.length, tiers: TIERS.map((t) => t.id), alert: complianceScore !== null && complianceScore < 95 ? `Compliance score ${complianceScore} % is below the 95 % threshold` : null };
}

const INSTALL = { modulesPerString: 12, voc: 49.5, vmp: 41.2, isc: 13.9, imp: 13.2, tempCoeffVoc: -0.28, tMin: 2, installationClass: 'domestic', stringsInParallel: 2, cableRatingA: 30, cableMm2: 6, cableLengthM: 20, arrayKwDc: 10.56, inverterKwAc: 8.2, gridConnected: true, inverters: [{ model: 'G8', standard: 'AS/NZS 4777.2:2020' }], dcIsolatorAtInverter: true, arcDetection: false, labelsFitted: 8 };
export const FEATURES = [
    { id: 'compliance.processQuery', title: 'A question comes back with its governing tier, Codex evidence, court-safe answer, five tests and audit trail', test: () => { const r = processQuery('What is the voltage rise limit at the inverter terminals?', { now: 0 }); return !r.refused && r.tier.tier === 2 && r.evidence.some((e) => /4777\.1.*Cl 3\.3/.test(e)) && r.tests.allPassed && /may be appropriate|appears to comply|should typically|governs/.test(r.answer) && r.auditTrail.timestamp === '1970-01-01T00:00:00.000Z' && r.courtSafe && r.category === 'design'; } },
    { id: 'compliance.libraryEvidence', title: 'With a library loaded, the answer also cites the compiled passages and their sources', test: async () => { const { createLibrary, FIXTURE } = await import('./library.js'); const r = processQuery('Can the battery go within 600mm of the garage door opening?', { now: 0, library: createLibrary(FIXTURE) }); return r.libraryHits.length >= 1 && r.libraryHits[0].code === 'AS/NZS 5139:2019' && r.libraryHits[0].source.url.startsWith('https://') && r.evidence.some((e) => /garage door/.test(e)) && r.tests.allPassed; } },
    { id: 'compliance.hazardGate', title: 'A question that names a hazard is governed by safety law and carries controls for every hazard', test: () => { const r = processQuery('Can I swap the isolator while the string is live?', { now: 0 }); return r.tier.tier === 1 && r.hazards.includes('work on or near live conductors') && r.controls.length === r.hazards.length && r.tests.tests.find((t) => t.testId === 480).passed; } },
    { id: 'compliance.competencyRefusal', title: 'Beyond the envelope (read from the question or the context) the engine refuses with a court-safe refusal instead of an answer', test: () => { const r = processQuery('Design the string layout for the 2 MW farm', { params: { voltage: 1500 } }); const inferred = inferParams('Design the 1500 V strings for the 2 MW farm at 120 A'); return r.refused && r.refusal.type === 'COURT_SAFE_REFUSAL' && r.refusal.specificReasons.length === 2 && !r.answer && inferred.voltage === 1500 && inferred.powerKw === 2000 && inferred.current === 120 && !processQuery('How many STCs for a 6.6 kW system?').refused; } },
    { id: 'compliance.dnspEvidence', title: 'A network question with a DNSP in context cites that operator\'s allowance', test: () => { const r = processQuery('What export limit applies on single phase?', { dnsp: 'sapn', now: 0 }); return r.tier.tier === 3 && r.evidence.some((e) => /SA Power Networks/.test(e)) && r.citations.length === 1 && r.category === 'grid'; } },
    { id: 'compliance.as5033pass', title: 'AS/NZS 5033:2021 check runs the real calculators and passes a sound design', test: () => { const r = checkAS5033_2021(INSTALL); return r.compliant && r.checks.length === 8 && r.checks.find((c) => c.id === 'array_voltage').status === 'pass' && r.checks.find((c) => c.id === 'cable_current').status === 'pass' && r.checks.find((c) => c.id === 'arc_detection').status === 'advisory' && r.recommendations.length === 1 && /4\.2 – Array maximum voltage/.test(r.checks[0].citation); } },
    { id: 'compliance.as5033fail', title: 'Over-voltage strings, thin cable, a missing isolator and unlisted inverters fail with fixes', test: () => { const r = checkAS5033_2021({ ...INSTALL, modulesPerString: 24, cableRatingA: 15, dcIsolatorAtInverter: false, inverters: [{ model: 'X' }], labelsFitted: 2 }); const ids = r.checks.filter((c) => c.status === 'fail').map((c) => c.id); return !r.compliant && ids.includes('array_voltage') && ids.includes('cable_current') && ids.includes('dc_isolation') && ids.includes('inverter_standard') && ids.includes('labels') && r.recommendations.some((x) => /Reduce the string to \d+ modules/.test(x)) && r.criticalIssues.length === 5; } },
    { id: 'compliance.catalogue', title: 'The function catalogue is honest: reserved slots versus functions that exist', test: () => { const c = catalogue(); return c.reserved === 500 && c.domains.length === 7 && c.implemented > 50 && c.implemented < 100 && c.coveragePct === Math.round((c.implemented / 500) * 100) && c.domains.find((d) => d.id === 'critical').count === 5; } },
    { id: 'compliance.health', title: 'System health lists the engines, coverage, crew and the compliance score with a sub-95 % alert', test: () => { const h = systemHealth({ crew: 6, selfTest: { passed: 700, total: 731 }, llmConfigured: false }); const ok = systemHealth({ crew: 6, selfTest: { passed: 731, total: 731 } }); return h.engines.length === 9 && h.engines.find((e) => e.id === 'llm').status === 'standby' && h.engines.find((e) => e.id === 'library').status === 'standby' && systemHealth({ library: { booksLoaded: 3, passages: 40 } }).engines.find((e) => e.id === 'library').status === 'active' && h.minionsOperational === 6 && h.complianceScore === 96 && h.alert === null && ok.complianceScore === 100 && systemHealth({ selfTest: { passed: 600, total: 731 } }).alert !== null && tierByNumber(1).id === 'safety_law'; } }
];
