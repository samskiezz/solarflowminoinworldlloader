/**
 * Market intelligence: the incentive and price assumptions the business
 * prices against, benchmarks for quotes, and a watchlist the server (or the
 * user) refreshes. Figures are editable assumptions with a "verify" flag,
 * not claims: the Market window shows their date and source so the crew
 * re-checks them before quoting.
 */
import { solarStcs, deemingYears, zoneForPostcode } from '../domain/incentives.js';

export const MARKET_DEFAULTS = {
    asOf: '2026-10-01', region: 'NSW / Sydney',
    stc: { price: 38, note: 'Spot STC price assumption (AUD). Scheme deems to 2030, one fewer deeming year each January.', verify: true },
    batteryStcFactor: { value: 8.4, unit: 'STC per usable kWh', note: 'Federal Cheaper Home Batteries Program factor assumption for 2026 installs (declines each year to 2030); eligible 5–100 kWh nominal, 50 kWh usable max discounted.', verify: true },
    priceBands: { // installed, after incentives, residential Sydney (AUD)
        pvPerKw: { low: 850, mid: 1100, high: 1500, note: 'Installed cost per kW of PV after STCs (6.6–13 kW residential).' },
        batteryPerKwh: { low: 700, mid: 950, high: 1300, note: 'Installed cost per usable kWh after the federal battery discount.' },
        evChargerSingle: { low: 1400, mid: 1900, high: 2800, note: '7 kW single-phase EV charger supplied and installed.' }
    },
    wholesale: { panelPerW: { value: 0.28, note: 'Tier-1 N-type 440–475 W module, AUD per W ex GST, pallet pricing.' }, batteryPerKwh: { value: 430, note: 'LFP residential battery, AUD per nominal kWh ex GST.' }, hybridInverterPerKw: { value: 190, note: '10–15 kW hybrid inverter AUD per kW ex GST.' } },
    demand: { batteryAttachRatePct: 55, note: 'Share of residential solar quotes that now include a battery (assumption).' },
    watchlist: [
        { id: 'cec-list', title: 'CEC approved product list changes', cadence: 'weekly', url: 'https://cleanenergycouncil.org.au/industry-programs/products-program', why: 'Modules, inverters and batteries drop off the list; STCs and the federal battery discount require listed products.' },
        { id: 'stc-price', title: 'STC spot price', cadence: 'weekly', url: 'https://www.greenenergytrading.com.au', why: 'Every quote prices the STC assignment at this number.' },
        { id: 'battery-program', title: 'Cheaper Home Batteries Program rules', cadence: 'monthly', url: 'https://www.dcceew.gov.au/energy/renewable/cheaper-home-batteries-program', why: 'Factor, eligibility and VPP-ready requirements change the battery price point.' },
        { id: 'nsw-pdrs', title: 'NSW PDRS / Energy Security Safeguard incentives', cadence: 'monthly', url: 'https://www.energy.nsw.gov.au', why: 'State incentives stack with or replace federal ones for batteries and VPP sign-ups.' },
        { id: 'dnsp-rules', title: 'DNSP connection standards (Ausgrid, Endeavour, Essential)', cadence: 'quarterly', url: 'https://www.ausgrid.com.au', why: 'Export limits and flexible-export (CSIP-AUS) requirements decide what can be sold on three-phase sites.' },
        { id: 'wholesale', title: 'Wholesale module and battery pricing', cadence: 'monthly', url: 'https://www.pv-magazine-australia.com', why: 'Cost of goods is a third of revenue; a 10 % move changes margin by three points.' },
        { id: 'competitors', title: 'Competitor pricing in Sydney', cadence: 'monthly', url: 'https://www.solarquotes.com.au', why: 'Retail price bands set what the lead farm can close at.' }
    ]
};

export function marketModel(overrides = {}) { return { ...MARKET_DEFAULTS, ...overrides, priceBands: { ...MARKET_DEFAULTS.priceBands, ...(overrides.priceBands || {}) } }; }

/** STC value of a PV system plus the federal battery discount, under the model's assumptions. */
export function incentives({ pvKw = 0, batteryKwh = 0, postcode = '2000', installYear = new Date().getFullYear() }, market = MARKET_DEFAULTS) {
    const pvRaw = pvKw > 0 ? solarStcs({ kw: pvKw, postcode, installYear, stcPrice: market.stc.price }) : null;
    const pv = pvRaw && !pvRaw.error ? { stcs: pvRaw.stcs, value: pvRaw.valueAud } : { stcs: 0, value: 0 };
    const usable = Math.min(50, batteryKwh * 0.9);
    const batteryStcs = batteryKwh >= 5 ? Math.floor(usable * market.batteryStcFactor.value) : 0;
    return { pvStcs: pv.stcs, pvValue: Math.round(pv.value), batteryStcs, batteryValue: Math.round(batteryStcs * market.stc.price), total: Math.round(pv.value + batteryStcs * market.stc.price), deemingYears: deemingYears(installYear), zone: zoneForPostcode(postcode)?.zone ?? null };
}

