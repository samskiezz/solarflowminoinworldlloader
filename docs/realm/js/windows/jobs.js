/** Jobs workbench: create jobs, track every stage task, gates and STC readiness. */
import { h, button, badge, progressBar, confirm, dataTable, toast, empty, download } from '../core/ui.js';
import { STAGES, stageTasks, completeTask, advanceStage, jobProgress, stageGate, validateForStcClaim, addNote, jobsByStage } from '../domain/jobs.js';
import { section, statCard, grid, row, stageBadge, form, issueList, jobPicker, avatar } from './_shared.js';
import { makeTestCtx, openWindow, q, qa, fire } from './_testing.js';

export function def(ctx) {
    return {
        id: 'jobs', title: ctx.t('nav.jobs'), icon: '📋', hotkey: 'O', width: 860, height: 560,
        tabs: [{ id: 'board', label: 'Board', icon: '▦' }, { id: 'detail', label: 'Job detail', icon: '🗂' }, { id: 'new', label: 'New job', icon: '＋' }, { id: 'list', label: 'All jobs', icon: '☰' }],
        render(body, { tab }) {
            if (tab === 'new') return renderNew(body, ctx);
            if (tab === 'detail') return renderDetail(body, ctx);
            if (tab === 'list') return renderList(body, ctx);
            return renderBoard(body, ctx);
        }
    };
}

function renderBoard(body, ctx) {
    const jobs = ctx.jobs();
    const lanes = jobsByStage(jobs);
    body.append(row(statCard('Open jobs', jobs.filter((j) => j.stage !== 'complete').length), statCard('Completed', jobs.filter((j) => j.stage === 'complete').length), statCard('kW in pipeline', jobs.filter((j) => j.stage !== 'complete').reduce((n, j) => n + j.systemKw, 0).toFixed(1)), button('＋ New job', () => ctx.wm.setTab('jobs', 'new'), { kind: 'primary' })));
    if (!jobs.length) { body.append(empty('No jobs yet. Create your first job to start the crew working.')); return; }
    body.append(h('div', { class: 'board' }, STAGES.map((stage) => h('div', { class: 'lane' }, h('div', { class: 'lane-title' }, stage.title, ' ', badge(String((lanes[stage.id] || []).length))),
        (lanes[stage.id] || []).map((job) => { const p = jobProgress(job); const agent = job.assignedTo ? ctx.world.agent(job.assignedTo) : null; return h('div', { class: `card job-card ${job.id === ctx.currentJobId() ? 'selected' : ''}`, onclick: () => { ctx.setCurrentJob(job.id); ctx.wm.setTab('jobs', 'detail'); } }, h('div', { class: 'card-title' }, job.customer), h('div', { class: 'card-sub' }, `${job.id} · ${job.systemKw} kW${job.batteryKwh ? ` + ${job.batteryKwh} kWh` : ''}`), progressBar(p.pct, { small: true }), agent ? h('div', { class: 'card-sub' }, avatar(agent, 'xs'), ' ', agent.name) : null); })))));
}

function renderNew(body, ctx) {
    const profile = ctx.profile();
    const f = form([
        { key: 'customer', label: 'Customer', type: 'text', placeholder: 'Name' },
        { key: 'address', label: 'Site address', type: 'text', placeholder: 'Street, suburb' },
        { key: 'postcode', label: 'Postcode', type: 'text', value: profile.postcode, hint: 'Sets the STC zone and state incentives' },
        { key: 'systemKw', label: 'PV system (kW)', value: 6.6, min: 0, step: 0.1 },
        { key: 'batteryKwh', label: 'Battery (kWh usable)', value: 0, min: 0, step: 0.5 },
        { key: 'phases', label: 'Supply phases', type: 'select', options: [{ value: '1', label: 'Single phase' }, { value: '3', label: 'Three phase' }], value: String(profile.phases || 1) },
        { key: 'assignedTo', label: 'Assign crew member', type: 'select', options: [{ value: '', label: '— unassigned —' }, ...ctx.world.crew().map((a) => ({ value: a.id, label: `${a.name} (${a.role})` }))] }
    ]);
    const err = h('div', { class: 'error-line' });
    body.append(section('Create a job', f.el, err, row(button('Create job', () => {
        const v = f.values();
        if (!v.customer || !/^\d{4}$/.test(String(v.postcode || ''))) { err.textContent = 'Customer name and a 4-digit postcode are required.'; return; }
        const job = ctx.world.addJob({ customer: v.customer, address: v.address, postcode: v.postcode, systemKw: v.systemKw || 0, batteryKwh: v.batteryKwh || 0, phases: Number(v.phases) });
        if (v.assignedTo) job.assignedTo = v.assignedTo;
        ctx.setCurrentJob(job.id);
        ctx.saveWorld();
        toast(`Job ${job.id} created for ${job.customer}`, { kind: 'ok' });
        ctx.wm.setTab('jobs', 'detail');
    }, { kind: 'primary' }))));
}

