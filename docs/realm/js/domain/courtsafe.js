/**
 * Court-safe framework (ported from court_safe_framework.js): every decision
 * the Realm hands out is run through the five defensibility tests (479–483),
 * rewritten in court-safe language, wrapped in legal framing and a
 * professional disclaimer, and shipped with a conservative alternative and a
 * defensibility package. Scoring is deterministic so the same decision always
 * gets the same verdict.
 */
import { tierByNumber } from './hierarchy.js';

export const VERSION = '2.9.0';

/** The five critical tests, numbered as in the original framework. */
export const DEFENSIBILITY_TESTS = [
    { id: 479, key: 'personal', name: 'Personal accountability', question: 'Would I personally accept this risk?', threshold: 0.8, criteria: ['Personal safety standards', 'Family safety acceptance', 'Professional reputation', 'Ethical comfort level'] },
    { id: 480, key: 'coroner', name: 'Coroner scrutiny', question: 'Would a coroner accept this decision?', threshold: 0.95, criteria: ['Death investigation standards', 'Public safety priority', 'Professional duty of care', 'Preventable risk assessment'] },
    { id: 481, key: 'regulator', name: 'Regulator compliance', question: 'Would Fair Trading / the ACCC accept this?', threshold: 0.9, criteria: ['Consumer protection laws', 'Misleading conduct prevention', 'Professional standards', 'Market competition rules'] },
    { id: 482, key: 'judicial', name: 'Judicial defensibility', question: 'Would a judge accept this reasoning?', threshold: 0.85, criteria: ['Logical reasoning chain', 'Evidence-based conclusions', 'Professional standard of care', 'Reasonable person test'] },
    { id: 483, key: 'insurer', name: 'Insurer acceptability', question: 'Would an insurer accept this risk profile?', threshold: 0.75, criteria: ['Actuarial risk assessment', 'Claims prevention focus', 'Industry best practice', 'Loss minimisation'] }
];

export const LEGAL_FRAMEWORKS = {
    evidenceStandards: { burden: 'balance of probabilities (civil standard)', documentation: 'contemporaneous records', witness: 'expert testimony', standard: 'reasonable professional' },
    liabilityPrevention: { disclaimers: 'comprehensive risk warnings', limitations: 'scope of advice clearly defined', referrals: 'professional consultation required', insurance: 'professional indemnity coverage' },
    regulatoryCompliance: { hierarchy: 'six-tier precedence', citations: 'mandatory authority reference', updates: 'current standards only', verification: 'independent validation' },
    ethicalFramework: { transparency: 'full disclosure of limitations', competence: 'within scope of expertise', honesty: 'acknowledge uncertainties', accountability: 'traceable decision process' }
};

export const CONSERVATIVE_DEFAULTS = {
    safety: { principle: 'safety first, absolute', approach: 'most restrictive interpretation', fallback: 'professional consultation required' },
    compliance: { principle: 'highest tier governs', approach: 'strictest standard applies', fallback: 'await regulatory clarification' },
    audit: { principle: 'audit survivability', approach: 'comprehensive documentation', fallback: 'independent verification' },
    performance: { principle: 'guaranteed minimums only', approach: 'conservative estimates', fallback: 'professional design required' }
};

const ABSOLUTE_WORDS = /\b(guaranteed|always|never|impossible|certain|100 ?%|no risk|risk[- ]free|cannot fail)\b/i;
const CONSUMER_CLAIM_WORDS = /\b(guaranteed|free|best|cheapest|no risk|risk[- ]free|100 ?%|zero bills?|never pay)\b/i;

const r2 = (x) => Math.round(x * 100) / 100;
const clamp01 = (x) => Math.max(0, Math.min(1, x));

/** Normalise a decision record so every scorer sees the same shape. */
export function normaliseDecision(d = {}) {
    const text = typeof d === 'string' ? d : String(d.text || '');
    const o = typeof d === 'string' ? {} : d;
    return {
        text, tier: Number(o.tier) || null, citations: o.citations || [], hazards: o.hazards || [], controls: o.controls || [], assumptions: o.assumptions || [], evidence: o.evidence || [],
        safetyMargin: Number.isFinite(Number(o.safetyMargin)) ? Number(o.safetyMargin) : 0, verifiedBy: o.verifiedBy || null, scope: o.scope || 'within', performanceClaim: Boolean(o.performanceClaim), estimateLabelled: o.estimateLabelled !== false
    };
}

