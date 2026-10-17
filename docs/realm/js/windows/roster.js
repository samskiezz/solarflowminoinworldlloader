/** Shift roster: three shifts around the clock, who is on now and what they are doing, the study tasks and work cycles, and the crew's own purse. */
import { h, button, badge, select, empty } from '../core/ui.js';
import { SHIFTS, WORK_CYCLES, STUDY_TASKS, SHOP, rosterBoard, economySummary, ensureShift } from '../sim/shifts.js';
import { section, row, grid, statCard, avatar } from './_shared.js';
import { makeTestCtx, openWindow, q, qa, fire } from './_testing.js';

const STATUS_KIND = { working: 'accent', break: 'warn', ready: 'ok', off: 'neutral' };

function renderBoard(body, ctx) {
    const b = rosterBoard(ctx.world);
    body.append(grid(4, statCard('Town clock', `${String(b.hour).padStart(2, '0')}:00`, `${SHIFTS.find((s) => s.id === b.current)?.label || '–'} shift is on`), statCard('On duty', b.onDuty, null, 'var(--accent)'), statCard('On a break', b.onBreak, null, 'var(--warn)'), statCard('Off shift', b.offShift)));
    for (const sh of b.shifts) {
        const range = `${String(sh.start).padStart(2, '0')}:00–${String(sh.end).padStart(2, '0')}:00`;
        body.append(section(null, h('div', { class: `shift-head ${sh.onNow ? 'on' : ''}` }, h('h3', { class: 'panel-title' }, `${sh.icon} ${sh.label} shift `, h('span', { class: 'muted small' }, range)), sh.onNow ? badge('ON NOW', 'ok') : badge('off', 'neutral'), h('span', { class: 'muted small' }, `${sh.members.length} crew`)),
            sh.members.length ? h('table', { class: 'data-table shift-table' }, h('thead', {}, h('tr', {}, h('th', {}, 'Minion'), h('th', {}, 'Status'), h('th', {}, 'Doing'), h('th', {}, 'Hours'), h('th', {}, 'Cycle'), h('th', {}, 'Purse'), h('th', {}, 'Move to'))), h('tbody', {}, sh.members.map((m) => h('tr', { class: 'shift-member', dataset: { agent: m.agent.id } }, h('td', {}, avatar(m.agent, 'sm'), ' ', m.agent.name, h('div', { class: 'muted small' }, m.agent.meta?.title || m.agent.role)), h('td', {}, badge(m.status, STATUS_KIND[m.status] || 'neutral')), h('td', { class: 'small' }, m.doing), h('td', {}, String(m.hoursWorked)), h('td', { class: 'small' }, WORK_CYCLES[m.cycle]?.label || m.cycle), h('td', { class: 'gold' }, String(m.credits)), h('td', {}, select(SHIFTS.map((s) => ({ value: s.id, label: s.label })), { value: sh.id, onchange: (v) => { const s = ensureShift(m.agent); s.id = v; s.status = 'off'; s.hoursWorked = 0; s.task = null; s.taskProgressH = 0; ctx.saveWorld(); ctx.refresh('roster'); } })))))) : h('div', { class: 'empty inline' }, 'Nobody on this shift – move someone here.')));
    }
    body.append(h('p', { class: 'muted small' }, 'Job tasks always come first. Between them, a minion on shift studies spec sheets, manuals and standards for credits and XP, and takes breaks on their work cycle.'));
}

function renderStudy(body, ctx) {
    body.append(section('Study tasks', h('table', { class: 'data-table study-table' }, h('thead', {}, h('tr', {}, h('th', {}, 'Task'), h('th', {}, 'Credits'), h('th', {}, 'Difficulty'), h('th', {}, 'Hours'), h('th', {}, 'Skill'), h('th', {}, 'Domain'))), h('tbody', {}, STUDY_TASKS.map((t) => h('tr', {}, h('td', {}, t.label), h('td', { class: 'gold' }, String(t.credits)), h('td', {}, badge(t.difficulty, t.difficulty === 'hard' ? 'bad' : t.difficulty === 'medium' ? 'warn' : 'ok')), h('td', {}, String(t.hours)), h('td', { class: 'small' }, t.skill.replace(/_/g, ' ')), h('td', { class: 'small muted' }, t.domain))))), h('p', { class: 'muted small' }, 'Easy tasks fall away as a minion\'s average skill level passes 8; hard ones need level 3. Credits scale with conscientiousness and any learning module bought.')));
    body.append(section('Work cycles', grid(3, ...Object.entries(WORK_CYCLES).map(([k, c]) => statCard(c.label, `${c.work} h on`, `${c.break} h break`)))));
    const crew = ctx.world.crew();
    body.append(section('Goals', crew.length ? h('table', { class: 'data-table goals-table' }, h('thead', {}, h('tr', {}, h('th', {}, 'Minion'), h('th', {}, 'This week'), h('th', {}, 'Long term'), h('th', {}, 'Done'))), h('tbody', {}, crew.map((a) => { const s = ensureShift(a); return h('tr', {}, h('td', {}, a.name), h('td', { class: 'small' }, s.goals.short), h('td', { class: 'small' }, s.goals.long), h('td', {}, String(s.tasksDone))); }))) : empty('No crew yet.')));
}

