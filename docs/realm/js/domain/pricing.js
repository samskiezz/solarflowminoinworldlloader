/** Pricing and proposals: line items, GST, STC point-of-sale discount, payment schedule, margin. */
import { num, round } from './pv.js';

export const GST_RATE = 0.10;
export const DEFAULT_RATES = { modulePerWatt: 0.55, inverterPerKw: 320, batteryPerKwh: 850, rackingPerModule: 45, labourPerKw: 420, electricalBase: 1200, batteryInstall: 1400, admin: 350, dnspFee: 180 };

export function defaultLineItems({ moduleCount = 0, moduleWatts = 0, inverterKw = 0, batteryKwh = 0, rates = DEFAULT_RATES } = {}) {
    const r = { ...DEFAULT_RATES, ...rates };
    const items = [];
    if (moduleCount && moduleWatts) items.push({ id: 'modules', label: `${moduleCount} × ${moduleWatts} W PV modules`, qty: moduleCount, unit: round(moduleWatts * r.modulePerWatt, 2), category: 'equipment' });
    if (inverterKw) items.push({ id: 'inverter', label: `${inverterKw} kW inverter`, qty: 1, unit: round(inverterKw * r.inverterPerKw, 2), category: 'equipment' });
    if (batteryKwh) items.push({ id: 'battery', label: `${batteryKwh} kWh battery`, qty: 1, unit: round(batteryKwh * r.batteryPerKwh, 2), category: 'equipment' });
    if (moduleCount) items.push({ id: 'racking', label: 'Racking and mounting', qty: moduleCount, unit: r.rackingPerModule, category: 'equipment' });
    const kw = (moduleCount * moduleWatts) / 1000;
    if (kw) items.push({ id: 'labour', label: 'Installation labour', qty: round(kw, 2), unit: r.labourPerKw, category: 'labour' });
    items.push({ id: 'electrical', label: 'Electrical works, isolators, labels, CES', qty: 1, unit: r.electricalBase, category: 'labour' });
    if (batteryKwh) items.push({ id: 'battery_install', label: 'Battery installation and commissioning', qty: 1, unit: r.batteryInstall, category: 'labour' });
    items.push({ id: 'admin', label: 'Design, DNSP application, STC assignment admin', qty: 1, unit: r.admin, category: 'services' });
    items.push({ id: 'dnsp', label: 'Network connection fee', qty: 1, unit: r.dnspFee, category: 'services' });
    return items;
}

export function lineTotal(item) { return round(num(item.qty, 0) * num(item.unit, 0), 2); }

/**
 * Totals: subtotal (ex GST), discounts (STC solar + battery, promo), GST, total, deposit schedule, margin.
 */
export function quoteTotals(items = [], { solarStcValue = 0, batteryStcValue = 0, promoDiscount = 0, costOfGoods = null, deposit = 0.1, progress = 0.6 } = {}) {
    const subtotal = round(items.reduce((s, i) => s + lineTotal(i), 0), 2);
    const stc = round(num(solarStcValue, 0) + num(batteryStcValue, 0), 2);
    const discounts = round(stc + num(promoDiscount, 0), 2);
    const exGst = round(Math.max(0, subtotal - discounts), 2);
    const gst = round(exGst * GST_RATE, 2);
    const total = round(exGst + gst, 2);
    const schedule = [
        { stage: 'Deposit on acceptance', amount: round(total * deposit, 2) },
        { stage: 'Progress on installation', amount: round(total * progress, 2) },
        { stage: 'Balance on commissioning', amount: round(total - total * deposit - total * progress, 2) }
    ];
    const margin = costOfGoods === null ? null : round(((subtotal - num(costOfGoods)) / subtotal) * 100, 1);
    return { subtotal, stcDiscount: stc, discounts, exGst, gst, total, schedule, marginPct: margin, grossBeforeStc: round(subtotal * (1 + GST_RATE), 2) };
}

export function pricePerWatt(total, kw) { return kw > 0 ? round(total / (kw * 1000), 2) : null; }

export function proposalText({ company, customer, address, systemKw, batteryKwh, annualKwh, year1Savings, paybackYears, items, totals, validDays = 30, generatedAt = new Date().toISOString() }) {
    const lines = [`${company} – Proposal for ${customer}`, address || '', `Prepared ${generatedAt.slice(0, 10)} · valid ${validDays} days`, '', `System: ${systemKw} kW solar${batteryKwh ? ` + ${batteryKwh} kWh battery` : ''}`];
    if (annualKwh) lines.push(`Estimated generation: ${annualKwh} kWh per year`);
    if (year1Savings) lines.push(`Estimated first-year savings: $${year1Savings}${paybackYears ? ` · simple payback ${paybackYears} years` : ''}`);
    lines.push('', 'Inclusions:');
    for (const i of items) lines.push(`  - ${i.label}: ${i.qty} × $${num(i.unit).toFixed(2)} = $${lineTotal(i).toFixed(2)}`);
    lines.push('', `Subtotal (ex GST): $${totals.subtotal.toFixed(2)}`, `Less STC point-of-sale discount: -$${totals.stcDiscount.toFixed(2)}`, `GST: $${totals.gst.toFixed(2)}`, `Total payable: $${totals.total.toFixed(2)}`, '', 'Payment schedule:');
    for (const s of totals.schedule) lines.push(`  - ${s.stage}: $${s.amount.toFixed(2)}`);
    lines.push('', 'STCs are assigned to the installer in exchange for the discount shown. Savings are estimates based on the stated assumptions and your tariff.');
    return lines.join('\n');
}

export const FEATURES = [
    { id: 'pricing.defaultItems', title: 'Default line items from the design', test: () => { const items = defaultLineItems({ moduleCount: 15, moduleWatts: 440, inverterKw: 5, batteryKwh: 13 }); return items.length === 9 && items[0].qty === 15 && items.find((i) => i.id === 'labour').qty === 6.6; } },
    { id: 'pricing.totals', title: 'Totals with STC discount, GST and payment schedule', test: () => { const t = quoteTotals([{ qty: 1, unit: 10000 }], { solarStcValue: 2000, promoDiscount: 500 }); return t.subtotal === 10000 && t.exGst === 7500 && t.gst === 750 && t.total === 8250 && Math.abs(t.schedule.reduce((s, x) => s + x.amount, 0) - 8250) < 0.01; } },
    { id: 'pricing.margin', title: 'Gross margin from cost of goods', test: () => quoteTotals([{ qty: 1, unit: 10000 }], { costOfGoods: 6000 }).marginPct === 40 && quoteTotals([{ qty: 1, unit: 10000 }]).marginPct === null },
    { id: 'pricing.perWatt', title: 'Price per watt', test: () => pricePerWatt(6600, 6.6) === 1 && pricePerWatt(100, 0) === null },
    { id: 'pricing.proposalText', title: 'Plain-text proposal document', test: () => { const items = [{ label: 'Panels', qty: 2, unit: 100 }]; const text = proposalText({ company: 'Co', customer: 'Ann', systemKw: 6.6, items, totals: quoteTotals(items) }); return text.includes('Proposal for Ann') && text.includes('Total payable: $220.00'); } },
    { id: 'pricing.noNegative', title: 'Discounts never push the total below zero', test: () => quoteTotals([{ qty: 1, unit: 100 }], { solarStcValue: 500 }).total === 0 }
];
