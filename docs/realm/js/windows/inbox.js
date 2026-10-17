/** Inbox: the company mailbox as the crew sees it – who is waiting, what kind of mail, how fast we reply. */
import { h, button, badge, empty } from '../core/ui.js';
import { section, row, grid, statCard } from './_shared.js';
import { needsModel, link, fmtDate, makeBusinessCtx } from './_business.js';
import { table as dataTable } from './_business.js';
import { openWindow, q, qa } from './_testing.js';

const CATS = ['customer', 'lead', 'quote', 'complaint', 'legal', 'scheduling', 'handover', 'dnsp', 'supplier', 'finance', 'monitoring', 'marketing', 'notification', 'other'];

export function def(ctx) {
    return {
        id: 'inbox', title: 'Inbox', icon: '📬', hotkey: 'Shift+N', width: 980, height: 660,
        tabs: [{ id: 'waiting', label: 'Waiting on us', icon: '⏳' }, { id: 'all', label: 'All threads', icon: '📬' }, { id: 'stats', label: 'Response', icon: '📈' }],
        render(body, { tab }) { if (needsModel(ctx, body)) return; ({ all: renderAll, stats: renderStats }[tab] || renderWaiting)(body, ctx); }
    };
}
const threadRow = (ctx, t) => ({ id: t.id, when: fmtDate(t.lastDate), category: t.category, subject: t.subject || '(no subject)', from: t.external[0] || t.lastFrom || '', waiting: t.unanswered ? t.waitingDays : 0, site: t.siteId ? (ctx.business.site(t.siteId)?.customer || '') : '', url: t.url, messages: t.messages });
const columns = [{ key: 'when', label: 'Last' }, { key: 'category', label: 'Type', render: (v) => badge(v, ['complaint', 'legal'].includes(v) ? 'bad' : ['lead', 'quote', 'customer'].includes(v) ? 'accent' : 'neutral') }, { key: 'subject', label: 'Subject' }, { key: 'from', label: 'From' }, { key: 'site', label: 'Site' }, { key: 'waiting', label: 'Waiting (bd)', render: (v) => (v ? h('span', { class: v >= 2 ? 'bad' : '' }, String(v)) : '') }, { key: 'messages', label: 'Msgs' }, { key: 'url', label: '', render: (v) => link('Open', v) }];

function renderWaiting(body, ctx) {
    const m = ctx.business.model; const waiting = m.threads.filter((t) => t.unanswered && !['notification', 'marketing', 'monitoring', 'supplier', 'finance'].includes(t.category)).sort((a, b) => b.waitingDays - a.waitingDays);
    body.append(section(`${waiting.length} conversations waiting on a reply`, grid(4, statCard('Customers & leads', waiting.filter((t) => ['customer', 'lead', 'quote'].includes(t.category)).length), statCard('Complaints / legal', waiting.filter((t) => ['complaint', 'legal'].includes(t.category)).length, '', waiting.some((t) => ['complaint', 'legal'].includes(t.category)) ? 'var(--bad)' : null), statCard('Over 2 business days', waiting.filter((t) => t.waitingDays >= 2).length), statCard('Unread important', m.stats.inbox.unreadImportant))));
    body.append(waiting.length ? dataTable({ columns, rows: waiting.map((t) => threadRow(ctx, t)), pageSize: 25, searchKeys: ['subject', 'from', 'site', 'category'], initialSort: { key: 'waiting', dir: 'desc' } }) : empty('Nobody is waiting on us. Nice.'));
}
function renderAll(body, ctx) {
    const m = ctx.business.model; const by = m.stats.inbox.byCategory;
    body.append(section(`${m.threads.length} threads`, row(...CATS.filter((c) => by[c]).map((c) => badge(`${c} ${by[c]}`, 'neutral')))));
    body.append(dataTable({ columns, rows: m.threads.map((t) => threadRow(ctx, t)), pageSize: 25, searchKeys: ['subject', 'from', 'site', 'category'] }));
}
function renderStats(body, ctx) {
    const s = ctx.business.model.stats.inbox;
    body.append(section('Response performance', grid(4, statCard('Median first reply', s.medianResponseHours != null ? `${s.medianResponseHours} h` : '–', 'to customer threads'), statCard('Leads (30 days)', s.leads30d), statCard('Supplier invoices', s.supplierInvoices, 'threads'), statCard('Unanswered total', s.unanswered)), h('p', { class: 'muted small' }, 'Replies are detected from the company domain or the SENT label; notifications, marketing, supplier and finance mail never count as waiting.')));
    body.append(section('Suggested rules', h('ul', { class: 'notes' }, h('li', {}, 'Reply to every lead and quote thread the same business day; a lead waiting two days is usually lost.'), h('li', {}, 'Forward supplier invoices to the accounting inbox automatically so they stop sitting unread.'), h('li', {}, 'Star complaint and legal threads and give them a named owner (Prism for complaints, Atlas for legal).'), h('li', {}, 'Put the ServiceM8 job number in the subject of every customer email so threads link to sites.'))));
}

export const FEATURES = [
    { id: 'win.inbox.waiting', title: 'Waiting tab lists customer conversations without a reply, worst first', dom: true, test: () => { const t = makeBusinessCtx(); const b = openWindow(t.ctx, def(t.ctx)); const rows = qa(b, 'tbody tr'); const ok = rows.length === 2 && /We act for|Solar System installed/.test(b.textContent) && qa(b, '.stat').length === 4; t.done(); return ok; } },
    { id: 'win.inbox.all', title: 'All threads tab shows category chips and a searchable table with Gmail links', dom: true, test: () => { const t = makeBusinessCtx(); const b = openWindow(t.ctx, def(t.ctx), { tab: 'all' }); const ok = qa(b, 'tbody tr').length === 3 && qa(b, '.badge').length >= 3; t.done(); return ok; } },
    { id: 'win.inbox.stats', title: 'Response tab shows median reply time and leads', dom: true, test: () => { const t = makeBusinessCtx(); const b = openWindow(t.ctx, def(t.ctx), { tab: 'stats' }); const ok = /Median first reply/.test(b.textContent) && /Leads/.test(b.textContent); t.done(); return ok; } }
];
