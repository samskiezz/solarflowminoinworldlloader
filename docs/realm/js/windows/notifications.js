/** Notifications: an inbox of important events (achievements, defects, gates, world events) with read state, plus global search. */
import { h, button, badge, empty } from '../core/ui.js';
import { STANDARDS, searchStandards } from '../domain/standards.js';
import { section, row } from './_shared.js';
import { makeTestCtx, openWindow, q, qa, fire } from './_testing.js';

export const IMPORTANT = ['achievement', 'task_failed', 'level_up', 'event', 'quest_blocked', 'stage_advanced', 'hired', 'dnsp', 'proposal', 'checklist', 'commissioning'];
export function inbox(ctx) { return [...ctx.world.feed].reverse().filter((f) => IMPORTANT.includes(f.type) && !(f.type === 'level_up' && f.agentId && ctx.world.agent(f.agentId) && ctx.world.agent(f.agentId).meta.hired === false)); }
export function unreadCount(ctx) { const read = ctx.store.get('ui.readAt', 0); return inbox(ctx).filter((f) => f.at > read).length; }

/** Search jobs, products, clauses and notes in one go. */
export function globalSearch(ctx, query, limit = 8) {
    const qv = String(query || '').trim().toLowerCase(); if (!qv) return [];
    const out = [];
    for (const j of ctx.jobs()) if (`${j.id} ${j.customer} ${j.address} ${j.postcode}`.toLowerCase().includes(qv)) out.push({ kind: 'job', title: `${j.customer} (${j.id})`, run: () => { ctx.setCurrentJob(j.id); ctx.open('jobs', { tab: 'detail' }); } });
    for (const a of ctx.world.agents) if (a.name.toLowerCase().includes(qv)) out.push({ kind: 'crew', title: a.name, run: () => { ctx.store.set('ui.selectedAgent', a.id); ctx.open('crew', { tab: 'detail' }); } });
    for (const hit of searchStandards(qv).slice(0, limit)) out.push({ kind: 'clause', title: `${hit.standard} Cl ${hit.ref} – ${hit.title}`, run: () => { ctx.store.set('ui.codexStandard', hit.standardId); ctx.store.set('ui.codexClause', `${hit.standardId}#${hit.ref}`); ctx.open('codex', { tab: 'library' }); } });
    for (const n of ctx.store.get('journal', [])) if (n.text.toLowerCase().includes(qv)) out.push({ kind: 'note', title: n.text.slice(0, 60), run: () => ctx.open('journal', { tab: 'notes' }) });
    let count = 0;
    for (const p of ctx.products.list) { if (count >= limit) break; if (`${p.manufacturer} ${p.model}`.toLowerCase().includes(qv)) { count++; out.push({ kind: 'product', title: `${p.manufacturer} ${p.model}`, run: () => { ctx.store.patch('ui.vault', { q: query, category: '', manufacturer: '' }); ctx.open('inventory', { tab: 'browse' }); } }); } }
    return out.slice(0, limit * 3);
}

