#!/usr/bin/env node
/**
 * Generates the SIMULATED CER product catalogue used by the static site.
 *
 * This is demonstration data, not the Clean Energy Council / Clean Energy
 * Regulator approved product lists. It exists so the UI has a realistic
 * volume of records to search and page through. The real lists are
 * published by the Clean Energy Council (modules, inverters, batteries) and
 * must be obtained from them directly.
 *
 * Properties of the generated data:
 *  - deterministic (seeded PRNG) so re-running produces an identical file;
 *  - every product id and manufacturer/model pair is unique;
 *  - specification numbers are rounded to sensible precision;
 *  - metadata.simulated is true and the UI shows that label.
 *
 * Writes docs/cer-product-database.json and docs/cer-product-summary.json.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const OUTPUT = path.join(__dirname, 'docs', 'cer-product-database.json');
const SUMMARY = path.join(__dirname, 'docs', 'cer-product-summary.json');

const COUNTS = { solar_panels: 4623, inverters: 2890, batteries: 1734 };

const BRANDS = {
    solar_panels: ['Trina Solar', 'JinkoSolar', 'Canadian Solar', 'LONGi Solar', 'Hanwha Q CELLS', 'First Solar', 'SunPower', 'REC Group', 'Suntech Power', 'Yingli Solar', 'Risen Energy', 'JA Solar', 'Jinergy', 'Seraphim', 'Astronergy'],
    inverters: ['Fronius', 'SolarEdge', 'Huawei', 'SMA Solar', 'ABB', 'Enphase', 'GoodWe', 'Growatt', 'Ginlong Solis', 'Delta Electronics', 'Schneider Electric'],
    batteries: ['Tesla', 'Enphase', 'Pylontech', 'BYD', 'LG Chem', 'Sonnen', 'Alpha ESS', 'Redback Technologies', 'Selectronic', 'Victron Energy']
};

const PANEL_SERIES = ['Vertex', 'Tiger', 'HiKu', 'Hi-MO', 'Q.PEAK', 'Series 6', 'Maxeon', 'Alpha', 'Ultra', 'Panda', 'Titan', 'DeepBlue', 'JNMM', 'Blade', 'Astro'];
const INVERTER_SERIES = ['Primo', 'HD-Wave', 'SUN2000', 'Sunny Boy', 'UNO', 'IQ', 'DNS', 'MIN', 'S6', 'RPI', 'Conext'];
const BATTERY_SERIES = ['Powerwall', 'IQ Battery', 'US', 'Battery-Box', 'RESU', 'eco', 'SMILE', 'Smart Hybrid', 'SP PRO', 'MultiPlus'];

// Mulberry32: small, fast, deterministic.
function createRandom(seed) {
    let state = seed >>> 0;
    return function random() {
        state = (state + 0x6D2B79F5) >>> 0;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const random = createRandom(20260211);
const between = (min, max) => min + random() * (max - min);
const intBetween = (min, max) => Math.floor(between(min, max + 1));
const round = (value, decimals = 1) => Number(value.toFixed(decimals));
const slug = (text) => text.replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '').toUpperCase();
const domain = (brand) => `https://${brand.toLowerCase().replace(/[^a-z0-9]+/g, '')}.example`;

function docs(brand, modelCode, extra = {}) {
    const base = `${domain(brand)}/docs/${modelCode.toLowerCase()}`;
    return { datasheet: `${base}-datasheet.pdf`, installationManual: `${base}-install.pdf`, ...extra };
}

const usedIds = new Set();
/** Returns a unique id and model code; collisions get a numeric revision suffix. */
function uniqueIdentity(brand, modelCode) {
    const prefix = `PROD_${slug(brand)}_${slug(modelCode)}`;
    let id = prefix;
    let model = modelCode;
    let n = 2;
    while (usedIds.has(id)) {
        id = `${prefix}_R${n}`;
        model = `${modelCode}-R${n}`;
        n++;
    }
    usedIds.add(id);
    return { id, model };
}

function panel(i) {
    const brand = BRANDS.solar_panels[i % BRANDS.solar_panels.length];
    const series = PANEL_SERIES[i % PANEL_SERIES.length];
    const watts = 250 + intBetween(0, 70) * 5; // 250–600 W in 5 W steps
    const variant = intBetween(1, 9);
    const modelCode = `${series}-${watts}-${variant}`;
    const efficiency = round(between(18, 22.5), 1);
    const voc = round(between(35, 50), 1);
    const identity = uniqueIdentity(brand, modelCode);
    return {
        id: identity.id,
        manufacturer: brand,
        model: identity.model,
        category: 'solar_panel',
        type: 'Solar Panel',
        cerApproved: true,
        specifications: {
            power_watts: watts,
            voc_volts: voc,
            isc_amps: round(between(8, 14), 2),
            efficiency_percent: efficiency,
            dimensions_mm: `${1600 + intBetween(0, 40) * 10}×${900 + intBetween(0, 30) * 10}×30mm`
        },
        documents: docs(brand, modelCode),
        knowledgePoints: [
            `Power Rating: ${watts}W - Nominal power under STC conditions`,
            `VOC: ${voc}V - Critical for string sizing`,
            `Efficiency: ${efficiency}% - Solar energy conversion rate`
        ]
    };
}

