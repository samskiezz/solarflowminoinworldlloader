'use strict';

const { tempDir } = require('./helpers');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const RealStandardsService = require('../src/standards/RealStandardsService');

const service = new RealStandardsService({ baseDir: tempDir(), allowRemoteFetch: false });

test('missing inputs produce UNKNOWN checks and an INCOMPLETE result, not FAIL', async () => {
    const result = await service.checkCompliance({}, 'AS_NZS_5033_2021');
    assert.equal(result.overall_status, 'INCOMPLETE');
    assert.equal(result.critical_issues.length, 0);
    assert.ok(result.unknown.length >= 2);
    assert.match(result.recommendations[0], /dc_isolator_present/);
});

test('a complete compliant installation passes', async () => {
    const result = await service.checkCompliance({
        dc_isolator_present: true, frame_earthed: true, cable_protection_adequate: true, labelling_complete: true
    }, 'AS/NZS 5033:2021');
    assert.equal(result.standard, 'AS_NZS_5033_2021');
    assert.equal(result.overall_status, 'PASS');
    assert.equal(result.score, 100);
});

test('a critical failure fails the whole check', async () => {
    const result = await service.checkCompliance({ voltage_rise: 3.5, inverter_certified: true }, 'AS_NZS_4777_2016');
    assert.equal(result.standard, 'AS_NZS_4777_1_2016');
    assert.equal(result.overall_status, 'FAIL');
    assert.deepEqual(result.critical_issues, ['Voltage rise']);
});

test('battery checks handle absent, unknown and present systems', async () => {
    assert.equal((await service.checkCompliance({ battery_system: false }, 'AS_NZS_5139_2019')).checks[0].status, 'N/A');
    assert.equal((await service.checkCompliance({}, 'AS_NZS_5139_2019')).overall_status, 'INCOMPLETE');
    const present = await service.checkCompliance({ battery_system: true, battery_clearances_adequate: false, battery_ventilation_adequate: true }, 'AS_NZS_5139_2019');
    assert.equal(present.overall_status, 'FAIL');
});

test('unsupported standards are rejected with a 400 error', async () => {
    await assert.rejects(service.checkCompliance({}, 'AS_1234'), (error) => error.status === 400);
});

test('getLocalStandards never fetches and returns bundled data', async () => {
    const data = await service.getLocalStandards();
    assert.equal(data.legal_status, 'PUBLIC_SUMMARIES_ONLY');
    assert.ok(data.standards.length >= 10);
    assert.ok(data.reference && typeof data.reference === 'object');
});

test('refresh with remote fetch disabled does not touch the network', async () => {
    const data = await service.fetchPublicStandardsContent();
    assert.equal(data.remote_fetch, 'disabled');
});
