/**
 * Jurisdiction profiles: the numbers that differ between markets live here,
 * not in code, so a new region is a data task. AU/NZ are complete; UK, US and
 * EU carry reference limits and the standards to consult.
 */

export const JURISDICTIONS = {
    AU: {
        id: 'AU', name: 'Australia', currency: 'AUD', voltage: { singlePhase: 230, threePhase: 400, frequency: 50 },
        standards: ['AS/NZS 3000:2018', 'AS/NZS 5033:2021', 'AS/NZS 4777.1:2024', 'AS/NZS 4777.2:2020', 'AS/NZS 5139:2019', 'AS/NZS 3008.1.1:2025', 'AS/NZS 3017:2022'],
        limits: { voltageRisePct: 2, voltageDropPct: 5, dcVoltageDropPct: 3, domesticArrayMaxV: 1000, commercialArrayMaxV: 1500, dcAcRatio: 1.333, singlePhaseMaxKva: 30, phaseImbalanceKva: 5 },
        incentives: ['STCs (SRES) to 2030', 'Cheaper Home Batteries Program', 'State programs'],
        accreditation: 'Solar Accreditation Australia (SAA)', productLists: 'CEC approved modules / inverters / batteries', dnspTerm: 'DNSP', complete: true
    },
    NZ: {
        id: 'NZ', name: 'New Zealand', currency: 'NZD', voltage: { singlePhase: 230, threePhase: 400, frequency: 50 },
        standards: ['AS/NZS 3000:2018', 'AS/NZS 5033:2021', 'AS/NZS 4777.1:2024', 'AS/NZS 4777.2:2020', 'AS/NZS 5139:2019', 'AS/NZS 3008.1.1:2025'],
        limits: { voltageRisePct: 2, voltageDropPct: 5, dcVoltageDropPct: 3, domesticArrayMaxV: 1000, commercialArrayMaxV: 1500, dcAcRatio: 1.333, singlePhaseMaxKva: 30, phaseImbalanceKva: 5 },
        incentives: ['No national certificate scheme; retailer buy-back rates'], accreditation: 'SEANZ / Electrical Workers Registration Board', productLists: 'None mandated (use CEC lists as reference)', dnspTerm: 'EDB', complete: true
    },
    UK: {
        id: 'UK', name: 'United Kingdom', currency: 'GBP', voltage: { singlePhase: 230, threePhase: 400, frequency: 50 },
        standards: ['BS 7671:2018+A2:2022 Section 712', 'BS EN 62446-1', 'MCS 001 / MIS 3002', 'ENA EREC G98 / G99', 'IET Code of Practice for EESS'],
        limits: { voltageRisePct: null, voltageDropPct: 3, dcVoltageDropPct: 3, domesticArrayMaxV: 1000, commercialArrayMaxV: 1500, dcAcRatio: null, singlePhaseMaxKva: 3.68, phaseImbalanceKva: 3.68 },
        incentives: ['Smart Export Guarantee (SEG)', '0 % VAT on domestic solar/batteries'], accreditation: 'MCS certified installer', productLists: 'MCS certified products', dnspTerm: 'DNO', complete: false
    },
    US: {
        id: 'US', name: 'United States', currency: 'USD', voltage: { singlePhase: 240, threePhase: 480, frequency: 60 },
        standards: ['NEC Article 690 (PV)', 'NEC Article 705 (interconnection)', 'NEC 706 (ESS)', 'UL 1741 / IEEE 1547', 'NFPA 855'],
        limits: { voltageRisePct: null, voltageDropPct: 5, dcVoltageDropPct: 3, domesticArrayMaxV: 600, commercialArrayMaxV: 1500, dcAcRatio: null, singlePhaseMaxKva: null, phaseImbalanceKva: null },
        incentives: ['Federal ITC (check current rate)', 'State / utility programs'], accreditation: 'NABCEP certification; state electrical licence', productLists: 'UL listing; CEC (California) eligible equipment list', dnspTerm: 'utility', complete: false
    },
    EU: {
        id: 'EU', name: 'European Union', currency: 'EUR', voltage: { singlePhase: 230, threePhase: 400, frequency: 50 },
        standards: ['IEC 60364-7-712', 'IEC 62446-1', 'EN 50549-1', 'IEC 62109', 'IEC 62933 (ESS)'],
        limits: { voltageRisePct: null, voltageDropPct: 3, dcVoltageDropPct: 3, domesticArrayMaxV: 1000, commercialArrayMaxV: 1500, dcAcRatio: null, singlePhaseMaxKva: 4.6, phaseImbalanceKva: 4.6 },
        incentives: ['Member-state schemes'], accreditation: 'National electrical licensing', productLists: 'CE / national lists', dnspTerm: 'DSO', complete: false
    }
};

export function jurisdiction(id = 'AU') {
    return JURISDICTIONS[String(id).toUpperCase()] || JURISDICTIONS.AU;
}

export function limit(id, key) {
    const j = jurisdiction(id);
    return j.limits[key] ?? null;
}

export function listJurisdictions() {
    return Object.values(JURISDICTIONS).map((j) => ({ id: j.id, name: j.name, complete: j.complete }));
}

export const FEATURES = [
    { id: 'jurisdictions.catalogue', title: 'Jurisdiction profiles (AU, NZ, UK, US, EU)', test: () => listJurisdictions().length === 5 && jurisdiction('AU').complete },
    { id: 'jurisdictions.limit', title: 'Jurisdiction limit lookup', test: () => limit('AU', 'voltageRisePct') === 2 && limit('US', 'domesticArrayMaxV') === 600 && limit('ZZ', 'voltageRisePct') === 2 },
    { id: 'jurisdictions.standards', title: 'Standards per jurisdiction', test: () => jurisdiction('UK').standards.some((s) => s.includes('BS 7671')) }
];
