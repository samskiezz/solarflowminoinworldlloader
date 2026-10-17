/**
 * Clause-referenced installation checklists and their evaluation.
 * Each item: { id, text, reference, critical, evidence }
 *   evidence: 'visual' | 'measurement' | 'photo' | 'document'
 */

export const CHECKLISTS = {
    pv_array_5033: {
        id: 'pv_array_5033', title: 'PV array installation – AS/NZS 5033:2021', standard: 'AS/NZS 5033:2021',
        items: [
            { id: 'pv_modules_approved', text: 'All PV modules are on the CEC approved modules list (fire tested where required)', reference: 'CER STC eligibility / CEC approved products', critical: true, evidence: 'document' },
            { id: 'pv_max_voltage', text: 'Temperature-corrected array maximum voltage ≤ inverter, module and installation class limit', reference: 'AS/NZS 5033:2021 Cl 4.2', critical: true, evidence: 'measurement' },
            { id: 'pv_string_cable', text: 'String cables PV1-F (or equivalent) rated ≥ 1.25 × Isc and ≥ array voltage', reference: 'AS/NZS 5033:2021 Cl 4.3', critical: true, evidence: 'visual' },
            { id: 'pv_cable_protection', text: 'd.c. cables protected from mechanical damage and UV; conduit heavy duty where required', reference: 'AS/NZS 5033:2021 Cl 4.3 / 4.4.5', critical: true, evidence: 'photo' },
            { id: 'pv_ceiling_zone', text: 'No d.c. wiring within 600 mm of the ceiling surface except in the permitted zones', reference: 'AS/NZS 5033:2021 Cl 4.4.5.2', critical: true, evidence: 'photo' },
            { id: 'pv_dc_isolator', text: 'Load-breaking d.c. isolator at the PCE, correctly wired (polarity, line/load) and rated for array voltage/current', reference: 'AS/NZS 5033:2021 Cl 4.4.3', critical: true, evidence: 'visual' },
            { id: 'pv_disconnection_points', text: 'If disconnection points/DC conditioning units are used instead of a rooftop isolator, wiring complies with Cl 4.3.3', reference: 'AS/NZS 5033:2021 Cl 4.3.3', critical: false, evidence: 'visual' },
            { id: 'pv_rooftop_isolator', text: 'If a rooftop isolator is used: IP rated, shrouded, mounted with correct entry/drainage, not on the roof deck', reference: 'AS/NZS 5033:2021 Cl 4.4.3 / industry guidance', critical: false, evidence: 'photo' },
            { id: 'pv_connectors', text: 'All d.c. connectors are the same brand/type (no mixed MC4 pairs), correctly crimped and locked', reference: 'AS/NZS 5033:2021 Cl 4.3.6 (connectors)', critical: true, evidence: 'visual' },
            { id: 'pv_frame_earthing', text: 'Array frame equipotential bonding installed where required, with correct lugs and conductor size', reference: 'AS/NZS 5033:2021 Cl 5.5 / AS/NZS 3000 Cl 5.4', critical: true, evidence: 'measurement' },
            { id: 'pv_overcurrent', text: 'String/array overcurrent protection provided where required (number of strings vs module reverse-current rating)', reference: 'AS/NZS 5033:2021 Cl 3.3', critical: true, evidence: 'visual' },
            { id: 'pv_restricted_access', text: 'Ground-mounted or non-roof arrays have restricted access', reference: 'AS/NZS 5033:2021 Cl 2.1', critical: true, evidence: 'photo' },
            { id: 'pv_mounting', text: 'Mounting system installed to manufacturer instructions and wind region; roof penetrations sealed', reference: 'AS/NZS 1170.2 / manufacturer', critical: false, evidence: 'photo' },
            { id: 'pv_labels', text: 'Required labels fitted: PV array d.c. isolator, array Voc/Isc, shutdown procedure, fire emergency information', reference: 'AS/NZS 5033:2021 Cl 5.3', critical: true, evidence: 'photo' },
            { id: 'pv_voltage_drop', text: 'd.c. voltage drop array to inverter ≤ 3 %', reference: 'CEC guideline (AS/NZS 5033 commentary)', critical: false, evidence: 'measurement' },
            { id: 'pv_documentation', text: 'System documentation left with owner: wiring diagram, datasheets, commissioning results, shutdown procedure', reference: 'AS/NZS 5033:2021 Section 6', critical: true, evidence: 'document' }
        ]
    },
    grid_connection_4777: {
        id: 'grid_connection_4777', title: 'Grid connection – AS/NZS 4777.1:2024', standard: 'AS/NZS 4777.1:2024',
        items: [
            { id: 'inv_approved', text: 'Inverter is on the CEC approved inverters list with AS/NZS 4777.2:2020 Amd 2 region settings', reference: 'CER STC eligibility / CEC list', critical: true, evidence: 'document' },
            { id: 'inv_region_settings', text: 'Inverter region settings (Australia A/B/C or NZ) match the DNSP requirement', reference: 'AS/NZS 4777.2:2020 Cl 4.3; DNSP connection agreement', critical: true, evidence: 'photo' },
            { id: 'inv_voltage_rise', text: 'Voltage rise from point of supply to inverter terminals ≤ 2 %', reference: 'AS/NZS 4777.1 Cl 3.3', critical: true, evidence: 'measurement' },
            { id: 'inv_phase_balance', text: 'Phase balance within limits for multiple single-phase inverters', reference: 'AS/NZS 4777.1 Cl 3', critical: true, evidence: 'document' },
            { id: 'inv_main_switch', text: 'Inverter main switch (solar supply main switch) on the switchboard; ≤ 2 inverter main switches or a master switch', reference: 'AS/NZS 4777.1:2024 Cl 5', critical: true, evidence: 'photo' },
            { id: 'inv_ac_isolator', text: 'a.c. isolator adjacent to the inverter (or inverter within 3 m / line of sight as permitted)', reference: 'AS/NZS 4777.1 Cl 5 / AS/NZS 3000 Cl 4.1.2', critical: true, evidence: 'photo' },
            { id: 'inv_protection', text: 'Dedicated circuit with correctly rated overcurrent protection and RCD where required', reference: 'AS/NZS 3000 Cl 2.5 / 2.6', critical: true, evidence: 'visual' },
            { id: 'inv_export_limit', text: 'Export limit configured and verified where required by the DNSP', reference: 'DNSP connection agreement', critical: true, evidence: 'photo' },
            { id: 'inv_signage', text: 'Supply type labels (alternative/independent), multiple supplies warning, inverter main switch label', reference: 'AS/NZS 4777.1:2024 Cl 6 / Appendix A', critical: true, evidence: 'photo' },
            { id: 'inv_anti_islanding', text: 'Anti-islanding and protection settings verified at commissioning', reference: 'AS/NZS 4777.1:2024 Cl 7', critical: true, evidence: 'measurement' },
            { id: 'inv_dnsp_approval', text: 'DNSP connection approval obtained and reference recorded', reference: 'DNSP connection process', critical: true, evidence: 'document' },
            { id: 'inv_monitoring', text: 'Monitoring configured and demonstrated to the owner', reference: 'Good practice / CEC guidelines', critical: false, evidence: 'photo' }
        ]
    },
    battery_5139: {
        id: 'battery_5139', title: 'Battery system – AS/NZS 5139:2019', standard: 'AS/NZS 5139:2019',
        items: [
            { id: 'bat_approved', text: 'Battery is on the CEC approved batteries list', reference: 'CER STC eligibility (Cheaper Home Batteries)', critical: true, evidence: 'document' },
            { id: 'bat_location', text: 'Not in a restricted location (habitable room, ceiling space, wall cavity, under stairs, escape route)', reference: 'AS/NZS 5139:2019 Cl 4.2', critical: true, evidence: 'photo' },
            { id: 'bat_clearance', text: '600 mm clearance from exits, windows, vents, hot water and air-conditioning units', reference: 'AS/NZS 5139:2019 Cl 4.2', critical: true, evidence: 'measurement' },
            { id: 'bat_barrier', text: 'Non-combustible barrier fitted where mounted on a combustible wall adjoining a habitable room', reference: 'AS/NZS 5139:2019 Cl 5.3', critical: true, evidence: 'photo' },
            { id: 'bat_mechanical', text: 'Mechanical protection (bollards) in vehicle areas; weather protection outdoors', reference: 'AS/NZS 5139:2019 Cl 4.3', critical: false, evidence: 'photo' },
            { id: 'bat_isolation', text: 'Battery d.c. isolation and overcurrent protection installed per manufacturer and standard', reference: 'AS/NZS 5139:2019 Section 6', critical: true, evidence: 'visual' },
            { id: 'bat_earthing', text: 'Battery enclosure earthing/bonding completed', reference: 'AS/NZS 5139:2019 Cl 6 / AS/NZS 3000', critical: true, evidence: 'measurement' },
            { id: 'bat_signage', text: 'BESS warning signs, shutdown procedure and emergency information fitted', reference: 'AS/NZS 5139:2019 Section 7', critical: true, evidence: 'photo' },
            { id: 'bat_backup_labels', text: 'If backup supply exists: outlets and switchboard labelled for the alternative/independent supply', reference: 'AS/NZS 4777.1:2024 App. A', critical: true, evidence: 'photo' },
            { id: 'bat_documentation', text: 'Owner documentation includes battery manual, warranty, commissioning record and emergency plan', reference: 'AS/NZS 5139:2019 Section 7', critical: true, evidence: 'document' },
            { id: 'bat_accredited', text: 'Designed and installed by an SAA-accredited (GCBS/SPS) person', reference: 'Cheaper Home Batteries Program eligibility', critical: true, evidence: 'document' }
        ]
    },
    general_3000: {
        id: 'general_3000', title: 'General electrical – AS/NZS 3000:2018', standard: 'AS/NZS 3000:2018',
        items: [
            { id: 'gen_licensed', text: 'Work carried out by a licensed electrical worker and certificate of electrical safety issued', reference: 'State electrical safety regulations', critical: true, evidence: 'document' },
            { id: 'gen_men', text: 'MEN connection and main earth verified', reference: 'AS/NZS 3000 Cl 5.3', critical: true, evidence: 'measurement' },
            { id: 'gen_switchboard', text: 'Switchboard labelling complete; circuit schedule updated', reference: 'AS/NZS 3000 Cl 2.9 / 2.10', critical: false, evidence: 'photo' },
            { id: 'gen_voltage_drop', text: 'Total voltage drop ≤ 5 %', reference: 'AS/NZS 3000 Cl 3.6.2', critical: true, evidence: 'measurement' },
            { id: 'gen_cable_rating', text: 'Cable sizes checked against AS/NZS 3008.1.1 with derating', reference: 'AS/NZS 3000 Cl 3.4', critical: true, evidence: 'document' },
            { id: 'gen_tests', text: 'Section 8 tests completed and recorded (continuity, insulation, polarity, EFLI, RCD)', reference: 'AS/NZS 3000 Section 8 / AS/NZS 3017', critical: true, evidence: 'measurement' }
        ]
    },
    handover: {
        id: 'handover', title: 'Documentation and STC claim readiness', standard: 'CER / SAA / CEC',
        items: [
            { id: 'ho_serials', text: 'Panel, inverter and battery serial numbers recorded and photographed', reference: 'CER STC validation', critical: true, evidence: 'photo' },
            { id: 'ho_onsite', text: 'Installer on-site attendance evidence (photos with time/location)', reference: 'CER on-site attendance requirements', critical: true, evidence: 'photo' },
            { id: 'ho_ces', text: 'Certificate of electrical safety / compliance lodged', reference: 'State regulator', critical: true, evidence: 'document' },
            { id: 'ho_stc_assignment', text: 'STC assignment form signed by the owner', reference: 'CER REC Registry', critical: true, evidence: 'document' },
            { id: 'ho_owner_manual', text: 'Owner manual, shutdown procedure and maintenance schedule handed over', reference: 'AS/NZS 5033 Section 6 / AS/NZS 5139 Section 7', critical: true, evidence: 'document' },
            { id: 'ho_dnsp_notice', text: 'DNSP notified of completion / meter reconfiguration requested', reference: 'DNSP connection agreement', critical: true, evidence: 'document' },
            { id: 'ho_warranty', text: 'Warranty documents (product, performance, workmanship) provided', reference: 'Australian Consumer Law / CEC Approved Retailer code', critical: false, evidence: 'document' }
        ]
    }
};

