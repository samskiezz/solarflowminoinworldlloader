/**
 * The business model: every connector normalised and cross-linked.
 *
 *   buildModel(raw) -> model     raw = { servicem8, xero, gmail, drive, calendar, bank, market, company }
 *
 * Jobs link to Xero invoices by the "SM8-<job>" reference, sites collect the
 * jobs at one address plus their revenue, threads and handover pack, and the
 * insight rules run last so the model carries its own findings.
 */
import { emptyModel, parseAddress, isoDay } from './schema.js';
import { importServiceM8 } from './servicem8.js';
import { importXero } from './xero.js';
import { importGmail, DEFAULT_DOMAINS } from './gmail.js';
import { importDrive } from './drive.js';
import { importCalendar } from './calendar.js';
import { importBank, buildPayeeRules } from './bank.js';
import { importSocial, draftPosts, SAMPLE_SOCIAL } from './social.js';
import { importStaff, contractorFromAccount } from './staff.js';
import { marketModel } from './market.js';
import { runInsights, summarise } from './insights.js';

export function buildModel(raw = {}, { now = new Date() } = {}) {
    const model = emptyModel();
    model.generatedAt = now.toISOString();
    model.company = { name: raw.company?.name || raw.xero?.summary?.org?.name || 'Your business', domains: raw.company?.domains || DEFAULT_DOMAINS, timezone: raw.company?.timezone || 'Australia/Sydney' };

    const sm8 = importServiceM8(raw.servicem8 || {}, { now });
    model.jobs = sm8.jobs; model.sites = sm8.sites; model.queues = sm8.queues; model.categories = sm8.categories;
    const xero = importXero(raw.xero || {}, { now });
    model.finance = { ...xero.finance, kpis: xero.kpis }; model.invoices = xero.invoices; model.bills = xero.bills; model.unreconciled = xero.unreconciled;
    linkInvoices(model);

    const gmail = importGmail({ pages: raw.gmail?.pages || [], domains: model.company.domains }, { now });
    model.threads = gmail.threads; linkThreads(model);
    const drive = importDrive(raw.drive || {}, { sites: model.sites });
    model.packs = drive.packs; model.documents = { root: raw.drive?.root || null, stats: drive.stats }; for (const p of drive.packs) { const s = model.sites.find((x) => x.id === p.siteId); if (s) s.packId = p.id; }
    const cal = importCalendar(raw.calendar || {}, { now });
    model.events = cal.events;
    const contractors = (model.finance.pnl?.expenses || []).map(([n]) => contractorFromAccount(n)).filter(Boolean);
    const suppliers = [...new Set(model.bills.map((b) => b.contact))];
    const bank = importBank(raw.bank || {}, { xeroCash: model.finance.kpis?.cash ?? null, now, rules: buildPayeeRules({ staff: sm8.staff, contractors, suppliers }) });
    model.bank = { banks: bank.banks, accounts: bank.accounts, transactions: bank.transactions, stats: bank.stats };
    const weekly = (model.finance.kpis?.weeklyContractors || []).map((w) => ({ name: w.name, weekly: Math.round(w.total / Math.max(1, weeksIn(model.unreconciled))) }));
    const staff = importStaff({ staff: sm8.staff, pnlExpenses: model.finance.pnl?.expenses || [], weeklyPayments: weekly, jobs: model.jobs }, { months: model.finance.kpis?.months || 12 });
    model.staff = staff.people;
    model.market = marketModel(raw.market || {}); if (cal.stats.funnel) model.market.funnel = cal.stats.funnel;
    const social = importSocial(raw.meta || raw.social || {}, { now });
    model.social = { accounts: social.accounts, posts: social.posts, comments: social.comments, conversations: social.conversations, allowPublish: Boolean((raw.meta || raw.social || {}).allowPublish), drafts: draftPosts({ jobs: model.jobs, sites: model.sites, posts: social.posts, market: model.market, stats: social.stats, now }) };

    model.stats = { jobs: sm8.stats, finance: xero.kpis, inbox: gmail.stats, documents: drive.stats, calendar: cal.stats, bank: bank.stats, staff: staff.stats, social: social.stats };
    model.sources = sources(raw, model);
    model.insights = runInsights(model, { now }); model.insightSummary = summarise(model.insights);
    return model;
}

