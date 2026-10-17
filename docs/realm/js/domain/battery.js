/**
 * Battery energy storage: location rules (AS/NZS 5139:2019 + Amd 1:2025),
 * sizing from a load profile, backup capability and STC entitlement
 * (Cheaper Home Batteries Program, 2025–2030).
 */
import { num, round } from './pv.js';

/** Locations where a battery system must not be installed (lithium, domestic). */
export const RESTRICTED_LOCATIONS = [
    { id: 'habitable_room', label: 'Habitable room (bedroom, living, kitchen, study…)', reference: 'AS/NZS 5139:2019 Cl 4.2 (lithium batteries not in habitable rooms)' },
    { id: 'ceiling_space', label: 'Ceiling / roof space', reference: 'AS/NZS 5139:2019 Cl 4.2' },
    { id: 'wall_cavity', label: 'Wall cavity', reference: 'AS/NZS 5139:2019 Cl 4.2' },
    { id: 'under_stairs', label: 'Under stairways or access walkways', reference: 'AS/NZS 5139:2019 Cl 4.2' },
    { id: 'escape_route', label: 'On an evacuation / escape route', reference: 'AS/NZS 5139:2019 Cl 4.2' },
    { id: 'floor_space_hab', label: 'Under floor of a habitable room (unless non-combustible separation)', reference: 'AS/NZS 5139:2019 Cl 4.2' }
];

export const CLEARANCE_MM = 600; // from exits, windows, vents, hot water units, air-conditioning units
export const BARRIER_EXTENT = { sideMm: 600, aboveMm: 900 }; // non-combustible barrier on combustible wall adjoining habitable room

/**
 * Assess a proposed battery location.
 * @param {object} p
 * @param {string} p.locationType one of RESTRICTED_LOCATIONS ids or 'garage' | 'external_wall' | 'dedicated_room' | 'carport' | 'other'
 * @param {number} [p.distanceToExitMm]
 * @param {number} [p.distanceToWindowMm]
 * @param {number} [p.distanceToHotWaterMm]
 * @param {boolean} [p.wallCombustible]
 * @param {boolean} [p.adjoinsHabitableRoom]
 * @param {boolean} [p.barrierInstalled]
 * @param {number} [p.heightAboveFloorMm]
 * @param {boolean} [p.weatherProtected] for external installs
 * @param {boolean} [p.impactProtected] for carports/driveways
 */
export function assessBatteryLocation(p = {}) {
    const findings = [];
    const restricted = RESTRICTED_LOCATIONS.find((r) => r.id === p.locationType);
    if (restricted) findings.push({ level: 'fail', text: `Restricted location: ${restricted.label}`, reference: restricted.reference });

    const clearance = (label, value) => {
        if (value === undefined || value === null || value === '') return;
        if (num(value) < CLEARANCE_MM) findings.push({ level: 'fail', text: `${label} is ${value} mm away; minimum ${CLEARANCE_MM} mm`, reference: 'AS/NZS 5139:2019 Cl 4.2 clearances' });
    };
    clearance('Exit / door', p.distanceToExitMm);
    clearance('Window or vent', p.distanceToWindowMm);
    clearance('Hot water / air-conditioning unit', p.distanceToHotWaterMm);

    if (p.wallCombustible && p.adjoinsHabitableRoom && !p.barrierInstalled) {
        findings.push({ level: 'fail', text: `Combustible wall adjoining a habitable room needs a non-combustible barrier extending ${BARRIER_EXTENT.sideMm} mm each side and ${BARRIER_EXTENT.aboveMm} mm above the battery`, reference: 'AS/NZS 5139:2019 Cl 4.2 / 5.3 (barrier)' });
    }
    if (p.locationType === 'external_wall' && p.weatherProtected === false) {
        findings.push({ level: 'warn', text: 'External install must be weather protected to the manufacturer IP rating', reference: 'AS/NZS 5139:2019 Cl 4.3 (environment)' });
    }
    if (p.locationType === 'carport' && p.impactProtected === false) {
        findings.push({ level: 'warn', text: 'Carport / driveway locations need mechanical (bollard) protection', reference: 'AS/NZS 5139:2019 Cl 4.2 (mechanical protection)' });
    }
    if (p.heightAboveFloorMm !== undefined && num(p.heightAboveFloorMm) < 100 && p.locationType !== 'dedicated_room') {
        findings.push({ level: 'warn', text: 'Mount above possible water ingress level (manufacturer height requirements)', reference: 'Manufacturer instructions / AS/NZS 5139 Cl 4.3' });
    }

    const status = findings.some((f) => f.level === 'fail') ? 'FAIL' : findings.length ? 'WARNING' : 'PASS';
    return { status, findings, reference: 'AS/NZS 5139:2019 Section 4 (location, clearances, barriers)' };
}

