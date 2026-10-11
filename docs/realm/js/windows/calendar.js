/** Calendar & schedule: real events, the weekly jobs meeting, clashes, and unscheduled sold work next to free days. */
import { h, button, badge, empty } from '../core/ui.js';
import { section, row, grid, statCard, money } from './_shared.js';
import { needsModel, link, fmtDate, makeBusinessCtx } from './_business.js';
import { openWindow, q, qa } from './_testing.js';

export function def(ctx) {
    return {
        id: 'calendar', title: 'Calendar & schedule', icon: '📅', hotkey: 'Shift+G', width: 940, height: 660,
        tabs: [{ id: 'upcoming', label: 'Upcoming', icon: '📅' }, { id: 'unscheduled', label: 'To schedule', icon: '🗓' }, { id: 'meetings', label: 'Meetings', icon: '🤝' }],
        render(body, { tab }) { if (needsModel(ctx, body)) return; ({ unscheduled: renderUnscheduled, meetings: renderMeetings }[tab] || renderUpcoming)(body, ctx); }
    };
}
function renderUpcoming(body, ctx) {
    const m = ctx.business.model; const now = new Date(ctx.now()); const s = m.stats.calendar;
    const upcoming = m.events.filter((e) => new Date(e.start) >= now).slice(0, 40); const byDay = {}; for (const e of upcoming) (byDay[fmtDate(e.start)] = byDay[fmtDate(e.start)] || []).push(e);
    body.append(section('Next two months', grid(4, statCard('Upcoming events', s.upcoming), statCard('Clashes', s.clashes, '', s.clashes ? 'var(--warn)' : null), statCard('External meetings', s.external), statCard('Next', s.nextEvent ? s.nextEvent.summary : '–', s.nextEvent ? `in ${s.nextEvent.inDays} d` : ''))));
    body.append(Object.keys(byDay).length ? h('div', { class: 'cal-days' }, Object.entries(byDay).map(([day, list]) => h('div', { class: 'cal-day' }, h('div', { class: 'cal-day-head' }, day, ' ', h('span', { class: 'muted small' }, new Date(day).toLocaleDateString('en-AU', { weekday: 'short' }))), list.map((e) => h('div', { class: `cal-event ${e.external ? 'external' : ''}` }, h('strong', {}, e.summary), h('span', { class: 'muted small' }, ` ${String(e.start).slice(11, 16)} · ${e.durationMin || 0} min${e.location ? ` · ${e.location}` : ''}`), e.meet ? link('Meet', e.meet) : null))))) : empty('No upcoming events in the model'));
}
function renderUnscheduled(body, ctx) {
    const m = ctx.business.model; const jobs = m.jobs.filter((j) => j.status === 'Work Order' && j.isSite && !j.isScheduled && j.kind !== 'test').sort((a, b) => (b.invoiceAmount || 0) - (a.invoiceAmount || 0));
    const total = jobs.reduce((s, j) => s + (j.invoiceAmount || 0), 0);
    body.append(section(`${jobs.length} work orders without a date · ${money(total)} sold`, h('p', { class: 'muted small' }, 'ServiceM8 says these are not scheduled. Sold work that is not booked is revenue that is not coming.'), jobs.length ? h('table', { class: 'data-table unscheduled' }, h('thead', {}, h('tr', {}, h('th', {}, '#'), h('th', {}, 'Customer'), h('th', {}, 'Suburb'), h('th', {}, 'Kind'), h('th', {}, 'Value'), h('th', {}, 'Last edit'), h('th', {}, ''))), h('tbody', {}, jobs.map((j) => h('tr', {}, h('td', {}, j.number), h('td', {}, j.customer || j.partner), h('td', {}, j.address.suburb || ''), h('td', {}, j.marker || j.kind), h('td', {}, j.invoiceAmount ? money(j.invoiceAmount) : ''), h('td', { class: 'muted small' }, j.editDate ? j.editDate.slice(0, 10) : ''), h('td', {}, link('ServiceM8', j.url), ' ', ctx.job(j.id) ? button('Job', () => { ctx.setCurrentJob(j.id); ctx.open('jobs', { tab: 'detail' }); }, { small: true }) : null))))) : empty('Everything sold is booked.')));
    body.append(section('Crew schedule in the realm', row(button('Open crew schedule', () => ctx.open('schedule'), { small: true }), h('span', { class: 'muted small' }, 'Assign the realm crew to these jobs; the game mirrors their progress on the house.'))));
}
function renderMeetings(body, ctx) {
    const s = ctx.business.model.stats.calendar; const f = s.funnel;
    body.append(section('Recurring meetings', s.series.length ? h('div', {}, s.series.map((x) => h('div', { class: 'card' }, h('div', { class: 'card-title' }, x.summary, ' ', badge(`${x.occurrences} occurrences`, 'neutral')), h('div', { class: 'muted small' }, `${x.accepted} of ${x.invited} accepted · ${x.unresponsive.length} never responded`), x.unresponsive.length ? h('div', { class: 'muted small' }, `No response: ${x.unresponsive.join(', ')}`) : null, row(x.meet ? link('Meet link', x.meet) : null, x.notesDoc ? link('Notes doc', x.notesDoc) : null)))) : empty('No recurring meetings')));
    if (f) body.append(section('Lead-farm numbers from the sales call notes', grid(4, statCard('Spend / week', money(f.spendPerWeek)), statCard('Leads / week', f.leadsPerWeek), statCard('Pickup → close', `${f.pickupPct} % → ${f.closePct} %`), statCard('Cost per sale', money(f.costPerSale || f.cpa))), row(button('Model the funnel', () => ctx.open('intel', { tab: 'funnel' }), { small: true }))));
}

export const FEATURES = [
    { id: 'win.calendar.upcoming', title: 'Upcoming tab groups real events by day with meet links and clash count', dom: true, test: () => { const t = makeBusinessCtx(); const b = openWindow(t.ctx, def(t.ctx)); const ok = qa(b, '.cal-day').length >= 1 && /Weekly Jobs Alignment/.test(b.textContent) && qa(b, '.stat').length === 4; t.done(); return ok; } },
    { id: 'win.calendar.unscheduled', title: 'To-schedule tab lists sold work orders without a booking, by value', dom: true, test: () => { const t = makeBusinessCtx(); const b = openWindow(t.ctx, def(t.ctx), { tab: 'unscheduled' }); const ok = qa(b, 'table.unscheduled tbody tr').length === 1 && /12,990/.test(b.textContent); t.done(); return ok; } },
    { id: 'win.calendar.meetings', title: 'Meetings tab shows attendance of the weekly jobs meeting and the lead-farm numbers', dom: true, test: () => { const t = makeBusinessCtx(); const b = openWindow(t.ctx, def(t.ctx), { tab: 'meetings' }); const ok = /never responded/.test(b.textContent) && /Spend \/ week/.test(b.textContent); t.done(); return ok; } }
];
