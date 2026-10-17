/**
 * Bank feed import (read-only): balances per account plus transactions,
 * categorised by payee, with recurring-payment, duplicate and cash-variance
 * checks against Xero. Payee categories are generic keyword rules plus the
 * names the model itself knows (staff, contractor expense accounts,
 * suppliers), so nothing company-specific is hard-coded here.
 */
import { money, daysBetween, clean } from './schema.js';

export const GENERIC_RULES = [
    ['vehicle', /truck|rental|fuel|petrol|diesel|toll|linkt|e-?toll|tyres?/i],
    ['subscription', /xero|google|microsoft|adobe|servicem8|opensolar|canva|zoom|apple\.com|amazon web|aws|hubspot|mailchimp|pandadoc|subscription|software/i],
    ['fees', /stripe|merchant|bank fee|account fee|interest|asic/i],
    ['insurance', /insurance|insure/i],
    ['wages', /payroll|wages|salary|superannuation|\bsuper\b/i],
    ['tax', /\bato\b|tax office|bas payment|payg/i],
    ['transfer', /transfer|\btfr\b|internal/i],
    ['waste', /waste|recycling|rubbish|skip bin/i],
    ['marketing', /facebook|meta platforms|google ads|advert|lead gen|agency/i],
    ['rent', /\brent\b|storage|lease/i],
    ['supplier', /solar|energy|electrical|wholesale|bunnings|labels|supplies|trade/i]
];

