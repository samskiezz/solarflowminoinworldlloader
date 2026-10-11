#!/usr/bin/env node
/**
 * Import the official Clean Energy Council approved product lists.
 *
 * The Clean Energy Regulator republishes the CEC lists as CSV:
 *   https://cer.gov.au/document/cec-approved-pv-modules-0
 *   https://cer.gov.au/document/cec-approved-inverters-0
 *   https://cer.gov.au/document/cec-approved-solar-batteries-0
 *
 * Usage:
 *   node scripts/import-cec-lists.js                # download and convert
 *   node scripts/import-cec-lists.js --from <dir>   # convert CSVs already in <dir>
 *
 * Writes docs/data/cec-products.json (the real catalogue used by the Realm
 * Workstation and the API) and docs/data/cec-products-summary.json.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const SOURCES = {
    solar_panels: { url: 'https://cer.gov.au/document/cec-approved-pv-modules-0', file: 'cec-approved-pv-modules.csv' },
    inverters: { url: 'https://cer.gov.au/document/cec-approved-inverters-0', file: 'cec-approved-inverters.csv' },
    batteries: { url: 'https://cer.gov.au/document/cec-approved-solar-batteries-0', file: 'cec-approved-solar-batteries.csv' }
};

const OUT_DIR = path.join(__dirname, '..', 'docs', 'data');

/** Minimal RFC 4180 CSV parser (handles quoted fields with commas/newlines). */
function parseCsv(text) {
    const rows = [];
    let row = [];
    let field = '';
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (inQuotes) {
            if (ch === '"') {
                if (text[i + 1] === '"') { field += '"'; i++; } else { inQuotes = false; }
            } else {
                field += ch;
            }
        } else if (ch === '"') {
            inQuotes = true;
        } else if (ch === ',') {
            row.push(field); field = '';
        } else if (ch === '\n' || ch === '\r') {
            if (ch === '\r' && text[i + 1] === '\n') i++;
            row.push(field); field = '';
            if (row.some((cell) => cell !== '')) rows.push(row);
            row = [];
        } else {
            field += ch;
        }
    }
    if (field !== '' || row.length) { row.push(field); if (row.some((cell) => cell !== '')) rows.push(row); }
    return rows;
}

/** d/m/yyyy → ISO date (or null). */
function isoDate(value) {
    const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(String(value || '').trim());
    if (!match) return null;
    const [, d, m, y] = match;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

function slug(text) {
    return String(text).replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '').toUpperCase();
}

function clean(text) {
    return String(text || '').replace(/\s+/g, ' ').trim();
}

/** Pull the AS 4777.2 edition and a nominal kW out of inverter model strings. */
function inverterMeta(model, acPowerKw) {
    const std = /\(AS\s*4777[-.]2\s*(\d{4})\)/i.exec(model);
    return {
        inverterStandard: std ? `AS/NZS 4777.2:${std[1]}` : null,
        ac_power_kw: Number.isFinite(acPowerKw) ? acPowerKw : null
    };
}

