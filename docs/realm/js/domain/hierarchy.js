/**
 * The six-tier regulatory hierarchy (ported from solar_compliance_engine.js):
 * every answer the Realm gives is governed by exactly one tier, the highest
 * one that applies, and carries the citations of that tier. Safety law
 * overrides everything; a manufacturer's manual never overrides a standard.
 */
import { STANDARDS, searchStandards } from './standards.js';
import { DNSPS } from './dnsp.js';

export const TIERS = [
    { tier: 1, id: 'safety_law', name: 'Safety law', priority: 'ABSOLUTE_OVERRIDE', authority: 'State and territory parliaments', examples: ['Work Health and Safety Act 2011', 'Electricity (Consumer Safety) Act 2004 (NSW)', 'Electrical Safety Act 2002 (QLD)', 'Electricity Safety Act 1998 (VIC)', 'National Construction Code'], enforceability: 'Criminal and civil penalties', colour: '#d32f2f', keywords: ['safety', 'safe', 'unsafe', 'danger', 'risk', 'hazard', 'death', 'injury', 'fire', 'shock', 'electrocut', 'live', 'arc', 'fall', 'height', 'asbestos', 'whs', 'ppe', 'isolate before'] },
    { tier: 2, id: 'standards', name: 'AS/NZS standards', priority: 'MANDATORY_TECHNICAL', authority: 'Standards Australia / Standards New Zealand', examples: ['AS/NZS 3000', 'AS/NZS 5033', 'AS/NZS 4777.1', 'AS/NZS 5139', 'AS/NZS 3008.1.1', 'AS/NZS 3017'], enforceability: 'Called up by the electrical safety regulations; non-compliance is an offence', colour: '#1976d2', keywords: ['standard', 'as/nzs', 'clause', 'specification', 'test', 'install', 'wiring', 'cable', 'isolator', 'earth', 'bonding', 'voltage', 'drop', 'rise', 'clearance', 'barrier', 'battery', 'window', 'location', 'label', 'signage', 'rcd', 'overcurrent'] },
    { tier: 3, id: 'dnsp', name: 'Network (DNSP) rules', priority: 'NETWORK_MANDATORY', authority: 'Distribution network service providers', examples: ['Ausgrid NS 194 / NS 209', 'Energex Connection Manual', 'SA Power Networks TS 129', 'Western Power ESM requirements', 'CSIP-AUS dynamic connections'], enforceability: 'Connection refused or disconnected', colour: '#388e3c', keywords: ['grid', 'connection', 'export', 'import', 'distributor', 'dnsp', 'network', 'nmi', 'meter', 'phase', 'kva', 'dynamic', 'csip', 'relevant agent', 'pre-approval', 'inverter limit'] },
    { tier: 4, id: 'cec', name: 'SAA / CEC industry guidelines', priority: 'INDUSTRY_BEST_PRACTICE', authority: 'Solar Accreditation Australia and the Clean Energy Council', examples: ['SAA Installer Code of Conduct', 'CEC Install and Supervise Guidelines', 'CEC Battery Install Guidelines', 'Approved products lists'], enforceability: 'Accreditation demerits, suspension; STC eligibility lost', colour: '#f57c00', keywords: ['accredit', 'cec', 'saa', 'guideline', 'best practice', 'approved product', 'approved list', 'supervise', 'code of conduct', 'design guideline'] },
    { tier: 5, id: 'cer', name: 'CER / SRES rules', priority: 'FINANCIAL_COMPLIANCE', authority: 'Clean Energy Regulator', examples: ['Renewable Energy (Electricity) Act 2000', 'SRES deeming and STC rules', 'Cheaper Home Batteries Program', 'Written statement / CCEW evidence'], enforceability: 'Certificates refused, clawback, financial penalties', colour: '#9c27b0', keywords: ['stc', 'rebate', 'certificate', 'deeming', 'sres', 'cer', 'claim', 'incentive', 'cheaper home batteries', 'ccew', 'written statement', 'serial', 'eligib'] },
    { tier: 6, id: 'manufacturer', name: 'Manufacturer instructions', priority: 'PRODUCT_GUIDANCE', authority: 'Equipment manufacturers', examples: ['Installation manuals', 'Datasheets', 'Clearance and mounting instructions', 'Firmware and region settings'], enforceability: 'Warranty void, product listing conditions', colour: '#607d8b', keywords: ['manual', 'datasheet', 'manufacturer', 'warranty', 'mounting', 'spacing', 'firmware', 'app', 'commission the inverter', 'model'] }
];

