/**
 * People: ServiceM8 staff, contractors seen in the Xero expense accounts and
 * the weekly bank payments, with cost and on-site job counts, so the crew
 * can see who is doing the work and what each pair of hands costs.
 */
import { clean, titleCase } from './schema.js';

/** "Contractor Payment_JAC WILKINS" -> "Jac Wilkins" (any such account name). */
export function contractorFromAccount(accountName) {
    const m = String(accountName || '').match(/contractor\s*(?:payment|expense)?\s*[_\-:]\s*(.+)$/i);
    return m ? titleCase(m[1].replace(/\s*(pty\.?\s*ltd\.?|p\/l)\s*$/i, '').replace(/\s+/g, ' ')) : null;
}
const key = (n) => clean(n).toLowerCase().replace(/[^a-z ]/g, '').split(' ').filter(Boolean);
function sameName(a, b) { const ka = key(a), kb = key(b); if (!ka.length || !kb.length) return false; const inter = ka.filter((w) => kb.includes(w)); return inter.length >= Math.min(2, ka.length, kb.length) || (ka.length === 1 && kb[0] === ka[0]); }

export function importStaff({ staff = [], pnlExpenses = [], weeklyPayments = [], jobs = [] } = {}, { months = 12 } = {}) {
    const people = staff.map((s) => ({ id: s.id || s.uuid, name: clean(s.name), kind: 'staff', annualCost: 0, weeklyCost: null, jobsOnSite: 0, source: ['servicem8'] }));
    for (const [acct, amount] of pnlExpenses) {
        const name = contractorFromAccount(acct); if (!name) continue;
        let p = people.find((x) => sameName(x.name, name));
        if (!p) { p = { id: `contractor:${key(name).join('-')}`, name, kind: 'contractor', annualCost: 0, weeklyCost: null, jobsOnSite: 0, source: [] }; people.push(p); }
        p.annualCost += Number(amount) || 0; if (p.kind === 'staff') p.kind = 'staff+contractor'; if (!p.source.includes('xero')) p.source.push('xero');
    }
    for (const w of weeklyPayments) { const p = people.find((x) => sameName(x.name, w.name)); if (p) { p.weeklyCost = w.weekly || Math.round((w.total || 0) / (w.weeks || 1)); if (!p.source.includes('bank')) p.source.push('bank'); } }
    for (const j of jobs) for (const t of j.team || []) { const p = people.find((x) => key(x.name)[0] === key(t)[0]); if (p) p.jobsOnSite++; }
    for (const p of people) { p.annualCost = Math.round(p.annualCost); p.monthlyCost = Math.round(p.annualCost / months); p.costPerJob = p.jobsOnSite ? Math.round(p.annualCost / p.jobsOnSite) : null; }
    people.sort((a, b) => b.annualCost - a.annualCost);
    const totalLabour = people.reduce((s, p) => s + p.annualCost, 0);
    return { people, stats: { headcount: people.filter((p) => p.kind !== 'contractor').length, contractors: people.filter((p) => p.kind !== 'staff').length, totalLabour: Math.round(totalLabour), topShare: totalLabour ? Math.round((people[0]?.annualCost || 0) / totalLabour * 100) : 0, unattributed: people.filter((p) => p.annualCost > 20000 && p.jobsOnSite === 0).map((p) => p.name) } };
}

export const FEATURES = [
    { id: 'biz.staff.accounts', title: 'Contractor names parse out of Xero expense account names', test: () => contractorFromAccount('Contractor Payment_ SAM EXAMPLE') === 'Sam Example' && contractorFromAccount('contractor payment-W S Fictional') === 'W S Fictional' && contractorFromAccount('Contractor Payment_ Example Labour pty ltd') === 'Example Labour' && contractorFromAccount('Wages and Salaries') === null },
    { id: 'biz.staff.merge', title: 'Staff, contractor accounts, weekly bank payments and on-site mentions merge into one roster', test: () => { const r = importStaff({ staff: [{ uuid: 's1', name: 'Sam Example' }, { uuid: 's2', name: 'Pat Fictional' }], pnlExpenses: [['Contractor Payment_SAM EXAMPLE', 139512], ['Contractor Payment_Example Labour Co', 113641], ['Wages and Salaries', 300000]], weeklyPayments: [{ name: 'Example Labour Co', weekly: 2030.77 }], jobs: [{ team: ['Sam', 'Pat'] }, { team: ['Sam'] }] }); const sam = r.people.find((p) => p.name === 'Sam Example'); const lab = r.people.find((p) => /Labour/.test(p.name)); return sam.kind === 'staff+contractor' && sam.jobsOnSite === 2 && sam.costPerJob === 69756 && lab.kind === 'contractor' && lab.weeklyCost === 2030.77 && r.stats.contractors === 2 && r.stats.unattributed.includes('Example Labour Co'); } }
];
