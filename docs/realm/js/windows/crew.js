/** Crew: roster, agent detail (skills, traits, needs, memory), hiring and autonomy. */
import { h, button, badge, progressBar, dataTable, toast, confirm, empty, promptText } from '../core/ui.js';
import { SKILL_DEFINITIONS, progressToNext, rank, awardXp } from '../sim/skills.js';
import { xpMultiplier } from '../sim/traits.js';
import { TRAITS, TRAIT_IDS } from '../sim/traits.js';
import { AUTONOMY_LEVELS, Agent } from '../sim/agent.js';
import { mood } from '../sim/needs.js';
import { section, statCard, grid, row, needBars, moodBadge, avatar, skillBadge, jobPicker } from './_shared.js';
import { makeTestCtx, openWindow, q, qa, fire } from './_testing.js';
import { recruitCost, rosterById } from '../sim/roster.js';
import { lifeStage, ageDays, lifespanDays, partnerOf, compatibility } from '../sim/lifecycle.js';
import { traitVector } from '../sim/genetics.js';

export const HIRE_COST = 150;
export const ROLES = ['Lead installer', 'Designer', 'Electrician', 'Apprentice', 'Commissioning tech', 'Project manager'];

export function def(ctx) {
    return {
        id: 'crew', title: ctx.t('nav.crew'), icon: '👥', hotkey: 'P', width: 900, height: 600,
        tabs: [{ id: 'roster', label: 'Crew', icon: '👥' }, { id: 'detail', label: 'Member', icon: '🪪' }, { id: 'memory', label: 'Memory', icon: '🧠' }, { id: 'recruit', label: 'Recruit', icon: '🏘' }, { id: 'family', label: 'Family', icon: '🌳' }, { id: 'hire', label: 'Hire', icon: '＋' }],
        render(body, { tab }) {
            if (tab === 'detail') return renderDetail(body, ctx);
            if (tab === 'memory') return renderMemory(body, ctx);
            if (tab === 'hire') return renderHire(body, ctx);
            if (tab === 'recruit') return renderRecruit(body, ctx);
            if (tab === 'family') return renderFamily(body, ctx);
            return renderRoster(body, ctx);
        }
    };
}

function selectedAgent(ctx) { const id = ctx.store.get('ui.selectedAgent'); return ctx.world.agent(id) || ctx.world.crew()[0] || null; }
export function portrait(agent, size = 'md') { const url = agent.meta && agent.meta.avatarUrl; return url ? h('img', { class: `avatar ${size} portrait`, src: url, alt: '', loading: 'lazy' }) : avatar(agent, size); }
function selectAgent(ctx, id) { ctx.store.set('ui.selectedAgent', id); }

function renderRoster(body, ctx) {
    const agents = ctx.world.crew();
    body.append(row(h('span', { class: 'muted' }, `${agents.length} in the crew · ${ctx.world.townsfolk().length} minions in town to recruit`), button('Recruit', () => ctx.wm.setTab('crew', 'recruit'), { small: true })));
    if (!agents.length) { body.append(empty('No crew. Recruit minions from town or hire someone new.')); return; }
    body.append(h('div', { class: 'agent-grid' }, agents.map((a) => {
        const best = a.bestSkill();
        return h('div', { class: `card agent-card ${selectedAgent(ctx) === a ? 'selected' : ''}`, onclick: () => { selectAgent(ctx, a.id); ctx.wm.setTab('crew', 'detail'); } },
            row(portrait(a, 'lg'), h('div', { class: 'agent-head' }, h('div', { class: 'card-title' }, a.name, ' ', badge(`T${a.tier}`, a.tier >= 3 ? 'accent' : 'neutral')), h('div', { class: 'card-sub' }, a.meta?.title || a.role), moodBadge(a))),
            needBars(a),
            h('div', { class: 'card-sub' }, a.currentTask ? `⚒ ${a.currentTask.label} (${Math.max(0, a.currentTask.remainingH).toFixed(1)} h left)` : '○ Idle – self-directed'),
            h('div', { class: 'card-sub' }, 'Traits: ', a.traits.map((t) => TRAITS[t]?.label || t).join(', ')),
            best ? h('div', { class: 'card-sub' }, 'Best: ', SKILL_DEFINITIONS.find((s) => s.key === best[0])?.label || best[0], ' ', skillBadge(a.level(best[0]))) : null);
    })));
}

