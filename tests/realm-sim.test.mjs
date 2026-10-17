// Runs every self-test the Realm simulation modules register, plus scenario tests.
import { test } from 'node:test';
import assert from 'node:assert/strict';

const modules = ['needs', 'traits', 'skills', 'memory', 'planner', 'dialogue', 'economy', 'events', 'agent', 'world', 'narrative', 'shifts', 'workforce'];

for (const name of modules) {
    test(`sim/${name}: registered self-tests pass`, async () => {
        const mod = await import(`../docs/realm/js/sim/${name}.js`);
        assert.ok(Array.isArray(mod.FEATURES) && mod.FEATURES.length > 0);
        for (const feature of mod.FEATURES) {
            let result;
            try { result = await feature.test(); } catch (error) { assert.fail(`${feature.id} threw: ${error.stack}`); }
            assert.equal(result, true, `${feature.id} (${feature.title}) returned ${result}`);
        }
    });
}

test('a crew works a job through its lead stage within a simulated day', async () => {
    const { World } = await import('../docs/realm/js/sim/world.js');
    const world = new World({ seed: 11 });
    world.addAgent({ id: 'atlas', name: 'Atlas', traits: ['meticulous', 'steady'], needs: { energy: 100, focus: 100, morale: 90, social: 90, mastery: 90, safety: 90 } });
    const job = world.addJob({ customer: 'Test', postcode: '2000', systemKw: 6.6 });
    let assignments = 0;
    for (let h = 0; h < 48; h++) {
        if (!world.agent('atlas').currentTask && world.assignNextTask('atlas', job.id, { hours: 1, difficulty: 2 })) assignments++;
        world.tick(1);
    }
    const doneLead = Object.entries(job.tasks).filter(([k, v]) => k.startsWith('lead:') && v).length;
    assert.ok(doneLead >= 2, `expected lead tasks done, got ${doneLead} after ${assignments} assignments`);
    assert.ok(world.ledger.balance > 100, 'credits earned');
    assert.ok(world.agent('atlas').memory.records.length > 5, 'memories recorded');
});

test('the simulation is deterministic for a seed', async () => {
    const { World } = await import('../docs/realm/js/sim/world.js');
    const run = () => {
        const w = new World({ seed: 42 });
        w.addAgent({ id: 'bolt', traits: ['sprinter'], needs: { energy: 90, focus: 90, morale: 90, social: 90, mastery: 90, safety: 90 } });
        const j = w.addJob({ customer: 'D' });
        for (let i = 0; i < 20; i++) { if (!w.agent('bolt').currentTask) w.assignNextTask('bolt', j.id, { hours: 1 }); w.tick(1); }
        return JSON.stringify([w.agent('bolt').needs, w.ledger.balance, w.feed.map((f) => f.type)]);
    };
    assert.equal(run(), run());
});
