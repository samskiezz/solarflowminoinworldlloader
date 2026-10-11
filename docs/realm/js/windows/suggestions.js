/** Crew suggestions: what the crew thinks you should do next, with one-click jump to the right window. */
import { h, button, badge, empty } from '../core/ui.js';
import { suggestions, nextAction } from '../sim/suggestions.js';
import { section, row, avatar } from './_shared.js';
import { makeTestCtx, openWindow, q, qa } from './_testing.js';

export function def(ctx) {
    return {
        id: 'suggestions', title: 'Crew suggestions', icon: '💡', hotkey: null, width: 720, height: 480,
        render(body) {
            const dismissed = ctx.store.get('ui.dismissedSuggestions', []);
            const list = suggestions(ctx.world, (jobId) => ctx.design(jobId)).filter((s) => !dismissed.includes(s.id));
            body.append(h('p', { class: 'muted' }, 'Crew members on suggest, semi or full autonomy plan the shortest path to a claim-ready job (GOAP) and propose the next step. Observe-only members stay quiet.'));
            if (!list.length) { body.append(empty(ctx.jobs().some((j) => j.stage !== 'complete') ? 'Nothing to suggest right now – the crew is happy with every open job.' : 'No open jobs.')); if (dismissed.length) body.append(row(button('Show dismissed', () => { ctx.store.set('ui.dismissedSuggestions', []); ctx.refresh('suggestions'); }, { small: true }))); return; }
            body.append(h('div', { class: 'suggestion-list' }, list.map((s) => { const agent = ctx.world.agent(s.agentId); return h('div', { class: 'card suggestion' }, row(agent ? avatar(agent, 'sm') : null, h('div', { class: 'card-title' }, s.text)), h('div', { class: 'muted small' }, `Plan: ${s.action.plan.join(' → ')}`), row(button('Do it', () => { ctx.setCurrentJob(s.jobId); ctx.open(s.action.window[0], { tab: s.action.window[1] }); if (agent) { agent.remember(`${ctx.profile().name} accepted my suggestion to ${s.action.label.toLowerCase()}`, { tags: ['social', 'suggestion'], importance: 4 }); agent.needs.morale = Math.min(100, agent.needs.morale + 5); ctx.saveWorld(); } }, { kind: 'primary', small: true }), button('Dismiss', () => { ctx.store.set('ui.dismissedSuggestions', [...dismissed, s.id]); ctx.refresh('suggestions'); }, { small: true }))); })));
        }
    };
}

export const FEATURES = [
    { id: 'win.suggest.list', title: 'Suggestions listed per open job', dom: true, test: () => { const t = makeTestCtx(); const b = openWindow(t.ctx, def(t.ctx)); const ok = qa(b, '.suggestion').length === 1 && /Select approved products/.test(b.textContent); t.done(); return ok; } },
    { id: 'win.suggest.doIt', title: '"Do it" jumps to the right window and cheers the agent', dom: true, test: () => { const t = makeTestCtx(); t.ctx.wm.register({ id: 'inventory', title: 'v', render: () => {}, tabs: [{ id: 'browse', label: 'b' }] }); const b = openWindow(t.ctx, def(t.ctx)); const agentId = suggestions(t.ctx.world, () => ({}))[0].agentId; const morale = t.ctx.world.agent(agentId).needs.morale; qa(b, 'button').find((x) => x.textContent === 'Do it').click(); const ok = t.ctx.wm.isOpen('inventory') && t.ctx.world.agent(agentId).needs.morale >= Math.min(100, morale + 5); t.done(); return ok; } },
    { id: 'win.suggest.dismiss', title: 'Dismiss and restore suggestions', dom: true, test: () => { const t = makeTestCtx(); let b = openWindow(t.ctx, def(t.ctx)); qa(b, 'button').find((x) => x.textContent === 'Dismiss').click(); b = t.ctx.wm.windows.get('suggestions').body; const gone = qa(b, '.suggestion').length === 0; qa(b, 'button').find((x) => x.textContent === 'Show dismissed').click(); b = t.ctx.wm.windows.get('suggestions').body; const ok = gone && qa(b, '.suggestion').length === 1; t.done(); return ok; } },
    { id: 'win.suggest.observeQuiet', title: 'Observe-only crews make no suggestions', dom: true, test: () => { const t = makeTestCtx(); for (const a of t.ctx.world.agents) a.autonomy = 'observe'; const b = openWindow(t.ctx, def(t.ctx)); const ok = qa(b, '.suggestion').length === 0; t.done(); return ok; } },
    { id: 'win.suggest.progression', title: 'Suggestions advance as the design progresses', dom: true, test: () => { const t = makeTestCtx(); t.ctx.saveDesign(t.job.id, { moduleId: 'PV-A440', inverterId: 'INV-G5', productsApproved: true }); const b = openWindow(t.ctx, def(t.ctx)); const ok = /string sizing|voltage rise|battery location/i.test(b.textContent) && nextAction(t.job, t.ctx.design(t.job.id)).id !== 'select_products'; t.done(); return ok; } }
];
