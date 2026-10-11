/** Map: a stylised realm map of Australia – jobs by location, STC zones, city yields; plus a zone table. */
import { h, button, badge, richTooltip, empty, dataTable } from '../core/ui.js';
import { zoneForPostcode, stateFromPostcode, ZONE_RATINGS, POSTCODE_ZONES } from '../domain/incentives.js';
import { CITY_YIELD_KWH_PER_KW_DAY } from '../domain/yield.js';
import { jobProgress, STAGES } from '../domain/jobs.js';
import { section, row, stageBadge } from './_shared.js';
import { makeTestCtx, openWindow, q, qa } from './_testing.js';

export const COAST = [[113.5, -22], [114, -26], [115, -30], [115.5, -33.5], [117.5, -35], [121, -33.8], [124, -33], [126, -32.3], [129, -31.6], [132, -32], [134, -33], [135.5, -34.8], [137.5, -35.5], [139.5, -37], [141, -38.3], [143.5, -38.8], [145, -38.5], [146.5, -39], [148, -37.9], [150, -37.3], [150.5, -35], [151.3, -33.8], [153, -30], [153.5, -28], [153, -25], [152, -23.5], [150, -22], [148.5, -20], [146.5, -19], [145.5, -16], [145, -14], [143.5, -11], [142.5, -10.7], [141.5, -13], [141, -15.5], [140, -17.5], [138, -16.5], [136.5, -15.5], [136, -12.5], [134, -12], [132, -11.5], [130, -12.5], [129.5, -14.5], [128, -15], [126, -14], [124.5, -16], [122, -17.5], [120, -20], [117, -20.5], [114.5, -21.5]];
export const TASMANIA = [[144.6, -40.8], [148.3, -40.9], [148, -43.3], [146.5, -43.6], [145, -42.5]];
export const CITIES = { Sydney: [151.2, -33.9], Melbourne: [145.0, -37.8], Brisbane: [153.0, -27.5], Adelaide: [138.6, -34.9], Perth: [115.9, -32.0], Hobart: [147.3, -42.9], Darwin: [130.8, -12.5], Canberra: [149.1, -35.3], Cairns: [145.8, -16.9], Alice_Springs: [133.9, -23.7] };
const STATE_CAPITAL = { NSW: 'Sydney', VIC: 'Melbourne', QLD: 'Brisbane', SA: 'Adelaide', WA: 'Perth', TAS: 'Hobart', NT: 'Darwin', ACT: 'Canberra' };
export const ZONE_COLOURS = { 1: '#ff8c42', 2: '#ffd166', 3: '#8ecae6', 4: '#5c7cfa' };

export function project([lon, lat], scale = 20) { return [(lon - 112) * scale, (-10 - lat) * scale]; }
/** Deterministic approximate position for a postcode: state capital plus a hash-based offset (≤ 2°). */
export function postcodePosition(postcode) {
    const state = stateFromPostcode(postcode); const capital = STATE_CAPITAL[state];
    if (!capital) return null;
    const [lon, lat] = CITIES[capital]; let x = 0; for (const c of String(postcode)) x = (x * 31 + c.charCodeAt(0)) >>> 0;
    const dx = ((x % 400) / 100 - 2) * (state === 'WA' || state === 'QLD' || state === 'NT' ? 1.5 : 0.6); const dy = (((x >> 8) % 400) / 100 - 2) * 0.6;
    return { lon: lon + dx, lat: lat + dy, state };
}
function svgEl(tag, attrs = {}) { const el = document.createElementNS('http://www.w3.org/2000/svg', tag); for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v); return el; }

export function def(ctx) {
    return {
        id: 'map', title: ctx.t('nav.map'), icon: '🗺', hotkey: 'M', width: 900, height: 640,
        tabs: [{ id: 'realm', label: 'Realm map', icon: '🗺' }, { id: 'zones', label: 'STC zones', icon: '☀' }, { id: 'cities', label: 'City yields', icon: '📍' }],
        render(body, { tab }) {
            if (tab === 'zones') return renderZones(body, ctx);
            if (tab === 'cities') return renderCities(body, ctx);
            return renderRealm(body, ctx);
        }
    };
}

