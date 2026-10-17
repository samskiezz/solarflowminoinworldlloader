'use strict';

const { tempDir } = require('./helpers');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const CerProductStore = require('../src/data/CerProductStore');
const StateStore = require('../src/data/StateStore');

test('CerProductStore flattens categories and filters/pages results', () => {
    const file = path.join(tempDir(), 'cer.json');
    fs.writeFileSync(file, JSON.stringify({
        metadata: { simulated: true },
        categories: {
            solar_panels: [{ id: 'P1', manufacturer: 'Trina Solar', model: 'T-400', category: 'solar_panel', cerApproved: true }],
            inverters: [{ id: 'I1', manufacturer: 'Fronius', model: 'Primo 5', category: 'inverter', cerApproved: false }],
            batteries: [{ id: 'B1', manufacturer: 'Tesla', model: 'Powerwall 2', category: 'battery', cerApproved: true }]
        }
    }));
    const store = new CerProductStore(file);
    assert.equal(store.count, 3);
    assert.equal(store.query({ category: 'inverter' }).total, 1);
    assert.equal(store.query({ manufacturer: 'tes' }).products[0].id, 'B1');
    assert.equal(store.query({ q: 'powerwall' }).total, 1);
    assert.equal(store.query({ verified: true }).total, 2);
    assert.equal(store.query({ limit: 1, offset: 1 }).products[0].id, 'I1');
    assert.equal(store.query({ limit: 99999 }).limit, CerProductStore.MAX_LIMIT);
    assert.equal(store.getById('nope'), null);
    assert.deepEqual(store.getSummary().manufacturers, ['Fronius', 'Tesla', 'Trina Solar']);
    assert.equal(store.getSummary().metadata.simulated, true);
});

test('the bundled CER database loads and matches its summary file', () => {
    const store = new CerProductStore();
    const summary = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'docs', 'cer-product-summary.json'), 'utf8'));
    assert.equal(store.count, summary.totalProducts);
    assert.ok(store.count > 1000);
});

test('StateStore writes atomically and validates keys', async () => {
    const store = await new StateStore(tempDir()).init();
    assert.equal(await store.get('missing'), null);
    await store.set('frontend-state', { a: 1 });
    assert.deepEqual(await store.get('frontend-state'), { a: 1 });
    assert.deepEqual(await store.keys(), ['frontend-state']);
    assert.equal(fs.readdirSync(store.dir).filter((f) => f.endsWith('.tmp')).length, 0);
    await assert.rejects(store.set('../escape', {}), /Invalid state key/);
    await assert.rejects(store.get('a b'), /Invalid state key/);
    assert.equal(await store.remove('frontend-state'), true);
    assert.equal(await store.remove('frontend-state'), false);
});

test('StateStore serialises concurrent writes to the same key', async () => {
    const store = await new StateStore(tempDir()).init();
    await Promise.all([1, 2, 3, 4, 5].map((n) => store.set('k', { n })));
    const final = await store.get('k');
    assert.ok(final && typeof final.n === 'number');
});
