/** Character sheet: the installer profile, company level, titles and equipment (owned upgrades). */
import { h, button, badge, progressBar, toast } from '../core/ui.js';
import { LOCALES, setLocale } from '../core/i18n.js';
import { listJurisdictions } from '../domain/jurisdictions.js';
import { CITY_YIELD_KWH_PER_KW_DAY } from '../domain/yield.js';
import { ACHIEVEMENTS } from '../sim/events.js';
import { UPGRADES } from '../sim/economy.js';
import { stateFromPostcode, zoneForPostcode } from '../domain/incentives.js';
import { LEVEL_TITLES } from '../core/context.js';
import { section, statCard, grid, row, form } from './_shared.js';
import { makeTestCtx, openWindow, q, qa, fire } from './_testing.js';

export const THEMES = [{ id: 'dusk', label: 'Dusk (default)' }, { id: 'parchment', label: 'Parchment' }, { id: 'obsidian', label: 'Obsidian' }, { id: 'daylight', label: 'Daylight (high contrast)' }];

export function def(ctx) {
    return {
        id: 'character', title: ctx.t('nav.character'), icon: '🧑‍🔧', hotkey: 'C', width: 760, height: 560,
        tabs: [{ id: 'profile', label: 'Profile', icon: '🪪' }, { id: 'stats', label: 'Statistics', icon: '📊' }, { id: 'titles', label: 'Titles', icon: '🏅' }, { id: 'equipment', label: 'Equipment', icon: '🧰' }],
        render(body, { tab }) {
            if (tab === 'stats') return renderStats(body, ctx);
            if (tab === 'titles') return renderTitles(body, ctx);
            if (tab === 'equipment') return renderEquipment(body, ctx);
            return renderProfile(body, ctx);
        }
    };
}

function header(ctx) {
    const p = ctx.profile(); const lvl = ctx.level();
    return section(null, row(h('span', { class: 'avatar xl', style: { background: 'hsl(38 60% 35%)' } }, '🧑‍🔧'), h('div', {}, h('h2', { class: 'job-heading' }, p.name, ' ', badge(`${ctx.t('level')} ${lvl.level}`, 'accent')), h('div', { class: 'muted' }, `${p.company} · ${lvl.title} · ${p.jurisdiction}`), progressBar(lvl.pct, { label: `${lvl.xp - lvl.floor}/${lvl.next - lvl.floor} XP` }))));
}

function renderProfile(body, ctx) {
    const p = ctx.profile();
    body.append(header(ctx));
    const f = form([
        { key: 'name', label: 'Your name', type: 'text', value: p.name },
        { key: 'company', label: 'Company', type: 'text', value: p.company },
        { key: 'accreditation', label: 'SAA accreditation no.', type: 'text', value: p.accreditation, hint: 'Required for STC-eligible designs/installs' },
        { key: 'jurisdiction', label: 'Jurisdiction', type: 'select', options: listJurisdictions().map((j) => ({ value: j.id, label: `${j.name}${j.complete ? '' : ' (reference only)'}` })), value: p.jurisdiction },
        { key: 'postcode', label: 'Home postcode', type: 'text', value: p.postcode, hint: 'Default STC zone and state' },
        { key: 'city', label: 'Nearest city (yield data)', type: 'select', options: Object.keys(CITY_YIELD_KWH_PER_KW_DAY), value: p.city },
        { key: 'phases', label: 'Default supply', type: 'select', options: [{ value: '1', label: 'Single phase' }, { value: '3', label: 'Three phase' }], value: String(p.phases) },
        { key: 'locale', label: 'Language', type: 'select', options: LOCALES.map((l) => ({ value: l.id, label: l.label })), value: p.locale },
        { key: 'theme', label: 'Theme', type: 'select', options: THEMES.map((t) => ({ value: t.id, label: t.label })), value: p.theme }
    ]);
    const zone = h('div', { class: 'muted' });
    const updateZone = (v) => { const z = zoneForPostcode(v.postcode); zone.textContent = z ? `Postcode ${v.postcode}: STC zone ${z.zone} (rating ${z.rating}), state ${stateFromPostcode(v.postcode) || '?'}` : 'Unknown postcode'; };
    updateZone(f.values());
    body.append(section('Profile', f.el, zone, row(button('Save profile', () => { const v = f.values(); if (!v.name.trim()) { toast('Name is required', { kind: 'warn' }); return; } ctx.store.patch('profile', { ...v, phases: Number(v.phases) }); setLocale(v.locale); ctx.bus.emit('profile:updated', ctx.profile()); toast(ctx.t('toast.saved'), { kind: 'ok' }); ctx.refresh(); }, { kind: 'primary' }))));
    f.inputs.postcode.input.addEventListener('input', () => updateZone(f.values()));
}

