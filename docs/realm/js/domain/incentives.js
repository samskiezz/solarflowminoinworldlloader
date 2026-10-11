/**
 * Small-scale Renewable Energy Scheme (SRES) entitlements for solar PV.
 * Postcode zones: Schedule 5, Renewable Energy (Electricity) Regulations 2001
 * (Clean Energy Regulator "Postcode zone ratings" table, 126 ranges).
 */
import { num, round } from './pv.js';

export const ZONE_RATINGS = { 1: 1.622, 2: 1.536, 3: 1.382, 4: 1.185 };

/** [from, to, zone] – complete CER table. */
export const POSTCODE_ZONES = [
    [0, 799, 3], [800, 869, 2], [870, 879, 1], [880, 1000, 2], [1001, 2356, 3], [2357, 2357, 2], [2358, 2384, 3], [2385, 2393, 2],
    [2394, 2395, 3], [2396, 2398, 2], [2399, 2399, 3], [2400, 2400, 2], [2401, 2404, 3], [2405, 2407, 2], [2408, 2410, 3], [2411, 2414, 2],
    [2415, 2536, 3], [2537, 2537, 4], [2538, 2544, 3], [2545, 2557, 4], [2558, 2626, 3], [2627, 2629, 4], [2630, 2630, 3], [2631, 2639, 4],
    [2640, 2820, 3], [2821, 2842, 2], [2843, 2872, 3], [2873, 2874, 2], [2875, 2876, 3], [2877, 2889, 2], [2890, 2897, 3], [2898, 2899, 3],
    [2900, 2999, 3], [3000, 3390, 4], [3391, 3398, 3], [3399, 3413, 4], [3414, 3426, 3], [3427, 3474, 4], [3475, 3514, 3], [3515, 3516, 4],
    [3517, 3520, 3], [3521, 3524, 4], [3525, 3538, 3], [3539, 3539, 4], [3540, 3549, 3], [3550, 3560, 4], [3561, 3569, 3], [3570, 3570, 4],
    [3571, 3606, 3], [3607, 3617, 4], [3618, 3622, 3], [3623, 3628, 4], [3629, 3657, 3], [3658, 3684, 4], [3685, 3687, 3], [3688, 3724, 4],
    [3725, 3731, 3], [3732, 3999, 4], [4000, 4416, 3], [4417, 4417, 2], [4418, 4422, 3], [4423, 4423, 2], [4424, 4426, 3], [4427, 4473, 2],
    [4474, 4476, 1], [4477, 4478, 2], [4479, 4485, 1], [4486, 4490, 2], [4491, 4492, 1], [4493, 4499, 2], [4500, 4721, 3], [4722, 4722, 2],
    [4723, 4723, 3], [4724, 4735, 2], [4736, 4736, 1], [4737, 4824, 3], [4825, 4827, 2], [4828, 4828, 3], [4829, 4829, 2], [4830, 5261, 3],
    [5262, 5263, 4], [5264, 5270, 3], [5271, 5300, 4], [5301, 5429, 3], [5430, 5450, 2], [5451, 5653, 3], [5654, 5669, 2], [5670, 5679, 3],
    [5680, 5699, 2], [5700, 5709, 3], [5710, 5722, 2], [5723, 5724, 1], [5725, 5733, 2], [5734, 5799, 1], [5800, 6243, 3], [6244, 6250, 4],
    [6251, 6254, 3], [6255, 6270, 4], [6271, 6315, 3], [6316, 6357, 4], [6358, 6393, 3], [6394, 6400, 4], [6401, 6430, 3], [6431, 6431, 2],
    [6432, 6433, 3], [6434, 6439, 2], [6440, 6441, 1], [6442, 6444, 3], [6445, 6459, 4], [6460, 6467, 3], [6468, 6469, 2], [6470, 6471, 3],
    [6472, 6474, 2], [6475, 6506, 3], [6507, 6555, 2], [6556, 6573, 3], [6574, 6602, 2], [6603, 6607, 3], [6608, 6641, 2], [6642, 6724, 1],
    [6725, 6750, 2], [6751, 6797, 1], [6798, 6799, 2], [6800, 6999, 3], [7000, 8999, 4], [9000, 9999, 3]
];

export const SCHEME_END_YEAR = 2030;
export const SOLAR_SYSTEM_MAX_KW = 100; // SRES small generation unit limit
export const STC_PRICE_CAP = 40;

export function zoneForPostcode(postcode) {
    const pc = parseInt(String(postcode).trim(), 10);
    if (!Number.isFinite(pc) || pc < 0 || pc > 9999) return null;
    const row = POSTCODE_ZONES.find(([from, to]) => pc >= from && pc <= to);
    return row ? { zone: row[2], rating: ZONE_RATINGS[row[2]], postcode: pc } : null;
}

