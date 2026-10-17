/**
 * Document and data pipeline (ported from australian-solar-pipeline.js and
 * australian_data_processor.js): classify the documents a job or a product
 * carries, queue them by priority, index the product catalogue as a knowledge
 * base the crew can query in plain words, and validate a system record
 * against every tier of the regulatory hierarchy with the Realm's own limits.
 */
import { systemVoltageLimit } from './pv.js';
import { DNSPS, dnspById } from './dnsp.js';
import { tierByNumber } from './hierarchy.js';
import { CLEARANCE_MM } from './battery.js';

/** Every document type the pipeline knows: product literature plus the job-pack documents the Drive importer expects. */
export const DOC_TYPES = [
    { id: 'installation_manual', label: 'Installation manual', group: 'product', credits: 45, difficulty: 'medium', re: /install(?:ation)? (?:manual|guide|instructions)|mounting (?:guide|instructions)/i },
    { id: 'spec_sheet', label: 'Specification sheet', group: 'product', credits: 25, difficulty: 'easy', re: /spec(?:ification)?s?[ _-]?sheet|datasheet|data sheet|technical data/i },
    { id: 'user_manual', label: 'User manual', group: 'product', credits: 20, difficulty: 'easy', re: /user (?:manual|guide)|owner'?s? (?:manual|guide)|operating (?:manual|instructions)/i },
    { id: 'warranty', label: 'Warranty document', group: 'product', credits: 15, difficulty: 'easy', re: /warrant/i },
    { id: 'listing', label: 'CEC / CER product listing', group: 'product', credits: 35, difficulty: 'medium', re: /cec list|approved product|product listing|cer (?:approved|listing)|iec 61215|iec 62109/i },
    { id: 'ccew', label: 'Certificate of Compliance Electrical Work', group: 'job', credits: 55, difficulty: 'hard', re: /ccew|certificate of compliance|compliance cert|ces\b/i },
    { id: 'commissioning', label: 'Commissioning / test sheet', group: 'job', credits: 55, difficulty: 'hard', re: /commission|test (?:sheet|result)|inspection report/i },
    { id: 'stc', label: 'STC assignment form', group: 'job', credits: 35, difficulty: 'medium', re: /\bstc\b|assignment form|small[- ]scale/i },
    { id: 'dnsp', label: 'Network connection approval', group: 'job', credits: 35, difficulty: 'medium', re: /dnsp|network approval|connection approval|permission to connect|ausgrid|energex|sapn|endeavour|essential energy/i },
    { id: 'sld', label: 'Single line / wiring diagram', group: 'job', credits: 45, difficulty: 'medium', re: /single line|\bsld\b|wiring diagram|schematic/i },
    { id: 'photos', label: 'Installation photos', group: 'job', credits: 10, difficulty: 'easy', re: /photo|img_|\.jpe?g$|\.heic$|\.png$/i },
    { id: 'invoice', label: 'Invoice / quote', group: 'job', credits: 15, difficulty: 'easy', re: /invoice|receipt|\binv-|quote|proposal/i },
    { id: 'safety', label: 'Shutdown procedure / labels', group: 'job', credits: 20, difficulty: 'easy', re: /shutdown|safety|label|swms/i },
    { id: 'standard', label: 'Standard / regulation extract', group: 'reference', credits: 75, difficulty: 'hard', re: /as[ /]?nzs|\bas ?\d{4}\b|wiring rules|standard|regulation|code of practice/i },
    { id: 'other', label: 'Other', group: 'other', credits: 10, difficulty: 'easy', re: /./ }
];
export const DOC_TYPE_BY_ID = Object.fromEntries(DOC_TYPES.map((d) => [d.id, d]));

/** Classify a file by its name, folder and MIME type. */
export function classifyDocument({ name = '', folder = '', mimeType = '' } = {}) {
    const text = `${folder} ${name}`;
    if (/^image\//.test(mimeType)) return DOC_TYPE_BY_ID.photos;
    for (const t of DOC_TYPES) if (t.id !== 'other' && t.re.test(text)) return t;
    return DOC_TYPE_BY_ID.other;
}

export const POPULAR_BRANDS = ['Tesla', 'SolarEdge', 'Trina Solar', 'JinkoSolar', 'Fronius', 'Sungrow', 'SMA', 'Enphase', 'LONGi', 'Canadian Solar', 'Sigenergy', 'BYD', 'GoodWe', 'Huawei'];
/** Priority as in the original: manuals first, popular brands next, big modules after; compliance documents jump the queue. */
export function priority(type, product = null) {
    const t = typeof type === 'string' ? DOC_TYPE_BY_ID[type] : type;
    let p = 1;
    if (!t) return p;
    if (t.id === 'installation_manual') p += 3;
    if (t.group === 'job' && ['ccew', 'commissioning', 'dnsp', 'stc'].includes(t.id)) p += 2;
    if (t.id === 'standard') p += 2;
    if (product) {
        if (POPULAR_BRANDS.some((b) => String(product.manufacturer || '').toLowerCase().includes(b.toLowerCase()))) p += 2;
        const watts = Number(product.specifications?.power_watts ?? product.power ?? 0);
        if (watts > 400) p += 1;
    }
    return p;
}

/** Queue every document a set of products (and any loose files) needs processed, highest priority first. */
export function buildQueue({ products = [], files = [], types = ['installation_manual', 'spec_sheet', 'user_manual'] } = {}) {
    const tasks = [];
    for (const product of products) for (const id of types) tasks.push({ id: `${product.id}_${id}`, productId: product.id, product: `${product.manufacturer} ${product.model}`, type: id, label: DOC_TYPE_BY_ID[id].label, credits: DOC_TYPE_BY_ID[id].credits, priority: priority(id, product), status: 'queued' });
    for (const file of files) { const t = classifyDocument(file); tasks.push({ id: `file_${file.id || file.name}`, productId: null, product: file.folder || null, type: t.id, label: t.label, credits: t.credits, priority: priority(t), status: 'queued', name: file.name }); }
    return tasks.sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id));
}
export function queueStats(tasks = []) {
    const by = (s) => tasks.filter((t) => t.status === s).length;
    return { total: tasks.length, queued: by('queued'), processing: by('processing'), completed: by('completed'), credits: tasks.filter((t) => t.status === 'completed').reduce((n, t) => n + t.credits, 0), byType: tasks.reduce((m, t) => { m[t.type] = (m[t.type] || 0) + 1; return m; }, {}) };
}

