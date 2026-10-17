/** Library: the knowledge the crew compiled from the web about every book on the shelf – coverage, search by words or clause, what the crew has studied, and how to run the harvester or import a private index. */
import { h, button, badge, progressBar, select, empty, toast } from '../core/ui.js';
import { coverage, searchLibrary, stats, sourceOf, mergePrivate } from '../domain/library.js';
import { section, row, grid, statCard } from './_shared.js';
import { makeTestCtx, openWindow, q, qa, fire } from './_testing.js';
import { createLibrary, FIXTURE } from '../domain/library.js';

const tierName = { 1: 'Safety law', 2: 'AS/NZS standard', 3: 'Network rules', 4: 'Industry guidelines', 5: 'CER rules', 6: 'Manufacturer' };
const ext = (label, url) => h('a', { href: url, target: '_blank', rel: 'noopener', class: 'ext-link' }, label, ' ↗');

function renderShelf(body, ctx) {
    const lib = ctx.library; const s = stats(lib); const cov = coverage(lib);
    body.append(grid(4, statCard('Books on the shelf', s.booksOnShelf, `${s.booksLoaded} loaded`), statCard('Passages compiled', s.passages), statCard('Clause references', s.clauses), statCard('Sources that answered', s.sources, s.harvestedAt ? `harvested ${String(s.harvestedAt).slice(0, 10)}` : 'not harvested yet')));
    if (!cov.length) { body.append(empty('The shelf is empty. Run the harvester (Harvest tab) and reload, or import a private index.')); return; }
    body.append(section('Coverage per book', h('div', { class: 'shelf' }, cov.map((b) => { const book = lib.books[b.id]; return h('details', { class: 'book' }, h('summary', {}, h('strong', {}, b.code), ' ', h('span', { class: 'muted' }, b.title), ' ', badge(tierName[b.tier] || `tier ${b.tier}`, 'neutral'), ' ', badge(b.licence === 'copyright' ? 'licensed book – public knowledge only' : 'public document', b.licence === 'copyright' ? 'warn' : 'ok'), b.privateIndexed ? badge('private index', 'accent') : null, progressBar(b.score, { small: true, label: `${b.label} · ${b.passages || 0} passages · ${b.clauses || 0} clause refs · ${b.sourcesOk || 0}/${b.sources || 0} sources`, colour: b.score >= 80 ? 'var(--ok)' : b.score >= 50 ? 'var(--accent)' : b.score >= 20 ? 'var(--warn)' : 'var(--bad)' })),
            h('div', { class: 'book-body' }, book ? [
                book.facts && (book.facts.amendments?.length || book.facts.published?.length || book.facts.pages) ? h('p', { class: 'small' }, book.facts.pages ? `${book.facts.pages} pages. ` : '', book.facts.published?.length ? `Published ${book.facts.published[0]}. ` : '', book.facts.amendments?.length ? `Amendments: ${book.facts.amendments.join(', ')}. ` : '', book.facts.supersedes?.length ? `Supersedes ${book.facts.supersedes.join(', ')}. ` : '') : null,
                book.contents?.length ? h('details', {}, h('summary', { class: 'small' }, `Contents (${book.contents.length} headings from your licensed copy)`), h('ul', { class: 'small' }, book.contents.slice(0, 80).map((c) => h('li', {}, c)))) : null,
                h('ul', { class: 'small sources' }, (book.sources || []).map((src) => h('li', {}, badge(src.ok ? src.kind : 'failed', src.ok ? 'neutral' : 'bad'), ' ', src.url.startsWith('inbox:') ? h('span', {}, src.title, ' (your copy, private)') : ext(src.title || src.url, src.url), src.ok ? h('span', { class: 'muted' }, ` · ${Math.round((src.chars || 0) / 1000)} k chars`) : h('span', { class: 'muted' }, ` · ${src.status}`))))
            ] : h('p', { class: 'muted small' }, 'Book file not loaded.'))); }))));
}