function renderStats(body, ctx) {
    const s = ctx.world.stats; const jobs = ctx.jobs(); const lvl = ctx.level();
    const kw = jobs.reduce((n, j) => n + j.systemKw, 0); const kwh = jobs.reduce((n, j) => n + j.batteryKwh, 0);
    body.append(header(ctx), grid(4,
        statCard('Jobs created', s.jobsCreated), statCard('Jobs complete', jobs.filter((j) => j.stage === 'complete').length), statCard('kW designed', kw.toFixed(1)), statCard('kWh storage', kwh.toFixed(1)),
        statCard('Checklists passed', s.checklistsPassed), statCard('Current streak', s.checklistStreak), statCard('Commissioning passes', s.commissioningPassed), statCard('STC-ready jobs', s.stcReady),
        statCard('Clauses read', s.clausesViewed), statCard('Expert crew', s.expertAgents), statCard('Reflections', s.reflections), statCard('Credits earned', lvl.xp)),
        section('Crew hours', h('ul', { class: 'notes' }, ctx.world.agents.map((a) => h('li', {}, `${a.name}: ${a.hoursWorked.toFixed(0)} h, ${a.stats.tasksDone} tasks, ${a.stats.tasksFailed} reworks`)))));
}

function renderTitles(body, ctx) {
    const unlocked = ctx.world.unlocked; const lvl = ctx.level();
    const current = ctx.store.get('profile.title') || lvl.title;
    const titles = [...LEVEL_TITLES.slice(0, Math.floor(lvl.level / 3) + 1), ...ACHIEVEMENTS.filter((a) => unlocked.includes(a.id)).map((a) => a.title)];
    body.append(header(ctx), section('Earned titles', h('div', { class: 'titles' }, titles.map((t) => h('button', { class: `btn small ${t === current ? 'primary' : ''}`, onclick: () => { ctx.store.set('profile.title', t); ctx.refresh('character'); } }, t))), h('p', { class: 'muted' }, 'Titles come from company level (every 3 levels) and achievements. The selected title shows on your dashboard.')),
        section('Locked', h('ul', { class: 'notes' }, ACHIEVEMENTS.filter((a) => !unlocked.includes(a.id)).map((a) => h('li', {}, h('strong', {}, a.title), ' – ', a.description)))));
}

function renderEquipment(body, ctx) {
    const owned = ctx.world.ledger.owned;
    body.append(header(ctx), section('Equipment (owned upgrades)', owned.length ? h('div', { class: 'equipment' }, owned.map((id) => { const u = UPGRADES.find((x) => x.id === id); return h('div', { class: 'card', tooltip: u?.description }, h('div', { class: 'card-title' }, u?.name || id), h('div', { class: 'card-sub' }, u?.description)); })) : h('div', { class: 'empty' }, 'No equipment yet – visit the Market (U) to spend credits.'), button('Open market', () => ctx.open('market'), { small: true })));
}

export const FEATURES = [
    { id: 'win.character.header', title: 'Level, title and XP bar', dom: true, test: () => { const t = makeTestCtx(); const b = openWindow(t.ctx, def(t.ctx), { tab: 'profile' }); const ok = /Level 1/.test(q(b, '.job-heading').textContent) && q(b, '.bar-fill') !== null; t.done(); return ok; } },
    { id: 'win.character.saveProfile', title: 'Edit and save the installer profile', dom: true, test: () => { const t = makeTestCtx(); const b = openWindow(t.ctx, def(t.ctx), { tab: 'profile' }); const inputs = qa(b, 'input[type=text]'); inputs[0].value = 'Ada'; inputs[2].value = 'A1234567'; qa(b, 'button').find((x) => x.textContent === 'Save profile').click(); const ok = t.ctx.profile().name === 'Ada' && t.ctx.profile().accreditation === 'A1234567'; t.done(); return ok; } },
    { id: 'win.character.zoneHint', title: 'Postcode shows STC zone and state live', dom: true, test: () => { const t = makeTestCtx(); const b = openWindow(t.ctx, def(t.ctx), { tab: 'profile' }); const pc = qa(b, 'input[type=text]')[3]; pc.value = '4000'; fire(pc); const ok = /zone 3|zone 2/.test(b.textContent) && /QLD/.test(b.textContent); t.done(); return ok; } },
    { id: 'win.character.locale', title: 'Switching language re-renders the chrome', dom: true, test: () => { const t = makeTestCtx(); const b = openWindow(t.ctx, def(t.ctx), { tab: 'profile' }); const sel = qa(b, 'select').find((s) => [...s.options].some((o) => o.value === 'de')); sel.value = 'de'; qa(b, 'button').find((x) => x.textContent === 'Save profile').click(); const ok = t.ctx.t('nav.crew') === 'Team'; setLocale('en'); t.done(); return ok; } },
    { id: 'win.character.stats', title: 'Statistics sheet', dom: true, test: () => { const t = makeTestCtx(); const b = openWindow(t.ctx, def(t.ctx), { tab: 'stats' }); const ok = qa(b, '.stat').length === 12 && /6.6/.test(b.textContent); t.done(); return ok; } },
    { id: 'win.character.titles', title: 'Titles from levels and achievements', dom: true, test: () => { const t = makeTestCtx(); t.ctx.world.unlocked.push('first_job'); const b = openWindow(t.ctx, def(t.ctx), { tab: 'titles' }); const btn = qa(b, '.titles button').find((x) => x.textContent === 'First light'); btn.click(); const ok = t.ctx.store.get('profile.title') === 'First light'; t.done(); return ok; } },
    { id: 'win.character.equipment', title: 'Equipment shows owned upgrades', dom: true, test: () => { const t = makeTestCtx(); t.ctx.world.ledger.owned.push('drone'); const b = openWindow(t.ctx, def(t.ctx), { tab: 'equipment' }); const ok = /Roof survey drone/.test(b.textContent); t.done(); return ok; } }
];
