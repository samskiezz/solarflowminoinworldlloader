/**
 * Smoke test for a running VPS server.
 *
 *   node server/test-endpoints.js [baseUrl]
 *
 * Defaults to http://localhost:3000 (or $VPS_URL). Sends X-Api-Key from
 * $VPS_WRITE_KEY when set. Exits non-zero if any check fails.
 */
'use strict';

const baseUrl = (process.argv[2] || process.env.VPS_URL || 'http://localhost:3000').replace(/\/$/, '');
const writeKey = process.env.VPS_WRITE_KEY || '';
let failures = 0;

async function request(method, route, data) {
    const response = await fetch(baseUrl + route, {
        method,
        headers: { 'Content-Type': 'application/json', ...(writeKey ? { 'X-Api-Key': writeKey } : {}) },
        body: data ? JSON.stringify(data) : undefined
    });
    let body;
    try { body = await response.json(); } catch (error) { body = null; }
    return { status: response.status, data: body };
}

function check(label, condition, detail) {
    console.log(`${condition ? '✅' : '❌'} ${label}${detail ? ` (${detail})` : ''}`);
    if (!condition) failures++;
}

async function run() {
    console.log(`🧪 Testing VPS endpoints at ${baseUrl}\n`);

    const health = await request('GET', '/api/health');
    check('health endpoint', health.status === 200 && health.data && health.data.status === 'healthy', `status ${health.status}`);

    const stamp = Date.now();
    const save = await request('POST', '/api/quantum/state', { consciousness_level: 0.67, stamp });
    check('save quantum state', save.status === 200, `status ${save.status}`);

    const load = await request('GET', '/api/quantum/state');
    check('load quantum state', load.status === 200 && load.data && load.data.state && load.data.state.stamp === stamp);

    const knowledge = await request('POST', '/api/knowledge/state', {
        documents: [{ id: `smoke-${stamp}`, title: 'Smoke test document' }],
        compliance_data: { checks_performed: [{ standard: 'AS/NZS 3000', result: 'passed', timestamp: new Date().toISOString() }], standards_verified: ['AS/NZS 3000'] }
    });
    check('update knowledge base', knowledge.status === 200 && knowledge.data && knowledge.data.stats.documents >= 1);

    const missing = await request('GET', '/api/does-not-exist');
    check('unknown API route returns 404 JSON', missing.status === 404 && missing.data && missing.data.success === false);

    console.log(`\n${failures === 0 ? '🎉 All checks passed' : `❌ ${failures} check(s) failed`}`);
    process.exit(failures === 0 ? 0 : 1);
}

run().catch((error) => {
    console.error('❌ Could not reach the server:', error.message);
    process.exit(1);
});
