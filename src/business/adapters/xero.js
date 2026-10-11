/**
 * Xero (read-only): a "custom connection" (client credentials) with the
 * accounting.reports.read, accounting.transactions.read,
 * accounting.contacts.read and accounting.settings.read scopes.
 * Produces the summary/table shapes the model's Xero importer accepts.
 */
'use strict';

const { fetchJson } = require('../http');

const TOKEN_URL = 'https://identity.xero.com/connect/token';
const API = 'https://api.xero.com/api.xro/2.0';

function isConfigured(cfg) { return Boolean(cfg.clientId && cfg.clientSecret); }

async function token(cfg, fetchFn) {
    const res = await fetchJson(TOKEN_URL, { method: 'POST', form: true, body: { grant_type: 'client_credentials', scope: 'accounting.reports.read accounting.transactions.read accounting.contacts.read accounting.settings.read' }, auth: { basic: `${cfg.clientId}:${cfg.clientSecret}` }, fetchFn });
    return res.access_token;
}
const day = (d) => d.toISOString().slice(0, 10);
const num = (v) => Number(String(v ?? '').replace(/[^0-9.-]/g, '')) || 0;

/** Flatten a Xero report (rows of sections) into [name, value] pairs per section title. */
function reportRows(report) {
    const out = { sections: {}, all: [] };
    for (const section of report.Rows || []) {
        const title = section.Title || ''; const rows = [];
        for (const r of section.Rows || []) { if (r.RowType === 'Row' && r.Cells) { const name = r.Cells[0]?.Value; const value = num(r.Cells[1]?.Value); rows.push([name, value]); out.all.push([title, name, value]); } if (r.RowType === 'SummaryRow' && r.Cells) out.sections[`${title}:total`] = num(r.Cells[1]?.Value); }
        out.sections[title] = rows;
    }
    return out;
}