function renderRealm(body, ctx) {
    const svg = svgEl('svg', { viewBox: '0 0 840 700', class: 'realm-map', role: 'img', 'aria-label': 'Map of jobs across Australia' });
    const path = (pts) => `M${pts.map((p) => project(p).join(',')).join('L')}Z`;
    svg.append(svgEl('path', { d: path(COAST), class: 'land' }), svgEl('path', { d: path(TASMANIA), class: 'land' }));
    for (const [name, pos] of Object.entries(CITIES)) { const [x, y] = project(pos); const g = svgEl('g', { class: 'city' }); g.append(svgEl('circle', { cx: x, cy: y, r: 3 })); const t = svgEl('text', { x: x + 6, y: y + 4 }); t.textContent = name.replace('_', ' '); g.append(t); svg.append(g); }
    const stageFilter = ctx.store.get('ui.mapStage', '');
    const jobs = ctx.jobs().filter((j) => !stageFilter || j.stage === stageFilter); let plotted = 0;
    for (const job of jobs) {
        const pos = postcodePosition(job.postcode); if (!pos) continue;
        const [x, y] = project([pos.lon, pos.lat]); const zone = zoneForPostcode(job.postcode); const p = jobProgress(job);
        const g = svgEl('g', { class: `job-pin ${job.id === ctx.currentJobId() ? 'selected' : ''}`, tabindex: 0 });
        g.append(svgEl('circle', { cx: x, cy: y, r: 9, fill: ZONE_COLOURS[zone?.zone] || '#999' }));
        const t = svgEl('text', { x, y: y + 4, class: 'pin-label' }); t.textContent = String(p.stageIndex + 1); g.append(t);
        g.addEventListener('click', () => { ctx.setCurrentJob(job.id); ctx.open('jobs', { tab: 'detail' }); });
        g.__tooltip = richTooltip({ title: job.customer, subtitle: `${job.id} · ${job.postcode} ${pos.state}`, lines: [['System', `${job.systemKw} kW${job.batteryKwh ? ` + ${job.batteryKwh} kWh` : ''}`], ['Stage', job.stage], ['Zone', zone ? `${zone.zone} (${zone.rating})` : '?']] });
        g.addEventListener('mouseenter', async () => { const { showTooltip } = await import('../core/ui.js'); showTooltip(g); }); g.addEventListener('mouseleave', async () => { const { hideTooltip } = await import('../core/ui.js'); hideTooltip(); });
        svg.append(g); plotted++;
    }
    const home = postcodePosition(ctx.profile().postcode);
    if (home) { const [x, y] = project([home.lon, home.lat]); const g = svgEl('g', { class: 'home' }); g.append(svgEl('path', { d: `M${x - 7},${y + 5} L${x},${y - 7} L${x + 7},${y + 5} Z` })); svg.append(g); }
    body.append(section(null, row(h('select', { class: 'input map-stage', onchange: (e) => { ctx.store.set('ui.mapStage', e.target.value); ctx.refresh('map'); } }, h('option', { value: '' }, 'All stages'), STAGES.map((s) => h('option', { value: s.id, selected: stageFilter === s.id ? '' : null }, s.title))), h('span', { class: 'muted' }, `${plotted} job${plotted === 1 ? '' : 's'} plotted · pin number = stage · colour = STC zone`), Object.entries(ZONE_COLOURS).map(([z, c]) => h('span', { class: 'legend' }, h('span', { class: 'swatch', style: { background: c } }), ` Zone ${z}`))), svg,
        jobs.length ? null : h('div', { class: 'empty' }, 'Create a job with a postcode to see it on the map.')));
}

function renderZones(body, ctx) {
    const rows = POSTCODE_ZONES.map(([from, to, zone]) => ({ range: `${String(from).padStart(4, '0')}–${String(to).padStart(4, '0')}`, from, zone, rating: ZONE_RATINGS[zone], state: stateFromPostcode(from) || '' }));
    const lookup = h('input', { type: 'text', class: 'input', placeholder: 'Postcode lookup', maxlength: 4, oninput: () => { const z = zoneForPostcode(lookup.value); out.replaceChildren(z ? badge(`Zone ${z.zone} · rating ${z.rating} · ${stateFromPostcode(lookup.value) || '?'}`, 'accent') : h('span', { class: 'muted' }, lookup.value.length === 4 ? 'Unknown postcode' : 'Enter 4 digits')); } });
    const out = h('span');
    body.append(section('STC zone ratings', h('p', { class: 'muted' }, 'STCs = kW × zone rating × deeming years. Zone 1 (far north/west) has the highest rating.'), row(lookup, out), Object.entries(ZONE_RATINGS).map(([z, r]) => h('span', { class: 'legend' }, h('span', { class: 'swatch', style: { background: ZONE_COLOURS[z] } }), ` Zone ${z}: ${r}`)), dataTable({ columns: [{ key: 'range', label: 'Postcodes' }, { key: 'state', label: 'State' }, { key: 'zone', label: 'Zone', align: 'right' }, { key: 'rating', label: 'Rating', align: 'right' }], rows, pageSize: 30, initialSort: { key: 'from', dir: 'asc' } }).el));
}

