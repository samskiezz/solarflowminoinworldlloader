#!/usr/bin/env node
/**
 * Generate docs/realm/FEATURES.md – the verifiable feature ledger of the
 * Realm Workstation. Every feature is a registered self-test; this script
 * loads the registry, runs the Node-runnable tests, and writes the ledger.
 * Browser-only features (DOM) are listed and marked; they run in
 * tests/browser/realm-selftest.js and in the in-app System check.
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const { loadAll, registry } = await import(path.join(here, '..', 'docs', 'realm', 'js', 'modules.js'));
await loadAll();
const features = registry.all();
const summary = await registry.runAll({ filter: (f) => !f.dom });
if (summary.failed) { console.error(`${summary.failed} Node-runnable feature tests failed:`); for (const f of summary.failures) console.error(` - ${f.id}: ${f.error}`); process.exit(1); }

const groups = {};
for (const f of features) (groups[f.module] = groups[f.module] || []).push(f);
const dom = features.filter((f) => f.dom).length;
const area = (m) => (m.startsWith('core/') ? 'Core shell' : m.startsWith('domain/') ? 'Solar engineering domain' : m.startsWith('sim/') ? 'Crew simulation' : m.startsWith('windows/') ? 'Windows' : 'Shell');
const byArea = {};
for (const [m, list] of Object.entries(groups)) byArea[area(m)] = (byArea[area(m)] || 0) + list.length;

const lines = [
    '# SolarFlow Realm Workstation – feature ledger', '',
    'Every feature listed here is a registered self-test (`FEATURES` export of its module). The count is produced by `npm run features:realm`,',
    'verified in Node for the pure features and in Chromium (`npm run smoke:realm`, or the in-app **System check** window) for the DOM features.', '',
    '| Metric | Value |', '|---|---|', `| Registered features | **${features.length}** |`, `| Verified in Node (this run) | ${summary.passed} passed, ${summary.failed} failed |`, `| Browser-verified (DOM) features | ${dom} |`, `| Modules | ${Object.keys(groups).length} |`, `| Generated | ${new Date().toISOString()} |`, '',
    '## By area', '', '| Area | Features |', '|---|---|', ...Object.entries(byArea).map(([a, n]) => `| ${a} | ${n} |`), ''
];
for (const [m, list] of Object.entries(groups).sort()) {
    lines.push(`## ${m} (${list.length})`, '', '| # | Feature | What it verifies | Runs in |', '|---|---|---|---|');
    list.forEach((f, i) => lines.push(`| ${i + 1} | \`${f.id}\` | ${f.title.replace(/\|/g, '\\|')} | ${f.dom ? 'browser' : 'node + browser'} |`));
    lines.push('');
}
const out = path.join(here, '..', 'docs', 'realm', 'FEATURES.md');
writeFileSync(out, lines.join('\n'));
console.log(`${features.length} features (${dom} browser-only) in ${Object.keys(groups).length} modules → ${path.relative(process.cwd(), out)}`);
