#!/usr/bin/env node
/**
 * Build the business model from connector exports on disk.
 *
 *   node scripts/business-snapshot.mjs [rawDir] [outFile]
 *
 * rawDir (default data/business/raw) may hold either the server's per-source
 * files (servicem8.json, xero.json, google.json, bank.json) or hand-collected
 * exports named like the examples below; everything found is merged:
 *
 *   servicem8-jobs-*.json      { jobs: [...] }                 (one or more lists)
 *   servicem8-summaries*.json  { job_summaries: [...] }
 *   servicem8-details*.json    [ { job: {...}, cards: [...] } ]
 *   servicem8-staff.json       { staff: [...] }
 *   xero-summary.json          { org, pnl, position, cash, agedReceivables, agedPayables, topCustomers }
 *   xero-invoices*.json        { columns, rows } or { invoices: [...] }
 *   xero-bills*.json, xero-unreconciled*.json
 *   gmail-*.json               { threads: [...] }
 *   drive.json                 { root, folders, files }
 *   calendar.json              { calendars, events }
 *   bank.json                  { banks, accounts, transactions }
 *   market.json                assumption overrides
 *
 * The output (default data/business/model.json) is private: keep it out of
 * git and the public site. Import it in the game via Settings › Business, or
 * POST it to /api/business/import on your server.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rawDir = path.resolve(process.argv[2] || path.join(ROOT, 'data/business/raw'));
const outFile = path.resolve(process.argv[3] || path.join(ROOT, 'data/business/model.json'));

const { buildModel, modelDigest } = await import(path.join(ROOT, 'docs/realm/js/business/model.js'));

const read = (f) => JSON.parse(fs.readFileSync(path.join(rawDir, f), 'utf8'));
const files = fs.existsSync(rawDir) ? fs.readdirSync(rawDir).filter((f) => f.endsWith('.json')).sort() : [];
const pick = (re) => files.filter((f) => re.test(f));

const raw = {};
const company = {}; if (process.env.BUSINESS_NAME) company.name = process.env.BUSINESS_NAME; if (process.env.BUSINESS_DOMAINS) company.domains = process.env.BUSINESS_DOMAINS.split(',').map((s) => s.trim()).filter(Boolean);
if (Object.keys(company).length) raw.company = company;

if (files.includes('servicem8.json')) raw.servicem8 = read('servicem8.json');
else {
    const lists = pick(/^servicem8-jobs-.*\.json$/).map(read); const summaries = pick(/^servicem8-summaries.*\.json$/).map(read); const details = pick(/^servicem8-details.*\.json$/).flatMap((f) => { const d = read(f); return Array.isArray(d) ? d : [d]; });
    const staff = files.includes('servicem8-staff.json') ? read('servicem8-staff.json').staff : [];
    if (lists.length || summaries.length) raw.servicem8 = { lists, summaries, details, staff, queues: files.includes('servicem8-queues.json') ? read('servicem8-queues.json').data || [] : [], categories: [] };
}
if (files.includes('xero.json')) raw.xero = read('xero.json');
else if (files.includes('xero-summary.json') || pick(/^xero-invoices/).length) raw.xero = { summary: files.includes('xero-summary.json') ? read('xero-summary.json') : null, invoices: pick(/^xero-invoices.*\.json$/).map(read), bills: pick(/^xero-bills.*\.json$/).map(read), unreconciled: pick(/^xero-unreconciled.*\.json$/).map(read) };
if (files.includes('google.json')) { const g = read('google.json'); if (g.gmail) raw.gmail = { pages: g.gmail.pages }; if (g.drive) raw.drive = g.drive; if (g.calendar) raw.calendar = g.calendar; }
else {
    const pages = pick(/^gmail-.*\.json$/).map(read); if (pages.length) raw.gmail = { pages };
    if (files.includes('drive.json')) raw.drive = read('drive.json');
    if (files.includes('calendar.json')) raw.calendar = read('calendar.json');
}
if (files.includes('bank.json')) raw.bank = read('bank.json');
if (files.includes('market.json')) raw.market = read('market.json');

if (!Object.keys(raw).filter((k) => k !== 'company').length) { console.error(`No connector exports found in ${rawDir}`); process.exit(1); }
const model = buildModel(raw, { now: new Date() });
fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, JSON.stringify(model));
const d = modelDigest(model);
console.log(`model written to ${outFile} (${(fs.statSync(outFile).size / 1024).toFixed(0)} KB)`);
console.log(JSON.stringify(d));
console.log(`health ${d.health}/100 · ${d.findings} findings · top: ${model.insights.slice(0, 5).map((f) => `[${f.severity}] ${f.title}`).join(' | ')}`);