function weeksIn(rows) { const dates = rows.map((r) => new Date(r.date)).filter((d) => !Number.isNaN(d.getTime())); if (dates.length < 2) return 1; return Math.max(1, Math.round((Math.max(...dates) - Math.min(...dates)) / (7 * 86400000))); }

function linkInvoices(model) {
    const byNumber = new Map(model.jobs.map((j) => [j.number, j])); const byKey = new Map(model.jobs.filter((j) => j.address.key).map((j) => [j.address.key, j]));
    const siteByKey = new Map(model.sites.map((s) => [s.key, s]));
    for (const inv of model.invoices) {
        let job = inv.jobNumber ? byNumber.get(inv.jobNumber) : null; if (!job && inv.address?.key) job = byKey.get(inv.address.key) || null;
        if (job) { inv.jobId = job.id; job.invoice = { number: inv.number, total: inv.total, status: inv.status, paidOn: inv.paidOn, due: inv.due, url: inv.url }; if (!job.invoiceAmount) job.invoiceAmount = inv.total; if (inv.status === 'PAID') job.paid = Math.max(job.paid, inv.total); const site = siteByKey.get(job.address.key); if (site) { site.revenue = (site.revenue || 0) + inv.total; site.invoices = (site.invoices || 0) + 1; inv.siteId = site.id; } }
        else if (inv.address?.key && siteByKey.has(inv.address.key)) { const site = siteByKey.get(inv.address.key); site.revenue = (site.revenue || 0) + inv.total; site.invoices = (site.invoices || 0) + 1; inv.siteId = site.id; }
    }
    for (const r of model.finance.ar?.rows || []) { const job = r.job?.jobNumber ? byNumber.get(r.job.jobNumber) : null; if (job) { r.jobId = job.id; job.overdue = (job.overdue || 0) + r.total; const site = siteByKey.get(job.address.key); if (site) { site.overdue = (site.overdue || 0) + r.total; r.siteId = site.id; } } }
    for (const j of model.jobs) if (j.invoice && j.stage !== 'lost') { if (j.invoice.status === 'PAID') j.stage = j.status === 'Completed' ? 'complete' : j.stage; else if (j.status === 'Completed') j.stage = 'handover'; }
    for (const s of model.sites) { const last = model.jobs.find((j) => j.number === s.lastJob); if (last) s.status = last.stage; }
}

function linkThreads(model) {
    const siteByKey = new Map(model.sites.map((s) => [s.key, s])); const siteByEmail = new Map(model.sites.filter((s) => s.email).map((s) => [s.email, s])); const jobByNumber = new Map(model.jobs.map((j) => [j.number, j]));
    for (const t of model.threads) {
        let site = t.address?.key ? siteByKey.get(t.address.key) : null;
        if (!site) for (const e of t.external) if (siteByEmail.has(e)) { site = siteByEmail.get(e); break; }
        if (!site && t.jobNumber && jobByNumber.has(t.jobNumber)) site = siteByKey.get(jobByNumber.get(t.jobNumber).address.key) || null;
        if (site) { t.siteId = site.id; site.threads = (site.threads || 0) + 1; if (t.unanswered) site.waiting = (site.waiting || 0) + 1; }
    }
}

