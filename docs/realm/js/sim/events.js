/**
 * Quests (generated from jobs), random world events and achievements.
 */

/** Deterministic PRNG so event sequences are reproducible from a seed. */
export function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

export const WORLD_EVENTS = [
    { id: 'heatwave', label: 'Heatwave', weight: 3, durationH: 24, effects: { energyDecay: 1.4 }, note: 'Site ambient 42 °C: re-check Vmp at hot cell temperature and cable derating.', tags: ['weather', 'design'] },
    { id: 'storm', label: 'Storm front', weight: 2, durationH: 12, effects: { installBlocked: true }, note: 'Roof work suspended; use the time for design and documentation.', tags: ['weather'] },
    { id: 'inspection', label: 'Regulator audit visit', weight: 2, durationH: 4, effects: { safetyPressure: 1.5 }, note: 'An inspector is auditing recent installs. Checklists with evidence will be requested.', tags: ['audit'] },
    { id: 'delisting', label: 'Product de-listing notice', weight: 1, durationH: 48, effects: { productsCheck: true }, note: 'A battery model was suspended from the approved list. Verify every open job.', tags: ['products'] },
    { id: 'standard_update', label: 'Standard amendment published', weight: 1, durationH: 72, effects: { studyBonus: 1.5 }, note: 'An amendment was published; study tasks grant extra mastery.', tags: ['standards'] },
    { id: 'rebate_change', label: 'Rebate factor step-down', weight: 1, durationH: 48, effects: { quoteUrgency: 1.5 }, note: 'The battery STC factor steps down soon; quotes should be issued before the change.', tags: ['incentives'] },
    { id: 'quiet_day', label: 'Quiet day', weight: 4, durationH: 8, effects: {}, note: 'No disruptions.', tags: [] }
];

export function rollEvent(random = Math.random) {
    const total = WORLD_EVENTS.reduce((s, e) => s + e.weight, 0);
    let r = random() * total;
    for (const event of WORLD_EVENTS) { r -= event.weight; if (r <= 0) return { ...event }; }
    return { ...WORLD_EVENTS.at(-1) };
}

/** Quests derived from a job's current stage. */
export function questsForJob(job) {
    const stageTitles = { lead: 'Scout the site', design: 'Forge the design', quote: 'Win the commission', approval: 'Petition the network', install: 'Raise the array', commission: 'Prove the work', claim: 'Claim the certificates', handover: 'Hand over the keys', complete: 'Victory' };
    const tasks = Object.entries(job.tasks || {}).filter(([key]) => key.startsWith(`${job.stage}:`));
    return {
        id: `quest:${job.id}:${job.stage}`,
        jobId: job.id,
        title: `${stageTitles[job.stage] || job.stage} – ${job.customer}`,
        objectives: tasks.map(([key, done]) => ({ key, text: key.split(':')[1], done: Boolean(done) })),
        progress: tasks.length ? Math.round((tasks.filter(([, d]) => d).length / tasks.length) * 100) : 100,
        reward: 10 + tasks.length * 5
    };
}

export const ACHIEVEMENTS = [
    { id: 'first_job', title: 'First light', description: 'Create your first job.', check: (s) => (s.jobsCreated || 0) >= 1 },
    { id: 'ten_jobs', title: 'Crew of many', description: 'Create ten jobs.', check: (s) => (s.jobsCreated || 0) >= 10 },
    { id: 'first_pass', title: 'Clean sheet', description: 'Pass a full checklist.', check: (s) => (s.checklistsPassed || 0) >= 1 },
    { id: 'zero_defect_five', title: 'Zero defects ×5', description: 'Pass five checklists in a row.', check: (s) => (s.checklistStreak || 0) >= 5 },
    { id: 'commissioned', title: 'Energised', description: 'Record a passing commissioning test set.', check: (s) => (s.commissioningPassed || 0) >= 1 },
    { id: 'stc_ready', title: 'Certificate hunter', description: 'Get a job STC-claim ready.', check: (s) => (s.stcReady || 0) >= 1 },
    { id: 'kv_1000', title: 'Kilovolt club', description: 'Design a compliant 1000 V domestic array.', check: (s) => (s.highVoltageDesigns || 0) >= 1 },
    { id: 'battery_safe', title: 'Keeper of clearances', description: 'Pass a battery location assessment.', check: (s) => (s.batteryAssessmentsPassed || 0) >= 1 },
    { id: 'scholar', title: 'Codex reader', description: 'Open twenty standard clauses.', check: (s) => (s.clausesViewed || 0) >= 20 },
    { id: 'mentor', title: 'Guild master', description: 'Raise a crew member to Expert.', check: (s) => (s.expertAgents || 0) >= 1 },
    { id: 'economy', title: 'Quartermaster', description: 'Buy three upgrades.', check: (s) => (s.upgradesOwned || 0) >= 3 },
    { id: 'reflective', title: 'Inner voice', description: 'A crew member writes its first reflection.', check: (s) => (s.reflections || 0) >= 1 }
];

export function evaluateAchievements(stats = {}, unlocked = []) {
    const newly = [];
    for (const a of ACHIEVEMENTS) {
        if (unlocked.includes(a.id)) continue;
        if (a.check(stats)) newly.push(a.id);
    }
    return { unlocked: [...unlocked, ...newly], newly };
}

export const FEATURES = [
    { id: 'events.prng', title: 'Seeded PRNG reproducibility', test: () => mulberry32(7)() === mulberry32(7)() && mulberry32(7)() !== mulberry32(8)() },
    { id: 'events.rollEvent', title: 'Weighted world event roll', test: () => rollEvent(() => 0).id === 'heatwave' && rollEvent(() => 0.999).id === 'quiet_day' },
    { id: 'events.catalogue', title: 'World event catalogue', test: () => WORLD_EVENTS.length === 7 && WORLD_EVENTS.every((e) => e.note) },
    { id: 'events.questsForJob', title: 'Quest generated from job stage', test: () => { const q = questsForJob({ id: 'J1', customer: 'Ann', stage: 'design', tasks: { 'design:a': true, 'design:b': false, 'lead:c': true } }); return q.objectives.length === 2 && q.progress === 50 && q.title.startsWith('Forge'); } },
    { id: 'events.achievements', title: 'Achievement evaluation', test: () => { const r = evaluateAchievements({ jobsCreated: 1, checklistsPassed: 1 }, ['first_job']); return r.newly.includes('first_pass') && !r.newly.includes('first_job') && r.unlocked.length === 2; } },
    { id: 'events.achievementCatalogue', title: 'Achievement catalogue (12)', test: () => ACHIEVEMENTS.length === 12 }
];
