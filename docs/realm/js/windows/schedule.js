/** Schedule: book install/commissioning dates per job, see crew load and weather conflicts on a week grid. */
import { h, button, badge, toast, empty } from '../core/ui.js';
import { section, row, grid, statCard, stageBadge } from './_shared.js';
import { makeTestCtx, openWindow, q, qa, fire } from './_testing.js';

export const BOOKING_TYPES = ['Site survey', 'Installation', 'Commissioning', 'Inspection', 'Handover'];
export function dayKey(date) { return new Date(date).toISOString().slice(0, 10); }
export function weekDays(fromIso) { const start = new Date(fromIso); const out = []; for (let i = 0; i < 7; i++) { const d = new Date(start); d.setUTCDate(start.getUTCDate() + i); out.push(dayKey(d)); } return out; }
export function conflicts(bookings) {
    const out = [];
    const byAgentDay = {};
    for (const b of bookings) { if (!b.agentId) continue; const k = `${b.agentId}:${b.date}`; (byAgentDay[k] = byAgentDay[k] || []).push(b); }
    for (const [k, list] of Object.entries(byAgentDay)) if (list.length > 1) out.push({ key: k, bookings: list, text: `${list[0].agentId} is double-booked on ${list[0].date}` });
    return out;
}

export function def(ctx) {
    return {
        id: 'schedule', title: 'Schedule', icon: '📅', hotkey: null, width: 900, height: 600,
        render(body) {
            const bookings = ctx.store.get('bookings', []);
            const save = (list) => ctx.store.set('bookings', list);
            const weekStart = ctx.store.get('ui.scheduleWeek') || dayKey(ctx.world.time);
            const days = weekDays(weekStart);
            const jobs = ctx.jobs();
            const typeSel = h('select', { class: 'input' }, BOOKING_TYPES.map((t) => h('option', { value: t }, t)));
            const jobSel = h('select', { class: 'input' }, jobs.map((j) => h('option', { value: j.id, selected: j.id === ctx.currentJobId() ? '' : null }, `${j.customer} (${j.id})`)));
            const agentSel = h('select', { class: 'input' }, h('option', { value: '' }, '— any crew —'), ctx.world.agents.map((a) => h('option', { value: a.id }, a.name)));
            const dateInput = h('input', { type: 'date', class: 'input', value: days[0] });
            const add = () => { if (!jobSel.value) { toast('Create a job first', { kind: 'warn' }); return; } const b = { id: `b${Date.now().toString(36)}`, jobId: jobSel.value, type: typeSel.value, agentId: agentSel.value || null, date: dateInput.value }; save([...bookings, b]); const job = ctx.job(b.jobId); if (job) { job.history.push({ at: new Date(ctx.now()).toISOString(), event: 'booked', task: `${b.type} ${b.date}` }); ctx.saveWorld(); } ctx.refresh('schedule'); };
            const cf = conflicts(bookings);
            body.append(section('New booking', row(jobSel, typeSel, agentSel, dateInput, button('Book', add, { kind: 'primary', small: true }))), grid(3, statCard('Bookings', bookings.length), statCard('This week', bookings.filter((b) => days.includes(b.date)).length), statCard('Conflicts', cf.length, null, cf.length ? 'var(--bad)' : 'var(--ok)')), cf.length ? h('ul', { class: 'issues' }, cf.map((c) => h('li', { class: 'issue' }, '⚠ ', c.text))) : null);
            const grid7 = h('div', { class: 'week-grid' }, days.map((day) => { const list = bookings.filter((b) => b.date === day); const weather = ctx.world.activeEvent && ctx.world.activeEvent.effects.installBlocked && day === dayKey(ctx.world.time); return h('div', { class: `day ${day === dayKey(ctx.world.time) ? 'today' : ''}` }, h('div', { class: 'day-head' }, new Date(day).toUTCString().slice(0, 3), ' ', day.slice(5)), weather ? badge('Storm – roof work blocked', 'warn') : null, list.map((b) => { const job = ctx.job(b.jobId); const agent = b.agentId ? ctx.world.agent(b.agentId) : null; return h('div', { class: `booking ${b.type.toLowerCase().replace(/\s/g, '-')}`, onclick: () => { if (job) { ctx.setCurrentJob(job.id); ctx.open('jobs', { tab: 'detail' }); } } }, h('div', { class: 'card-title' }, b.type), h('div', { class: 'card-sub' }, job ? job.customer : b.jobId, agent ? ` · ${agent.name}` : ''), h('button', { class: 'btn tiny', onclick: (e) => { e.stopPropagation(); save(bookings.filter((x) => x.id !== b.id)); ctx.refresh('schedule'); } }, '✕')); })); }));
            body.append(section(`Week of ${days[0]}`, row(button('‹ Previous week', () => { const d = new Date(days[0]); d.setUTCDate(d.getUTCDate() - 7); ctx.store.set('ui.scheduleWeek', dayKey(d)); ctx.refresh('schedule'); }, { small: true }), button('Today', () => { ctx.store.set('ui.scheduleWeek', dayKey(ctx.world.time)); ctx.refresh('schedule'); }, { small: true }), button('Next week ›', () => { const d = new Date(days[0]); d.setUTCDate(d.getUTCDate() + 7); ctx.store.set('ui.scheduleWeek', dayKey(d)); ctx.refresh('schedule'); }, { small: true })), grid7));
        }
    };
}

