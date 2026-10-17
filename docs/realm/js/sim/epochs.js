/**
 * Company epochs (ported from the Underworld epoch ladder, re-grounded in a
 * solar installer's real story): a monotonic "company index" built from the
 * real business (installed sites, revenue, batteries), the crew (expertise,
 * generations) and the problems the minions have fixed. Each epoch is a
 * milestone every solar business actually passes, roughly in order, with the
 * gift it brings. The world shows "you are here" on that arc.
 */
export const EPOCHS = [
    { id: 'first_quote', name: 'The first quote', threshold: 0, theme: 'A kitchen-table number and a handshake.', gift: 'The pipeline exists.' },
    { id: 'first_install', name: 'The first install', threshold: 4, theme: 'Panels on a roof, an inverter humming.', gift: 'Reputation starts from one happy customer.' },
    { id: 'licensed', name: 'Licensed crew', threshold: 10, theme: 'Accredited installers, compliant paperwork.', gift: 'STC claims and network approvals flow.' },
    { id: 'ten_roofs', name: 'Ten roofs', threshold: 20, theme: 'Word of mouth in one suburb.', gift: 'Referrals become a channel.' },
    { id: 'first_battery', name: 'The first battery', threshold: 30, theme: 'Storage, backup and the evening peak.', gift: 'Higher-value jobs and hybrid skills.' },
    { id: 'handover_standard', name: 'The handover standard', threshold: 45, theme: 'Every customer gets a complete pack.', gift: 'Fewer call-backs; warranty claims take minutes.' },
    { id: 'fifty_sites', name: 'Fifty sites', threshold: 60, theme: 'A map with pins across the district.', gift: 'Density: shorter drives, more jobs per day.' },
    { id: 'partner_channel', name: 'The partner channel', threshold: 80, theme: 'Builders and retailers send work.', gift: 'Volume without lead cost.' },
    { id: 'one_megawatt', name: 'One megawatt installed', threshold: 100, theme: 'A thousand kilowatts under the sun.', gift: 'Supplier pricing tiers open.' },
    { id: 'hundred_sites', name: 'One hundred sites', threshold: 130, theme: 'A real installed base to look after.', gift: 'Service, monitoring and upgrades become revenue.' },
    { id: 'million_revenue', name: 'The first million', threshold: 160, theme: 'A million dollars through the books.', gift: 'Finance is a department, not a spreadsheet.' },
    { id: 'cash_positive', name: 'Cash-positive month', threshold: 200, theme: 'Money in before money out.', gift: 'Runway stops shrinking.' },
    { id: 'zero_overdue', name: 'Nothing overdue', threshold: 240, theme: 'Receivables chased, bills paid on time.', gift: 'The bank balance tells the truth.' },
    { id: 'second_crew', name: 'The second crew', threshold: 290, theme: 'Two vans, two installs a day.', gift: 'Capacity doubles; scheduling matters.' },
    { id: 'social_presence', name: 'A public voice', threshold: 340, theme: 'Every install shown, every question answered.', gift: 'Leads arrive without a lead farm.' },
    { id: 'five_megawatts', name: 'Five megawatts', threshold: 400, theme: 'A small power station spread over rooftops.', gift: 'Virtual power plant conversations begin.' },
    { id: 'commercial', name: 'First commercial job', threshold: 470, theme: 'A warehouse roof and three-phase export.', gift: 'Bigger tickets, longer projects.' },
    { id: 'second_generation', name: 'The second generation', threshold: 550, theme: 'Children of the founding crew pick up the tools.', gift: 'Skills pass down; the guild outlives its founders.' },
    { id: 'five_hundred_sites', name: 'Five hundred sites', threshold: 650, theme: 'A name people recognise.', gift: 'Brand, not advertising, sells.' },
    { id: 'vpp', name: 'Virtual power plant', threshold: 760, theme: 'Batteries orchestrated as one.', gift: 'Recurring revenue from the fleet.' },
    { id: 'ten_megawatts', name: 'Ten megawatts', threshold: 900, theme: 'Enough to power a town.', gift: 'Wholesale market access.' },
    { id: 'regional', name: 'Regional guild', threshold: 1060, theme: 'Crews in three regions.', gift: 'Weather in one place never stops the work.' },
    { id: 'thousand_sites', name: 'One thousand sites', threshold: 1250, theme: 'A thousand roofs and the families under them.', gift: 'The installed base is the business.' },
    { id: 'realm_champion', name: 'Realm champion', threshold: 1500, theme: 'The standard others are measured against.', gift: 'The story continues under other suns.' }
];