async function pull(cfg, { fetchFn = globalThis.fetch, log = () => {}, now = new Date() } = {}) {
    const bearer = await token(cfg, fetchFn);
    const get = (path) => fetchJson(`${API}/${path}`, { auth: { bearer }, headers: cfg.tenantId ? { 'xero-tenant-id': cfg.tenantId } : {}, fetchFn });
    const start = new Date(now); start.setMonth(start.getMonth() - (cfg.months || 12));
    const [org, pnl, bs, invoices, bills, unrec] = await Promise.all([
        get('Organisation'), get(`Reports/ProfitAndLoss?fromDate=${day(start)}&toDate=${day(now)}`), get(`Reports/BalanceSheet?date=${day(now)}`),
        pages(get, `Invoices?where=Type=="ACCREC" AND Date>=DateTime(${start.getFullYear()},${start.getMonth() + 1},${start.getDate()})`, 'Invoices'), pages(get, `Invoices?where=Type=="ACCPAY" AND Date>=DateTime(${start.getFullYear()},${start.getMonth() + 1},${start.getDate()})`, 'Invoices'), pages(get, 'BankTransactions?where=IsReconciled==false', 'BankTransactions')
    ]);
    const p = reportRows(pnl.Reports?.[0] || {}); const b = reportRows(bs.Reports?.[0] || {});
    const income = p.sections.Income || p.sections['Trading Income'] || []; const cos = p.sections['Less Cost of Sales'] || p.sections['Cost of Sales'] || []; const expenses = (p.sections['Less Operating Expenses'] || p.sections['Operating Expenses'] || p.sections.Expenses || []).sort((x, y) => y[1] - x[1]);
    const totalIncome = income.reduce((s, [, v]) => s + v, 0); const costOfSales = cos.reduce((s, [, v]) => s + v, 0); const totalExpenses = expenses.reduce((s, [, v]) => s + v, 0);
    const sales = invoices.filter((i) => i.Status !== 'VOIDED' && i.Status !== 'DELETED'); const unpaid = sales.filter((i) => num(i.AmountDue) > 0);
    const ar = { asOf: day(now), total: unpaid.reduce((s, i) => s + num(i.AmountDue), 0), invoiceCount: unpaid.length, customerCount: new Set(unpaid.map((i) => i.Contact?.Name)).size, overdueTotal: unpaid.filter((i) => xeroDate(i.DueDateString || i.DueDate) < now).reduce((s, i) => s + num(i.AmountDue), 0), rows: unpaid.map((i) => ({ contact: i.Contact?.Name, email: i.Contact?.EmailAddress || null, date: day(xeroDate(i.DateString || i.Date)), due: day(xeroDate(i.DueDateString || i.DueDate)), number: i.InvoiceNumber, ref: i.Reference || null, total: num(i.AmountDue) })) };
    const unpaidBills = bills.filter((i) => num(i.AmountDue) > 0);
    const ap = { asOf: day(now), total: unpaidBills.reduce((s, i) => s + num(i.AmountDue), 0), billCount: unpaidBills.length, rows: unpaidBills.map((i) => ({ contact: i.Contact?.Name, date: day(xeroDate(i.DateString || i.Date)), due: day(xeroDate(i.DueDateString || i.DueDate)), ref: i.InvoiceNumber || i.Reference, total: num(i.AmountDue) })) };
    const byCustomer = {}; for (const i of sales) byCustomer[i.Contact?.Name || '?'] = (byCustomer[i.Contact?.Name || '?'] || 0) + num(i.SubTotal);
    const cash = b.all.filter(([sec, name]) => /bank/i.test(sec) || /bank|cash/i.test(name)).reduce((s, [, , v]) => s + v, 0);
    const summary = { org: { id: org.Organisations?.[0]?.OrganisationID, name: org.Organisations?.[0]?.Name, currency: org.Organisations?.[0]?.BaseCurrency }, pnl: { period: { start: day(start), end: day(now) }, basis: 'ACCRUAL', totalIncome, costOfSales, grossProfit: totalIncome - costOfSales, totalExpenses, netProfit: totalIncome - costOfSales - totalExpenses, income, expenses }, position: { snapshot: day(now), cashBalance: cash, totalAssets: b.sections['Total Assets'] ?? null, totalLiabilities: b.sections['Total Liabilities'] ?? null, netEquity: b.sections['Net Assets'] ?? null, workingCapital: (b.sections['Current Assets:total'] || 0) - (b.sections['Current Liabilities:total'] || 0), currentLiabilities: b.sections['Current Liabilities:total'] || 0 }, cash: { snapshot: day(now), cashBalance: cash, receivables: ar.total, payables: ap.total }, agedReceivables: ar, agedPayables: ap, topCustomers: { period: { start: day(start), end: day(now) }, rows: Object.entries(byCustomer).sort((x, y) => y[1] - x[1]).slice(0, 10) } };
    log(`xero: ${sales.length} invoices, ${bills.length} bills, ${unrec.length} unreconciled`);
    return { syncedAt: new Date().toISOString(), summary, invoices: [sales.map((i) => ({ invoice_id: i.InvoiceID, invoice_number: i.InvoiceNumber, reference: i.Reference, status: num(i.AmountDue) > 0 ? 'UNPAID' : 'PAID', contact: { name: i.Contact?.Name }, amount_total: i.Total, amount_due: i.AmountDue, invoice_date: day(xeroDate(i.DateString || i.Date)), due_date: day(xeroDate(i.DueDateString || i.DueDate)), fully_paid_on_date: i.FullyPaidOnDate ? day(xeroDate(i.FullyPaidOnDate)) : null, has_attachments: Boolean(i.HasAttachments) }))], bills: [bills.map((i) => ({ bill_id: i.InvoiceID, bill_number: i.InvoiceNumber, bill_date: day(xeroDate(i.DateString || i.Date)), due_date: day(xeroDate(i.DueDateString || i.DueDate)), fully_paid_on_date: i.FullyPaidOnDate ? day(xeroDate(i.FullyPaidOnDate)) : null, contact: { name: i.Contact?.Name }, amount_total: i.Total, status: num(i.AmountDue) > 0 ? 'UNPAID' : 'PAID', has_attachments: Boolean(i.HasAttachments) }))], unreconciled: [{ bank_accounts: [{ name: 'all', transactions: unrec.map((t) => ({ transaction_id: t.BankTransactionID, date: day(xeroDate(t.DateString || t.Date)), bank_amount: t.Type === 'SPEND' ? -num(t.Total) : num(t.Total), contact: { name: t.Contact?.Name }, document_type: t.Type, line_account: t.LineItems?.[0]?.AccountCode ? { name: t.LineItems[0].AccountCode } : null, reference: t.Reference })) }] }] };
}
function xeroDate(v) { if (!v) return new Date(NaN); const m = String(v).match(/\/Date\((\d+)/); return m ? new Date(Number(m[1])) : new Date(v); }
async function pages(get, path, key) { const out = []; for (let page = 1; page <= 50; page++) { const res = await get(`${path}${path.includes('?') ? '&' : '?'}page=${page}`); const rows = res[key] || []; out.push(...rows); if (rows.length < 100) break; } return out; }

module.exports = { isConfigured, pull, reportRows, xeroDate };
