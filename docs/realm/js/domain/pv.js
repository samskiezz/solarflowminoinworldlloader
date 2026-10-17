/**
 * PV array design calculations (AS/NZS 5033:2021, AS/NZS 4777.1:2024, CEC guidelines).
 *
 * Every function is pure. Values that come from a standard carry a `reference`
 * so the UI can show the clause. Where a figure is a widely used guideline
 * rather than a clause (e.g. 3 % DC voltage drop) it is labelled as such.
 */

export const STC_TEMP = 25;

/** AS/NZS 5033:2021 Table 4.1 style multipliers for crystalline silicon when the manufacturer's Voc coefficient is unknown. */
export const VOC_CORRECTION_FACTORS = [
    { minTemp: 20, maxTemp: 24, factor: 1.02 },
    { minTemp: 15, maxTemp: 19, factor: 1.04 },
    { minTemp: 10, maxTemp: 14, factor: 1.06 },
    { minTemp: 5, maxTemp: 9, factor: 1.08 },
    { minTemp: 0, maxTemp: 4, factor: 1.10 },
    { minTemp: -5, maxTemp: -1, factor: 1.12 },
    { minTemp: -10, maxTemp: -6, factor: 1.14 },
    { minTemp: -15, maxTemp: -11, factor: 1.16 },
    { minTemp: -20, maxTemp: -16, factor: 1.18 },
    { minTemp: -25, maxTemp: -21, factor: 1.20 },
    { minTemp: -30, maxTemp: -26, factor: 1.21 },
    { minTemp: -35, maxTemp: -31, factor: 1.23 },
    { minTemp: -40, maxTemp: -36, factor: 1.25 }
];

/** Maximum PV array voltage limits by installation class (AS/NZS 5033:2021 with AS/NZS 4777.1:2024). */
export const SYSTEM_VOLTAGE_LIMITS = {
    domestic: { limit: 1000, reference: 'AS/NZS 5033:2021 Cl 4.2 with AS/NZS 4777.1:2024 Cl 4.3.2 (was 600 V under 4777.1:2016)' },
    domestic_pre_2024: { limit: 600, reference: 'AS/NZS 4777.1:2016 (600 V d.c. domestic limit)' },
    commercial: { limit: 1500, reference: 'AS/NZS 5033:2021 (non-domestic arrays up to 1500 V d.c.)' },
    elv: { limit: 120, reference: 'AS/NZS 5033:2021 ELV arrays (≤120 V d.c.)' }
};

/** CEC/CER STC design guideline: inverter AC rating must be at least 75 % of array DC rating. */
export const MAX_DC_AC_RATIO = 1.333;

export const DC_VOLTAGE_DROP_LIMIT_PCT = 3; // CEC guideline / AS/NZS 5033 commentary
export const STRING_CABLE_CURRENT_FACTOR = 1.25; // AS/NZS 5033:2021 Cl 4.3.x: 1.25 × Isc

const COPPER_RESISTIVITY_OHM_MM2_PER_M = 0.0225; // Cu at ~60 °C operating temperature

export function num(value, fallback = NaN) {
    const n = typeof value === 'number' ? value : parseFloat(value);
    return Number.isFinite(n) ? n : fallback;
}

/** Factor from the 5033 table for a minimum site temperature. */
export function vocFactorFromTable(tMin) {
    const t = Math.round(num(tMin, 25));
    if (t >= 25) return 1.0;
    const row = VOC_CORRECTION_FACTORS.find((r) => t >= r.minTemp && t <= r.maxTemp);
    return row ? row.factor : 1.25;
}

/** Voc corrected to the minimum expected cell temperature using the manufacturer coefficient (%/°C, negative). */
export function correctVoc(voc, tempCoeffVocPct, tMin, tStc = STC_TEMP) {
    const coeff = num(tempCoeffVocPct, NaN);
    if (!Number.isFinite(coeff)) return num(voc) * vocFactorFromTable(tMin);
    return num(voc) * (1 + (coeff / 100) * (num(tMin) - tStc));
}

/** Vmp at the maximum expected cell temperature (Pmax coefficient used as proxy for Vmp coefficient). */
export function correctVmp(vmp, tempCoeffPct, tCellMax, tStc = STC_TEMP) {
    const coeff = num(tempCoeffPct, -0.35);
    return num(vmp) * (1 + (coeff / 100) * (num(tCellMax) - tStc));
}

