/**
 * Standards codex: the AS/NZS standards the Realm works with, their key
 * clauses and plain-language summaries. Summaries only; the standards
 * themselves are copyrighted and must be purchased from Standards Australia.
 */

export const STANDARDS = [
    {
        id: 'AS_NZS_3000_2018', code: 'AS/NZS 3000:2018', title: 'Electrical installations (Wiring Rules)', edition: '2018 (+Amd 1:2020, Amd 2:2021, Amd 3:2023)', committee: 'EL-001',
        scope: 'Fundamental safety standard for electrical installations in Australia and New Zealand.',
        clauses: [
            { ref: '1.4', title: 'Definitions', summary: 'Terms such as point of supply, switchboard, final subcircuit and extra-low voltage.' },
            { ref: '2.5', title: 'Protection against overcurrent', summary: 'Every circuit needs overcurrent protection matched to the cable rating.' },
            { ref: '3.4', title: 'Current-carrying capacity', summary: 'Cables sized to AS/NZS 3008.1.1 with derating for installation conditions.' },
            { ref: '3.6.2', title: 'Voltage drop', summary: 'Total voltage drop from the point of supply to any point ≤ 5 % of nominal voltage.' },
            { ref: '4.1.2', title: 'Switchgear and controlgear', summary: 'Isolation requirements for equipment including inverters.' },
            { ref: '5.3', title: 'Earthing arrangements', summary: 'Main earthing conductor, MEN connection and protective earthing of equipment.' },
            { ref: '5.4', title: 'Equipotential bonding', summary: 'Bonding of exposed conductive parts such as PV array frames where required.' },
            { ref: '8.3', title: 'Verification and testing', summary: 'Mandatory tests before energising: continuity, insulation resistance, polarity, earth fault-loop impedance, RCD operation.' }
        ]
    },
    {
        id: 'AS_NZS_5033_2021', code: 'AS/NZS 5033:2021', title: 'Installation and safety requirements for photovoltaic (PV) arrays', edition: 'Fourth edition, Nov 2021', committee: 'EL-042',
        scope: 'd.c. array wiring, protection devices, switching and earthing provisions for PV arrays.',
        clauses: [
            { ref: '2.1', title: 'Restricted access (ground-mounted arrays)', summary: 'Arrays not on a roof or within 2.5 m of the ground require restricted access regardless of voltage.' },
            { ref: '4.2', title: 'Array maximum voltage', summary: 'Temperature-corrected Voc must not exceed the inverter, module or installation class limit (1000 V domestic with 4777.1:2024; 1500 V non-domestic).' },
            { ref: '4.3', title: 'Cable selection', summary: 'String cables rated for 1.25 × Isc; array cables for fault current or protection rating; PV1-F or equivalent.' },
            { ref: '4.3.3', title: 'Disconnection points', summary: 'Disconnection points (DC conditioning units) can replace a rooftop isolator subject to wiring rules.' },
            { ref: '4.4.3', title: 'd.c. isolation', summary: 'Load-breaking d.c. isolator at the PCE; correct polarity and wiring of isolators.' },
            { ref: '4.4.5', title: 'Wiring in ceiling spaces', summary: 'd.c. wiring not within 600 mm of the ceiling surface except within 200 mm of an isolator or 1–1.5 m from an external wall; otherwise in heavy-duty conduit.' },
            { ref: '5.3', title: 'Labelling and signage', summary: 'PV array d.c. isolator labels, array voltage/current, shutdown procedure and fire emergency information.' },
            { ref: '5.5', title: 'Earthing of array frames', summary: 'Equipotential bonding of array frames where required by the module class and installation.' },
            { ref: '6', title: 'Verification and documentation', summary: 'Commissioning tests and the information to be left with the owner.' }
        ]
    },
    {
        id: 'AS_NZS_4777_1_2024', code: 'AS/NZS 4777.1:2024', title: 'Grid connection of energy systems via inverters, Part 1: Installation requirements', edition: '2024 (released 23 Aug 2024)', committee: 'EL-042',
        scope: 'Installation of inverter energy systems (IES) including multiple-mode (battery) systems, EV chargers and power sharing devices.',
        clauses: [
            { ref: '3', title: 'Phase balance and capacity', summary: 'Single-phase IES up to 30 kVA subject to supply; imbalance between phases limited (≈5 kVA / 21.7 A).' },
            { ref: '3.3', title: 'Voltage rise', summary: 'Voltage rise from the point of supply to the inverter a.c. terminals ≤ 2 % of nominal.' },
            { ref: '4.3.2', title: 'Array voltage', summary: 'PV arrays may be configured up to 1000 V d.c. in domestic installations when the full 2024 requirements are followed.' },
            { ref: '5', title: 'Switchboards and isolation', summary: 'Inverter main switches: at most two on a switchboard with loads, otherwise a master switch; a.c. isolation adjacent to the inverter.' },
            { ref: '6 / App. A', title: 'Signage', summary: 'Supply type labels (alternative / independent / substitute), inverter main switch labels, multiple supply warning, shutdown procedure.' },
            { ref: '7', title: 'Verification', summary: 'Installation verification: protection settings, anti-islanding, documentation.' }
        ]
    },
    {
        id: 'AS_NZS_4777_2_2020', code: 'AS/NZS 4777.2:2020 (+Amd 2:2024)', title: 'Grid connection of energy systems via inverters, Part 2: Inverter requirements', edition: '2020, Amd 2 effective 23 Aug 2025', committee: 'EL-042',
        scope: 'Inverter product requirements: power quality, protection and region settings (Australia A/B/C, NZ).',
        clauses: [
            { ref: '4.3', title: 'Region settings', summary: 'Volt-var, volt-watt and frequency response per DNSP region; Amd 2 settings mandatory since Aug 2025.' },
            { ref: '4.4', title: 'Protective functions', summary: 'Passive anti-islanding trip limits and reconnection delay.' }
        ]
    },
    {
        id: 'AS_NZS_5139_2019', code: 'AS/NZS 5139:2019 (+Amd 1:2025)', title: 'Electrical installations – Safety of battery systems for use with power conversion equipment', edition: '2019, Amd 1 2025', committee: 'EL-042',
        scope: 'Installation of battery energy storage systems connected to PCE.',
        clauses: [
            { ref: '4.2', title: 'Location', summary: 'Not in habitable rooms, ceiling spaces, wall cavities, under stairs/walkways or on escape routes; 600 mm clearance from exits, windows, vents and hot water/air-conditioning units.' },
            { ref: '4.3', title: 'Environment', summary: 'Mechanical protection, weather protection and operating temperature per manufacturer.' },
            { ref: '5.3', title: 'Barriers', summary: 'Non-combustible barrier on combustible walls adjoining habitable rooms (600 mm each side, 900 mm above).' },
            { ref: '6', title: 'Electrical requirements', summary: 'd.c. protection, isolation, cable selection and earthing of the battery system.' },
            { ref: '7', title: 'Signage and documentation', summary: 'BESS warning labels, shutdown procedure, emergency information and owner documentation.' }
        ]
    },
    {
        id: 'AS_NZS_3008_1_1', code: 'AS/NZS 3008.1.1:2025', title: 'Electrical installations – Selection of cables (0.6/1 kV, typical Australian conditions)', edition: '2025 (supersedes 2017)', committee: 'EL-003',
        scope: 'Current-carrying capacity, voltage drop and short-circuit ratings of cables.',
        clauses: [
            { ref: '3', title: 'Current-carrying capacity', summary: 'Base ratings at 40 °C ambient with derating for grouping, thermal insulation and sunlight.' },
            { ref: '4.2', title: 'Voltage drop (mV/A·m)', summary: 'Vd = mV/A·m × I × L / 1000; single-phase values are three-phase values × 2/√3.' }
        ]
    },
    {
        id: 'AS_NZS_3017_2022', code: 'AS/NZS 3017:2022', title: 'Electrical installations – Verification by inspection and testing', edition: '2022', committee: 'EL-001',
        scope: 'How to perform the mandatory tests of AS/NZS 3000 Section 8.',
        clauses: [
            { ref: '3', title: 'Visual inspection', summary: 'Inspection before testing: cables, connections, protection, labelling.' },
            { ref: '4', title: 'Testing', summary: 'Continuity of earthing, insulation resistance (≥1 MΩ), polarity, correct circuit connections, earth fault-loop impedance, RCD tests.' }
        ]
    },
    {
        id: 'IEC_62446_1', code: 'IEC 62446-1:2016 (+A1:2018)', title: 'Photovoltaic systems – Requirements for testing, documentation and maintenance', edition: '2016', committee: 'IEC TC 82',
        scope: 'International reference for PV commissioning tests and documentation (used in UK/EU, mirrored by AS/NZS 5033 Section 6).',
        clauses: [
            { ref: '6', title: 'Verification', summary: 'Category 1 tests: continuity, polarity, string Voc/Isc, insulation resistance, functional tests.' },
            { ref: '4', title: 'Documentation', summary: 'System data, wiring diagrams, datasheets, commissioning records and O&M information.' }
        ]
    }
];

