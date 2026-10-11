/** Help: getting started, hotkeys, glossary, about & sources. */
import { h, button, badge, dataTable } from '../core/ui.js';
import * as registry from '../core/registry.js';
import { section, grid, row, statCard } from './_shared.js';
import { makeTestCtx, openWindow, q, qa } from './_testing.js';

export const TUTORIAL_STEPS = [
    { id: 'profile', title: 'Set up your profile', text: 'Open the Character window (C) and enter your name, company, SAA accreditation and home postcode. The postcode sets your STC zone.', window: 'character' },
    { id: 'job', title: 'Create a job', text: 'Open Jobs (O) › New job. Every job runs through nine stages from lead to handover; each stage has tasks and some have gates.', window: 'jobs' },
    { id: 'products', title: 'Pick approved products', text: 'Open the Product vault (B). Search the real CEC lists, star favourites, and press 📐 to put a module, inverter and battery into the job design.', window: 'inventory' },
    { id: 'design', title: 'Run the calculators', text: 'Open Calculators (K). String sizing, voltage rise, cable sizes, battery location, STCs and yield – each result cites its clause and saves into the design.', window: 'spellbook' },
    { id: 'crew', title: 'Put the crew to work', text: 'Open Crew (P). Assign a member to the job; press Space to run the clock. They work tasks, rest when tired, learn skills and remember what happened.', window: 'crew' },
    { id: 'verify', title: 'Verify and hand over', text: 'Checklists (H) and Commissioning (T) gate the later stages. Reports (R) assembles everything into a printable job report.', window: 'checklists' },
    { id: 'learn', title: 'Keep learning', text: 'The Codex (N) holds clause summaries; the quest log (L) and achievements (Y) track your progress. Press Ctrl+K for the command palette and / for the console.', window: 'codex' }
];
export const GLOSSARY = [
    ['STC', 'Small-scale technology certificate – the federal incentive unit for solar and (since 2025) batteries.'], ['Deeming period', 'Years of generation credited up-front for STCs; shrinks each year until the scheme ends in 2030.'], ['Zone rating', 'Multiplier per STC zone (1.622 to 1.185) reflecting solar resource.'],
    ['Voc / Vmp', 'Open-circuit and maximum-power-point voltage of a module; Voc rises in the cold, Vmp falls in the heat.'], ['Voltage rise', 'Increase in voltage at the inverter terminals due to export current through cable impedance; ≤ 2 % per AS/NZS 4777.1.'], ['MPPT', 'Maximum power point tracker – the inverter input whose voltage window the string must stay inside.'],
    ['DNSP', 'Distribution network service provider – the network operator that approves grid connections and export limits.'], ['SAA', 'Solar Accreditation Australia – installer/designer accreditation required for STC eligibility.'], ['CEC approved list', 'Clean Energy Council product lists; modules, inverters and batteries must be listed at installation for STCs.'],
    ['Restricted location', 'Places where a battery must not be installed under AS/NZS 5139 (habitable rooms, ceiling spaces, escape routes…).'], ['EFLI', 'Earth fault-loop impedance – must be low enough for the protective device to trip in time.'], ['Anti-islanding', 'Inverter protection that stops exporting within 2 s when the grid is lost.'],
    ['Needs', 'A crew member\'s energy, focus, morale, social, mastery and safety; they decay over time and drive behaviour.'], ['Reflection', 'A higher-level thought an agent forms from its memory stream when enough important things have happened.'], ['Autonomy', 'How much a crew member acts on its own: observe, suggest, semi-autonomous or fully autonomous.']
];

