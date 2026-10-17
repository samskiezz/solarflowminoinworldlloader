/** Market: spend credits on crew upgrades; inspect the ledger and how credits are earned. */
import { h, button, badge, dataTable, toast, empty } from '../core/ui.js';
import { UPGRADES, REWARDS, spend, summary, effects } from '../sim/economy.js';
import { section, grid, row, statCard } from './_shared.js';
import { makeTestCtx, openWindow, q, qa } from './_testing.js';

export function def(ctx) {
    return {
        id: 'market', title: ctx.t('nav.market'), icon: '🛒', hotkey: 'U', width: 820, height: 580,
        tabs: [{ id: 'shop', label: 'Upgrades', icon: '🛒' }, { id: 'ledger', label: 'Ledger', icon: '📒' }, { id: 'earning', label: 'How to earn', icon: '💡' }],
        render(body, { tab }) {
            if (tab === 'ledger') return renderLedger(body, ctx);
            if (tab === 'earning') return renderEarning(body, ctx);
            return renderShop(body, ctx);
        }
    };
}

function renderShop(body, ctx) {
    const ledger = ctx.world.ledger; const fx = effects(ledger);
    body.append(grid(3, statCard('Credits', ledger.balance, null, 'var(--gold)'), statCard('Owned upgrades', ledger.owned.length), statCard('Active effects', Object.keys(fx).length)),
        h('div', { class: 'shop-grid' }, UPGRADES.map((u) => { const owned = ledger.owned.includes(u.id); const affordable = ledger.balance >= u.cost; return h('div', { class: `card shop-item ${owned ? 'owned' : ''}` }, h('div', { class: 'card-title' }, u.name, ' ', owned ? badge('Owned', 'ok') : badge(`${u.cost} cr`, affordable ? 'accent' : 'neutral')), h('div', { class: 'card-sub' }, u.description), h('div', { class: 'muted small' }, Object.entries(u.effect).map(([k, v]) => `${k} +${Math.round(v * 100)} %`).join(', ')), owned ? null : button('Buy', () => { const r = spend(ledger, u.id, { at: ctx.world.time }); if (r.ok) { ctx.world.stats.upgradesOwned = ledger.owned.length; ctx.world.checkAchievements(); ctx.notify('purchase', `Bought ${u.name}`); toast(`${u.name} purchased`, { kind: 'ok' }); } else toast(r.reason, { kind: 'warn' }); ctx.saveWorld(); ctx.refresh('market'); }, { kind: 'primary', small: true, disabled: !affordable })); })),
        Object.keys(fx).length ? section('Active effects', h('ul', { class: 'notes' }, Object.entries(fx).map(([k, v]) => h('li', {}, `${k}: +${Math.round(v * 100)} %`)))) : null);
}

function renderLedger(body, ctx) {
    const s = summary(ctx.world.ledger);
    const rows = [...ctx.world.ledger.entries].reverse().map((e) => ({ ...e, when: new Date(e.at).toISOString().slice(0, 16).replace('T', ' ') }));
    body.append(grid(3, statCard('Earned', s.earned), statCard('Spent', s.spent), statCard('Balance', s.balance, null, 'var(--gold)')),
        section('Entries', rows.length ? dataTable({ columns: [{ key: 'when', label: 'When' }, { key: 'type', label: 'Type' }, { key: 'amount', label: 'Amount', align: 'right' }, { key: 'balance', label: 'Balance', align: 'right' }, { key: 'ref', label: 'Ref' }, { key: 'agentId', label: 'Crew' }], rows, pageSize: 15 }).el : empty('No entries')),
        section('By type', h('ul', { class: 'notes' }, Object.entries(s.byType).map(([k, v]) => h('li', {}, `${k}: ${v > 0 ? '+' : ''}${v}`)))));
}

function renderEarning(body, ctx) {
    body.append(section('Credits are earned only from verified work', h('table', { class: 'data-table' }, h('thead', {}, h('tr', {}, h('th', {}, 'Action'), h('th', {}, 'Credits'))), h('tbody', {}, Object.entries(REWARDS).map(([k, v]) => h('tr', {}, h('td', {}, k.replace(/_/g, ' ')), h('td', {}, String(v)))))), h('p', { class: 'muted' }, 'Quest turn-ins (stage advances) also pay the quest reward. Hiring costs 150 credits.')));
}

export const FEATURES = [
    { id: 'win.market.shop', title: 'Upgrade shop with affordability', dom: true, test: () => { const t = makeTestCtx(); const b = openWindow(t.ctx, def(t.ctx)); const ok = qa(b, '.shop-item').length === 6 && qa(b, '.shop-item button:disabled').length >= 4; t.done(); return ok; } },
    { id: 'win.market.buy', title: 'Buying deducts credits and activates effects', dom: true, test: () => { const t = makeTestCtx(); t.ctx.world.ledger.balance = 100; let b = openWindow(t.ctx, def(t.ctx)); qa(b, '.shop-item').find((x) => /Crew coffee machine/.test(x.textContent)).querySelector('button').click(); const ok = t.ctx.world.ledger.owned.includes('coffee_machine') && t.ctx.world.ledger.balance === 40; b = t.ctx.wm.windows.get('market').body; const shown = /energyRecovery/.test(b.textContent); t.done(); return ok && shown; } },
    { id: 'win.market.ledger', title: 'Ledger table and totals', dom: true, test: () => { const t = makeTestCtx(); const b = openWindow(t.ctx, def(t.ctx), { tab: 'ledger' }); const ok = qa(b, 'tbody tr').length >= 1 && /Balance/.test(b.textContent); t.done(); return ok; } },
    { id: 'win.market.earning', title: 'Earning guide', dom: true, test: () => { const t = makeTestCtx(); const b = openWindow(t.ctx, def(t.ctx), { tab: 'earning' }); const ok = qa(b, 'tbody tr').length === Object.keys(REWARDS).length; t.done(); return ok; } }
];
