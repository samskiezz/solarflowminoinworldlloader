/**
 * ServiceM8 import: jobs, staff, queues and the lightweight job summaries
 * become normalised jobs and sites. Works on the JSON the ServiceM8 REST
 * API (and its MCP connector) return: job lists with uuid/job_number/title/
 * status/address/description, job summaries with invoice/payment flags, job
 * details with checklist items, and the staff list.
 */
import { parseAddress, parseJobDescription, jobKind, partnerOf, systemFromText, clean, titleCase, daysBetween } from './schema.js';

export const SM8_STATUSES = ['Quote', 'Work Order', 'Completed', 'Unsuccessful'];

/** Map ServiceM8 status + billing flags onto the realm's job stages. */
export function stageFor({ status, isScheduled = false, invoiceAmount = 0, paid = 0, invoiceSent = false, kind = 'install' }) {
    if (status === 'Unsuccessful') return 'lost';
    if (status === 'Quote') return 'quote';
    if (status === 'Work Order') return isScheduled ? 'install' : 'approval';
    if (status === 'Completed') {
        if (invoiceAmount > 0 && paid >= invoiceAmount) return 'complete';
        if (invoiceSent || invoiceAmount > 0) return 'handover';
        return kind === 'install' || kind === 'battery' || kind === 'ev' ? 'claim' : 'complete';
    }
    return 'lead';
}

export function jobUrl(uuid) { return `https://go.servicem8.com/job/${encodeURIComponent(uuid)}`; }

export function normaliseJob(input, { summary = null, detail = null } = {}) {
    const raw = detail ? { ...input, title: input.title || detail.title || '', address: input.address || detail.address || '', status: input.status || detail.status, description: detail.description || input.description || '' } : input;
    const desc = parseJobDescription(detail?.description || raw.description || '');
    const address = parseAddress(desc.address && /\d/.test(desc.address) ? desc.address : raw.address || desc.address || '');
    const kind = jobKind({ title: raw.title, description: detail?.description || raw.description || '', address: address.raw });
    const sys = systemFromText(desc);
    const invoiceAmount = Number(summary?.total_invoice_amount ?? raw.total_invoice_amount ?? 0) || 0;
    const paid = Number(summary?.payment_amount ?? raw.payment_amount ?? 0) || 0;
    const status = raw.status || summary?.status || 'Quote';
    const job = {
        id: `SM8-${raw.job_number || raw.generated_job_id || raw.uuid}`, uuid: raw.uuid, number: String(raw.job_number || raw.generated_job_id || ''), status, kind, partner: partnerOf(raw.title), title: clean(raw.title),
        customer: desc.customer ? titleCase(desc.customer) : (partnerOf(raw.title) === 'retail' ? '' : partnerOf(raw.title)), phone: desc.phone || null, email: desc.email ? desc.email.toLowerCase() : null,
        address, nmi: desc.nmi || null, phases: Number(desc.phase) || null, roof: desc.roof || null, backup: desc.backup || null, coupling: desc.coupling || null, salesman: desc.salesman || null, installedDate: desc.installedDate || null, team: desc.team || [],
        system: sys, marker: desc.marker, description: clean(raw.description || '').slice(0, 240), project: desc.project || desc.openSolar || desc.order || null,
        isScheduled: Boolean(summary?.is_scheduled), invoiceAmount, paid, invoiceSent: Boolean(summary?.invoice_sent), quoteSent: Boolean(summary?.quote_sent), customerResponse: summary?.customer_response_text || '', needsAction: Boolean(summary?.customer_response_requires_action), editDate: summary?.edit_date || raw.edit_date || null, queue: summary?.queue_uuid || null,
        checklist: detail?.checklist || null, url: jobUrl(raw.uuid), source: 'servicem8'
    };
    job.stage = stageFor({ status, isScheduled: job.isScheduled, invoiceAmount, paid, invoiceSent: job.invoiceSent, kind });
    job.isSite = ['install', 'battery', 'ev', 'service', 'profile'].includes(kind) && Boolean(address.key);
    return job;
}