export function def(ctx) {
    return {
        id: 'help', title: ctx.t('nav.help'), icon: '❔', hotkey: 'F1', width: 820, height: 600,
        tabs: [{ id: 'start', label: 'Getting started', icon: '🚀' }, { id: 'keys', label: 'Hotkeys', icon: '⌨' }, { id: 'glossary', label: 'Glossary', icon: '📖' }, { id: 'about', label: 'About', icon: 'ℹ' }],
        render(body, { tab }) {
            if (tab === 'keys') return body.append(section('Hotkeys', dataTable({ columns: [{ key: 'key', label: 'Key' }, { key: 'action', label: 'Action' }], rows: ctx.keys.list().map((b) => ({ key: b.key, action: b.action.replace('window.', 'Toggle ').replace('.', ' ') })), pageSize: 50, searchable: true }).el));
            if (tab === 'glossary') return body.append(section('Glossary', h('dl', { class: 'glossary' }, GLOSSARY.map(([term, text]) => [h('dt', {}, term), h('dd', {}, text)]))));
            if (tab === 'about') return renderAbout(body, ctx);
            const done = ctx.store.get('onboarding.completed', []);
            body.append(section('Seven steps to a compliant job', h('ol', { class: 'tutorial' }, TUTORIAL_STEPS.map((s) => h('li', { class: done.includes(s.id) ? 'done' : '' }, h('strong', {}, s.title), ' ', done.includes(s.id) ? badge('done', 'ok') : null, h('div', {}, s.text), row(button(`Open ${s.window}`, () => { ctx.open(s.window); ctx.store.set('onboarding.completed', [...new Set([...done, s.id])]); ctx.refresh('help'); }, { small: true }))))), h('p', { class: 'muted' }, 'Windows are draggable and resizable; positions are remembered. Drag the title bar, double-click to maximise, Esc closes the top window, Tab cycles windows.')));
        }
    };
}
function renderAbout(body, ctx) {
    body.append(grid(3, statCard('Registered features', registry.count()), statCard('Modules', Object.keys(registry.byModule()).length), statCard('Jurisdiction', ctx.profile().jurisdiction)),
        section('About SolarFlow Realm', h('p', {}, 'A compliance workstation for solar and battery installers presented with the conventions of a deep role-playing game: windows, hotkeys, a crew with needs and memories, quests that are real jobs, and achievements earned by verified work.'),
            h('p', {}, 'Engineering rules follow AS/NZS 3000, 5033, 4777.1/2, 5139, 3008 and the Clean Energy Regulator\'s STC methodology. Product data is the CEC approved lists republished by the Clean Energy Regulator.'),
            h('p', { class: 'muted' }, 'Screening tool only. A licensed electrical worker / SAA accredited person must verify compliance against the full standards, which are copyrighted by Standards Australia.'),
            row(button('Run system check', () => ctx.open('selftest'), { small: true }), button('Research notes', () => window.open('RESEARCH.md', '_blank'), { small: true }))));
}

export const FEATURES = [
    { id: 'win.help.tutorial', title: 'Seven-step tutorial with completion tracking', dom: true, test: () => { const t = makeTestCtx(); const b = openWindow(t.ctx, def(t.ctx)); t.ctx.wm.register({ id: 'character', title: 'c', render: () => {} }); qa(b, 'li button')[0].click(); const ok = qa(b, '.tutorial li').length === 7 && t.ctx.store.get('onboarding.completed').includes('profile') && t.ctx.wm.isOpen('character'); t.done(); return ok; } },
    { id: 'win.help.keys', title: 'Hotkey reference', dom: true, test: () => { const t = makeTestCtx(); const b = openWindow(t.ctx, def(t.ctx), { tab: 'keys' }); const ok = qa(b, 'tbody tr').length > 30; t.done(); return ok; } },
    { id: 'win.help.glossary', title: 'Glossary of solar and simulation terms', dom: true, test: () => { const t = makeTestCtx(); const b = openWindow(t.ctx, def(t.ctx), { tab: 'glossary' }); const ok = qa(b, 'dt').length === GLOSSARY.length; t.done(); return ok; } },
    { id: 'win.help.about', title: 'About page reports the live feature count', dom: true, test: () => { const t = makeTestCtx(); const b = openWindow(t.ctx, def(t.ctx), { tab: 'about' }); const ok = Number(q(b, '.stat-value').textContent) > 100; t.done(); return ok; } }
];
