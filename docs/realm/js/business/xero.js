/**
 * Xero import: profit and loss, financial position, cash, aged receivables
 * and payables, invoices and bills, and the unreconciled bank queue. Accepts
 * the shapes the Xero accounting API / MCP connector return (strings for
 * money are fine) and the compact table form used by the snapshot files.
 */
import { parseInvoiceReference, parseAddress, money, daysBetween, clean } from './schema.js';

const num = (v) => { const n = Number(String(v ?? '').replace(/[^0-9.-]/g, '')); return Number.isFinite(n) ? n : 0; };

/** What a line item sells or buys, from its wording. */
export function lineKind(text = '') {
    const t = String(text);
    if (/\bbattery|\bbat\b|kwh|stack|powerwall|storage/i.test(t)) return 'battery';
    if (/ev\s*charger|\bev\b|wallbox|charge ?point/i.test(t)) return 'ev';
    if (/panel|\bpv\b|solar|inverter|\bkw\b|modules?/i.test(t)) return 'solar';
    if (/switchboard|sub ?main|meter|upgrade|rewire|circuit/i.test(t)) return 'electrical';
    if (/labour|install|commission|service|call ?out|inspection|travel/i.test(t)) return 'labour';
    if (/rebate|stc|discount|credit|deposit/i.test(t)) return 'adjustment';
    if (/rent|hire|truck|vehicle|fuel|toll/i.test(t)) return 'vehicle';
    if (/fee|subscription|software|insurance|interest/i.test(t)) return 'overhead';
    return 'other';
}
export function normaliseLine(raw) {
    const description = clean(raw.description || raw.name || '').slice(0, 400);
    const quantity = num(raw.quantity ?? 1) || 1; const unit = num(raw.unit_amount ?? raw.unitAmount ?? raw.rate ?? raw.unit); const amount = raw.line_amount != null || raw.lineAmount != null || raw.amount != null ? num(raw.line_amount ?? raw.lineAmount ?? raw.amount) : Math.round(unit * quantity * 100) / 100;
    return { description, quantity, unit: money(unit), amount: money(amount), account: raw.account_code || raw.accountCode || raw.account || null, item: raw.item_code || raw.itemCode || null, kind: lineKind(description) };
}

function rowsToObjects(table, columns) { if (!table) return []; if (Array.isArray(table.rows) && Array.isArray(table.columns)) return table.rows.map((r) => Object.fromEntries(table.columns.map((c, i) => [c, r[i]]))); return Array.isArray(table) ? table : (table.invoices || table.bills || table.rows || []); }

