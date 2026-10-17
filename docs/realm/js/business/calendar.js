/**
 * Google Calendar import: events (recurring ones expanded from their
 * occurrence list), attendance of the weekly jobs meeting, clashes, and the
 * marketing funnel numbers that sales calls leave in event notes.
 */
import { clean, daysBetween } from './schema.js';

export function parseFunnelNotes(text) {
    const t = String(text || '').toLowerCase().replace(/\s+/g, ' ');
    const spend = t.match(/\$?\s*(\d+(?:\.\d+)?)\s*k?\s*(?:per|a|\/)\s*week/); const spendK = /(\d+(?:\.\d+)?)\s*k\s*(?:per|a|\/)\s*week/.test(t);
    const leads = t.match(/(\d+)\s*leads?\s*(?:per|a|\/)\s*week/); const pickup = t.match(/(\d+)\s*%\s*pick ?up/); const close = t.match(/(\d+)\s*%\s*close/); const cpa = t.match(/cpa\s*(?:around|about|of|~|:)?\s*\$?\s*(\d+)/);
    if (!spend && !leads && !pickup && !close && !cpa) return null;
    const f = { spendPerWeek: spend ? Number(spend[1]) * (spendK ? 1000 : 1) : null, leadsPerWeek: leads ? Number(leads[1]) : null, pickupPct: pickup ? Number(pickup[1]) : null, closePct: close ? Number(close[1]) : null, cpa: cpa ? Number(cpa[1]) : null };
    if (f.leadsPerWeek && f.pickupPct != null && f.closePct != null) { f.salesPerWeek = Math.round(f.leadsPerWeek * (f.pickupPct / 100) * (f.closePct / 100) * 10) / 10; if (f.spendPerWeek) f.costPerSale = Math.round(f.spendPerWeek / f.salesPerWeek); }
    if (f.spendPerWeek && f.leadsPerWeek) f.costPerLead = Math.round(f.spendPerWeek / f.leadsPerWeek);
    return f;
}

export function normaliseEvent(raw, companyRe = /projectsolar/i) {
    const start = raw.start?.dateTime || raw.start?.date || raw.start || null; const end = raw.end?.dateTime || raw.end?.date || raw.end || null;
    const attendees = (raw.attendees || []).map((a) => ({ email: (a.email || '').toLowerCase(), status: a.status || a.responseStatus || 'needsAction', organizer: Boolean(a.organizer) }));
    const organizer = (raw.organizer?.email || raw.organizer || '').toLowerCase() || null;
    const base = { id: raw.id, summary: clean(raw.summary || ''), description: clean(raw.description || ''), location: raw.location || null, organizer, external: Boolean(organizer && !companyRe.test(organizer)), attendees, meet: raw.meet || raw.conferenceUrl || null, notesDoc: raw.notesDoc || (raw.attachments || [])[0]?.fileUrl || null, url: raw.htmlLink || null, recurring: Boolean(raw.recurring || raw.recurringEventId), funnel: parseFunnelNotes(raw.description) };
    const occ = raw.occurrences && raw.occurrences.length ? raw.occurrences : null;
    if (!occ) return [{ ...base, start, end, durationMin: start && end ? Math.round((new Date(end) - new Date(start)) / 60000) : null }];
    const dur = start && end ? new Date(end) - new Date(start) : 3600000; const tz = String(start).match(/[+-]\d{2}:\d{2}$/)?.[0] || 'Z'; const time = String(start).match(/T(\d{2}:\d{2}:\d{2})/)?.[1] || '09:00:00';
    return occ.map((day) => { const s = `${day}T${time}${tz}`; return { ...base, id: `${raw.id}_${day}`, seriesId: raw.id, start: s, end: new Date(new Date(s).getTime() + dur).toISOString(), durationMin: Math.round(dur / 60000) }; });
}

