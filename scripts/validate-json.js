#!/usr/bin/env node
/**
 * Validate every JSON data file served by the site (and the project config).
 *
 * The front end fetches these files directly, so a single stray character
 * (see the old `"delta":+0.2` in agora.json) breaks a page at runtime.
 * Also runs a few structural checks on the core datasets.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const SKIP_DIRS = new Set(['node_modules', '.git', 'backups', 'artifacts', 'apps', 'genesis', 'vendor', 'coverage']);

function walk(dir, out) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.isDirectory()) {
            if (!SKIP_DIRS.has(entry.name)) walk(path.join(dir, entry.name), out);
        } else if (entry.name.endsWith('.json')) {
            out.push(path.join(dir, entry.name));
        }
    }
    return out;
}

const errors = [];
const parsed = new Map();

for (const file of walk(root, [])) {
    try {
        parsed.set(path.relative(root, file), JSON.parse(fs.readFileSync(file, 'utf8')));
    } catch (error) {
        errors.push(`${path.relative(root, file)}: ${error.message}`);
    }
}

// Structural checks on the datasets the UI depends on.
function check(condition, message) {
    if (!condition) errors.push(message);
}

const minions = parsed.get('docs/minions.json');
if (minions) {
    check(Array.isArray(minions.minions) && minions.minions.length > 0, 'docs/minions.json: minions[] missing or empty');
    const ids = new Set();
    for (const minion of minions.minions || []) {
        check(typeof minion.id === 'string' && minion.id.length > 0, 'docs/minions.json: minion without id');
        check(!ids.has(minion.id), `docs/minions.json: duplicate minion id ${minion.id}`);
        ids.add(minion.id);
        check(typeof minion.tier === 'number', `docs/minions.json: ${minion.id} tier must be a number`);
        if (minion.avatar_url) {
            check(fs.existsSync(path.join(root, 'docs', minion.avatar_url)), `docs/minions.json: ${minion.id} avatar missing: ${minion.avatar_url}`);
        }
    }
}

const cer = parsed.get('docs/cer-product-database.json');
if (cer) {
    const categories = cer.categories || {};
    const total = ['solar_panels', 'inverters', 'batteries'].reduce((sum, key) => sum + (categories[key] || []).length, 0);
    check(total > 0, 'docs/cer-product-database.json: no products in categories');
    check(!cer.metadata || cer.metadata.totalProducts === total, `docs/cer-product-database.json: metadata.totalProducts (${cer.metadata && cer.metadata.totalProducts}) != actual (${total})`);
}

const summary = parsed.get('docs/cer-product-summary.json');
if (summary && cer) {
    const actual = ['solar_panels', 'inverters', 'batteries'].reduce((sum, key) => sum + ((cer.categories || {})[key] || []).length, 0);
    check(summary.totalProducts === actual, 'docs/cer-product-summary.json is stale: run `npm run build:cer`');
}

const standards = parsed.get('docs/as-nzs-standards-scraped.json');
if (standards) {
    check(typeof standards === 'object' && Object.keys(standards).length > 1, 'docs/as-nzs-standards-scraped.json: empty');
}

if (errors.length > 0) {
    console.error(`❌ JSON validation failed (${errors.length}):`);
    for (const error of errors) console.error(' - ' + error);
    process.exit(1);
}

console.log(`✅ ${parsed.size} JSON files valid`);