/** Index a flattened product catalogue as knowledge entries with the facts the crew gets asked about. */
export function indexProducts(list = []) {
    return list.map((p) => {
        const s = p.specifications || {};
        return {
            productId: p.id, manufacturer: String(p.manufacturer || ''), model: String(p.model || ''), category: p.category || 'unknown', approved: Boolean(p.cerApproved), expiry: p.expiryDate || null,
            facts: {
                power: s.power_watts != null ? `${s.power_watts} W` : s.ac_power_kw != null ? `${s.ac_power_kw} kW a.c.` : null,
                voc: s.voc != null ? `${s.voc} V` : null, isc: s.isc != null ? `${s.isc} A` : null, efficiency: s.efficiency_pct != null ? `${s.efficiency_pct} %` : s.efficiency != null ? `${s.efficiency} %` : null,
                capacity: s.nominal_capacity_kwh != null ? `${s.nominal_capacity_kwh} kWh nominal${s.usable_capacity_kwh != null ? ` / ${s.usable_capacity_kwh} kWh usable` : ''}` : null,
                maxDcVoltage: s.max_dc_voltage != null ? `${s.max_dc_voltage} V` : null, phases: s.phases != null ? `${s.phases}-phase` : null, chemistry: s.chemistry || null, standard: s.inverter_standard || null,
                tempCoeffVoc: s.temp_coeff_voc != null ? `${s.temp_coeff_voc} %/°C` : null
            }
        };
    });
}

