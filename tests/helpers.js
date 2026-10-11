'use strict';

const os = require('os');
const path = require('path');
const fs = require('fs');

// Test environment: no database, deterministic secret, quiet logger.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-test-secret-test-secret-1234';
process.env.DATABASE_URL = '';
process.env.DATA_DIR = process.env.DATA_DIR || fs.mkdtempSync(path.join(os.tmpdir(), 'solarflow-test-'));
process.env.LOG_DIR = path.join(process.env.DATA_DIR, 'logs');

function tempDir(prefix = 'solarflow-') {
    return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

async function startServer(options = {}) {
    const SolarFlowServer = require('../server');
    const server = new SolarFlowServer(options);
    await server.start(0, '127.0.0.1');
    const { port } = server.server.address();
    return { server, baseUrl: `http://127.0.0.1:${port}` };
}

module.exports = { tempDir, startServer };