export function standardById(id) {
    return STANDARDS.find((s) => s.id === id) || null;
}

export function findClause(code, ref) {
    const std = STANDARDS.find((s) => s.code.startsWith(code) || s.id === code);
    if (!std) return null;
    return std.clauses.find((c) => c.ref === ref) || null;
}

export function searchStandards(query) {
    const q = String(query || '').toLowerCase().trim();
    if (!q) return [];
    const hits = [];
    for (const std of STANDARDS) {
        for (const clause of std.clauses) {
            const text = `${std.code} ${std.title} ${clause.ref} ${clause.title} ${clause.summary}`.toLowerCase();
            if (text.includes(q)) hits.push({ standard: std.code, standardId: std.id, ref: clause.ref, title: clause.title, summary: clause.summary });
        }
    }
    return hits;
}

export const FEATURES = [
    { id: 'standards.catalogue', title: 'Standards codex (8 standards)', test: () => STANDARDS.length >= 8 && STANDARDS.every((s) => s.clauses.length > 0) },
    { id: 'standards.standardById', title: 'Standard lookup', test: () => standardById('AS_NZS_5033_2021').code === 'AS/NZS 5033:2021' },
    { id: 'standards.findClause', title: 'Clause lookup', test: () => findClause('AS/NZS 3000', '3.6.2').title === 'Voltage drop' },
    { id: 'standards.search', title: 'Full-text clause search', test: () => searchStandards('600 mm').length >= 2 && searchStandards('').length === 0 }
];
