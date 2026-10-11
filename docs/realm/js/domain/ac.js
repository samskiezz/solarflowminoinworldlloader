/**
 * AC side calculations: voltage rise (AS/NZS 4777.1), voltage drop and cable
 * selection (AS/NZS 3008.1.1, AS/NZS 3000), phase balance and switchboard rules
 * (AS/NZS 4777.1:2024).
 */
import { num, round } from './pv.js';

/**
 * Three-phase mV/A·m values, copper, PVC 75 °C, multicore circular conductors
 * (AS/NZS 3008.1.1 Table 42 column values as commonly transcribed). Single-phase
 * values are these × 2/√3 (Cl 4.2). Verify against the current edition before
 * certifying a design.
 */
export const MV_PER_AM_3PH = {
    1: 42.6, 1.5: 26.3, 2.5: 15.9, 4: 9.95, 6: 6.64, 10: 3.94, 16: 2.48, 25: 1.56,
    35: 1.13, 50: 0.835, 70: 0.584, 95: 0.429, 120: 0.349, 150: 0.293, 185: 0.248, 240: 0.205
};
const SINGLE_PHASE_FACTOR = 2 / Math.sqrt(3);

/** Current-carrying capacity (A), Cu, PVC 75 °C, multicore, clipped direct / unenclosed, 40 °C ambient (indicative). */
export const CURRENT_RATINGS_A = {
    1: 14, 1.5: 18, 2.5: 25, 4: 33, 6: 42, 10: 58, 16: 77, 25: 101, 35: 125, 50: 151, 70: 192, 95: 232, 120: 269, 150: 308, 185: 352, 240: 415
};

/** AS/NZS 3008.1.1 Table 27-style ambient temperature factors for 75 °C PVC. */
export const AMBIENT_FACTORS = { 25: 1.12, 30: 1.08, 35: 1.04, 40: 1.0, 45: 0.93, 50: 0.85, 55: 0.76, 60: 0.65 };
/** Grouping factors (circuits bunched, indicative Table 22 values). */
export const GROUPING_FACTORS = { 1: 1.0, 2: 0.8, 3: 0.7, 4: 0.65, 5: 0.6, 6: 0.57 };

export const VOLTAGE_RISE_LIMIT_PCT = 2; // AS/NZS 4777.1 (point of supply to inverter a.c. terminals)
export const VOLTAGE_DROP_LIMIT_PCT = 5; // AS/NZS 3000:2018 Cl 3.6.2
export const PHASE_IMBALANCE_LIMIT_KVA = 5; // AS/NZS 4777.1 (≈21.7 A at 230 V) between phases
export const SINGLE_PHASE_MAX_KVA = 30; // AS/NZS 4777.1:2024 (subject to supply and protection)
export const MAX_INVERTER_MAIN_SWITCHES = 2; // AS/NZS 4777.1:2024 switchboards with loads

export const CABLE_SIZES = Object.keys(MV_PER_AM_3PH).map(Number);

export function mvPerAm(cableMm2, phases = 1) {
    const base = MV_PER_AM_3PH[num(cableMm2)];
    if (!base) return null;
    return phases === 3 ? base : base * SINGLE_PHASE_FACTOR;
}

/** Inverter rated current from kW/kVA. */
export function inverterCurrent({ kw, kva, phases = 1, voltage = phases === 3 ? 400 : 230, powerFactor = 1 }) {
    const apparent = kva ? num(kva) : num(kw) / num(powerFactor, 1);
    const amps = phases === 3 ? (apparent * 1000) / (Math.sqrt(3) * voltage) : (apparent * 1000) / voltage;
    return round(amps, 2);
}

/** Voltage rise/drop for one cable segment. */
export function voltageRise({ currentA, lengthM, cableMm2, phases = 1, voltage = phases === 3 ? 400 : 230, powerFactor = 1 }) {
    const mv = mvPerAm(cableMm2, phases);
    if (mv === null) return { error: `Unknown cable size ${cableMm2} mm²` };
    const volts = (mv * num(currentA) * num(lengthM) * num(powerFactor, 1)) / 1000;
    const pct = (volts / voltage) * 100;
    return { volts: round(volts, 3), pct: round(pct, 3), mvPerAm: round(mv, 3), voltage, reference: 'AS/NZS 3008.1.1 Cl 4.2 (mV/A·m method)' };
}

