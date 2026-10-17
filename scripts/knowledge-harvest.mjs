#!/usr/bin/env node
/**
 * Knowledge harvester: the crew's librarians go out on the web and compile
 * everything public about every book on the shelf (docs/data/knowledge-sources.json).
 *
 *   node scripts/knowledge-harvest.mjs                # seeds only
 *   node scripts/knowledge-harvest.mjs --discover     # also search the web for more sources (DuckDuckGo HTML)
 *   node scripts/knowledge-harvest.mjs --browser      # fetch refused pages through Chromium (Playwright) as a last resort
 *   node scripts/knowledge-harvest.mjs --book as_nzs_5139_2019
 *   node scripts/knowledge-harvest.mjs --inbox data/knowledge/inbox   # index licensed PDFs you hold (private, never committed)
 *
 * Output:
 *   data/knowledge/raw/<book>/<hash>.txt     full extracted text of every source (gitignored)
 *   data/knowledge/private/<book>.json       full private index incl. inbox PDFs (gitignored; import in Library › Harvest)
 *   docs/data/knowledge/<book>.json          the public book: sources, passages (capped), clause index, facts
 *   docs/data/knowledge/index.json           the shelf summary the Realm loads
 *
 * Copyright books (AS/NZS standards) only ever get public pages – publisher descriptions, contents,
 * amendment lists, regulator and industry guidance. Their own text is only indexed from PDFs you put
 * in the inbox, and that index stays on your machine.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import os from 'node:os';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const exec = promisify(execFile);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const args = process.argv.slice(2);
const opt = (name, fallback = null) => { const i = args.indexOf(name); return i >= 0 ? (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true) : fallback; };
const DISCOVER = args.includes('--discover');
const ONLY = opt('--book');
const INBOX = opt('--inbox', 'data/knowledge/inbox');
const MAX_PER_BOOK = Number(opt('--max-per-book', 25));
const MAX_PASSAGES_PUBLIC = Number(opt('--max-passages', 80)); // per source in the committed book
const TIMEOUT_MS = Number(opt('--timeout', 45000));
const UA = 'SolarFlowRealm-Librarian/2.10 (+https://github.com/samskiezz/solarflowminoinworldlloader; compiles public regulatory knowledge)';

const SOURCES = JSON.parse(await fs.readFile(path.join(ROOT, 'docs/data/knowledge-sources.json'), 'utf8'));
const OUT_PUBLIC = path.join(ROOT, 'docs/data/knowledge');
const OUT_RAW = path.join(ROOT, 'data/knowledge/raw');
const OUT_PRIVATE = path.join(ROOT, 'data/knowledge/private');
await Promise.all([OUT_PUBLIC, OUT_RAW, OUT_PRIVATE].map((d) => fs.mkdir(d, { recursive: true })));

const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const sha = (s) => createHash('sha1').update(s).digest('hex').slice(0, 12);
const allowed = (url) => { try { const h = new URL(url).hostname.replace(/^www\./, ''); return SOURCES.allowDomains.some((d) => h === d || h.endsWith(`.${d}`)); } catch { return false; } };

/* ---------- fetching ---------- */
const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
const BROWSER = args.includes('--browser');
let chromium = null;
/** Some regulators and standards stores refuse anything that is not a browser: retry with a browser identity, then (with --browser) through Chromium. */
async function fetchUrl(url, attempt = 0) {
    const r = await fetchOnce(url, attempt === 0 ? UA : BROWSER_UA);
    if (r.ok || attempt > 0) { if (!r.ok && BROWSER) return fetchViaBrowser(url, r); return r; }
    if (r.status === 403 || r.status === 429 || r.status === 503 || r.status === 0) return fetchUrl(url, 1);
    return r;
}
async function fetchViaBrowser(url, previous) {
    try {
        if (!chromium) { chromium = require('playwright').chromium; } // CommonJS resolution honours NODE_PATH (the smoke tests load it the same way)
        const browser = await chromium.launch({ headless: true });
        try {
            const page = await (await browser.newContext({ userAgent: BROWSER_UA, locale: 'en-AU' })).newPage();
            if (/\.pdf(\?|$)/i.test(url)) { const res = await page.request.get(url, { timeout: TIMEOUT_MS }); if (!res.ok()) return { ...previous, status: `${res.status()} (browser)` }; return { ok: true, status: `${res.status()} (browser)`, type: res.headers()['content-type'] || 'application/pdf', buf: Buffer.from(await res.body()), finalUrl: url }; }
            const res = await page.goto(url, { waitUntil: 'networkidle', timeout: TIMEOUT_MS }); if (!res || !res.ok()) return { ...previous, status: `${res ? res.status() : 0} (browser)` };
            const html = await page.content();
            return { ok: true, status: `${res.status()} (browser)`, type: 'text/html', buf: Buffer.from(html, 'utf8'), finalUrl: page.url() };
        } finally { await browser.close(); }
    } catch (error) { return { ...previous, status: `${previous.status}; browser: ${error.message.split('\n')[0].slice(0, 60)}` }; }
}
async function fetchOnce(url, ua) {
    const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
        const res = await fetch(url, { headers: { 'user-agent': ua, accept: 'text/html,application/pdf,application/xhtml+xml,*/*', 'accept-language': 'en-AU,en;q=0.9' }, redirect: 'follow', signal: ctrl.signal });
        const type = (res.headers.get('content-type') || '').toLowerCase();
        if (!res.ok) return { ok: false, status: res.status, type };
        const buf = Buffer.from(await res.arrayBuffer());
        return { ok: true, status: res.status, type, buf, finalUrl: res.url || url };
    } catch (error) { return { ok: false, status: 0, error: error.name === 'AbortError' ? 'timeout' : error.message }; }
    finally { clearTimeout(t); }
}