export function def(ctx) {
    return {
        id: 'notifications', title: 'Notifications', icon: '🔔', hotkey: null, width: 640, height: 520,
        tabs: [{ id: 'inbox', label: 'Inbox', icon: '🔔' }, { id: 'search', label: 'Find anything', icon: '🔍' }],
        render(body, { tab }) {
            if (tab === 'search') {
                const input = h('input', { type: 'search', class: 'input', placeholder: 'Jobs, crew, clauses, notes, products…', oninput: () => run() });
                const out = h('div');
                const run = () => { const hits = globalSearch(ctx, input.value); out.replaceChildren(...(hits.length ? hits.map((hit) => h('div', { class: 'card hit', onclick: hit.run }, badge(hit.kind, 'accent'), ' ', hit.title)) : [empty(input.value ? 'No matches' : 'Type to search everything')])); };
                run(); body.append(section('Find anything', input, out)); return;
            }
            const items = inbox(ctx); const readAt = ctx.store.get('ui.readAt', 0);
            body.append(row(h('span', { class: 'muted' }, `${items.length} notification${items.length === 1 ? '' : 's'} · ${unreadCount(ctx)} unread`), button('Mark all read', () => { ctx.store.set('ui.readAt', ctx.world.time); ctx.bus.emit('notifications:read'); ctx.refresh('notifications'); }, { small: true })));
            body.append(items.length ? h('ul', { class: 'feed' }, items.map((f) => h('li', { class: `feed-item ${f.at > readAt ? 'unread' : ''}`, onclick: () => { if (f.jobId) { ctx.setCurrentJob(f.jobId); ctx.open('jobs', { tab: 'detail' }); } else if (f.type === 'achievement') ctx.open('achievements'); else if (f.agentId) { ctx.store.set('ui.selectedAgent', f.agentId); ctx.open('crew', { tab: 'detail' }); } } }, f.at > readAt ? badge('new', 'accent') : null, ' ', badge(f.type.replace(/_/g, ' ')), ' ', f.text))) : empty('No notifications yet'));
        }
    };
}

export const FEATURES = [
    { id: 'win.notify.inbox', title: 'Inbox of important events with unread count', dom: true, test: () => { const t = makeTestCtx(); t.ctx.world.emit({ type: 'task_failed', agentId: 'ATLAS', text: 'Atlas found a defect' }); const b = openWindow(t.ctx, def(t.ctx)); const ok = qa(b, '.feed-item').length === 2 && unreadCount(t.ctx) === 2; t.done(); return ok; } },
    { id: 'win.notify.markRead', title: 'Mark all read clears the badge', dom: true, test: () => { const t = makeTestCtx(); const b = openWindow(t.ctx, def(t.ctx)); qa(b, 'button').find((x) => x.textContent === 'Mark all read').click(); const ok = unreadCount(t.ctx) === 0; t.done(); return ok; } },
    { id: 'win.notify.navigate', title: 'Clicking a notification opens its subject', dom: true, test: () => { const t = makeTestCtx(); t.ctx.wm.register({ id: 'achievements', title: 'a', render: () => {} }); const b = openWindow(t.ctx, def(t.ctx)); const item = qa(b, '.feed-item').find((x) => /Achievement/.test(x.textContent)); item.click(); const ok = t.ctx.wm.isOpen('achievements'); t.done(); return ok; } },
    { id: 'win.notify.globalSearch', title: 'Global search across jobs, crew, clauses, notes and products', dom: true, test: () => { const t = makeTestCtx(); t.ctx.store.set('journal', [{ id: 'n', at: '2026-01-01T00:00:00Z', text: 'Gamma inverter note', tags: [] }]); const hits = globalSearch(t.ctx, 'gamma'); const kinds = new Set(hits.map((h) => h.kind)); const b = openWindow(t.ctx, def(t.ctx), { tab: 'search' }); const i = q(b, 'input[type=search]'); i.value = 'test customer'; fire(i); const ok = kinds.has('note') && kinds.has('product') && qa(b, '.hit').length === 1; t.done(); return ok; } },
    { id: 'win.notify.crewOnly', title: 'Townsfolk level-ups stay out of the inbox', dom: true, test: () => { const t = makeTestCtx(); t.ctx.world.emit({ type: 'level_up', agentId: 'WREN', text: 'Wren levelled' }); t.ctx.world.emit({ type: 'level_up', agentId: 'ATLAS', text: 'Atlas levelled' }); const texts = inbox(t.ctx).map((f) => f.text); const ok = texts.includes('Atlas levelled') && !texts.includes('Wren levelled'); t.done(); return ok; } },
    { id: 'win.notify.searchClauses', title: 'Search finds standard clauses', dom: true, test: () => { const t = makeTestCtx(); const hits = globalSearch(t.ctx, 'voltage rise'); t.done(); return hits.some((h) => h.kind === 'clause'); } }
];