/** Build jobs + sites + staff from the raw connector payloads. */
export function importServiceM8({ lists = [], summaries = [], details = [], staff = [], queues = [], categories = [] } = {}, { now = new Date() } = {}) {
    const byUuid = new Map();
    for (const list of lists) for (const j of list.jobs || list) byUuid.set(j.uuid, j);
    const sumByUuid = new Map(); for (const s of summaries.flatMap((x) => x.job_summaries || x)) sumByUuid.set(s.uuid, s);
    const detByUuid = new Map(); for (const d of details) { const j = d.job || d; detByUuid.set(j.uuid, { ...j, checklist: d.cards?.[0]?.checklist_items || d.checklist || null }); }
    for (const [uuid, s] of sumByUuid) if (!byUuid.has(uuid)) byUuid.set(uuid, { uuid, job_number: s.generated_job_id, title: '', status: s.status, address: '', description: s.description_short || '' });
    const jobs = [...byUuid.values()].map((raw) => normaliseJob(raw, { summary: sumByUuid.get(raw.uuid), detail: detByUuid.get(raw.uuid) }));
    jobs.sort((a, b) => Number(b.number) - Number(a.number));
    const sites = buildSites(jobs);
    const people = staff.map((s) => ({ id: s.uuid, name: clean(s.name), first: clean(s.name).split(' ')[0], source: 'servicem8', jobs: 0 }));
    for (const j of jobs) for (const t of j.team) { const p = people.find((x) => x.first.toLowerCase() === t.toLowerCase() || x.name.toLowerCase() === t.toLowerCase()); if (p) p.jobs++; }
    return { jobs, sites, staff: people, queues: queues.map((q) => ({ id: q.uuid, name: q.name, days: Number(q.default_timeframe) || null })), categories: categories.map((c) => ({ id: c.uuid, name: c.name })), stats: jobStats(jobs, { now }) };
}

export function buildSites(jobs) {
    const map = new Map();
    for (const j of jobs) {
        if (!j.isSite) continue;
        const key = j.address.key; const site = map.get(key) || { id: `site:${key}`, key, address: j.address, customer: j.customer, email: j.email, phone: j.phone, partner: j.partner, jobs: [], installed: false, system: null, firstJob: j.number, lastJob: j.number, status: j.stage };
        site.jobs.push(j.id); if (j.customer && !site.customer) site.customer = j.customer; if (j.email && !site.email) site.email = j.email; if (j.phone && !site.phone) site.phone = j.phone;
        if (j.status === 'Completed' && ['install', 'battery', 'ev'].includes(j.kind)) site.installed = true;
        if (j.system.pvKw || j.system.batteryKwh) site.system = { ...(site.system || {}), ...Object.fromEntries(Object.entries(j.system).filter(([, v]) => v !== null)) };
        if (Number(j.number) > Number(site.lastJob)) { site.lastJob = j.number; site.status = j.stage; }
        if (Number(j.number) < Number(site.firstJob)) site.firstJob = j.number;
        map.set(key, site);
    }
    return [...map.values()];
}

export function jobStats(jobs, { now = new Date() } = {}) {
    const real = jobs.filter((j) => j.kind !== 'test');
    const by = (k) => real.reduce((acc, j) => { acc[j[k]] = (acc[j[k]] || 0) + 1; return acc; }, {});
    const won = real.filter((j) => j.status === 'Completed' || j.status === 'Work Order').length; const lost = real.filter((j) => j.status === 'Unsuccessful').length;
    const pipeline = real.filter((j) => j.status === 'Work Order' && j.isSite);
    return { total: real.length, byStatus: by('status'), byKind: by('kind'), byPartner: by('partner'), winRate: won + lost ? Math.round((won / (won + lost)) * 100) : null,
        pipelineValue: Math.round(pipeline.reduce((s, j) => s + (j.invoiceAmount || 0), 0)), unscheduled: pipeline.filter((j) => !j.isScheduled).length, awaitingPayment: real.filter((j) => j.invoiceAmount > 0 && j.paid < j.invoiceAmount && j.status === 'Completed').length,
        staleWorkOrders: pipeline.filter((j) => j.editDate && daysBetween(j.editDate, now) > 21).length, sites: buildSites(jobs).length, installedSites: buildSites(jobs).filter((s) => s.installed).length };
}