function sources(raw, model) {
    const at = model.generatedAt; const s = {};
    if (raw.servicem8) s.servicem8 = { syncedAt: raw.servicem8.syncedAt || at, count: model.jobs.length, label: 'ServiceM8 jobs, staff, schedule' };
    if (raw.xero) s.xero = { syncedAt: raw.xero.syncedAt || at, count: model.invoices.length, label: 'Xero P&L, receivables, invoices, bills, bank rec' };
    if (raw.gmail) s.gmail = { syncedAt: raw.gmail.syncedAt || at, count: model.threads.length, label: 'Gmail threads' };
    if (raw.drive) s.drive = { syncedAt: raw.drive.syncedAt || at, count: model.packs.length, label: 'Drive handover packs' };
    if (raw.calendar) s.calendar = { syncedAt: raw.calendar.syncedAt || at, count: model.events.length, label: 'Calendar events' };
    if (raw.bank) s.bank = { syncedAt: raw.bank.syncedAt || at, count: model.bank.accounts.length, label: 'Bank accounts and transactions' };
    const meta = raw.meta || raw.social; if (meta) { const fb = (meta.accounts || []).filter((a) => a.platform === 'facebook'); const ig = (meta.accounts || []).filter((a) => a.platform === 'instagram'); if (fb.length) s.facebook = { syncedAt: meta.syncedAt || at, count: model.social.posts.filter((p) => p.platform === 'facebook').length, label: `Facebook: ${fb.length} page(s), posts, comments, inbox` }; if (ig.length) s.instagram = { syncedAt: meta.syncedAt || at, count: model.social.posts.filter((p) => p.platform === 'instagram').length, label: `Instagram: ${ig.length} account(s), media, comments, insights` }; }
    return s;
}

/** A compact, non-identifying summary for dashboards and tests. */
export function modelDigest(model) {
    if (!model) return null;
    return { generatedAt: model.generatedAt, company: model.company.name, sources: Object.keys(model.sources || {}), jobs: model.jobs.length, sites: model.sites.length, installedSites: model.sites.filter((s) => s.installed).length, invoices: model.invoices.length, threads: model.threads.length, packs: (model.packs || []).length, events: model.events.length, staff: model.staff.length, findings: model.insights?.length || 0, health: model.insightSummary?.score ?? null, impact: model.insightSummary?.impact ?? null, revenue: model.finance?.kpis?.revenue ?? null, cash: model.finance?.kpis?.cash ?? null, posts: model.social?.posts?.length || 0, followers: model.stats?.social?.followers || 0 };
}

/** Is this JSON a built model or a raw connector payload? */
export function isModel(json) { return Boolean(json && typeof json === 'object' && 'version' in json && Array.isArray(json.jobs) && Array.isArray(json.sites)); }

