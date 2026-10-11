'use strict';

const { startServer, tempDir } = require('./helpers');
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const jwt = require('jsonwebtoken');

process.env.BUSINESS_API_TOKEN = 'business-token-for-tests-1234567890';

const BusinessService = require('../src/business/BusinessService');
const servicem8 = require('../src/business/adapters/servicem8');
const xero = require('../src/business/adapters/xero');
const google = require('../src/business/adapters/google');
const bank = require('../src/business/adapters/bank');
const config = require('../src/config');

let server; let baseUrl; let business;
const headers = (token) => ({ authorization: `Bearer ${token}`, 'content-type': 'application/json' });
const adminJwt = () => jwt.sign({ userId: 1, email: 'admin@example.test', role: 'admin' }, config.auth.jwtSecret, { issuer: config.auth.jwtIssuer, expiresIn: '1h' });
const userJwt = () => jwt.sign({ userId: 2, email: 'user@example.test', role: 'user' }, config.auth.jwtSecret, { issuer: config.auth.jwtIssuer, expiresIn: '1h' });

/** A fake ServiceM8 + bank backend behind fetch. */
function fakeFetch() {
    return async (url, init = {}) => {
        const u = String(url);
        const json = (body, status = 200) => ({ ok: status < 400, status, text: async () => JSON.stringify(body) });
        if (u.startsWith(servicem8.BASE)) {
            if (!(init.headers.authorization || '').startsWith('Basic ')) return json({ error: 'no auth' }, 401);
            if (u.includes('/job.json')) return json(u.includes('$skip') ? [] : [{ uuid: 'j1', generated_job_id: '2001', company_uuid: 'c1', status: 'Work Order', job_address: '4 Test St\nRyde NSW 2112', job_description: 'Customer Name: Test Person\nInverter: 10K hybrid\nSolar Panels: 20 x 440 W', total_invoice_amount: '9900', payment_amount: '0', edit_date: '2026-10-01 10:00:00' }]);
            if (u.includes('/company.json')) return json([{ uuid: 'c1', name: 'Example Solar Co' }]);
            if (u.includes('/staff.json')) return json([{ uuid: 's1', first: 'Sam', last: 'Example' }]);
            if (u.includes('/jobactivity.json')) return json([{ uuid: 'a1', job_uuid: 'j1', staff_uuid: 's1', start_date: '2026-10-20 08:00:00', end_date: '2026-10-20 16:00:00' }]);
            return json([]);
        }
        if (u === 'https://bank.example/feed') return json({ banks: [{ id: 'b', name: 'Bank' }], accounts: [{ id: 'a', bankId: 'b', name: 'Business', type: 'checking', balance: 1000 }], transactions: [{ date: '2026-10-01', amount: -100, description: 'Supplier' }] });
        return json({ error: `unexpected ${u}` }, 500);
    };
}

before(async () => {
    const dir = path.join(tempDir('business-'), 'business');
    business = new BusinessService({ dir, fetchFn: fakeFetch() });
    ({ server, baseUrl } = await startServer({ business }));
});
after(async () => { await server.stop(); });

test('business routes require a token; the static business token and user JWTs both read', async () => {
    assert.equal((await fetch(`${baseUrl}/api/business/model`)).status, 401);
    const none = await fetch(`${baseUrl}/api/business/model`, { headers: headers(process.env.BUSINESS_API_TOKEN) });
    assert.equal(none.status, 204); // nothing built yet
    const st = await fetch(`${baseUrl}/api/business/status`, { headers: headers(userJwt()) });
    assert.equal(st.status, 200);
    const body = await st.json();
    assert.equal(body.model, null);
    assert.deepEqual(Object.keys(body.configured).sort(), ['bank', 'google', 'servicem8', 'xero']);
});

