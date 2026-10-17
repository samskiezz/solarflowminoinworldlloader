#!/usr/bin/env node
/**
 * Syntax-check every JavaScript file that ships with the app.
 *
 * Runs `node --check` on server code, scripts and the front-end modules in
 * docs/ so that a truncated or mis-typed file (several shipped that way in
 * the past) fails CI instead of silently breaking a page.
 */
'use strict';

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const SKIP_DIRS = new Set(['node_modules', '.git', 'backups', 'artifacts', 'apps', 'genesis', 'vendor', 'builds', 'coverage']);

function walk(dir, out) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.isDirectory()) {
            if (!SKIP_DIRS.has(entry.name)) walk(path.join(dir, entry.name), out);
        } else if (entry.name.endsWith('.js') && !entry.name.endsWith('.min.js')) {
            out.push(path.join(dir, entry.name));
        }
    }
    return out;
}

const files = walk(root, []);
const failures = [];

for (const file of files) {
    try {
        execFileSync(process.execPath, ['--check', file], { stdio: ['ignore', 'ignore', 'pipe'] });
    } catch (error) {
        const message = String(error.stderr || error.message).split('\n').slice(0, 4).join('\n');
        failures.push({ file: path.relative(root, file), message });
    }
}

if (failures.length > 0) {
    console.error(`❌ ${failures.length} of ${files.length} JavaScript files failed to parse:`);
    for (const failure of failures) {
        console.error(`\n${failure.file}\n${failure.message}`);
    }
    process.exit(1);
}

console.log(`✅ ${files.length} JavaScript files parse cleanly`);