/** One monotonic number for how far the company has come. */
export function companyIndex({ installedSites = 0, revenue = 0, batteryKwh = 0, pvKw = 0, crew = 0, expertAgents = 0, findingsResolved = 0, generation = 0, posts = 0, cashPositive = false, zeroOverdue = false, commercialJobs = 0 } = {}) {
    return Math.round(installedSites * 1.2 + revenue / 25000 + batteryKwh / 50 + pvKw / 10 + crew * 3 + expertAgents * 6 + findingsResolved * 2.5 + generation * 40 + Math.min(posts, 200) * 0.5 + (cashPositive ? 40 : 0) + (zeroOverdue ? 40 : 0) + commercialJobs * 15);
}
export function epochFor(index) { let reached = EPOCHS[0]; for (const e of EPOCHS) { if (index >= e.threshold) reached = e; else break; } return reached; }
export function nextEpoch(index) { return EPOCHS.find((e) => index < e.threshold) || null; }
export function epochProgress(index) {
    const cur = epochFor(index); const nxt = nextEpoch(index); const number = EPOCHS.indexOf(cur) + 1;
    if (!nxt) return { ...cur, next: null, progress: 1, index, number, total: EPOCHS.length };
    const span = nxt.threshold - cur.threshold || 1;
    return { ...cur, next: { id: nxt.id, name: nxt.name, theme: nxt.theme, threshold: nxt.threshold, remaining: nxt.threshold - index }, progress: Math.round(Math.max(0, Math.min(1, (index - cur.threshold) / span)) * 1000) / 1000, index, number, total: EPOCHS.length };
}
/** Inputs from the world and (when loaded) the real business model. */
export function epochInputs(world, model = null) {
    const realJobs = world.jobs.filter((j) => j.real); const jobs = realJobs.length ? realJobs : world.jobs;
    const installed = jobs.filter((j) => ['claim', 'handover', 'complete'].includes(j.stage));
    const k = model?.finance?.kpis || {}; const soc = model?.stats?.social || {};
    return { installedSites: model ? (model.stats?.jobs?.installedSites || installed.length) : installed.length, revenue: k.revenue || 0, batteryKwh: installed.reduce((s, j) => s + (j.batteryKwh || 0), 0), pvKw: installed.reduce((s, j) => s + (j.systemKw || 0), 0), crew: world.crew().length, expertAgents: world.stats.expertAgents || 0, findingsResolved: world.stats.findingsResolved || 0, generation: world.population?.generation || 0, posts: soc.posts || 0, cashPositive: Boolean(k.netMarginPct > 0), zeroOverdue: model ? !(k.overdueAr > 0) : false, commercialJobs: jobs.filter((j) => j.kind === 'commercial').length };
}

export const FEATURES = [
    { id: 'epochs.ladder', title: 'Twenty-four company epochs with rising thresholds, each with a theme and a gift', test: () => EPOCHS.length === 24 && EPOCHS.every((e, i) => e.theme && e.gift && (i === 0 || e.threshold > EPOCHS[i - 1].threshold)) },
    { id: 'epochs.progress', title: 'The company index places the business on the ladder with progress to the next milestone', test: () => { const i0 = companyIndex({}); const i1 = companyIndex({ installedSites: 77, revenue: 2780000, batteryKwh: 400, crew: 6, generation: 1 }); const p = epochProgress(i1); return i0 === 0 && epochFor(i0).id === 'first_quote' && i1 > 200 && p.number > 10 && p.next && p.next.remaining > 0 && p.progress >= 0 && p.progress <= 1 && epochProgress(99999).next === null; } }
];
