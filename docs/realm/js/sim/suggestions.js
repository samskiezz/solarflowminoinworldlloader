/**
 * Suggestions: crew members under 'suggest' or 'semi' autonomy propose the
 * next useful action for a job; the user accepts or dismisses. This is how
 * the simulation turns observation into practical help.
 */
import { plan, JOB_PLAN_ACTIONS } from './planner.js';
import { stageTasks, stageGate, validateForStcClaim } from '../domain/jobs.js';

export const ACTION_WINDOWS = { select_products: ['inventory', 'browse'], verify_approval: ['inventory', 'design'], size_strings: ['spellbook', 'strings'], check_voltage_rise: ['spellbook', 'acrise'], assess_battery_location: ['spellbook', 'battery'], complete_design: ['jobs', 'detail'], install: ['jobs', 'detail'], commission: ['commissioning', 'tests'], complete_checklists: ['checklists', 'work'], claim_stcs: ['jobs', 'detail'], handover: ['reports', 'preview'] };
export const ACTION_LABELS = { select_products: 'Select approved products in the vault', verify_approval: 'Confirm products are approved today', size_strings: 'Run string sizing', check_voltage_rise: 'Check voltage rise and cable size', assess_battery_location: 'Assess the battery location', complete_design: 'Complete the design stage tasks', install: 'Record the installation tasks', commission: 'Record commissioning tests', complete_checklists: 'Complete the compliance checklists', claim_stcs: 'Prepare the STC claim evidence', handover: 'Generate the handover report' };

/** World state for the GOAP planner, derived from a job and its design. */
export function jobState(job, design = {}) {
    return {
        productsSelected: Boolean(design.moduleId && design.inverterId),
        productsApproved: Boolean(design.productsApproved),
        stringsSized: Boolean(design.modulesPerString),
        voltageRiseOk: design.voltageRisePct !== undefined && design.voltageRisePct <= 2,
        batteryLocationOk: !(job.batteryKwh > 0) || design.batteryLocationStatus === 'PASS',
        designComplete: ['quote', 'approval', 'install', 'commission', 'claim', 'handover', 'complete'].includes(job.stage),
        installed: ['commission', 'claim', 'handover', 'complete'].includes(job.stage),
        tested: job.tests && job.tests.status === 'PASS',
        checklistsDone: stageGate(job, 'commission').filter((b) => !/Commissioning/.test(b)).length === 0 && Object.keys(job.checklists || {}).length > 0,
        stcsClaimed: validateForStcClaim(job).eligible,
        handedOver: job.stage === 'complete'
    };
}

/** The next planned action toward a claimed, handed-over job. */
export function nextAction(job, design = {}) {
    const state = jobState(job, design);
    const goal = job.batteryKwh > 0 ? { stcsClaimed: true, handedOver: true, batteryLocationOk: true } : { stcsClaimed: true, handedOver: true };
    const result = plan(goal, state, JOB_PLAN_ACTIONS);
    if (!result.plan || !result.plan.length) return null;
    const id = result.plan[0];
    return { id, label: ACTION_LABELS[id] || id, window: ACTION_WINDOWS[id] || ['jobs', 'detail'], remaining: result.plan.length, plan: result.plan };
}

/** Suggestions from every agent that is allowed to suggest, for every open job. */
export function suggestions(world, designFor) {
    const out = [];
    const agents = (world.crew ? world.crew() : world.agents).filter((a) => a.autonomy === 'suggest' || a.autonomy === 'semi' || a.autonomy === 'full');
    if (!agents.length) return out;
    for (const job of world.jobs.filter((j) => j.stage !== 'complete')) {
        const action = nextAction(job, designFor(job.id));
        if (!action) continue;
        const agent = agents.find((a) => a.id === job.assignedTo) || agents.sort((a, b) => b.level('standards') - a.level('standards'))[0];
        const open = stageTasks(job).filter((t) => !t.done).length;
        out.push({ id: `${job.id}:${action.id}`, jobId: job.id, agentId: agent.id, agentName: agent.name, action, text: `${agent.name} suggests: ${action.label} for ${job.customer} (${action.remaining} step${action.remaining === 1 ? '' : 's'} to claim-ready${open ? `, ${open} open task${open === 1 ? '' : 's'} this stage` : ''})` });
    }
    return out;
}

export const FEATURES = [
    { id: 'suggest.jobState', title: 'Planner state derived from job and design', test: () => { const job = { stage: 'design', batteryKwh: 0, tasks: {}, checklists: {}, tests: {}, design: {} }; const s = jobState(job, { moduleId: 'm', inverterId: 'i', productsApproved: true }); return s.productsSelected && s.productsApproved && !s.stringsSized && s.batteryLocationOk; } },
    { id: 'suggest.nextAction', title: 'Next action from the GOAP plan', test: () => { const job = { stage: 'lead', batteryKwh: 13, tasks: {}, checklists: {}, tests: {}, design: {} }; const a = nextAction(job, {}); const b = nextAction(job, { moduleId: 'm', inverterId: 'i', productsApproved: true, modulesPerString: 10, voltageRisePct: 1, batteryLocationStatus: 'PASS' }); return a.id === 'select_products' && a.window[0] === 'inventory' && b.id === 'complete_design'; } },
    { id: 'suggest.done', title: 'No suggestion for a complete job', test: () => nextAction({ stage: 'complete', batteryKwh: 0, tasks: {}, checklists: {}, tests: { status: 'PASS' }, design: { productsApproved: true, accreditedInstaller: true }, evidence: { serialPhotos: true, onSiteAttendance: true, ces: true }, systemKw: 5 }, { moduleId: 'm', inverterId: 'i', productsApproved: true, modulesPerString: 1, voltageRisePct: 1 }) === null },
    { id: 'suggest.fromAgents', title: 'Agents under suggest/semi/full autonomy propose actions', test: () => { const world = { agents: [{ id: 'A', name: 'Ann', autonomy: 'observe', level: () => 1 }, { id: 'B', name: 'Bob', autonomy: 'suggest', level: () => 3 }], jobs: [{ id: 'J', customer: 'C', stage: 'lead', batteryKwh: 0, tasks: { 'lead:x': false }, checklists: {}, tests: {}, design: {}, assignedTo: null }] }; const s = suggestions(world, () => ({})); return s.length === 1 && s[0].agentId === 'B' && /Bob suggests: Select approved products/.test(s[0].text); } },
    { id: 'suggest.labels', title: 'Every planner action has a label and a target window', test: () => JOB_PLAN_ACTIONS.every((a) => ACTION_LABELS[a.id] && ACTION_WINDOWS[a.id]) }
];
