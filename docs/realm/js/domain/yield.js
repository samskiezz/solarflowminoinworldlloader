/**
 * Energy yield and financial modelling for residential/commercial PV + storage.
 * City yields are the Clean Energy Council consumer-guide figures (kWh per kW
 * per day, already net of typical system losses).
 */
import { num, round, orientationFactor } from './pv.js';

export const CITY_YIELD_KWH_PER_KW_DAY = {
    Adelaide: 4.2, 'Alice Springs': 5.0, Brisbane: 4.2, Cairns: 4.2, Canberra: 4.3, Darwin: 4.4,
    Hobart: 3.5, Melbourne: 3.6, Perth: 4.4, Sydney: 3.9, 'Gold Coast': 4.2, Newcastle: 4.0, Townsville: 4.5, Geelong: 3.6
};

export const DEFAULT_TARIFF_C_PER_KWH = { NSW: 36, VIC: 29, QLD: 33, SA: 43, WA: 32, TAS: 28, ACT: 31, NT: 30 };
export const DEFAULT_FIT_C_PER_KWH = { NSW: 5, VIC: 4, QLD: 6, SA: 4, WA: 3, TAS: 8.8, ACT: 7, NT: 9.3 };
export const GRID_EMISSION_FACTOR_KG_PER_KWH = 0.68;

export function cityYield(city) {
    return CITY_YIELD_KWH_PER_KW_DAY[city] ?? null;
}

/** Annual yield for a system. */
export function annualYield({ kw, city, tiltDeg = 25, azimuthDeg = 0, shadingLossPct = 0, extraLossPct = 0 }) {
    const perKwDay = cityYield(city) ?? 4.0;
    const factor = orientationFactor(tiltDeg, azimuthDeg) * (1 - num(shadingLossPct, 0) / 100) * (1 - num(extraLossPct, 0) / 100);
    const annual = num(kw) * perKwDay * 365 * factor;
    return { annualKwh: round(annual, 0), dailyKwh: round(annual / 365, 2), perKwDay, orientationFactor: round(factor, 3), specificYield: round(annual / num(kw), 0) };
}

/** Monthly distribution (southern hemisphere seasonal shape). */
const MONTH_SHAPE = [1.22, 1.12, 1.05, 0.92, 0.78, 0.70, 0.74, 0.86, 0.98, 1.10, 1.18, 1.25];
export function monthlyYield(annualKwh) {
    const total = MONTH_SHAPE.reduce((a, b) => a + b, 0);
    return MONTH_SHAPE.map((s) => round((num(annualKwh) * s) / total, 0));
}

/**
 * Lifetime financial model.
 * @param {object} p
 * @param {number} p.annualKwh generation year 1
 * @param {number} p.selfConsumptionPct share used on site
 * @param {number} p.tariffC c/kWh import price
 * @param {number} p.fitC c/kWh feed-in
 * @param {number} p.systemCost installed cost after rebates
 * @param {number} [p.years=25]
 * @param {number} [p.degradationPct=0.5] annual output loss
 * @param {number} [p.escalationPct=3] annual tariff escalation
 * @param {number} [p.discountPct=5] discount rate for NPV
 * @param {number} [p.maintenancePerYear=0]
 */
export function financials({ annualKwh, selfConsumptionPct = 40, tariffC = 33, fitC = 5, systemCost, years = 25, degradationPct = 0.5, escalationPct = 3, discountPct = 5, maintenancePerYear = 0 }) {
    const cashflows = [-num(systemCost)];
    let cumulative = -num(systemCost);
    let payback = null;
    let npv = -num(systemCost);
    let year1Savings = 0;
    for (let y = 1; y <= years; y++) {
        const gen = num(annualKwh) * Math.pow(1 - num(degradationPct) / 100, y - 1);
        const escalate = Math.pow(1 + num(escalationPct) / 100, y - 1);
        const selfUse = gen * (num(selfConsumptionPct) / 100);
        const exported = gen - selfUse;
        const savings = (selfUse * num(tariffC) * escalate + exported * num(fitC)) / 100 - num(maintenancePerYear);
        if (y === 1) year1Savings = savings;
        cashflows.push(savings);
        const previous = cumulative;
        cumulative += savings;
        if (payback === null && cumulative >= 0) payback = y - 1 + (-previous / savings);
        npv += savings / Math.pow(1 + num(discountPct) / 100, y);
    }
    return {
        year1SavingsAud: round(year1Savings, 0),
        lifetimeSavingsAud: round(cumulative + num(systemCost), 0),
        netBenefitAud: round(cumulative, 0),
        paybackYears: payback === null ? null : round(payback, 1),
        npvAud: round(npv, 0),
        irrPct: round(irr(cashflows) * 100, 1),
        lcoeCPerKwh: round(lcoe({ systemCost, annualKwh, years, degradationPct, discountPct, maintenancePerYear }), 1)
    };
}

