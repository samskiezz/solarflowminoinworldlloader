/** Network operators (DNSPs) by state/postcode and the connection application checklist. */
import { stateFromPostcode } from './incentives.js';

export const DNSPS = [
    { id: 'ausgrid', name: 'Ausgrid', state: 'NSW', regions: 'Sydney, Central Coast, Hunter', exportLimitKw: { 1: 5, 3: 15 }, portal: 'https://www.ausgrid.com.au', notes: 'Pre-approval via Ausgrid connection portal; dynamic export options available.' },
    { id: 'endeavour', name: 'Endeavour Energy', state: 'NSW', regions: 'Western Sydney, Blue Mountains, Illawarra', exportLimitKw: { 1: 5, 3: 15 }, portal: 'https://www.endeavourenergy.com.au' },
    { id: 'essential', name: 'Essential Energy', state: 'NSW', regions: 'Regional NSW', exportLimitKw: { 1: 5, 3: 15 }, portal: 'https://www.essentialenergy.com.au' },
    { id: 'evoenergy', name: 'Evoenergy', state: 'ACT', regions: 'ACT', exportLimitKw: { 1: 5, 3: 15 }, portal: 'https://www.evoenergy.com.au' },
    { id: 'ausnet', name: 'AusNet Services', state: 'VIC', regions: 'Eastern Victoria', exportLimitKw: { 1: 5, 3: 15 }, portal: 'https://www.ausnetservices.com.au' },
    { id: 'citipower', name: 'CitiPower', state: 'VIC', regions: 'Melbourne CBD and inner suburbs', exportLimitKw: { 1: 5, 3: 15 }, portal: 'https://www.citipower.com.au' },
    { id: 'powercor', name: 'Powercor', state: 'VIC', regions: 'Western Victoria', exportLimitKw: { 1: 5, 3: 15 }, portal: 'https://www.powercor.com.au' },
    { id: 'jemena', name: 'Jemena', state: 'VIC', regions: 'North-west Melbourne', exportLimitKw: { 1: 5, 3: 15 }, portal: 'https://www.jemena.com.au' },
    { id: 'united', name: 'United Energy', state: 'VIC', regions: 'South-east Melbourne, Mornington', exportLimitKw: { 1: 5, 3: 15 }, portal: 'https://www.unitedenergy.com.au' },
    { id: 'energex', name: 'Energex', state: 'QLD', regions: 'South-east Queensland', exportLimitKw: { 1: 5, 3: 15 }, portal: 'https://www.energex.com.au', notes: 'Dynamic connections (CSIP-AUS) for larger exports; 10 kVA/phase inverter limit.' },
    { id: 'ergon', name: 'Ergon Energy', state: 'QLD', regions: 'Regional Queensland', exportLimitKw: { 1: 5, 3: 15 }, portal: 'https://www.ergon.com.au' },
    { id: 'sapn', name: 'SA Power Networks', state: 'SA', regions: 'South Australia', exportLimitKw: { 1: 5, 3: 15 }, portal: 'https://www.sapowernetworks.com.au', notes: 'Flexible exports (dynamic) up to 10 kW/phase; relevant agent / remote disconnection required.' },
    { id: 'westernpower', name: 'Western Power', state: 'WA', regions: 'South-west interconnected system', exportLimitKw: { 1: 5, 3: 5 }, portal: 'https://www.westernpower.com.au', notes: 'Emergency Solar Management for inverters ≥ 5 kW.' },
    { id: 'horizon', name: 'Horizon Power', state: 'WA', regions: 'Regional WA', exportLimitKw: { 1: 1.5, 3: 5 }, portal: 'https://www.horizonpower.com.au', notes: 'Hosting capacity limits per town.' },
    { id: 'tasnetworks', name: 'TasNetworks', state: 'TAS', regions: 'Tasmania', exportLimitKw: { 1: 10, 3: 30 }, portal: 'https://www.tasnetworks.com.au' },
    { id: 'pwc', name: 'Power and Water', state: 'NT', regions: 'Northern Territory', exportLimitKw: { 1: 5, 3: 7 }, portal: 'https://www.powerwater.com.au' }
];