const FIX = (over = {}) => ({ uuid: 'u1', job_number: '1001', title: 'Project Solar Group Pty Ltd', status: 'Work Order', address: '2 Example Ave\nGreenwich NSW 2065', description: 'Customer Name: Jane Example\nAddress: 2 Example Ave Greenwich, NSW 2065 (2 storey)\nNMI: 4100000000\nPhase: 3\nInverter: GoodWe GW15K-ETA-G20 x 1\nBattery Storage: GoodWe GW8.3-BAT-D-G21 5 Stack x 1\nSolar Panels: 30 x TSM-475NEG9RH.28 Trina Vertex S+ 475 W\nTeam onsite: Harrison, Oskar', ...over });
export const FEATURES = [
    { id: 'biz.sm8.normalise', title: 'A ServiceM8 job becomes a normalised job with customer, site, system, team and stage', test: () => { const j = normaliseJob(FIX(), { summary: { is_scheduled: true, total_invoice_amount: 18900, payment_amount: 0 } }); return j.id === 'SM8-1001' && j.customer === 'Jane Example' && j.address.suburb === 'Greenwich' && j.system.batteryKwh === 41.5 && j.team.length === 2 && j.stage === 'install' && j.isSite && j.url.includes('u1'); } },
    { id: 'biz.sm8.stages', title: 'Status plus billing flags map to realm stages (quote, approval, install, claim, handover, complete, lost)', test: () => stageFor({ status: 'Quote' }) === 'quote' && stageFor({ status: 'Work Order' }) === 'approval' && stageFor({ status: 'Work Order', isScheduled: true }) === 'install' && stageFor({ status: 'Completed' }) === 'claim' && stageFor({ status: 'Completed', invoiceAmount: 100 }) === 'handover' && stageFor({ status: 'Completed', invoiceAmount: 100, paid: 100 }) === 'complete' && stageFor({ status: 'Unsuccessful' }) === 'lost' },
    { id: 'biz.sm8.sites', title: 'Jobs at the same address collapse into one site that knows if it is installed', test: () => { const r = importServiceM8({ lists: [{ jobs: [FIX(), FIX({ uuid: 'u2', job_number: '1002', status: 'Completed', description: '***battery only\nCustomer Name: Jane Example', address: '2 Example Avenue, Greenwich NSW 2065' }), FIX({ uuid: 'u3', job_number: '1003', description: 'Sales Work', address: '' })] }], staff: [{ uuid: 's1', name: 'Harrison Example' }] }); return r.sites.length === 1 && r.sites[0].installed && r.sites[0].jobs.length === 2 && r.jobs.length === 3 && r.staff[0].jobs === 1 && r.stats.byKind.sales === 1; } },
    { id: 'biz.sm8.summaries', title: 'Job summaries supply invoice, payment, schedule and customer-response flags', test: () => { const r = importServiceM8({ lists: [{ jobs: [FIX()] }], summaries: [{ job_summaries: [{ uuid: 'u1', generated_job_id: '1001', status: 'Work Order', total_invoice_amount: 12990, payment_amount: 0, invoice_sent: false, is_scheduled: false, customer_response_requires_action: true, edit_date: '2026-09-01 10:00:00' }] }] }, { now: new Date('2026-10-11') }); const j = r.jobs[0]; return j.invoiceAmount === 12990 && j.needsAction && !j.isScheduled && r.stats.pipelineValue === 12990 && r.stats.unscheduled === 1 && r.stats.staleWorkOrders === 1; } },
    { id: 'biz.sm8.details', title: 'A job known only from a summary is completed by its detail record (title, address, description, checklist)', test: () => { const r = importServiceM8({ summaries: [{ job_summaries: [{ uuid: 'u7', generated_job_id: '1007', status: 'Completed', total_invoice_amount: 9000, payment_amount: 9000 }] }], details: [{ job: { uuid: 'u7', job_number: '1007', title: 'Project Solar Group Pty Ltd', status: 'Completed', address: '4 Example Ave\nGreenwich NSW 2065', description: 'Customer Name: Sam Example\nSolar Panels: 10 x 440 W' }, cards: [{ checklist_items: [{ label: 'JSA', completed: true }] }] }] }); const j = r.jobs[0]; return j.customer === 'Sam Example' && j.address.suburb === 'Greenwich' && j.isSite && j.stage === 'complete' && j.checklist.length === 1 && r.sites.length === 1 && r.sites[0].installed; } },
    { id: 'biz.sm8.stats', title: 'Job statistics: win rate, pipeline value, awaiting payment, installed base', test: () => { const r = importServiceM8({ lists: [{ jobs: [FIX({ status: 'Completed' }), FIX({ uuid: 'u2', job_number: '1002', status: 'Unsuccessful', address: '1 B St Suburb NSW 2000' }), FIX({ uuid: 'u9', job_number: '9', title: 'PROJECT SOLAR (test)', description: 'Inverter: Test test test', address: '1 T St' })] }], summaries: [{ job_summaries: [{ uuid: 'u1', status: 'Completed', total_invoice_amount: 5000, payment_amount: 0 }] }] }); return r.stats.total === 2 && r.stats.winRate === 50 && r.stats.awaitingPayment === 1 && r.stats.installedSites === 1; } }
];
