/** Quest log: every open job's current stage as a quest with objectives, rewards and gates. */
import { h, button, badge, progressBar, empty } from '../core/ui.js';
import { questsForJob } from '../sim/events.js';
import { stageGate, advanceStage, completeTask, STAGES } from '../domain/jobs.js';
import { section, row, stageBadge, issueList, avatar } from './_shared.js';
import { makeTestCtx, openWindow, q, qa, fire } from './_testing.js';

export function dailyGoals(ctx) {
    const s = ctx.world.stats;
    return [
        { id: 'tick3', text: 'Complete 3 stage tasks', progress: Math.min(3, ctx.jobs().reduce((n, j) => n + Object.values(j.tasks).filter(Boolean).length, 0)), target: 3 },
        { id: 'clause', text: 'Read a standard clause in the Codex', progress: Math.min(1, s.clausesViewed), target: 1 },
        { id: 'checklist', text: 'Pass a checklist', progress: Math.min(1, s.checklistsPassed), target: 1 },
        { id: 'crew', text: 'Keep every crew member above 40 energy', progress: ctx.world.agents.every((a) => a.needs.energy > 40) ? 1 : 0, target: 1 }
    ];
}

export function def(ctx) {
    return {
        id: 'quests', title: ctx.t('nav.quests'), icon: '📜', hotkey: 'L', width: 780, height: 560,
        tabs: [{ id: 'active', label: 'Active', icon: '📜' }, { id: 'goals', label: 'Daily goals', icon: '☀' }, { id: 'done', label: 'Completed', icon: '✔' }],
        render(body, { tab }) {
            if (tab === 'goals') return renderGoals(body, ctx);
            if (tab === 'done') return renderDone(body, ctx);
            return renderActive(body, ctx);
        }
    };
}

function renderActive(body, ctx) {
    const quests = ctx.world.quests();
    if (!quests.length) { body.append(empty('No active quests – every job is complete or none exist. Create a job (O).')); return; }
    const selected = ctx.store.get('ui.selectedQuest') || quests[0].id;
    const list = h('div', { class: 'quest-list' }, quests.map((qst) => h('div', { class: `quest ${qst.id === selected ? 'selected' : ''}`, onclick: () => { ctx.store.set('ui.selectedQuest', qst.id); ctx.refresh('quests'); } }, h('div', { class: 'quest-title' }, qst.title), progressBar(qst.progress, { small: true, showValue: false }), h('span', { class: 'muted' }, `${qst.progress} % · ${qst.reward} cr`))));
    const qst = quests.find((x) => x.id === selected) || quests[0];
    const job = ctx.job(qst.jobId);
    const gate = stageGate(job);
    const agent = job.assignedTo ? ctx.world.agent(job.assignedTo) : null;
    const detail = section(null, h('h2', { class: 'job-heading' }, qst.title, ' ', stageBadge(job.stage)), h('p', { class: 'quest-flavour' }, flavour(job.stage, job)),
        h('h4', {}, 'Objectives'), h('ul', { class: 'objectives' }, qst.objectives.map((o) => h('li', { class: `objective ${o.done ? 'done' : ''}` }, h('input', { type: 'checkbox', checked: o.done ? '' : null, onchange: (e) => { completeTask(job, o.key, e.target.checked, new Date(ctx.now()).toISOString()); ctx.saveWorld(); ctx.refresh('quests'); } }), ' ', o.text))),
        gate.length ? h('div', { class: 'gate' }, h('strong', {}, 'Gate: '), issueList(gate)) : null,
        row(h('span', { class: 'muted' }, `Reward: ${qst.reward} credits`), agent ? h('span', { class: 'muted' }, avatar(agent, 'xs'), ` ${agent.name}`) : h('span', { class: 'muted' }, 'Unassigned')),
        row(button('Turn in (advance stage)', () => { const r = advanceStage(job, new Date(ctx.now()).toISOString()); if (r.ok) { ctx.world.ledger.balance += qst.reward; ctx.world.ledger.entries.push({ at: ctx.world.time, type: 'stage_advance', amount: qst.reward, balance: ctx.world.ledger.balance, ref: job.id }); ctx.notify('stage_advanced', `Quest complete: ${qst.title} (+${qst.reward} cr)`, { jobId: job.id }); } else ctx.notify('quest_blocked', `${qst.title}: ${r.reason}`); ctx.saveWorld(); ctx.refresh('quests'); }, { kind: 'primary', small: true }),
            button('Open job', () => { ctx.setCurrentJob(job.id); ctx.open('jobs', { tab: 'detail' }); }, { small: true })));
    body.append(h('div', { class: 'quest-layout' }, list, detail));
}