export const FEATURES = [
    { id: 'win.schedule.book', title: 'Book a crew visit against a job', dom: true, test: () => { const t = makeTestCtx(); const b = openWindow(t.ctx, def(t.ctx)); qa(b, 'select')[2].value = 'ATLAS'; qa(b, 'button').find((x) => x.textContent === 'Book').click(); const list = t.ctx.store.get('bookings'); const ok = list.length === 1 && list[0].agentId === 'ATLAS' && t.job.history.some((e) => e.event === 'booked'); t.done(); return ok; } },
    { id: 'win.schedule.week', title: 'Seven-day grid with today highlighted', dom: true, test: () => { const t = makeTestCtx(); const b = openWindow(t.ctx, def(t.ctx)); const ok = qa(b, '.week-grid .day').length === 7 && q(b, '.day.today') !== null; t.done(); return ok; } },
    { id: 'win.schedule.conflicts', title: 'Double-booked crew are flagged', dom: true, test: () => { const t = makeTestCtx(); const day = dayKey(t.ctx.world.time); t.ctx.store.set('bookings', [{ id: 'a', jobId: t.job.id, type: 'Installation', agentId: 'ATLAS', date: day }, { id: 'b', jobId: t.job.id, type: 'Inspection', agentId: 'ATLAS', date: day }]); const b = openWindow(t.ctx, def(t.ctx)); const ok = /double-booked/.test(b.textContent) && qa(b, '.booking').length === 2; t.done(); return ok; } },
    { id: 'win.schedule.weather', title: 'Storm events warn on roof work', dom: true, test: () => { const t = makeTestCtx(); t.ctx.world.activeEvent = { id: 'storm', label: 'Storm', effects: { installBlocked: true } }; const b = openWindow(t.ctx, def(t.ctx)); const ok = /roof work blocked/.test(b.textContent); t.done(); return ok; } },
    { id: 'win.schedule.navigate', title: 'Navigate weeks and remove bookings', dom: true, test: () => { const t = makeTestCtx(); const day = dayKey(t.ctx.world.time); t.ctx.store.set('bookings', [{ id: 'a', jobId: t.job.id, type: 'Installation', agentId: null, date: day }]); let b = openWindow(t.ctx, def(t.ctx)); q(b, '.booking .btn.tiny').click(); const removed = t.ctx.store.get('bookings').length === 0; b = t.ctx.wm.windows.get('schedule').body; qa(b, 'button').find((x) => x.textContent.startsWith('Next week')).click(); const ok = removed && t.ctx.store.get('ui.scheduleWeek') > day; t.done(); return ok; } },
    { id: 'win.schedule.helpers', title: 'Week and conflict helpers', test: () => weekDays('2026-01-05').length === 7 && weekDays('2026-01-05')[6] === '2026-01-11' && conflicts([{ agentId: 'A', date: 'd' }, { agentId: 'A', date: 'd' }]).length === 1 }
];
