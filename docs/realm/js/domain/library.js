/**
 * The Library: the knowledge the crew compiled from the web about every book
 * on the shelf (scripts/knowledge-harvest.mjs writes docs/data/knowledge/).
 * Search it in plain words or by clause, look up a clause across every
 * source, pick a passage for a minion to study, and report how much of each
 * book is covered. Works on whatever has been loaded: the index alone, some
 * books, or a private index imported from a licensed PDF on the installer's
 * own machine.
 */

const STOP = new Set('the and for with that this from are was were been have has not but into than then they them their there which when where while shall should must may can will would could also such only any all each other these those over under upon about above below between within without being does did done per via use used using what does how is it of in to on at by an as or be'.split(' '));
export function tokenize(text) { return String(text || '').toLowerCase().replace(/[^a-z0-9.\s/-]/g, ' ').split(/\s+/).filter((w) => w.length >= 3 && !STOP.has(w)); }
const CLAUSE_IN_QUERY = /\b(\d+(?:\.\d+){1,4})\b/g;
const CODE_IN_QUERY = /\b(?:as\/?nzs\s?)?(\d{4}(?:\.\d(?:\.\d)?)?)(?::(\d{4}))?\b/i;

/** Build a library from loaded data. `index` is docs/data/knowledge/index.json; `books` is a map id → book file (whatever has been fetched or imported). */
export function createLibrary({ index = null, books = {} } = {}) {
    const lib = { index: index || { books: [] }, books: {}, loadedAt: null, source: null };
    for (const [id, b] of Object.entries(books || {})) if (b && Array.isArray(b.passages)) lib.books[id] = b;
    return lib;
}
export function addBook(lib, book) { if (book && book.id && Array.isArray(book.passages)) { lib.books[book.id] = book; if (!lib.index.books.some((b) => b.id === book.id)) lib.index.books.push({ id: book.id, code: book.code, title: book.title, tier: book.tier, licence: book.licence, sources: (book.sources || []).length, sourcesOk: (book.sources || []).filter((s) => s.ok).length, passages: book.passages.length, clauses: Object.keys(book.clauseIndex || {}).length, harvestedAt: book.harvestedAt }); } return lib; }
/** Merge a private index (full passages from a licensed PDF, kept on this machine) over the public book. */
export function mergePrivate(lib, privateBook) {
    if (!privateBook || !privateBook.id) return lib;
    const pub = lib.books[privateBook.id];
    const merged = { ...(pub || {}), ...privateBook, passages: [...(pub ? pub.passages : []).filter((p) => !privateBook.passages.some((q) => q.id === p.id)), ...privateBook.passages], clauseIndex: { ...(pub?.clauseIndex || {}), ...(privateBook.clauseIndex || {}) }, privateIndexed: true };
    lib.books[privateBook.id] = merged;
    const row = lib.index.books.find((b) => b.id === privateBook.id);
    if (row) { row.passages = merged.passages.length; row.clauses = Object.keys(merged.clauseIndex).length; row.privatePassages = privateBook.passages.filter((p) => p.private).length; row.privateIndexed = true; }
    return lib;
}
export function allPassages(lib) { return Object.values(lib.books).flatMap((b) => b.passages.map((p) => ({ ...p, bookId: b.id, code: b.code, tier: b.tier }))); }
export function sourceOf(lib, passage) { const b = lib.books[passage.bookId]; return b ? (b.sources || []).find((s) => s.id === passage.source) || null : null; }

/** How well each book is covered, 0–100: sources that answered, passages compiled, clause refs found, plus a bonus when its own text is indexed privately. */
export function coverage(lib) {
    return lib.index.books.map((b) => {
        const srcScore = b.sources ? Math.min(1, (b.sourcesOk || 0) / Math.max(1, Math.min(b.sources, 8))) : 0;
        const passScore = Math.min(1, (b.passages || 0) / 120);
        const clauseScore = Math.min(1, (b.clauses || 0) / 40);
        const privateBonus = b.privateIndexed ? 0.25 : 0;
        const score = Math.round(Math.min(100, (srcScore * 0.3 + passScore * 0.4 + clauseScore * 0.3 + privateBonus) * 100));
        return { ...b, score, label: score >= 80 ? 'deep' : score >= 50 ? 'working' : score >= 20 ? 'thin' : 'bare', loaded: Boolean(lib.books[b.id]) };
    });
}