function uncontrolled(d) { return Math.max(0, d.hazards.length - d.controls.length); }

/** Test 479. */
export function personalAcceptability(decision) {
    const d = normaliseDecision(decision); const why = [];
    let score = 0.5;
    if (!uncontrolled(d)) { score += 0.2; why.push('every identified hazard has a control'); } else why.push(`${uncontrolled(d)} hazard(s) without a control`);
    if (d.safetyMargin >= 0.1) { score += 0.15; why.push('safety margin of at least 10 %'); } else why.push('no meaningful safety margin');
    if (!ABSOLUTE_WORDS.test(d.text)) { score += 0.15; why.push('no absolute promises'); } else why.push('contains absolute language');
    if (d.scope !== 'within') { score -= 0.3; why.push('outside the stated scope of competence'); }
    return result(479, clamp01(score), why);
}
/** Test 480: the strictest – one uncontrolled hazard is a fail. */
export function coronerScrutiny(decision) {
    const d = normaliseDecision(decision); const why = []; let score = 1;
    const u = uncontrolled(d); if (u) { score -= 0.5 * u; why.push(`${u} uncontrolled hazard(s): a coroner asks why it was not controlled`); }
    if (!d.citations.length) { score -= 0.2; why.push('no authority cited'); }
    if (ABSOLUTE_WORDS.test(d.text)) { score -= 0.1; why.push('absolute language invites scrutiny'); }
    if (d.scope !== 'within') { score -= 0.3; why.push('decision made outside competence'); }
    if (d.safetyMargin < 0.05) { score -= 0.1; why.push('no safety margin'); }
    if (!why.length) why.push('hazards controlled, authority cited, margin applied');
    return result(480, clamp01(score), why);
}
/** Test 481: consumer-law exposure. */
export function regulatorCompliance(decision) {
    const d = normaliseDecision(decision); const why = []; let score = 1;
    const claims = (d.text.match(new RegExp(CONSUMER_CLAIM_WORDS.source, 'gi')) || []);
    if (claims.length) { score -= 0.3 * claims.length; why.push(`misleading-conduct risk: ${[...new Set(claims.map((c) => c.toLowerCase()))].join(', ')}`); }
    if (d.performanceClaim && !d.estimateLabelled) { score -= 0.2; why.push('performance figure not labelled as an estimate'); }
    if (!d.citations.length) { score -= 0.1; why.push('no authority cited'); }
    if (!why.length) why.push('no unqualified claims; estimates labelled');
    return result(481, clamp01(score), why);
}
/** Test 482: the reasoning chain. */
export function judicialDefensibility(decision) {
    const d = normaliseDecision(decision); const why = []; let score = 0;
    if (d.evidence.length) { score += 0.3; why.push('conclusion rests on evidence'); } else why.push('no evidence recorded');
    if (d.citations.length) { score += 0.3; why.push('authority cited'); } else why.push('no authority cited');
    if (d.assumptions.length) { score += 0.2; why.push('assumptions stated'); } else why.push('assumptions not stated');
    if (d.text.trim().length >= 40) { score += 0.1; why.push('reasoning written out'); } else why.push('reasoning too thin');
    if (d.scope === 'within') { score += 0.1; } else why.push('outside competence');
    return result(482, clamp01(score), why);
}
/** Test 483: insurability. */
export function insurerAcceptability(decision) {
    const d = normaliseDecision(decision); const why = []; let score = 1;
    const u = uncontrolled(d); if (u) { score -= 0.3 * u; why.push(`${u} uncontrolled hazard(s) raise the claims risk`); }
    if (!d.verifiedBy) { score -= 0.15; why.push('not independently verified'); }
    if (d.scope !== 'within') { score -= 0.3; why.push('outside competence'); }
    if (d.safetyMargin < 0.05) { score -= 0.1; why.push('no safety margin'); }
    if (!d.citations.length) { score -= 0.1; why.push('no authority cited'); }
    if (!why.length) why.push('controlled, verified, within scope');
    return result(483, clamp01(score), why);
}