/** NOCT model: Tcell = Tamb + (NOCT − 20) / 800 × G. */
export function cellTemperature(tAmbient, irradiance = 1000, noct = 45) {
    return num(tAmbient) + ((num(noct) - 20) / 800) * num(irradiance);
}

/** Maximum array voltage for N modules in series at the site minimum temperature. */
export function arrayMaxVoltage(modulesPerString, voc, tempCoeffVocPct, tMin) {
    return num(modulesPerString) * correctVoc(voc, tempCoeffVocPct, tMin);
}

/** Voltage limit that applies to the installation class. */
export function systemVoltageLimit(installationClass = 'domestic') {
    return SYSTEM_VOLTAGE_LIMITS[installationClass] || SYSTEM_VOLTAGE_LIMITS.domestic;
}

/**
 * String sizing: how many modules may be connected in series for an inverter MPPT.
 * @param {object} p
 * @param {object} p.module  { voc, vmp, isc, imp, tempCoeffVoc (%/°C), tempCoeffPmax (%/°C), watts }
 * @param {object} p.inverter { maxDcVoltage, mpptMin, mpptMax, maxInputCurrent, maxDcPower }
 * @param {object} p.site { tMin (°C), tAmbientMax (°C) }
 * @param {string} [p.installationClass]
 */
export function stringSizing({ module, inverter, site, installationClass = 'domestic' }) {
    const voc = num(module.voc);
    const vmp = num(module.vmp);
    const tMin = num(site.tMin, 0);
    const tCellMax = cellTemperature(num(site.tAmbientMax, 40));
    const vocCold = correctVoc(voc, module.tempCoeffVoc, tMin);
    const vmpHot = correctVmp(vmp, module.tempCoeffPmax ?? module.tempCoeffVmp, tCellMax);
    const vmpCold = correctVmp(vmp, module.tempCoeffPmax ?? module.tempCoeffVmp, tMin);

    const classLimit = systemVoltageLimit(installationClass);
    const voltageCeiling = Math.min(num(inverter.maxDcVoltage, Infinity), classLimit.limit, num(module.maxSystemVoltage, Infinity));
    const maxByVoltage = Math.floor(voltageCeiling / vocCold);
    const maxByMppt = inverter.mpptMax ? Math.floor(num(inverter.mpptMax) / vmpCold) : Infinity;
    const minByMppt = inverter.mpptMin ? Math.ceil(num(inverter.mpptMin) / vmpHot) : 1;

    const maxModules = Math.max(0, Math.min(maxByVoltage, maxByMppt));
    const minModules = Math.max(1, minByMppt);
    const feasible = maxModules >= minModules;

    const warnings = [];
    if (!feasible) warnings.push('No string length satisfies both the cold Voc limit and the hot Vmp MPPT minimum.');
    if (module.isc && inverter.maxInputCurrent && num(module.isc) > num(inverter.maxInputCurrent)) {
        warnings.push(`Module Isc ${module.isc} A exceeds MPPT input current ${inverter.maxInputCurrent} A.`);
    }

    return {
        feasible,
        minModules,
        maxModules,
        recommended: feasible ? maxModules : null,
        vocCold: round(vocCold, 2),
        vmpHot: round(vmpHot, 2),
        vmpCold: round(vmpCold, 2),
        tCellMax: round(tCellMax, 1),
        voltageCeiling,
        voltageCeilingSource: voltageCeiling === classLimit.limit ? classLimit.reference : 'Inverter maximum d.c. input voltage',
        maxArrayVoltageAtMax: round(maxModules * vocCold, 1),
        limits: { maxByVoltage, maxByMppt, minByMppt },
        warnings,
        reference: 'AS/NZS 5033:2021 Cl 4.2 (array maximum voltage), inverter MPPT window'
    };
}

/** DC/AC ratio and CEC oversizing eligibility. */
export function dcAcRatio(arrayKwDc, inverterKwAc) {
    const ratio = num(arrayKwDc) / num(inverterKwAc);
    return {
        ratio: round(ratio, 3),
        withinLimit: ratio <= MAX_DC_AC_RATIO,
        limit: MAX_DC_AC_RATIO,
        reference: 'CEC design guideline: inverter rating ≥ 75 % of array rating for STC eligibility'
    };
}

