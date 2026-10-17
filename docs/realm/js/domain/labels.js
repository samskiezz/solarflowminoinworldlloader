/**
 * Required signage and labels (AS/NZS 5033:2021 Cl 5.3, AS/NZS 4777.1:2024
 * Section 6 / Appendix A, AS/NZS 5139:2019 Section 7).
 */
import { num, round } from './pv.js';

/**
 * Generate the label set for a system.
 * @param {object} p { hasPv, hasBattery, hasBackup, arrayVocV, arrayIscA, inverterMainSwitches, supplyType }
 */
export function requiredLabels(p = {}) {
    const labels = [];
    const add = (id, text, location, reference, specs = {}) => labels.push({ id, text, location, reference, ...specs });

    if (p.hasPv !== false) {
        add('pv_dc_isolator', 'PV ARRAY – D.C. ISOLATOR', 'On each d.c. isolator', 'AS/NZS 5033:2021 Cl 5.3', { colour: 'black on yellow', minTextMm: 5 });
        add('pv_array_rating', `PV ARRAY – OPEN CIRCUIT VOLTAGE ${round(num(p.arrayVocV, 0), 0)} V – SHORT CIRCUIT CURRENT ${round(num(p.arrayIscA, 0), 1)} A`, 'At the PCE d.c. isolator', 'AS/NZS 5033:2021 Cl 5.3', { colour: 'black on yellow' });
        add('pv_shutdown', 'SHUTDOWN PROCEDURE: 1. Turn off inverter a.c. isolator  2. Turn off solar supply main switch  3. Turn off PV array d.c. isolator(s)', 'Adjacent to the inverter', 'AS/NZS 5033:2021 Cl 5.3 / AS/NZS 4777.1 App. A');
        add('pv_fire_info', 'FIRE EMERGENCY INFORMATION – SOLAR PV SYSTEM INSTALLED', 'Main switchboard and meter box', 'AS/NZS 5033:2021 Cl 5.3', { colour: 'red on white' });
        add('pv_dc_warning', 'WARNING – D.C. CONDUCTORS LIVE WHEN EXPOSED TO LIGHT', 'Array junction / isolator', 'AS/NZS 5033:2021 Cl 5.3');
        add('pv_conduit', 'SOLAR D.C.', 'Along d.c. conduit at ≤ 2 m intervals', 'AS/NZS 5033:2021 Cl 5.3 (wiring identification)');
    }
    add('solar_main_switch', 'SOLAR SUPPLY MAIN SWITCH', 'Main switchboard', 'AS/NZS 4777.1:2024 Cl 6 / App. A', { colour: 'black on white' });
    add('multiple_supplies', 'WARNING – MULTIPLE SUPPLIES. ISOLATE ALL SUPPLIES BEFORE WORKING ON THIS SWITCHBOARD', 'Main switchboard', 'AS/NZS 4777.1:2024 App. A', { colour: 'black on yellow' });
    if (num(p.inverterMainSwitches, 1) > 2) {
        add('master_switch', 'INVERTER SUPPLY MASTER SWITCH – ISOLATES ALL INVERTERS', 'Main switchboard', 'AS/NZS 4777.1:2024 Cl 5');
    }
    if (p.hasBattery) {
        add('bess_warning', 'WARNING – BATTERY ENERGY STORAGE SYSTEM. RISK OF ELECTRIC SHOCK AND FIRE', 'Battery enclosure and switchboard', 'AS/NZS 5139:2019 Section 7', { colour: 'black on yellow' });
        add('bess_shutdown', 'BATTERY SYSTEM SHUTDOWN PROCEDURE – see inverter and battery isolators', 'Adjacent to the BESS', 'AS/NZS 5139:2019 Section 7');
        add('bess_emergency', 'EMERGENCY INFORMATION – BATTERY SYSTEM INSTALLED (chemistry, location, isolation points)', 'Main switchboard', 'AS/NZS 5139:2019 Section 7');
    }
    if (p.hasBackup) {
        const supply = p.supplyType === 'independent' ? 'INDEPENDENT' : 'ALTERNATIVE';
        add('backup_main_switch', `MAIN SWITCH (${supply} SUPPLY)`, 'Switchboard – backup circuits', 'AS/NZS 4777.1:2024 App. A (supply type labelling)');
        add('backup_outlets', `${supply} SUPPLY – NOT ALL CIRCUITS ARE BACKED UP`, 'Backup circuit outlets / sub-board', 'AS/NZS 4777.1:2024 App. A');
    }
    return labels;
}

export function labelCount(p = {}) {
    return requiredLabels(p).length;
}

/** Plain-text printable label sheet. */
export function labelSheet(p = {}) {
    return requiredLabels(p).map((l, i) => `${i + 1}. [${l.location}] ${l.text}\n   ${l.reference}`).join('\n');
}

export const FEATURES = [
    { id: 'labels.pvOnly', title: 'Label set for PV-only systems', test: () => { const ids = requiredLabels({ hasPv: true, arrayVocV: 480, arrayIscA: 13.9 }).map((l) => l.id); return ids.includes('pv_dc_isolator') && ids.includes('solar_main_switch') && !ids.includes('bess_warning'); } },
    { id: 'labels.battery', title: 'Battery labels added for BESS', test: () => requiredLabels({ hasBattery: true }).some((l) => l.id === 'bess_warning') },
    { id: 'labels.backupSupplyType', title: 'Supply-type labels (alternative/independent)', test: () => requiredLabels({ hasBackup: true, supplyType: 'independent' }).some((l) => l.text.includes('INDEPENDENT')) },
    { id: 'labels.masterSwitch', title: 'Master switch label when > 2 inverter main switches', test: () => requiredLabels({ inverterMainSwitches: 3 }).some((l) => l.id === 'master_switch') },
    { id: 'labels.ratingText', title: 'Array rating label text', test: () => requiredLabels({ arrayVocV: 481.3, arrayIscA: 13.9 }).find((l) => l.id === 'pv_array_rating').text.includes('481 V') },
    { id: 'labels.sheet', title: 'Printable label sheet', test: () => labelSheet({ hasBattery: true }).split('\n').length >= 20 }
];