function result(id, score, reasoning) {
    const t = DEFENSIBILITY_TESTS.find((x) => x.id === id);
    return { testId: id, key: t.key, name: t.name, question: t.question, threshold: t.threshold, score: r2(score), passed: score >= t.threshold, reasoning };
}

/** All five tests on one decision. */
export function fiveTests(decision) {
    const tests = [personalAcceptability(decision), coronerScrutiny(decision), regulatorCompliance(decision), judicialDefensibility(decision), insurerAcceptability(decision)];
    const failed = tests.filter((t) => !t.passed);
    return { allPassed: failed.length === 0, tests, failed, score: r2(tests.reduce((n, t) => n + t.score, 0) / tests.length) };
}

/** Word substitutions that turn an absolute statement into a defensible one. Applied in one pass so nothing is rewritten twice. */
export const LANGUAGE_MAP = {
    must: 'should typically', will: 'may', always: 'generally', never: 'is typically not recommended to', guaranteed: 'expected under normal conditions', impossible: 'highly unlikely', certain: 'probable',
    safe: 'considered safe when properly installed', compliant: 'appears to comply based on the available information', approved: 'appears to meet the standard requirements',
    recommend: 'suggest, subject to professional verification', should: 'may be appropriate, pending professional assessment', can: 'may be possible, subject to specific conditions'
};
const LANGUAGE_RE = new RegExp(`\\b(${Object.keys(LANGUAGE_MAP).sort((a, b) => b.length - a.length).join('|')})\\b`, 'gi');
export function courtSafeLanguage(text) {
    if (typeof text !== 'string') return text;
    return text.replace(LANGUAGE_RE, (m) => { const out = LANGUAGE_MAP[m.toLowerCase()]; return m[0] === m[0].toUpperCase() && m[0] !== m[0].toLowerCase() ? out[0].toUpperCase() + out.slice(1) : out; });
}

export function legalFraming({ now = null } = {}) {
    return {
        scope: 'This analysis is provided for general information purposes only.',
        limitations: 'Professional consultation is required for specific applications.',
        liability: 'No warranty or guarantee is provided for accuracy or completeness.',
        jurisdiction: 'Based on Australian regulations; state, territory and network variations may apply.',
        currency: `Information current as at ${new Date(now ?? Date.now()).toISOString().slice(0, 10)}.`,
        updates: 'Subject to regulatory changes and technical developments.',
        verification: 'Independent verification is recommended before implementation.'
    };
}

export const DISCLAIMER_SPECIFIC = {
    design: 'System designs produced here are preliminary; a licensed designer must confirm string sizing, cable selection and protection before installation.',
    install: 'Installation work must be carried out by a licensed electrician holding the relevant accreditation; nothing here authorises unlicensed work.',
    battery: 'Battery locations and clearances must be confirmed on site against AS/NZS 5139 and the manufacturer\'s instructions before installation.',
    grid: 'Network connection conditions are set by the distributor; its current connection standard prevails over any allowance stated here.',
    incentive: 'Certificate and rebate figures are estimates; eligibility is decided by the Clean Energy Regulator and the registered agent at the time of claim.',
    general: 'Technical figures are indicative and depend on site conditions that have not been verified.'
};
export function professionalDisclaimer(category = 'general') {
    return {
        general: 'This information is provided for educational purposes only and does not constitute professional advice.',
        specific: DISCLAIMER_SPECIFIC[category] || DISCLAIMER_SPECIFIC.general,
        professional: 'Licensed electrical professionals should be consulted for all installation and compliance matters.',
        regulatory: 'Compliance with current local regulations and standards is required.',
        liability: 'No liability is accepted for decisions made on the basis of this information.',
        verification: 'Independent verification of all technical specifications is recommended.',
        currency: 'Information is subject to change without notice as regulations are updated.'
    };
}

