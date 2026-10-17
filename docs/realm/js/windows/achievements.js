/** Achievements: progress toward every achievement with hints. */
import { h, badge, progressBar, empty } from '../core/ui.js';
import { ACHIEVEMENTS } from '../sim/events.js';
import { section, grid, statCard } from './_shared.js';
import { makeTestCtx, openWindow, q, qa } from './_testing.js';

export const PROGRESS_KEYS = { first_job: ['jobsCreated', 1], ten_jobs: ['jobsCreated', 10], first_pass: ['checklistsPassed', 1], zero_defect_five: ['checklistStreak', 5], commissioned: ['commissioningPassed', 1], stc_ready: ['stcReady', 1], kv_1000: ['highVoltageDesigns', 1], battery_safe: ['batteryAssessmentsPassed', 1], scholar: ['clausesViewed', 20], mentor: ['expertAgents', 1], economy: ['upgradesOwned', 3], reflective: ['reflections', 1], first_birth: ['births', 1], dynasty: ['births', 5], fixer: ['findingsResolved', 10] };
export function progressFor(id, stats) { const [key, target] = PROGRESS_KEYS[id] || [null, 1]; const value = key ? Math.min(target, stats[key] || 0) : 0; return { value, target, pct: Math.round((value / target) * 100) }; }

export function def(ctx) {
    return {
        id: 'achievements', title: ctx.t('nav.achievements'), icon: '🏆', hotkey: 'Y', width: 760, height: 560,
        render(body) {
            const unlocked = ctx.world.unlocked; const stats = ctx.world.stats;
            body.append(grid(3, statCard('Unlocked', `${unlocked.length}/${ACHIEVEMENTS.length}`), statCard('Completion', `${Math.round((unlocked.length / ACHIEVEMENTS.length) * 100)} %`), statCard('Titles earned', unlocked.length)),
                h('div', { class: 'ach-grid' }, ACHIEVEMENTS.map((a) => { const done = unlocked.includes(a.id); const p = progressFor(a.id, stats); return h('div', { class: `ach ${done ? 'unlocked' : 'locked'}`, tooltip: done ? `Unlocked – title "${a.title}" available in Character › Titles` : `${p.value}/${p.target}` }, h('div', { class: 'ach-icon' }, done ? '🏆' : '🔒'), h('div', { class: 'ach-body' }, h('div', { class: 'ach-title' }, a.title), h('div', { class: 'muted small' }, a.description), done ? badge('Unlocked', 'ok') : progressBar(p.pct, { small: true, label: `${p.value}/${p.target}`, showValue: false }))); })));
        }
    };
}

export const FEATURES = [
    { id: 'win.ach.grid', title: 'Achievement grid with progress', dom: true, test: () => { const t = makeTestCtx(); const b = openWindow(t.ctx, def(t.ctx)); const ok = qa(b, '.ach').length === 15 && qa(b, '.ach.unlocked').length === 1 && q(b, '.ach.unlocked .ach-title').textContent === 'First light'; t.done(); return ok; } },
    { id: 'win.ach.progress', title: 'Progress toward locked achievements', test: () => { const p = progressFor('scholar', { clausesViewed: 5 }); return p.value === 5 && p.target === 20 && p.pct === 25 && progressFor('ten_jobs', { jobsCreated: 50 }).pct === 100; } },
    { id: 'win.ach.coverage', title: 'Every achievement has a progress rule', test: () => ACHIEVEMENTS.every((a) => PROGRESS_KEYS[a.id]) }
];