/** Total rise over several segments (point of supply → switchboard → inverter). */
export function voltageRisePath(segments, limitPct = VOLTAGE_RISE_LIMIT_PCT) {
    const results = segments.map((s) => ({ ...s, ...voltageRise(s) }));
    const totalPct = round(results.reduce((sum, r) => sum + (r.pct || 0), 0), 3);
    const totalV = round(results.reduce((sum, r) => sum + (r.volts || 0), 0), 3);
    return {
        segments: results,
        totalPct,
        totalV,
        limitPct,
        withinLimit: totalPct <= limitPct,
        reference: limitPct === VOLTAGE_RISE_LIMIT_PCT ? 'AS/NZS 4777.1: ≤ 2 % rise from point of supply to inverter a.c. terminals' : `Limit ${limitPct} %`
    };
}

/** Longest run that keeps a segment within the limit. */
export function maxCableLength({ currentA, cableMm2, phases = 1, voltage, limitPct = VOLTAGE_RISE_LIMIT_PCT, powerFactor = 1 }) {
    const mv = mvPerAm(cableMm2, phases);
    if (!mv) return null;
    const v = voltage || (phases === 3 ? 400 : 230);
    const allowedVolts = (limitPct / 100) * v;
    return round((allowedVolts * 1000) / (mv * num(currentA) * num(powerFactor, 1)), 1);
}

/** Derated current rating for a cable size. */
export function deratedRating(cableMm2, { ambientC = 40, grouping = 1 } = {}) {
    const base = CURRENT_RATINGS_A[num(cableMm2)];
    if (!base) return null;
    const ambientKeys = Object.keys(AMBIENT_FACTORS).map(Number).sort((a, b) => a - b);
    const ambientKey = ambientKeys.find((k) => k >= num(ambientC, 40)) ?? 60;
    const g = GROUPING_FACTORS[Math.min(6, Math.max(1, Math.round(num(grouping, 1))))];
    return round(base * AMBIENT_FACTORS[ambientKey] * g, 1);
}

/** Smallest cable satisfying both current rating and voltage rise/drop. */
export function selectAcCable({ currentA, lengthM, phases = 1, voltage, limitPct = VOLTAGE_RISE_LIMIT_PCT, ambientC = 40, grouping = 1, powerFactor = 1 }) {
    for (const size of CABLE_SIZES) {
        const rating = deratedRating(size, { ambientC, grouping });
        if (rating < num(currentA)) continue;
        const rise = voltageRise({ currentA, lengthM, cableMm2: size, phases, voltage, powerFactor });
        if (rise.pct <= limitPct) {
            return { cableMm2: size, ratingA: rating, ...rise, limitPct, governedBy: rating / num(currentA) < 1.5 ? 'current rating' : 'voltage rise' };
        }
    }
    return { cableMm2: null, error: 'No standard size satisfies the limits; split the run or move the switchboard' };
}

/** Phase balance for single-phase inverters across a three-phase supply. */
export function checkPhaseBalance(kvaByPhase, limitKva = PHASE_IMBALANCE_LIMIT_KVA) {
    const values = ['A', 'B', 'C'].map((p) => num(kvaByPhase[p], 0));
    const max = Math.max(...values);
    const min = Math.min(...values);
    const imbalance = round(max - min, 3);
    return {
        imbalanceKva: imbalance,
        imbalanceA: round((imbalance * 1000) / 230, 1),
        withinLimit: imbalance <= limitKva,
        limitKva,
        suggestion: imbalance > limitKva ? `Move ${round((imbalance - limitKva) / 2, 2)} kVA or more from the heaviest phase` : null,
        reference: 'AS/NZS 4777.1 phase balance (≤ 5 kVA / 21.7 A difference between phases)'
    };
}

/** Single-phase capacity rule (2024 edition). */
export function checkSinglePhaseCapacity(kva) {
    return {
        kva: num(kva),
        withinLimit: num(kva) <= SINGLE_PHASE_MAX_KVA,
        limitKva: SINGLE_PHASE_MAX_KVA,
        note: 'Subject to the available supply and overcurrent protection; many DNSPs still limit single-phase export to 5 kW. Check the DNSP connection agreement.',
        reference: 'AS/NZS 4777.1:2024 Cl 3 (phase balance and single-phase limits)'
    };
}