async function pdfToText(buf) {
    const tmp = path.join(os.tmpdir(), `realm-${sha(String(Math.random()))}.pdf`);
    await fs.writeFile(tmp, buf);
    try {
        try { const { stdout } = await exec('pdftotext', ['-layout', '-enc', 'UTF-8', tmp, '-'], { maxBuffer: 64 * 1024 * 1024 }); if (stdout.trim()) return stdout; } catch { /* fall through */ }
        try { const { stdout } = await exec('python3', ['-I', '-c', 'import sys\nfrom pypdf import PdfReader\nr=PdfReader(sys.argv[1])\nprint("\\n\\f".join((p.extract_text() or "") for p in r.pages))', tmp], { maxBuffer: 64 * 1024 * 1024 }); return stdout; } catch { return ''; }
    } finally { await fs.rm(tmp, { force: true }); }
}

function htmlToText(html) {
    let s = String(html);
    const title = (s.match(/<title[^>]*>([^<]*)<\/title>/i) || [])[1] || '';
    s = s.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ');
    s = s.replace(/<(nav|footer|header|aside)[\s\S]*?<\/\1>/gi, ' ');
    s = s.replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/tr|\/section|\/article|\/td)[^>]*>/gi, '\n').replace(/<[^>]+>/g, ' ');
    s = s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
    s = s.split('\n').map((l) => l.replace(/[ \t]+/g, ' ').trim()).filter(Boolean).join('\n');
    return { title: title.replace(/\s+/g, ' ').trim(), text: s };
}

/* ---------- discovery (best effort) ---------- */
async function discover(query) {
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const r = await fetchUrl(url);
    if (!r.ok) return [];
    const html = r.buf.toString('utf8');
    const out = [];
    for (const m of html.matchAll(/class="result__a"[^>]*href="([^"]+)"/g)) {
        let href = m[1].replace(/&amp;/g, '&');
        const u = href.match(/uddg=([^&]+)/); if (u) href = decodeURIComponent(u[1]);
        if (href.startsWith('//')) href = `https:${href}`;
        if (/^https?:/.test(href) && allowed(href)) out.push(href);
    }
    return [...new Set(out)];
}