function inverter(i) {
    const brand = BRANDS.inverters[i % BRANDS.inverters.length];
    const series = INVERTER_SERIES[i % INVERTER_SERIES.length];
    const kw = [1.5, 2, 2.5, 3, 3.6, 4, 5, 6, 8, 8.2, 10, 12.5, 15, 17, 20, 25, 27, 30][intBetween(0, 17)];
    const variant = intBetween(1, 30);
    const modelCode = `${series}-${kw}-${variant}`;
    const efficiency = round(between(96, 98.5), 1);
    const identity = uniqueIdentity(brand, modelCode);
    return {
        id: identity.id,
        manufacturer: brand,
        model: identity.model,
        category: 'inverter',
        type: kw <= 3 ? 'Micro/Single-phase Inverter' : kw >= 10 ? 'Three-phase String Inverter' : 'String Inverter',
        cerApproved: true,
        specifications: {
            ac_power_watts: Math.round(kw * 1000),
            max_dc_voltage: kw >= 10 ? 1100 : 600,
            efficiency_percent: efficiency,
            mppt_channels: kw >= 10 ? intBetween(2, 4) : intBetween(1, 2),
            phases: kw >= 10 ? 3 : 1
        },
        documents: docs(brand, modelCode),
        knowledgePoints: [
            `AC Power: ${Math.round(kw * 1000)}W - Maximum continuous AC power output`,
            `Efficiency: ${efficiency}% - Power conversion efficiency`,
            'Grid connection must comply with AS/NZS 4777.1 and AS/NZS 4777.2'
        ]
    };
}

function battery(i) {
    const brand = BRANDS.batteries[i % BRANDS.batteries.length];
    const series = BATTERY_SERIES[i % BATTERY_SERIES.length];
    const capacity = round(between(5, 25), 1);
    const variant = intBetween(1, 40);
    const modelCode = `${series}-${capacity}-${variant}`;
    const power = round(between(2, 10), 1);
    const identity = uniqueIdentity(brand, modelCode);
    return {
        id: identity.id,
        manufacturer: brand,
        model: identity.model,
        category: 'battery',
        type: 'Battery Storage System',
        cerApproved: true,
        specifications: {
            usable_capacity_kwh: capacity,
            continuous_power_kw: power,
            efficiency_percent: round(between(85, 95), 1),
            voltage_range: random() > 0.5 ? '48V' : 'HV (200-500V)',
            chemistry: 'LiFePO4'
        },
        documents: docs(brand, modelCode, { userManual: `${domain(brand)}/docs/${modelCode.toLowerCase()}-manual.pdf` }),
        knowledgePoints: [
            `Usable Capacity: ${capacity}kWh - Available energy storage`,
            `Continuous Power: ${power}kW - Sustained power output`,
            'AS/NZS 5139 Compliance: Battery safety standards for residential installation'
        ]
    };
}

function build() {
    const categories = {
        solar_panels: Array.from({ length: COUNTS.solar_panels }, (_, i) => panel(i)),
        inverters: Array.from({ length: COUNTS.inverters }, (_, i) => inverter(i)),
        batteries: Array.from({ length: COUNTS.batteries }, (_, i) => battery(i))
    };
    const total = Object.values(categories).reduce((sum, list) => sum + list.length, 0);

    const database = {
        metadata: {
            totalProducts: total,
            simulated: true,
            source: 'Simulated catalogue generated by create-realistic-cer-db.js (deterministic seed). Not the CEC/CER approved product lists.',
            realListsUrl: 'https://www.cleanenergycouncil.org.au/industry-programs/products-program',
            generator: 'create-realistic-cer-db.js',
            seed: 20260211,
            lastUpdated: '2026-02-11T00:00:00.000Z',
            categories: Object.fromEntries(Object.entries(categories).map(([key, list]) => [key, list.length]))
        },
        categories
    };

    const manufacturers = {};
    for (const list of Object.values(categories)) {
        for (const product of list) manufacturers[product.manufacturer] = (manufacturers[product.manufacturer] || 0) + 1;
    }

    const summary = {
        totalProducts: total,
        simulated: true,
        byCategory: { solar_panel: categories.solar_panels.length, inverter: categories.inverters.length, battery: categories.batteries.length },
        manufacturers: Object.keys(manufacturers).sort(),
        manufacturerCounts: manufacturers,
        lastUpdated: database.metadata.lastUpdated,
        source: database.metadata.source
    };

    return { database, summary };
}

if (require.main === module) {
    const { database, summary } = build();
    // Minified: this file is ~5 MB and is fetched by browsers, never hand-edited.
    fs.writeFileSync(OUTPUT, JSON.stringify(database));
    fs.writeFileSync(SUMMARY, JSON.stringify(summary, null, 2) + '\n');
    console.log(`✅ Wrote ${database.metadata.totalProducts} simulated products to ${path.relative(process.cwd(), OUTPUT)} (${(fs.statSync(OUTPUT).size / 1024 / 1024).toFixed(2)} MB)`);
    console.log(`✅ Wrote summary to ${path.relative(process.cwd(), SUMMARY)}`);
}

module.exports = { build };