/** Inverter main switch rule for a switchboard that also has loads. */
export function inverterMainSwitchRule(inverterMainSwitches, boardHasLoads = true) {
    const count = Math.max(0, Math.round(num(inverterMainSwitches, 0)));
    const masterRequired = boardHasLoads && count > MAX_INVERTER_MAIN_SWITCHES;
    return {
        count,
        masterSwitchRequired: masterRequired,
        compliant: !masterRequired || count === 0,
        reference: 'AS/NZS 4777.1:2024: switchboards with loads may have at most two inverter main switches, otherwise a single master switch isolating all inverters is required'
    };
}

/** Export-limit check against the DNSP allowance. */
export function checkExportLimit({ inverterKw, exportLimitKw, phases = 1 }) {
    const limit = num(exportLimitKw, phases === 3 ? 15 : 5);
    return {
        inverterKw: num(inverterKw),
        exportLimitKw: limit,
        exportLimitingRequired: num(inverterKw) > limit,
        reference: 'DNSP connection standards (typically 5 kW single-phase, 10–30 kW three-phase without export limiting)'
    };
}

export const FEATURES = [
    { id: 'ac.mvPerAm', title: 'mV/A·m lookup (3-phase and single-phase)', test: () => Math.abs(mvPerAm(6, 1) - 7.667) < 0.01 && mvPerAm(6, 3) === 6.64 },
    { id: 'ac.inverterCurrent', title: 'Inverter rated current', test: () => inverterCurrent({ kw: 5 }) === 21.74 && inverterCurrent({ kw: 10, phases: 3 }) === 14.43 },
    { id: 'ac.voltageRise', title: 'Voltage rise for a segment', test: () => { const r = voltageRise({ currentA: 21.74, lengthM: 25, cableMm2: 6 }); return r.pct > 1.8 && r.pct < 1.9; } },
    { id: 'ac.voltageRisePath', title: 'Voltage rise over a path vs 2 % limit', test: () => { const r = voltageRisePath([{ currentA: 21.74, lengthM: 10, cableMm2: 16 }, { currentA: 21.74, lengthM: 20, cableMm2: 6 }]); return r.withinLimit && r.segments.length === 2; } },
    { id: 'ac.voltageRisePath.fail', title: 'Voltage rise path failure detection', test: () => voltageRisePath([{ currentA: 21.74, lengthM: 40, cableMm2: 4 }]).withinLimit === false },
    { id: 'ac.maxCableLength', title: 'Maximum cable length for a limit', test: () => maxCableLength({ currentA: 21.74, cableMm2: 6, phases: 1 }) > 25 },
    { id: 'ac.deratedRating', title: 'Current rating with ambient and grouping derating', test: () => deratedRating(6) === 42 && deratedRating(6, { ambientC: 50, grouping: 2 }) < 30 },
    { id: 'ac.selectAcCable', title: 'AC cable selection (rating + rise)', test: () => { const r = selectAcCable({ currentA: 21.74, lengthM: 30, phases: 1 }); return r.cableMm2 === 10; } },
    { id: 'ac.checkPhaseBalance', title: 'Phase balance check (5 kVA)', test: () => checkPhaseBalance({ A: 5, B: 0, C: 0 }).withinLimit && !checkPhaseBalance({ A: 10, B: 2, C: 2 }).withinLimit },
    { id: 'ac.checkSinglePhaseCapacity', title: 'Single-phase capacity rule (30 kVA)', test: () => checkSinglePhaseCapacity(10).withinLimit && !checkSinglePhaseCapacity(31).withinLimit },
    { id: 'ac.inverterMainSwitchRule', title: 'Inverter main switch / master switch rule', test: () => !inverterMainSwitchRule(2).masterSwitchRequired && inverterMainSwitchRule(3).masterSwitchRequired },
    { id: 'ac.checkExportLimit', title: 'DNSP export limit check', test: () => checkExportLimit({ inverterKw: 8, exportLimitKw: 5 }).exportLimitingRequired }
];
