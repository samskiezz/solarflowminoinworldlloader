/**
 * Product vault: search, filtering and design compatibility over the
 * CEC approved product catalogue (docs/data/cec-products.json).
 */
import { num, round } from './pv.js';

export function flatten(catalogue) {
    const categories = (catalogue && catalogue.categories) || {};
    return [...(categories.solar_panels || []), ...(categories.inverters || []), ...(categories.batteries || [])];
}

export function isApprovedOn(product, dateIso = new Date().toISOString().slice(0, 10)) {
    if (!product) return false;
    const date = String(dateIso).slice(0, 10);
    if (product.expiryDate && product.expiryDate < date) return false;
    if (product.approvedDate && product.approvedDate > date) return false;
    return product.cerApproved !== false || Boolean(product.expiryDate && product.expiryDate >= date);
}

/** Days until a product's approval expires (negative when expired). */
export function daysToExpiry(product, dateIso = new Date().toISOString().slice(0, 10)) {
    if (!product || !product.expiryDate) return null;
    return Math.round((Date.parse(product.expiryDate) - Date.parse(String(dateIso).slice(0, 10))) / 86400000);
}

/**
 * Search products.
 * @param {Array} products flattened list
 * @param {object} f { q, category, manufacturer, approvedOnly, minKw, maxKw, minKwh, maxKwh, sort, limit, offset }
 */
export function searchProducts(products, f = {}) {
    const q = String(f.q || '').toLowerCase().trim();
    const terms = q ? q.split(/\s+/) : [];
    const date = f.date || new Date().toISOString().slice(0, 10);
    let list = products.filter((p) => {
        if (f.category && p.category !== f.category) return false;
        if (f.manufacturer && String(p.manufacturer).toLowerCase() !== String(f.manufacturer).toLowerCase()) return false;
        if (f.approvedOnly && !isApprovedOn(p, date)) return false;
        const kw = p.specifications && p.specifications.ac_power_kw;
        if (f.minKw !== undefined && f.minKw !== '' && !(kw >= num(f.minKw))) return false;
        if (f.maxKw !== undefined && f.maxKw !== '' && !(kw <= num(f.maxKw))) return false;
        const kwh = p.specifications && p.specifications.usable_capacity_kwh;
        if (f.minKwh !== undefined && f.minKwh !== '' && !(kwh >= num(f.minKwh))) return false;
        if (f.maxKwh !== undefined && f.maxKwh !== '' && !(kwh <= num(f.maxKwh))) return false;
        if (terms.length) {
            const hay = `${p.manufacturer} ${p.series || ''} ${p.model} ${p.id}`.toLowerCase();
            if (!terms.every((t) => hay.includes(t))) return false;
        }
        return true;
    });
    const sort = f.sort || 'manufacturer';
    list = list.slice().sort((a, b) => {
        if (sort === 'expiry') return String(a.expiryDate || '').localeCompare(String(b.expiryDate || ''));
        if (sort === 'power') return (num(b.specifications?.ac_power_kw, 0) - num(a.specifications?.ac_power_kw, 0)) || (num(b.specifications?.usable_capacity_kwh, 0) - num(a.specifications?.usable_capacity_kwh, 0));
        if (sort === 'approved') return String(b.approvedDate || '').localeCompare(String(a.approvedDate || ''));
        return String(a.manufacturer).localeCompare(String(b.manufacturer)) || String(a.model).localeCompare(String(b.model));
    });
    const total = list.length;
    const offset = Math.max(0, num(f.offset, 0));
    const limit = Math.min(500, Math.max(1, num(f.limit, 50)));
    return { total, items: list.slice(offset, offset + limit), offset, limit };
}

export function manufacturers(products, category = null) {
    const counts = {};
    for (const p of products) {
        if (category && p.category !== category) continue;
        counts[p.manufacturer] = (counts[p.manufacturer] || 0) + 1;
    }
    return Object.entries(counts).sort((a, b) => a[0].localeCompare(b[0])).map(([name, count]) => ({ name, count }));
}

/** Inverters whose AC rating suits an array (DC/AC between 1.0 and 1.33). */
export function matchInverters(products, arrayKwDc, { phases = null, approvedOnly = true } = {}) {
    const kw = num(arrayKwDc);
    return products.filter((p) => {
        if (p.category !== 'inverter') return false;
        if (approvedOnly && !isApprovedOn(p)) return false;
        const ac = num(p.specifications?.ac_power_kw, 0);
        if (!ac) return false;
        if (phases === 1 && ac > 30) return false;
        return ac >= kw / 1.333 && ac <= kw;
    }).sort((a, b) => Math.abs(num(a.specifications.ac_power_kw) - kw / 1.2) - Math.abs(num(b.specifications.ac_power_kw) - kw / 1.2));
}