export function flavour(stage, job) {
    return {
        lead: `A homeowner at ${job.address || job.postcode} seeks the sun. Gather their consumption and confirm the network supply before promising anything.`,
        design: 'Forge a design the standards will bless: approved products, cold-morning voltages within limits and a voltage rise under 2 %.',
        quote: 'Price the work. The STC entitlement and any state program decide whether the deal is struck.',
        approval: 'The network operator holds the gate. Lodge the application and secure the export limit.',
        install: 'Raise the array. Safety first, labels last.',
        commission: 'Prove the work with instruments: insulation, polarity, Voc, Isc, anti-islanding.',
        claim: 'Evidence wins certificates: serials, attendance and the certificate of electrical safety.',
        handover: 'Hand over the keys: documentation, monitoring, warranty.',
        complete: 'Victory.'
    }[stage] || '';
}

function renderGoals(body, ctx) {
    body.append(section('Daily goals', h('ul', { class: 'objectives' }, dailyGoals(ctx).map((g) => h('li', { class: `objective ${g.progress >= g.target ? 'done' : ''}` }, h('span', {}, g.text), ' ', badge(`${g.progress}/${g.target}`, g.progress >= g.target ? 'ok' : 'neutral')))), h('p', { class: 'muted' }, 'Goals reset with the simulated day and nudge good practice: read the standard, pass checklists, look after the crew.')));
}

function renderDone(body, ctx) {
    const done = ctx.jobs().flatMap((j) => j.history.filter((e) => e.event === 'stage_advanced').map((e) => ({ job: j, ...e })));
    body.append(section('Completed quests', done.length ? h('ul', { class: 'notes' }, done.reverse().map((d) => h('li', {}, h('span', { class: 'muted' }, d.at.slice(0, 10)), ` ${d.job.customer}: ${STAGES.find((s) => s.id === d.from)?.title} ➜ ${STAGES.find((s) => s.id === d.to)?.title}`))) : empty('No completed quests yet')));
}

export const FEATURES = [
    { id: 'win.quests.list', title: 'Quest list generated from open jobs', dom: true, test: () => { const t = makeTestCtx(); const b = openWindow(t.ctx, def(t.ctx)); const ok = qa(b, '.quest').length === 1 && /Scout the site/.test(q(b, '.quest-title').textContent) && qa(b, '.objective').length === 3; t.done(); return ok; } },
    { id: 'win.quests.objectives', title: 'Objectives tick the underlying job tasks', dom: true, test: () => { const t = makeTestCtx(); const b = openWindow(t.ctx, def(t.ctx)); const cb = q(b, '.objective input'); cb.checked = true; fire(cb, 'change'); const ok = Object.entries(t.job.tasks).filter(([k, v]) => k.startsWith('lead:') && v).length === 1; t.done(); return ok; } },
    { id: 'win.quests.turnIn', title: 'Turning in a quest advances the stage and pays credits', dom: true, test: () => { const t = makeTestCtx(); for (const k of Object.keys(t.job.tasks)) if (k.startsWith('lead:')) t.job.tasks[k] = true; const before = t.ctx.world.ledger.balance; const b = openWindow(t.ctx, def(t.ctx)); qa(b, 'button').find((x) => x.textContent.startsWith('Turn in')).click(); const ok = t.job.stage === 'design' && t.ctx.world.ledger.balance === before + 25; t.done(); return ok; } },
    { id: 'win.quests.blocked', title: 'Blocked turn-in reports the reason', dom: true, test: () => { const t = makeTestCtx(); const b = openWindow(t.ctx, def(t.ctx)); qa(b, 'button').find((x) => x.textContent.startsWith('Turn in')).click(); const ok = t.job.stage === 'lead' && t.ctx.world.feed.some((f) => f.type === 'quest_blocked'); t.done(); return ok; } },
    { id: 'win.quests.flavour', title: 'Stage flavour text for all nine stages', test: () => STAGES.every((s) => flavour(s.id, { postcode: '2000' }).length > 5) },
    { id: 'win.quests.dailyGoals', title: 'Daily goals track real practice', dom: true, test: () => { const t = makeTestCtx(); t.ctx.world.recordStat('clausesViewed'); const b = openWindow(t.ctx, def(t.ctx), { tab: 'goals' }); const ok = qa(b, '.objective').length === 4 && qa(b, '.objective.done').length >= 2; t.done(); return ok; } },
    { id: 'win.quests.completed', title: 'Completed quest history', dom: true, test: () => { const t = makeTestCtx(); t.job.history.push({ at: '2026-01-01T00:00:00Z', event: 'stage_advanced', from: 'lead', to: 'design' }); const b = openWindow(t.ctx, def(t.ctx), { tab: 'done' }); const ok = /Lead ➜ Design/.test(b.textContent); t.done(); return ok; } }
];