/** Build payee rules from what the model knows: staff names and contractor/supplier contacts. */
export function buildPayeeRules({ staff = [], contractors = [], suppliers = [] } = {}) {
    const esc = (s) => clean(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const rules = [];
    const names = [...staff.map((s) => s.name || s), ...contractors].map(esc).filter((n) => n.length > 2);
    if (names.length) rules.push(['contractor', new RegExp(names.join('|'), 'i')]);
    const sup = suppliers.map(esc).filter((n) => n.length > 2);
    if (sup.length) rules.push(['supplier', new RegExp(sup.join('|'), 'i')]);
    return [...rules, ...GENERIC_RULES];
}

export function categorise(description = '', amount = 0, rules = GENERIC_RULES) {
    if (amount > 0) return /stripe|payout|settlement/i.test(description) ? 'card-payout' : 'customer-payment';
    for (const [cat, re] of rules) if (re.test(description)) return cat;
    return 'other';
}
const payeeKey = (d) => clean(d).toLowerCase().replace(/payment:?\s*/i, '').replace(/[0-9#*-]+/g, '').replace(/\s+/g, ' ').trim().slice(0, 24);

export function normaliseTransaction(raw, rules = GENERIC_RULES) {
    const amount = money(raw.amount ?? raw.bank_amount ?? 0);
    const description = clean(raw.description || raw.merchant || raw.payee || raw.contact?.name || raw.contact || '');
    return { id: raw.id || raw.transaction_id || `${raw.date}:${description}:${amount}`, date: raw.date || raw.postedAt || raw.timestamp || null, amount, description, payee: payeeKey(description), category: categorise(description, amount, rules), accountId: raw.accountId || null, pending: Boolean(raw.pending) };
}

export function recurring(transactions) {
    const groups = new Map();
    for (const t of transactions.filter((x) => x.amount < 0)) { const k = `${t.payee}|${Math.round(-t.amount)}`; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(t); }
    const out = [];
    for (const [, list] of groups) { if (list.length < 3) continue; const dates = list.map((t) => new Date(t.date)).sort((a, b) => a - b); const gaps = dates.slice(1).map((d, i) => (d - dates[i]) / 86400000); const avg = gaps.reduce((s, g) => s + g, 0) / gaps.length; const cadence = avg <= 9 ? 'weekly' : avg <= 16 ? 'fortnightly' : avg <= 35 ? 'monthly' : 'irregular'; if (cadence === 'irregular') continue; out.push({ payee: list[0].description, amount: -list[0].amount, cadence, count: list.length, total: Math.round(list.reduce((s, t) => s - t.amount, 0)), annualised: Math.round(-list[0].amount * ({ weekly: 52, fortnightly: 26, monthly: 12 }[cadence])), category: list[0].category }); }
    return out.sort((a, b) => b.annualised - a.annualised);
}
export function duplicates(transactions) {
    const out = []; const sorted = [...transactions].filter((t) => t.amount < 0).sort((a, b) => new Date(a.date) - new Date(b.date));
    for (let i = 0; i < sorted.length; i++) for (let j = i + 1; j < sorted.length; j++) { const a = sorted[i], b = sorted[j]; const gap = daysBetween(a.date, b.date); if (gap > 2) break; if (a.payee === b.payee && a.amount === b.amount && a.id !== b.id && !/weekly|wages|payroll/i.test(a.description)) out.push({ a: a.id, b: b.id, payee: a.description, amount: -a.amount, dates: [a.date, b.date] }); }
    return out;
}

export function importBank({ banks = [], accounts = [], transactions = [] } = {}, { xeroCash = null, now = new Date(), rules = GENERIC_RULES } = {}) {
    const acc = accounts.map((a) => ({ id: a.id, bankId: a.bankId, name: a.name || a.accountName, type: a.type || a.accountType, balance: money(a.balance), available: money(a.available ?? a.availableBalance ?? a.balance), currency: a.currency || 'AUD', updated: a.updated || a.updatedAt || null }));
    const tx = transactions.flatMap((t) => t.transactions || t).map((t) => normaliseTransaction(t, rules)).filter((t) => t.date).sort((a, b) => new Date(b.date) - new Date(a.date));
    const total = acc.reduce((s, a) => s + a.balance, 0);
    const last30 = tx.filter((t) => daysBetween(t.date, now) <= 30); const out30 = -last30.filter((t) => t.amount < 0).reduce((s, t) => s + t.amount, 0); const in30 = last30.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
    const byCat = {}; for (const t of tx.filter((x) => x.amount < 0)) byCat[t.category] = Math.round((byCat[t.category] || 0) - t.amount);
    const consent = banks[0]?.consentExpires || banks[0]?.fiskilConsentExpiresAt || null;
    return { banks: banks.map((b) => ({ id: b.id, name: b.name, source: b.source || null, consentExpires: b.consentExpires || b.fiskilConsentExpiresAt || null })), accounts: acc, transactions: tx, stats: { totalBalance: money(total), accounts: acc.length, transactions: tx.length, in30: Math.round(in30), out30: Math.round(out30), net30: Math.round(in30 - out30), dailyBurn: Math.round(out30 / 30), daysOfCash: out30 ? Math.round(total / (out30 / 30)) : null, byCategory: byCat, recurring: recurring(tx), duplicates: duplicates(tx), xeroVariance: xeroCash != null ? money(total - xeroCash) : null, consentExpiresIn: consent ? daysBetween(now, consent) : null } };
}

const TX = (date, amount, description) => ({ date, amount, description });
export const FEATURES = [
    { id: 'biz.bank.categorise', title: 'Bank transactions categorise by payee with model-derived contractor and supplier rules', test: () => { const rules = buildPayeeRules({ staff: ['Pat Fictional'], contractors: ['Example Labour Co'], suppliers: ['Acme Wholesale'] }); return categorise('Payment: Pat Fictional', -2000, rules) === 'contractor' && categorise('ACME WHOLESALE', -1000, rules) === 'supplier' && categorise('Northern Truck Rentals', -1900, rules) === 'vehicle' && categorise('XERO AUSTRALIA', -70, rules) === 'subscription' && categorise('STRIPE PAYOUT', 5000) === 'card-payout' && categorise('J CUSTOMER', 14500) === 'customer-payment'; } },
    { id: 'biz.bank.recurring', title: 'Weekly fixed payments are detected and annualised; same-day repeats flagged as duplicates', test: () => { const tx = [TX('2026-07-06', -2030.77, 'Example Labour Co'), TX('2026-07-13', -2030.77, 'Example Labour Co'), TX('2026-07-20', -2030.77, 'Example Labour Co'), TX('2026-07-27', -2030.77, 'Example Labour Co'), TX('2026-08-01', -150, 'Hardware 1'), TX('2026-08-02', -150, 'Hardware 2')]; const r = importBank({ accounts: [{ id: 'a', name: 'Business', type: 'checking', balance: 12850.94 }], transactions: tx }, { xeroCash: 38235.94, now: new Date('2026-08-05') }); const rec = r.stats.recurring[0]; return rec.cadence === 'weekly' && rec.annualised === 105600 && r.stats.duplicates.length === 1 && r.stats.xeroVariance === -25385 && r.stats.out30 > 0; } },
    { id: 'biz.bank.balances', title: 'Account balances, 30-day flows and days of cash', test: () => { const r = importBank({ banks: [{ id: 'b', name: 'Bank', consentExpires: '2027-10-08T00:00:00Z' }], accounts: [{ id: 'a', accountName: 'Biz', accountType: 'checking', balance: 9000 }, { id: 'b', accountName: 'Sav', accountType: 'savings', balance: 1000 }], transactions: [TX('2026-10-01', -3000, 'Supplier X'), TX('2026-10-02', 5000, 'Customer Y')] }, { now: new Date('2026-10-11') }); return r.stats.totalBalance === 10000 && r.stats.net30 === 2000 && r.stats.daysOfCash === 100 && r.stats.consentExpiresIn > 300; } }
];