/** Required string / array cable current rating. */
export function stringCableCurrent(isc, stringsInParallel = 1, hasStringProtection = false, protectionRatingA = null) {
    const perString = STRING_CABLE_CURRENT_FACTOR * num(isc);
    const arrayCurrent = hasStringProtection && protectionRatingA
        ? num(protectionRatingA)
        : STRING_CABLE_CURRENT_FACTOR * num(isc) * Math.max(1, num(stringsInParallel) - (num(stringsInParallel) > 1 ? 1 : 0));
    return {
        stringCableMinA: round(perString, 2),
        arrayCableMinA: round(Math.max(perString, arrayCurrent), 2),
        reference: 'AS/NZS 5033:2021 Cl 4.3 (1.25 × Isc; array cables sized for fault current or protection rating)'
    };
}

/** DC voltage drop for a string run (route length one way). */
export function dcVoltageDrop({ currentA, lengthM, cableMm2, voltageV, resistivity = COPPER_RESISTIVITY_OHM_MM2_PER_M }) {
    const resistance = (resistivity * 2 * num(lengthM)) / num(cableMm2); // go and return
    const drop = resistance * num(currentA);
    const pct = (drop / num(voltageV)) * 100;
    return {
        dropV: round(drop, 2),
        dropPct: round(pct, 2),
        withinLimit: pct <= DC_VOLTAGE_DROP_LIMIT_PCT,
        limitPct: DC_VOLTAGE_DROP_LIMIT_PCT,
        reference: 'CEC guideline: PV array to inverter d.c. voltage drop ≤ 3 %'
    };
}

export const DC_CABLE_SIZES = [2.5, 4, 6, 10, 16, 25, 35];

/** Smallest standard DC cable that keeps voltage drop within the limit. */
export function selectDcCable({ currentA, lengthM, voltageV, maxDropPct = DC_VOLTAGE_DROP_LIMIT_PCT }) {
    for (const size of DC_CABLE_SIZES) {
        const result = dcVoltageDrop({ currentA, lengthM, cableMm2: size, voltageV });
        if (result.dropPct <= maxDropPct) return { cableMm2: size, ...result };
    }
    return { cableMm2: null, withinLimit: false, dropPct: null, reference: 'No standard size keeps the drop within limit; shorten the run' };
}

/** Rough generation factor for tilt/azimuth (Australian, north = 0°). Interpolated from CEC design-guide style tables. */
const ORIENTATION_TABLE = {
    // azimuth: factors at tilt 0, 10, 20, 30, 40, 50, 60, 90
    0: [0.90, 0.96, 0.99, 1.00, 0.99, 0.96, 0.91, 0.65],
    45: [0.90, 0.95, 0.96, 0.96, 0.94, 0.90, 0.85, 0.60],
    90: [0.90, 0.91, 0.90, 0.88, 0.85, 0.80, 0.74, 0.52],
    135: [0.90, 0.86, 0.82, 0.77, 0.72, 0.66, 0.60, 0.42],
    180: [0.90, 0.84, 0.77, 0.70, 0.63, 0.56, 0.49, 0.33]
};
const TILTS = [0, 10, 20, 30, 40, 50, 60, 90];

export function orientationFactor(tiltDeg, azimuthDeg) {
    const tilt = Math.max(0, Math.min(90, num(tiltDeg, 0)));
    let az = Math.abs(((num(azimuthDeg, 0) % 360) + 360) % 360);
    if (az > 180) az = 360 - az;
    const azKeys = [0, 45, 90, 135, 180];
    const azHi = azKeys.find((k) => k >= az) ?? 180;
    const azLo = azKeys.filter((k) => k <= az).pop() ?? 0;
    const tHiIndex = TILTS.findIndex((t) => t >= tilt);
    const tHi = TILTS[tHiIndex];
    const tLo = tHiIndex > 0 ? TILTS[tHiIndex - 1] : TILTS[0];
    const tw = tHi === tLo ? 0 : (tilt - tLo) / (tHi - tLo);
    const aw = azHi === azLo ? 0 : (az - azLo) / (azHi - azLo);
    const lerp = (a, b, w) => a + (b - a) * w;
    const rowLo = ORIENTATION_TABLE[azLo];
    const rowHi = ORIENTATION_TABLE[azHi];
    const fLo = lerp(rowLo[TILTS.indexOf(tLo)], rowLo[TILTS.indexOf(tHi)], tw);
    const fHi = lerp(rowHi[TILTS.indexOf(tLo)], rowHi[TILTS.indexOf(tHi)], tw);
    return round(lerp(fLo, fHi, aw), 3);
}

