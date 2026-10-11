/**
 * Job pipeline: a job moves through stages, each with tasks and required
 * documents. Jobs are plain objects so they serialise to the store.
 */
import { num, round } from './pv.js';
import { applicableChecklists, evaluateChecklist } from './checklists.js';

export const STAGES = [
    { id: 'lead', title: 'Lead', tasks: ['Capture site address and postcode', 'Record consumption (bills or load profile)', 'Confirm DNSP and phase supply'] },
    { id: 'design', title: 'Design', tasks: ['Select approved modules, inverter and battery', 'String sizing and array voltage check', 'Voltage rise and cable sizing', 'Battery location assessment', 'Yield and savings estimate'] },
    { id: 'quote', title: 'Quote', tasks: ['STC entitlement calculated', 'State incentives checked', 'Proposal issued', 'Customer acceptance recorded'] },
    { id: 'approval', title: 'Approvals', tasks: ['DNSP connection application lodged', 'DNSP approval received', 'Export limit confirmed'] },
    { id: 'install', title: 'Install', tasks: ['Site safety / SWMS completed', 'Array and inverter installed', 'Battery installed', 'Labels fitted'] },
    { id: 'commission', title: 'Commission', tasks: ['Commissioning tests recorded', 'Inverter settings verified', 'Checklists completed'] },
    { id: 'claim', title: 'STC claim', tasks: ['Serial numbers and photos uploaded', 'STC assignment signed', 'Certificate of electrical safety lodged'] },
    { id: 'handover', title: 'Handover', tasks: ['Owner documentation delivered', 'Monitoring demonstrated', 'Warranty pack issued'] },
    { id: 'complete', title: 'Complete', tasks: [] }
];

export const STAGE_IDS = STAGES.map((s) => s.id);

let jobSequence = 0;
export function createJob({ id, customer, address, postcode, systemKw = 0, batteryKwh = 0, phases = 1, createdAt = new Date().toISOString() }) {
    return {
        id: id || `JOB-${Date.now().toString(36).toUpperCase()}${(jobSequence++ % 1296).toString(36).toUpperCase().padStart(2, '0')}`,
        customer: String(customer || 'Customer'),
        address: String(address || ''),
        postcode: String(postcode || ''),
        systemKw: num(systemKw, 0),
        batteryKwh: num(batteryKwh, 0),
        phases: num(phases, 1),
        stage: 'lead',
        createdAt,
        updatedAt: createdAt,
        tasks: Object.fromEntries(STAGES.flatMap((s) => s.tasks.map((t) => [`${s.id}:${t}`, false]))),
        checklists: {},
        tests: {},
        design: {},
        notes: [],
        assignedTo: null,
        history: [{ at: createdAt, event: 'created' }]
    };
}

export function stageIndex(stageId) {
    return STAGE_IDS.indexOf(stageId);
}

export function stageTasks(job, stageId = job.stage) {
    const stage = STAGES.find((s) => s.id === stageId);
    return stage ? stage.tasks.map((t) => ({ key: `${stage.id}:${t}`, title: t, done: Boolean(job.tasks[`${stage.id}:${t}`]) })) : [];
}

export function completeTask(job, taskKey, done = true, at = new Date().toISOString()) {
    if (!(taskKey in job.tasks)) throw new Error(`Unknown task ${taskKey}`);
    job.tasks[taskKey] = Boolean(done);
    job.updatedAt = at;
    job.history.push({ at, event: done ? 'task_done' : 'task_reopened', task: taskKey });
    return job;
}

export function stageComplete(job, stageId = job.stage) {
    return stageTasks(job, stageId).every((t) => t.done);
}

/** Gate checks that must hold before moving on from certain stages. */
export function stageGate(job, stageId = job.stage) {
    const blockers = [];
    if (stageId === 'commission') {
        const ids = applicableChecklists({ hasPv: job.systemKw > 0, hasBattery: job.batteryKwh > 0 });
        for (const id of ids) {
            const result = evaluateChecklist(id, job.checklists[id] || {});
            if (result.status !== 'PASS' && result.status !== 'DEFECTS') blockers.push(`${result.title}: ${result.status}`);
        }
        if (!job.tests.status || job.tests.status !== 'PASS') blockers.push('Commissioning tests not passed');
    }
    if (stageId === 'claim' && !job.design.productsApproved) blockers.push('Products not confirmed on CEC approved lists');
    return blockers;
}