const FACT_WORDS = { voc: ['voc', 'open circuit', 'open-circuit'], isc: ['isc', 'short circuit', 'short-circuit'], power: ['power', 'watt', 'rating', 'rated', 'kw'], efficiency: ['efficiency'], capacity: ['capacity', 'kwh', 'storage'], maxDcVoltage: ['max dc', 'maximum dc', 'dc voltage', 'input voltage'], phases: ['phase'], chemistry: ['chemistry', 'lfp', 'nmc'], standard: ['standard', '4777', '62109'], tempCoeffVoc: ['temperature coefficient', 'temp coeff'] };
export const FACT_WORDS_LIST = Object.values(FACT_WORDS).flat();
/** Ask the knowledge base a plain question: scores by manufacturer, model and the fact asked for, answers the top five. */
export function queryKnowledge(question, index = [], { limit = 5 } = {}) {
    const q = String(question || '').toLowerCase();
    const askedFacts = Object.entries(FACT_WORDS).filter(([, words]) => words.some((w) => q.includes(w))).map(([k]) => k);
    const out = [];
    for (const k of index) {
        let score = 0;
        const man = k.manufacturer.toLowerCase(); const model = k.model.toLowerCase();
        if (man && q.includes(man)) score += 20;
        else if (man && man.split(/\s+/).some((w) => w.length > 2 && q.includes(w))) score += 10;
        if (model && q.includes(model)) score += 25;
        else if (model && model.split(/[\s-]+/).some((w) => w.length > 2 && q.includes(w))) score += 12;
        for (const f of askedFacts) if (k.facts[f]) score += 25;
        const watts = q.match(/(\d{3,4})\s?w\b/); if (watts && k.facts.power && k.facts.power.startsWith(watts[1])) score += 35;
        if (q.includes(k.category.replace('_', ' '))) score += 5;
        if (score > 0) out.push({ productId: k.productId, product: `${k.manufacturer} ${k.model}`, score, approved: k.approved, answer: answerFor(k, askedFacts), facts: k.facts });
    }
    return out.sort((a, b) => b.score - a.score || a.product.localeCompare(b.product)).slice(0, limit);
}
function answerFor(k, askedFacts) {
    const name = `${k.manufacturer} ${k.model}`;
    const f = askedFacts.find((x) => k.facts[x]);
    const label = { voc: 'open-circuit voltage', isc: 'short-circuit current', power: 'rating', efficiency: 'efficiency', capacity: 'capacity', maxDcVoltage: 'maximum d.c. input voltage', phases: 'connection', chemistry: 'chemistry', standard: 'inverter standard', tempCoeffVoc: 'Voc temperature coefficient' };
    if (f) return `The ${name} ${label[f]} is ${k.facts[f]}${k.approved ? '' : ' (not on the approved list)'}.`;
    const known = Object.entries(k.facts).filter(([, v]) => v).slice(0, 3).map(([kk, v]) => `${label[kk] || kk} ${v}`);
    return `${name} (${k.category.replace('_', ' ')})${known.length ? `: ${known.join(', ')}` : ''}${k.approved ? '' : ' – not on the approved list'}.`;
}

