'use strict';

const { tempDir } = require('./helpers');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const OpenClawVPSServer = require('../server/vps-server');

async function start(options) {
    const server = new OpenClawVPSServer({ dataPath: tempDir('vps-'), ...options });
    await server.start(0, '127.0.0.1');
    return { server, baseUrl: `http://127.0.0.1:${server.server.address().port}` };
}

test('preflight requests succeed and CORS headers are present', async () => {
    const { server, baseUrl } = await start({ writeKey: '' });
    try {
        const preflight = await fetch(`${baseUrl}/api/quantum/state`, {
            method: 'OPTIONS', headers: { Origin: 'https://samskiezz.github.io', 'Access-Control-Request-Method': 'POST' }
        });
        assert.equal(preflight.status, 204);
        assert.equal(preflight.headers.get('access-control-allow-origin'), '*');
        assert.match(preflight.headers.get('access-control-allow-headers'), /X-Api-Key/);
    } finally {
        await server.stop();
    }
});

test('state round-trips through atomic file writes', async () => {
    const { server, baseUrl } = await start({ writeKey: '' });
    try {
        const empty = await (await fetch(`${baseUrl}/api/quantum/state`)).json();
        assert.equal(empty.state, null);

        const save = await fetch(`${baseUrl}/api/quantum/state`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ consciousness_level: 0.67 })
        });
        assert.equal(save.status, 200);
        const loaded = await (await fetch(`${baseUrl}/api/quantum/state`)).json();
        assert.equal(loaded.state.consciousness_level, 0.67);
        assert.ok(loaded.state.timestamp);
        assert.equal(fs.readdirSync(server.dataPath).filter((f) => f.endsWith('.tmp')).length, 0);

        const bad = await fetch(`${baseUrl}/api/quantum/state`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '[1,2]' });
        assert.equal(bad.status, 400);
    } finally {
        await server.stop();
    }
});

test('a write key protects POST routes but not GET', async () => {
    const { server, baseUrl } = await start({ writeKey: 'secret-key' });
    try {
        const denied = await fetch(`${baseUrl}/api/minions/state`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"a":1}' });
        assert.equal(denied.status, 401);
        const allowed = await fetch(`${baseUrl}/api/minions/state`, {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Api-Key': 'secret-key' }, body: '{"a":1}'
        });
        assert.equal(allowed.status, 200);
        assert.equal((await fetch(`${baseUrl}/api/minions/state`)).status, 200);
        assert.equal((await fetch(`${baseUrl}/api/health`)).status, 200);
        assert.equal((await fetch(`${baseUrl}/api/nope`)).status, 404);
    } finally {
        await server.stop();
    }
});

test('knowledge base merges, de-duplicates and stays bounded', async () => {
    const { server, baseUrl } = await start({ writeKey: '' });
    try {
        const post = (body) => fetch(`${baseUrl}/api/knowledge/state`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        await post({ documents: [{ id: 'd1' }, { id: 'd2' }], compliance_data: { standards_verified: ['AS/NZS 3000'] } });
        await post({ documents: [{ id: 'd2' }, { id: 'd3' }], compliance_data: { standards_verified: ['AS/NZS 3000', 'AS/NZS 5033'] }, user_interactions: { button_clicks: [{ b: 1 }], 'bad key!': [1] } });
        const state = (await (await fetch(`${baseUrl}/api/knowledge/state`)).json()).state;
        assert.deepEqual(state.documents.map((d) => d.id), ['d1', 'd2', 'd3']);
        assert.deepEqual(state.compliance_data.standards_verified, ['AS/NZS 3000', 'AS/NZS 5033']);
        assert.equal(state.user_interactions.button_clicks.length, 1);
        assert.equal(state.user_interactions['bad key!'], undefined);

        const bounded = OpenClawVPSServer.appendBounded(new Array(5000).fill(0), [1, 2]);
        assert.equal(bounded.length, 5000);
        assert.equal(bounded[4999], 2);
    } finally {
        await server.stop();
    }
});
