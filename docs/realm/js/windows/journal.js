/** Journal: your own notes, the crew's reflections and a searchable timeline – exportable as Markdown. */
import { h, button, badge, download, empty } from '../core/ui.js';
import { section, row, jobPicker } from './_shared.js';
import { makeTestCtx, openWindow, q, qa, fire } from './_testing.js';

export function journalMarkdown(entries) {
    return ['# Journal', '', ...entries.map((e) => `- **${e.at.slice(0, 16).replace('T', ' ')}**${e.jobId ? ` [${e.jobId}]` : ''}${e.tags?.length ? ` _(${e.tags.join(', ')})_` : ''}: ${e.text}`)].join('\n');
}
export function parseTags(text) { return [...String(text).matchAll(/#([\w-]+)/g)].map((m) => m[1].toLowerCase()); }

export function def(ctx) {
    return {
        id: 'journal', title: ctx.t('nav.journal'), icon: '📓', hotkey: 'J', width: 820, height: 580,
        tabs: [{ id: 'notes', label: 'Notes', icon: '✎' }, { id: 'reflections', label: 'Crew reflections', icon: '💭' }, { id: 'timeline', label: 'Timeline', icon: '🕒' }],
        render(body, { tab }) {
            if (tab === 'reflections') return renderReflections(body, ctx);
            if (tab === 'timeline') return renderTimeline(body, ctx);
            return renderNotes(body, ctx);
        }
    };
}

function renderNotes(body, ctx) {
    const entries = ctx.store.get('journal', []);
    const input = h('textarea', { class: 'input', rows: 3, placeholder: 'Write a note… use #tags, e.g. "Customer wants backup on fridge circuit #backup #site"' });
    const attach = h('input', { type: 'checkbox', checked: ctx.currentJobId() ? '' : null });
    const add = () => { const text = input.value.trim(); if (!text) return; ctx.store.push('journal', { id: `n${Date.now().toString(36)}`, at: new Date(ctx.now()).toISOString(), text, tags: parseTags(text), jobId: attach.checked ? ctx.currentJobId() : null }, 2000); input.value = ''; ctx.refresh('journal'); };
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) add(); });
    const search = h('input', { type: 'search', class: 'input', placeholder: 'Search notes or #tag', oninput: () => renderList() });
    const list = h('div', { class: 'journal-list' });
    const renderList = () => { const qv = search.value.trim().toLowerCase(); const filtered = [...ctx.store.get('journal', [])].reverse().filter((e) => !qv || e.text.toLowerCase().includes(qv) || e.tags.some((t) => `#${t}`.includes(qv))); list.replaceChildren(...(filtered.length ? filtered.map((e) => h('div', { class: 'journal-entry' }, h('div', { class: 'muted small' }, e.at.slice(0, 16).replace('T', ' '), e.jobId ? [' · ', h('a', { href: '#', onclick: (ev) => { ev.preventDefault(); ctx.setCurrentJob(e.jobId); ctx.open('jobs', { tab: 'detail' }); } }, e.jobId)] : null), h('div', {}, e.text), h('div', {}, e.tags.map((t) => badge(`#${t}`)), ' ', h('button', { class: 'btn tiny', onclick: () => { ctx.store.set('journal', ctx.store.get('journal').filter((x) => x.id !== e.id)); ctx.refresh('journal'); } }, '✕')))) : [empty('No notes match')])); };
    renderList();
    body.append(section('New note', row(jobPicker(ctx, { allowNone: true }), h('label', { class: 'field inline' }, attach, ' attach to current job')), input, row(button('Add note (Ctrl+Enter)', add, { kind: 'primary', small: true }), button('Export Markdown', () => download('journal.md', journalMarkdown(ctx.store.get('journal', [])), 'text/markdown'), { small: true }), h('span', { class: 'muted' }, `${entries.length} note${entries.length === 1 ? '' : 's'}`))), section('Notes', search, list));
}

function renderReflections(body, ctx) {
    const items = ctx.world.agents.flatMap((a) => a.memory.byKind('reflection').map((r) => ({ agent: a, ...r }))).sort((a, b) => b.at - a.at);
    body.append(section('What the crew has concluded', h('p', { class: 'muted' }, 'Reflections are higher-level thoughts an agent forms from accumulated memories (Generative-Agents style). They shape what the agent prefers to do next.'), items.length ? h('ul', { class: 'feed' }, items.map((r) => h('li', { class: 'feed-item reflection' }, h('strong', {}, r.agent.name), ': ', r.text, ' ', h('span', { class: 'muted small' }, `importance ${r.importance}`)))) : empty('No reflections yet – let the clock run or open a crew member\'s Memory tab and press "Reflect now".')));
}