function renderSearch(body, ctx) {
    const lib = ctx.library;
    const input = h('input', { class: 'input library-query', type: 'text', value: ctx.store.get('ui.libraryQuery') || '', placeholder: 'e.g. battery clearance garage door · 5139 clause 4.2.2.2 · voltage rise 2 % · written statement STC' });
    const bookSel = select([{ value: '', label: 'Every book' }, ...lib.index.books.map((b) => ({ value: b.id, label: b.code }))], { value: '' });
    const out = h('div', { class: 'library-results' });
    const run = () => { const query = input.value.trim(); ctx.store.set('ui.libraryQuery', query); const hits = searchLibrary(lib, query, { limit: 12, bookId: bookSel.value || null }); out.replaceChildren(hits.length ? h('div', {}, hits.map((p) => { const src = sourceOf(lib, p); return h('div', { class: 'finding passage sev-info' }, h('div', { class: 'finding-head' }, badge(p.code, 'accent'), p.clauses?.length ? badge(`Cl ${p.clauses.slice(0, 3).join(', ')}`, 'neutral') : null, p.heading ? h('strong', {}, p.heading) : null, h('span', { class: 'muted small' }, `score ${p.score}`)), h('div', { class: 'finding-detail' }, p.text), src ? h('div', { class: 'muted small' }, src.url.startsWith('inbox:') ? `Your licensed copy: ${src.title}` : ext(src.title || src.url, src.url)) : null); })) : query ? empty('Nothing in the library matches. Try the clause number or the standard code, or harvest more sources.') : empty('Type a question, a clause or a standard code.')); if (query) ctx.world.recordStat('libraryQueries'); };
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') run(); }); bookSel.addEventListener('change', run);
    body.append(section('Search the library', row(input, bookSel, button('Search', run, { kind: 'primary', small: true })), h('p', { class: 'muted small' }, 'Passages come from the public sources the librarians compiled, plus any private index you imported. The Compliance engine (Shift+R) cites these alongside the Codex.')), out);
    if (input.value) run();
}

