/** System check: runs every registered feature self-test inside the app and reports by module. */
import { h, button, badge, progressBar, download, empty } from '../core/ui.js';
import * as registry from '../core/registry.js';
import { section, grid, row, statCard } from './_shared.js';
import { makeTestCtx, openWindow, q, qa } from './_testing.js';

export function def(ctx) {
    return {
        id: 'selftest', title: ctx.t('nav.selftest'), icon: '🧪', hotkey: null, width: 820, height: 600,
        render(body) {
            const last = ctx.store.get('stats.lastSelfTest');
            const out = h('div');
            const bar = progressBar(0, { label: 'Idle' });
            const run = async () => {
                const speed = ctx.clock.speed.id; ctx.clock.setSpeed('pause');
                out.replaceChildren(); let n = 0;
                const result = await registry.runAll({ onProgress: (entry, i, total) => { n = i; bar.querySelector('.bar-fill').style.width = `${(i / total) * 100}%`; bar.querySelector('.bar-label').textContent = `${i}/${total} ${entry.id}`; } });
                ctx.clock.setSpeed(speed);
                ctx.store.set('stats.lastSelfTest', { at: result.at, total: result.total, passed: result.passed, failed: result.failed });
                ctx.store.set('stats.featuresRun', (ctx.store.get('stats.featuresRun') || 0) + result.total);
                render(result);
            };
            const render = (result) => {
                out.replaceChildren(grid(4, statCard('Registered', result.total), statCard('Passed', result.passed, null, 'var(--ok)'), statCard('Failed', result.failed, null, result.failed ? 'var(--bad)' : null), statCard('Skipped', result.skipped)));
                if (result.failures?.length) out.append(section('Failures', h('ul', { class: 'issues' }, result.failures.map((f) => h('li', { class: 'issue' }, h('strong', {}, f.id), ` – ${f.title}: ${f.error}`)))));
                const byModule = {}; for (const r of result.results || []) (byModule[r.module] = byModule[r.module] || { passed: 0, failed: 0, total: 0 })[r.status === 'passed' ? 'passed' : 'failed']++, byModule[r.module].total++;
                if (result.results) out.append(section('By module', h('table', { class: 'data-table compact' }, h('thead', {}, h('tr', {}, h('th', {}, 'Module'), h('th', {}, 'Features'), h('th', {}, 'Passed'), h('th', {}, 'Result'))), h('tbody', {}, Object.entries(byModule).sort().map(([m, v]) => h('tr', {}, h('td', {}, m), h('td', {}, String(v.total)), h('td', {}, String(v.passed)), h('td', {}, badge(v.failed ? `${v.failed} failed` : 'OK', v.failed ? 'bad' : 'ok'))))))), row(button('Download report (Markdown)', () => download('realm-selftest.md', registry.reportMarkdown(result), 'text/markdown'), { small: true })));
            };
            body.append(section('System check', h('p', { class: 'muted' }, `Every feature in the workstation registers a self-test. ${registry.count()} features are registered right now. Running pauses the clock.`), bar, row(button('Run all self-tests', run, { kind: 'primary' }), last ? h('span', { class: 'muted' }, `Last run ${last.at.slice(0, 16).replace('T', ' ')}: ${last.passed}/${last.total} passed`) : null), out));
            if (last) out.append(grid(4, statCard('Registered', last.total), statCard('Passed', last.passed, null, 'var(--ok)'), statCard('Failed', last.failed), statCard('Modules', Object.keys(registry.byModule()).length)));
        }
    };
}

export const FEATURES = [
    { id: 'win.selftest.window', title: 'System check window shows the registry size', dom: true, test: () => { const t = makeTestCtx(); const b = openWindow(t.ctx, def(t.ctx)); const ok = new RegExp(`${registry.count()} features are registered`).test(b.textContent) && qa(b, 'button').some((x) => x.textContent === 'Run all self-tests'); t.done(); return ok; } },
    { id: 'win.selftest.lastRun', title: 'Remembers the last run summary', dom: true, test: () => { const t = makeTestCtx(); t.ctx.store.set('stats.lastSelfTest', { at: '2026-01-01T00:00:00Z', total: 10, passed: 9, failed: 1 }); const b = openWindow(t.ctx, def(t.ctx)); const ok = /9\/10 passed/.test(b.textContent); t.done(); return ok; } }
];