export function normaliseInvoice(raw) {
    const o = raw.invoice_number ? { number: raw.invoice_number, date: raw.invoice_date, due: raw.due_date, paidOn: raw.fully_paid_on_date, contact: raw.contact?.name || raw.contact, total: num(raw.amount_total), due_amount: num(raw.amount_due), status: raw.status, ref: raw.reference, id: raw.invoice_id, attachments: raw.has_attachments } : { ...raw, total: num(raw.total), due_amount: raw.due_amount != null ? num(raw.due_amount) : (raw.status === 'PAID' ? 0 : num(raw.total)) };
    const ref = parseInvoiceReference(o.ref);
    const lines = (raw.line_items || raw.lines || []).map(normaliseLine);
    const lineText = lines.map((l) => l.description).join(' ');
    const firstLine = String((raw.line_items || raw.lines || [])[0]?.description || '').split(/\n/).map((x) => x.trim()).find(Boolean) || '';
    const address = ref.address ? parseAddress(ref.address) : (firstLine ? parseAddress(extractFirstAddress(firstLine)) : null);
    return { id: o.id || o.number, number: o.number, date: o.date, due: o.due, paidOn: o.paidOn || null, contact: clean(o.contact), total: money(o.total), amountDue: money(o.due_amount), amountPaid: money(num(raw.amount_paid ?? (o.total - o.due_amount))), tax: money(num(raw.amount_tax ?? 0)), status: o.status || (o.paidOn ? 'PAID' : 'UNPAID'), ref: clean(o.ref), jobNumber: ref.jobNumber || extractJobFromText(lineText), address: address && address.key ? address : null, daysToPay: o.paidOn && o.date ? daysBetween(o.date, o.paidOn) : null, overdueDays: !o.paidOn && o.due && o.due_amount > 0 ? Math.max(0, daysBetween(o.due, new Date())) : 0, attachments: Boolean(o.attachments), lines, kinds: [...new Set(lines.map((l) => l.kind))], source: 'xero', url: o.id ? `https://go.xero.com/AccountsReceivable/View.aspx?InvoiceID=${o.id}` : null };
}
export function normaliseBill(raw) {
    const o = raw.bill_number !== undefined ? { number: raw.bill_number, date: raw.bill_date, due: raw.due_date, paidOn: raw.fully_paid_on_date, contact: raw.contact?.name || raw.contact, total: num(raw.amount_total), status: raw.status, id: raw.bill_id, attachments: raw.has_attachments } : { ...raw, total: num(raw.total) };
    const lines = (raw.line_items || raw.lines || []).map(normaliseLine);
    return { id: o.id || `${o.contact}:${o.number}`, number: clean(o.number), date: o.date, due: o.due, paidOn: o.paidOn || null, contact: clean(o.contact), total: money(o.total), amountDue: money(num(raw.amount_due ?? (o.paidOn ? 0 : o.total))), status: o.status || (o.paidOn ? 'PAID' : 'UNPAID'), attachments: Boolean(o.attachments), reimbursement: /reimburs/i.test(String(o.number)), lines, kinds: [...new Set(lines.map((l) => l.kind))], source: 'xero' };
}
function extractFirstAddress(text) { const m = String(text).match(/\d+[a-z]?(?:\/\d+)?\s+[A-Za-z][A-Za-z' ]+\s(?:st|street|rd|road|ave|avenue|dr|drive|ct|court|cl|close|pl|place|cres|crescent|way|lane|ln|pde|parade|blvd|boulevard|tce|terrace|hwy|highway|cct|circuit|gr|grove)\b[^\n,]*(?:,?\s*[A-Za-z ]+)?(?:,?\s*NSW|\s*VIC|\s*QLD|\s*ACT)?\s*\d{0,4}/i); return m ? m[0] : ''; }
function extractJobFromText(text) { const m = String(text).match(/SM8[-\s]*(\d{1,5})/i) || String(text).match(/\bjob\s*#?\s*(\d{3,5})\b/i); return m ? m[1] : null; }
export function normaliseUnreconciled(raw) {
    const o = raw.transaction_id ? { date: raw.date, amount: num(raw.bank_amount), contact: raw.contact?.name, type: raw.document_type, account: raw.line_account?.name || null, ref: raw.reference } : { ...raw, amount: num(raw.amount) };
    return { date: o.date, amount: money(o.amount), contact: clean(o.contact), type: o.type, account: o.account || null, ref: o.ref || null, direction: o.amount >= 0 ? 'in' : 'out' };
}

export function importXero({ summary = null, invoices = [], bills = [], unreconciled = [] } = {}, { now = new Date() } = {}) {
    const inv = invoices.flatMap((t) => rowsToObjects(t)).map(normaliseInvoice);
    const bl = bills.flatMap((t) => rowsToObjects(t)).map(normaliseBill);
    const un = unreconciled.flatMap((t) => (t.bank_accounts ? t.bank_accounts.flatMap((a) => a.transactions) : rowsToObjects(t))).map(normaliseUnreconciled);
    const pnl = summary?.pnl ? { ...summary.pnl, totalIncome: num(summary.pnl.totalIncome ?? summary.pnl.total_income), costOfSales: num(summary.pnl.costOfSales ?? summary.pnl.total_cost_of_sales), grossProfit: num(summary.pnl.grossProfit ?? summary.pnl.gross_profit), totalExpenses: num(summary.pnl.totalExpenses ?? summary.pnl.total_expenses), netProfit: num(summary.pnl.netProfit ?? summary.pnl.net_profit), income: (summary.pnl.income || []).map(([n, v]) => [n, num(v)]), expenses: (summary.pnl.expenses || []).map(([n, v]) => [n, num(v)]) } : null;
    const ar = summary?.agedReceivables ? { ...summary.agedReceivables, rows: (summary.agedReceivables.rows || []).map((r) => ({ ...r, total: num(r.total), overdueDays: r.due ? Math.max(0, daysBetween(r.due, now)) : 0, job: parseInvoiceReference(r.ref) })) } : null;
    const ap = summary?.agedPayables ? { ...summary.agedPayables, rows: (summary.agedPayables.rows || []).map((r) => ({ ...r, total: num(r.total), overdueDays: r.due ? Math.max(0, daysBetween(r.due, now)) : 0 })) } : null;
    const finance = { pnl, position: summary?.position || null, cash: summary?.cash || null, ar, ap, topCustomers: (summary?.topCustomers?.rows || []).map(([name, amount]) => ({ name, amount: num(amount) })), org: summary?.org || null };
    return { finance, invoices: inv, bills: bl, unreconciled: un, kpis: financeKpis({ finance, invoices: inv, bills: bl, unreconciled: un }, { now }) };
}

/** Headline ratios the overseers watch. */
export function financeKpis({ finance, invoices = [], bills = [], unreconciled = [] }, { now = new Date() } = {}) {
    const k = {};
    const p = finance.pnl;
    if (p) {
        const months = Math.max(1, Math.round((new Date(p.period?.end || now) - new Date(p.period?.start || now)) / (30.4 * 86400000)));
        k.months = months; k.revenue = p.totalIncome; k.grossMarginPct = p.totalIncome ? Math.round((p.grossProfit / p.totalIncome) * 1000) / 10 : null; k.netMarginPct = p.totalIncome ? Math.round((p.netProfit / p.totalIncome) * 1000) / 10 : null;
        k.monthlyRevenue = Math.round(p.totalIncome / months); k.monthlyExpenses = Math.round((p.totalExpenses + p.costOfSales) / months); k.monthlyNet = Math.round(p.netProfit / months);
        const contractors = p.expenses.filter(([n]) => /contractor|wages|salar|superannuation/i.test(n)).reduce((s, [, v]) => s + v, 0);
        k.labourSharePct = p.totalExpenses ? Math.round((contractors / p.totalExpenses) * 1000) / 10 : null; k.labourCost = Math.round(contractors);
        k.materialsCost = Math.round(p.costOfSales + p.expenses.filter(([n]) => /material/i.test(n)).reduce((s, [, v]) => s + v, 0));
        k.topExpenses = p.expenses.slice(0, 8);
        k.vehicleCost = Math.round(p.expenses.filter(([n]) => /truck|vehicle|car rental|fuel/i.test(n)).reduce((s, [, v]) => s + v, 0));
        k.financeFees = Math.round(p.expenses.filter(([n]) => /stripe|merchant|bank fee/i.test(n)).reduce((s, [, v]) => s + v, 0));
    }
    if (finance.cash) { k.cash = num(finance.cash.cashBalance); k.receivables = num(finance.cash.receivables); k.payables = num(finance.cash.payables); }
    if (finance.position) { k.workingCapital = num(finance.position.workingCapital); k.netEquity = num(finance.position.netEquity); k.currentLiabilities = num(finance.position.currentLiabilities); }
    if (k.monthlyExpenses && k.cash != null) k.runwayMonths = Math.round(((k.cash + (k.receivables || 0)) / k.monthlyExpenses) * 10) / 10;
    if (finance.ar) { k.overdueAr = num(finance.ar.overdueTotal ?? finance.ar.total); k.arCount = finance.ar.invoiceCount || finance.ar.rows.length; k.oldestArDays = Math.max(0, ...finance.ar.rows.map((r) => r.overdueDays)); }
    if (k.monthlyRevenue && k.receivables != null) k.dso = Math.round((k.receivables / (k.monthlyRevenue / 30.4)) * 10) / 10;
    const paid = invoices.filter((i) => i.daysToPay != null); if (paid.length) k.avgDaysToPay = Math.round(paid.reduce((s, i) => s + i.daysToPay, 0) / paid.length * 10) / 10;
    if (finance.topCustomers.length && k.revenue) { const top = finance.topCustomers[0]; k.topCustomerSharePct = Math.round((top.amount / k.revenue) * 1000) / 10; k.topCustomer = top.name; k.top3SharePct = Math.round((finance.topCustomers.slice(0, 3).reduce((s, c) => s + c.amount, 0) / k.revenue) * 1000) / 10; }
    k.invoicesInWindow = invoices.length; k.invoicedInWindow = Math.round(invoices.reduce((s, i) => s + i.total, 0)); k.avgInvoice = invoices.length ? Math.round(k.invoicedInWindow / invoices.length) : null;
    k.unreconciledCount = unreconciled.length; k.unreconciledOut = Math.round(unreconciled.filter((u) => u.amount < 0).reduce((s, u) => s + u.amount, 0)); k.unreconciledIn = Math.round(unreconciled.filter((u) => u.amount > 0).reduce((s, u) => s + u.amount, 0));
    k.billsInWindow = bills.length; k.reimbursements = bills.filter((b) => b.reimbursement).length; k.billedInWindow = Math.round(bills.reduce((s, b) => s + b.total, 0));
    k.outstandingAr = Math.round(invoices.filter((i) => i.status !== 'PAID' && i.status !== 'VOIDED').reduce((s, i) => s + i.amountDue, 0)); k.outstandingArCount = invoices.filter((i) => i.amountDue > 0).length; k.overdueInvoices = invoices.filter((i) => i.overdueDays > 0).length;
    k.outstandingAp = Math.round(bills.filter((b) => b.status !== 'PAID' && b.status !== 'VOIDED').reduce((s, b) => s + (b.amountDue || 0), 0));
    const mix = {}; for (const i of invoices) for (const l of i.lines || []) { const m = mix[l.kind] || (mix[l.kind] = { lines: 0, amount: 0 }); m.lines++; m.amount += l.amount; } for (const m of Object.values(mix)) m.amount = Math.round(m.amount); k.productMix = mix;
    const spend = {}; for (const b of bills) spend[b.contact] = Math.round((spend[b.contact] || 0) + b.total); k.supplierSpend = Object.entries(spend).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([name, total]) => ({ name, total }));
    const cust = {}; for (const i of invoices) cust[i.contact] = Math.round((cust[i.contact] || 0) + i.total); k.customerSpend = Object.entries(cust).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([name, total]) => ({ name, total }));
    const byMonth = {}; for (const i of invoices) if (i.date) { const m = i.date.slice(0, 7); byMonth[m] = Math.round((byMonth[m] || 0) + i.total); } for (const b of bills) if (b.date) { const m = b.date.slice(0, 7); byMonth[`${m}:bills`] = Math.round((byMonth[`${m}:bills`] || 0) + b.total); } k.invoicedByMonth = Object.fromEntries(Object.entries(byMonth).filter(([m]) => !m.endsWith(':bills')).sort()); k.billedByMonth = Object.fromEntries(Object.entries(byMonth).filter(([m]) => m.endsWith(':bills')).map(([m, v]) => [m.slice(0, 7), v]).sort());
    const byContact = {}; for (const u of unreconciled.filter((x) => x.amount < 0)) byContact[u.contact] = (byContact[u.contact] || 0) + u.amount; k.weeklyContractors = Object.entries(byContact).filter(([, v]) => v < -4000).map(([n, v]) => ({ name: n, total: Math.round(-v) })).sort((a, b) => b.total - a.total);
    return k;
}

const SUMMARY = { org: { name: 'Example Co' }, pnl: { period: { start: '2025-10-01', end: '2026-10-01' }, totalIncome: '1200000', costOfSales: '300000', grossProfit: '900000', totalExpenses: '1000000', netProfit: '-100000', income: [['Sales', '1200000']], expenses: [['Wages and Salaries', '300000'], ['Contractor Payment_A', '200000'], ['Electrical Materials', '150000'], ['Stripe Fees', '20000'], ['Truck Rental', '50000']] }, position: { cashBalance: 40000, workingCapital: -300000, netEquity: -100000, currentLiabilities: 400000 }, cash: { cashBalance: 40000, receivables: 90000, payables: 2000 }, agedReceivables: { total: 90000, overdueTotal: 90000, invoiceCount: 2, rows: [{ contact: 'A', due: '2026-10-09', number: 'INV-1', ref: 'SM8- 1253- 13 Example Ave Suburb, NSW 2065', total: 60000 }, { contact: 'B', due: '2026-06-24', number: 'INV-2', ref: 'SM8-829- 1 Old Rd Suburb NSW 2122', total: 30000 }] }, agedPayables: { total: 2000, rows: [{ contact: 'Storage', due: '2026-05-12', ref: '1', total: 2000 }] }, topCustomers: { rows: [['Partner A', 700000], ['Partner B', 300000], ['Partner C', 100000]] } };
export const FEATURES = [
    { id: 'biz.xero.invoice', title: 'Xero invoices normalise and link to the ServiceM8 job and site via the reference', test: () => { const i = normaliseInvoice({ invoice_id: 'x', invoice_number: 'INV-0534', reference: 'SM8- 1315- 2 Example Ave Greenwich, NSW 2065', status: 'PAID', contact: { name: 'C' }, amount_total: '20700.0', amount_due: '0.0', invoice_date: '2026-10-01', due_date: '2026-10-09', fully_paid_on_date: '2026-10-05' }); const t = normaliseInvoice({ number: 'INV-1', date: '2026-04-03', due: '2026-04-07', paidOn: '2026-04-08', contact: 'D', total: 8464.5, status: 'PAID', ref: '67 Demo Ave Erina' }); return i.jobNumber === '1315' && i.address.suburb === 'Greenwich' && i.daysToPay === 4 && i.total === 20700 && t.jobNumber === null && t.address.line1 === '67 Demo Ave' && t.daysToPay === 5; } },
    { id: 'biz.xero.kpis', title: 'Finance KPIs: margins, monthly run-rate, runway, DSO, labour share, customer concentration', test: () => { const r = importXero({ summary: SUMMARY, invoices: [[{ number: 'INV-1', date: '2026-04-01', paidOn: '2026-04-11', contact: 'A', total: 100, status: 'PAID', ref: '' }]], unreconciled: [{ rows: [['2026-07-06', -4207.5, 'Sub A', 'ACCPAYPAYMENT', null, '1'], ['2026-07-13', -4207.5, 'Sub A', 'ACCPAYPAYMENT', null, '2'], ['2026-07-21', 14500, 'Cust', 'ACCRECPAYMENT', null, 'INV']], columns: ['date', 'amount', 'contact', 'type', 'account', 'ref'] }] }, { now: new Date('2026-10-12') }); const k = r.kpis; return k.grossMarginPct === 75 && k.netMarginPct === -8.3 && k.monthlyRevenue === 100000 && k.runwayMonths === 1.2 && k.labourSharePct === 50 && k.topCustomerSharePct === 58.3 && k.oldestArDays === 110 && k.avgDaysToPay === 10 && k.weeklyContractors[0].total === 8415 && k.unreconciledIn === 14500 && r.finance.ar.rows[0].job.jobNumber === '1253'; } },
    { id: 'biz.xero.lines', title: 'Invoice and bill line items are kept and classified (battery, solar, ev, labour), feeding product mix and supplier spend', test: () => { const i = normaliseInvoice({ invoice_id: 'x', invoice_number: 'INV-9', reference: '', status: 'AUTHORISED', contact: { name: 'C' }, amount_total: '11000.0', amount_due: '11000.0', invoice_date: '2026-09-01', due_date: '2026-09-08', line_items: [{ description: '9 Example Ave Suburb NSW 2000\nGoodWe 8.3 kWh battery stack x 2', quantity: '1.0', unit_amount: '9000.0', line_amount: '9000.0', account_code: '200' }, { description: 'Installation labour', quantity: '2.0', unit_amount: '1000.0', line_amount: '2000.0' }] }); const r = importXero({ invoices: [{ invoices: [i] }], bills: [{ bills: [{ bill_id: 'b', bill_number: '1', bill_date: '2026-09-02', contact: { name: 'Wholesaler' }, amount_total: '500.0', status: 'PAID', line_items: [{ description: 'Trina 475W panels', quantity: '10', unit_amount: '50' }] }] }] }, { now: new Date('2026-10-11') }); return i.lines.length === 2 && i.lines[0].kind === 'battery' && i.lines[1].kind === 'labour' && i.address.suburb === 'Suburb' && i.overdueDays > 30 && r.kpis.productMix.battery.amount === 9000 && r.kpis.supplierSpend[0].name === 'Wholesaler' && r.bills[0].lines[0].kind === 'solar' && r.kpis.outstandingAr === 11000 && r.kpis.invoicedByMonth['2026-09'] === 11000; } },
    { id: 'biz.xero.bills', title: 'Bills normalise with reimbursement detection', test: () => { const b = normaliseBill({ bill_id: 'b', bill_number: 'Reimbursement 3', bill_date: '2026-07-06', due_date: '2026-07-06', fully_paid_on_date: '2026-07-06', contact: { name: 'N' }, amount_total: '202.47', status: 'PAID' }); const c = normaliseBill({ number: 'OSWS149842', date: '2026-07-10', contact: 'OSW', total: 12399.86, status: 'PAID' }); return b.reimbursement && b.total === 202.47 && !c.reimbursement && c.contact === 'OSW'; } },
    { id: 'biz.xero.unreconciled', title: 'Unreconciled bank entries normalise from the API shape and the table shape', test: () => { const a = normaliseUnreconciled({ transaction_id: 't', date: '2026-07-01', bank_amount: '-1754.5', contact: { name: 'OSW' }, document_type: 'ACCPAYPAYMENT', line_account: { name: 'Cost of Goods Sold' } }); const b = normaliseUnreconciled({ date: '2026-07-21', amount: 14500, contact: 'J', type: 'ACCRECPAYMENT' }); return a.direction === 'out' && a.account === 'Cost of Goods Sold' && b.direction === 'in' && b.amount === 14500; } }
];
