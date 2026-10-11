/** Handover pack: owner's manual, maintenance schedule and warranty register. */
import { num, round } from './pv.js';

export const DEFAULT_WARRANTIES = { solar_panel: { product: 12, performance: 25 }, inverter: { product: 5 }, battery: { product: 10 }, workmanship: { product: 5 } };

export function addYears(dateIso, years) { const d = new Date(dateIso); d.setUTCFullYear(d.getUTCFullYear() + num(years, 0)); return d.toISOString().slice(0, 10); }

export function warrantyRegister({ installDate, products = [], workmanshipYears = DEFAULT_WARRANTIES.workmanship.product }) {
    const rows = products.map((p) => { const w = { ...DEFAULT_WARRANTIES[p.category], ...(p.warranty || {}) }; return { item: `${p.manufacturer} ${p.model}`, category: p.category, productYears: w.product, productExpires: addYears(installDate, w.product), performanceYears: w.performance || null, performanceExpires: w.performance ? addYears(installDate, w.performance) : null }; });
    rows.push({ item: 'Installation workmanship', category: 'workmanship', productYears: workmanshipYears, productExpires: addYears(installDate, workmanshipYears), performanceYears: null, performanceExpires: null });
    return rows;
}

export function maintenanceSchedule({ installDate, hasBattery = false, years = 5 }) {
    const items = [];
    for (let y = 1; y <= years; y++) {
        const due = addYears(installDate, y);
        items.push({ due, task: 'Owner visual check: array clean, no damage, inverter status lights normal, isolator labels legible', who: 'owner', reference: 'AS/NZS 5033:2021 Section 6 (documentation) / manufacturer' });
        if (y % 2 === 0 || y === years) items.push({ due, task: 'Licensed inspection: connections, isolators, earthing, insulation resistance, inverter settings, mounting integrity', who: 'installer', reference: 'AS/NZS 3000 Cl 8.3 / IEC 62446-2 periodic verification' });
        if (hasBattery) items.push({ due, task: 'Battery health check: state of health, firmware, clearances and signage, ventilation', who: 'installer', reference: 'AS/NZS 5139:2019 Section 7 / manufacturer' });
    }
    return items.sort((a, b) => a.due.localeCompare(b.due));
}

export function ownerManual({ company, customer, address, systemKw, batteryKwh, inverter, modules, moduleCount, battery, installDate, shutdown, monitoring = 'Inverter app / web portal', emergency = '000' }) {
    return [
        `${company} – Owner's manual for ${customer}`, address || '', `Installed ${installDate}`, '',
        'YOUR SYSTEM', `  Solar array: ${systemKw} kW (${moduleCount || '?'} × ${modules || 'modules'})`, `  Inverter: ${inverter || '–'}`, batteryKwh ? `  Battery: ${batteryKwh} kWh (${battery || '–'})` : '  Battery: none', '',
        'SHUTDOWN PROCEDURE (also on the label at the inverter)', ...(shutdown || ['1. Turn off the inverter a.c. isolator', '2. Turn off the solar supply main switch at the switchboard', '3. Turn off the PV array d.c. isolator(s)', ...(batteryKwh ? ['4. Turn off the battery isolator / switch per the battery label'] : [])]).map((l) => `  ${l}`), '',
        'START-UP: reverse the order – d.c. isolator(s), solar supply main switch, a.c. isolator, (battery last per manufacturer).', '',
        'MONITORING', `  ${monitoring}. Check generation monthly; contact us if daily generation drops sharply on a clear day.`, '',
        'SAFETY', '  Do not open isolators or enclosures. d.c. conductors are live whenever the array is exposed to light.', `  In an emergency (fire, flood, damage) shut the system down if safe and call ${emergency}.`, '',
        'MAINTENANCE', '  Keep the array clean and shaded areas trimmed. Annual owner check; licensed inspection at least every two years (see schedule).', '',
        'WARRANTIES AND DOCUMENTS', '  See the warranty register and keep the certificate of electrical safety, commissioning results and this manual together.'
    ].join('\n');
}

export const FEATURES = [
    { id: 'handover.addYears', title: 'Date arithmetic for warranty expiry', test: () => addYears('2026-02-28', 10) === '2036-02-28' },
    { id: 'handover.warranty', title: 'Warranty register with product and performance terms', test: () => { const r = warrantyRegister({ installDate: '2026-01-01', products: [{ manufacturer: 'A', model: 'M', category: 'solar_panel' }, { manufacturer: 'B', model: 'I', category: 'inverter', warranty: { product: 10 } }] }); return r.length === 3 && r[0].performanceExpires === '2051-01-01' && r[1].productYears === 10 && r[2].category === 'workmanship'; } },
    { id: 'handover.maintenance', title: 'Maintenance schedule with owner and installer items', test: () => { const m = maintenanceSchedule({ installDate: '2026-01-01', hasBattery: true, years: 4 }); return m.length === 4 + 2 + 4 && m[0].due === '2027-01-01' && m.some((i) => /Battery health/.test(i.task)); } },
    { id: 'handover.manual', title: "Owner's manual text with shutdown procedure", test: () => { const t = ownerManual({ company: 'Co', customer: 'Ann', systemKw: 6.6, batteryKwh: 13, installDate: '2026-01-01' }); return t.includes("Owner's manual for Ann") && t.includes('4. Turn off the battery isolator') && t.includes('START-UP'); } }
];