export const SAMPLE_RAW = () => ({
    company: { name: 'Example Solar Co', domains: ['example-solar.test'] },
    servicem8: { lists: [{ jobs: [
        { uuid: 'j1', job_number: '1001', title: 'Example Solar Co', status: 'Completed', address: '2 Example Ave\nGreenwich NSW 2065', description: '***battery only\nCustomer Name: Jane Example\nEmail Address: jane@example.test\nContact Number: 0400000000\nNMI: 4100000001\nPhase: 3\nInverter: Hybrid 15K x 1\nBattery Storage: 8.3 kWh 5 Stack x 1\nSolar Panels: 30 x 475 W\nTeam onsite: Sam, Pat' },
        { uuid: 'j2', job_number: '1002', title: 'Example Solar Co', status: 'Work Order', address: '7 Sample St\nPenrith NSW 2750', description: 'Customer Name: Chris Sample\nInverter: 10K hybrid\nSolar Panels: 20 x 440 W' },
        { uuid: 'j3', job_number: '1003', title: 'Partner Energy Pty Ltd', status: 'Completed', address: '9 Demo Rd\nBlacktown NSW 2148', description: 'Name: Alex Demo' },
        { uuid: 'j4', job_number: '1004', title: 'Example Solar Co', status: 'Quote', address: '4 Test Pl\nRyde NSW 2112', description: 'Customer Name: Quote Person' },
        { uuid: 'j5', job_number: '1005', title: 'Example Solar Co', status: 'Work Order', address: '', description: 'Sales Work' } ] }],
        summaries: [{ job_summaries: [{ uuid: 'j2', generated_job_id: '1002', status: 'Work Order', total_invoice_amount: 12990, payment_amount: 0, is_scheduled: false, edit_date: '2026-08-15 10:00:00' }, { uuid: 'j4', generated_job_id: '1004', status: 'Quote', quote_sent: false, edit_date: '2026-03-01 10:00:00' }] }],
        staff: [{ uuid: 's1', name: 'Sam Example' }, { uuid: 's2', name: 'Pat Fictional' }] },
    xero: { summary: { org: { name: 'Example Solar Co' }, pnl: { period: { start: '2025-10-01', end: '2026-10-01' }, totalIncome: 1000000, costOfSales: 250000, grossProfit: 750000, totalExpenses: 800000, netProfit: -50000, income: [['Sales', 1000000]], expenses: [['Wages and Salaries', 300000], ['Contractor Payment_SAM EXAMPLE', 120000], ['Electrical Materials', 150000], ['Stripe Fees', 12000]], reportLink: 'https://reporting.xero.com/x' }, position: { cashBalance: 38000, workingCapital: -300000, netEquity: -200000, currentLiabilities: 440000 }, cash: { cashBalance: 38000, receivables: 97000, payables: 2000 }, agedReceivables: { total: 97000, overdueTotal: 97000, invoiceCount: 2, rows: [{ contact: 'Jane Example', number: 'INV-0534', ref: 'SM8- 1001- 2 Example Ave Greenwich, NSW 2065', due: '2026-10-09', total: 20700 }, { contact: 'Old Customer', number: 'INV-0374', ref: 'SM8-900- 1 Far St Eastwood NSW 2122', due: '2026-06-24', total: 7375 }] }, agedPayables: { total: 2000, rows: [{ contact: 'Storage Co', ref: '1', due: '2026-05-12', total: 2000 }] }, topCustomers: { rows: [['Partner Energy Pty Ltd', 600000], ['Retail', 400000]] } },
        invoices: [{ columns: ['number', 'date', 'due', 'paidOn', 'contact', 'total', 'status', 'ref'], rows: [['INV-0500', '2026-06-01', '2026-06-08', '2026-06-09', 'Partner Energy Pty Ltd', 3905, 'PAID', 'SM8-1003- 9 Demo Rd Blacktown NSW 2148'], ['INV-0534', '2026-10-01', '2026-10-09', null, 'Jane Example', 20700, 'UNPAID', 'SM8- 1001- 2 Example Ave Greenwich, NSW 2065']] }],
        bills: [{ columns: ['number', 'date', 'due', 'paidOn', 'contact', 'total', 'status', 'attachments'], rows: [['OSW1', '2026-07-01', '2026-07-01', '2026-07-01', 'Wholesale Co', 1754.5, 'PAID', true]] }],
        unreconciled: [{ columns: ['date', 'amount', 'contact', 'type', 'account', 'ref'], rows: [['2026-07-06', -2030.77, 'Labour Co', 'ACCPAYPAYMENT', null, '1'], ['2026-07-13', -2030.77, 'Labour Co', 'ACCPAYPAYMENT', null, '2'], ['2026-07-20', -2030.77, 'Labour Co', 'ACCPAYPAYMENT', null, '3'], ['2026-07-21', 14500, 'Customer', 'ACCRECPAYMENT', null, 'INV']] }] },
    gmail: { pages: [{ threads: [{ id: 't1', messages: [{ id: 'm1', date: '2026-09-24T21:35:11Z', sender: 'admin@law.test', toRecipients: ['info@example-solar.test'], subject: 'Solar System installed at 1 Far St, Eastwood', snippet: 'We act for the owner', labelIds: ['INBOX'] }] }, { id: 't2', messages: [{ id: 'm2', date: '2026-09-30T00:00:00Z', sender: 'jane@example.test', toRecipients: ['info@example-solar.test'], subject: 'Question about my battery', snippet: 'Hi, quick question', labelIds: ['INBOX', 'UNREAD'] }] }, { id: 't3', messages: [{ id: 'm3', date: '2026-09-22T10:46:27Z', sender: 'noreply@builder.test', toRecipients: ['info@example-solar.test'], subject: 'Quote Request - Solar/PV System', snippet: 'Request for quote', labelIds: ['INBOX'] }, { id: 'm4', date: '2026-09-23T03:22:38Z', sender: 'info@example-solar.test', toRecipients: ['noreply@builder.test'], subject: 'Re', snippet: 'Attached', labelIds: ['SENT'] }] }] }] },
    drive: { root: { id: 'root', url: 'https://drive.google.com/drive/folders/root' }, folders: [{ id: 'f1', title: 'Jane Example', mimeType: 'application/vnd.google-apps.folder', createdTime: '2026-10-06T02:42:14Z' }], files: { f1: [{ title: 'CCEW.pdf' }, { title: 'Commissioning.pdf' }] } },
    calendar: { events: [{ id: 'w', recurring: true, summary: 'Weekly Jobs Alignment', start: '2026-09-02T15:00:00+08:00', end: '2026-09-02T16:00:00+08:00', occurrences: ['2026-09-30', '2026-10-07', '2026-10-14'], attendees: [{ email: 'info@example-solar.test', status: 'accepted', organizer: true }, { email: 'a@partner.test', status: 'needsAction' }, { email: 'b@partner.test', status: 'needsAction' }, { email: 'c@partner.test', status: 'needsAction' }] }, { id: 's', summary: 'Digital Strategy Session', start: '2026-10-01T11:00:00+08:00', end: '2026-10-01T11:15:00+08:00', organizer: 'meetings@agency.test', description: 'Spending 6k per week for a lead farm. 70 leads per week 40% pickup rate. 28% close rate on pickups CPA around 600' }] },
    meta: SAMPLE_SOCIAL(),
    bank: { banks: [{ id: 'b1', name: 'Example Bank', consentExpires: '2027-10-08T00:00:00Z' }], accounts: [{ id: 'a1', bankId: 'b1', name: 'Business Account', type: 'checking', balance: 12850.94 }, { id: 'a2', bankId: 'b1', name: 'Savings', type: 'savings', balance: 345.19 }], transactions: [{ date: '2026-10-06', amount: -2030.77, description: 'Labour Co' }, { date: '2026-10-07', amount: 14500, description: 'J Customer' }] }
});

