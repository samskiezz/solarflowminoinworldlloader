/** Ultron: the workforce hierarchy – Ultron, the chief of staff, the managers and their teams – the task board flowing research → execute → audit → review → sign-off, and the hand-off log. */
import { h, button, badge, progressBar, select, empty } from '../core/ui.js';
import { ULTRON, TEAMS } from '../sim/workforce.js';
import { section, row, grid, statCard } from './_shared.js';
import { makeTestCtx, openWindow, q, qa, fire } from './_testing.js';

const ROLE_ICON = { research: '🔍', execute: '🛠', audit: '🧾', review: '⚖', signoff: '👑' };
const KIND_KIND = { job: 'accent', finding: 'warn', study: 'neutral', audit: 'bad' };

function renderCommand(body, ctx) {
    const wf = ctx.world.workforce; const s = wf.summary(); const hier = wf.hierarchy(ctx.world.agents);
    body.append(grid(5, statCard('Leader', ULTRON.name, ULTRON.blurb), statCard('Workers', s.workers, `${s.busy} busy now`), statCard('Tasks in flight', s.tasks.active + s.tasks.queued, `${s.tasks.queued} queued`), statCard('Signed off', s.signoffs, `${s.handoffs} hand-offs`), statCard('Sent back by audit', s.tasks.rejected, null, s.tasks.rejected ? 'var(--warn)' : null)));
    const org = h('div', { class: 'org' },
        h('div', { class: 'org-node leader' }, h('strong', {}, '👑 ', ULTRON.name), h('div', { class: 'muted small' }, ULTRON.title)),
        h('div', { class: 'org-node chief' }, h('strong', {}, hier.chief.name), h('div', { class: 'muted small' }, hier.chief.title, ' · routes every task to its team and sits on the review board')),
        h('div', { class: 'org-teams' }, hier.teams.map((t) => h('div', { class: 'org-node team', style: { borderTopColor: t.colour } }, h('strong', {}, t.name), h('div', { class: 'small' }, t.manager ? `${t.manager.name} · ${t.manager.title}` : t.managerTitle), h('div', { class: 'muted small' }, `${t.headcount} workers · ${t.busy} busy · ${t.queued} queued · ${t.done} signed off`), progressBar(t.headcount ? Math.round((t.busy / t.headcount) * 100) : 0, { small: true, showValue: false, colour: t.colour })))));
    const note = h('p', { class: 'muted small' }, 'Every task is researched first, executed by its team, audited, reviewed by the board and signed off at the top. A failed audit sends it back to the executing team. Work sweeps in every six simulated hours from open jobs, business findings and the library.');
    const actions = row(button('Sweep for work now', () => { ctx.world.workforce.sweep(ctx.world, { findings: ctx.world.findings || [] }); ctx.saveWorld(); ctx.refresh('ultron'); }, { kind: 'primary', small: true }), button('Run the next shift (8 h)', () => { for (let i = 0; i < 16; i++) ctx.world.tick(0.5); ctx.saveWorld(); ctx.refresh(); ctx.bus.emit('clock:tick', { clock: ctx.world.clock }); }, { small: true }));
    body.append(section('Chain of command', org, note, actions));
}

function renderBoard(body, ctx) {
    const wf = ctx.world.workforce;
    const filter = select([{ value: '', label: 'Every team' }, ...TEAMS.map((t) => ({ value: t.id, label: t.name }))], { value: ctx.store.get('ui.ultronTeam', '') }); filter.classList.add('ultron-team-filter');
    filter.addEventListener('change', () => { ctx.store.set('ui.ultronTeam', filter.value); ctx.refresh('ultron'); });
    const tasks = wf.board(80).filter((t) => !filter.value || t.executeTeam === filter.value);
    body.append(section('Task board', row(filter, h('span', { class: 'muted small' }, `${wf.tasks.filter((t) => t.status !== 'done').length} open · ${wf.stats.done} done`)),
        tasks.length ? h('table', { class: 'data-table task-board' }, h('thead', {}, h('tr', {}, h('th', {}, 'Task'), h('th', {}, 'Kind'), h('th', {}, 'Team'), h('th', {}, 'Stage'), h('th', {}, 'With'), h('th', {}, 'Path'))), h('tbody', {}, tasks.map((t) => { const worker = t.worker && !t.worker.startsWith('MGR:') ? wf.workers.find((w) => w.id === t.worker) : null; const mgr = t.worker && t.worker.startsWith('MGR:') ? wf.managerFor(t.executeTeam, ctx.world.agents) : null; return h('tr', { class: 'task-row' }, h('td', {}, t.subject, t.reworks ? h('span', { class: 'muted small' }, ` · rework ×${t.reworks}`) : null), h('td', {}, badge(t.kind, KIND_KIND[t.kind] || 'neutral')), h('td', {}, wf.team(t.executeTeam)?.name || t.executeTeam), h('td', {}, `${ROLE_ICON[t.stage.role] || ''} ${t.stage.role} · ${t.teamName}`), h('td', { class: 'small' }, worker ? `${worker.name} (${worker.rank})` : mgr ? `${mgr.name} (manager)` : t.status === 'queued' ? 'waiting for a free worker' : '–'), h('td', { class: 'small muted' }, t.stages.map((st, i) => (i < t.stageIndex ? '●' : i === t.stageIndex ? '◉' : '○')).join(' '))); }))) : empty('Nothing on the board. Sweep for work, or let the clock run.')));
}