/** Internal rate of return by bisection. */
export function irr(cashflows, lo = -0.99, hi = 1.0) {
    const npvAt = (r) => cashflows.reduce((sum, cf, t) => sum + cf / Math.pow(1 + r, t), 0);
    if (npvAt(lo) * npvAt(hi) > 0) return npvAt(hi) > 0 ? hi : lo;
    for (let i = 0; i < 100; i++) {
        const mid = (lo + hi) / 2;
        if (npvAt(mid) > 0) lo = mid; else hi = mid;
    }
    return (lo + hi) / 2;
}

/** Levelised cost of energy in c/kWh. */
export function lcoe({ systemCost, annualKwh, years = 25, degradationPct = 0.5, discountPct = 5, maintenancePerYear = 0 }) {
    let costs = num(systemCost);
    let energy = 0;
    for (let y = 1; y <= years; y++) {
        const disc = Math.pow(1 + num(discountPct) / 100, y);
        costs += num(maintenancePerYear) / disc;
        energy += (num(annualKwh) * Math.pow(1 - num(degradationPct) / 100, y - 1)) / disc;
    }
    return energy > 0 ? (costs / energy) * 100 : Infinity;
}

export function co2Offset(annualKwh, factor = GRID_EMISSION_FACTOR_KG_PER_KWH) {
    const kg = num(annualKwh) * num(factor, GRID_EMISSION_FACTOR_KG_PER_KWH);
    return { kgPerYear: round(kg, 0), tonnesPerYear: round(kg / 1000, 2), treesEquivalent: round(kg / 21, 0) };
}

/** Self-consumption estimate from daily consumption vs generation and daytime share. */
export function selfConsumption({ dailyGenKwh, dailyLoadKwh, daytimeLoadSharePct = 35, batteryUsableKwh = 0 }) {
    const daytimeLoad = num(dailyLoadKwh) * (num(daytimeLoadSharePct) / 100);
    const direct = Math.min(num(dailyGenKwh), daytimeLoad);
    const surplus = Math.max(0, num(dailyGenKwh) - direct);
    const eveningLoad = num(dailyLoadKwh) - daytimeLoad;
    const stored = Math.min(surplus, num(batteryUsableKwh, 0) * 0.92, eveningLoad);
    const selfUsed = direct + stored;
    return {
        directKwh: round(direct, 2),
        storedKwh: round(stored, 2),
        exportedKwh: round(num(dailyGenKwh) - selfUsed, 2),
        selfConsumptionPct: num(dailyGenKwh) > 0 ? round((selfUsed / num(dailyGenKwh)) * 100, 1) : 0,
        gridImportKwh: round(Math.max(0, num(dailyLoadKwh) - selfUsed), 2)
    };
}

export const FEATURES = [
    { id: 'yield.cityYield', title: 'CEC city yield table', test: () => cityYield('Sydney') === 3.9 && cityYield('Darwin') === 4.4 },
    { id: 'yield.annualYield', title: 'Annual yield with orientation and losses', test: () => { const r = annualYield({ kw: 6.6, city: 'Sydney', tiltDeg: 25, azimuthDeg: 0 }); return r.annualKwh > 9000 && r.annualKwh < 9500; } },
    { id: 'yield.monthlyYield', title: 'Monthly yield distribution sums to annual', test: () => Math.abs(monthlyYield(12000).reduce((a, b) => a + b, 0) - 12000) <= 6 },
    { id: 'yield.financials', title: 'Payback, NPV, IRR and lifetime savings', test: () => { const r = financials({ annualKwh: 9300, selfConsumptionPct: 40, tariffC: 36, fitC: 5, systemCost: 6500 }); return r.paybackYears > 3 && r.paybackYears < 6 && r.npvAud > 0 && r.irrPct > 15; } },
    { id: 'yield.irr', title: 'IRR solver', test: () => Math.abs(irr([-100, 110]) - 0.1) < 0.001 },
    { id: 'yield.lcoe', title: 'LCOE', test: () => { const v = lcoe({ systemCost: 6500, annualKwh: 9300 }); return v > 4 && v < 8; } },
    { id: 'yield.co2Offset', title: 'CO₂ offset estimate', test: () => co2Offset(10000).tonnesPerYear === 6.8 },
    { id: 'yield.selfConsumption', title: 'Self-consumption with battery', test: () => { const a = selfConsumption({ dailyGenKwh: 25, dailyLoadKwh: 20 }); const b = selfConsumption({ dailyGenKwh: 25, dailyLoadKwh: 20, batteryUsableKwh: 10 }); return b.selfConsumptionPct > a.selfConsumptionPct; } }
];
