// Runs every self-test the Realm domain modules register, plus targeted assertions.
import { test } from 'node:test';
import assert from 'node:assert/strict';

const modules = [
    'pv', 'ac', 'battery', 'incentives', 'yield', 'loads', 'checklists', 'commissioning', 'labels', 'jobs', 'products', 'report', 'standards', 'jurisdictions', 'hierarchy', 'courtsafe', 'compliance', 'pipeline'
];

for (const name of modules) {
    test(`domain/${name}: registered self-tests pass`, async () => {
        const mod = await import(`../docs/realm/js/domain/${name}.js`);
        assert.ok(Array.isArray(mod.FEATURES) && mod.FEATURES.length > 0, `${name} exports FEATURES`);
        const ids = new Set();
        for (const feature of mod.FEATURES) {
            assert.ok(feature.id && feature.title && typeof feature.test === 'function', `${name}: feature shape ${feature.id}`);
            assert.ok(!ids.has(feature.id), `${name}: duplicate feature id ${feature.id}`);
            ids.add(feature.id);
            let result;
            try {
                result = await feature.test();
            } catch (error) {
                assert.fail(`${feature.id} threw: ${error.message}`);
            }
            assert.equal(result, true, `${feature.id} (${feature.title}) returned ${result}`);
        }
    });
}

test('string sizing example matches a hand calculation', async () => {
    const { stringSizing } = await import('../docs/realm/js/domain/pv.js');
    const r = stringSizing({
        module: { voc: 49.5, vmp: 41.2, isc: 13.9, tempCoeffVoc: -0.28, tempCoeffPmax: -0.35 },
        inverter: { maxDcVoltage: 600, mpptMin: 125, mpptMax: 550, maxInputCurrent: 16 },
        site: { tMin: 2, tAmbientMax: 40 },
        installationClass: 'domestic_pre_2024'
    });
    // Voc cold = 49.5 × (1 + -0.0028 × (2-25)) = 52.69 → floor(600/52.69) = 11
    assert.equal(r.maxModules, 11);
    assert.equal(r.voltageCeiling, 600);
});

test('voltage rise example: 5 kW single-phase, 6 mm², 25 m ≈ 1.8 %', async () => {
    const { voltageRise, inverterCurrent } = await import('../docs/realm/js/domain/ac.js');
    const r = voltageRise({ currentA: inverterCurrent({ kw: 5 }), lengthM: 25, cableMm2: 6 });
    assert.ok(r.pct > 1.75 && r.pct < 1.9, `got ${r.pct}`);
});

test('STC example: 6.6 kW Sydney 2026 = 45 STCs', async () => {
    const { solarStcs } = await import('../docs/realm/js/domain/incentives.js');
    assert.equal(solarStcs({ kw: 6.6, postcode: 2000, installYear: 2026 }).stcs, 45);
});