/* ---------- compiling ---------- */
const STOP = new Set('the and for with that this from are was were been have has not but into than then they them their there which when where while shall should must may can will would could also such only any all each other these those over under upon about above below between within without being does did done per via use used using note notes see table figure clause clauses page pages section sections part parts standard standards requirements requirement installation installations electrical system systems'.split(' '));
const CLAUSE_RE = /\b(?:clause|cl\.?|section|s\.)\s*(\d+(?:\.\d+){1,4})\b/gi;
const CLAUSE_LINE_RE = /^(\d+(?:\.\d+){1,4})\s+([A-Z][^\n]{3,80})$/;
const CODE_RE = /\bAS\/?NZS\s?\d{4}(?:\.\d(?:\.\d)?)?(?::\d{4})?/g;

function passagesFrom(text, sourceId) {
    const lines = text.split('\n');
    const paras = []; let cur = [];
    const flush = () => { if (cur.length) { paras.push(cur.join(' ').replace(/\s+/g, ' ').trim()); cur = []; } };
    for (const line of lines) {
        const l = line.trim();
        if (!l) { flush(); continue; }
        if (CLAUSE_LINE_RE.test(l) || /^[A-Z][A-Z0-9 \-–,/&()]{6,}$/.test(l) || /^(\d+|[A-Z])\.?\s+[A-Z][A-Za-z ]{3,60}$/.test(l)) { flush(); paras.push(`## ${l}`); continue; }
        cur.push(l);
        if (cur.join(' ').length > 900) flush();
    }
    flush();
    const out = []; let heading = null; let buf = '';
    const push = () => { const t = buf.trim(); if (t.length >= 120) { const clauses = [...new Set([...t.matchAll(CLAUSE_RE)].map((m) => m[1]))]; const codes = [...new Set((t.match(CODE_RE) || []).map((c) => c.replace(/\s+/g, ' ').replace('ASNZS', 'AS/NZS')))]; out.push({ id: `${sourceId}:${out.length}`, source: sourceId, heading, text: t.slice(0, 1200), clauses, codes, terms: terms(t) }); } buf = ''; };
    for (const p of paras) {
        if (p.startsWith('## ')) { push(); heading = p.slice(3); const hm = heading.match(CLAUSE_LINE_RE); if (hm) out.push({ id: `${sourceId}:h${out.length}`, source: sourceId, heading: null, text: `${hm[1]} ${hm[2]}`, clauses: [hm[1]], codes: [], terms: terms(hm[2]), isHeading: true }); continue; }
        buf += (buf ? ' ' : '') + p;
        if (buf.length >= 500) push();
    }
    push();
    return out;
}
function terms(text) {
    const counts = new Map();
    for (const w of String(text).toLowerCase().replace(/[^a-z0-9.\s/-]/g, ' ').split(/\s+/)) { if (w.length < 4 || STOP.has(w) || /^\d+$/.test(w)) continue; counts.set(w, (counts.get(w) || 0) + 1); }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 24).map(([w]) => w);
}
function factsFrom(book, sources) {
    const facts = { amendments: new Set(), published: new Set(), supersedes: new Set(), transition: new Set(), pages: null };
    for (const s of sources) {
        const t = s.text || '';
        for (const m of t.matchAll(/\b(Amd(?:t)?\.?\s?\d:\d{4}|Amendment\s?\d\b[^.\n]{0,60})/g)) facts.amendments.add(m[1].replace(/\s+/g, ' ').trim());
        for (const m of t.matchAll(/Published:?\s*(\d{1,2}[\/-][A-Za-z0-9]{2,3}[\/-]\d{2,4}|\d{1,2} \w+ \d{4})/g)) facts.published.add(m[1]);
        for (const m of t.matchAll(/supersed(?:es|ed by)\s+((?:AS\/NZS\s?)?\d{4}(?:\.\d(?:\.\d)?)?:\d{4}(?: Amd \d:\d{4})?)/gi)) facts.supersedes.add(m[1]);
        for (const m of t.matchAll(/(transition(?:al)? period[^.\n]{0,120})/gi)) facts.transition.add(m[1].trim());
        const pg = t.match(/Pages:\s*(\d+)/); if (pg) facts.pages = Number(pg[1]);
    }
    return { amendments: [...facts.amendments].slice(0, 12), published: [...facts.published].slice(0, 6), supersedes: [...facts.supersedes].slice(0, 6), transition: [...facts.transition].slice(0, 4), pages: facts.pages };
}