export function advanceStage(job, at = new Date().toISOString()) {
    const index = stageIndex(job.stage);
    if (index < 0 || index >= STAGE_IDS.length - 1) return { ok: false, reason: 'Job already complete' };
    if (!stageComplete(job)) return { ok: false, reason: 'Stage tasks incomplete', remaining: stageTasks(job).filter((t) => !t.done).map((t) => t.title) };
    const blockers = stageGate(job);
    if (blockers.length) return { ok: false, reason: 'Gate failed', blockers };
    const from = job.stage;
    job.stage = STAGE_IDS[index + 1];
    job.updatedAt = at;
    job.history.push({ at, event: 'stage_advanced', from, to: job.stage });
    return { ok: true, stage: job.stage };
}

export function jobProgress(job) {
    const keys = Object.keys(job.tasks);
    const done = keys.filter((k) => job.tasks[k]).length;
    return { done, total: keys.length, pct: keys.length ? round((done / keys.length) * 100, 0) : 100, stage: job.stage, stageIndex: stageIndex(job.stage), stages: STAGE_IDS.length };
}

/** What must be true for an STC claim (CER). */
export function validateForStcClaim(job) {
    const issues = [];
    if (!job.design.productsApproved) issues.push('All products must be on the CEC approved lists at installation date');
    if (!job.design.accreditedInstaller) issues.push('SAA accredited installer/designer required');
    if (!job.tests.status || job.tests.status !== 'PASS') issues.push('Commissioning tests must pass');
    if (!job.evidence || !job.evidence.serialPhotos) issues.push('Serial number photos required');
    if (!job.evidence || !job.evidence.onSiteAttendance) issues.push('On-site attendance evidence required');
    if (!job.evidence || !job.evidence.ces) issues.push('Certificate of electrical safety required');
    if (job.systemKw > 100) issues.push('System > 100 kW is not a small generation unit');
    return { eligible: issues.length === 0, issues };
}

export function addNote(job, text, author = 'user', at = new Date().toISOString()) {
    job.notes.push({ at, author, text: String(text).slice(0, 2000) });
    job.updatedAt = at;
    return job;
}

export function jobsByStage(jobs = []) {
    const groups = Object.fromEntries(STAGE_IDS.map((id) => [id, []]));
    for (const job of jobs) (groups[job.stage] || (groups[job.stage] = [])).push(job);
    return groups;
}

export const FEATURES = [
    { id: 'jobs.stages', title: 'Job pipeline (9 stages, 28 tasks)', test: () => STAGES.length === 9 && STAGES.reduce((n, s) => n + s.tasks.length, 0) === 28 },
    { id: 'jobs.createJob', title: 'Create job with task map', test: () => { const j = createJob({ customer: 'A', postcode: '2000', systemKw: 6.6 }); return j.stage === 'lead' && Object.keys(j.tasks).length === 28; } },
    { id: 'jobs.completeTask', title: 'Complete and reopen tasks', test: () => { const j = createJob({}); completeTask(j, 'lead:Capture site address and postcode'); return stageTasks(j)[0].done && j.history.length === 2; } },
    { id: 'jobs.advanceStage.blocked', title: 'Stage advance blocked by incomplete tasks', test: () => advanceStage(createJob({})).ok === false },
    { id: 'jobs.advanceStage', title: 'Stage advance when tasks complete', test: () => { const j = createJob({}); for (const t of stageTasks(j)) completeTask(j, t.key); return advanceStage(j).ok && j.stage === 'design'; } },
    { id: 'jobs.stageGate', title: 'Commissioning gate requires checklists and tests', test: () => { const j = createJob({ systemKw: 6.6 }); j.stage = 'commission'; return stageGate(j).length >= 2; } },
    { id: 'jobs.progress', title: 'Job progress percentage', test: () => { const j = createJob({}); completeTask(j, 'lead:Capture site address and postcode'); return jobProgress(j).pct === 4; } },
    { id: 'jobs.validateForStcClaim', title: 'STC claim readiness validation', test: () => { const j = createJob({ systemKw: 6.6 }); const a = validateForStcClaim(j); j.design = { productsApproved: true, accreditedInstaller: true }; j.tests = { status: 'PASS' }; j.evidence = { serialPhotos: true, onSiteAttendance: true, ces: true }; return !a.eligible && validateForStcClaim(j).eligible; } },
    { id: 'jobs.addNote', title: 'Job notes', test: () => addNote(createJob({}), 'hello').notes.length === 1 },
    { id: 'jobs.jobsByStage', title: 'Group jobs by stage', test: () => jobsByStage([createJob({}), createJob({})]).lead.length === 2 }
];