export const ANSWER_VALUES = ['pass', 'fail', 'na', 'pending'];

export function checklistById(id) {
    return CHECKLISTS[id] || null;
}

/** Evaluate answers { itemId: 'pass'|'fail'|'na'|'pending' } against a checklist. */
export function evaluateChecklist(checklistId, answers = {}) {
    const checklist = checklistById(checklistId);
    if (!checklist) return { error: `Unknown checklist ${checklistId}` };
    const items = checklist.items.map((item) => ({ ...item, answer: ANSWER_VALUES.includes(answers[item.id]) ? answers[item.id] : 'pending' }));
    const applicable = items.filter((i) => i.answer !== 'na');
    const passed = applicable.filter((i) => i.answer === 'pass').length;
    const failed = applicable.filter((i) => i.answer === 'fail');
    const pending = applicable.filter((i) => i.answer === 'pending');
    const criticalFailures = failed.filter((i) => i.critical);
    const status = criticalFailures.length ? 'FAIL' : pending.length ? 'INCOMPLETE' : failed.length ? 'DEFECTS' : 'PASS';
    return {
        checklistId,
        title: checklist.title,
        status,
        total: items.length,
        applicable: applicable.length,
        passed,
        failed: failed.map((i) => i.id),
        pending: pending.map((i) => i.id),
        criticalFailures: criticalFailures.map((i) => ({ id: i.id, text: i.text, reference: i.reference })),
        completionPct: applicable.length ? Math.round(((passed + failed.length) / applicable.length) * 100) : 100,
        scorePct: applicable.length ? Math.round((passed / applicable.length) * 100) : 100
    };
}