/* ---------- one source ---------- */
async function harvestSource(book, url, kind) {
    let r = await fetchUrl(url);
    const base = { id: sha(url), url, kind, fetchedAt: new Date().toISOString(), status: r.ok ? r.status : (r.error || r.status) };
    if (!r.ok) return { ...base, ok: false, chars: 0, text: '' };
    let isPdf = /pdf/.test(r.type) || /\.pdf(\?|$)/i.test(url) || r.buf.slice(0, 5).toString() === '%PDF-';
    let title = ''; let text = '';
    if (isPdf) { text = await pdfToText(r.buf); title = (text.split('\n').map((l) => l.trim()).find((l) => l.length > 8 && l.length < 140) || path.basename(url)); }
    else {
        let h = htmlToText(r.buf.toString('utf8'));
        if (h.text.length < 400 && BROWSER) { const rb = await fetchViaBrowser(url, r); if (rb.ok && rb.buf) { r = rb; base.status = rb.status; h = htmlToText(rb.buf.toString('utf8')); } } // JavaScript-rendered store page
        title = h.title; text = h.text;
    }
    text = text.replace(/\r/g, '').replace(/\f/g, '\n').replace(/\n{3,}/g, '\n\n');
    const dir = path.join(OUT_RAW, book.id); await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, `${base.id}.txt`), `# ${title}\n# ${url}\n# ${base.fetchedAt}\n\n${text}`);
    return { ...base, ok: true, title: title.slice(0, 160), type: isPdf ? 'pdf' : 'html', chars: text.length, text };
}

/* ---------- inbox PDFs (private) ---------- */
async function harvestInbox(book) {
    const dir = path.join(ROOT, INBOX); let files = [];
    try { files = (await fs.readdir(dir)).filter((f) => /\.pdf$/i.test(f)); } catch { return []; }
    const code = book.code.replace(/AS\/NZS\s?/, '').replace(/:.*/, '').replace(/\./g, '[._-]?');
    const mine = files.filter((f) => new RegExp(code, 'i').test(f));
    const out = [];
    for (const f of mine) {
        const buf = await fs.readFile(path.join(dir, f));
        const text = (await pdfToText(buf)).replace(/\r/g, '').replace(/\f/g, '\n');
        out.push({ id: sha(f), url: `inbox:${f}`, kind: 'licensed-pdf', fetchedAt: new Date().toISOString(), status: 'local', ok: true, title: f, type: 'pdf', chars: text.length, text, private: true });
        log(`  inbox ${f}: ${text.length} chars (private)`);
    }
    return out;
}