test('sync needs admin, pulls the configured connectors through the adapters and builds the model', async () => {
    assert.equal((await fetch(`${baseUrl}/api/business/sync`, { method: 'POST', headers: headers(userJwt()), body: '{}' })).status, 403);
    config.business.servicem8.apiKey = 'test-key'; config.business.bank.feedUrl = 'https://bank.example/feed';
    try {
        const res = await fetch(`${baseUrl}/api/business/sync?wait=1`, { method: 'POST', headers: headers(adminJwt()), body: JSON.stringify({ only: ['servicem8', 'bank', 'xero'] }) });
        assert.equal(res.status, 200);
        const result = await res.json();
        assert.equal(result.results.servicem8.ok, true);
        assert.equal(result.results.bank.ok, true);
        assert.equal(result.results.xero.skipped, 'not configured');
        assert.equal(result.built.jobs, 1);
        const model = await (await fetch(`${baseUrl}/api/business/model`, { headers: headers(process.env.BUSINESS_API_TOKEN) })).json();
        assert.equal(model.jobs[0].id, 'SM8-2001');
        assert.equal(model.jobs[0].isScheduled, true);
        assert.equal(model.jobs[0].customer, 'Test Person');
        assert.equal(model.bank.accounts.length, 1);
        assert.ok(model.insights.length >= 1);
        const raw = await (await fetch(`${baseUrl}/api/business/raw/servicem8`, { headers: headers(adminJwt()) })).json();
        assert.equal(raw.lists[0].jobs[0].title, 'Example Solar Co');
        assert.equal((await fetch(`${baseUrl}/api/business/raw/nope`, { headers: headers(adminJwt()) })).status, 204);
    } finally { config.business.servicem8.apiKey = ''; config.business.bank.feedUrl = ''; }
});

test('import accepts a raw payload or a built model', async () => {
    const { SAMPLE_RAW } = await import('../docs/realm/js/business/model.js');
    const res = await fetch(`${baseUrl}/api/business/import`, { method: 'POST', headers: headers(adminJwt()), body: JSON.stringify(SAMPLE_RAW()) });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.jobs, 5);
    const model = await (await fetch(`${baseUrl}/api/business/model`, { headers: headers(userJwt()) })).json();
    assert.equal(model.company.name, 'Example Solar Co');
    const again = await fetch(`${baseUrl}/api/business/import`, { method: 'POST', headers: headers(adminJwt()), body: JSON.stringify(model) });
    assert.equal((await again.json()).sites, 4);
});

test('adapters: configuration detection and the Xero report flattener', () => {
    assert.equal(servicem8.isConfigured({ apiKey: 'k' }), true);
    assert.equal(servicem8.isConfigured({ email: 'a', password: '' }), false);
    assert.equal(xero.isConfigured({ clientId: 'a', clientSecret: 'b' }), true);
    assert.equal(google.isConfigured({ serviceAccount: '{}', subject: '' }), false);
    assert.equal(google.isConfigured({ oauthClientId: 'a', oauthClientSecret: 'b', oauthRefreshToken: 'c' }), true);
    assert.equal(bank.isConfigured({ feedUrl: '' }), false);
    const rows = xero.reportRows({ Rows: [{ Title: 'Income', Rows: [{ RowType: 'Row', Cells: [{ Value: 'Sales' }, { Value: '100.00' }] }, { RowType: 'SummaryRow', Cells: [{ Value: 'Total Income' }, { Value: '100.00' }] }] }] });
    assert.deepEqual(rows.sections.Income, [['Sales', 100]]);
    assert.equal(rows.sections['Income:total'], 100);
    assert.equal(xero.xeroDate('/Date(1759276800000+0000)/').toISOString().slice(0, 10), '2025-10-01');
});

test('google service-account assertions are well-formed RS256 JWTs', () => {
    const { generateKeyPairSync } = require('crypto');
    const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
    const pem = privateKey.export({ type: 'pkcs8', format: 'pem' });
    const token = google.serviceAccountAssertion({ client_email: 'svc@example.test', private_key: pem, private_key_id: 'kid' }, 'user@example.test', { now: 1000 });
    const [h, c] = token.split('.').slice(0, 2).map((p) => JSON.parse(Buffer.from(p.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString()));
    assert.equal(h.alg, 'RS256');
    assert.equal(c.sub, 'user@example.test');
    assert.equal(c.exp, 4600);
    assert.ok(c.scope.includes('gmail.readonly'));
});
