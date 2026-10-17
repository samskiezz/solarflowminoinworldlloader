#!/usr/bin/env node
/**
 * Run the thousand-feature programme headless: Ultron's workforce takes every
 * item through research → execute → audit → review → sign-off against the
 * harvested library, the Node-runnable self-tests verify the live items, and
 * the result lands in docs/data/programme-state.json for the site and the
 * Programme window. The nightly routine runs this after the harvest.
 *
 *   node scripts/programme-run.mjs [--hours 720] [--mode full]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..');
const args = process.argv.slice(2); const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const hours = Number(opt('--hours', 720)); const mode = opt('--mode', 'full');

const { World } = await import(path.join(root, 'docs', 'realm', 'js', 'sim', 'world.js'));
const { createLibrary } = await import(path.join(root, 'docs', 'realm', 'js', 'domain', 'library.js'));
const { loadAll, registry } = await import(path.join(root, 'docs', 'realm', 'js', 'modules.js'));

const programme = JSON.parse(fs.readFileSync(path.join(root, 'docs', 'data', 'programme.json'), 'utf8'));
const kdir = path.join(root, 'docs', 'data', 'knowledge');
const index = JSON.parse(fs.readFileSync(path.join(kdir, 'index.json'), 'utf8'));
const books = {}; for (const b of index.books || []) { const f = path.join(kdir, `${b.id}.json`); if (fs.existsSync(f)) books[b.id] = JSON.parse(fs.readFileSync(f, 'utf8')); }
const library = createLibrary({ index, books });

const statePath = path.join(root, 'docs', 'data', 'programme-state.json');
const previous = fs.existsSync(statePath) ? JSON.parse(fs.readFileSync(statePath, 'utf8')) : null;
const world = new World({ seed: 2026 });
world.library = library;
world.programme.load(programme); world.programme.setMode(mode);
if (previous && previous.state) world.programme.state = previous.state; // carry the signed items forward; only the open ones get worked again

const before = world.programme.summary();
let t = 0; while (t < hours && world.programme.summary().signedTotal < programme.total) { world.tick(1); t++; }
const after = world.programme.summary();

// verify the live items with the real self-tests (Node-runnable ones; browser-only ones are verified by the smoke run)
await loadAll();
const run = await registry.runAll({ filter: (f) => !f.dom });
const results = {}; for (const r of run.results || []) if (r.status !== 'skipped') results[r.id] = r.status === 'passed';
// browser-only features: take the last Chromium run (tests/browser/realm-selftest.js) when it exists
const browserReport = path.join(root, 'docs', 'realm', 'selftest-browser.json');
if (fs.existsSync(browserReport)) { const rep = JSON.parse(fs.readFileSync(browserReport, 'utf8')); for (const r of rep.results || []) if (!(r.id in results) && r.status !== 'skipped') results[r.id] = r.status === 'passed'; }
const verified = world.programme.verify(results);

const out = { generatedAt: new Date().toISOString(), hoursSimulated: t, mode, summary: after, verified, workforce: world.workforce.summary(), state: world.programme.state };
fs.writeFileSync(statePath, JSON.stringify(out));
console.log(`programme: ${before.signedTotal} → ${after.signedTotal} of ${after.total} signed off in ${t} simulated hours (${after.pct} %); ${after.specs} specifications; ${verified.verified} live items verified, ${verified.failed} failed; ${world.workforce.summary().handoffs} hand-offs → ${path.relative(root, statePath)}`);
