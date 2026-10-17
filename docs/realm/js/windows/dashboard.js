/** Dashboard: the home window – pipeline, crew status, world event, feed and quick actions. */
import { h, button, badge, progressBar, barChart, empty, sparkline } from '../core/ui.js';
import { STAGES, jobProgress, jobsByStage } from '../domain/jobs.js';
import { ACHIEVEMENTS } from '../sim/events.js';
import { designCompatibility } from '../domain/products.js';
import { section, statCard, grid, row, avatar, moodBadge, stageBadge } from './_shared.js';
import { makeTestCtx, openWindow, q, qa } from './_testing.js';

export const FEED_ICONS = { job_created: '📋', task_complete: '✅', task_failed: '⚠️', level_up: '⬆️', reflection: '💭', achievement: '🏆', world_event: '🌦', stage_advanced: '➜', hired: '🤝', checklist: '📝', commissioning: '🔌' };

export function def(ctx) {
    return {
        id: 'dashboard', title: ctx.t('nav.dashboard'), icon: '🏠', hotkey: 'D', width: 920, height: 600,
        tabs: [{ id: 'overview', label: 'Overview', icon: '🏠' }, { id: 'feed', label: 'Activity', icon: '📜' }, { id: 'pipeline', label: 'Pipeline', icon: '📈' }],
        render(body, { tab }) {
            if (tab === 'feed') return renderFeed(body, ctx);
            if (tab === 'pipeline') return renderPipeline(body, ctx);
            return renderOverview(body, ctx);
        }
    };
}

function renderOverview(body, ctx) {
    const p = ctx.profile(); const lvl = ctx.level(); const jobs = ctx.jobs(); const clock = ctx.world.clock;
    const open = jobs.filter((j) => j.stage !== 'complete');
    body.append(section(null, row(h('div', {}, h('h2', { class: 'job-heading' }, `${p.company}`), h('div', { class: 'muted' }, `${p.name} · ${ctx.store.get('profile.title') || lvl.title} · ${ctx.t('clock.day', { day: clock.day })} ${String(clock.hourOfDay).padStart(2, '0')}:00`)),
        grid(4, statCard(ctx.t('credits'), ctx.world.ledger.balance, null, 'var(--gold)'), statCard(ctx.t('level'), lvl.level, `${lvl.pct} % to next`), statCard('Open jobs', open.length), statCard('Achievements', `${ctx.world.unlocked.length}/${ACHIEVEMENTS.length}`)))));
    if (ctx.world.activeEvent) body.append(h('div', { class: 'event-banner' }, '🌦 ', h('strong', {}, ctx.world.activeEvent.label), ': ', ctx.world.activeEvent.note));
    body.append(grid(2,
        section('Crew', ctx.world.crew().length ? ctx.world.crew().map((a) => h('div', { class: 'crew-line', onclick: () => { ctx.store.set('ui.selectedAgent', a.id); ctx.open('crew', { tab: 'detail' }); } }, avatar(a, 'sm'), h('span', { class: 'crew-name' }, a.name), moodBadge(a), h('span', { class: 'muted' }, a.currentTask ? `⚒ ${a.currentTask.label}` : 'idle'))) : empty('No crew')),
        section('Active jobs', open.length ? open.slice(0, 6).map((j) => { const pr = jobProgress(j); return h('div', { class: 'job-line', onclick: () => { ctx.setCurrentJob(j.id); ctx.open('jobs', { tab: 'detail' }); } }, h('span', { class: 'crew-name' }, j.customer), stageBadge(j.stage), progressBar(pr.pct, { small: true, showValue: false }), h('span', { class: 'muted' }, `${pr.pct} %`)); }) : h('div', { class: 'empty' }, 'No active jobs. ', button('Create one', () => ctx.open('jobs', { tab: 'new' }), { small: true })))));
    const watch = productWatch(ctx);
    if (watch.length) body.append(section('Product watch', h('ul', { class: 'issues' }, watch.map((w) => h('li', { class: 'issue', onclick: () => { ctx.setCurrentJob(w.jobId); ctx.open('inventory', { tab: 'design' }); } }, '⚠ ', h('strong', {}, w.customer), ': ', w.issue)))));
    body.append(section('Quick actions', row(
        button('＋ New job', () => ctx.open('jobs', { tab: 'new' }), { kind: 'primary', small: true }), button('Calculators', () => ctx.open('spellbook'), { small: true }), button('Product vault', () => ctx.open('inventory'), { small: true }),
        button('Codex', () => ctx.open('codex'), { small: true }), button('Checklists', () => ctx.open('checklists'), { small: true }), button('Reports', () => ctx.open('reports'), { small: true }), button('System check', () => ctx.open('selftest'), { small: true }))));
    body.append(section('Latest activity', feedList(ctx, 6)));
}

/** Jobs whose selected products are no longer approved or expire within 90 days. */
export function productWatch(ctx) {
    const out = [];
    const date = new Date(ctx.now()).toISOString().slice(0, 10);
    for (const job of ctx.jobs().filter((j) => j.stage !== 'complete')) {
        const d = ctx.design(job.id); if (!d.moduleId && !d.inverterId && !d.batteryId) continue;
        const c = designCompatibility({ module: ctx.products.byId.get(d.moduleId), inverter: ctx.products.byId.get(d.inverterId), battery: ctx.products.byId.get(d.batteryId), moduleCount: d.moduleCount, dateIso: date });
        for (const issue of c.issues.filter((i) => /approved|expires/.test(i))) out.push({ jobId: job.id, customer: job.customer, issue });
    }
    return out;
}