function renderDetail(body, ctx) {
    const agent = selectedAgent(ctx);
    body.append(row(h('span', { class: 'field-label' }, 'Member'), h('select', { class: 'input', onchange: (e) => { selectAgent(ctx, e.target.value); ctx.refresh('crew'); } }, ctx.world.crew().map((a) => h('option', { value: a.id, selected: agent && a.id === agent.id ? '' : null }, a.name)))));
    if (!agent) { body.append(empty('No crew member selected.')); return; }
    const m = mood(agent.needs);
    body.append(section(null, row(portrait(agent, 'xl'), h('div', {}, h('h2', { class: 'job-heading' }, agent.name, ' ', badge(`Tier ${agent.tier}`), ' ', moodBadge(agent)), agent.meta?.title ? h('div', { class: 'card-sub' }, agent.meta.title, agent.meta.specialties ? ` · ${agent.meta.specialties.join(', ')}` : '') : null, h('div', { class: 'muted' }, `${agent.role} · ${agent.hoursWorked.toFixed(0)} h worked · ${agent.stats.tasksDone} tasks done · ${agent.stats.tasksFailed} reworks · ${agent.stats.reflections} reflections`),
        row(button('Rename', async () => { const name = await promptText('New name', { value: agent.name }); if (name) { agent.name = name; ctx.saveWorld(); ctx.refresh('crew'); } }, { small: true }),
            h('label', { class: 'field inline' }, h('span', { class: 'field-label' }, 'Role'), h('select', { class: 'input', onchange: (e) => { agent.role = e.target.value; ctx.saveWorld(); } }, ROLES.map((r) => h('option', { value: r, selected: agent.role === r ? '' : null }, r)))),
            h('label', { class: 'field inline' }, h('span', { class: 'field-label' }, 'Autonomy'), h('select', { class: 'input autonomy', onchange: (e) => { agent.autonomy = e.target.value; ctx.saveWorld(); toast(`${agent.name} autonomy: ${agent.autonomy}`); } }, AUTONOMY_LEVELS.map((l) => h('option', { value: l, selected: agent.autonomy === l ? '' : null }, { observe: 'Observe (never acts)', suggest: 'Suggest (asks first)', semi: 'Semi-autonomous', full: 'Fully autonomous' }[l]))))))),
        grid(2, section('Needs', needBars(agent, { small: false }), m.moodlets.length ? h('div', { class: 'moodlets' }, m.moodlets.map((x) => badge(`${x.label}: ${x.effect}`, 'warn'))) : h('div', { class: 'muted' }, 'No active moodlets'),
            row(button('Send on break', () => { agent.needs.energy = Math.min(100, agent.needs.energy + 25); agent.needs.focus = Math.min(100, agent.needs.focus + 20); agent.remember('Took a break on instruction', { tags: ['rest'] }); ctx.saveWorld(); ctx.refresh('crew'); }, { small: true }), button('Send to training (40 cr)', () => { const skill = agent.bestSkill()?.[0] || 'standards'; const weakest = Object.entries(agent.skills).sort((a, b) => a[1] - b[1])[0]?.[0] || skill; if (ctx.world.ledger.balance < 40) { toast('Need 40 credits', { kind: 'warn' }); return; } ctx.world.ledger.balance -= 40; ctx.world.ledger.entries.push({ at: ctx.world.time, type: 'training', amount: -40, balance: ctx.world.ledger.balance, ref: agent.id }); const r = awardXp(agent.skills, weakest, 120, xpMultiplier(agent.traits)); agent.skills = r.skills; agent.needs.mastery = Math.min(100, agent.needs.mastery + 20); agent.remember(`Attended a training course on ${weakest.replace(/_/g, ' ')}`, { tags: ['study'], importance: 5 }); ctx.notify('training', `${agent.name} trained in ${weakest.replace(/_/g, ' ')}${r.levelUp ? ` and reached level ${r.levelUp.to}` : ''}`, { agentId: agent.id }); ctx.saveWorld(); ctx.refresh('crew'); }, { small: true }), button('Praise', () => { agent.needs.morale = Math.min(100, agent.needs.morale + 15); agent.remember(`${ctx.profile().name} praised my work`, { tags: ['social'], importance: 5 }); ctx.saveWorld(); ctx.refresh('crew'); }, { small: true }))),
            section('Traits', h('ul', { class: 'traits' }, agent.traits.map((t) => h('li', {}, h('strong', {}, TRAITS[t]?.label || t), ': ', TRAITS[t]?.description || ''))), h('div', { class: 'muted' }, `Efficiency ×${agent.efficiency}`))),
        section('Skills', h('div', { class: 'skills' }, SKILL_DEFINITIONS.map((s) => { const xp = agent.skills[s.key] || 0; const lvl = agent.level(s.key); const p = progressToNext(xp); return h('div', { class: 'skill', tooltip: `${s.description || s.label}: ${xp} XP, ${rank(lvl)}` }, h('span', { class: 'skill-name' }, s.label), skillBadge(lvl), progressBar(p.pct, { small: true, showValue: false }), h('span', { class: 'muted' }, `${p.remaining} XP to next`)); }))),
        section('Work', agent.currentTask ? h('div', {}, h('strong', {}, agent.currentTask.label), ` for ${agent.currentTask.jobId || 'self'} – ${Math.max(0, agent.currentTask.remainingH).toFixed(1)} h remaining`, ' ', button('Cancel task', () => { agent.currentTask = null; ctx.saveWorld(); ctx.refresh('crew'); }, { small: true })) : h('div', {}, jobPicker(ctx), ' ', button('Assign next task on this job', () => { const job = ctx.currentJob(); if (!job) return; const task = ctx.world.assignNextTask(agent.id, job.id); toast(task ? `${agent.name} → ${task.label}` : 'No open tasks in this stage', { kind: task ? 'ok' : 'warn' }); ctx.saveWorld(); ctx.refresh('crew'); }, { small: true }))),
            h('details', {}, h('summary', {}, `Recent activity (${agent.log.length})`), h('ul', { class: 'notes' }, agent.log.slice(-12).reverse().map((l) => h('li', {}, l.events.map((e) => e.type === 'action' ? `${e.action}` : e.type === 'work' ? `worked ${e.task}` : e.type).join(', ') || 'rested'))))),
        row(button('Dismiss from crew', async () => { if (await confirm(`Dismiss ${agent.name}?`)) { ctx.world.agents.splice(ctx.world.agents.indexOf(agent), 1); ctx.saveWorld(); ctx.wm.setTab('crew', 'roster'); } }, { kind: 'danger', small: true })));
}