/** Search in plain words, by clause number ("5139 4.2.2.2", "clause 3.3") or by standard code. */
export function searchLibrary(lib, query, { limit = 8, bookId = null, tier = null } = {}) {
    const q = String(query || '').trim(); if (!q) return [];
    const words = tokenize(q);
    const clauses = [...q.matchAll(CLAUSE_IN_QUERY)].map((m) => m[1]);
    const codeM = q.match(CODE_IN_QUERY); const code = codeM && codeM[1].length >= 4 ? codeM[1] : null;
    const out = [];
    for (const p of allPassages(lib)) {
        if (bookId && p.bookId !== bookId) continue; if (tier && p.tier !== tier) continue;
        let score = 0;
        const text = p.text.toLowerCase(); const head = (p.heading || '').toLowerCase();
        for (const w of words) { if (p.terms && p.terms.includes(w)) score += 3; else if (text.includes(w)) score += 1; if (head.includes(w)) score += 2; }
        for (const c of clauses) { if (p.clauses && p.clauses.includes(c)) score += 12; else if (text.includes(` ${c} `) || text.includes(` ${c}.`)) score += 6; }
        if (code && (p.code.includes(code) || (p.codes || []).some((x) => x.includes(code)))) score += 4;
        if (p.isHeading) score *= 0.6;
        if (score > 0) out.push({ ...p, score });
    }
    return out.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id)).slice(0, limit);
}
/** Every passage that cites a clause of a book (by code fragment, e.g. '5139' and '4.2.2.2'). */
export function clauseLookup(lib, code, ref) {
    const book = Object.values(lib.books).find((b) => b.code.replace(/\s/g, '').includes(String(code).replace(/\s/g, '').replace(/^AS\/?NZS/i, ''))); if (!book) return [];
    const ids = new Set((book.clauseIndex || {})[ref] || []);
    return book.passages.filter((p) => ids.has(p.id)).map((p) => ({ ...p, bookId: book.id, code: book.code, tier: book.tier }));
}
/** A passage for a minion to study: prefers books with the least study so far. */
export function studyPick(lib, random = Math.random, { studied = {} } = {}) {
    const books = Object.values(lib.books).filter((b) => b.passages.some((p) => !p.isHeading)); if (!books.length) return null;
    const sorted = books.slice().sort((a, b) => (studied[a.id] || 0) - (studied[b.id] || 0) || a.id.localeCompare(b.id));
    const book = sorted[Math.min(sorted.length - 1, Math.floor(random() * Math.min(3, sorted.length)))];
    const pool = book.passages.filter((p) => !p.isHeading); const p = pool[Math.floor(random() * pool.length)];
    return { bookId: book.id, code: book.code, passage: p, summary: `${book.code}${p.clauses && p.clauses.length ? ` Cl ${p.clauses[0]}` : p.heading ? ` – ${p.heading.slice(0, 60)}` : ''}: ${p.text.slice(0, 110).replace(/\s+\S*$/, '')}…` };
}
export function stats(lib) { const books = Object.values(lib.books); return { booksOnShelf: lib.index.books.length, booksLoaded: books.length, passages: books.reduce((n, b) => n + b.passages.length, 0), clauses: books.reduce((n, b) => n + Object.keys(b.clauseIndex || {}).length, 0), sources: lib.index.books.reduce((n, b) => n + (b.sourcesOk || 0), 0), harvestedAt: lib.index.harvestedAt || null }; }

/** Load the shelf and every book from a base URL (browser) with a fetch function. Books that fail to load are skipped. */
export async function loadLibrary(baseUrl, { fetchFn = (...a) => globalThis.fetch(...a) } = {}) {
    const res = await fetchFn(`${baseUrl}/index.json`, { cache: 'no-cache' }); if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const index = await res.json();
    const lib = createLibrary({ index });
    await Promise.all(index.books.map(async (b) => { try { const r = await fetchFn(`${baseUrl}/${b.id}.json`, { cache: 'no-cache' }); if (r.ok) addBook(lib, await r.json()); } catch { /* keep going */ } }));
    lib.loadedAt = Date.now(); lib.source = baseUrl;
    return lib;
}

