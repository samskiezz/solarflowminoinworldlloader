/**
 * Load profiling: appliance library, daily kWh, hourly profile, peak demand.
 */
import { num, round } from './pv.js';

/** Typical appliance ratings and usage (W, hours/day, usual hours of the day). */
export const APPLIANCE_LIBRARY = [
    { id: 'fridge', name: 'Refrigerator', watts: 150, hoursPerDay: 8, hours: 'all' },
    { id: 'aircon_split', name: 'Split-system air conditioner', watts: 2500, hoursPerDay: 4, hours: [14, 15, 16, 17, 18, 19, 20, 21] },
    { id: 'aircon_ducted', name: 'Ducted air conditioning', watts: 6000, hoursPerDay: 4, hours: [15, 16, 17, 18, 19, 20, 21, 22] },
    { id: 'hot_water_electric', name: 'Electric storage hot water', watts: 3600, hoursPerDay: 2.5, hours: [22, 23, 0, 1, 2, 3] },
    { id: 'heat_pump_hw', name: 'Heat pump hot water', watts: 900, hoursPerDay: 3, hours: [10, 11, 12, 13] },
    { id: 'oven', name: 'Electric oven', watts: 2400, hoursPerDay: 0.7, hours: [18, 19] },
    { id: 'cooktop', name: 'Induction cooktop', watts: 2000, hoursPerDay: 0.6, hours: [18, 19] },
    { id: 'dishwasher', name: 'Dishwasher', watts: 1800, hoursPerDay: 1, hours: [20, 21] },
    { id: 'washing', name: 'Washing machine', watts: 500, hoursPerDay: 1, hours: [9, 10] },
    { id: 'dryer', name: 'Clothes dryer', watts: 2000, hoursPerDay: 0.6, hours: [10, 11] },
    { id: 'tv', name: 'TV and entertainment', watts: 150, hoursPerDay: 5, hours: [18, 19, 20, 21, 22] },
    { id: 'lighting', name: 'LED lighting', watts: 120, hoursPerDay: 6, hours: [6, 7, 18, 19, 20, 21, 22] },
    { id: 'computers', name: 'Computers / office', watts: 200, hoursPerDay: 8, hours: [9, 10, 11, 12, 13, 14, 15, 16] },
    { id: 'pool_pump', name: 'Pool pump', watts: 1100, hoursPerDay: 6, hours: [9, 10, 11, 12, 13, 14] },
    { id: 'ev_charger', name: 'EV charger (7 kW)', watts: 7000, hoursPerDay: 2, hours: [23, 0, 1] },
    { id: 'ev_charger_day', name: 'EV charger (solar soak, 7 kW)', watts: 7000, hoursPerDay: 2, hours: [11, 12, 13] },
    { id: 'standby', name: 'Standby and misc', watts: 80, hoursPerDay: 24, hours: 'all' }
];

export function applianceById(id) {
    return APPLIANCE_LIBRARY.find((a) => a.id === id) || null;
}

/** Build an hourly (24) kW profile from selected appliances [{ id|watts, quantity, hoursPerDay, hours }]. */
export function hourlyProfile(selection = []) {
    const profile = new Array(24).fill(0);
    for (const item of selection) {
        const base = item.id ? applianceById(item.id) || {} : {};
        const watts = num(item.watts ?? base.watts, 0) * num(item.quantity, 1);
        const hoursPerDay = num(item.hoursPerDay ?? base.hoursPerDay, 0);
        const hours = item.hours ?? base.hours ?? 'all';
        const kwhDay = (watts * hoursPerDay) / 1000;
        if (hours === 'all') {
            for (let h = 0; h < 24; h++) profile[h] += kwhDay / 24;
        } else if (Array.isArray(hours) && hours.length) {
            const perHour = kwhDay / hours.length;
            for (const h of hours) profile[((h % 24) + 24) % 24] += perHour;
        }
    }
    return profile.map((v) => round(v, 3));
}

export function dailyKwh(selection = []) {
    return round(hourlyProfile(selection).reduce((a, b) => a + b, 0), 2);
}

export function peakKw(selection = []) {
    return round(Math.max(...hourlyProfile(selection)), 3);
}

/** Share of consumption between 17:00 and 07:00 (served by battery). */
export function eveningSharePct(selection = []) {
    const profile = hourlyProfile(selection);
    const total = profile.reduce((a, b) => a + b, 0);
    if (total === 0) return 0;
    const evening = profile.filter((_, h) => h >= 17 || h < 7).reduce((a, b) => a + b, 0);
    return round((evening / total) * 100, 1);
}

/** Maximum demand estimate for AS/NZS 3000 Appendix C style check (simplified). */
export function maximumDemandA(selection = [], voltage = 230, diversity = 0.7) {
    const connectedW = selection.reduce((sum, item) => {
        const base = item.id ? applianceById(item.id) || {} : {};
        return sum + num(item.watts ?? base.watts, 0) * num(item.quantity, 1);
    }, 0);
    return round((connectedW * num(diversity, 0.7)) / num(voltage, 230), 1);
}

export const FEATURES = [
    { id: 'loads.library', title: 'Appliance library', test: () => APPLIANCE_LIBRARY.length >= 15 && applianceById('fridge').watts === 150 },
    { id: 'loads.hourlyProfile', title: 'Hourly load profile', test: () => { const p = hourlyProfile([{ id: 'fridge' }, { id: 'tv' }]); return p.length === 24 && p[19] > p[3]; } },
    { id: 'loads.dailyKwh', title: 'Daily consumption', test: () => dailyKwh([{ id: 'fridge' }, { id: 'aircon_split' }]) === 11.2 },
    { id: 'loads.peakKw', title: 'Peak demand (kW)', test: () => peakKw([{ id: 'oven' }, { id: 'cooktop' }]) >= 1.4 },
    { id: 'loads.eveningSharePct', title: 'Evening share for battery sizing', test: () => eveningSharePct([{ id: 'tv' }, { id: 'lighting' }]) > 60 },
    { id: 'loads.maximumDemandA', title: 'Maximum demand estimate', test: () => maximumDemandA([{ id: 'aircon_split' }, { id: 'oven' }]) > 10 }
];