function renderDetail(body, ctx) {
    const job = ctx.currentJob();
    body.append(jobPicker(ctx, { onChange: () => ctx.refresh('jobs') }));
    if (!job) return;
    const p = jobProgress(job);
    const gate = stageGate(job);
    const claim = validateForStcClaim(job);
    const agent = job.assignedTo ? ctx.world.agent(job.assignedTo) : null;
    body.append(section(null, row(h('h2', { class: 'job-heading' }, job.customer, ' ', stageBadge(job.stage)), h('span', { class: 'muted' }, `${job.id} · ${job.address || 'no address'} · ${job.postcode}`)),
        grid(4, statCard('System', `${job.systemKw} kW`), statCard('Battery', job.batteryKwh ? `${job.batteryKwh} kWh` : '—'), statCard('Phases', String(job.phases)), statCard('Progress', `${p.done}/${p.total}`)),
        progressBar(p.pct, { label: `Stage ${p.stageIndex + 1}/${p.stages}` }),
        row(h('span', {}, 'Assigned: '), h('select', { class: 'input', onchange: (e) => { job.assignedTo = e.target.value || null; ctx.saveWorld(); ctx.refresh('jobs'); } }, h('option', { value: '' }, '— unassigned —'), ctx.world.crew().map((a) => h('option', { value: a.id, selected: job.assignedTo === a.id ? '' : null }, `${a.name} (${a.role})`))),
            agent ? button('Work next task', () => { const t = ctx.world.assignNextTask(agent.id, job.id); toast(t ? `${agent.name} is working on "${t.label}"` : 'No open task in this stage', { kind: t ? 'ok' : 'warn' }); ctx.saveWorld(); ctx.refresh('jobs'); }, { small: true }) : null)));
    // Stage tasks
    const stage = STAGES.find((s) => s.id === job.stage);
    body.append(section(`${stage.title} tasks`, h('ul', { class: 'tasks' }, stageTasks(job).map((task) => h('li', { class: `task ${task.done ? 'done' : ''}` }, h('label', {}, h('input', { type: 'checkbox', checked: task.done ? '' : null, onchange: (e) => { completeTask(job, task.key, e.target.checked, new Date(ctx.now()).toISOString()); ctx.saveWorld(); ctx.refresh('jobs'); } }), ' ', task.title)))),
        gate.length ? h('div', { class: 'gate' }, h('strong', {}, 'Gate blockers: '), issueList(gate)) : null,
        row(button(`Advance to next stage ➜`, () => { const r = advanceStage(job, new Date(ctx.now()).toISOString()); if (r.ok) { ctx.world.ledger && ctx.world.recordStat('stagesAdvanced'); ctx.notify('stage_advanced', `${job.customer} moved to ${r.stage}`, { jobId: job.id }); toast(`Advanced to ${r.stage}`, { kind: 'ok' }); } else toast(`${r.reason}${r.remaining ? `: ${r.remaining.join(', ')}` : ''}${r.blockers ? `: ${r.blockers.join('; ')}` : ''}`, { kind: 'warn', timeout: 6000 }); ctx.saveWorld(); ctx.refresh('jobs'); }, { kind: 'primary', small: true }),
            button('Open design calculators', () => ctx.open('spellbook'), { small: true }), button('Checklists', () => ctx.open('checklists'), { small: true }), button('Commissioning', () => ctx.open('commissioning'), { small: true }), button('Report', () => ctx.open('reports'), { small: true }))));
    // All stages overview
    body.append(section('Stage overview', h('div', { class: 'stage-track' }, STAGES.map((s, i) => { const tasks = stageTasks(job, s.id); const done = tasks.filter((t) => t.done).length; const state = i < p.stageIndex ? 'past' : i === p.stageIndex ? 'current' : 'future'; return h('div', { class: `stage-step ${state}`, tooltip: tasks.length ? `${done}/${tasks.length} tasks` : 'Final' }, h('span', { class: 'stage-dot' }, i + 1), h('span', { class: 'stage-name' }, s.title)); }))));
    // STC readiness + evidence
    const evidence = job.evidence || {};
    body.append(section('STC claim readiness', issueList(claim.issues, 'Eligible for STC claim'), grid(3, ...['serialPhotos', 'onSiteAttendance', 'ces'].map((k) => h('label', { class: 'field inline' }, h('input', { type: 'checkbox', checked: evidence[k] ? '' : null, onchange: (e) => { job.evidence = { ...(job.evidence || {}), [k]: e.target.checked }; ctx.saveWorld(); if (validateForStcClaim(job).eligible) ctx.world.recordStat('stcReady'); ctx.refresh('jobs'); } }), ' ', { serialPhotos: 'Serial number photos', onSiteAttendance: 'On-site attendance evidence', ces: 'Certificate of electrical safety' }[k]))),
        h('label', { class: 'field inline' }, h('input', { type: 'checkbox', checked: job.design.accreditedInstaller ? '' : null, onchange: (e) => { ctx.saveDesign(job.id, { accreditedInstaller: e.target.checked }); ctx.refresh('jobs'); } }), ' SAA accredited installer/designer assigned')));
    // Notes
    const noteInput = h('input', { type: 'text', class: 'input', placeholder: 'Add a note…', onkeydown: (e) => { if (e.key === 'Enter') addJobNote(); } });
    const addJobNote = () => { if (!noteInput.value.trim()) return; addNote(job, noteInput.value.trim(), ctx.profile().name, new Date(ctx.now()).toISOString()); ctx.saveWorld(); ctx.refresh('jobs'); };
    body.append(section('Notes & history', row(noteInput, button('Add', addJobNote, { small: true })), h('ul', { class: 'notes' }, [...job.notes].reverse().slice(0, 8).map((n) => h('li', {}, h('span', { class: 'muted' }, `${n.at.slice(0, 16).replace('T', ' ')} ${n.author}: `), n.text))),
        h('details', {}, h('summary', {}, `History (${job.history.length})`), h('ul', { class: 'notes' }, [...job.history].reverse().map((e) => h('li', {}, h('span', { class: 'muted' }, e.at.slice(0, 16).replace('T', ' ')), ` ${e.event}${e.to ? ` → ${e.to}` : ''}${e.task ? ` ${e.task}` : ''}`))))),
        row(button('Duplicate as new job', () => { const copy = duplicateJob(ctx, job); toast(`Created ${copy.id} from ${job.id}`, { kind: 'ok' }); ctx.refresh('jobs'); }, { small: true }), button('Export job (JSON)', () => download(`${job.id}.json`, exportJob(ctx, job), 'application/json'), { small: true }), button('Delete job', async () => { if (await confirm(`Delete ${job.id} (${job.customer})? This cannot be undone.`)) { ctx.world.jobs.splice(ctx.world.jobs.indexOf(job), 1); ctx.store.set(`designs.${job.id}`, undefined); ctx.saveWorld(); ctx.setCurrentJob(ctx.world.jobs[0]?.id || null); ctx.refresh('jobs'); } }, { kind: 'danger', small: true })));
}

