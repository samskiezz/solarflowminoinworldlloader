/** Analytics: pipeline value, STC exposure, crew utilisation and quality trends. */
import { h, badge, barChart, sparkline, empty } from '../core/ui.js';
import { STAGES, jobsByStage } from '../domain/jobs.js';
import { solarStcs } from '../domain/incentives.js';
import { section, grid, statCard, money } from './_shared.js';
import { makeTestCtx, openWindow, q, qa } from './_testing.js';

export function pipelineValue(ctx) {
    let kw = 0; let stcs = 0; let stcValue = 0; let quoted = 0;
    for (const job of ctx.jobs().filter((j) => j.stage !== 'complete')) {
        const d = ctx.design(job.id);
        kw += d.arrayKwDc || job.systemKw;
        const r = solarStcs({ kw: d.arrayKwDc || job.systemKw, postcode: job.postcode, installYear: new Date(ctx.now()).getFullYear() });
        if (!r.error) { stcs += r.stcs; stcValue += r.valueAud; }
        quoted += d.proposalTotal || 0;
    }
    return { kw: Math.round(kw * 10) / 10, stcs, stcValue, quoted };
}
export function crewUtilisation(ctx) {
    return ctx.world.agents.map((a) => { const work = a.log.filter((l) => l.events.some((e) => e.type === 'work')).length; const total = a.log.length || 1; return { id: a.id, name: a.name, utilisationPct: Math.round((work / total) * 100), tasksDone: a.stats.tasksDone, reworks: a.stats.tasksFailed, quality: a.stats.tasksDone + a.stats.tasksFailed ? Math.round((a.stats.tasksDone / (a.stats.tasksDone + a.stats.tasksFailed)) * 100) : null }; });
}

export function def(ctx) {
    return {
        id: 'analytics', title: 'Analytics', icon: '📈', hotkey: null, width: 880, height: 600,
        render(body) {
            const pv = pipelineValue(ctx); const lanes = jobsByStage(ctx.jobs()); const util = crewUtilisation(ctx); const s = ctx.world.stats;
            body.append(grid(4, statCard('Pipeline kW', pv.kw), statCard('STCs in pipeline', pv.stcs, money(pv.stcValue)), statCard('Quoted value', money(pv.quoted)), statCard('Checklist pass streak', s.checklistStreak)),
                grid(2, section('Jobs by stage', barChart(STAGES.map((st) => ({ label: st.title.slice(0, 6), value: (lanes[st.id] || []).length })), { height: 100 })), section('Credits over time', ctx.world.ledger.entries.length > 1 ? sparkline(ctx.world.ledger.entries.slice(-40).map((e) => e.balance), { width: 380, height: 70 }) : empty('No ledger history yet'))),
                section('Crew utilisation and quality', util.length ? h('table', { class: 'data-table' }, h('thead', {}, h('tr', {}, h('th', {}, 'Crew'), h('th', {}, 'Utilisation'), h('th', {}, 'Tasks'), h('th', {}, 'Reworks'), h('th', {}, 'First-time quality'))), h('tbody', {}, util.map((u) => h('tr', {}, h('td', {}, u.name), h('td', {}, `${u.utilisationPct} %`), h('td', {}, String(u.tasksDone)), h('td', {}, String(u.reworks)), h('td', {}, u.quality === null ? '–' : badge(`${u.quality} %`, u.quality >= 80 ? 'ok' : u.quality >= 60 ? 'warn' : 'bad')))))) : empty('No crew')),
                section('Quality signals', h('ul', { class: 'notes' }, h('li', {}, `Checklists passed: ${s.checklistsPassed} · commissioning passed: ${s.commissioningPassed} · STC-ready jobs: ${s.stcReady}`), h('li', {}, `Clauses read: ${s.clausesViewed} · expert crew: ${s.expertAgents} · reflections: ${s.reflections}`))));
        }
    };
}

export const FEATURES = [
    { id: 'win.analytics.pipeline', title: 'Pipeline kW, STC exposure and quoted value', dom: true, test: () => { const t = makeTestCtx(); const pv = pipelineValue(t.ctx); t.done(); return pv.kw === 6.6 && pv.stcs > 0 && pv.stcValue > 0; } },
    { id: 'win.analytics.utilisation', title: 'Crew utilisation and first-time quality', dom: true, test: () => { const t = makeTestCtx(); const a = t.ctx.world.agent('ATLAS'); a.stats.tasksDone = 3; a.stats.tasksFailed = 1; a.log.push({ events: [{ type: 'work' }] }, { events: [{ type: 'action' }] }); const u = crewUtilisation(t.ctx).find((x) => x.id === 'ATLAS'); t.done(); return u.utilisationPct === 50 && u.quality === 75; } },
    { id: 'win.analytics.render', title: 'Analytics dashboard renders charts and tables', dom: true, test: () => { const t = makeTestCtx(); const b = openWindow(t.ctx, def(t.ctx)); const ok = qa(b, '.stat').length === 4 && qa(b, '.bar-col').length === 9 && qa(b, 'tbody tr').length === 3; t.done(); return ok; } }
];