function renderCities(body, ctx) {
    const rows = Object.entries(CITY_YIELD_KWH_PER_KW_DAY).map(([city, v]) => ({ city, perDay: v, perYear: Math.round(v * 365), sixSix: Math.round(v * 365 * 6.6) }));
    body.append(section('Average daily yield per kW (CEC consumer guide)', dataTable({ columns: [{ key: 'city', label: 'City' }, { key: 'perDay', label: 'kWh/kW/day', align: 'right' }, { key: 'perYear', label: 'kWh/kW/year', align: 'right' }, { key: 'sixSix', label: '6.6 kW system kWh/yr', align: 'right' }], rows, searchable: false, initialSort: { key: 'perDay', dir: 'desc' } }).el, h('p', { class: 'muted' }, 'Set your nearest city in the Character window; the yield calculator uses it with tilt/azimuth factors.')));
}

export const FEATURES = [
    { id: 'win.map.project', title: 'Map projection and postcode positioning', test: () => { const [x, y] = project([112, -10]); const syd = postcodePosition('2000'); const none = postcodePosition('0000'); return x === 0 && y === 0 && syd.state === 'NSW' && Math.abs(syd.lon - 151.2) < 2.1 && none === null; } },
    { id: 'win.map.render', title: 'Realm map renders coastline, cities and job pins', dom: true, test: () => { const t = makeTestCtx(); const b = openWindow(t.ctx, def(t.ctx)); const ok = qa(b, 'path.land').length === 2 && qa(b, 'g.city').length === 10 && qa(b, 'g.job-pin').length === 1 && q(b, 'g.home') !== null; t.done(); return ok; } },
    { id: 'win.map.pinClick', title: 'Clicking a pin opens the job', dom: true, test: () => { const t = makeTestCtx(); const b = openWindow(t.ctx, def(t.ctx)); t.ctx.wm.register({ id: 'jobs', title: 'J', render: () => {}, tabs: [{ id: 'detail', label: 'd' }] }); q(b, 'g.job-pin').dispatchEvent(new MouseEvent('click')); const ok = t.ctx.wm.isOpen('jobs'); t.done(); return ok; } },
    { id: 'win.map.stageFilter', title: 'Filter pins by stage', dom: true, test: () => { const t = makeTestCtx(); const b = openWindow(t.ctx, def(t.ctx)); const sel = q(b, 'select.map-stage'); sel.value = 'design'; sel.dispatchEvent(new Event('change')); const none = qa(t.ctx.wm.windows.get('map').body, 'g.job-pin').length === 0; sel.value = ''; const b2 = t.ctx.wm.windows.get('map').body; const s2 = q(b2, 'select.map-stage'); s2.value = 'lead'; s2.dispatchEvent(new Event('change')); const ok = none && qa(t.ctx.wm.windows.get('map').body, 'g.job-pin').length === 1; t.done(); return ok; } },
    { id: 'win.map.zoneLookup', title: 'Postcode zone lookup and full zone table', dom: true, test: () => { const t = makeTestCtx(); const b = openWindow(t.ctx, def(t.ctx), { tab: 'zones' }); const i = q(b, 'input[placeholder="Postcode lookup"]'); i.value = '0800'; i.dispatchEvent(new Event('input')); const ok = /Zone 1/.test(b.textContent) && qa(b, 'tbody tr').length === 30; t.done(); return ok; } },
    { id: 'win.map.cities', title: 'City yield table', dom: true, test: () => { const t = makeTestCtx(); const b = openWindow(t.ctx, def(t.ctx), { tab: 'cities' }); const ok = qa(b, 'tbody tr').length === Object.keys(CITY_YIELD_KWH_PER_KW_DAY).length; t.done(); return ok; } }
];