export const TIER_BY_ID = Object.fromEntries(TIERS.map((t) => [t.id, t]));
export function tierByNumber(n) { return TIERS.find((t) => t.tier === Number(n)) || null; }

/** Which tiers a question touches, scored by keyword hits (matched at word starts, so "STCs" hits "stc") and context flags. Highest score first, then highest tier. */
const escape = (k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const KEYWORD_RES = new Map(TIERS.map((t) => [t.id, t.keywords.map((k) => ({ k, re: new RegExp(`\\b${escape(k)}`, 'i') }))]));
export function rankTiers(query, context = {}) {
    const q = String(query || '');
    const scores = TIERS.map((t) => {
        let score = 0; const hits = [];
        for (const { k, re } of KEYWORD_RES.get(t.id)) if (re.test(q)) { score += k.length > 6 ? 2 : 1; hits.push(k); }
        if (context.hazard && t.tier === 1) score += 3;
        if (context.standard && t.tier === 2) score += 2;
        if (context.dnsp && t.tier === 3) score += 2;
        if (context.incentive && t.tier === 5) score += 2;
        if (context.product && t.tier === 6) score += 1;
        return { ...t, score, hits };
    });
    return scores.filter((t) => t.score > 0).sort((a, b) => b.score - a.score || a.tier - b.tier);
}

/**
 * The governing tier: of every tier the question clearly touches (two or more hits, or the single best match), the highest one governs.
 * That is the hierarchy's whole point: safety law outranks a standard that outranks a network rule, however many words each matched.
 * Nothing matched defaults to the standards tier, which is where most installation questions live.
 */
export function governingTier(query, context = {}) {
    const ranked = rankTiers(query, context);
    if (!ranked.length) return { ...TIERS[1], score: 0, hits: [], reason: 'No tier keywords matched; AS/NZS standards govern installation questions by default.' };
    const top = ranked[0].score;
    const contenders = ranked.filter((r) => r.score >= 2 || r.score >= top);
    const winner = [...contenders].sort((a, b) => a.tier - b.tier)[0];
    return { ...winner, reason: contenders.length > 1 ? `${contenders.map((c) => c.name).join(' and ')} all apply; the higher tier (${winner.name}) governs.` : `${winner.name} governs this question.` };
}

/** Citations for a tier: standards come from the Codex, networks from the DNSP register, the rest are the register entries. */
export function citationsForTier(tier, { query = '', dnspId = null } = {}) {
    const t = typeof tier === 'object' ? tier : tierByNumber(tier);
    if (!t) return [];
    if (t.tier === 2) {
        const hits = query ? searchStandards(query).slice(0, 4).map((h) => `${h.standard} Cl ${h.ref} – ${h.title}`) : [];
        return hits.length ? hits : STANDARDS.slice(0, 5).map((s) => `${s.code} – ${s.title}`);
    }
    if (t.tier === 3) {
        const list = dnspId ? DNSPS.filter((d) => d.id === dnspId) : DNSPS.slice(0, 4);
        return list.map((d) => `${d.name} connection requirements (${d.state}): export ${d.exportLimitKw[1]} kW single-phase / ${d.exportLimitKw[3]} kW three-phase${d.notes ? ` – ${d.notes}` : ''}`);
    }
    return t.examples.slice();
}

/** The regulatory basis sentence used in every answer and report. */
export function regulatoryBasis(tier, citations = []) {
    const t = typeof tier === 'object' ? tier : tierByNumber(tier);
    if (!t) return '';
    return `Governed by tier ${t.tier} (${t.name}; ${t.authority}). Enforceable by: ${t.enforceability}.${citations.length ? ` Authorities: ${citations.join('; ')}.` : ''}`;
}

/** When two sources disagree the higher tier wins; returns the winning source and why. */
export function precedence(a, b) {
    const ta = tierByNumber(a.tier); const tb = tierByNumber(b.tier);
    if (!ta || !tb) return null;
    const winner = ta.tier <= tb.tier ? a : b; const loser = winner === a ? b : a;
    return { winner, loser, reason: `${tierByNumber(winner.tier).name} (tier ${winner.tier}) overrides ${tierByNumber(loser.tier).name} (tier ${loser.tier})${winner.tier === 1 ? ' – safety law is absolute' : ''}.` };
}

/** Full citation record for a query: tier, citations, basis, conservative-default flag. */
export function autoCite(query, context = {}) {
    const tier = governingTier(query, context);
    const citations = citationsForTier(tier, { query, dnspId: context.dnsp || null });
    const also = rankTiers(query, context).filter((t) => t.tier !== tier.tier).map((t) => ({ tier: t.tier, name: t.name }));
    return { query, tier: { tier: tier.tier, id: tier.id, name: tier.name, colour: tier.colour, priority: tier.priority }, reason: tier.reason, citations, alsoApplies: also, basis: regulatoryBasis(tier, citations), conservativeDefault: tier.tier <= 2, timestamp: context.now ? new Date(context.now).toISOString() : null };
}

export const FEATURES = [
    { id: 'hierarchy.tiers', title: 'Six regulatory tiers from safety law down to manufacturer instructions', test: () => TIERS.length === 6 && TIERS[0].priority === 'ABSOLUTE_OVERRIDE' && TIERS[5].id === 'manufacturer' && TIERS.every((t) => t.keywords.length >= 8 && t.examples.length >= 3) },
    { id: 'hierarchy.governing', title: 'A question is governed by the highest tier that applies', test: () => governingTier('Is it safe to work on a live DC string?').tier === 1 && governingTier('What is the voltage rise limit at the inverter?').tier === 2 && governingTier('What export limit will the distributor allow on single phase?').tier === 3 && governingTier('How many STCs for a 6.6 kW system?').tier === 5 && governingTier('What mounting spacing does the manual require?').tier === 6 && governingTier('hello').tier === 2 },
    { id: 'hierarchy.safetyWins', title: 'When safety and a standard both apply, safety law governs', test: () => { const g = governingTier('fire risk from the DC isolator wiring standard'); return g.tier === 1 && /higher tier/.test(g.reason); } },
    { id: 'hierarchy.citations', title: 'Citations come from the Codex for standards and the DNSP register for networks', test: () => citationsForTier(2, { query: 'voltage rise' }).some((c) => /4777\.1.*3\.3/.test(c)) && citationsForTier(3, { dnspId: 'sapn' }).length === 1 && /SA Power Networks/.test(citationsForTier(3, { dnspId: 'sapn' })[0]) && citationsForTier(5).length >= 3 },
    { id: 'hierarchy.precedence', title: 'Precedence between conflicting sources: the higher tier overrides', test: () => { const p = precedence({ tier: 6, text: 'Manual says 100 mm clearance' }, { tier: 2, text: 'AS/NZS 5139 says 600 mm' }); return p.winner.tier === 2 && /overrides/.test(p.reason); } },
    { id: 'hierarchy.autoCite', title: 'Auto-citation record with basis sentence and the other tiers that apply', test: () => { const c = autoCite('Can the battery go near the window and still claim the rebate?', { now: 0 }); return c.tier.tier === 2 && c.citations.length >= 1 && c.alsoApplies.some((t) => t.tier === 5) && /Governed by tier 2/.test(c.basis) && c.conservativeDefault === true; } }
];