function renderTeams(body, ctx) {
    const wf = ctx.world.workforce; const hier = wf.hierarchy(ctx.world.agents);
    const teamSel = select(TEAMS.map((t) => ({ value: t.id, label: t.name })), { value: ctx.store.get('ui.ultronRoster', TEAMS[0].id) }); teamSel.classList.add('ultron-roster-team');
    teamSel.addEventListener('change', () => { ctx.store.set('ui.ultronRoster', teamSel.value); ctx.refresh('ultron'); });
    const team = hier.teams.find((t) => t.id === teamSel.value) || hier.teams[0];
    const workers = wf.workersOf(team.id).slice().sort((a, b) => b.done - a.done || b.skill - a.skill);
    body.append(section(`${team.name} – ${team.manager ? team.manager.name : team.managerTitle}`, row(teamSel, h('span', { class: 'muted small' }, `${workers.length} workers · ${workers.filter((w) => w.status === 'busy').length} busy · ${team.done} signed off`)),
        h('table', { class: 'data-table roster-table' }, h('thead', {}, h('tr', {}, h('th', {}, 'Worker'), h('th', {}, 'Rank'), h('th', {}, 'Skill'), h('th', {}, 'Status'), h('th', {}, 'Done'), h('th', {}, 'Sent back'))), h('tbody', {}, workers.slice(0, 60).map((w) => h('tr', { class: 'worker-row' }, h('td', {}, w.name, h('span', { class: 'muted small' }, ` ${w.id}`)), h('td', {}, badge(w.rank, w.rank === 'lead' ? 'accent' : w.rank === 'senior' ? 'ok' : 'neutral')), h('td', {}, progressBar(Math.round(w.skill * 100), { small: true })), h('td', {}, badge(w.status, w.status === 'busy' ? 'accent' : 'neutral')), h('td', {}, String(w.done)), h('td', {}, String(w.rejected)))))),
        workers.length > 60 ? h('p', { class: 'muted small' }, `…and ${workers.length - 60} more`) : null));
}

function renderLog(body, ctx) {
    const wf = ctx.world.workforce; const log = wf.log.slice().reverse();
    body.append(section('Hand-offs and sign-offs', log.length ? h('ul', { class: 'feed ultron-log' }, log.slice(0, 80).map((e) => h('li', { class: `feed-item ${e.kind}` }, h('span', { class: 'feed-icon' }, e.kind === 'signoff' ? '👑' : '↩'), h('span', {}, e.text), h('span', { class: 'muted small' }, new Date(e.at).toISOString().slice(0, 16).replace('T', ' '))))) : empty('No hand-offs yet.')));
}

export function def(ctx) {
    return {
        id: 'ultron', title: 'Ultron – Workforce', icon: '👑', hotkey: null, width: 980, height: 680,
        tabs: [{ id: 'command', label: 'Command', icon: '👑' }, { id: 'board', label: 'Task board', icon: '📋' }, { id: 'teams', label: 'Teams', icon: '👥' }, { id: 'log', label: 'Hand-offs', icon: '↩' }],
        render(body, { tab }) {
            if (tab === 'board') return renderBoard(body, ctx);
            if (tab === 'teams') return renderTeams(body, ctx);
            if (tab === 'log') return renderLog(body, ctx);
            return renderCommand(body, ctx);
        }
    };
}

export const FEATURES = [
    { id: 'win.ultron.command', title: 'Command tab: Ultron, the chief of staff, twelve teams with managers, headcount and load', dom: true, test: () => { const t = makeTestCtx(); const b = openWindow(t.ctx, def(t.ctx)); const ok = /Ultron/.test(b.textContent) && /Chief of Staff/.test(b.textContent) && qa(b, '.org-node.team').length === 12 && /Atlas/.test(b.textContent); t.done(); return ok; } },
    { id: 'win.ultron.sweep', title: 'Sweeping adds tasks from the open job and the board shows them with stage and team', dom: true, test: () => { const t = makeTestCtx(); let b = openWindow(t.ctx, def(t.ctx)); qa(b, 'button').find((x) => /Sweep for work/.test(x.textContent)).click(); b = openWindow(t.ctx, def(t.ctx), { tab: 'board' }); const ok = qa(b, '.task-row').length >= 1 && /research/.test(b.textContent) && t.ctx.world.workforce.tasks.length >= 1; t.done(); return ok; } },
    { id: 'win.ultron.teams', title: 'Teams tab lists a team\'s workers with rank, skill and status; the selector switches teams', dom: true, test: () => { const t = makeTestCtx(); let b = openWindow(t.ctx, def(t.ctx), { tab: 'teams' }); const first = qa(b, '.worker-row').length; const sel = q(b, '.ultron-roster-team'); sel.value = 'install'; fire(sel, 'change'); b = t.ctx.wm.windows.get('ultron').body; const ok = first >= 2 && /Install crews/.test(b.textContent) && qa(b, '.worker-row').length >= 2; t.done(); return ok; } },
    { id: 'win.ultron.log', title: 'The hand-off log shows sign-offs once the clock has run', dom: true, test: () => { const t = makeTestCtx(); for (let i = 0; i < 40; i++) t.ctx.world.tick(1); const b = openWindow(t.ctx, def(t.ctx), { tab: 'log' }); const ok = qa(b, '.ultron-log .feed-item').length >= 1 || /No hand-offs yet/.test(b.textContent); t.done(); return ok; } }
];
