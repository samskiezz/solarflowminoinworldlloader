/**
 * Commissioning test records and pass criteria (AS/NZS 5033 Section 6,
 * AS/NZS 3000 Section 8 / AS/NZS 3017, AS/NZS 4777.1 Section 7, IEC 62446-1).
 */
import { num, round, correctVoc } from './pv.js';

export const TEST_DEFINITIONS = [
    { id: 'earth_continuity', title: 'Earth continuity (array frame / PCE / BESS to MET)', unit: 'Ω', criterion: '≤ 0.5 Ω (guidance; verify conductor size)', reference: 'AS/NZS 3000 Cl 8.3.5 / AS/NZS 3017 Cl 4' },
    { id: 'insulation_resistance_dc', title: 'PV array insulation resistance (+ and − to earth)', unit: 'MΩ', criterion: '≥ 1 MΩ at 500 V d.c. (array > 120 V)', reference: 'AS/NZS 5033:2021 Cl 6 / IEC 62446-1 Cl 6.7' },
    { id: 'insulation_resistance_ac', title: 'a.c. circuit insulation resistance', unit: 'MΩ', criterion: '≥ 1 MΩ at 500 V d.c.', reference: 'AS/NZS 3000 Cl 8.3.6' },
    { id: 'polarity', title: 'Polarity of d.c. strings and a.c. circuit', unit: 'pass/fail', criterion: 'Correct polarity at isolators and PCE', reference: 'AS/NZS 5033:2021 Cl 6 / AS/NZS 3000 Cl 8.3.7' },
    { id: 'string_voc', title: 'String open-circuit voltage', unit: 'V', criterion: 'Within ±5 % of the temperature-corrected expected Voc', reference: 'IEC 62446-1 Cl 6.4' },
    { id: 'string_isc', title: 'String short-circuit current', unit: 'A', criterion: 'Within ±10 % of expected Isc at measured irradiance (strings consistent with each other)', reference: 'IEC 62446-1 Cl 6.5' },
    { id: 'efli', title: 'Earth fault-loop impedance (a.c. circuit)', unit: 'Ω', criterion: 'Below the maximum for the protective device', reference: 'AS/NZS 3000 Cl 8.3.9' },
    { id: 'rcd', title: 'RCD operation (where fitted)', unit: 'ms', criterion: '≤ 300 ms at IΔn (type I) / ≤ 40 ms at 5 IΔn', reference: 'AS/NZS 3000 Cl 8.3.10' },
    { id: 'grid_voltage', title: 'Grid voltage at inverter terminals (no generation)', unit: 'V', criterion: '216–253 V (230 V +10 % / −6 %)', reference: 'AS 60038 / DNSP' },
    { id: 'grid_frequency', title: 'Grid frequency', unit: 'Hz', criterion: '49.85–50.15 Hz normal band', reference: 'NER frequency operating standard' },
    { id: 'anti_islanding', title: 'Anti-islanding (loss of mains) trip time', unit: 's', criterion: '≤ 2 s after loss of grid', reference: 'AS/NZS 4777.2:2020 Cl 4.4 / AS/NZS 4777.1 Cl 7' },
    { id: 'protection_settings', title: 'Inverter protection and region settings verified', unit: 'pass/fail', criterion: 'Region (Australia A/B/C / NZ) and export limit match DNSP requirements', reference: 'AS/NZS 4777.2:2020 Amd 2 / DNSP' },
    { id: 'functional', title: 'Functional test – shutdown procedure and isolators operate', unit: 'pass/fail', criterion: 'All isolators operate; shutdown procedure matches label', reference: 'AS/NZS 5033:2021 Cl 6 / IEC 62446-1 Cl 6.8' }
];

/** Expected string Voc at the measured cell/ambient temperature. */
export function expectedStringVoc({ modules, voc, tempCoeffVoc, tempC }) {
    return round(num(modules) * correctVoc(voc, tempCoeffVoc, tempC), 1);
}

/** Expected Isc scaled by irradiance. */
export function expectedIsc({ isc, irradiance = 1000 }) {
    return round(num(isc) * (num(irradiance, 1000) / 1000), 2);
}

/**
 * Evaluate a set of readings.
 * readings: { testId: value } where pass/fail tests take true/false.
 * context: { expectedVoc, expectedIsc, deviceMaxEfliOhm }
 */