/** Validation rules by tier. Each returns { compliant, message, recommendation }. */
export const VALIDATION_RULES = [
    { id: 'SAFETY-001', tier: 1, rule: 'Array voltage within the system voltage limit', check: (d) => { const lim = systemVoltageLimit(d.installationClass || 'domestic'); const v = Number(d.systemVoltage || 0); return { compliant: v <= lim.limit, message: v > lim.limit ? `System voltage ${v} V exceeds the ${lim.limit} V limit` : `System voltage ${v} V within the ${lim.limit} V limit`, recommendation: v > lim.limit ? 'Shorten the strings or change the installation class' : null, reference: lim.reference }; } },
    { id: 'SAFETY-002', tier: 1, rule: 'Isolation and shutdown provisions present', check: (d) => { const have = d.safetyFeatures || []; const need = ['dc_isolation', 'ac_isolation', 'shutdown_procedure']; const missing = need.filter((f) => !have.includes(f)); return { compliant: !missing.length, message: missing.length ? `Missing: ${missing.join(', ')}` : 'd.c. and a.c. isolation and the shutdown procedure are in place', recommendation: missing.length ? `Provide ${missing.join(', ')}` : null, reference: 'AS/NZS 5033:2021 Cl 4.4.3; AS/NZS 3000:2018 Cl 2.3' }; } },
    { id: 'STD-001', tier: 2, rule: 'Inverter listed to AS/NZS 4777.2:2020', check: (d) => ({ compliant: Boolean(d.inverterCompliance), message: d.inverterCompliance ? 'Inverter listed to AS/NZS 4777.2:2020' : 'Inverter not listed to AS/NZS 4777.2:2020', recommendation: d.inverterCompliance ? null : 'Use a CEC-listed inverter with Australia A/B/C region settings', reference: 'AS/NZS 4777.2:2020' }) },
    { id: 'STD-002', tier: 2, rule: 'Battery location and clearances to AS/NZS 5139', check: (d) => { if (!d.batteryCapacity) return { compliant: true, message: 'No battery in this system', recommendation: null, reference: 'AS/NZS 5139:2019', skipped: true }; const ok = Boolean(d.batteryCompliance) && Number(d.batteryClearanceMm ?? CLEARANCE_MM) >= CLEARANCE_MM; return { compliant: ok, message: ok ? `Battery ${d.batteryCapacity} kWh in a compliant location` : `Battery location or clearance (${d.batteryClearanceMm ?? '?'} mm, minimum ${CLEARANCE_MM} mm) not confirmed`, recommendation: ok ? null : 'Assess the location in the Battery window before installation', reference: 'AS/NZS 5139:2019 Cl 4.2' }; } },
    { id: 'NET-001', tier: 3, rule: 'Export within the DNSP allowance', check: (d) => { const dnsp = d.dnspId ? dnspById(d.dnspId) : null; const phases = Number(d.phases) === 3 ? 3 : 1; const limit = Number(d.approvedExportLimit ?? (dnsp ? dnsp.exportLimitKw[phases] : 5)); const exp = Number(d.exportCapacity || 0); return { compliant: exp <= limit, message: exp > limit ? `Export ${exp} kW exceeds the ${limit} kW allowance${dnsp ? ` (${dnsp.name})` : ''}` : `Export ${exp} kW within the ${limit} kW allowance${dnsp ? ` (${dnsp.name})` : ''}`, recommendation: exp > limit ? 'Apply for a higher export limit or set an export limit on the inverter' : null, reference: dnsp ? `${dnsp.name} connection requirements` : 'DNSP basic connection allowance' }; } },
    { id: 'NET-002', tier: 3, rule: 'Inverter capacity within the connection capacity', check: (d) => { const cap = Number(d.connectionCapacity ?? (Number(d.phases) === 3 ? 30 : 10)); const size = Number(d.systemSize || 0); return { compliant: size <= cap, message: size > cap ? `Inverter capacity ${size} kVA exceeds the ${cap} kVA connection capacity` : `Inverter capacity ${size} kVA within the ${cap} kVA connection`, recommendation: size > cap ? 'Apply for a connection upgrade or reduce the inverter capacity' : null, reference: 'DNSP connection standard' }; } },
    { id: 'CER-001', tier: 5, rule: 'Modules and inverter on the approved product lists', check: (d) => ({ compliant: d.productsApproved !== false, message: d.productsApproved === false ? 'A product is not on the approved list at the install date' : 'Products approved for STCs', recommendation: d.productsApproved === false ? 'Replace the product or forgo the certificates' : null, reference: 'CER SRES eligibility; SAA approved products list' }) },
    { id: 'MFR-001', tier: 6, rule: 'Manufacturer clearances and mounting followed', check: (d) => ({ compliant: d.manufacturerInstructions !== false, message: d.manufacturerInstructions === false ? 'Installation departs from the manufacturer\'s instructions' : 'Manufacturer instructions followed', recommendation: d.manufacturerInstructions === false ? 'Follow the manual or obtain written approval from the manufacturer' : null, reference: 'Installation manual (warranty condition)' }) }
];

/** Validate a system record against every tier. The governing failure is the highest tier that failed. */
export function validateSystemData(data = {}) {
    const results = VALIDATION_RULES.map((r) => { const out = r.check(data); return { id: r.id, tier: r.tier, tierName: tierByNumber(r.tier).name, rule: r.rule, ...out }; });
    const failed = results.filter((r) => !r.compliant);
    const byTier = {}; for (const r of results) { byTier[r.tier] = byTier[r.tier] || { tier: r.tier, name: r.tierName, passed: 0, failed: 0 }; byTier[r.tier][r.compliant ? 'passed' : 'failed']++; }
    const governing = failed.length ? Math.min(...failed.map((r) => r.tier)) : null;
    return { valid: failed.length === 0, results, failed, byTier: Object.values(byTier), governing, governingName: governing ? tierByNumber(governing).name : null, recommendations: failed.map((r) => r.recommendation).filter(Boolean), summary: `${results.length - failed.length}/${results.length} rules pass${governing ? ` · governing failure at tier ${governing} (${tierByNumber(governing).name})` : ''}` };
}