function convert(csvByCategory, today = new Date()) {
    const usedIds = new Set();
    const uniqueId = (prefix) => {
        let id = prefix; let n = 2;
        while (usedIds.has(id)) id = `${prefix}_${n++}`;
        usedIds.add(id);
        return id;
    };
    const isCurrent = (expiry) => !expiry || expiry >= today.toISOString().slice(0, 10);

    const categories = { solar_panels: [], inverters: [], batteries: [] };

    for (const row of parseCsv(csvByCategory.solar_panels).slice(1)) {
        const [holder, model, approved, expiry, fireTested] = row.map(clean);
        if (!model) continue;
        const expiryIso = isoDate(expiry);
        categories.solar_panels.push({
            id: uniqueId(`CEC_PV_${slug(holder).slice(0, 40)}_${slug(model).slice(0, 60)}`),
            manufacturer: holder,
            model,
            category: 'solar_panel',
            type: 'PV module',
            cerApproved: isCurrent(expiryIso),
            approvedDate: isoDate(approved),
            expiryDate: expiryIso,
            specifications: {
                fire_tested: /^yes$/i.test(fireTested),
                certification: /IEC\s*61215[-\s]?(\d{4})/i.exec(model) ? `IEC 61215-${/IEC\s*61215[-\s]?(\d{4})/i.exec(model)[1]}` : null,
                max_system_voltage: /IEC\s*1500V/i.test(model) ? 1500 : null
            },
            source: 'CEC approved PV modules (via Clean Energy Regulator CSV)'
        });
    }

    for (const row of parseCsv(csvByCategory.inverters).slice(1)) {
        const [manufacturer, series, model, acPower, approved, expiry] = row.map(clean);
        if (!model) continue;
        const expiryIso = isoDate(expiry);
        const kw = parseFloat(acPower);
        const meta = inverterMeta(model, kw);
        const isStorage = /storage|battery|hybrid|ess/i.test(`${series} ${model}`);
        categories.inverters.push({
            id: uniqueId(`CEC_INV_${slug(manufacturer).slice(0, 40)}_${slug(model).slice(0, 60)}`),
            manufacturer,
            series,
            model,
            category: 'inverter',
            type: isStorage ? 'Hybrid / storage inverter' : kw >= 30 ? 'Commercial inverter' : 'Grid-connected inverter',
            cerApproved: isCurrent(expiryIso),
            approvedDate: isoDate(approved),
            expiryDate: expiryIso,
            specifications: {
                ac_power_watts: Number.isFinite(kw) ? Math.round(kw * 1000) : null,
                ac_power_kw: meta.ac_power_kw,
                inverter_standard: meta.inverterStandard,
                phases: null
            },
            source: 'CEC approved inverters (via Clean Energy Regulator CSV)'
        });
    }

    for (const row of parseCsv(csvByCategory.batteries).slice(1)) {
        const [holder, brand, series, model, nominal, usable, approved, expiry] = row.map(clean);
        if (!model) continue;
        const expiryIso = isoDate(expiry);
        const nominalKwh = parseFloat(nominal);
        const usableKwh = parseFloat(usable);
        categories.batteries.push({
            id: uniqueId(`CEC_BAT_${slug(brand || holder).slice(0, 40)}_${slug(model).slice(0, 60)}`),
            manufacturer: brand || holder,
            certificateHolder: holder,
            series,
            model,
            category: 'battery',
            type: 'Battery energy storage system',
            cerApproved: isCurrent(expiryIso),
            approvedDate: isoDate(approved),
            expiryDate: expiryIso,
            specifications: {
                nominal_capacity_kwh: Number.isFinite(nominalKwh) ? nominalKwh : null,
                usable_capacity_kwh: Number.isFinite(usableKwh) ? usableKwh : null
            },
            source: 'CEC approved solar batteries (via Clean Energy Regulator CSV)'
        });
    }

    const total = Object.values(categories).reduce((n, list) => n + list.length, 0);
    const current = Object.values(categories).reduce((n, list) => n + list.filter((p) => p.cerApproved).length, 0);
    const manufacturers = {};
    for (const list of Object.values(categories)) for (const p of list) manufacturers[p.manufacturer] = (manufacturers[p.manufacturer] || 0) + 1;

    const metadata = {
        totalProducts: total,
        currentlyApproved: current,
        simulated: false,
        source: 'Clean Energy Council approved product lists, republished as CSV by the Clean Energy Regulator',
        sourceUrls: Object.fromEntries(Object.entries(SOURCES).map(([key, src]) => [key, src.url])),
        importedAt: today.toISOString(),
        categories: Object.fromEntries(Object.entries(categories).map(([key, list]) => [key, list.length])),
        licence: 'CER/CEC published data; check the source lists before relying on approval status for STC claims.'
    };

    const summary = {
        totalProducts: total,
        currentlyApproved: current,
        simulated: false,
        byCategory: { solar_panel: categories.solar_panels.length, inverter: categories.inverters.length, battery: categories.batteries.length },
        manufacturers: Object.keys(manufacturers).sort(),
        manufacturerCounts: manufacturers,
        importedAt: metadata.importedAt,
        source: metadata.source
    };

    return { database: { metadata, categories }, summary };
}

async function download(url) {
    const response = await fetch(url, { headers: { 'User-Agent': 'SolarFlow importer (+https://github.com/samskiezz/solarflowminoinworldlloader)' } });
    if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
    return response.text();
}

async function main() {
    const fromIndex = process.argv.indexOf('--from');
    const csvByCategory = {};
    for (const [key, src] of Object.entries(SOURCES)) {
        if (fromIndex > -1) {
            csvByCategory[key] = fs.readFileSync(path.join(process.argv[fromIndex + 1], src.file), 'utf8');
        } else {
            process.stdout.write(`Downloading ${src.url} ... `);
            csvByCategory[key] = await download(src.url);
            console.log('ok');
        }
    }
    const { database, summary } = convert(csvByCategory);
    fs.mkdirSync(OUT_DIR, { recursive: true });
    fs.writeFileSync(path.join(OUT_DIR, 'cec-products.json'), JSON.stringify(database));
    fs.writeFileSync(path.join(OUT_DIR, 'cec-products-summary.json'), JSON.stringify(summary, null, 2) + '\n');
    console.log(`✅ ${database.metadata.totalProducts} products (${database.metadata.currentlyApproved} currently approved) → docs/data/cec-products.json`);
}

module.exports = { parseCsv, convert, isoDate, SOURCES };

if (require.main === module) {
    main().catch((error) => { console.error('Import failed:', error.message); process.exit(1); });
}
