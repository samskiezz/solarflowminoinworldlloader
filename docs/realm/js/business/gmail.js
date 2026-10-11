/**
 * Gmail import: thread metadata (sender, recipients, subject, snippet, labels,
 * dates) becomes classified conversations with response-time and
 * unanswered detection, linked to sites and jobs where the text allows.
 * Bodies are never required; the Gmail API metadata format is enough.
 */
import { classifyEmail, emailAddress, emailDomain, extractAddress, extractJobNumber, parseAddress, daysBetween, businessDaysBetween, clean } from './schema.js';

export const DEFAULT_DOMAINS = ['projectsolar.com.au', 'projectsolargroup.com', 'projectsolargroup.com.au'];
export function normaliseThread(raw, { domains = DEFAULT_DOMAINS, now = new Date() } = {}) {
    const msgs = (raw.messages || []).map((m) => ({ id: m.id, date: m.date, sender: emailAddress(m.sender), to: (m.to || m.toRecipients || []).map(emailAddress), cc: (m.cc || m.ccRecipients || []).map(emailAddress), subject: clean(m.subject || ''), snippet: clean(m.snippet || ''), labels: m.labels || m.labelIds || [], size: Number(m.size || m.sizeEstimate || 0), url: m.viewUrl || null })).sort((a, b) => new Date(a.date) - new Date(b.date));
    const internal = (addr) => domains.some((d) => emailDomain(addr) === d);
    for (const m of msgs) m.outbound = internal(m.sender) || m.labels.includes('SENT');
    const first = msgs[0] || {}; const last = msgs[msgs.length - 1] || {};
    const subject = msgs.map((m) => m.subject).find(Boolean) || '';
    const external = msgs.map((m) => m.sender).filter((s) => s && !internal(s));
    const category = classifyEmail({ sender: external[0] || first.sender || '', subject, snippet: msgs.map((m) => m.snippet).join(' ') });
    const lastInbound = [...msgs].reverse().find((m) => !m.outbound); const lastOutbound = [...msgs].reverse().find((m) => m.outbound);
    const unanswered = Boolean(lastInbound) && (!lastOutbound || new Date(lastOutbound.date) < new Date(lastInbound.date)) && !['notification', 'marketing', 'monitoring', 'finance', 'supplier'].includes(category);
    let firstResponseHours = null; const firstIn = msgs.find((m) => !m.outbound); if (firstIn) { const reply = msgs.find((m) => m.outbound && new Date(m.date) > new Date(firstIn.date)); if (reply) firstResponseHours = Math.round((new Date(reply.date) - new Date(firstIn.date)) / 3600000 * 10) / 10; }
    const text = [subject, ...msgs.map((m) => m.snippet)].filter(Boolean).join('. ');
    const addr = extractAddress(text);
    return { id: raw.id, subject, category, messages: msgs.length, participants: [...new Set(msgs.flatMap((m) => [m.sender, ...m.to, ...m.cc]).filter(Boolean))], external: [...new Set(external)], firstDate: first.date || null, lastDate: last.date || null, lastFrom: last.sender || null, unread: msgs.some((m) => m.labels.includes('UNREAD')), important: msgs.some((m) => m.labels.includes('IMPORTANT')), starred: msgs.some((m) => m.labels.includes('STARRED')),
        unanswered, waitingDays: unanswered && lastInbound ? businessDaysBetween(lastInbound.date, now) : 0, firstResponseHours, hasAttachments: msgs.some((m) => m.size > 500000), jobNumber: extractJobNumber(text), address: addr ? parseAddress(addr) : null, url: raw.viewUrl || first.url || null, source: 'gmail' };
}

export function importGmail({ pages = [], domains = DEFAULT_DOMAINS } = {}, { now = new Date() } = {}) {
    const seen = new Map();
    for (const page of pages) for (const t of page.threads || page) if (!seen.has(t.id)) seen.set(t.id, normaliseThread(t, { domains, now }));
    const threads = [...seen.values()].sort((a, b) => new Date(b.lastDate) - new Date(a.lastDate));
    return { threads, stats: inboxStats(threads, { now }) };
}