/** Battery sizing from daily consumption. */
export function sizeBattery({ dailyKwh, eveningSharePct = 60, autonomyDays = 1, depthOfDischargePct = 90, roundTripEffPct = 92, reservePct = 10 }) {
    const eveningKwh = num(dailyKwh) * (num(eveningSharePct) / 100) * num(autonomyDays, 1);
    const usableNeeded = eveningKwh / (num(roundTripEffPct, 92) / 100);
    const nominalNeeded = usableNeeded / (num(depthOfDischargePct, 90) / 100) * (1 + num(reservePct, 0) / 100);
    return {
        eveningKwh: round(eveningKwh, 2),
        usableKwhRequired: round(usableNeeded, 2),
        nominalKwhRequired: round(nominalNeeded, 2),
        recommendedUsableKwh: round(Math.ceil(usableNeeded / 2.5) * 2.5, 1),
        note: 'Sizing covers overnight self-consumption; add backup loads separately'
    };
}

/** Backup capability: hours the battery can carry a set of loads. */
export function backupCapability({ usableKwh, continuousKw, loads = [] }) {
    const loadKw = loads.length ? loads.reduce((sum, l) => sum + (num(l.watts) * num(l.quantity, 1)) / 1000, 0) : num(continuousKw, 1);
    const hours = loadKw > 0 ? num(usableKwh) / loadKw : Infinity;
    return {
        loadKw: round(loadKw, 3),
        hours: Number.isFinite(hours) ? round(hours, 1) : null,
        withinInverterRating: num(continuousKw) ? loadKw <= num(continuousKw) : null,
        note: 'Surge loads (motors, pumps) must be checked against the inverter peak rating'
    };
}

/** Cheaper Home Batteries Program STC factor schedule (STCs per usable kWh). */
export const BATTERY_STC_SCHEDULE = [
    { from: '2025-07-01', factor: 9.3 },
    { from: '2026-01-01', factor: 8.4 },
    { from: '2026-05-01', factor: 6.8 },
    { from: '2027-01-01', factor: 5.7 },
    { from: '2027-07-01', factor: 5.2 },
    { from: '2028-01-01', factor: 4.6 },
    { from: '2028-07-01', factor: 4.1 },
    { from: '2029-01-01', factor: 3.6 },
    { from: '2029-07-01', factor: 3.1 },
    { from: '2030-01-01', factor: 2.6 },
    { from: '2030-07-01', factor: 2.1 }
];
export const BATTERY_TIERS_FROM = '2026-05-01';
export const BATTERY_TIERS = [
    { uptoKwh: 14, share: 1.0 },
    { uptoKwh: 28, share: 0.6 },
    { uptoKwh: 50, share: 0.15 }
];
export const BATTERY_ELIGIBILITY = { minNominalKwh: 5, maxNominalKwh: 100, maxUsableForStcKwh: 50 };

export function batteryStcFactor(dateIso) {
    const date = String(dateIso || new Date().toISOString().slice(0, 10)).slice(0, 10);
    let factor = 0;
    for (const row of BATTERY_STC_SCHEDULE) if (date >= row.from) factor = row.factor;
    if (date > '2030-12-31') factor = 0;
    return factor;
}