function renderTimeline(body, ctx) {
    const notes = ctx.store.get('journal', []).map((e) => ({ at: Date.parse(e.at), kind: 'note', text: e.text }));
    const feed = ctx.world.feed.map((f) => ({ at: f.at, kind: f.type, text: f.text }));
    const jobEvents = ctx.jobs().flatMap((j) => j.history.map((e) => ({ at: Date.parse(e.at), kind: e.event, text: `${j.customer}: ${e.event}${e.to ? ` → ${e.to}` : ''}${e.task ? ` ${e.task}` : ''}` })));
    const all = [...notes, ...feed, ...jobEvents].sort((a, b) => b.at - a.at).slice(0, 200);
    body.append(section('Timeline (notes, crew events, job history)', all.length ? h('ul', { class: 'feed' }, all.map((e) => h('li', { class: 'feed-item' }, h('span', { class: 'muted small' }, new Date(e.at).toISOString().slice(0, 16).replace('T', ' ')), ' ', badge(e.kind.replace(/_/g, ' ')), ' ', e.text))) : empty('Nothing yet')));
}

export const FEATURES = [
    { id: 'win.journal.add', title: 'Add tagged notes attached to a job', dom: true, test: () => { const t = makeTestCtx(); const b = openWindow(t.ctx, def(t.ctx)); const ta = q(b, 'textarea'); ta.value = 'Tile roof, #site #access'; qa(b, 'button').find((x) => x.textContent.startsWith('Add note')).click(); const j = t.ctx.store.get('journal'); const ok = j.length === 1 && j[0].tags.join() === 'site,access' && j[0].jobId === t.job.id; t.done(); return ok; } },
    { id: 'win.journal.search', title: 'Search notes by text or tag', dom: true, test: () => { const t = makeTestCtx(); t.ctx.store.set('journal', [{ id: 'a', at: '2026-01-01T00:00:00Z', text: 'Alpha #one', tags: ['one'] }, { id: 'b', at: '2026-01-02T00:00:00Z', text: 'Beta #two', tags: ['two'] }]); const b = openWindow(t.ctx, def(t.ctx)); const s = q(b, 'input[type=search]'); s.value = '#two'; fire(s); const ok = qa(b, '.journal-entry').length === 1 && /Beta/.test(q(b, '.journal-entry').textContent); t.done(); return ok; } },
    { id: 'win.journal.delete', title: 'Delete a note', dom: true, test: () => { const t = makeTestCtx(); t.ctx.store.set('journal', [{ id: 'a', at: '2026-01-01T00:00:00Z', text: 'Alpha', tags: [] }]); const b = openWindow(t.ctx, def(t.ctx)); q(b, '.journal-entry .btn.tiny').click(); const ok = t.ctx.store.get('journal').length === 0; t.done(); return ok; } },
    { id: 'win.journal.markdown', title: 'Markdown export', test: () => journalMarkdown([{ at: '2026-01-01T10:00:00Z', text: 'Hi', tags: ['x'], jobId: 'J1' }]).includes('- **2026-01-01 10:00** [J1] _(x)_: Hi') && parseTags('a #B #c-d').join() === 'b,c-d' },
    { id: 'win.journal.reflections', title: 'Crew reflections aggregated', dom: true, test: () => { const t = makeTestCtx(); const a = t.ctx.world.agent('ATLAS'); a.memory.records.push({ id: 'r', kind: 'reflection', text: 'Isolators keep failing', importance: 8, at: 1, tags: [] }); const b = openWindow(t.ctx, def(t.ctx), { tab: 'reflections' }); const ok = /Isolators keep failing/.test(b.textContent); t.done(); return ok; } },
    { id: 'win.journal.timeline', title: 'Unified timeline of notes, crew events and job history', dom: true, test: () => { const t = makeTestCtx(); t.ctx.store.set('journal', [{ id: 'a', at: '2026-01-01T00:00:00Z', text: 'Alpha', tags: [] }]); const b = openWindow(t.ctx, def(t.ctx), { tab: 'timeline' }); const ok = qa(b, '.feed-item').length >= 3; t.done(); return ok; } }
];