function renderMemory(body, ctx) {
    const agent = selectedAgent(ctx);
    if (!agent) { body.append(empty('No crew member selected.')); return; }
    const query = h('input', { type: 'search', class: 'input', placeholder: 'Ask memory: e.g. "isolator defect"', oninput: () => renderHits() });
    const hits = h('div', { class: 'memory-hits' });
    const renderHits = () => { hits.replaceChildren(); const list = query.value.trim() ? agent.memory.retrieve(query.value, { limit: 8, now: ctx.world.time }) : agent.memory.recent(12); for (const r of list) hits.append(h('div', { class: `memory ${r.kind}` }, badge(r.kind, r.kind === 'reflection' ? 'accent' : 'neutral'), ' ', h('span', { class: 'muted' }, `imp ${r.importance}`), ' ', r.text)); if (!list.length) hits.append(empty('Nothing recorded yet.')); };
    renderHits();
    body.append(section(`${agent.name}'s memory stream`, row(statCard('Memories', agent.memory.records.length), statCard('Reflections', agent.memory.byKind('reflection').length), statCard('Threshold', `${agent.memory.importanceSinceReflection ?? 0}/${agent.memory.reflectionThreshold}`)), query, hits,
        row(button('Reflect now', () => { const r = agent.memory.reflect({ now: ctx.world.time }); agent.stats.reflections += r.length; toast(r.length ? `${agent.name} wrote ${r.length} reflection(s)` : 'Nothing new to reflect on', { kind: r.length ? 'ok' : 'info' }); ctx.saveWorld(); ctx.refresh('crew'); }, { small: true }),
            button('Tell them something', async () => { const text = await promptText('What should they remember?'); if (text) { agent.remember(`${ctx.profile().name} said: ${text}`, { tags: ['instruction'], importance: 6 }); ctx.saveWorld(); ctx.refresh('crew'); } }, { small: true }))));
}