export function conservativeAlternative(decision) {
    const d = normaliseDecision(decision);
    const recs = ['Seek a licensed electrical professional\'s assessment', 'Obtain independent compliance verification', 'Apply additional safety margins', 'Confirm the distributor\'s and local authority\'s requirements'];
    if (d.hazards.length) recs.unshift(`Control every identified hazard first: ${d.hazards.join('; ')}`);
    if (d.tier && d.tier > 2) recs.push(`Treat the ${tierByNumber(d.tier)?.name || 'applicable'} requirement as a floor, not a ceiling; the AS/NZS standard still governs the installation`);
    return {
        approach: 'most conservative interpretation', reasoning: 'Applied the highest safety margins and the strictest compliance interpretation.',
        recommendations: recs,
        disclaimers: ['A conservative approach prioritises safety over optimisation', 'It may cost more or perform less than an optimised design', 'A professional assessment may identify a better solution', 'Local conditions may permit alternative approaches'],
        professionalReferral: d.tier === 1 ? 'Electrical safety regulator / licensed electrician' : d.tier === 3 ? 'Distribution network service provider' : d.tier === 5 ? 'Registered agent / Clean Energy Regulator' : 'Licensed electrician or accredited designer'
    };
}

export function defensibilityPackage(decision, tests = fiveTests(decision), { now = null } = {}) {
    const d = normaliseDecision(decision);
    const tier = d.tier ? tierByNumber(d.tier) : null;
    return {
        evidenceBasis: d.evidence.length ? d.evidence : ['No evidence recorded – the decision rests on the question as asked'],
        regulatoryCitations: d.citations,
        professionalStandards: tier ? `${tier.name} (${tier.authority})` : 'Not tied to a regulatory tier',
        riskAssessment: { hazards: d.hazards, controls: d.controls, uncontrolled: uncontrolled(d), safetyMargin: d.safetyMargin },
        alternativeAnalysis: conservativeAlternative(d),
        expertOpinion: 'Reasonable, competent practitioner applying the governing tier and the cited authorities',
        auditTrail: { timestamp: new Date(now ?? Date.now()).toISOString(), tests: tests.tests.map((t) => ({ id: t.testId, score: t.score, passed: t.passed })), allPassed: tests.allPassed, frameworkVersion: VERSION },
        qualityAssurance: { assumptionsStated: d.assumptions.length > 0, verifiedBy: d.verifiedBy, scope: d.scope }
    };
}

/** Parameters that put a question beyond what the Realm will answer on its own. */
export function exceedsCompetency(p = {}) {
    const reasons = [];
    const voltage = Number(p.voltage ?? p.voltageV); const current = Number(p.current ?? p.currentA); const powerW = Number(p.power ?? p.powerW ?? (p.powerKw != null ? Number(p.powerKw) * 1000 : NaN));
    if (voltage > 1000) reasons.push(`${voltage} V exceeds the 1000 V d.c. envelope`);
    if (current > 100) reasons.push(`${current} A exceeds the 100 A envelope`);
    if (powerW > 100000) reasons.push(`${Math.round(powerW / 1000)} kW exceeds the 100 kW envelope`);
    if (String(p.complexity || '').toLowerCase() === 'high') reasons.push('complexity flagged as high');
    return { exceeds: reasons.length > 0, reasons };
}

export function courtSafeRefusal(reasons, { category = 'general', tier = null } = {}) {
    return {
        type: 'COURT_SAFE_REFUSAL', refused: true, reason: 'Decision withheld by the court-safe framework', specificReasons: reasons, recommendedAction: 'Professional consultation required',
        conservativeGuidance: conservativeAlternative({ tier }), disclaimer: professionalDisclaimer(category),
        legalFraming: { disclaimer: 'This refusal prioritises safety and legal compliance', liability: 'No liability is accepted for information withheld for safety reasons', alternatives: 'A professional assessment may enable alternative approaches' }
    };
}

/** The whole pipeline for one decision: tests, framing, package and a verdict. */
export function assessDecision(decision, { now = null, category = 'general', params = null } = {}) {
    const d = normaliseDecision(decision);
    const competency = exceedsCompetency(params || {});
    if (competency.exceeds) return { verdict: 'refused', decision: d, refusal: courtSafeRefusal(competency.reasons, { category, tier: d.tier }), tests: null, timestamp: new Date(now ?? Date.now()).toISOString() };
    const tests = fiveTests(d);
    const coroner = tests.tests.find((t) => t.testId === 480).passed;
    const verdict = tests.allPassed ? 'defensible' : (!coroner || tests.failed.length >= 3) ? 'refused' : 'conditional';
    return {
        verdict, decision: d, tests,
        courtSafeText: courtSafeLanguage(d.text), legalFraming: legalFraming({ now }), disclaimer: professionalDisclaimer(category),
        conservativeAlternative: conservativeAlternative(d), package: defensibilityPackage(d, tests, { now }),
        refusal: verdict === 'refused' ? courtSafeRefusal(tests.failed.map((t) => `${t.name}: ${t.reasoning.join('; ')}`), { category, tier: d.tier }) : null,
        timestamp: new Date(now ?? Date.now()).toISOString(), frameworkVersion: VERSION
    };
}