export function dnspsForPostcode(postcode) {
    const state = stateFromPostcode(postcode);
    return DNSPS.filter((d) => d.state === state);
}
export function dnspById(id) { return DNSPS.find((d) => d.id === id) || null; }

export const APPLICATION_FIELDS = [
    { key: 'nmi', label: 'NMI (National Metering Identifier)', pattern: /^[A-Z0-9]{10,11}$/i, required: true, hint: '10–11 characters from the electricity bill' },
    { key: 'meterNumber', label: 'Meter number', required: true },
    { key: 'retailer', label: 'Electricity retailer', required: true },
    { key: 'phases', label: 'Supply phases', required: true },
    { key: 'inverterModel', label: 'Inverter make/model (CEC listed)', required: true },
    { key: 'inverterKw', label: 'Inverter rated a.c. capacity (kW)', required: true },
    { key: 'batteryModel', label: 'Battery make/model (if any)', required: false },
    { key: 'exportLimitKw', label: 'Requested export limit (kW)', required: true },
    { key: 'csipAus', label: 'CSIP-AUS / dynamic export capable', required: false },
    { key: 'installerAccreditation', label: 'Installer SAA accreditation', required: true },
    { key: 'electricalLicence', label: 'Electrical contractor licence', required: true }
];

export function validateApplication(values = {}, { phases = 1, dnsp = null } = {}) {
    const issues = [];
    for (const f of APPLICATION_FIELDS) {
        const v = values[f.key];
        if (f.required && (v === undefined || v === null || String(v).trim() === '')) issues.push(`${f.label} is required`);
        else if (f.pattern && v && !f.pattern.test(String(v).trim())) issues.push(`${f.label} looks invalid`);
    }
    if (dnsp && values.exportLimitKw !== undefined && values.exportLimitKw !== '') {
        const allowance = dnsp.exportLimitKw[phases] ?? dnsp.exportLimitKw[1];
        if (Number(values.exportLimitKw) > allowance) issues.push(`Requested export ${values.exportLimitKw} kW exceeds ${dnsp.name}'s basic allowance of ${allowance} kW on ${phases}-phase – expect export limiting or a negotiated connection`);
    }
    return { ok: issues.length === 0, issues };
}

export function applicationSummary(values = {}, dnsp = null) {
    return [`Connection application${dnsp ? ` – ${dnsp.name}` : ''}`, ...APPLICATION_FIELDS.map((f) => `${f.label}: ${values[f.key] ?? ''}`)].join('\n');
}

export const FEATURES = [
    { id: 'dnsp.lookup', title: 'DNSPs by postcode/state', test: () => dnspsForPostcode('2000').length === 3 && dnspsForPostcode('3000').length === 5 && dnspsForPostcode('6000')[0].id === 'westernpower' && dnspsForPostcode('0000').length === 0 },
    { id: 'dnsp.catalogue', title: 'Sixteen network operators with export allowances', test: () => DNSPS.length === 16 && DNSPS.every((d) => d.exportLimitKw[1] > 0 && d.portal.startsWith('https://')) },
    { id: 'dnsp.validate', title: 'Application validation with NMI format and export allowance', test: () => { const bad = validateApplication({ nmi: 'short' }); const ok = validateApplication({ nmi: '4001234567', meterNumber: 'M1', retailer: 'R', phases: 1, inverterModel: 'X', inverterKw: 5, exportLimitKw: 5, installerAccreditation: 'A', electricalLicence: 'L' }, { phases: 1, dnsp: dnspById('ausgrid') }); const over = validateApplication({ nmi: '4001234567', meterNumber: 'M1', retailer: 'R', phases: 1, inverterModel: 'X', inverterKw: 10, exportLimitKw: 10, installerAccreditation: 'A', electricalLicence: 'L' }, { phases: 1, dnsp: dnspById('ausgrid') }); return bad.issues.length >= 8 && ok.ok && !over.ok && /exceeds/.test(over.issues[0]); } },
    { id: 'dnsp.summary', title: 'Application summary text', test: () => applicationSummary({ nmi: '4001234567' }, dnspById('energex')).includes('Energex') && applicationSummary({}).split('\n').length === APPLICATION_FIELDS.length + 1 }
];