function renderRecruit(body, ctx) {
    const town = ctx.world.townsfolk().sort((a, b) => b.tier - a.tier || a.name.localeCompare(b.name));
    body.append(section(`Minions living in Solarhaven (${town.length}) · balance ${ctx.world.ledger.balance} credits`, h('p', { class: 'muted' }, 'The original SolarFlow roster. Each has a tier, specialties and a reputation; recruiting costs credits by tier (120 / 220 / 400). You can also walk up to them in town and press E.'), town.length ? h('div', { class: 'agent-grid' }, town.map((a) => { const cost = recruitCost(rosterById(a.id) || { tier: a.tier }); const stage = lifeStage(a, ctx.world.time); return h('div', { class: 'card agent-card recruit-card' }, row(portrait(a, 'lg'), h('div', { class: 'agent-head' }, h('div', { class: 'card-title' }, a.name, a.surname ? ` ${a.surname}` : '', ' ', badge(`T${a.tier}`, a.tier >= 3 ? 'accent' : 'neutral'), a.generation ? [' ', badge(`gen ${a.generation} · ${stage}`, stage === 'adult' ? 'ok' : 'warn')] : null), h('div', { class: 'card-sub' }, a.meta?.title || a.role), h('div', { class: 'muted small' }, (a.meta?.specialties || []).join(', ')))), h('div', { class: 'card-sub' }, `Reputation ${Math.round((a.meta?.reputation || 0) * 100)} % · traits ${a.traits.map((t) => TRAITS[t]?.label || t).join(', ')}`), row(button(`Recruit for ${cost} cr`, () => { const r = ctx.world.recruit(a.id, cost); toast(r.ok ? `${a.name} joined the crew` : r.reason, { kind: r.ok ? 'ok' : 'warn' }); ctx.saveWorld(); ctx.refresh('crew'); }, { kind: 'primary', small: true, disabled: ctx.world.ledger.balance < cost }), button('Talk', () => { ctx.store.set('ui.chatAgent', a.id); ctx.open('chat', { tab: 'talk' }); }, { small: true }))); })) : empty('Everyone in town is already on the crew.')));
}

