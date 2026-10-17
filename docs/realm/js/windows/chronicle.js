/** Chronicle: the stories Solarhaven tells – every minion's archetype, quests and journey, the town's conflicts and debates, and the story feed. */
import { h, button, badge, progressBar, select, empty } from '../core/ui.js';
import { ARCHETYPES, JOURNEY_STAGES } from '../sim/narrative.js';
import { section, row, grid, statCard, avatar } from './_shared.js';
import { makeTestCtx, openWindow, q, qa, fire } from './_testing.js';

const KIND_ICONS = { breakthrough: '✨', relationship: '🤝', conflict: '⚔', discovery: '🔍', culture: '🎭', insight: '💡' };
const archetypeBadge = (key) => { const a = ARCHETYPES[key]; return h('span', { class: 'badge badge-accent' }, `${a.icon} ${a.label}`); };

function renderStories(body, ctx) {
    const c = ctx.world.chronicle; const s = c.summary(ctx.world.agents);
    body.append(grid(4, statCard('Evolution stage', s.evolutionStage, `${s.breakthroughs} breakthroughs`), statCard('Stories told', s.stories), statCard('Discoveries', s.discoveries, `${s.culturalMilestones} cultural milestones`), statCard('Conflicts', `${s.activeConflicts} active`, `${s.resolvedConflicts} resolved · ${s.debates} debates`)));
    const stories = [...ctx.world.feed.filter((f) => f.type === 'story')].reverse();
    const list = stories.length ? h('ul', { class: 'feed story-feed' }, stories.slice(0, 80).map((f) => h('li', { class: `feed-item story ${f.kind}` }, h('span', { class: 'feed-icon' }, KIND_ICONS[f.kind] || '📖'), h('span', { class: 'feed-text' }, f.text), h('span', { class: 'feed-time muted small' }, new Date(f.at).toISOString().slice(0, 16).replace('T', ' '))))) : empty('No stories yet – the town writes one every twelve simulated hours. Let the clock run, or tell one now.');
    body.append(section('What happened in Solarhaven', row(button('Tell a story now', () => { const st = c.event(ctx.world); if (st) ctx.world.emit(st); ctx.saveWorld(); ctx.refresh('chronicle'); }, { kind: 'primary', small: true }), h('span', { class: 'muted small' }, 'Stories are seeded from the world\'s own random stream – the same seed tells the same tale.')), list));
}

function renderJourneys(body, ctx) {
    const c = ctx.world.chronicle;
    const filter = select([{ value: '', label: 'All archetypes' }, ...Object.entries(ARCHETYPES).map(([k, a]) => ({ value: k, label: `${a.icon} ${a.label}` }))], { value: ctx.store.get('ui.chronicleArchetype', '') });
    filter.classList.add('archetype-filter');
    filter.addEventListener('change', () => { ctx.store.set('ui.chronicleArchetype', filter.value); ctx.refresh('chronicle'); });
    const counts = c.archetypeCounts(ctx.world.agents);
    body.append(section('Archetypes in town', row(filter), grid(4, ...Object.entries(ARCHETYPES).map(([k, a]) => statCard(`${a.icon} ${a.label}`, counts[k] || 0, a.blurb)))));
    const agents = ctx.world.agents.filter((a) => !filter.value || c.journey(a).archetype === filter.value);
    body.append(section('Journeys', agents.length ? h('div', { class: 'journeys' }, agents.map((a) => { const j = c.journey(a); const stageIdx = JOURNEY_STAGES.indexOf(j.stage); return h('details', { class: 'journey' }, h('summary', {}, avatar(a, 'sm'), ' ', h('strong', {}, a.name), ' ', archetypeBadge(j.archetype), ' ', badge(j.stage, stageIdx >= 2 ? 'ok' : stageIdx === 1 ? 'accent' : 'neutral'), h('span', { class: 'muted small' }, ` · ${j.breakthroughs.length} breakthroughs · path ${j.path}`)), h('div', { class: 'journey-body' }, h('p', {}, h('strong', {}, 'Quests: '), j.quests.join(' · ')), progressBar(Math.min(100, j.breakthroughs.length * 100 / 6), { small: true, label: `journey to transcending` }), h('p', { class: 'small' }, h('strong', {}, 'Struggles: '), j.struggles.join('; ')), h('p', { class: 'small' }, h('strong', {}, 'Fears: '), j.fears.join('; '), h('br'), h('strong', {}, 'Desires: '), j.desires.join('; '), h('br'), h('strong', {}, 'Secrets: '), j.secrets.join('; ')), j.breakthroughs.length ? h('ul', { class: 'small' }, j.breakthroughs.slice(-5).map((b) => h('li', {}, b.text))) : null, j.insights.length ? h('p', { class: 'small muted' }, h('em', {}, `"${j.insights[j.insights.length - 1].text}"`)) : null)); })) : empty('Nobody of that archetype lives here yet.')));
}