export function evaluateTests(readings = {}, context = {}) {
    const results = [];
    const assess = (id, pass, detail) => results.push({ id, status: pass === null ? 'pending' : pass ? 'pass' : 'fail', detail });

    for (const def of TEST_DEFINITIONS) {
        const value = readings[def.id];
        if (value === undefined || value === null || value === '') { assess(def.id, null, 'Not recorded'); continue; }
        switch (def.id) {
            case 'earth_continuity': assess(def.id, num(value) <= 0.5, `${value} Ω`); break;
            case 'insulation_resistance_dc':
            case 'insulation_resistance_ac': assess(def.id, num(value) >= 1, `${value} MΩ`); break;
            case 'efli': assess(def.id, context.deviceMaxEfliOhm ? num(value) <= num(context.deviceMaxEfliOhm) : num(value) > 0, `${value} Ω (limit ${context.deviceMaxEfliOhm ?? 'n/a'})`); break;
            case 'rcd': assess(def.id, num(value) <= 300, `${value} ms`); break;
            case 'string_voc': {
                const expected = num(context.expectedVoc);
                const dev = expected ? Math.abs(num(value) - expected) / expected * 100 : null;
                assess(def.id, dev === null ? num(value) > 0 : dev <= 5, dev === null ? `${value} V (no expected value)` : `${value} V vs ${expected} V expected (${round(dev, 1)} %)`);
                break;
            }
            case 'string_isc': {
                const expected = num(context.expectedIsc);
                const dev = expected ? Math.abs(num(value) - expected) / expected * 100 : null;
                assess(def.id, dev === null ? num(value) > 0 : dev <= 10, dev === null ? `${value} A` : `${value} A vs ${expected} A expected (${round(dev, 1)} %)`);
                break;
            }
            case 'grid_voltage': assess(def.id, num(value) >= 216 && num(value) <= 253, `${value} V`); break;
            case 'grid_frequency': assess(def.id, num(value) >= 49.85 && num(value) <= 50.15, `${value} Hz`); break;
            case 'anti_islanding': assess(def.id, num(value) <= 2, `${value} s`); break;
            default: assess(def.id, value === true || value === 'pass', String(value));
        }
    }
    const failed = results.filter((r) => r.status === 'fail');
    const pending = results.filter((r) => r.status === 'pending');
    return {
        results,
        status: failed.length ? 'FAIL' : pending.length ? 'INCOMPLETE' : 'PASS',
        passed: results.filter((r) => r.status === 'pass').length,
        failed: failed.map((r) => r.id),
        pending: pending.map((r) => r.id),
        total: results.length
    };
}

/** Irradiance sanity: Isc/Voc tests need ≥ 400 W/m² to be meaningful (IEC 62446-1). */
export function irradianceAdequate(irradiance) {
    return num(irradiance, 0) >= 400;
}

export const FEATURES = [
    { id: 'commissioning.definitions', title: 'Commissioning test definitions (13 tests)', test: () => TEST_DEFINITIONS.length === 13 && TEST_DEFINITIONS.every((t) => t.reference) },
    { id: 'commissioning.expectedStringVoc', title: 'Expected string Voc at site temperature', test: () => expectedStringVoc({ modules: 10, voc: 49.5, tempCoeffVoc: -0.28, tempC: 35 }) === 481.1 },
    { id: 'commissioning.expectedIsc', title: 'Expected Isc at irradiance', test: () => expectedIsc({ isc: 13.9, irradiance: 800 }) === 11.12 },
    { id: 'commissioning.evaluate.pass', title: 'Commissioning evaluation PASS', test: () => { const r = evaluateTests({ earth_continuity: 0.2, insulation_resistance_dc: 200, insulation_resistance_ac: 150, polarity: true, string_voc: 480, string_isc: 11, efli: 0.8, rcd: 25, grid_voltage: 240, grid_frequency: 50.01, anti_islanding: 0.5, protection_settings: true, functional: true }, { expectedVoc: 481, expectedIsc: 11.1, deviceMaxEfliOhm: 1.37 }); return r.status === 'PASS' && r.passed === 13; } },
    { id: 'commissioning.evaluate.fail', title: 'Commissioning evaluation FAIL on insulation', test: () => evaluateTests({ insulation_resistance_dc: 0.4 }).failed.includes('insulation_resistance_dc') },
    { id: 'commissioning.evaluate.voc', title: 'Voc deviation beyond 5 % fails', test: () => evaluateTests({ string_voc: 420 }, { expectedVoc: 481 }).status === 'FAIL' },
    { id: 'commissioning.irradiance', title: 'Irradiance adequacy for I-V tests', test: () => irradianceAdequate(600) && !irradianceAdequate(200) }
];
