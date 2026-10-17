/**
 * The Workforce: Ultron at the top, a chief of staff, department managers
 * drawn from the named crew, and a thousand-strong body of workers organised
 * in teams. Every piece of work in the Realm – a job stage, a business
 * finding, a passage to study, an audit request – becomes a Task that flows
 * research → execute → audit → review → manager sign-off, with hand-offs
 * between teams and rework when an audit fails. Deterministic from the
 * world's random stream; the whole state round-trips as JSON.
 */

export const ULTRON = { id: 'ULTRON', name: 'Ultron', title: 'Overarching leader', blurb: 'Sets the standard, routes the work, signs the last line.' };

/** Teams, in the order work flows through them for most tasks. */
export const TEAMS = [
    { id: 'research', name: 'Research', managerId: 'LUMEN', managerTitle: 'Head of Research', skillTag: 'study', share: 0.10, colour: '#8fd0ff' },
    { id: 'design', name: 'Design', managerId: 'NOVA', managerTitle: 'Head of Design', skillTag: 'design', share: 0.10, colour: '#a06bff' },
    { id: 'compliance', name: 'Compliance', managerId: 'PRISM', managerTitle: 'Head of Compliance', skillTag: 'audit', share: 0.10, colour: '#e2b14a' },
    { id: 'install', name: 'Install crews', managerId: 'BOLT', managerTitle: 'Install Manager', skillTag: 'install', share: 0.16, colour: '#ff7a45' },
    { id: 'grid', name: 'Grid & network', managerId: 'EMBER', managerTitle: 'Grid Connection Officer', skillTag: 'grid', share: 0.06, colour: '#3ddc84' },
    { id: 'commissioning', name: 'Commissioning', managerId: 'SENTRY', managerTitle: 'Inspection & Audit Lead', skillTag: 'commission', share: 0.08, colour: '#4f8cff' },
    { id: 'incentives', name: 'Incentives & STCs', managerId: 'VAULT', managerTitle: 'STC Registrar', skillTag: 'stc', share: 0.05, colour: '#ffd166' },
    { id: 'finance', name: 'Finance', managerId: 'ORBIT', managerTitle: 'Finance Manager', skillTag: 'audit', share: 0.07, colour: '#c0c8d8' },
    { id: 'customer', name: 'Customer care', managerId: 'AURORA', managerTitle: 'Customer Lead', skillTag: 'handover', share: 0.08, colour: '#ff9ecf' },
    { id: 'documents', name: 'Documents', managerId: 'SABLE', managerTitle: 'Standards Librarian', skillTag: 'study', share: 0.06, colour: '#9fb5ff' },
    { id: 'audit', name: 'Audit', managerId: 'SENTRY', managerTitle: 'Inspection & Audit Lead', skillTag: 'audit', share: 0.07, colour: '#ff5f6d' },
    { id: 'review', name: 'Review board', managerId: 'ATLAS', managerTitle: 'Chief of Staff', skillTag: 'audit', share: 0.07, colour: '#f4e3b2' }
];
export const TEAM_BY_ID = Object.fromEntries(TEAMS.map((t) => [t.id, t]));
export const STAGE_HOURS = { research: 2, execute: 4, audit: 1, review: 1, signoff: 0.5 };
/** Which team executes a job task, from its skill tag. */
export const EXECUTE_TEAM = { design: 'design', calculate: 'design', audit: 'compliance', checklist: 'compliance', install: 'install', commission: 'commissioning', battery: 'install', grid: 'grid', stc: 'incentives', handover: 'customer', study: 'documents', inspect: 'compliance' };
export const FINDING_TEAM = { money: 'finance', finance: 'finance', cash: 'finance', receivables: 'finance', payables: 'finance', invoices: 'finance', bills: 'finance', work: 'install', jobs: 'install', pipeline: 'customer', customers: 'customer', inbox: 'customer', email: 'customer', communication: 'customer', documents: 'documents', packs: 'documents', compliance: 'compliance', safety: 'compliance', grid: 'grid', social: 'customer', staff: 'install', calendar: 'customer', market: 'research', bank: 'finance' };