const SAMPLE = [
    { id: 'PV-A440', manufacturer: 'Trina Solar', model: 'Vertex S+ 440', category: 'solar_panel', cerApproved: true, specifications: { power_watts: 440, voc: 49.5, isc: 13.9, temp_coeff_voc: -0.24 } },
    { id: 'INV-G5', manufacturer: 'Fronius', model: 'Primo GEN24 5.0', category: 'inverter', cerApproved: true, specifications: { ac_power_kw: 5, phases: 1, max_dc_voltage: 600, inverter_standard: 'AS/NZS 4777.2:2020' } },
    { id: 'BAT-D13', manufacturer: 'Tesla', model: 'Powerwall 3', category: 'battery', cerApproved: false, specifications: { nominal_capacity_kwh: 13.5, usable_capacity_kwh: 13.5, chemistry: 'LFP' } }
];
export const FEATURES = [
    { id: 'pipeline.classify', title: 'Documents are classified by name, folder and MIME type into product, job and reference types', test: () => classifyDocument({ name: 'Vertex S+ installation manual.pdf' }).id === 'installation_manual' && classifyDocument({ name: 'IMG_2041', mimeType: 'image/jpeg' }).id === 'photos' && classifyDocument({ name: 'CCEW 12 Sun St.pdf' }).id === 'ccew' && classifyDocument({ folder: 'Ausgrid approvals', name: '4001.pdf' }).id === 'dnsp' && classifyDocument({ name: 'AS NZS 5033 extract.pdf' }).id === 'standard' && classifyDocument({ name: 'notes.txt' }).id === 'other' && DOC_TYPES.length === 15 },
    { id: 'pipeline.priority', title: 'Manuals, popular brands and big modules go first; compliance paperwork jumps the queue', test: () => priority('installation_manual', SAMPLE[0]) === 7 && priority('spec_sheet', SAMPLE[0]) === 4 && priority('user_manual', { manufacturer: 'Nobody', specifications: { power_watts: 300 } }) === 1 && priority('ccew') === 3 && priority('standard') === 3 },
    { id: 'pipeline.queue', title: 'A queue is built per product and loose file, sorted by priority, with stats', test: () => { const q = buildQueue({ products: SAMPLE, files: [{ id: 'f1', name: 'Commissioning sheet.pdf', folder: '12 Sun St' }] }); const s = queueStats(q); q[0].status = 'completed'; return q.length === 10 && q[0].type === 'installation_manual' && q[0].priority >= q[q.length - 1].priority && s.total === 10 && s.byType.commissioning === 1 && queueStats(q).credits === q[0].credits; } },
    { id: 'pipeline.index', title: 'The product catalogue indexes into knowledge entries with power, Voc, capacity and standard facts', test: () => { const i = indexProducts(SAMPLE); return i.length === 3 && i[0].facts.power === '440 W' && i[0].facts.voc === '49.5 V' && i[1].facts.power === '5 kW a.c.' && i[1].facts.standard === 'AS/NZS 4777.2:2020' && i[2].facts.capacity === '13.5 kWh nominal / 13.5 kWh usable' && i[2].approved === false; } },
    { id: 'pipeline.query', title: 'Plain-word questions find the product and answer the fact asked for', test: () => { const i = indexProducts(SAMPLE); const a = queryKnowledge('What is the Voc of the Trina Vertex 440W?', i); const b = queryKnowledge('powerwall capacity', i); const c = queryKnowledge('nothing here', i); return a[0].productId === 'PV-A440' && /open-circuit voltage is 49\.5 V/.test(a[0].answer) && b[0].productId === 'BAT-D13' && /13\.5 kWh/.test(b[0].answer) && /not on the approved list/.test(b[0].answer) && c.length === 0; } },
    { id: 'pipeline.validatePass', title: 'A sound system record passes every tier', test: () => { const r = validateSystemData({ systemVoltage: 560, safetyFeatures: ['dc_isolation', 'ac_isolation', 'shutdown_procedure'], inverterCompliance: true, batteryCapacity: 13.5, batteryCompliance: true, batteryClearanceMm: 800, dnspId: 'ausgrid', phases: 1, exportCapacity: 5, systemSize: 5, productsApproved: true }); return r.valid && r.results.length === 8 && r.governing === null && r.byTier.length === 5 && /8\/8/.test(r.summary); } },
    { id: 'pipeline.validateFail', title: 'Failures are reported per tier and the highest failing tier governs', test: () => { const r = validateSystemData({ systemVoltage: 1100, safetyFeatures: ['dc_isolation'], inverterCompliance: false, dnspId: 'sapn', phases: 1, exportCapacity: 10, systemSize: 12 }); return !r.valid && r.governing === 1 && r.failed.length === 5 && r.failed.some((f) => f.id === 'NET-001' && /SA Power Networks/.test(f.message)) && r.recommendations.length === 5 && /tier 1/.test(r.summary) && DNSPS.length >= 10; } }
];