export function duplicateJob(ctx, job) {
    const copy = ctx.world.addJob({ customer: `${job.customer} (copy)`, address: job.address, postcode: job.postcode, systemKw: job.systemKw, batteryKwh: job.batteryKwh, phases: job.phases });
    const d = ctx.design(job.id); const keep = {};
    for (const k of ['moduleId', 'inverterId', 'batteryId', 'modulesPerString', 'strings', 'moduleCount', 'arrayKwDc', 'arrayVocV', 'arrayIscA', 'acCableMm2', 'voltageRisePct', 'tiltDeg', 'azimuthDeg', 'dailyKwh', 'eveningSharePct', 'loads']) if (d[k] !== undefined) keep[k] = d[k];
    ctx.saveDesign(copy.id, keep); ctx.setCurrentJob(copy.id);
    return copy;
}
export function exportJob(ctx, job) { return JSON.stringify({ app: 'solarflow-realm', kind: 'job', exportedAt: new Date(ctx.now()).toISOString(), job, design: ctx.design(job.id) }, null, 2); }
export function importJob(ctx, json) {
    const data = typeof json === 'string' ? JSON.parse(json) : json;
    if (!data || data.kind !== 'job' || !data.job || !data.job.tasks) throw new Error('Not a SolarFlow Realm job file');
    const job = { ...data.job };
    if (ctx.job(job.id)) job.id = `${job.id}-IMPORT`;
    ctx.world.jobs.push(job); ctx.world.stats.jobsCreated++;
    if (data.design) ctx.store.set(`designs.${job.id}`, data.design);
    ctx.setCurrentJob(job.id); ctx.saveWorld();
    return job;
}