function renderFamily(body, ctx) {
    const w = ctx.world; const tree = w.family(); const living = tree.filter((t) => !t.memorial);
    const p = w.population; const epoch = w.epoch(ctx.business ? ctx.business.model : null);
    body.append(grid(4, statCard('Population', `${w.agents.length} / ${p.cap}`, `${w.crew().length} crew · ${w.townsfolk().length} in town`), statCard('Births', String(p.births), `generation ${p.generation}`), statCard('Partners', String(w.agents.filter((a) => partnerOf(a, w.agents)).length / 2 | 0), 'couples'), statCard('Remembered', String(w.memorial.length), `${w.memorial.filter((m) => !m.soulTaken).length} souls waiting`)));
    body.append(section(`Company epoch ${epoch.number}/${epoch.total}: ${epoch.name}`, h('p', { class: 'muted' }, epoch.theme, ' ', h('em', {}, epoch.gift)), progressBar(Math.round(epoch.progress * 100), { label: epoch.next ? `next: ${epoch.next.name} (${epoch.next.remaining} to go)` : 'the top of the ladder' })));
    const sel = (id) => { selectAgent(ctx, id); ctx.wm.setTab('crew', 'detail'); };
    body.append(section('Family tree', h('p', { class: 'muted small' }, 'Minions make friends and rivals as they meet, close adult friends become partners, partners have children who inherit genes, looks and a share of their parents\' skills. Children grow up in town and can be recruited once grown; elders mentor; the very old are remembered at the memorial and their soul passes to the next child born.'),
        dataTable({ columns: [{ key: 'name', label: 'Minion', render: (r) => h('span', { class: r.memorial ? 'muted' : '', onclick: r.memorial ? null : () => sel(r.id) }, r.name, r.surname ? ` ${r.surname}` : '', r.memorial ? ' ✝' : '') }, { key: 'generation', label: 'Gen', align: 'right' }, { key: 'stage', label: 'Stage', render: (r) => { const a = w.agent(r.id); return a ? `${lifeStage(a, w.time)}${a.born != null ? ` · ${Math.round(ageDays(a, w.time))} d of ~${lifespanDays(a)}` : ''}` : 'remembered'; } }, { key: 'parents', label: 'Parents', render: (r) => r.parents.join(' & ') || '–' }, { key: 'partner', label: 'Partner', render: (r) => r.partner || '–' }, { key: 'children', label: 'Children', render: (r) => r.children.join(', ') || '–' }, { key: 'friends', label: 'Friends / rivals', render: (r) => `${r.friends} / ${r.rivals}` }], rows: tree, pageSize: 40, searchable: true, initialSort: { key: 'generation', dir: 'asc' } }).el));
    const adults = w.agents.filter((a) => lifeStage(a, w.time) === 'adult' && !partnerOf(a, w.agents));
    const a = h('select', { class: 'input match-a' }, adults.map((x) => h('option', { value: x.id }, x.name))); const b = h('select', { class: 'input match-b' }, adults.map((x, i) => h('option', { value: x.id, selected: i === 1 ? '' : null }, x.name)));
    const compat = h('span', { class: 'muted small' }); const showCompat = () => { const x = w.agent(a.value); const y = w.agent(b.value); compat.textContent = x && y && x !== y ? `compatibility ${Math.round(compatibility(x, y) * 100)} %` : ''; }; a.onchange = showCompat; b.onchange = showCompat; showCompat();
    body.append(section('Arrange a match (60 credits)', row(a, b, button('Arrange', () => { const r = w.arrangeMatch(a.value, b.value, 60); toast(r.ok ? 'They are now partners' : r.reason, { kind: r.ok ? 'ok' : 'warn' }); ctx.saveWorld(); ctx.refresh('crew'); }, { kind: 'primary', small: true }), compat),
        row(h('label', { class: 'field inline' }, h('input', { type: 'checkbox', class: 'pop-breeding', checked: p.breeding !== false ? '' : null, onchange: (e) => { p.breeding = e.target.checked; ctx.saveWorld(); } }), ' families have children'), h('label', { class: 'field inline' }, h('input', { type: 'checkbox', class: 'pop-mortality', checked: p.mortality !== false ? '' : null, onchange: (e) => { p.mortality = e.target.checked; ctx.saveWorld(); } }), ' the old pass away'))));
    const sa = selectedAgent(ctx);
    if (sa) { const v = traitVector(sa.dna); const keys = ['openness', 'conscientiousness', 'extraversion', 'agreeableness', 'neuroticism', 'intelligence', 'creativity', 'longevity', 'charisma', 'empathy']; body.append(section(`${sa.name}'s genes`, h('div', { class: 'genes' }, keys.map((k) => h('div', { class: 'gene' }, h('span', { class: 'skill-name' }, k), progressBar(Math.round(v[k] * 100), { small: true, showValue: false }), h('span', { class: 'muted small' }, `${Math.round(v[k] * 100)}`))), h('div', { class: 'muted small' }, `Aptitudes: ${Object.entries(sa.apt).sort((x, y) => y[1] - x[1]).slice(0, 3).map(([k, m]) => `${k.replace(/_/g, ' ')} ×${m}`).join(', ')}`)))); }
    if (w.memorial.length) body.append(section('Memorial', h('ul', { class: 'notes' }, w.memorial.slice(-10).reverse().map((m) => h('li', {}, `${m.name}${m.surname ? ` ${m.surname}` : ''} (${m.title}, generation ${m.generation}) – ${m.cause}${m.ageDays ? ` at ${m.ageDays} days` : ''}, ${m.tasksDone} tasks done${m.soulTaken ? ' · soul reborn' : ''}`)))));
}