export function importCalendar({ calendars = [], events = [] } = {}, { now = new Date() } = {}) {
    const list = events.flatMap((e) => normaliseEvent(e)).filter((e) => e.start).sort((a, b) => new Date(a.start) - new Date(b.start));
    const clashes = []; for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) { const a = list[i], b = list[j]; if (new Date(b.start) >= new Date(a.end)) break; if (a.seriesId && a.seriesId === b.seriesId) continue; clashes.push([a.id, b.id]); }
    const upcoming = list.filter((e) => new Date(e.start) >= now); const past = list.filter((e) => new Date(e.start) < now);
    const series = {}; for (const e of list) if (e.seriesId) { series[e.seriesId] = series[e.seriesId] || { id: e.seriesId, summary: e.summary, occurrences: 0, attendees: e.attendees, meet: e.meet, notesDoc: e.notesDoc }; series[e.seriesId].occurrences++; }
    const attendance = Object.values(series).map((s) => ({ ...s, invited: s.attendees.length, accepted: s.attendees.filter((a) => a.status === 'accepted').length, unresponsive: s.attendees.filter((a) => a.status === 'needsAction' && !a.organizer).map((a) => a.email) }));
    const funnel = list.map((e) => e.funnel).find(Boolean) || null;
    return { calendars, events: list, stats: { total: list.length, upcoming: upcoming.length, past: past.length, clashes: clashes.length, clashPairs: clashes, series: attendance, external: list.filter((e) => e.external).length, funnel, nextEvent: upcoming[0] ? { summary: upcoming[0].summary, start: upcoming[0].start, inDays: daysBetween(now, upcoming[0].start) } : null } };
}

export const FEATURES = [
    { id: 'biz.calendar.funnel', title: 'Marketing funnel numbers parse out of meeting notes (spend, leads, pickup, close, CPA)', test: () => { const f = parseFunnelNotes('Notes: Spending 6k per week for a lead farm. 70 leads per week 40% pickup rate. 28% close rate on pickups CPA around 600'); return f.spendPerWeek === 6000 && f.leadsPerWeek === 70 && f.pickupPct === 40 && f.closePct === 28 && f.cpa === 600 && f.salesPerWeek === 7.8 && f.costPerSale === 769 && f.costPerLead === 86 && parseFunnelNotes('hello') === null; } },
    { id: 'biz.calendar.recurring', title: 'Recurring meetings expand into occurrences and report who never responds', test: () => { const r = importCalendar({ events: [{ id: 'w', recurring: true, summary: 'Weekly Jobs Alignment', start: '2026-09-02T15:00:00+08:00', end: '2026-09-02T16:00:00+08:00', occurrences: ['2026-09-02', '2026-09-09', '2026-10-14'], attendees: [{ email: 'info@projectsolar.com.au', status: 'accepted', organizer: true }, { email: 'a@partner.example', status: 'needsAction' }, { email: 'b@partner.example', status: 'accepted' }] }] }, { now: new Date('2026-10-01T00:00:00Z') }); return r.events.length === 3 && r.stats.upcoming === 1 && r.stats.series[0].unresponsive[0] === 'a@partner.example' && r.stats.series[0].occurrences === 3 && r.events[0].durationMin === 60; } },
    { id: 'biz.calendar.clashes', title: 'Overlapping events are flagged as clashes', test: () => { const r = importCalendar({ events: [{ id: 'a', summary: 'A', start: '2026-10-01T09:00:00Z', end: '2026-10-01T10:00:00Z' }, { id: 'b', summary: 'B', start: '2026-10-01T09:30:00Z', end: '2026-10-01T10:30:00Z' }, { id: 'c', summary: 'C', start: '2026-10-01T11:00:00Z', end: '2026-10-01T12:00:00Z' }] }, { now: new Date('2026-09-01') }); return r.stats.clashes === 1 && r.stats.clashPairs[0][1] === 'b' && r.stats.nextEvent.summary === 'A'; } }
];
