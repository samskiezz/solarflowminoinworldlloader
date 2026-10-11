'use strict';

require('./helpers');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const SecurityService = require('../src/security/SecurityService');

const security = new SecurityService();
const schemas = security.getSchemas();

test('passwords are not HTML-sanitised or trimmed', () => {
    const result = security.validateAndSanitize({ email: 'Person@Example.com', password: ' <b>pa$$word</b> ' }, schemas.user);
    assert.equal(result.password, ' <b>pa$$word</b> ');
    assert.equal(result.email, 'person@example.com');
});

test('strings are stripped of HTML and validated', () => {
    const result = security.validateAndSanitize({
        modelNumber: ' <script>alert(1)</script>X-100 ',
        manufacturer: 'Fronius',
        productType: 'inverter',
        datasheetUrl: 'https://example.com/a.pdf'
    }, schemas.cerProduct);
    assert.equal(result.modelNumber, 'X-100');
    assert.equal(result.verified, false);
});

test('validation errors carry status 400 and the field list', () => {
    assert.throws(
        () => security.validateAndSanitize({ email: 'nope', password: 'short' }, schemas.user),
        (error) => error.status === 400 && error.errors.length === 2
    );
});

test('enum, url and non-string inputs are rejected', () => {
    assert.throws(() => security.validateAndSanitize({ modelNumber: 'A', manufacturer: 'B', productType: 'toaster' }, schemas.cerProduct));
    assert.throws(() => security.validateAndSanitize({ modelNumber: 'A', manufacturer: 'B', productType: 'inverter', datasheetUrl: 'ftp://x' }, schemas.cerProduct));
    assert.throws(() => security.validateAndSanitize({ email: { $gt: '' }, password: 'password123' }, schemas.user));
});

test('requireRole honours the role hierarchy', () => {
    const { requireRole } = security.middleware();
    const run = (role, required) => {
        let status = 200;
        let called = false;
        requireRole(required)({ user: { role } }, { status: (s) => { status = s; return { json: () => {} }; } }, () => { called = true; });
        return called ? 'next' : status;
    };
    assert.equal(run('admin', 'user'), 'next');
    assert.equal(run('user', 'admin'), 403);
    assert.equal(run('auditor', ['auditor', 'admin']), 'next');
    assert.equal(run(undefined, 'user'), 403);
});

test('brute force tracking locks out and prunes', () => {
    const svc = new SecurityService({ maxFailedLogins: 2, lockoutMs: 1000 });
    svc.recordFailedAttempt('1.1.1.1', 'A@b.com');
    assert.equal(svc.checkBruteForce('1.1.1.1', 'a@b.com').allowed, true);
    svc.recordFailedAttempt('1.1.1.1', 'a@b.com');
    assert.equal(svc.checkBruteForce('1.1.1.1', 'a@b.com').allowed, false);
    assert.equal(svc.pruneFailedAttempts(Date.now() + 5000), 1);
    assert.equal(svc.checkBruteForce('1.1.1.1', 'a@b.com').allowed, true);
    svc.dispose();
});

test('JWT round trip and rejection', () => {
    const jwt = require('jsonwebtoken');
    const config = require('../src/config');
    const token = jwt.sign({ userId: 1, role: 'user' }, config.auth.jwtSecret, { issuer: config.auth.jwtIssuer });
    assert.equal(security.validateJWT(token).userId, 1);
    assert.throws(() => security.validateJWT(token + 'x'), /Invalid token/);
    const wrongIssuer = jwt.sign({ userId: 1 }, config.auth.jwtSecret, { issuer: 'someone-else' });
    assert.throws(() => security.validateJWT(wrongIssuer), /Invalid token/);
});

test.after(() => security.dispose());