const GOOD = { text: 'The d.c. isolator is fitted at the inverter and the array voltage stays within the 1000 V domestic limit, so the design appears to comply.', tier: 2, citations: ['AS/NZS 5033:2021 Cl 4.2'], hazards: ['live d.c. conductors'], controls: ['isolate before work'], assumptions: ['datasheet values are correct'], evidence: ['array Voc at −5 °C = 520 V'], safetyMargin: 0.1, verifiedBy: 'designer' };
export const FEATURES = [
    { id: 'courtsafe.tests', title: 'The five defensibility tests 479–483 with their thresholds', test: () => DEFENSIBILITY_TESTS.length === 5 && DEFENSIBILITY_TESTS[0].id === 479 && DEFENSIBILITY_TESTS[4].id === 483 && DEFENSIBILITY_TESTS[1].threshold === 0.95 && DEFENSIBILITY_TESTS.every((t) => t.criteria.length === 4) },
    { id: 'courtsafe.allPass', title: 'A controlled, cited, verified decision passes all five tests', test: () => { const r = fiveTests(GOOD); return r.allPassed && r.tests.length === 5 && r.score >= 0.95; } },
    { id: 'courtsafe.coronerFails', title: 'One uncontrolled hazard fails the coroner test and the decision is refused; a soft failure is conditional', test: () => { const r = assessDecision({ ...GOOD, controls: [] }); const soft = assessDecision({ ...GOOD, verifiedBy: null, assumptions: [] }); return r.verdict === 'refused' && r.refusal && r.tests.failed.some((t) => t.testId === 480) && r.tests.tests.find((t) => t.testId === 480).score === 0.5 && soft.verdict === 'conditional' && soft.tests.failed.length === 1 && soft.tests.failed[0].testId === 482 && soft.refusal === null; } },
    { id: 'courtsafe.regulator', title: 'Unqualified consumer claims fail the regulator test', test: () => { const t = regulatorCompliance({ ...GOOD, text: 'Guaranteed zero bills, the best system, no risk.' }); return !t.passed && /misleading/.test(t.reasoning[0]); } },
    { id: 'courtsafe.judicial', title: 'Reasoning without evidence or assumptions fails the judicial test', test: () => { const t = judicialDefensibility({ text: 'Fine.', tier: 2 }); const g = judicialDefensibility(GOOD); return !t.passed && t.score === 0.1 && g.passed && g.score === 1; } },
    { id: 'courtsafe.language', title: 'Court-safe language rewrites absolutes once, keeping capitalisation', test: () => { const out = courtSafeLanguage('Must isolate. This is safe and will work.'); return out === 'Should typically isolate. This is considered safe when properly installed and may work.' && courtSafeLanguage(42) === 42; } },
    { id: 'courtsafe.competency', title: 'Questions beyond the envelope are refused with conservative guidance', test: () => { const c = exceedsCompetency({ voltage: 1500, powerKw: 250 }); const r = assessDecision(GOOD, { params: { voltage: 1500 } }); return c.exceeds && c.reasons.length === 2 && r.verdict === 'refused' && r.refusal.type === 'COURT_SAFE_REFUSAL' && r.refusal.conservativeGuidance.recommendations.length >= 4 && !exceedsCompetency({ voltage: 600 }).exceeds; } },
    { id: 'courtsafe.package', title: 'Defensibility package with evidence, citations, risk assessment, audit trail and disclaimers', test: () => { const r = assessDecision(GOOD, { now: 0, category: 'battery' }); const p = r.package; return r.verdict === 'defensible' && p.regulatoryCitations.length === 1 && p.riskAssessment.uncontrolled === 0 && p.auditTrail.timestamp === '1970-01-01T00:00:00.000Z' && p.auditTrail.tests.length === 5 && /5139/.test(r.disclaimer.specific) && /1970-01-01/.test(r.legalFraming.currency) && r.conservativeAlternative.recommendations[0].startsWith('Control every'); } }
];
