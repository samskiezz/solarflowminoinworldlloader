/** Loads: build a household load profile from the appliance library; feeds battery sizing and self-consumption. */
import { h, button, badge, barChart, toast } from '../core/ui.js';
import { APPLIANCE_LIBRARY, hourlyProfile, dailyKwh, peakKw, eveningSharePct, maximumDemandA } from '../domain/loads.js';
import { section, row, grid, jobPicker, statCard } from './_shared.js';
import { makeTestCtx, openWindow, q, qa, fire } from './_testing.js';

export const PRESETS = {
    'Small household': ['fridge', 'tv', 'lighting', 'washing', 'standby', 'cooktop'],
    'Family with air-con': ['fridge', 'aircon_split', 'hot_water_electric', 'oven', 'cooktop', 'dishwasher', 'washing', 'dryer', 'tv', 'lighting', 'standby'],
    'All-electric + EV + pool': ['fridge', 'aircon_ducted', 'heat_pump_hw', 'oven', 'cooktop', 'dishwasher', 'washing', 'dryer', 'tv', 'lighting', 'computers', 'pool_pump', 'ev_charger', 'standby']
};

export function def(ctx) {
    return {
        id: 'loads', title: ctx.t('nav.loads'), icon: '🔌', hotkey: null, width: 880, height: 620,
        render(body) {
            body.append(jobPicker(ctx, { onChange: () => ctx.refresh('loads') }));
            const job = ctx.currentJob(); if (!job) return;
            const d = ctx.design(job.id);
            const selection = (d.loads || []).map((x) => ({ ...x }));
            const has = (id) => selection.find((s) => s.id === id);
            const out = h('div');
            const list = h('div', { class: 'appliance-grid' });
            const renderList = () => { list.replaceChildren(...APPLIANCE_LIBRARY.map((a) => { const sel = has(a.id); return h('label', { class: `appliance ${sel ? 'on' : ''}` }, h('input', { type: 'checkbox', checked: sel ? '' : null, onchange: (e) => { if (e.target.checked) selection.push({ id: a.id, quantity: 1 }); else selection.splice(selection.indexOf(has(a.id)), 1); renderList(); run(); } }), h('span', { class: 'appliance-name' }, a.name), h('span', { class: 'muted' }, `${a.watts} W · ${a.hoursPerDay} h/day`), sel ? h('input', { type: 'number', class: 'input tiny', min: 1, step: 1, value: sel.quantity, title: 'Quantity', oninput: (e) => { sel.quantity = Math.max(1, Number(e.target.value) || 1); run(); } }) : null); })); };
            const run = () => { const profile = hourlyProfile(selection); const daily = dailyKwh(selection); const peak = peakKw(selection); const evening = eveningSharePct(selection); const md = maximumDemandA(selection, job.phases === 3 ? 400 : 230); out.replaceChildren(grid(4, statCard('Daily consumption', `${daily} kWh`), statCard('Peak hour', `${peak} kW`), statCard('Evening/overnight share', `${evening} %`), statCard('Max demand (diversified)', `${md} A`)), barChart(profile.map((v, hh) => ({ label: hh % 3 === 0 ? `${hh}h` : '', value: v, colour: hh >= 17 || hh < 7 ? 'var(--accent-2)' : 'var(--accent)' })), { height: 110 }), h('div', { class: 'muted' }, 'Blue = daytime (solar can serve directly), purple = evening/overnight (battery or grid).')); };
            renderList(); run();
            body.append(section('Appliances', row(h('span', { class: 'muted' }, 'Presets: '), Object.keys(PRESETS).map((p) => button(p, () => { selection.splice(0, selection.length, ...PRESETS[p].map((id) => ({ id, quantity: 1 }))); renderList(); run(); }, { small: true }))), list),
                section('Load profile', out, row(button('Save profile to job design', () => { ctx.saveDesign(job.id, { loads: selection, dailyKwh: dailyKwh(selection), eveningSharePct: eveningSharePct(selection), peakKw: peakKw(selection) }); toast('Load profile saved – battery sizing and yield now use it', { kind: 'ok' }); }, { kind: 'primary', small: true }), button('Size a battery for this', () => { ctx.saveDesign(job.id, { loads: selection, dailyKwh: dailyKwh(selection), eveningSharePct: eveningSharePct(selection) }); ctx.open('spellbook', { tab: 'battery' }); }, { small: true }))));
        }
    };
}

export const FEATURES = [
    { id: 'win.loads.library', title: 'Appliance library with quantities', dom: true, test: () => { const t = makeTestCtx(); const b = openWindow(t.ctx, def(t.ctx)); const ok = qa(b, '.appliance').length === APPLIANCE_LIBRARY.length; t.done(); return ok; } },
    { id: 'win.loads.select', title: 'Selecting appliances updates the profile', dom: true, test: () => { const t = makeTestCtx(); const b = openWindow(t.ctx, def(t.ctx)); const cb = q(b, '.appliance input[type=checkbox]'); cb.checked = true; fire(cb, 'change'); const ok = /1.2 kWh/.test(b.textContent) && qa(b, '.bar-col').length === 24; t.done(); return ok; } },
    { id: 'win.loads.presets', title: 'Household presets', dom: true, test: () => { const t = makeTestCtx(); const b = openWindow(t.ctx, def(t.ctx)); qa(b, 'button').find((x) => x.textContent === 'Family with air-con').click(); const ok = qa(b, '.appliance.on').length === 11; t.done(); return ok; } },
    { id: 'win.loads.quantity', title: 'Quantity multiplies consumption', dom: true, test: () => { const t = makeTestCtx(); const b = openWindow(t.ctx, def(t.ctx)); const cb = q(b, '.appliance input[type=checkbox]'); cb.checked = true; fire(cb, 'change'); const qty = q(b, '.appliance.on input.tiny'); qty.value = '2'; fire(qty); const ok = /2.4 kWh/.test(b.textContent); t.done(); return ok; } },
    { id: 'win.loads.save', title: 'Profile saved into the design for battery sizing', dom: true, test: () => { const t = makeTestCtx(); const b = openWindow(t.ctx, def(t.ctx)); qa(b, 'button').find((x) => x.textContent === 'Small household').click(); qa(b, 'button').find((x) => x.textContent.startsWith('Save profile')).click(); const d = t.ctx.design(t.job.id); const ok = d.loads.length === 6 && d.dailyKwh > 3 && d.eveningSharePct > 0; t.done(); return ok; } },
    { id: 'win.loads.maxDemand', title: 'Maximum demand estimate', dom: true, test: () => { const t = makeTestCtx(); const b = openWindow(t.ctx, def(t.ctx)); qa(b, 'button').find((x) => x.textContent.startsWith('All-electric')).click(); const ok = /Max demand/.test(b.textContent) && qa(b, '.stat')[3].textContent.includes(' A'); t.done(); return ok; } }
];