/** Batteries with usable capacity in a range. */
export function matchBatteries(products, usableKwh, tolerancePct = 25) {
    const target = num(usableKwh);
    const lo = target * (1 - tolerancePct / 100);
    const hi = target * (1 + tolerancePct / 100);
    return products.filter((p) => p.category === 'battery' && isApprovedOn(p) && num(p.specifications?.usable_capacity_kwh, 0) >= lo && num(p.specifications?.usable_capacity_kwh, 0) <= hi)
        .sort((a, b) => Math.abs(num(a.specifications.usable_capacity_kwh) - target) - Math.abs(num(b.specifications.usable_capacity_kwh) - target));
}

/** Design compatibility summary. */
export function designCompatibility({ module, inverter, battery, moduleCount, dateIso }) {
    const issues = [];
    const date = dateIso || new Date().toISOString().slice(0, 10);
    if (module && !isApprovedOn(module, date)) issues.push(`Module ${module.model} is not approved on ${date}`);
    if (inverter && !isApprovedOn(inverter, date)) issues.push(`Inverter ${inverter.model} is not approved on ${date}`);
    if (battery && !isApprovedOn(battery, date)) issues.push(`Battery ${battery.model} is not approved on ${date}`);
    const moduleW = num(module?.specifications?.power_watts, 0);
    const arrayKw = moduleW && moduleCount ? (moduleW * num(moduleCount)) / 1000 : null;
    const acKw = num(inverter?.specifications?.ac_power_kw, 0);
    if (arrayKw && acKw) {
        const ratio = arrayKw / acKw;
        if (ratio > 1.333) issues.push(`DC/AC ratio ${round(ratio, 2)} exceeds 1.33 (STC eligibility)`);
    }
    for (const p of [module, inverter, battery]) {
        const days = p ? daysToExpiry(p, date) : null;
        if (days !== null && days >= 0 && days < 90) issues.push(`${p.model} approval expires in ${days} days`);
    }
    return { compatible: issues.length === 0, issues, arrayKw: arrayKw ? round(arrayKw, 2) : null, dcAcRatio: arrayKw && acKw ? round(arrayKw / acKw, 2) : null };
}

const SAMPLE = {
    categories: {
        solar_panels: [{ id: 'PV1', manufacturer: 'Alpha', model: 'A-440', category: 'solar_panel', cerApproved: true, approvedDate: '2025-01-01', expiryDate: '2028-01-01', specifications: { power_watts: 440 } }],
        inverters: [
            { id: 'INV1', manufacturer: 'Beta', model: 'B-5 (AS4777-2 2020)', category: 'inverter', cerApproved: true, approvedDate: '2025-01-01', expiryDate: '2028-01-01', specifications: { ac_power_kw: 5 } },
            { id: 'INV2', manufacturer: 'Beta', model: 'B-10', category: 'inverter', cerApproved: false, approvedDate: '2020-01-01', expiryDate: '2023-01-01', specifications: { ac_power_kw: 10 } }
        ],
        batteries: [{ id: 'BAT1', manufacturer: 'Gamma', model: 'G-13', category: 'battery', cerApproved: true, approvedDate: '2025-01-01', expiryDate: '2028-01-01', specifications: { usable_capacity_kwh: 13.5 } }]
    }
};

export const FEATURES = [
    { id: 'products.flatten', title: 'Flatten catalogue categories', test: () => flatten(SAMPLE).length === 4 },
    { id: 'products.isApprovedOn', title: 'Approval status on a date', test: () => isApprovedOn(SAMPLE.categories.inverters[0], '2026-06-01') && !isApprovedOn(SAMPLE.categories.inverters[1], '2026-06-01') },
    { id: 'products.daysToExpiry', title: 'Days to approval expiry', test: () => daysToExpiry(SAMPLE.categories.inverters[0], '2027-12-31') === 1 },
    { id: 'products.search', title: 'Catalogue search with filters and paging', test: () => { const all = flatten(SAMPLE); return searchProducts(all, { q: 'beta b-5' }).total === 1 && searchProducts(all, { category: 'inverter', approvedOnly: true, date: '2026-06-01' }).total === 1 && searchProducts(all, { limit: 1 }).items.length === 1; } },
    { id: 'products.manufacturers', title: 'Manufacturer facets', test: () => manufacturers(flatten(SAMPLE), 'inverter')[0].count === 2 },
    { id: 'products.matchInverters', title: 'Inverter matching by DC/AC ratio', test: () => matchInverters(flatten(SAMPLE), 6.6).length === 1 },
    { id: 'products.matchBatteries', title: 'Battery matching by usable capacity', test: () => matchBatteries(flatten(SAMPLE), 12).length === 1 },
    { id: 'products.designCompatibility', title: 'Design compatibility and expiry warnings', test: () => { const all = flatten(SAMPLE); const ok = designCompatibility({ module: all[0], inverter: all[1], battery: all[3], moduleCount: 15, dateIso: '2026-06-01' }); const bad = designCompatibility({ module: all[0], inverter: all[2], moduleCount: 15, dateIso: '2026-06-01' }); return ok.compatible && ok.dcAcRatio === 1.32 && !bad.compatible; } }
];
