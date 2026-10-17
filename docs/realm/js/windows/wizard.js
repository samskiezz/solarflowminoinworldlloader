/** Design wizard: the whole job workflow as a guided stepper with live completion checks. */
import { h, button, badge, progressBar } from '../core/ui.js';
import { applicableChecklists, evaluateChecklist } from '../domain/checklists.js';
import { registerStatus } from '../domain/serials.js';
import { section, row, jobPicker } from './_shared.js';
import { makeTestCtx, openWindow, q, qa } from './_testing.js';

export function wizardSteps(job, d = {}) {
    const checklistsOk = applicableChecklists({ hasPv: job.systemKw > 0, hasBattery: job.batteryKwh > 0 }).every((id) => evaluateChecklist(id, (job.checklists || {})[id] || {}).status === 'PASS');
    return [
        { id: 'survey', title: 'Site survey', done: Boolean(d.survey && d.survey.faces && d.survey.faces.length), window: ['survey'], hint: 'Record roof faces and site checks' },
        { id: 'loads', title: 'Load profile', done: Boolean(d.dailyKwh), window: ['loads'], hint: 'Daily kWh drives battery sizing and self-consumption' },
        { id: 'products', title: 'Approved products', done: Boolean(d.moduleId && d.inverterId && d.productsApproved), window: ['inventory', 'design'], hint: 'Module, inverter (and battery) on the CEC lists today' },
        { id: 'strings', title: 'String sizing', done: Boolean(d.modulesPerString), window: ['spellbook', 'strings'], hint: 'Cold Voc within limits, hot Vmp inside the MPPT window' },
        { id: 'ac', title: 'Voltage rise & cable', done: d.voltageRisePct !== undefined && d.voltageRisePct <= 2, window: ['spellbook', 'acrise'], hint: '≤ 2 % rise to the inverter' },
        ...(job.batteryKwh > 0 ? [{ id: 'battery', title: 'Battery location & sizing', done: d.batteryLocationStatus === 'PASS' && Boolean(d.batteryUsableKwh), window: ['spellbook', 'battery'], hint: 'No restricted locations, clearances met' }] : []),
        { id: 'yield', title: 'Yield & finance', done: Boolean(d.annualKwh), window: ['spellbook', 'yield'], hint: 'Generation, savings, payback' },
        { id: 'stc', title: 'STC estimate', done: Boolean(d.stcs), window: ['spellbook', 'stc'], hint: 'Zone × deeming × kW' },
        { id: 'proposal', title: 'Proposal issued', done: Boolean(d.proposalIssuedAt), window: ['proposal', 'preview'], hint: 'Priced with the STC discount' },
        { id: 'dnsp', title: 'Network application lodged', done: Boolean(d.dnspApplication && d.dnspApplication.lodgedAt), window: ['dnsp', 'application'], hint: 'NMI, inverter, export limit' },
        { id: 'checklists', title: 'Compliance checklists', done: checklistsOk, window: ['checklists', 'work'], hint: 'All applicable checklists PASS' },
        { id: 'commissioning', title: 'Commissioning tests', done: Boolean(job.tests && job.tests.status === 'PASS'), window: ['commissioning', 'tests'], hint: 'Insulation, polarity, Voc/Isc, anti-islanding…' },
        { id: 'serials', title: 'Serial register', done: registerStatus(job.serials || {}, d).complete, window: ['serials'], hint: 'Every module, inverter and battery serial' },
        { id: 'labels', title: 'Labels', done: Boolean(d.labelsIssuedAt), window: ['labels'], hint: 'Printed from the design' },
        { id: 'handover', title: 'Handover pack', done: Boolean(d.handoverPackIssuedAt), window: ['handover', 'manual'], hint: "Owner's manual, maintenance, warranties" }
    ];
}
export function wizardProgress(steps) { const done = steps.filter((s) => s.done).length; return { done, total: steps.length, pct: Math.round((done / steps.length) * 100), next: steps.find((s) => !s.done) || null }; }

export function def(ctx) {
    return {
        id: 'wizard', title: 'Design wizard', icon: '🧭', hotkey: null, width: 720, height: 620,
        render(body) {
            body.append(jobPicker(ctx, { onChange: () => ctx.refresh('wizard') }));
            const job = ctx.currentJob(); if (!job) return;
            const steps = wizardSteps(job, ctx.design(job.id)); const p = wizardProgress(steps);
            body.append(section(`${job.customer} – ${p.done}/${p.total} steps`, progressBar(p.pct, { label: p.next ? `Next: ${p.next.title}` : 'Complete' }), h('div', { class: 'wizard-steps' }, steps.map((s, i) => h('div', { class: `wizard-step ${s.done ? 'done' : ''} ${p.next && p.next.id === s.id ? 'next' : ''}` }, h('span', { class: 'n' }, s.done ? '✔' : String(i + 1)), h('div', {}, h('div', { class: 'card-title' }, s.title), h('div', { class: 'muted small' }, s.hint)), button(s.done ? 'Review' : 'Open', () => ctx.open(s.window[0], s.window[1] ? { tab: s.window[1] } : {}), { small: true, kind: p.next && p.next.id === s.id ? 'primary' : '' }))))));
        }
    };
}

export const FEATURES = [
    { id: 'win.wizard.steps', title: 'Workflow steps derived from the job and design', dom: true, test: () => { const t = makeTestCtx(); const s0 = wizardSteps(t.job, {}); const s1 = wizardSteps(t.job, { survey: { faces: [{}] }, moduleId: 'm', inverterId: 'i', productsApproved: true, modulesPerString: 10, voltageRisePct: 1.5 }); const noBattery = wizardSteps({ ...t.job, batteryKwh: 0 }, {}); t.done(); return s0.length === 15 && s0.filter((s) => s.done).length === 0 && s1.filter((s) => s.done).length === 4 && noBattery.length === 14; } },
    { id: 'win.wizard.progress', title: 'Progress and next step', test: () => { const p = wizardProgress([{ id: 'a', done: true }, { id: 'b', done: false }, { id: 'c', done: false }]); return p.pct === 33 && p.next.id === 'b'; } },
    { id: 'win.wizard.render', title: 'Stepper highlights the next step and jumps to its window', dom: true, test: () => { const t = makeTestCtx(); t.ctx.wm.register({ id: 'survey', title: 's', render: () => {} }); const b = openWindow(t.ctx, def(t.ctx)); const ok = qa(b, '.wizard-step').length === 15 && q(b, '.wizard-step.next .card-title').textContent === 'Site survey'; q(b, '.wizard-step.next button').click(); const opened = t.ctx.wm.isOpen('survey'); t.done(); return ok && opened; } }
];
