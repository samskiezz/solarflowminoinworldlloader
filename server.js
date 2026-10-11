/**
 * SolarFlow API server.
 *
 * Serves the static site in docs/ and a small JSON API. PostgreSQL is
 * optional: without DATABASE_URL the server still serves the site, the CER
 * product catalogue (from the bundled JSON), the standards reference data
 * and the file-backed shared state.
 */
'use strict';

require('dotenv').config();

const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const compression = require('compression');
const WebSocket = require('ws');

const config = require('./src/config');
const logger = require('./src/logger');
const DatabaseService = require('./src/database/DatabaseService');
const SecurityService = require('./src/security/SecurityService');
const RealStandardsService = require('./src/standards/RealStandardsService');
const CerProductStore = require('./src/data/CerProductStore');
const StateStore = require('./src/data/StateStore');
const BusinessService = require('./src/business/BusinessService');

const STATE_KEY = 'frontend-state';

function asyncRoute(handler) {
    return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function parseBoolean(value) {
    if (value === undefined) return undefined;
    if (value === 'true' || value === '1') return true;
    if (value === 'false' || value === '0') return false;
    return undefined;
}

class SolarFlowServer {
    constructor(options = {}) {
        this.options = options;
        this.app = express();
        this.server = http.createServer(this.app);
        this.wss = new WebSocket.Server({ server: this.server, maxPayload: config.websocket.maxPayloadBytes });

        this.db = options.db || new DatabaseService();
        this.security = options.security || new SecurityService();
        this.standards = options.standards || new RealStandardsService();
        this.products = options.products || new CerProductStore();
        this.state = options.state || new StateStore(path.join(config.dataDir, 'state'));
        this.business = options.business || new BusinessService();

        this.clients = new Set();
        this.dbRetryTimer = null;
        this.dbAttempts = 0;
        this.shuttingDown = false;
        this.startedAt = Date.now();

        this.setupMiddleware();
        this.setupRoutes();
        this.setupStatic();
        this.setupErrorHandling();
        this.setupWebSocket();
    }

    // ------------------------------------------------------------ middleware

    setupMiddleware() {
        const app = this.app;
        app.disable('x-powered-by');
        if (config.trustProxy) app.set('trust proxy', 1);

        app.use((req, res, next) => {
            req.id = req.get('X-Request-Id') || crypto.randomUUID();
            res.setHeader('X-Request-Id', req.id);
            next();
        });

        app.use(this.security.getSecurityHeaders());
        app.use(this.security.getCORSConfig());
        app.use(compression());
        app.use(express.json({ limit: config.bodyLimit }));
        app.use(express.urlencoded({ extended: false, limit: config.bodyLimit }));
        app.use(this.security.middleware().logRequest);

        const limiters = this.security.getRateLimiters();
        this.limiters = limiters;
        app.use('/api/auth', limiters.auth);
        app.use('/api', limiters.general);
    }

    requestMeta(req) {
        return { ip: req.ip, userAgent: req.get('User-Agent'), userId: req.user ? req.user.userId : null };
    }

    // ---------------------------------------------------------------- routes

    setupRoutes() {
        const app = this.app;
        const { authenticate, requireRole } = this.security.middleware();
        const schemas = this.security.getSchemas();
        const modify = this.limiters.modify;

        // Health -------------------------------------------------------------
        const health = (req, res) => {
            const dbState = !this.db.isConfigured() ? 'disabled' : this.db.isReady() ? 'connected' : 'unavailable';
            const degraded = this.db.isConfigured() && !this.db.isReady();
            res.status(degraded ? 503 : 200).json({
                status: degraded ? 'degraded' : 'healthy',
                version: config.version,
                timestamp: new Date().toISOString(),
                uptime: Math.round(process.uptime()),
                memory: { rss: process.memoryUsage().rss, heapUsed: process.memoryUsage().heapUsed },
                database: dbState,
                databaseError: degraded && this.db.lastError ? this.db.lastError.message : undefined,
                websocketClients: this.clients.size,
                services: { database: dbState, standards: 'healthy', security: 'healthy', products: this.products.products ? 'loaded' : 'lazy' }
            });
        };
        app.get('/health', health);
        app.get('/api/health', health);
        app.get('/ready', (req, res) => res.status(this.shuttingDown ? 503 : 200).json({ ready: !this.shuttingDown }));
        app.get('/api/version', (req, res) => res.json({ version: config.version, node: process.version, env: config.env }));

        // Auth ---------------------------------------------------------------
        app.post('/api/auth/register', asyncRoute(async (req, res) => {
            const userData = this.security.validateAndSanitize(req.body, schemas.user);
            const user = await this.db.createUser(userData.email, userData.password, 'user', this.requestMeta(req));
            res.status(201).json({ success: true, user });
        }));

        app.post('/api/auth/login', asyncRoute(async (req, res) => {
            const { email, password } = this.security.validateAndSanitize(req.body, schemas.login);
            const bruteCheck = this.security.checkBruteForce(req.ip, email);
            if (!bruteCheck.allowed) {
                res.setHeader('Retry-After', Math.ceil(bruteCheck.remaining / 1000));
                return res.status(429).json({ error: 'Too many failed attempts', retryAfter: Math.ceil(bruteCheck.remaining / 1000) });
            }
            try {
                const authResult = await this.db.authenticateUser(email, password, this.requestMeta(req));
                this.security.clearFailedAttempts(req.ip, email);
                return res.json({ success: true, token: authResult.token, user: authResult.user });
            } catch (error) {
                if (error.status === 401) {
                    this.security.recordFailedAttempt(req.ip, email);
                    return res.status(401).json({ error: 'Authentication failed' });
                }
                throw error;
            }
        }));

        app.get('/api/auth/me', authenticate, (req, res) => {
            res.json({ user: { id: req.user.userId, email: req.user.email, role: req.user.role } });
        });

        // Per-user key/value data -------------------------------------------
        app.get('/api/data/:key', authenticate, asyncRoute(async (req, res) => {
            const { key } = this.security.validateAndSanitize({ key: req.params.key }, { key: schemas.systemData.key });
            const data = await this.db.getData(key, req.user.userId);
            res.json({ success: true, key, data });
        }));

        app.post('/api/data/:key', authenticate, modify, asyncRoute(async (req, res) => {
            const { key, value } = this.security.validateAndSanitize({ key: req.params.key, value: req.body }, schemas.systemData);
            const saveResult = await this.db.saveData(key, value, req.user.userId, this.requestMeta(req));
            this.broadcast({ type: 'data_update', key, userId: req.user.userId, timestamp: new Date().toISOString() }, 'data');
            res.json(saveResult);
        }));

        // Shared front-end state (used by the bootloaders on every page) -----
        app.get('/api/state', asyncRoute(async (req, res) => {
            const state = await this.state.get(STATE_KEY);
            res.setHeader('Cache-Control', 'no-store');
            // Tells the front end whether anonymous POSTs would be accepted, so it
            // can skip them instead of collecting a 403 on every page load.
            res.setHeader('X-State-Writable', String(config.state.allowAnonymousWrites));
            if (!state) return res.status(204).end();
            return res.json(state);
        }));

        app.post('/api/state', modify, asyncRoute(async (req, res) => {
            const authHeader = req.headers.authorization || '';
            let authorised = config.state.allowAnonymousWrites;
            if (!authorised && authHeader.startsWith('Bearer ')) {
                try {
                    req.user = this.security.validateJWT(authHeader.slice(7));
                    authorised = true;
                } catch (error) {
                    return res.status(401).json({ error: error.message });
                }
            }
            if (!authorised) {
                return res.status(403).json({ error: 'State writes require authentication (or ALLOW_ANONYMOUS_STATE_WRITES=true)' });
            }
            if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
                return res.status(400).json({ error: 'State must be a JSON object' });
            }
            const bytes = Buffer.byteLength(JSON.stringify(req.body));
            if (bytes > config.state.maxBytes) {
                return res.status(413).json({ error: `State too large (${bytes} bytes, limit ${config.state.maxBytes})` });
            }
            const saved = await this.state.set(STATE_KEY, { ...req.body, savedAt: new Date().toISOString() });
            this.broadcast({ type: 'state_update', timestamp: new Date().toISOString(), bytes: saved.bytes }, 'state');
            return res.json({ success: true, bytes: saved.bytes });
        }));

        // CER products ------------------------------------------------------
        app.get('/api/cer-products/summary', (req, res) => {
            res.setHeader('Cache-Control', 'public, max-age=300');
            res.json({ success: true, ...this.products.getSummary() });
        });

        app.get('/api/cer-products', asyncRoute(async (req, res) => {
            const filters = {
                manufacturer: req.query.manufacturer,
                category: req.query.category || req.query.type,
                q: req.query.q,
                verified: parseBoolean(req.query.verified),
                limit: req.query.limit,
                offset: req.query.offset
            };

            if (req.query.source === 'db' || (this.db.isReady() && req.query.source !== 'file')) {
                if (!this.db.isReady()) return res.status(503).json({ error: 'Database unavailable' });
                const result = await this.db.getCERProducts({ ...filters, productType: filters.category });
                return res.json({ success: true, source: 'database', ...result, count: result.products.length });
            }

            const result = this.products.query(filters);
            res.setHeader('Cache-Control', 'public, max-age=60');
            return res.json({ success: true, source: 'file', ...result, count: result.products.length });
        }));

        app.get('/api/cer-products/:id', (req, res) => {
            const product = this.products.getById(req.params.id);
            if (!product) return res.status(404).json({ error: 'Product not found' });
            res.setHeader('Cache-Control', 'public, max-age=300');
            return res.json({ success: true, product });
        });

        app.post('/api/cer-products', authenticate, requireRole(['auditor', 'admin']), modify, asyncRoute(async (req, res) => {
            const productData = this.security.validateAndSanitize(req.body, schemas.cerProduct);
            const product = await this.db.saveCERProduct(productData, this.requestMeta(req));
            res.status(201).json({ success: true, product });
        }));

        // Standards ---------------------------------------------------------
        app.get('/api/standards', asyncRoute(async (req, res) => {
            const standardsList = await this.standards.getLocalStandards();
            res.setHeader('Cache-Control', 'public, max-age=300');
            res.json({ success: true, ...standardsList });
        }));

        app.post('/api/standards/refresh', authenticate, requireRole('admin'), asyncRoute(async (req, res) => {
            const refreshed = await this.standards.fetchPublicStandardsContent();
            res.json({ success: true, count: (refreshed.standards || []).length, remote_fetch: refreshed.remote_fetch || 'completed' });
        }));

        // Compliance --------------------------------------------------------
        app.post('/api/compliance/check', authenticate, modify, asyncRoute(async (req, res) => {
            const { installation_data: installation, standard_code: standardCode } =
                this.security.validateAndSanitize(req.body, schemas.complianceCheck);
            const compliance = await this.standards.checkCompliance(installation, standardCode);

            let recordId = null;
            if (installation.product_id && this.db.isReady()) {
                const record = await this.db.recordComplianceCheck(compliance.standard, installation.product_id, compliance.overall_status, compliance, req.user.email);
                recordId = record.compliance_check_id;
            }
            res.json({ success: true, compliance, record_id: recordId });
        }));

        // Admin -------------------------------------------------------------
        app.get('/api/audit', authenticate, requireRole('admin'), asyncRoute(async (req, res) => {
            const logs = await this.db.getAuditLog({
                userId: req.query.userId,
                action: req.query.action,
                startDate: req.query.startDate,
                limit: req.query.limit
            });
            res.json({ success: true, logs, count: logs.length });
        }));

        // Business (read-only connectors -> model) ---------------------------
        // Either a logged-in user (JWT) or the static BUSINESS_API_TOKEN may read.
        const businessAuth = (req, res, next) => {
            const header = req.headers.authorization || '';
            const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
            const staticToken = config.business.token;
            if (staticToken && token && token.length === staticToken.length && crypto.timingSafeEqual(Buffer.from(token), Buffer.from(staticToken))) {
                req.user = { role: 'admin', email: 'business-token' };
                return next();
            }
            return authenticate(req, res, next);
        };
        app.get('/api/business/status', businessAuth, asyncRoute(async (req, res) => { res.json(await this.business.status()); }));
        app.get('/api/business/model', businessAuth, asyncRoute(async (req, res) => {
            const model = await this.business.model();
            if (!model) return res.status(204).end();
            res.setHeader('cache-control', 'private, no-store');
            return res.json(model);
        }));
        app.post('/api/business/sync', businessAuth, requireRole('admin'), modify, asyncRoute(async (req, res) => {
            const only = Array.isArray(req.body && req.body.only) ? req.body.only.filter((x) => typeof x === 'string') : null;
            const configured = this.business.configured();
            const started = Object.entries(configured).filter(([id, ok]) => ok && (!only || only.includes(id))).map(([id]) => id);
            const run = this.business.sync({ only });
            if (req.query.wait === '1') return res.json(await run);
            run.catch(() => {});
            return res.status(202).json({ started, configured });
        }));
        app.post('/api/business/import', businessAuth, requireRole('admin'), modify, asyncRoute(async (req, res) => {
            if (!req.body || typeof req.body !== 'object') return res.status(400).json({ error: 'JSON body required' });
            const model = await this.business.build(req.body);
            res.json({ generatedAt: model.generatedAt, jobs: model.jobs.length, sites: model.sites.length, findings: model.insights.length });
        }));
        app.get('/api/business/raw/:source', businessAuth, requireRole('admin'), asyncRoute(async (req, res) => {
            const data = await this.business.raw(req.params.source);
            if (!data) return res.status(204).end();
            return res.json(data);
        }));

        app.post('/api/backup', authenticate, requireRole('admin'), asyncRoute(async (req, res) => {
            const backup = await this.db.createBackup();
            res.json({ success: true, backup: { backupId: backup.backupId, timestamp: backup.timestamp, size: backup.size } });
        }));
    }

    // ---------------------------------------------------------------- static

    setupStatic() {
        const app = this.app;
        app.get('/', (req, res) => res.sendFile(path.join(config.docsDir, 'index.html')));
        app.get('/favicon.ico', (req, res) => {
            res.setHeader('Cache-Control', 'public, max-age=86400');
            res.sendFile(path.join(config.docsDir, 'favicon.svg'));
        });
        // Browser ES modules for the experimental 3D engine (docs/dominion-engine.html
        // imports ../src/core/*). Only the browser-side folders are exposed.
        for (const folder of ['core', 'world', 'actors']) {
            app.use(`/src/${folder}`, express.static(path.join(config.rootDir, 'src', folder), { dotfiles: 'ignore', maxAge: '1h' }));
        }
        app.use(express.static(config.docsDir, {
            dotfiles: 'ignore',
            etag: true,
            lastModified: true,
            setHeaders: (res, filePath) => {
                if (/[\\/]vendor[\\/]/.test(filePath)) {
                    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
                } else if (/\.(json)$/.test(filePath)) {
                    res.setHeader('Cache-Control', 'public, max-age=300, must-revalidate');
                } else if (/\.(js|css|svg|png|jpg|webp)$/.test(filePath)) {
                    res.setHeader('Cache-Control', 'public, max-age=3600, must-revalidate');
                } else {
                    res.setHeader('Cache-Control', 'no-cache');
                }
            }
        }));
    }

    // ---------------------------------------------------------------- errors

    setupErrorHandling() {
        const app = this.app;

        app.use((req, res) => {
            if (req.path.startsWith('/api/') || req.accepts(['html', 'json']) === 'json') {
                return res.status(404).json({ error: 'Not found', path: req.path, method: req.method, requestId: req.id });
            }
            const notFoundPage = path.join(config.docsDir, '404.html');
            if (fs.existsSync(notFoundPage)) return res.status(404).sendFile(notFoundPage);
            return res.status(404).type('text').send('Not found');
        });

        // eslint-disable-next-line no-unused-vars
        app.use((error, req, res, next) => {
            const explicit = Boolean(error.status || error.statusCode);
            const status = error.status || error.statusCode || (error.type === 'entity.parse.failed' ? 400 : 500);
            if (!explicit) {
                logger.error('Unhandled request error', { requestId: req.id, path: req.path, message: error.message, stack: error.stack });
            } else {
                logger.warn('Request rejected', { requestId: req.id, path: req.path, status, message: error.message });
            }
            if (res.headersSent) return;
            res.status(status).json({
                // Only errors that deliberately set a status expose their message.
                error: explicit ? error.message : 'Internal server error',
                details: error.errors,
                requestId: req.id,
                timestamp: new Date().toISOString()
            });
        });
    }

    // ------------------------------------------------------------- websocket

    setupWebSocket() {
        this.wss.on('connection', (ws, req) => {
            ws.isAlive = true;
            ws.subscriptions = new Set();
            this.clients.add(ws);
            logger.debug('WebSocket client connected', { ip: req.socket.remoteAddress, clients: this.clients.size });

            ws.on('pong', () => { ws.isAlive = true; });
            ws.on('message', (message) => {
                let data;
                try {
                    data = JSON.parse(message);
                } catch (error) {
                    return ws.send(JSON.stringify({ type: 'error', error: 'Invalid JSON' }));
                }
                switch (data && data.type) {
                    case 'ping':
                        return ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
                    case 'subscribe':
                        ws.subscriptions = new Set(Array.isArray(data.channels) ? data.channels.map(String).slice(0, 20) : []);
                        return ws.send(JSON.stringify({ type: 'subscribed', channels: Array.from(ws.subscriptions) }));
                    default:
                        return ws.send(JSON.stringify({ type: 'error', error: `Unknown message type: ${data && data.type}` }));
                }
            });
            ws.on('close', () => this.clients.delete(ws));
            ws.on('error', (error) => {
                logger.warn('WebSocket error', { message: error.message });
                this.clients.delete(ws);
            });

            ws.send(JSON.stringify({ type: 'system_status', status: 'connected', version: config.version, timestamp: new Date().toISOString() }));
        });

        this.heartbeat = setInterval(() => {
            for (const ws of this.clients) {
                if (!ws.isAlive) {
                    ws.terminate();
                    this.clients.delete(ws);
                    continue;
                }
                ws.isAlive = false;
                ws.ping();
            }
        }, config.websocket.heartbeatMs);
        if (this.heartbeat.unref) this.heartbeat.unref();
    }

    /** Sends `message` to every client, or only to clients subscribed to `channel`. */
    broadcast(message, channel = null) {
        const payload = JSON.stringify(message);
        for (const client of this.clients) {
            if (client.readyState !== WebSocket.OPEN) continue;
            if (channel && client.subscriptions.size > 0 && !client.subscriptions.has(channel)) continue;
            client.send(payload);
        }
    }

    // ------------------------------------------------------------- lifecycle

    async start(port = config.port, host = config.host) {
        await this.state.init();
        await this.business.init();
        this.business.schedule();
        await new Promise((resolve, reject) => {
            this.server.once('error', reject);
            this.server.listen(port, host, () => {
                this.server.off('error', reject);
                resolve();
            });
        });
        const address = this.server.address();
        logger.info(`SolarFlow ${config.version} listening on ${address.address}:${address.port} (${config.env})`);
        this.initDatabase();
        return this;
    }

    initDatabase() {
        if (!this.db.isConfigured()) return;
        this.dbAttempts++;
        this.db.initializeTables()
            .then(() => {
                this.dbAttempts = 0;
                this.broadcast({ type: 'system_status', status: 'database_connected', timestamp: new Date().toISOString() });
            })
            .catch((error) => {
                const { maxRetries, retryDelayMs } = config.database;
                logger.error('Database unavailable', { attempt: this.dbAttempts, message: error.message });
                if (this.shuttingDown || (maxRetries > 0 && this.dbAttempts >= maxRetries)) return;
                const delay = Math.min(retryDelayMs * Math.pow(2, Math.min(this.dbAttempts - 1, 5)), 5 * 60 * 1000);
                logger.info(`Retrying database connection in ${Math.round(delay / 1000)}s`);
                this.dbRetryTimer = setTimeout(() => this.initDatabase(), delay);
                if (this.dbRetryTimer.unref) this.dbRetryTimer.unref();
            });
    }

    async stop() {
        if (this.shuttingDown) return;
        this.shuttingDown = true;
        logger.info('Shutting down server');
        clearTimeout(this.dbRetryTimer);
        clearInterval(this.heartbeat);
        this.business.stop();
        this.security.dispose();

        for (const client of this.clients) {
            try { client.close(1001, 'Server shutting down'); } catch (error) { /* ignore */ }
        }
        this.clients.clear();

        await new Promise((resolve) => {
            const timer = setTimeout(() => {
                logger.warn('Forcing close of remaining connections');
                if (this.server.closeAllConnections) this.server.closeAllConnections();
                resolve();
            }, config.shutdownTimeoutMs);
            this.server.close(() => { clearTimeout(timer); resolve(); });
        });

        await this.db.close().catch((error) => logger.warn('Error closing database', { message: error.message }));
        logger.info('Server stopped');
    }
}

module.exports = SolarFlowServer;

if (require.main === module) {
    const server = new SolarFlowServer();

    const shutdown = (signal) => {
        logger.info(`${signal} received`);
        server.stop().then(() => process.exit(0)).catch((error) => {
            logger.error('Shutdown failed', { message: error.message });
            process.exit(1);
        });
    };
    process.once('SIGTERM', () => shutdown('SIGTERM'));
    process.once('SIGINT', () => shutdown('SIGINT'));

    process.on('uncaughtException', (error) => {
        logger.error('Uncaught exception', { message: error.message, stack: error.stack });
        shutdown('uncaughtException');
    });
    process.on('unhandledRejection', (reason) => {
        logger.error('Unhandled rejection', { reason: reason instanceof Error ? reason.stack : String(reason) });
    });

    server.start().catch((error) => {
        logger.error('Failed to start server', { message: error.message });
        process.exit(1);
    });
}