/** All checklists that apply to a system configuration. */
export function applicableChecklists({ hasPv = true, hasBattery = false, gridConnected = true } = {}) {
    const ids = ['general_3000'];
    if (hasPv) ids.unshift('pv_array_5033');
    if (gridConnected) ids.push('grid_connection_4777');
    if (hasBattery) ids.push('battery_5139');
    ids.push('handover');
    return ids;
}

export function totalItems(ids = Object.keys(CHECKLISTS)) {
    return ids.reduce((n, id) => n + (CHECKLISTS[id] ? CHECKLISTS[id].items.length : 0), 0);
}

export const FEATURES = [
    { id: 'checklists.catalogue', title: 'Clause-referenced checklists (5 lists, 52 items)', test: () => Object.keys(CHECKLISTS).length === 5 && totalItems() === 52 && Object.values(CHECKLISTS).every((c) => c.items.every((i) => i.reference && i.evidence)) },
    { id: 'checklists.evaluate.pass', title: 'Checklist evaluation: PASS', test: () => { const answers = Object.fromEntries(CHECKLISTS.handover.items.map((i) => [i.id, 'pass'])); return evaluateChecklist('handover', answers).status === 'PASS'; } },
    { id: 'checklists.evaluate.fail', title: 'Checklist evaluation: critical FAIL', test: () => evaluateChecklist('battery_5139', { bat_location: 'fail' }).status === 'FAIL' },
    { id: 'checklists.evaluate.incomplete', title: 'Checklist evaluation: INCOMPLETE and completion %', test: () => { const r = evaluateChecklist('general_3000', { gen_licensed: 'pass', gen_men: 'na' }); return r.status === 'INCOMPLETE' && r.completionPct === 20; } },
    { id: 'checklists.evaluate.defects', title: 'Checklist evaluation: non-critical DEFECTS', test: () => { const answers = Object.fromEntries(CHECKLISTS.grid_connection_4777.items.map((i) => [i.id, 'pass'])); answers.inv_monitoring = 'fail'; return evaluateChecklist('grid_connection_4777', answers).status === 'DEFECTS'; } },
    { id: 'checklists.applicable', title: 'Applicable checklists for a configuration', test: () => applicableChecklists({ hasBattery: true }).includes('battery_5139') && !applicableChecklists({ hasBattery: false }).includes('battery_5139') }
];
