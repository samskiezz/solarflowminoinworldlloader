/**
 * Credit economy: credits are earned only from verified work and spent on
 * crew upgrades. The ledger is append-only.
 */

export const REWARDS = {
    task_complete: 5,
    checklist_pass: 20,
    commissioning_pass: 30,
    stage_advance: 10,
    stc_claim_ready: 40,
    defect_found: 8,
    study: 2,
    mentoring: 4
};

export const UPGRADES = [
    { id: 'thermal_camera', name: 'Thermal camera', cost: 120, effect: { inspectBonus: 0.15 }, description: 'Inspections find hot joints: +15 % defect detection.' },
    { id: 'iv_tracer', name: 'I-V curve tracer', cost: 200, effect: { commissionSpeed: 0.25 }, description: 'Commissioning 25 % faster with string-level diagnostics.' },
    { id: 'standards_library', name: 'Standards library subscription', cost: 150, effect: { xpBonus: 0.2 }, description: 'Full-text standards: +20 % XP from study.' },
    { id: 'coffee_machine', name: 'Crew coffee machine', cost: 60, effect: { energyRecovery: 0.2 }, description: 'Breaks restore 20 % more energy.' },
    { id: 'van_fitout', name: 'Van fit-out', cost: 300, effect: { installSpeed: 0.15 }, description: 'Installs 15 % faster.' },
    { id: 'drone', name: 'Roof survey drone', cost: 250, effect: { designSpeed: 0.3 }, description: 'Roof layouts 30 % faster, safer surveys.' }
];

export function createLedger(opening = 0) {
    return { balance: Math.max(0, Math.round(opening)), entries: opening ? [{ at: 0, type: 'opening', amount: Math.round(opening), balance: Math.round(opening) }] : [], owned: [] };
}

export function earn(ledger, type, { at = Date.now(), amount, ref = null, agentId = null } = {}) {
    const value = Math.round(amount ?? REWARDS[type] ?? 0);
    if (value <= 0) return ledger;
    ledger.balance += value;
    ledger.entries.push({ at, type, amount: value, balance: ledger.balance, ref, agentId });
    return ledger;
}

export function spend(ledger, upgradeId, { at = Date.now() } = {}) {
    const upgrade = UPGRADES.find((u) => u.id === upgradeId);
    if (!upgrade) return { ok: false, reason: 'Unknown upgrade' };
    if (ledger.owned.includes(upgradeId)) return { ok: false, reason: 'Already owned' };
    if (ledger.balance < upgrade.cost) return { ok: false, reason: `Need ${upgrade.cost - ledger.balance} more credits` };
    ledger.balance -= upgrade.cost;
    ledger.owned.push(upgradeId);
    ledger.entries.push({ at, type: 'purchase', amount: -upgrade.cost, balance: ledger.balance, ref: upgradeId });
    return { ok: true, upgrade };
}

/** Combined effect multipliers from owned upgrades. */
export function effects(ledger) {
    const total = {};
    for (const id of ledger.owned) {
        const upgrade = UPGRADES.find((u) => u.id === id);
        if (!upgrade) continue;
        for (const [k, v] of Object.entries(upgrade.effect)) total[k] = (total[k] || 0) + v;
    }
    return total;
}

export function summary(ledger, { since = 0 } = {}) {
    const entries = ledger.entries.filter((e) => e.at >= since);
    const earned = entries.filter((e) => e.amount > 0).reduce((s, e) => s + e.amount, 0);
    const spent = -entries.filter((e) => e.amount < 0).reduce((s, e) => s + e.amount, 0);
    const byType = {};
    for (const e of entries) byType[e.type] = (byType[e.type] || 0) + e.amount;
    return { balance: ledger.balance, earned, spent, byType, owned: [...ledger.owned] };
}

export const FEATURES = [
    { id: 'economy.rewards', title: 'Reward table and upgrade catalogue', test: () => Object.keys(REWARDS).length >= 8 && UPGRADES.length === 6 },
    { id: 'economy.earn', title: 'Earn credits (append-only ledger)', test: () => { const l = createLedger(); earn(l, 'checklist_pass', { at: 1 }); earn(l, 'bogus', { at: 2 }); return l.balance === 20 && l.entries.length === 1; } },
    { id: 'economy.spend', title: 'Spend on upgrades with validation', test: () => { const l = createLedger(100); const no = spend(l, 'drone'); earn(l, 'stc_claim_ready', { amount: 200 }); const yes = spend(l, 'drone'); const dup = spend(l, 'drone'); return !no.ok && yes.ok && !dup.ok && l.balance === 50; } },
    { id: 'economy.effects', title: 'Upgrade effect aggregation', test: () => { const l = createLedger(1000); spend(l, 'standards_library'); spend(l, 'coffee_machine'); const e = effects(l); return e.xpBonus === 0.2 && e.energyRecovery === 0.2; } },
    { id: 'economy.summary', title: 'Ledger summary', test: () => { const l = createLedger(); earn(l, 'task_complete', { at: 5 }); earn(l, 'task_complete', { amount: 100, at: 6 }); spend(l, 'coffee_machine'); const s = summary(l); return s.earned === 105 && s.spent === 60 && s.balance === 45; } }
];