export function inboxStats(threads, { now = new Date() } = {}) {
    const by = {}; for (const t of threads) by[t.category] = (by[t.category] || 0) + 1;
    const responded = threads.filter((t) => t.firstResponseHours != null);
    const customerish = threads.filter((t) => ['customer', 'lead', 'quote', 'complaint', 'legal', 'scheduling', 'handover'].includes(t.category));
    return { total: threads.length, byCategory: by, unanswered: threads.filter((t) => t.unanswered).length, unansweredCustomers: customerish.filter((t) => t.unanswered).length, waitingOver2Days: customerish.filter((t) => t.unanswered && t.waitingDays >= 2).length,
        medianResponseHours: responded.length ? median(responded.map((t) => t.firstResponseHours)) : null, leads30d: threads.filter((t) => t.category === 'lead' && daysBetween(t.firstDate, now) <= 30).length, complaints: threads.filter((t) => t.category === 'complaint' || t.category === 'legal').length, supplierInvoices: threads.filter((t) => t.category === 'supplier').length, unreadImportant: threads.filter((t) => t.unread && t.important).length };
}
function median(xs) { const s = [...xs].sort((a, b) => a - b); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : Math.round(((s[m - 1] + s[m]) / 2) * 10) / 10; }

const T = (id, msgs) => ({ id, messages: msgs });
export const FEATURES = [
    { id: 'biz.gmail.thread', title: 'A thread classifies, links to a job/site and knows whether the customer is waiting on a reply', test: () => { const t = normaliseThread(T('a', [{ id: '1', date: '2026-09-09T00:57:00Z', sender: 'cust@yahoo.com.au', toRecipients: ['info@projectsolar.com.au'], subject: 'Questions on Proposal #1 before signing', snippet: 'Thanks for the proposal for the system at 151 Sample Rd, Moorebank', labelIds: ['INBOX'] }, { id: '2', date: '2026-09-09T06:07:17Z', sender: 'info@projectsolar.com.au', toRecipients: ['cust@yahoo.com.au'], subject: 'Re:', snippet: 'Revised proposal attached', labelIds: ['SENT'] }, { id: '3', date: '2026-09-11T02:32:13Z', sender: 'cust@yahoo.com.au', toRecipients: ['info@projectsolar.com.au'], subject: 'Re:', snippet: 'One thing to clarify', labelIds: ['INBOX', 'IMPORTANT'] }]), { now: new Date('2026-09-16T00:00:00Z') }); return t.category === 'quote' && t.unanswered && t.waitingDays === 3 && t.firstResponseHours === 5.2 && t.address.suburb === 'Moorebank' && t.external[0] === 'cust@yahoo.com.au'; } },
    { id: 'biz.gmail.noise', title: 'Notifications, marketing and supplier invoices never count as unanswered', test: () => { const n = normaliseThread(T('b', [{ id: '1', date: '2026-09-09T08:01:18Z', sender: 'remind@notice.alibaba.com', toRecipients: ['info@projectsolar.com.au'], subject: 'Deals', labelIds: ['UNREAD'] }])); const s = normaliseThread(T('c', [{ id: '1', date: '2026-09-09T08:01:18Z', sender: 'invoices.au@osw.energy', toRecipients: ['info@projectsolar.com.au'], subject: 'Invoice OSWS1', labelIds: ['UNREAD'] }])); return !n.unanswered && n.category === 'marketing' && !s.unanswered && s.category === 'supplier'; } },
    { id: 'biz.gmail.stats', title: 'Inbox statistics: categories, waiting customers, median response time, leads, complaints', test: () => { const r = importGmail({ pages: [{ threads: [T('a', [{ id: '1', date: '2026-09-20T00:00:00Z', sender: 'x@gmail.com', toRecipients: ['info@projectsolar.com.au'], subject: 'Looking for solar quote', snippet: '', labelIds: ['INBOX'] }]), T('b', [{ id: '2', date: '2026-09-01T00:00:00Z', sender: 'y@gmail.com', toRecipients: ['info@projectsolar.com.au'], subject: 'Inverter not working', snippet: 'fault', labelIds: ['INBOX'] }, { id: '3', date: '2026-09-01T04:00:00Z', sender: 'info@projectsolar.com.au', toRecipients: ['y@gmail.com'], subject: 'Re', labelIds: ['SENT'] }]), T('a', [])] }] }, { now: new Date('2026-10-01') }); return r.threads.length === 2 && r.stats.leads30d === 1 && r.stats.complaints === 1 && r.stats.unansweredCustomers === 1 && r.stats.medianResponseHours === 4; } }
];