function renderList(body, ctx) {
    const fileInput = h('input', { type: 'file', accept: '.json,application/json', class: 'input' });
    body.append(row(fileInput, button('Import job file', () => { const f = fileInput.files && fileInput.files[0]; if (!f) { toast('Choose a job file', { kind: 'warn' }); return; } f.text().then((text) => { try { const j = importJob(ctx, text); toast(`Imported ${j.id}`, { kind: 'ok' }); ctx.refresh('jobs'); } catch (e) { toast(e.message, { kind: 'bad' }); } }); }, { small: true })));
    const rows = ctx.jobs().map((j) => ({ ...j, progress: jobProgress(j).pct, stageTitle: STAGES.find((s) => s.id === j.stage)?.title }));
    body.append(dataTable({ columns: [{ key: 'id', label: 'ID' }, { key: 'customer', label: 'Customer' }, { key: 'postcode', label: 'Postcode' }, { key: 'systemKw', label: 'kW', align: 'right' }, { key: 'batteryKwh', label: 'kWh', align: 'right' }, { key: 'stageTitle', label: 'Stage' }, { key: 'progress', label: 'Progress', align: 'right', render: (r) => `${r.progress} %` }, { key: 'updatedAt', label: 'Updated', render: (r) => r.updatedAt.slice(0, 10) }], rows, onRow: (r) => { ctx.setCurrentJob(r.id); ctx.wm.setTab('jobs', 'detail'); }, searchKeys: ['id', 'customer', 'postcode', 'stageTitle'], emptyText: 'No jobs' }).el);
}