/* ---------- main ---------- */
const books = SOURCES.books.filter((b) => !ONLY || b.id === ONLY);
const index = { version: 1, harvestedAt: new Date().toISOString(), books: [] };
for (const book of books) {
    log(`📚 ${book.code} – ${book.title}`);
    let urls = [...book.seeds];
    if (DISCOVER) {
        for (const q of book.queries) { const found = await discover(q); log(`  search "${q}": ${found.length} allowed results`); urls.push(...found); }
    }
    urls = [...new Set(urls)].slice(0, MAX_PER_BOOK);
    const sources = [];
    for (const url of urls) {
        const kind = /standards\.(org\.au|govt\.nz)|saiglobal|accuristech|ansi\.org|intertekinform/.test(url) ? 'catalogue' : /cer\.gov\.au|dcceew|legislation\.gov\.au/.test(url) ? 'regulator' : /cleanenergycouncil|solaraccreditation/.test(url) ? 'industry' : /ausgrid|energex|ergon|sapowernetworks|endeavour|essentialenergy|ausnet|westernpower|jemena|evoenergy|tasnetworks/.test(url) ? 'dnsp' : 'guidance';
        const s = await harvestSource(book, url, kind);
        log(`  ${s.ok ? '✓' : '✗'} ${s.status} ${s.chars} chars ${url.slice(0, 100)}`);
        sources.push(s);
    }
    sources.push(...await harvestInbox(book));
    const okSources = sources.filter((s) => s.ok && s.chars > 200);
    const allPassages = okSources.flatMap((s) => passagesFrom(s.text, s.id).map((p) => ({ ...p, private: Boolean(s.private) })));
    const clauseIndex = {};
    for (const p of allPassages) for (const c of p.clauses) { (clauseIndex[c] = clauseIndex[c] || []).push(p.id); }
    const facts = factsFrom(book, okSources);
    // Private (full) index: everything, including licensed inbox PDFs.
    const privateBook = { ...book, harvestedAt: index.harvestedAt, sources: sources.map(({ text, ...s }) => s), passages: allPassages, clauseIndex, facts };
    await fs.writeFile(path.join(OUT_PRIVATE, `${book.id}.json`), JSON.stringify(privateBook));
    // Public book: public sources only, capped passages per source, no licensed text.
    const publicPassages = []; const perSource = {};
    for (const p of allPassages) { if (p.private) continue; perSource[p.source] = (perSource[p.source] || 0) + 1; if (perSource[p.source] <= MAX_PASSAGES_PUBLIC) publicPassages.push({ ...p, text: p.text.slice(0, 600) }); }
    const publicClauseIndex = {}; const ids = new Set(publicPassages.map((p) => p.id));
    for (const [c, list] of Object.entries(clauseIndex)) { const keep = list.filter((id) => ids.has(id)); if (keep.length) publicClauseIndex[c] = keep; }
    const tocFromPrivate = allPassages.filter((p) => p.private && p.isHeading).map((p) => p.text).slice(0, 400); // contents of a licensed book: refs and titles only
    const publicBook = { id: book.id, code: book.code, title: book.title, tier: book.tier, licence: book.licence, codexId: book.codexId || null, harvestedAt: index.harvestedAt, sources: sources.filter((s) => !s.private).map(({ text, ...s }) => s), passages: publicPassages, clauseIndex: publicClauseIndex, facts, contents: tocFromPrivate, privateIndexed: sources.some((s) => s.private) };
    await fs.writeFile(path.join(OUT_PUBLIC, `${book.id}.json`), JSON.stringify(publicBook));
    const clauses = Object.keys(publicClauseIndex).length;
    index.books.push({ id: book.id, code: book.code, title: book.title, tier: book.tier, licence: book.licence, codexId: book.codexId || null, sources: sources.length, sourcesOk: okSources.filter((s) => !s.private).length, chars: okSources.filter((s) => !s.private).reduce((n, s) => n + s.chars, 0), passages: publicPassages.length, clauses, privatePassages: allPassages.filter((p) => p.private).length, facts, harvestedAt: index.harvestedAt });
    log(`  → ${okSources.length}/${sources.length} sources, ${publicPassages.length} public passages, ${clauses} clause refs${privateBook.passages.length !== publicPassages.length ? `, ${privateBook.passages.length} in the private index` : ''}`);
}
// Merge into the existing index when only one book was harvested.
const indexPath = path.join(OUT_PUBLIC, 'index.json');
if (ONLY) { try { const old = JSON.parse(await fs.readFile(indexPath, 'utf8')); index.books = [...old.books.filter((b) => !index.books.some((n) => n.id === b.id)), ...index.books]; } catch { /* first run */ } }
await fs.writeFile(indexPath, JSON.stringify(index, null, 1));
log(`Shelf written: ${index.books.length} books → docs/data/knowledge/index.json`);