export function deemingYears(installYear) {
    const year = Math.round(num(installYear, new Date().getFullYear()));
    return Math.max(0, SCHEME_END_YEAR - year + 1);
}

/** Solar PV STCs = kW × zone rating × deeming years (rounded down). */
export function solarStcs({ kw, postcode, installYear, stcPrice = 37 }) {
    const zone = zoneForPostcode(postcode);
    if (!zone) return { error: 'Unknown postcode' };
    const years = deemingYears(installYear);
    const capacity = Math.min(num(kw), SOLAR_SYSTEM_MAX_KW);
    const stcs = Math.floor(capacity * zone.rating * years);
    return {
        zone: zone.zone,
        rating: zone.rating,
        deemingYears: years,
        kw: capacity,
        stcs,
        valueAud: round(stcs * Math.min(num(stcPrice, 37), STC_PRICE_CAP), 0),
        eligible: num(kw) <= SOLAR_SYSTEM_MAX_KW && years > 0,
        reference: 'Clean Energy Regulator: STCs = system size (kW) × zone rating × deeming period (years)'
    };
}

/** State-level programs worth checking (kept as data so the UI can list them). */
export const STATE_PROGRAMS = [
    { state: 'VIC', name: 'Solar Victoria rebates and interest-free loans', note: 'Products must be on the Solar Victoria product lists; CSIP-AUS ready inverters since 1 Mar 2024', url: 'https://www.solar.vic.gov.au' },
    { state: 'NSW', name: 'Peak Demand Reduction Scheme (PDRS) battery/VPP incentive', note: 'Incentive for connecting a battery to a VPP', url: 'https://www.energy.nsw.gov.au' },
    { state: 'WA', name: 'Distributed Energy Buyback Scheme (DEBS)', note: 'Time-varying buyback (higher 3–9 pm)', url: 'https://www.wa.gov.au' },
    { state: 'QLD', name: 'Regional feed-in tariff set by QCA', note: 'Draft 6.15 c/kWh for 2026-27', url: 'https://www.qca.org.au' },
    { state: 'ACT', name: 'Sustainable Household Scheme loans', note: 'Zero-interest loans for solar and batteries', url: 'https://www.climatechoices.act.gov.au' }
];

export function stateFromPostcode(postcode) {
    const pc = parseInt(String(postcode), 10);
    if (!Number.isFinite(pc)) return null;
    if (pc >= 200 && pc <= 299) return 'ACT';
    if (pc >= 2600 && pc <= 2618) return 'ACT';
    if (pc >= 2900 && pc <= 2920) return 'ACT';
    if ((pc >= 1000 && pc <= 2999)) return 'NSW';
    if (pc >= 3000 && pc <= 3999 || pc >= 8000 && pc <= 8999) return 'VIC';
    if (pc >= 4000 && pc <= 4999 || pc >= 9000 && pc <= 9999) return 'QLD';
    if (pc >= 5000 && pc <= 5999) return 'SA';
    if (pc >= 6000 && pc <= 6999) return 'WA';
    if (pc >= 7000 && pc <= 7999) return 'TAS';
    if (pc >= 800 && pc <= 999) return 'NT';
    return null;
}

export const FEATURES = [
    { id: 'incentives.zoneForPostcode', title: 'STC postcode zone lookup', test: () => zoneForPostcode('2000').zone === 3 && zoneForPostcode('3000').zone === 4 && zoneForPostcode('0870').zone === 1 && zoneForPostcode('6700').zone === 1 },
    { id: 'incentives.zoneTableCoverage', title: 'Postcode zone table covers 0000–9999 contiguously', test: () => POSTCODE_ZONES.every(([from, to], i) => to >= from && (i === 0 || from === POSTCODE_ZONES[i - 1][1] + 1)) && POSTCODE_ZONES.at(-1)[1] === 9999 },
    { id: 'incentives.deemingYears', title: 'Deeming period schedule to 2030', test: () => deemingYears(2026) === 5 && deemingYears(2030) === 1 && deemingYears(2031) === 0 },
    { id: 'incentives.solarStcs', title: 'Solar STC calculation', test: () => { const r = solarStcs({ kw: 6.6, postcode: '2000', installYear: 2026 }); return r.stcs === 45 && r.valueAud === 1665; } },
    { id: 'incentives.solarStcs.cap', title: 'STC price cap and system size limit', test: () => solarStcs({ kw: 120, postcode: '4000', installYear: 2026, stcPrice: 55 }).eligible === false },
    { id: 'incentives.stateFromPostcode', title: 'State inference from postcode', test: () => stateFromPostcode('2600') === 'ACT' && stateFromPostcode('6000') === 'WA' && stateFromPostcode('0800') === 'NT' },
    { id: 'incentives.statePrograms', title: 'State program catalogue', test: () => STATE_PROGRAMS.length >= 5 }
];