export const FEATURES = [
    { id: 'win.jobs.board', title: 'Kanban board of jobs by stage', dom: true, test: () => { const t = makeTestCtx(); const b = openWindow(t.ctx, def(t.ctx), { tab: 'board' }); const ok = qa(b, '.lane').length === 9 && qa(b, '.job-card').length === 1; t.done(); return ok; } },
    { id: 'win.jobs.create', title: 'Create a job from the form with validation', dom: true, test: () => { const t = makeTestCtx({ withJob: false }); const b = openWindow(t.ctx, def(t.ctx), { tab: 'new' }); qa(b, 'button').find((x) => x.textContent === 'Create job').click(); const rejected = t.ctx.jobs().length === 0 && q(b, '.error-line').textContent.length > 0; const inputs = qa(b, 'input'); inputs[0].value = 'Ann'; fire(inputs[0]); inputs[2].value = '3000'; fire(inputs[2]); qa(b, 'button').find((x) => x.textContent === 'Create job').click(); const made = t.ctx.jobs().length === 1 && t.ctx.jobs()[0].postcode === '3000' && t.ctx.wm.windows.get('jobs').tab === 'detail'; t.done(); return rejected && made; } },
    { id: 'win.jobs.tasks', title: 'Tick stage tasks and persist', dom: true, test: () => { const t = makeTestCtx(); const b = openWindow(t.ctx, def(t.ctx), { tab: 'detail' }); const cb = q(b, '.tasks input'); cb.checked = true; fire(cb, 'change'); const ok = t.job.tasks['lead:Capture site address and postcode'] === true && t.ctx.store.get('world').jobs[0].tasks['lead:Capture site address and postcode'] === true; t.done(); return ok; } },
    { id: 'win.jobs.advance', title: 'Advance stage only when tasks are complete', dom: true, test: () => { const t = makeTestCtx(); let b = openWindow(t.ctx, def(t.ctx), { tab: 'detail' }); qa(b, 'button').find((x) => x.textContent.startsWith('Advance')).click(); const blocked = t.job.stage === 'lead'; for (const k of Object.keys(t.job.tasks)) if (k.startsWith('lead:')) t.job.tasks[k] = true; t.ctx.refresh('jobs'); b = t.ctx.wm.windows.get('jobs').body; qa(b, 'button').find((x) => x.textContent.startsWith('Advance')).click(); const ok = blocked && t.job.stage === 'design'; t.done(); return ok; } },
    { id: 'win.jobs.assign', title: 'Assign a crew member and start the next task', dom: true, test: () => { const t = makeTestCtx(); let b = openWindow(t.ctx, def(t.ctx), { tab: 'detail' }); const sel = q(b, 'select.input:not(.job-picker select)'); sel.value = 'ATLAS'; fire(sel, 'change'); b = t.ctx.wm.windows.get('jobs').body; qa(b, 'button').find((x) => x.textContent === 'Work next task').click(); const ok = t.job.assignedTo === 'ATLAS' && t.ctx.world.agent('ATLAS').currentTask && t.ctx.world.agent('ATLAS').currentTask.jobId === t.job.id; t.done(); return ok; } },
    { id: 'win.jobs.stcReadiness', title: 'STC claim readiness with evidence checkboxes', dom: true, test: () => { const t = makeTestCtx(); const b = openWindow(t.ctx, def(t.ctx), { tab: 'detail' }); const before = qa(b, '.issues .issue').length; const cb = qa(b, '.field.inline input')[0]; cb.checked = true; fire(cb, 'change'); const ok = before >= 5 && t.job.evidence.serialPhotos === true; t.done(); return ok; } },
    { id: 'win.jobs.notes', title: 'Add timestamped notes', dom: true, test: () => { const t = makeTestCtx(); const b = openWindow(t.ctx, def(t.ctx), { tab: 'detail' }); const input = q(b, 'input[placeholder="Add a note…"]'); input.value = 'Roof is tile'; input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' })); const ok = t.job.notes.length === 1 && t.job.notes[0].text === 'Roof is tile'; t.done(); return ok; } },
    { id: 'win.jobs.list', title: 'Searchable job table', dom: true, test: () => { const t = makeTestCtx(); const b = openWindow(t.ctx, def(t.ctx), { tab: 'list' }); const ok = qa(b, 'tbody tr').length === 1 && q(b, 'tbody td').textContent === t.job.id; t.done(); return ok; } },
    { id: 'win.jobs.duplicate', title: 'Duplicate a job as a template (design carried, evidence reset)', dom: true, test: () => { const t = makeTestCtx(); t.ctx.saveDesign(t.job.id, { moduleId: 'PV-A440', stcs: 70, productsApproved: true }); t.job.tasks['lead:Capture site address and postcode'] = true; const c = duplicateJob(t.ctx, t.job); const d = t.ctx.design(c.id); const ok = c.stage === 'lead' && Object.values(c.tasks).every((v) => v === false) && d.moduleId === 'PV-A440' && d.stcs === undefined && d.productsApproved === undefined && t.ctx.currentJobId() === c.id; t.done(); return ok; } },
    { id: 'win.jobs.exportImport', title: 'Export and import a single job with its design', dom: true, test: () => { const t = makeTestCtx(); t.ctx.saveDesign(t.job.id, { moduleId: 'PV-A440' }); const json = exportJob(t.ctx, t.job); const j = importJob(t.ctx, json); let bad = false; try { importJob(t.ctx, '{"x":1}'); } catch (e) { bad = true; } const ok = j.id === `${t.job.id}-IMPORT` && t.ctx.jobs().length === 2 && t.ctx.design(j.id).moduleId === 'PV-A440' && bad; t.done(); return ok; } },
    { id: 'win.jobs.stageTrack', title: 'Nine-stage progress track', dom: true, test: () => { const t = makeTestCtx(); const b = openWindow(t.ctx, def(t.ctx), { tab: 'detail' }); const ok = qa(b, '.stage-step').length === 9 && q(b, '.stage-step.current .stage-name').textContent === 'Lead'; t.done(); return ok; } }
];
