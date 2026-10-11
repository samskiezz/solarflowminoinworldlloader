// Runs every self-test the Realm core shell registers (DOM-only tests are skipped here and run in the browser smoke test).
import { test } from 'node:test';
import assert from 'node:assert/strict';

const modules = ['bus', 'store', 'registry', 'keybinds', 'i18n', 'clock', 'ui', 'wm', 'commands', 'context'];

for (const name of modules) {
    test(`core/${name}: registered self-tests pass`, async () => {
        const mod = await import(`../docs/realm/js/core/${name}.js`);
        assert.ok(Array.isArray(mod.FEATURES) && mod.FEATURES.length > 0);
        let ran = 0;
        for (const feature of mod.FEATURES) {
            if (feature.dom) continue;
            let result;
            try { result = await feature.test(); } catch (error) { assert.fail(`${feature.id} threw: ${error.stack}`); }
            assert.equal(result, true, `${feature.id} (${feature.title}) returned ${result}`);
            ran++;
        }
        assert.ok(ran > 0, `${name} has no Node-runnable self-tests`);
    });
}