function renderHire(body, ctx) {
    const balance = ctx.world.ledger.balance;
    const name = h('input', { type: 'text', class: 'input', placeholder: 'Name' });
    const role = h('select', { class: 'input' }, ROLES.map((r) => h('option', { value: r }, r)));
    const traitA = h('select', { class: 'input' }, TRAIT_IDS.map((t) => h('option', { value: t }, TRAITS[t].label)));
    const traitB = h('select', { class: 'input' }, TRAIT_IDS.map((t) => h('option', { value: t, selected: t === 'steady' ? '' : null }, TRAITS[t].label)));
    body.append(section(`Hire a crew member (${HIRE_COST} credits · balance ${balance})`, grid(2, h('label', { class: 'field' }, h('span', { class: 'field-label' }, 'Name'), name), h('label', { class: 'field' }, h('span', { class: 'field-label' }, 'Role'), role), h('label', { class: 'field' }, h('span', { class: 'field-label' }, 'Trait 1'), traitA), h('label', { class: 'field' }, h('span', { class: 'field-label' }, 'Trait 2'), traitB)),
        h('p', { class: 'muted' }, 'Traits shape what a crew member prefers to do, how fast their needs decay and how error-prone they are.'),
        button('Hire', () => {
            if (!name.value.trim()) { toast('Give them a name', { kind: 'warn' }); return; }
            if (ctx.world.agent(name.value)) { toast('That name is taken', { kind: 'warn' }); return; }
            if (ctx.world.ledger.balance < HIRE_COST) { toast(`Need ${HIRE_COST - ctx.world.ledger.balance} more credits`, { kind: 'warn' }); return; }
            ctx.world.ledger.balance -= HIRE_COST; ctx.world.ledger.entries.push({ at: ctx.world.time, type: 'hire', amount: -HIRE_COST, balance: ctx.world.ledger.balance, ref: name.value });
            const traits = [...new Set([traitA.value, traitB.value])];
            const agent = ctx.world.addAgent(new Agent({ id: name.value, name: name.value.trim(), role: role.value, traits, now: () => ctx.world.time }));
            ctx.notify('hired', `${agent.name} joined the crew as ${agent.role}`);
            selectAgent(ctx, agent.id); ctx.saveWorld(); toast(`${agent.name} hired`, { kind: 'ok' }); ctx.wm.setTab('crew', 'detail');
        }, { kind: 'primary' })));
    body.append(section('Trait reference', dataTable({ columns: [{ key: 'label', label: 'Trait' }, { key: 'description', label: 'Effect' }, { key: 'errorRate', label: 'Error ×', align: 'right' }, { key: 'speed', label: 'Speed ×', align: 'right' }], rows: TRAIT_IDS.map((t) => ({ ...TRAITS[t] })), searchable: false }).el));
}