/** Battery STC entitlement with the post-May-2026 tiers. */
export function batteryStcs({ usableKwh, nominalKwh, dateIso, stcPrice = 37 }) {
    const date = String(dateIso || new Date().toISOString().slice(0, 10)).slice(0, 10);
    const factor = batteryStcFactor(date);
    const usable = Math.min(num(usableKwh), BATTERY_ELIGIBILITY.maxUsableForStcKwh);
    const nominal = num(nominalKwh, usable);
    const eligible = nominal >= BATTERY_ELIGIBILITY.minNominalKwh && nominal <= BATTERY_ELIGIBILITY.maxNominalKwh && factor > 0;
    let weighted = 0;
    if (date >= BATTERY_TIERS_FROM) {
        let prev = 0;
        for (const tier of BATTERY_TIERS) {
            const slice = Math.max(0, Math.min(usable, tier.uptoKwh) - prev);
            weighted += slice * tier.share;
            prev = tier.uptoKwh;
        }
    } else {
        weighted = usable;
    }
    const stcs = eligible ? Math.floor(weighted * factor) : 0;
    return {
        eligible,
        factor,
        weightedKwh: round(weighted, 2),
        stcs,
        valueAud: round(stcs * num(stcPrice, 37), 0),
        tiered: date >= BATTERY_TIERS_FROM,
        reference: 'Renewable Energy (Electricity) Regulations 2001 – Cheaper Home Batteries Program (STC factor schedule; tiers from 1 May 2026)'
    };
}

export const FEATURES = [
    { id: 'battery.assess.restricted', title: 'Battery restricted-location detection', test: () => assessBatteryLocation({ locationType: 'habitable_room' }).status === 'FAIL' },
    { id: 'battery.assess.clearance', title: 'Battery 600 mm clearance rule', test: () => assessBatteryLocation({ locationType: 'garage', distanceToExitMm: 400 }).status === 'FAIL' && assessBatteryLocation({ locationType: 'garage', distanceToExitMm: 700 }).status === 'PASS' },
    { id: 'battery.assess.barrier', title: 'Non-combustible barrier rule', test: () => assessBatteryLocation({ locationType: 'garage', wallCombustible: true, adjoinsHabitableRoom: true }).status === 'FAIL' && assessBatteryLocation({ locationType: 'garage', wallCombustible: true, adjoinsHabitableRoom: true, barrierInstalled: true }).status === 'PASS' },
    { id: 'battery.assess.warnings', title: 'Battery environmental warnings', test: () => assessBatteryLocation({ locationType: 'carport', impactProtected: false }).status === 'WARNING' },
    { id: 'battery.sizeBattery', title: 'Battery sizing from daily consumption', test: () => { const r = sizeBattery({ dailyKwh: 20 }); return r.usableKwhRequired > 12 && r.recommendedUsableKwh >= r.usableKwhRequired; } },
    { id: 'battery.backupCapability', title: 'Backup hours for loads', test: () => backupCapability({ usableKwh: 13.5, continuousKw: 5, loads: [{ watts: 500 }, { watts: 1000, quantity: 2 }] }).hours === 5.4 },
    { id: 'battery.stcFactor', title: 'Battery STC factor schedule', test: () => batteryStcFactor('2026-03-01') === 8.4 && batteryStcFactor('2026-06-01') === 6.8 && batteryStcFactor('2031-01-01') === 0 },
    { id: 'battery.stcs.tiered', title: 'Battery STCs with 14/28/50 kWh tiers', test: () => { const r = batteryStcs({ usableKwh: 20, nominalKwh: 20, dateIso: '2026-06-01' }); return r.weightedKwh === 17.6 && r.stcs === 119; } },
    { id: 'battery.stcs.untiered', title: 'Battery STCs before tiers', test: () => batteryStcs({ usableKwh: 10, nominalKwh: 10, dateIso: '2026-02-01' }).stcs === 84 },
    { id: 'battery.stcs.ineligible', title: 'Battery STC eligibility bounds', test: () => batteryStcs({ usableKwh: 3, nominalKwh: 3, dateIso: '2026-06-01' }).eligible === false }
];