export const FEATURES = [
    { id: 'biz.model.build', title: 'The whole model builds from raw connector payloads with every source present', test: () => { const m = buildModel(SAMPLE_RAW(), { now: new Date('2026-10-12') }); return m.jobs.length === 5 && m.sites.length === 4 && m.invoices.length === 2 && m.threads.length === 3 && m.packs.length === 1 && m.events.length === 4 && m.staff.length >= 2 && Object.keys(m.sources).length === 8 && m.social.posts.length === 3 && m.social.drafts.length >= 2 && m.sources.instagram.count === 1 && m.company.name === 'Example Solar Co'; } },
    { id: 'biz.model.linkInvoices', title: 'Invoices link to jobs and sites by the SM8 reference; overdue amounts land on the site', test: () => { const m = buildModel(SAMPLE_RAW(), { now: new Date('2026-10-12') }); const j1 = m.jobs.find((j) => j.number === '1001'); const s = m.sites.find((x) => x.customer === 'Jane Example'); const j3 = m.jobs.find((j) => j.number === '1003'); return j1.invoice.number === 'INV-0534' && j1.stage === 'handover' && s.revenue === 20700 && s.overdue === 20700 && j3.stage === 'complete' && j3.paid === 3905; } },
    { id: 'biz.model.linkThreads', title: 'Email threads attach to sites by customer email or address and count waiting customers', test: () => { const m = buildModel(SAMPLE_RAW(), { now: new Date('2026-10-12') }); const s = m.sites.find((x) => x.customer === 'Jane Example'); const t = m.threads.find((x) => x.id === 't2'); return t.siteId === s.id && s.threads === 1 && s.waiting === 1 && s.packId === 'f1'; } },
    { id: 'biz.model.insights', title: 'The built model carries ranked findings and a health score', test: () => { const m = buildModel(SAMPLE_RAW(), { now: new Date('2026-10-12') }); const ids = m.insights.map((f) => f.id); return m.insights.length >= 10 && ids.includes('finance.netLoss') && ids.some((i) => i.startsWith('inbox.legal')) && ids.includes('jobs.unscheduled:1002') && ids.includes('marketing.funnel') && m.insightSummary.score < 70 && modelDigest(m).findings === m.insights.length; } },
    { id: 'biz.model.digest', title: 'Model digest is compact and non-identifying; isModel tells built models from raw payloads', test: () => { const m = buildModel(SAMPLE_RAW()); const d = modelDigest(m); return d.sites === 4 && !JSON.stringify(d).includes('Jane') && isModel(m) && !isModel(SAMPLE_RAW()) && modelDigest(null) === null; } }
];
