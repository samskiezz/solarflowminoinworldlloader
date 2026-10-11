/**
 * Feature registry: every feature in the workstation registers a
 * self-test. The in-app "System check" and the Node test-suite both run
 * this registry, so the feature count is verifiable, not marketing.
 */
const features = new Map();
const modules = new Map();

export function register(moduleId, list = []) {
    for (const feature of list) {
        if (!feature || !feature.id || typeof feature.test !== 'function') throw new Error(`Invalid feature in ${moduleId}: ${JSON.stringify(feature && feature.id)}`);
        if (features.has(feature.id) && features.get(feature.id).module !== moduleId) throw new Error(`Duplicate feature id ${feature.id} (${moduleId} vs ${features.get(feature.id).module})`);
        features.set(feature.id, { ...feature, module: moduleId });
    }
    modules.set(moduleId, (modules.get(moduleId) || 0) + list.length);
    return list.length;
}

export function all() { return [...features.values()]; }
export function byModule() { return Object.fromEntries([...modules.entries()].sort()); }
export function count() { return features.size; }
export function clear() { features.clear(); modules.clear(); }

export const hasDom = () => typeof document !== 'undefined' && typeof document.createElement === 'function';

/**
 * Run every registered feature test. Features marked `dom: true` are skipped
 * when no DOM is present (Node), and are reported as skipped.
 */
export async function runAll({ filter = null, timeoutMs = 5000, onProgress = null } = {}) {
    const results = [];
    const dom = hasDom();
    const list = all().filter((f) => !filter || filter(f));
    for (const feature of list) {
        if (feature.dom && !dom) { results.push({ id: feature.id, module: feature.module, title: feature.title, status: 'skipped', ms: 0 }); continue; }
        const started = Date.now();
        let status = 'passed'; let error = null;
        try {
            const value = await Promise.race([Promise.resolve().then(() => feature.test()), new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), timeoutMs))]);
            if (value !== true) { status = 'failed'; error = `returned ${JSON.stringify(value)}`; }
        } catch (e) { status = 'failed'; error = e && e.message ? e.message : String(e); }
        const entry = { id: feature.id, module: feature.module, title: feature.title, status, error, ms: Date.now() - started };
        results.push(entry);
        if (onProgress) onProgress(entry, results.length, list.length);
    }
    const passed = results.filter((r) => r.status === 'passed').length;
    const failed = results.filter((r) => r.status === 'failed');
    const skipped = results.filter((r) => r.status === 'skipped').length;
    return { total: results.length, passed, failed: failed.length, skipped, failures: failed, results, at: new Date().toISOString() };
}

export function reportMarkdown(summary) {
    const lines = [`# Feature self-test report`, '', `Generated ${summary.at}`, '', `| Metric | Value |`, `|---|---|`, `| Registered | ${summary.total} |`, `| Passed | ${summary.passed} |`, `| Failed | ${summary.failed} |`, `| Skipped (needs browser) | ${summary.skipped} |`, ''];
    const grouped = {};
    for (const r of summary.results) (grouped[r.module] = grouped[r.module] || []).push(r);
    for (const [mod, list] of Object.entries(grouped).sort()) {
        lines.push(`## ${mod} (${list.length})`, '', '| Feature | Title | Result |', '|---|---|---|');
        for (const r of list) lines.push(`| \`${r.id}\` | ${r.title} | ${r.status}${r.error ? ` – ${r.error}` : ''} |`);
        lines.push('');
    }
    return lines.join('\n');
}

export const FEATURES = [
    { id: 'core.registry.register', title: 'Register features with duplicate detection', test: () => { const before = count(); register('_t', [{ id: '_t.a', title: 'a', test: () => true }]); let dup = false; try { register('_u', [{ id: '_t.a', title: 'a', test: () => true }]); } catch (e) { dup = true; } features.delete('_t.a'); modules.delete('_t'); modules.delete('_u'); return dup && count() === before; } },
    { id: 'core.registry.run', title: 'Run self-tests with pass/fail/timeout reporting', test: async () => { register('_r', [{ id: '_r.ok', title: 'ok', test: () => true }, { id: '_r.bad', title: 'bad', test: () => false }, { id: '_r.throw', title: 'throw', test: () => { throw new Error('x'); } }]); const s = await runAll({ filter: (f) => f.module === '_r' }); for (const id of ['_r.ok', '_r.bad', '_r.throw']) features.delete(id); modules.delete('_r'); return s.total === 3 && s.passed === 1 && s.failed === 2; } },
    { id: 'core.registry.report', title: 'Markdown report generation', test: () => reportMarkdown({ at: 'now', total: 1, passed: 1, failed: 0, skipped: 0, results: [{ id: 'x.y', module: 'x', title: 'Y', status: 'passed' }] }).includes('| `x.y` | Y | passed |') }
];