function renderStudy(body, ctx) {
    const items = ctx.world.crew().flatMap((a) => a.memory.records.filter((m) => (m.tags || []).includes('study') && /^Studied/.test(m.text)).map((m) => ({ agent: a, ...m }))).sort((a, b) => b.at - a.at);
    const byBook = {}; for (const i of items) { const m = i.text.match(/^Studied (.+?)(?: Cl [\d.]+| –[^:]*)?: /); const k = m ? m[1] : 'other'; byBook[k] = (byBook[k] || 0) + 1; }
    body.append(grid(3, statCard('Passages studied', items.length), statCard('Books touched', Object.keys(byBook).length), statCard('Minions studying', new Set(items.map((i) => i.agent.id)).size)));
    const log = items.length ? h('ul', { class: 'feed study-log' }, items.slice(0, 60).map((i) => h('li', { class: 'feed-item' }, h('span', { class: 'feed-icon' }, '📚'), h('span', {}, h('strong', {}, i.agent.name), ' ', i.text.replace(/^Studied /, 'studied ')), h('span', { class: 'muted small' }, new Date(i.at).toISOString().slice(0, 16).replace('T', ' '))))) : empty('Nobody has studied a passage yet. On shift, between job tasks, minions read from the library – let the clock run.');
    const tally = Object.keys(byBook).length ? h('p', { class: 'muted small' }, Object.entries(byBook).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k}: ${n}`).join(' · ')) : null;
    body.append(section('What the crew has read', log, tally));
}

function renderHarvest(body, ctx) {
    body.append(section('Send the librarians out', h('p', {}, 'The harvester searches the web for every public source about each book on the shelf, fetches and reads them (HTML and PDF), compiles passages and clause references, and writes the library this window reads. Run it from the project folder:'), h('pre', { class: 'mono' }, 'node scripts/knowledge-harvest.mjs --discover'), h('p', { class: 'small' }, 'Licensed standards (AS/NZS) are sold by Standards Australia; their own text is never scraped. Drop the PDFs you hold licences for into ', h('code', {}, 'data/knowledge/inbox/'), ' and run ', h('code', {}, 'node scripts/knowledge-harvest.mjs --inbox data/knowledge/inbox'), ' – every clause is indexed into a private file on your machine (', h('code', {}, 'data/knowledge/private/'), ', never committed) that you import below.')));
    const file = h('input', { type: 'file', accept: '.json,application/json', class: 'input private-index-file' });
    body.append(section('Import a private index', row(file, button('Import', async () => { const f = file.files && file.files[0]; if (!f) { toast('Choose a private index file first', { kind: 'warn' }); return; } try { const data = JSON.parse(await f.text()); mergePrivate(ctx.library, data); const priv = ctx.store.get('knowledge.private') || {}; priv[data.id] = data; ctx.store.set('knowledge.private', priv); toast(`${data.code || data.id}: ${data.passages.length} passages indexed privately`, { kind: 'ok' }); ctx.refresh('library'); } catch (e) { toast(`Not a private index: ${e.message}`, { kind: 'bad' }); } }, { kind: 'primary', small: true })), h('p', { class: 'muted small' }, 'Stored in this browser only. The crew study from it and the Compliance engine cites it, but nothing leaves this machine.')));
    const s = stats(ctx.library);
    body.append(section('Shelf status', h('p', { class: 'small' }, s.harvestedAt ? `Last harvest ${new Date(s.harvestedAt).toISOString().slice(0, 16).replace('T', ' ')} · ${s.sources} sources answered · ${s.passages} passages · ${s.clauses} clause refs.` : 'No harvest loaded. The shelf file is docs/data/knowledge-sources.json – add books, seed URLs and search queries there.')));
}

export function def(ctx) {
    return {
        id: 'library', title: 'Library', icon: '📚', hotkey: null, width: 920, height: 660,
        tabs: [{ id: 'shelf', label: 'Shelf', icon: '📚' }, { id: 'search', label: 'Search', icon: '🔎' }, { id: 'study', label: 'Study log', icon: '📝' }, { id: 'harvest', label: 'Harvest', icon: '🕸' }],
        render(body, { tab }) {
            if (tab === 'search') return renderSearch(body, ctx);
            if (tab === 'study') return renderStudy(body, ctx);
            if (tab === 'harvest') return renderHarvest(body, ctx);
            return renderShelf(body, ctx);
        }
    };
}

const withFixture = () => { const t = makeTestCtx(); t.ctx.setLibrary(createLibrary(FIXTURE)); return t; };
export const FEATURES = [
    { id: 'win.library.shelf', title: 'The shelf shows every book with coverage, licence, facts and sources', dom: true, test: () => { const t = withFixture(); const b = openWindow(t.ctx, def(t.ctx)); const ok = qa(b, '.book').length === 3 && /licensed book/.test(b.textContent) && /public document/.test(b.textContent) && /Amendments: Amd 1:2025/.test(b.textContent) && qa(b, '.sources li').length === 2; t.done(); return ok; } },
    { id: 'win.library.search', title: 'Search by words or clause returns passages with their source', dom: true, test: () => { const t = withFixture(); const b = openWindow(t.ctx, def(t.ctx), { tab: 'search' }); const inp = q(b, '.library-query'); inp.value = '5139 clause 4.2.4.2'; fire(inp, 'input'); qa(b, 'button').find((x) => x.textContent === 'Search').click(); const ok = qa(b, '.passage').length >= 1 && /non-combustible barrier/.test(b.textContent) && t.ctx.world.stats.libraryQueries === 1 && t.ctx.store.get('ui.libraryQuery') === '5139 clause 4.2.4.2'; t.done(); return ok; } },
    { id: 'win.library.study', title: 'The study log lists what each minion has read from the library', dom: true, test: () => { const t = withFixture(); const a = t.ctx.world.agent('ATLAS'); a.remember('Studied AS/NZS 5139:2019 Cl 4.2.2.2: Battery systems may now be installed…', { tags: ['study', 'shift'], importance: 3 }); const b = openWindow(t.ctx, def(t.ctx), { tab: 'study' }); const ok = qa(b, '.study-log .feed-item').length === 1 && /Atlas/.test(b.textContent) && /AS\/NZS 5139:2019: 1/.test(b.textContent); t.done(); return ok; } },
    { id: 'win.library.harvest', title: 'The harvest tab explains the harvester and offers the private-index import', dom: true, test: () => { const t = withFixture(); const b = openWindow(t.ctx, def(t.ctx), { tab: 'harvest' }); const ok = /knowledge-harvest\.mjs --discover/.test(b.textContent) && q(b, '.private-index-file') !== null && /never committed/.test(b.textContent); t.done(); return ok; } },
    { id: 'win.library.empty', title: 'With nothing harvested the shelf says so instead of breaking', dom: true, test: () => { const t = makeTestCtx(); const b = openWindow(t.ctx, def(t.ctx)); const ok = /shelf is empty/.test(b.textContent); t.done(); return ok; } }
];