/* A small fixture so the self-tests never depend on the harvest having run. */
export const FIXTURE = {
    index: { harvestedAt: '2026-10-17T00:00:00.000Z', books: [{ id: 'as_nzs_5139_2019', code: 'AS/NZS 5139:2019', title: 'Battery systems', tier: 2, licence: 'copyright', sources: 4, sourcesOk: 3, passages: 3, clauses: 2 }, { id: 'cer_sres', code: 'CER / SRES', title: 'SRES rules', tier: 5, licence: 'public', sources: 2, sourcesOk: 2, passages: 1, clauses: 0 }, { id: 'as_nzs_3017_2022', code: 'AS/NZS 3017:2022', title: 'Verification', tier: 2, licence: 'copyright', sources: 1, sourcesOk: 0, passages: 0, clauses: 0 }] },
    books: {
        as_nzs_5139_2019: { id: 'as_nzs_5139_2019', code: 'AS/NZS 5139:2019', title: 'Battery systems', tier: 2, licence: 'copyright', harvestedAt: '2026-10-17T00:00:00.000Z', sources: [{ id: 'src1', url: 'https://www.nsw.gov.au/example', title: 'Changes to the Battery Standard', ok: true, kind: 'regulator' }], passages: [
            { id: 'src1:0', source: 'src1', heading: 'Updates in Amendment 1', text: 'Battery systems may now be installed within 600mm of an opening, provided the opening is wider than 900mm, such as a garage door. Under the amended Clause 4.2.2.2 clearance is no less than 1m from any front or side a person might need to pass through.', clauses: ['4.2.2.2'], codes: ['AS/NZS 5139:2019'], terms: ['battery', 'opening', 'garage', 'clearance', '600mm', 'amendment'] },
            { id: 'src1:1', source: 'src1', heading: 'Barriers to habitable rooms', text: 'Requirements for exempt materials used as a barrier to habitable rooms have been revised. Exempt materials must now have a minimum thickness of 6mm. Clause 4.2.4.2 states the wall or structure shall be a suitably non-combustible barrier.', clauses: ['4.2.4.2'], codes: [], terms: ['barrier', 'habitable', 'non-combustible', 'thickness', 'exempt'] },
            { id: 'src1:h2', source: 'src1', heading: null, text: '4.2.2.2 Restricted locations', clauses: ['4.2.2.2'], codes: [], terms: ['restricted', 'locations'], isHeading: true }
        ], clauseIndex: { '4.2.2.2': ['src1:0', 'src1:h2'], '4.2.4.2': ['src1:1'] }, facts: { amendments: ['Amd 1:2025'] } },
        cer_sres: { id: 'cer_sres', code: 'CER / SRES', title: 'SRES rules', tier: 5, licence: 'public', harvestedAt: '2026-10-17T00:00:00.000Z', sources: [{ id: 'c1', url: 'https://cer.gov.au/example', title: 'Solar batteries', ok: true, kind: 'regulator' }], passages: [{ id: 'c1:0', source: 'c1', heading: 'Solar battery requirements', text: 'To be eligible the solar battery system must be between 5 and 100 kWh nominal capacity, included on the CEC approved battery list, compliant with AS/NZS 5139:2019 and installed by an SAA accredited installer with battery endorsement.', clauses: [], codes: ['AS/NZS 5139:2019'], terms: ['eligible', 'battery', 'nominal', 'capacity', 'approved', 'accredited'] }], clauseIndex: {}, facts: {} }
    }
};

export const FEATURES = [
    { id: 'library.create', title: 'A library is built from the shelf index and whichever books are loaded', test: () => { const lib = createLibrary(FIXTURE); const s = stats(lib); return s.booksOnShelf === 3 && s.booksLoaded === 2 && s.passages === 4 && s.clauses === 2 && s.sources === 5 && allPassages(lib).every((p) => p.code && p.tier); } },
    { id: 'library.search', title: 'Plain-word search ranks by terms and headings; clause numbers and codes boost their passages', test: () => { const lib = createLibrary(FIXTURE); const a = searchLibrary(lib, 'battery clearance garage door opening'); const b = searchLibrary(lib, 'AS/NZS 5139 clause 4.2.4.2'); const c = searchLibrary(lib, 'nothing matches zzz'); return a[0].id === 'src1:0' && a[0].score > a[1].score && b[0].id === 'src1:1' && c.length === 0 && searchLibrary(lib, 'battery', { tier: 5 }).every((p) => p.tier === 5); } },
    { id: 'library.clause', title: 'Clause lookup finds every passage citing a clause of a book', test: () => { const lib = createLibrary(FIXTURE); const hits = clauseLookup(lib, '5139', '4.2.2.2'); return hits.length === 2 && hits.some((p) => !p.isHeading) && clauseLookup(lib, '3000', '1.1').length === 0 && clauseLookup(lib, 'AS/NZS 5139:2019', '4.2.4.2').length === 1; } },
    { id: 'library.coverage', title: 'Coverage scores each book from sources, passages and clause refs, with a bonus for a private index', test: () => { const lib = createLibrary(FIXTURE); const c = coverage(lib); const bat = c.find((b) => b.id === 'as_nzs_5139_2019'); const ver = c.find((b) => b.id === 'as_nzs_3017_2022'); mergePrivate(lib, { id: 'as_nzs_5139_2019', passages: [{ id: 'p:0', source: 'p', text: 'x'.repeat(130), clauses: ['4.3'], private: true, terms: [] }], clauseIndex: { '4.3': ['p:0'] } }); const after = coverage(lib).find((b) => b.id === 'as_nzs_5139_2019'); return bat.score > ver.score && ver.score === 0 && ver.label === 'bare' && !ver.loaded && after.score > bat.score && after.privateIndexed && lib.books.as_nzs_5139_2019.passages.length === 4; } },
    { id: 'library.study', title: 'A study pick prefers the least-studied book and summarises the passage with its clause', test: () => { const lib = createLibrary(FIXTURE); let s = 1; const random = () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; const pick = studyPick(lib, random, { studied: { as_nzs_5139_2019: 5 } }); return pick && pick.bookId === 'cer_sres' && /CER \/ SRES/.test(pick.summary) && studyPick(createLibrary(), random) === null; } },
    { id: 'library.load', title: 'loadLibrary fetches the shelf and every book it can, skipping the ones that fail', test: async () => { const fetchFn = async (url) => { if (url.endsWith('/index.json')) return { ok: true, json: async () => FIXTURE.index }; const id = url.split('/').pop().replace('.json', ''); return FIXTURE.books[id] ? { ok: true, json: async () => FIXTURE.books[id] } : { ok: false }; }; const lib = await loadLibrary('x', { fetchFn }); return stats(lib).booksLoaded === 2 && lib.source === 'x' && lib.loadedAt > 0; } }
];
