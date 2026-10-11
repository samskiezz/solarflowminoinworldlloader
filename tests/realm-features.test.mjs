// Runs every Node-runnable feature self-test in the Realm Workstation registry (windows, shell, domain, sim, core).
import { test } from 'node:test';
import assert from 'node:assert/strict';

test('realm registry: every Node-runnable feature self-test passes', async () => {
    const { loadAll, registry } = await import('../docs/realm/js/modules.js');
    await loadAll();
    assert.ok(registry.count() >= 500, `expected at least 500 registered features, got ${registry.count()}`);
    const summary = await registry.runAll({ filter: (f) => !f.dom });
    assert.equal(summary.failed, 0, summary.failures.map((f) => `${f.id}: ${f.error}`).join('\n'));
    assert.ok(summary.passed >= 250);
});
