#!/usr/bin/env node
/**
 * Check that every local `src=` / `href=` / fetch('./...') reference in the
 * static site resolves to a file that actually exists in docs/.
 *
 * GitHub Pages serves docs/ as-is, so a missing file is a 404 for the user.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const docs = path.join(__dirname, '..', 'docs');
const problems = [];
let checked = 0;

const ATTR_RE = /\b(?:src|href)\s*=\s*["']([^"']+)["']/g;
const FETCH_RE = /fetch\(\s*["'](\.\/[^"'?]+)["']/g;

function isLocal(ref) {
    if (!ref) return false;
    if (/^(https?:)?\/\//i.test(ref)) return false;
    if (/^(mailto:|tel:|javascript:|data:|blob:|about:|#)/i.test(ref)) return false;
    if (ref.includes('${')) return false; // template literal, resolved at runtime
    if (/[()[\]\\]/.test(ref)) return false; // regex source or code, not a path
    return true;
}

function resolveRef(fromFile, ref) {
    const clean = ref.split('#')[0].split('?')[0];
    if (!clean) return null;
    if (clean.startsWith('/')) {
        // Absolute paths break on GitHub Pages project sites (served under /<repo>/).
        problems.push(`${path.relative(docs, fromFile)}: absolute path "${ref}" will 404 on GitHub Pages`);
        return null;
    }
    return path.resolve(path.dirname(fromFile), clean);
}

function scan(file) {
    const text = fs.readFileSync(file, 'utf8');
    const refs = new Set();
    let match;
    while ((match = ATTR_RE.exec(text)) !== null) refs.add(match[1]);
    while ((match = FETCH_RE.exec(text)) !== null) refs.add(match[1]);

    for (const ref of refs) {
        if (!isLocal(ref)) continue;
        const target = resolveRef(file, ref);
        if (!target) continue;
        checked++;
        if (!fs.existsSync(target)) {
            problems.push(`${path.relative(docs, file)}: missing "${ref}"`);
        }
    }
}

for (const entry of fs.readdirSync(docs)) {
    if (entry.endsWith('.html')) scan(path.join(docs, entry));
}
// The JS modules on the home page also fetch data files.
for (const entry of fs.readdirSync(docs)) {
    if (entry.endsWith('.js')) scan(path.join(docs, entry));
}

if (problems.length > 0) {
    console.error(`❌ ${problems.length} broken local references:`);
    for (const problem of problems) console.error(' - ' + problem);
    process.exit(1);
}

console.log(`✅ ${checked} local references resolve`);