/** Where does a quote sit against the market bands? */
export function benchmarkQuote({ pvKw = 0, batteryKwh = 0, evChargers = 0, price = 0 }, market = MARKET_DEFAULTS) {
    const b = market.priceBands; const parts = [];
    const expect = (band, qty, label) => { if (!qty) return; parts.push({ label, low: Math.round(band.low * qty), mid: Math.round(band.mid * qty), high: Math.round(band.high * qty) }); };
    expect(b.pvPerKw, pvKw, `${pvKw} kW PV`); expect(b.batteryPerKwh, batteryKwh * 0.9, `${batteryKwh} kWh battery`); expect(b.evChargerSingle, evChargers, `${evChargers} EV charger`);
    const low = parts.reduce((s, p) => s + p.low, 0), mid = parts.reduce((s, p) => s + p.mid, 0), high = parts.reduce((s, p) => s + p.high, 0);
    if (!price || !parts.length) return { parts, low, mid, high, verdict: 'unknown', deltaPct: null };
    const deltaPct = Math.round(((price - mid) / mid) * 1000) / 10;
    const verdict = price < low ? 'under-priced' : price <= mid ? 'competitive' : price <= high ? 'premium' : 'over-priced';
    return { parts, low, mid, high, price, deltaPct, verdict };
}

/** Marketing funnel economics from the calendar notes or manual entry. */
export function funnelEconomics({ spendPerWeek = 0, leadsPerWeek = 0, pickupPct = 0, closePct = 0, avgSale = 12000, grossMarginPct = 30 } = {}) {
    const sales = leadsPerWeek * (pickupPct / 100) * (closePct / 100);
    const revenue = sales * avgSale; const margin = revenue * (grossMarginPct / 100);
    const costPerSale = sales ? spendPerWeek / sales : null;
    return { salesPerWeek: Math.round(sales * 10) / 10, revenuePerWeek: Math.round(revenue), marginPerWeek: Math.round(margin), costPerSale: costPerSale ? Math.round(costPerSale) : null, roas: spendPerWeek ? Math.round((revenue / spendPerWeek) * 10) / 10 : null, marginAfterAds: Math.round(margin - spendPerWeek), breakEvenClosePct: leadsPerWeek && pickupPct && avgSale ? Math.round((spendPerWeek / (leadsPerWeek * (pickupPct / 100) * avgSale * (grossMarginPct / 100))) * 1000) / 10 : null };
}

export const FEATURES = [
    { id: 'biz.market.incentives', title: 'PV STCs and the federal battery discount price under editable assumptions', test: () => { const r = incentives({ pvKw: 13.3, batteryKwh: 41.5, postcode: '2065', installYear: 2026 }); return r.zone === 3 && r.pvStcs > 50 && r.batteryStcs === Math.floor(Math.min(50, 41.5 * 0.9) * 8.4) && r.total === r.pvValue + r.batteryValue && incentives({ pvKw: 0, batteryKwh: 3 }).total === 0; } },
    { id: 'biz.market.benchmark', title: 'Quotes benchmark against installed-price bands with a verdict', test: () => { const b = benchmarkQuote({ pvKw: 10, batteryKwh: 20, price: 24000 }); const c = benchmarkQuote({ pvKw: 10, price: 40000 }); return b.parts.length === 2 && b.mid === Math.round(1100 * 10) + Math.round(950 * 18) && ['competitive', 'premium'].includes(b.verdict) && c.verdict === 'over-priced' && benchmarkQuote({}).verdict === 'unknown'; } },
    { id: 'biz.market.funnel', title: 'Lead-farm economics: sales per week, cost per sale, ROAS and break-even close rate', test: () => { const f = funnelEconomics({ spendPerWeek: 6000, leadsPerWeek: 70, pickupPct: 40, closePct: 28, avgSale: 12000, grossMarginPct: 30 }); return f.salesPerWeek === 7.8 && f.costPerSale === 765 && f.roas === 15.7 && f.marginAfterAds === 22224 && f.breakEvenClosePct === 6; } },
    { id: 'biz.market.watchlist', title: 'A dated watchlist tells the crew what to re-verify and why', test: () => MARKET_DEFAULTS.watchlist.length >= 7 && MARKET_DEFAULTS.watchlist.every((w) => w.url && w.why && w.cadence) && MARKET_DEFAULTS.stc.verify === true }
];
