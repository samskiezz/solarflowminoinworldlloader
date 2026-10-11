/**
 * ServiceM8 (read-only): jobs, companies, staff, queues, categories and
 * job activities (the schedule). Uses a private-app API key or basic auth.
 * API reference: https://developer.servicem8.com/reference
 */
'use strict';

const { fetchJson } = require('../http');

const BASE = 'https://api.servicem8.com/api_1.0';

function auth(cfg) {
    if (cfg.apiKey) return { basic: `${cfg.apiKey}:x` }; // private app keys authenticate as basic user "key"
    if (cfg.email && cfg.password) return { basic: `${cfg.email}:${cfg.password}` };
    return null;
}

function isConfigured(cfg) { return Boolean(auth(cfg)); }

async function list(resource, cfg, fetchFn, { filter = null, max = 5000 } = {}) {
    const out = []; let page = 0;
    for (;;) {
        const q = new URLSearchParams(); if (filter) q.set('$filter', filter); q.set('$top', '1000'); if (page) q.set('$skip', String(page * 1000));
        const rows = await fetchJson(`${BASE}/${resource}.json?${q}`, { auth: auth(cfg), fetchFn });
        if (!Array.isArray(rows) || !rows.length) break;
        out.push(...rows); if (rows.length < 1000 || out.length >= max) break; page++;
    }
    return out.slice(0, max);
}

/** Pull everything the model needs; the output is the raw payload buildModel() accepts. */
async function pull(cfg, { fetchFn = globalThis.fetch, log = () => {} } = {}) {
    const [jobs, companies, staff, queues, categories, activities] = await Promise.all([
        list('job', cfg, fetchFn, { filter: "active eq '1'", max: cfg.maxJobs }), list('company', cfg, fetchFn), list('staff', cfg, fetchFn), list('queue', cfg, fetchFn), list('category', cfg, fetchFn), list('jobactivity', cfg, fetchFn, { filter: "active eq '1'", max: cfg.maxJobs })
    ]);
    const company = new Map(companies.map((c) => [c.uuid, c.name]));
    const scheduled = new Set(activities.filter((a) => a.start_date && !/^0000/.test(a.start_date)).map((a) => a.job_uuid));
    const mapped = jobs.map((j) => ({ uuid: j.uuid, job_number: j.generated_job_id, title: company.get(j.company_uuid) || '', status: j.status, address: j.job_address || '', description: j.job_description || '', edit_date: j.edit_date }));
    const summaries = jobs.map((j) => ({ uuid: j.uuid, generated_job_id: j.generated_job_id, description_short: String(j.job_description || '').split('\n')[0], status: j.status, edit_date: j.edit_date, queue_uuid: j.queue_uuid || '', quote_sent: j.quote_sent === '1' || j.quote_sent === true, invoice_sent: j.invoice_sent === '1' || j.invoice_sent === true, is_scheduled: scheduled.has(j.uuid), total_invoice_amount: Number(j.total_invoice_amount) || 0, payment_amount: Number(j.payment_amount) || 0, customer_response_text: '', customer_response_requires_action: false }));
    log(`servicem8: ${jobs.length} jobs, ${staff.length} staff, ${activities.length} activities`);
    return { syncedAt: new Date().toISOString(), lists: [{ jobs: mapped }], summaries: [{ job_summaries: summaries }], details: [], staff: staff.map((s) => ({ uuid: s.uuid, name: `${s.first || ''} ${s.last || ''}`.trim() || s.name || s.email || s.uuid })), queues: queues.map((q) => ({ uuid: q.uuid, name: q.name, default_timeframe: q.default_timeframe })), categories: categories.map((c) => ({ uuid: c.uuid, name: c.name })), activities: activities.map((a) => ({ uuid: a.uuid, job_uuid: a.job_uuid, staff_uuid: a.staff_uuid, start: a.start_date, end: a.end_date })) };
}

module.exports = { isConfigured, pull, auth, BASE };