/** Array layout helper: modules that fit on a rectangular roof area with a clearance margin. */
export function arrayLayout({ roofWidthM, roofDepthM, moduleWidthM = 1.134, moduleLengthM = 1.722, marginM = 0.2, portrait = true }) {
    const w = Math.max(0, num(roofWidthM) - 2 * num(marginM));
    const d = Math.max(0, num(roofDepthM) - 2 * num(marginM));
    const mw = portrait ? num(moduleWidthM) : num(moduleLengthM);
    const ml = portrait ? num(moduleLengthM) : num(moduleWidthM);
    const columns = Math.floor(w / mw);
    const rows = Math.floor(d / ml);
    return { columns, rows, modules: Math.max(0, columns * rows), usedAreaM2: round(columns * mw * rows * ml, 2) };
}

export function round(value, decimals = 2) {
    const m = Math.pow(10, decimals);
    return Math.round(num(value, 0) * m) / m;
}

/** Self-tests used by the feature registry and the Node test-suite. */
export const FEATURES = [
    { id: 'pv.correctVoc', title: 'Voc temperature correction (coefficient)', test: () => Math.abs(correctVoc(49.5, -0.28, -5) - 53.66) < 0.05 },
    { id: 'pv.vocFactorTable', title: 'Voc correction factor table (AS/NZS 5033 Table 4.1 style)', test: () => vocFactorFromTable(2) === 1.10 && vocFactorFromTable(30) === 1 },
    { id: 'pv.correctVmp', title: 'Vmp hot-cell correction', test: () => correctVmp(41, -0.35, 65) < 41 },
    { id: 'pv.cellTemperature', title: 'NOCT cell temperature model', test: () => Math.abs(cellTemperature(40, 1000, 45) - 71.25) < 0.01 },
    { id: 'pv.arrayMaxVoltage', title: 'Array maximum voltage', test: () => arrayMaxVoltage(18, 49.5, -0.28, -5) > 960 },
    { id: 'pv.systemVoltageLimit', title: 'Installation class voltage limits', test: () => systemVoltageLimit('domestic').limit === 1000 && systemVoltageLimit('commercial').limit === 1500 },
    { id: 'pv.stringSizing', title: 'String sizing against Voc, MPPT and class limits', test: () => { const r = stringSizing({ module: { voc: 49.5, vmp: 41.2, isc: 13.9, tempCoeffVoc: -0.28, tempCoeffPmax: -0.35 }, inverter: { maxDcVoltage: 1000, mpptMin: 200, mpptMax: 800, maxInputCurrent: 16 }, site: { tMin: -5, tAmbientMax: 42 } }); return r.feasible && r.maxModules === 17 && r.limits.maxByVoltage === 18 && r.minModules === 6; } },
    { id: 'pv.stringSizing.infeasible', title: 'String sizing reports infeasible combinations', test: () => stringSizing({ module: { voc: 49.5, vmp: 41.2, tempCoeffVoc: -0.28 }, inverter: { maxDcVoltage: 150, mpptMin: 200, mpptMax: 800 }, site: { tMin: 0, tAmbientMax: 40 } }).feasible === false },
    { id: 'pv.dcAcRatio', title: 'DC/AC ratio and 133 % oversizing check', test: () => dcAcRatio(6.6, 5).withinLimit && !dcAcRatio(8, 5).withinLimit },
    { id: 'pv.stringCableCurrent', title: 'String/array cable current (1.25 × Isc)', test: () => stringCableCurrent(13.9).stringCableMinA === 17.38 },
    { id: 'pv.dcVoltageDrop', title: 'DC voltage drop percentage', test: () => { const r = dcVoltageDrop({ currentA: 13, lengthM: 25, cableMm2: 6, voltageV: 700 }); return r.withinLimit && r.dropPct > 0; } },
    { id: 'pv.selectDcCable', title: 'DC cable selection for 3 % limit', test: () => selectDcCable({ currentA: 13, lengthM: 60, voltageV: 400 }).cableMm2 >= 4 },
    { id: 'pv.orientationFactor', title: 'Tilt/azimuth generation factor', test: () => orientationFactor(30, 0) === 1 && orientationFactor(30, 180) < 0.75 && orientationFactor(20, 70) > 0.85 },
    { id: 'pv.arrayLayout', title: 'Roof layout module count', test: () => arrayLayout({ roofWidthM: 8, roofDepthM: 6 }).modules === 18 }
];