export const FEATURES = [
    { id: 'win.crew.roster', title: 'Crew cards with portraits, needs, mood and traits', dom: true, test: () => { const t = makeTestCtx(); const b = openWindow(t.ctx, def(t.ctx), { tab: 'roster' }); const ok = qa(b, '.agent-card').length === 6 && qa(b, '.agent-card .need').length === 36 && qa(b, 'img.portrait').length === 6; t.done(); return ok; } },
    { id: 'win.crew.recruit', title: 'Recruit townsfolk minions from the original roster for credits', dom: true, test: () => { const t = makeTestCtx(); t.ctx.world.ledger.balance = 500; let b = openWindow(t.ctx, def(t.ctx), { tab: 'recruit' }); const listed = qa(b, '.recruit-card').length === 18; const card = qa(b, '.recruit-card').find((x) => /Wren/.test(x.textContent)); card.querySelector('button').click(); const ok = listed && t.ctx.world.agent('WREN').meta.hired === true && t.ctx.world.ledger.balance === 380 && t.ctx.world.crew().length === 7; t.done(); return ok; } },
    { id: 'win.crew.select', title: 'Select a member from the roster', dom: true, test: () => { const t = makeTestCtx(); const b = openWindow(t.ctx, def(t.ctx), { tab: 'roster' }); qa(b, '.agent-card').find((x) => /Nova/.test(x.textContent)).click(); const ok = t.ctx.store.get('ui.selectedAgent') === 'NOVA' && t.ctx.wm.windows.get('crew').tab === 'detail'; t.done(); return ok; } },
    { id: 'win.crew.skills', title: 'Skill sheet with rarity ranks and progress', dom: true, test: () => { const t = makeTestCtx(); t.ctx.store.set('ui.selectedAgent', 'NOVA'); const b = openWindow(t.ctx, def(t.ctx), { tab: 'detail' }); const ok = qa(b, '.skill').length === 8 && qa(b, '.skill-rank').length === 8; t.done(); return ok; } },
    { id: 'win.crew.autonomy', title: 'Change autonomy level', dom: true, test: () => { const t = makeTestCtx(); t.ctx.store.set('ui.selectedAgent', 'BOLT'); const b = openWindow(t.ctx, def(t.ctx), { tab: 'detail' }); const sel = q(b, 'select.autonomy'); sel.value = 'observe'; fire(sel, 'change'); const ok = t.ctx.world.agent('BOLT').autonomy === 'observe'; t.done(); return ok; } },
    { id: 'win.crew.break', title: 'Send on break restores energy and records memory', dom: true, test: () => { const t = makeTestCtx(); const a = t.ctx.world.agent('ATLAS'); a.needs.energy = 20; t.ctx.store.set('ui.selectedAgent', 'ATLAS'); const b = openWindow(t.ctx, def(t.ctx), { tab: 'detail' }); qa(b, 'button').find((x) => x.textContent === 'Send on break').click(); const ok = a.needs.energy === 45 && a.memory.records.some((r) => /break/.test(r.text)); t.done(); return ok; } },
    { id: 'win.crew.training', title: 'Training spends credits to raise the weakest skill', dom: true, test: () => { const t = makeTestCtx(); const a = t.ctx.world.agent('BOLT'); t.ctx.world.ledger.balance = 100; t.ctx.store.set('ui.selectedAgent', 'BOLT'); const before = Object.values(a.skills).reduce((n, v) => n + v, 0); const b = openWindow(t.ctx, def(t.ctx), { tab: 'detail' }); qa(b, 'button').find((x) => x.textContent.startsWith('Send to training')).click(); const ok = t.ctx.world.ledger.balance === 60 && Object.values(a.skills).reduce((n, v) => n + v, 0) > before && a.memory.records.some((m) => /training course/.test(m.text)); t.done(); return ok; } },
    { id: 'win.crew.assign', title: 'Assign next task on the current job', dom: true, test: () => { const t = makeTestCtx(); t.ctx.store.set('ui.selectedAgent', 'NOVA'); const b = openWindow(t.ctx, def(t.ctx), { tab: 'detail' }); qa(b, 'button').find((x) => x.textContent.startsWith('Assign next task')).click(); const ok = t.ctx.world.agent('NOVA').currentTask?.jobId === t.job.id; t.done(); return ok; } },
    { id: 'win.crew.memorySearch', title: 'Memory retrieval search', dom: true, test: () => { const t = makeTestCtx(); const a = t.ctx.world.agent('ATLAS'); a.remember('Isolator failed inspection on JOB-1', { tags: ['isolator'], importance: 7 }); a.remember('Had lunch', { importance: 1 }); t.ctx.store.set('ui.selectedAgent', 'ATLAS'); const b = openWindow(t.ctx, def(t.ctx), { tab: 'memory' }); const inp = q(b, 'input[type=search]'); inp.value = 'isolator'; fire(inp); const hits = qa(b, '.memory'); const ok = hits.length >= 1 && /Isolator/.test(hits[0].textContent); t.done(); return ok; } },
    { id: 'win.crew.reflect', title: 'Force a reflection', dom: true, test: () => { const t = makeTestCtx(); const a = t.ctx.world.agent('ATLAS'); for (let i = 0; i < 4; i++) a.remember(`Isolator defect ${i}`, { tags: ['isolator'], importance: 7 }); t.ctx.store.set('ui.selectedAgent', 'ATLAS'); const b = openWindow(t.ctx, def(t.ctx), { tab: 'memory' }); qa(b, 'button').find((x) => x.textContent === 'Reflect now').click(); const ok = a.memory.byKind('reflection').length >= 1; t.done(); return ok; } },
    { id: 'win.crew.hire', title: 'Hire with credits, traits and role', dom: true, test: () => { const t = makeTestCtx(); t.ctx.world.ledger.balance = 500; const b = openWindow(t.ctx, def(t.ctx), { tab: 'hire' }); q(b, 'input[placeholder=Name]').value = 'Kite2'; qa(b, 'button').find((x) => x.textContent === 'Hire').click(); const k = t.ctx.world.agent('KITE2'); const ok = k && k.traits.length === 2 && t.ctx.world.ledger.balance === 350 && t.ctx.world.crew().length === 7; t.done(); return Boolean(ok); } },
    { id: 'win.crew.hireNeedsCredits', title: 'Hiring is refused without credits', dom: true, test: () => { const t = makeTestCtx(); t.ctx.world.ledger.balance = 10; const b = openWindow(t.ctx, def(t.ctx), { tab: 'hire' }); q(b, 'input[placeholder=Name]').value = 'Poor'; qa(b, 'button').find((x) => x.textContent === 'Hire').click(); const ok = !t.ctx.world.agent('POOR'); t.done(); return ok; } },
    { id: 'win.crew.family', title: 'Family tab shows population, the company epoch, the family tree, genes and lets the player arrange a match', dom: true, test: () => { const t = makeTestCtx(); t.ctx.world.ledger.balance = 200; const b = openWindow(t.ctx, def(t.ctx), { tab: 'family' }); const rows = qa(b, 'tbody tr').length; const a = q(b, 'select.match-a'); const bb = q(b, 'select.match-b'); const ok = rows === 24 && /epoch/i.test(b.textContent) && qa(b, '.gene').length === 10 && a && bb && a.value !== bb.value; qa(b, 'button').find((x) => x.textContent === 'Arrange').click(); const paired = t.ctx.world.agent(a.value).relationships[bb.value]?.kind === 'partner' && t.ctx.world.ledger.balance === 140; t.done(); return ok && paired; } },
    { id: 'win.crew.traitReference', title: 'Trait reference table', dom: true, test: () => { const t = makeTestCtx(); const b = openWindow(t.ctx, def(t.ctx), { tab: 'hire' }); const ok = qa(b, 'tbody tr').length === 8; t.done(); return ok; } }
];