function renderConflicts(body, ctx) {
    const c = ctx.world.chronicle; const name = (id) => ctx.world.agent(id)?.name || id;
    if (!c.seeded) c.seed(ctx.world.agents, ctx.world.random, ctx.world.time);
    body.append(section('Conflicts that drive the town', c.conflicts.length ? h('div', { class: 'conflicts' }, c.conflicts.map((x) => h('div', { class: `finding conflict sev-${x.status === 'resolved' ? 'info' : x.intensity > 60 ? 'high' : 'medium'}` }, h('div', { class: 'finding-head' }, badge(x.type, 'neutral'), h('strong', {}, x.title), badge(x.status, x.status === 'resolved' ? 'ok' : 'warn')), h('div', { class: 'finding-detail' }, x.description), progressBar(x.intensity, { small: true, label: 'intensity', colour: x.intensity > 60 ? 'var(--bad)' : 'var(--warn)' }), h('div', { class: 'muted small' }, `Between ${x.participants.map(name).join(', ') || 'nobody yet'} · theme ${x.theme} · ${x.events.length} turns`)))) : empty('No conflicts yet.')));
    body.append(section('Philosophical debates', c.debates.length ? h('div', { class: 'debates' }, c.debates.map((d) => h('details', { class: 'debate', open: '' }, h('summary', {}, h('strong', {}, d.topic), ' ', badge(d.phase, 'neutral'), h('span', { class: 'muted small' }, ` · ${d.participants.length} voices · ${d.arguments.length} arguments`)), h('p', { class: 'small' }, d.question), h('ol', { class: 'small' }, d.positions.map((p) => h('li', {}, p))), h('p', { class: 'muted small' }, 'Voices: ', d.participants.map(name).join(', ')), d.arguments.length ? h('ul', { class: 'small' }, d.arguments.slice(-5).map((a) => h('li', {}, h('strong', {}, name(a.by)), `: "${a.text}"`))) : null))) : empty('No debates yet.')));
}

export function def(ctx) {
    return {
        id: 'chronicle', title: 'Chronicle', icon: '📖', hotkey: null, width: 900, height: 640,
        tabs: [{ id: 'stories', label: 'Stories', icon: '📖' }, { id: 'journeys', label: 'Journeys', icon: '🧭' }, { id: 'conflicts', label: 'Conflicts & debates', icon: '⚔' }],
        render(body, { tab }) {
            if (tab === 'journeys') return renderJourneys(body, ctx);
            if (tab === 'conflicts') return renderConflicts(body, ctx);
            return renderStories(body, ctx);
        }
    };
}

export const FEATURES = [
    { id: 'win.chronicle.stories', title: 'The story feed shows the town\'s tales and a story can be told on demand', dom: true, test: () => { const t = makeTestCtx(); for (let i = 0; i < 4; i++) t.ctx.world.tick(6); let b = openWindow(t.ctx, def(t.ctx)); const before = qa(b, '.story-feed .feed-item').length; qa(b, 'button').find((x) => x.textContent === 'Tell a story now').click(); b = t.ctx.wm.windows.get('chronicle').body; const after = qa(b, '.story-feed .feed-item').length; const ok = before === 2 && after === 3 && /Evolution stage/.test(b.textContent); t.done(); return ok; } },
    { id: 'win.chronicle.journeys', title: 'Every minion has a journey with archetype, quests, fears and desires; the archetype filter narrows the list', dom: true, test: () => { const t = makeTestCtx(); let b = openWindow(t.ctx, def(t.ctx), { tab: 'journeys' }); const all = qa(b, '.journey').length; const first = t.ctx.world.chronicle.journey(t.ctx.world.agents[0]).archetype; const f = q(b, '.archetype-filter'); f.value = first; fire(f, 'change'); b = t.ctx.wm.windows.get('chronicle').body; const some = qa(b, '.journey').length; const ok = all === 24 && some >= 1 && some < 24 && /Quests:/.test(b.textContent) && /Fears:/.test(b.textContent); t.done(); return ok; } },
    { id: 'win.chronicle.conflicts', title: 'Four seeded conflicts with intensity and three debates with positions', dom: true, test: () => { const t = makeTestCtx(); const b = openWindow(t.ctx, def(t.ctx), { tab: 'conflicts' }); const ok = qa(b, '.conflict').length === 4 && qa(b, '.debate').length === 3 && /The hierarchy challenge/.test(b.textContent) && /The right to evolve/.test(b.textContent); t.done(); return ok; } }
];
