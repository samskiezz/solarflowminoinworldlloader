'use strict';

const { startServer } = require('./helpers');
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const WebSocket = require('ws');

let server;
let baseUrl;

before(async () => {
    ({ server, baseUrl } = await startServer());
});

after(async () => {
    await server.stop();
});

test('health reports healthy with the database disabled', async () => {
    const response = await fetch(`${baseUrl}/health`);
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.status, 'healthy');
    assert.equal(body.database, 'disabled');
    assert.ok(response.headers.get('x-request-id'));
    assert.ok(response.headers.get('content-security-policy'));
});

test('the home page and static files are served', async () => {
    const home = await fetch(`${baseUrl}/`);
    assert.equal(home.status, 200);
    assert.match(home.headers.get('content-type'), /text\/html/);
    const json = await fetch(`${baseUrl}/minions.json`);
    assert.equal(json.status, 200);
    assert.match(json.headers.get('cache-control'), /max-age=300/);
});

test('CER products are served from the bundled file with paging', async () => {
    const response = await fetch(`${baseUrl}/api/cer-products?limit=5&category=inverter`);
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.source, 'file');
    assert.equal(body.products.length, 5);
    assert.ok(body.total > 5);
    assert.ok(body.products.every((p) => p.category === 'inverter'));

    const summary = await (await fetch(`${baseUrl}/api/cer-products/summary`)).json();
    assert.equal(summary.totalProducts, body.total + summary.byCategory.solar_panel + summary.byCategory.battery);

    const one = await fetch(`${baseUrl}/api/cer-products/${encodeURIComponent(body.products[0].id)}`);
    assert.equal(one.status, 200);
    assert.equal((await fetch(`${baseUrl}/api/cer-products/does-not-exist`)).status, 404);
});

test('standards are available without network access', async () => {
    const body = await (await fetch(`${baseUrl}/api/standards`)).json();
    assert.equal(body.success, true);
    assert.ok(body.standards.length > 0);
});

test('protected routes require a token and the database', async () => {
    assert.equal((await fetch(`${baseUrl}/api/data/foo`)).status, 401);
    const bad = await fetch(`${baseUrl}/api/data/foo`, { headers: { Authorization: 'Bearer nope' } });
    assert.equal(bad.status, 401);

    const jwt = require('jsonwebtoken');
    const config = require('../src/config');
    const token = jwt.sign({ userId: 1, email: 'a@b.c', role: 'admin' }, config.auth.jwtSecret, { issuer: config.auth.jwtIssuer });
    const noDb = await fetch(`${baseUrl}/api/data/foo`, { headers: { Authorization: `Bearer ${token}` } });
    assert.equal(noDb.status, 503);
    assert.equal((await noDb.json()).error, 'Database unavailable');
});

test('registration validates input before touching the database', async () => {
    const response = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'bad', password: '123' })
    });
    assert.equal(response.status, 400);
    const body = await response.json();
    assert.equal(body.details.length, 2);
});

test('compliance checks work for an authenticated user without a database', async () => {
    const jwt = require('jsonwebtoken');
    const config = require('../src/config');
    const token = jwt.sign({ userId: 1, email: 'a@b.c', role: 'user' }, config.auth.jwtSecret, { issuer: config.auth.jwtIssuer });
    const response = await fetch(`${baseUrl}/api/compliance/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ standard_code: 'AS_NZS_5033_2021', installation_data: { dc_isolator_present: true, frame_earthed: false } })
    });
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.compliance.overall_status, 'FAIL');
});

test('anonymous state writes are refused by default and reads are 204 when empty', async () => {
    const empty = await fetch(`${baseUrl}/api/state`);
    assert.equal(empty.status, 204);
    assert.equal(empty.headers.get('x-state-writable'), 'false');
    const write = await fetch(`${baseUrl}/api/state`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hello: 'world' })
    });
    assert.equal(write.status, 403);
});

test('authenticated state writes round-trip', async () => {
    const jwt = require('jsonwebtoken');
    const config = require('../src/config');
    const token = jwt.sign({ userId: 1, email: 'a@b.c', role: 'user' }, config.auth.jwtSecret, { issuer: config.auth.jwtIssuer });
    const write = await fetch(`${baseUrl}/api/state`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ hello: 'world' })
    });
    assert.equal(write.status, 200);
    const read = await (await fetch(`${baseUrl}/api/state`)).json();
    assert.equal(read.hello, 'world');
    assert.ok(read.savedAt);
});

test('unknown API routes return JSON 404 and malformed JSON returns 400', async () => {
    const missing = await fetch(`${baseUrl}/api/nope`);
    assert.equal(missing.status, 404);
    assert.equal((await missing.json()).error, 'Not found');

    const page = await fetch(`${baseUrl}/no-such-page`, { headers: { Accept: 'text/html' } });
    assert.equal(page.status, 404);
    assert.match(page.headers.get('content-type'), /text\/html/);

    const malformed = await fetch(`${baseUrl}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{bad json' });
    assert.equal(malformed.status, 400);
});

test('CORS allows configured origins and rejects others', async () => {
    const allowed = await fetch(`${baseUrl}/api/version`, { headers: { Origin: 'http://localhost:3000' } });
    assert.equal(allowed.headers.get('access-control-allow-origin'), 'http://localhost:3000');
    const denied = await fetch(`${baseUrl}/api/version`, { headers: { Origin: 'https://evil.example' } });
    assert.equal(denied.headers.get('access-control-allow-origin'), null);
});

test('websocket clients get a status message and can ping', async () => {
    const ws = new WebSocket(baseUrl.replace('http', 'ws'));
    const messages = [];
    await new Promise((resolve, reject) => {
        ws.on('error', reject);
        ws.on('message', (raw) => {
            messages.push(JSON.parse(raw));
            if (messages.length === 1) ws.send(JSON.stringify({ type: 'ping' }));
            if (messages.length === 2) resolve();
        });
    });
    assert.equal(messages[0].type, 'system_status');
    assert.equal(messages[1].type, 'pong');
    ws.close();
});