function feedList(ctx, limit) {
    const feed = [...ctx.world.feed].reverse().slice(0, limit);
    return feed.length ? h('ul', { class: 'feed' }, feed.map((f) => h('li', { class: `feed-item ${f.type}` }, h('span', { class: 'feed-icon' }, FEED_ICONS[f.type] || '•'), h('span', { class: 'muted' }, `D${Math.floor(f.hour / 24) + 1} ${String(Math.floor(f.hour % 24)).padStart(2, '0')}h`), ' ', f.text))) : empty('Nothing has happened yet. Press Space to start the clock.');
}

function renderFeed(body, ctx) {
    const filter = h('select', { class: 'input', onchange: () => render() }, h('option', { value: '' }, 'All events'), Object.keys(FEED_ICONS).map((k) => h('option', { value: k }, k.replace(/_/g, ' '))));
    const list = h('div');
    const render = () => { list.replaceChildren(); const feed = [...ctx.world.feed].reverse().filter((f) => !filter.value || f.type === filter.value); list.append(feed.length ? h('ul', { class: 'feed' }, feed.map((f) => h('li', { class: `feed-item ${f.type}` }, h('span', { class: 'feed-icon' }, FEED_ICONS[f.type] || '•'), h('span', { class: 'muted' }, `D${Math.floor(f.hour / 24) + 1} ${String(Math.floor(f.hour % 24)).padStart(2, '0')}h`), ' ', f.text))) : empty('No events')); };
    render();
    body.append(section('Activity feed', row(filter, h('span', { class: 'muted' }, `${ctx.world.feed.length} events kept`)), list));
}

function renderPipeline(body, ctx) {
    const lanes = jobsByStage(ctx.jobs());
    const items = STAGES.map((s) => ({ label: s.title, value: (lanes[s.id] || []).length }));
    const kwByStage = STAGES.map((s) => ({ label: s.title, value: (lanes[s.id] || []).reduce((n, j) => n + j.systemKw, 0) }));
    const ledger = ctx.world.ledger.entries.slice(-30).map((e) => e.balance);
    body.append(grid(2, section('Jobs per stage', barChart(items)), section('kW per stage', barChart(kwByStage, { colour: 'var(--gold)' }))),
        section('Credit balance (last 30 entries)', ledger.length > 1 ? sparkline(ledger, { width: 600, height: 60 }) : empty('No ledger history yet'), h('div', { class: 'muted' }, `Balance ${ctx.world.ledger.balance} · owned upgrades ${ctx.world.ledger.owned.length}`)));
}

export const FEATURES = [
    { id: 'win.dashboard.overview', title: 'Overview with credits, level, crew and jobs', dom: true, test: () => { const t = makeTestCtx(); const b = openWindow(t.ctx, def(t.ctx)); const ok = qa(b, '.stat').length === 4 && qa(b, '.crew-line').length === 6 && qa(b, '.job-line').length === 1; t.done(); return ok; } },
    { id: 'win.dashboard.quickActions', title: 'Quick actions open other windows', dom: true, test: () => { const t = makeTestCtx(); const b = openWindow(t.ctx, def(t.ctx)); t.ctx.wm.register({ id: 'spellbook', title: 'x', render: () => {} }); qa(b, 'button').find((x) => x.textContent === 'Calculators').click(); const ok = t.ctx.wm.isOpen('spellbook'); t.done(); return ok; } },
    { id: 'win.dashboard.crewLink', title: 'Clicking a crew line opens that member', dom: true, test: () => { const t = makeTestCtx(); const b = openWindow(t.ctx, def(t.ctx)); t.ctx.wm.register({ id: 'crew', title: 'x', render: () => {}, tabs: [{ id: 'detail', label: 'd' }] }); qa(b, '.crew-line').find((x) => /Nova/.test(x.textContent)).click(); const ok = t.ctx.store.get('ui.selectedAgent') === 'NOVA' && t.ctx.wm.isOpen('crew'); t.done(); return ok; } },
    { id: 'win.dashboard.eventBanner', title: 'Active world event banner', dom: true, test: () => { const t = makeTestCtx(); t.ctx.world.activeEvent = { label: 'Heatwave', note: 'hot' }; const b = openWindow(t.ctx, def(t.ctx)); const ok = /Heatwave/.test(q(b, '.event-banner').textContent); t.done(); return ok; } },
    { id: 'win.dashboard.productWatch', title: 'Product watch flags de-listed or expiring products on open jobs', dom: true, test: () => { const t = makeTestCtx(); t.ctx.saveDesign(t.job.id, { moduleId: 'PV-B400' }); const b = openWindow(t.ctx, def(t.ctx)); const ok = productWatch(t.ctx).length === 1 && /not approved/.test(b.textContent); t.done(); return ok; } },
    { id: 'win.dashboard.feed', title: 'Filterable activity feed', dom: true, test: () => { const t = makeTestCtx(); t.ctx.world.emit({ type: 'level_up', text: 'Nova levelled' }); const b = openWindow(t.ctx, def(t.ctx), { tab: 'feed' }); const sel = q(b, 'select'); sel.value = 'level_up'; sel.dispatchEvent(new Event('change')); const ok = qa(b, '.feed-item').length === 1; t.done(); return ok; } },
    { id: 'win.dashboard.pipeline', title: 'Pipeline charts (jobs and kW per stage)', dom: true, test: () => { const t = makeTestCtx(); const b = openWindow(t.ctx, def(t.ctx), { tab: 'pipeline' }); const ok = qa(b, '.bar-chart').length === 2 && qa(b, '.bar-col').length === 18; t.done(); return ok; } }
];