function renderEconomy(body, ctx) {
    const e = economySummary(ctx.world);
    body.append(grid(5, statCard('In purses', e.credits, null, 'var(--gold)'), statCard('Earned', e.earned), statCard('Spent', e.spent), statCard('Tasks done', e.tasksDone), statCard('Savings goals met', e.goalsMet)));
    body.append(section('Richest minions', e.richest.length ? h('table', { class: 'data-table richest-table' }, h('thead', {}, h('tr', {}, h('th', {}, 'Minion'), h('th', {}, 'Purse'), h('th', {}, 'Tasks'))), h('tbody', {}, e.richest.map((r) => h('tr', {}, h('td', {}, r.name), h('td', { class: 'gold' }, String(r.credits)), h('td', {}, String(r.tasksDone)))))) : empty('No crew yet.')));
    body.append(section('The shop', h('table', { class: 'data-table' }, h('thead', {}, h('tr', {}, h('th', {}, 'Item'), h('th', {}, 'Cost'), h('th', {}, 'Benefit'))), h('tbody', {}, SHOP.map((p) => h('tr', {}, h('td', {}, p.item), h('td', { class: 'gold' }, String(p.cost)), h('td', { class: 'small muted' }, { learning: '+10 % study credits and XP', energy: '+20 energy', expertise: '+25 XP in a skill', collaboration: '+15 social', consciousness: '+15 mastery, +5 focus' }[p.benefit])))))));
    body.append(section('Recent purchases', e.purchases.length ? h('ul', { class: 'feed purchases' }, e.purchases.slice(0, 30).map((p) => h('li', { class: 'feed-item' }, h('span', { class: 'feed-icon' }, '🛒'), h('span', {}, `${p.name} bought ${p.item.toLowerCase()} for ${p.cost} credits`), h('span', { class: 'muted small' }, new Date(p.at).toISOString().slice(0, 16).replace('T', ' '))))) : empty('Nothing bought yet – purses fill as the crew study on shift.')));
    body.append(row(button('Run the next shift (8 h)', () => { for (let i = 0; i < 16; i++) ctx.world.tick(0.5); ctx.saveWorld(); ctx.refresh(); ctx.bus.emit('clock:tick', { clock: ctx.world.clock }); }, { small: true })));
}

export function def(ctx) {
    return {
        id: 'roster', title: 'Shift roster', icon: '🕐', hotkey: null, width: 920, height: 640,
        tabs: [{ id: 'board', label: 'Board', icon: '🕐' }, { id: 'study', label: 'Study', icon: '📚' }, { id: 'economy', label: 'Economy', icon: '💰' }],
        render(body, { tab }) {
            if (tab === 'study') return renderStudy(body, ctx);
            if (tab === 'economy') return renderEconomy(body, ctx);
            return renderBoard(body, ctx);
        }
    };
}

export const FEATURES = [
    { id: 'win.roster.board', title: 'The board lists all three shifts with every crew member and marks the one on now', dom: true, test: () => { const t = makeTestCtx(); t.ctx.world.tick(1); const b = openWindow(t.ctx, def(t.ctx)); const ok = qa(b, '.shift-head').length === 3 && qa(b, '.shift-member').length === 6 && /ON NOW/.test(b.textContent) && /Morning shift/.test(b.textContent); t.done(); return ok; } },
    { id: 'win.roster.move', title: 'A minion can be moved to another shift and the change persists in the world', dom: true, test: () => { const t = makeTestCtx(); t.ctx.world.tick(1); let b = openWindow(t.ctx, def(t.ctx)); const first = q(b, '.shift-member'); const id = first.dataset.agent; const sel = q(first, 'select'); const target = [...sel.options].map((o) => o.value).find((v) => v !== sel.value); sel.value = target; fire(sel, 'change'); b = t.ctx.wm.windows.get('roster').body; const agent = t.ctx.world.agent(id); const ok = Boolean(agent) && agent.meta.shift.id === target && t.ctx.store.get('world').agents.find((a) => a.id === agent.id).meta.shift.id === target && qa(b, '.shift-member').length === 6; t.done(); return ok; } },
    { id: 'win.roster.study', title: 'Study tab tables the seven tasks, three cycles and every minion\'s goals', dom: true, test: () => { const t = makeTestCtx(); const b = openWindow(t.ctx, def(t.ctx), { tab: 'study' }); const ok = qa(b, '.study-table tbody tr').length === 7 && qa(b, '.goals-table tbody tr').length === 6 && /Standard/.test(b.textContent) && /Intensive/.test(b.textContent); t.done(); return ok; } },
    { id: 'win.roster.economy', title: 'Economy tab shows purses, the shop, purchases and can run the next shift', dom: true, test: () => { const t = makeTestCtx(); for (let i = 0; i < 24; i++) t.ctx.world.tick(1); let b = openWindow(t.ctx, def(t.ctx), { tab: 'economy' }); const rows = qa(b, '.richest-table tbody tr').length; const before = t.ctx.world.hour; qa(b, 'button').find((x) => /Run the next shift/.test(x.textContent)).click(); b = t.ctx.wm.windows.get('roster').body; const ok = rows >= 1 && rows <= 5 && t.ctx.world.hour === before + 8 && /The shop/.test(b.textContent) && economySummary(t.ctx.world).earned > 0; t.done(); return ok; } }
];