const FIRST = ['Ada', 'Ben', 'Cleo', 'Dev', 'Eli', 'Fay', 'Gus', 'Hana', 'Ivo', 'Jun', 'Kai', 'Lia', 'Mo', 'Nia', 'Oz', 'Pia', 'Quin', 'Rae', 'Sol', 'Tam', 'Uma', 'Vic', 'Wes', 'Xia', 'Yas', 'Zed', 'Ari', 'Bea', 'Cal', 'Dee', 'Eve', 'Fin', 'Gil', 'Hal', 'Ida', 'Jo', 'Kit', 'Lu', 'Mia', 'Ned', 'Ola', 'Pat', 'Rio', 'Sam', 'Tia', 'Val', 'Win', 'Zia'];
const LAST = ['Amp', 'Bolt', 'Cable', 'Diode', 'Earth', 'Fuse', 'Gauge', 'Hertz', 'Isolator', 'Joule', 'Kelvin', 'Lumen', 'Meter', 'Neutral', 'Ohm', 'Phase', 'Quanta', 'Relay', 'String', 'Tesla', 'Ultra', 'Volt', 'Watt', 'Xeno', 'Yield', 'Zener'];
function hashOf(text) { let x = 2166136261; for (const c of String(text)) { x ^= c.charCodeAt(0); x = Math.imul(x, 16777619) >>> 0; } return x; }
function seeded(seed) { let a = hashOf(seed) >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

/** Generate the workforce deterministically: `size` workers spread over the teams by share, with ranks and skills. */
export function generateWorkers(size = 1000, seed = 'solarhaven') {
    const random = seeded(`workforce:${seed}`);
    const workers = []; let n = 0;
    for (const team of TEAMS) {
        const count = Math.max(2, Math.round(size * team.share));
        for (let i = 0; i < count; i++) {
            const skill = Math.round((0.35 + random() * 0.6) * 100) / 100;
            const rank = i === 0 ? 'lead' : skill > 0.8 ? 'senior' : skill < 0.5 ? 'junior' : 'worker';
            workers.push({ id: `W${String(++n).padStart(4, '0')}`, name: `${FIRST[Math.floor(random() * FIRST.length)]} ${LAST[Math.floor(random() * LAST.length)]}`, team: team.id, rank, skill, status: 'idle', task: null, done: 0, rejected: 0 });
        }
    }
    return workers;
}

/** The stages a task walks, from the executing team: research → execute → audit → review → sign-off. */
export function pipelineFor(executeTeam) {
    return [{ role: 'research', team: 'research' }, { role: 'execute', team: executeTeam }, { role: 'audit', team: 'audit' }, { role: 'review', team: 'review' }, { role: 'signoff', team: 'managers' }];
}

export class Workforce {
    constructor({ size = 1000, seed = 'solarhaven', workers = null, tasks = [], log = [], stats = null, nextId = 1, hoursSinceSweep = 0 } = {}) {
        this.size = size; this.seed = seed;
        this.workers = workers || generateWorkers(size, seed);
        this.tasks = tasks; this.log = log; this.nextId = nextId; this.hoursSinceSweep = hoursSinceSweep;
        this.stats = { created: 0, done: 0, rejected: 0, handoffs: 0, signoffs: 0, byTeam: {}, ...(stats || {}) };
        this.listeners = [];
    }
    team(id) { return TEAM_BY_ID[id] || null; }
    workersOf(teamId) { return this.workers.filter((w) => w.team === teamId); }
    idle(teamId) { return this.workers.filter((w) => w.team === teamId && w.status === 'idle'); }
    managerFor(teamId, agents = []) { const t = this.team(teamId); const a = t ? agents.find((x) => x.id === t.managerId) : null; return a ? { id: a.id, name: a.name, title: t.managerTitle } : t ? { id: t.managerId, name: t.managerId[0] + t.managerId.slice(1).toLowerCase(), title: t.managerTitle } : null; }
    /** Hierarchy for the window: Ultron → chief of staff → managers → teams. */
    hierarchy(agents = []) {
        const chief = agents.find((a) => a.id === 'ATLAS');
        return { leader: ULTRON, chief: chief ? { id: chief.id, name: chief.name, title: 'Chief of Staff' } : { id: 'ATLAS', name: 'Atlas', title: 'Chief of Staff' }, teams: TEAMS.map((t) => ({ ...t, manager: this.managerFor(t.id, agents), headcount: this.workersOf(t.id).length, busy: this.workersOf(t.id).filter((w) => w.status === 'busy').length, queued: this.tasks.filter((x) => x.status === 'queued' && this.currentStage(x).team === t.id).length, done: this.stats.byTeam[t.id] || 0 })) };
    }

    /** Add a task unless the same ref is already in flight. */
    addTask({ kind, subject, ref, executeTeam, priority = 2, meta = {} }, at = 0) {
        if (ref && this.tasks.some((t) => t.ref === ref && t.status !== 'done')) return null;
        const team = TEAM_BY_ID[executeTeam] ? executeTeam : 'install';
        const task = { id: `T${String(this.nextId++).padStart(5, '0')}`, kind, subject, ref: ref || null, executeTeam: team, priority, meta, stages: pipelineFor(team), stageIndex: 0, status: 'queued', worker: null, remainingH: 0, history: [], createdAt: at, doneAt: null, reworks: 0 };
        this.tasks.push(task); this.stats.created++;
        if (this.tasks.length > 600) { const done = this.tasks.filter((t) => t.status === 'done'); if (done.length > 150) { const drop = new Set(done.slice(0, done.length - 150).map((t) => t.id)); this.tasks = this.tasks.filter((t) => !drop.has(t.id)); } }
        return task;
    }
    currentStage(task) { return task.stages[Math.min(task.stageIndex, task.stages.length - 1)]; }

    /** Turn the world's open work into tasks: every open job stage task, every open business finding, and a study sweep for the documents team. */
    sweep(world, { findings = [] } = {}) {
        let added = 0;
        for (const job of world.jobs) {
            if (job.stage === 'complete') continue;
            const open = Object.entries(job.tasks || {}).filter(([, done]) => !done).slice(0, 2);
            for (const [key] of open) { const title = key.split(':')[1] || key; const tag = inferTag(title, job.stage); const t = this.addTask({ kind: 'job', subject: `${title} – ${job.customer}`, ref: `job:${job.id}:${key}`, executeTeam: EXECUTE_TEAM[tag] || 'install', priority: job.suburb ? 1 : 2, meta: { jobId: job.id, key } }, world.time); if (t) added++; }
        }
        for (const f of findings.slice(0, 60)) { const team = FINDING_TEAM[String(f.category || '').toLowerCase()] || 'customer'; const t = this.addTask({ kind: 'finding', subject: f.title, ref: `finding:${f.id}`, executeTeam: team, priority: f.severity === 'critical' ? 0 : f.severity === 'high' ? 1 : 2, meta: { findingId: f.id, severity: f.severity } }, world.time); if (t) added++; }
        const lib = world.library; const books = lib && lib.index ? lib.index.books : [];
        for (const b of books.slice(0, 14)) { const t = this.addTask({ kind: 'study', subject: `Study ${b.code}`, ref: `study:${b.id}:${Math.floor(world.hour / 24)}`, executeTeam: 'documents', priority: 3, meta: { bookId: b.id } }, world.time); if (t) added++; }
        return added;
    }

    /** Advance by hours: assign queued tasks to idle workers, finish stages, hand off, rework on failed audits, sign off at the top. */
    tick(world, hours = 1) {
        const random = world.random; const at = world.time;
        this.hoursSinceSweep += hours;
        if (this.hoursSinceSweep >= 6) { this.hoursSinceSweep = 0; this.sweep(world, { findings: world.findings || [] }); }
        // progress active tasks
        for (const task of this.tasks) {
            if (task.status !== 'active') continue;
            const worker = this.workers.find((w) => w.id === task.worker);
            task.remainingH -= hours * (worker ? 0.7 + worker.skill * 0.6 : 1);
            if (task.remainingH > 0) continue;
            const stage = this.currentStage(task);
            if (worker) { worker.status = 'idle'; worker.task = null; worker.done++; }
            let outcome = 'passed';
            if (stage.role === 'audit' && random() > 0.55 + (worker ? worker.skill * 0.4 : 0.3) + Math.min(0.1, task.reworks * 0.05)) outcome = 'rework';
            task.history.push({ stage: stage.role, team: stage.team, worker: task.worker, at, outcome });
            if (outcome === 'rework') { task.reworks++; this.stats.rejected++; if (worker) worker.rejected++; task.stageIndex = 1; task.status = 'queued'; task.worker = null; this.note(world, `${task.id} ${task.subject}: audit sent it back to ${this.team(task.executeTeam).name} for rework`, 'rework', task); continue; }
            task.stageIndex++; task.worker = null; this.stats.handoffs++;
            if (task.stageIndex >= task.stages.length) { task.status = 'done'; task.doneAt = at; this.stats.done++; this.stats.signoffs++; if (task.kind === 'feature' && world.programme) world.programme.onSignoff(task, world); this.stats.byTeam[task.executeTeam] = (this.stats.byTeam[task.executeTeam] || 0) + 1; this.note(world, `${ULTRON.name} signed off ${task.subject} (${task.kind}, ${task.history.length} hand-offs${task.reworks ? `, ${task.reworks} rework` : ''})`, 'signoff', task); continue; }
            task.status = 'queued';
        }
        // assign queued work, highest priority first
        const queued = this.tasks.filter((t) => t.status === 'queued').sort((a, b) => a.priority - b.priority || a.createdAt - b.createdAt);
        for (const task of queued) {
            const stage = this.currentStage(task);
            if (stage.team === 'managers') { task.status = 'active'; task.worker = `MGR:${this.team(task.executeTeam).managerId}`; task.remainingH = STAGE_HOURS.signoff; continue; }
            const pool = this.idle(stage.team); if (!pool.length) continue;
            const worker = pool[Math.floor(random() * pool.length)];
            worker.status = 'busy'; worker.task = task.id; task.worker = worker.id; task.status = 'active'; task.remainingH = STAGE_HOURS[stage.role] || 2;
        }
        return this.stats;
    }
    note(world, text, kind, task) {
        const entry = { at: world.time, kind, text, taskId: task.id, team: task.executeTeam };
        this.log.push(entry); if (this.log.length > 200) this.log.splice(0, this.log.length - 200);
        if (kind === 'signoff' && task.kind !== 'study') world.emit({ type: 'workforce', text, taskId: task.id });
        for (const l of this.listeners) { try { l(entry); } catch { /* never break the sim */ } }
    }
    summary() {
        const active = this.tasks.filter((t) => t.status === 'active').length; const queued = this.tasks.filter((t) => t.status === 'queued').length;
        return { leader: ULTRON.name, workers: this.workers.length, busy: this.workers.filter((w) => w.status === 'busy').length, teams: TEAMS.length, tasks: { active, queued, done: this.stats.done, created: this.stats.created, rejected: this.stats.rejected }, handoffs: this.stats.handoffs, signoffs: this.stats.signoffs };
    }
    board(limit = 40) { return this.tasks.filter((t) => t.status !== 'done').sort((a, b) => a.priority - b.priority || a.createdAt - b.createdAt).slice(0, limit).map((t) => ({ ...t, stage: this.currentStage(t), teamName: (this.team(this.currentStage(t).team) || { name: 'Managers' }).name })); }
    toJSON() { return { size: this.size, seed: this.seed, workers: this.workers, tasks: this.tasks.slice(-400), log: this.log.slice(-100), stats: this.stats, nextId: this.nextId, hoursSinceSweep: this.hoursSinceSweep }; }
    static fromJSON(data) { return new Workforce(data || {}); }
}

/** Task title → skill tag (mirrors world.inferTag without importing the world). */
export function inferTag(title, stage) {
    const t = String(title).toLowerCase();
    if (/string|array|design|layout|yield/.test(t)) return 'design';
    if (/voltage|cable/.test(t)) return 'calculate';
    if (/battery/.test(t)) return 'battery';
    if (/stc|incentive|certificate|serial|assignment/.test(t)) return 'stc';
    if (/dnsp|export|approval/.test(t)) return 'grid';
    if (/install|array and|labels|safety/.test(t)) return 'install';
    if (/test|commission|settings|checklist/.test(t)) return 'commission';
    if (/owner|monitoring|warranty|proposal|customer|handover/.test(t)) return 'handover';
    return stage === 'lead' ? 'handover' : 'audit';
}

const fakeWorld = (seed = 1) => { let s = seed; const random = () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; return { random, time: 0, hour: 0, jobs: [], findings: [], library: null, feed: [], emit(e) { this.feed.push(e); } }; };
export const FEATURES = [
    { id: 'workforce.hierarchy', title: 'Ultron leads a chief of staff, twelve managers drawn from the named crew, and a thousand workers in teams', test: () => { const w = new Workforce({ size: 1000 }); const h = w.hierarchy([]); return h.leader.id === 'ULTRON' && h.chief.id === 'ATLAS' && h.teams.length === 12 && w.workers.length >= 1000 && w.workers.length <= 1012 && h.teams.every((t) => t.headcount >= 2 && t.manager && t.manager.title) && new Set(w.workers.map((x) => x.id)).size === w.workers.length; } },
    { id: 'workforce.deterministic', title: 'The same seed produces the same workforce', test: () => JSON.stringify(generateWorkers(300, 'a')) === JSON.stringify(generateWorkers(300, 'a')) && JSON.stringify(generateWorkers(300, 'a')) !== JSON.stringify(generateWorkers(300, 'b')) },
    { id: 'workforce.pipeline', title: 'Every task walks research → execute → audit → review → sign-off with hand-offs between teams', test: () => { const w = new Workforce({ size: 200 }); const world = fakeWorld(3); const t = w.addTask({ kind: 'job', subject: 'String sizing – Ann', ref: 'job:J1:design:x', executeTeam: 'design' }, 0); const dup = w.addTask({ kind: 'job', subject: 'again', ref: 'job:J1:design:x', executeTeam: 'design' }, 0); for (let i = 0; i < 60 && t.status !== 'done'; i++) { world.time += 3600000; w.tick(world, 1); } return dup === null && t.status === 'done' && t.history.map((h) => h.stage).filter((s, i, a) => a.indexOf(s) === i).join(',') === 'research,execute,audit,review,signoff' && w.stats.signoffs === 1 && world.feed.some((e) => e.type === 'workforce'); } },
    { id: 'workforce.rework', title: 'A failed audit sends the task back to the executing team and counts a rejection', test: () => { const w = new Workforce({ size: 200 }); let reworks = 0; let done = 0; for (let k = 0; k < 30; k++) w.addTask({ kind: 'finding', subject: `F${k}`, ref: `finding:${k}`, executeTeam: 'finance', priority: 1 }, 0); const world = fakeWorld(5); for (let i = 0; i < 80; i++) { world.time += 3600000; w.tick(world, 1); } for (const t of w.tasks) { reworks += t.reworks; if (t.status === 'done') done++; } return reworks >= 1 && done >= 20 && w.stats.rejected === reworks && w.log.some((l) => l.kind === 'rework'); } },
    { id: 'workforce.sweep', title: 'The sweep turns open job tasks, business findings and library books into tasks routed to the right teams', test: async () => { const { World } = await import('./world.js'); const { createLibrary, FIXTURE } = await import('../domain/library.js'); const world = new World({ seed: 2 }); world.library = createLibrary(FIXTURE); world.addJob({ customer: 'Ann' }); world.findings = [{ id: 'f1', title: 'Overdue invoices', category: 'money', severity: 'high' }]; const w = new Workforce({ size: 100 }); const added = w.sweep(world, { findings: world.findings }); const teams = new Set(w.tasks.map((t) => t.executeTeam)); return added >= 4 && teams.has('finance') && teams.has('documents') && w.tasks.some((t) => t.kind === 'job') && w.tasks.find((t) => t.kind === 'finding').priority === 1; } },
    { id: 'workforce.world', title: 'The world runs the workforce: work sweeps in every six hours, flows through the teams, and the state round-trips', test: async () => { const { World } = await import('./world.js'); const w = new World({ seed: 9 }); w.addJob({ customer: 'Bo' }); for (let i = 0; i < 48; i++) w.tick(1); const s = w.workforce.summary(); const copy = World.fromJSON(JSON.parse(JSON.stringify(w.toJSON()))); return s.workers >= 1000 && s.tasks.created >= 2 && (s.tasks.done + s.tasks.active + s.tasks.queued) >= 2 && copy.workforce.workers.length === w.workforce.workers.length && copy.workforce.stats.created === w.workforce.stats.created && copy.workforce.board().length === w.workforce.board().length; } },
    { id: 'workforce.board', title: 'The board lists open tasks by priority with their current stage and team', test: () => { const w = new Workforce({ size: 100 }); w.addTask({ kind: 'job', subject: 'A', executeTeam: 'install', priority: 2 }, 0); w.addTask({ kind: 'finding', subject: 'B', executeTeam: 'finance', priority: 0 }, 0); const b = w.board(); return b.length === 2 && b[0].subject === 'B' && b[0].stage.role === 'research' && b[0].teamName === 'Research' && w.summary().tasks.queued === 2; } }
];
