/**
 * Lightweight VPS persistence server.
 *
 * Stores named JSON "state" documents and a growing knowledge base on disk
 * and pushes updates to WebSocket clients. Designed to run alongside the
 * static site on a small VPS with no database.
 *
 * Environment:
 *   PORT            listen port (default 3000)
 *   DATA_DIR        where state files live (default ./data/vps)
 *   CORS_ORIGIN     comma-separated allowed origins ("*" allows any)
 *   VPS_WRITE_KEY   if set, POST requests must send it as X-Api-Key
 *   STATIC_DIR      static site directory to serve (default ../docs)
 */
'use strict';

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

const STATE_TYPES = ['quantum', 'civilization', 'minions'];
const MAX_LIST_ITEMS = 5000;
const SAFE_TYPE = /^[a-z][a-z0-9_-]{0,40}$/;
const VERSION = (() => {
    try { return require('../package.json').version; } catch (error) { return require('./package.json').version; }
})();

function timingSafeEqual(a, b) {
    const left = Buffer.from(String(a));
    const right = Buffer.from(String(b));
    return left.length === right.length && crypto.timingSafeEqual(left, right);
}

class OpenClawVPSServer {
    constructor(options = {}) {
        this.app = express();
        this.dataPath = options.dataPath || process.env.DATA_DIR || path.join(__dirname, '..', 'data', 'vps');
        this.staticDir = options.staticDir || process.env.STATIC_DIR || path.join(__dirname, '..', 'docs');
        this.writeKey = options.writeKey !== undefined ? options.writeKey : (process.env.VPS_WRITE_KEY || '');
        this.allowedOrigins = options.allowedOrigins || (process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map((s) => s.trim()).filter(Boolean) : ['*']);
        this.heartbeatMs = options.heartbeatMs || 30000;
        this.knowledgeBase = null;
        this.clients = new Set();
        this.writeLocks = new Map();
        this.server = null;
        this.wss = null;

        this.setupMiddleware();
        this.setupRoutes();
    }

    // ------------------------------------------------------------ middleware

    setupMiddleware() {
        this.app.disable('x-powered-by');
        this.app.set('trust proxy', 1);

        // CORS first, including preflight, so every response (static or API) carries it.
        this.app.use((req, res, next) => {
            const origin = req.headers.origin;
            const allowAny = this.allowedOrigins.includes('*');
            if (origin && (allowAny || this.allowedOrigins.includes(origin))) {
                res.header('Access-Control-Allow-Origin', allowAny ? '*' : origin);
                res.header('Vary', 'Origin');
                res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
                res.header('Access-Control-Allow-Headers', 'Content-Type, X-Api-Key');
                res.header('Access-Control-Max-Age', '86400');
            }
            if (req.method === 'OPTIONS') return res.sendStatus(204);
            return next();
        });

        this.app.use(express.json({ limit: '5mb' }));
        this.app.use(express.static(this.staticDir, { dotfiles: 'ignore', maxAge: '5m' }));
    }

    requireWriteKey(req, res, next) {
        if (!this.writeKey) return next();
        const provided = req.get('X-Api-Key') || '';
        if (!provided || !timingSafeEqual(provided, this.writeKey)) {
            return res.status(401).json({ success: false, error: 'Invalid or missing X-Api-Key' });
        }
        return next();
    }

    // ---------------------------------------------------------------- routes

    setupRoutes() {
        const app = this.app;
        const guard = (req, res, next) => this.requireWriteKey(req, res, next);

        for (const type of STATE_TYPES) {
            app.get(`/api/${type}/state`, (req, res) => this.getState(type, res));
            app.post(`/api/${type}/state`, guard, (req, res) => this.saveState(type, req.body, res));
        }

        app.get('/api/knowledge/state', (req, res) => this.getKnowledge(res));
        app.post('/api/knowledge/state', guard, (req, res) => this.saveKnowledge(req.body, res));

        const health = (req, res) => {
            res.json({
                status: 'healthy',
                version: VERSION,
                timestamp: new Date().toISOString(),
                uptime: Math.round(process.uptime()),
                memory: { rss: process.memoryUsage().rss },
                clients: this.clients.size,
                writeProtected: Boolean(this.writeKey)
            });
        };
        app.get('/api/health', health);
        app.get('/health', health);

        app.use('/api', (req, res) => res.status(404).json({ success: false, error: 'Not found', path: req.path }));

        // eslint-disable-next-line no-unused-vars
        app.use((error, req, res, next) => {
            const status = error.type === 'entity.parse.failed' ? 400 : error.status || 500;
            if (status >= 500) console.error('Request failed:', error);
            res.status(status).json({ success: false, error: status === 400 ? 'Invalid JSON body' : status >= 500 ? 'Internal server error' : error.message });
        });
    }

    // ------------------------------------------------------------------ data

    filePath(name) {
        if (!SAFE_TYPE.test(name)) throw new Error(`Invalid state name: ${name}`);
        return path.join(this.dataPath, `${name}.json`);
    }

    async writeJsonAtomic(name, value) {
        const target = this.filePath(name);
        const payload = JSON.stringify(value, null, 2);
        const previous = this.writeLocks.get(name) || Promise.resolve();
        const next = previous.catch(() => {}).then(async () => {
            const tmp = `${target}.${process.pid}.${Date.now()}.tmp`;
            await fs.writeFile(tmp, payload, 'utf8');
            await fs.rename(tmp, target);
        });
        this.writeLocks.set(name, next);
        try {
            await next;
        } finally {
            if (this.writeLocks.get(name) === next) this.writeLocks.delete(name);
        }
    }

    async readJson(name) {
        try {
            return JSON.parse(await fs.readFile(this.filePath(name), 'utf8'));
        } catch (error) {
            if (error.code === 'ENOENT') return null;
            throw error;
        }
    }

    async initializeData() {
        await fs.mkdir(this.dataPath, { recursive: true });
        this.knowledgeBase = (await this.readJson('knowledge').catch(() => null)) || {
            documents: [],
            compliance_data: { checks_performed: [], standards_verified: [] },
            user_interactions: { button_clicks: [], page_visits: [] },
            learning_patterns: { common_workflows: [], error_patterns: [] },
            created: new Date().toISOString()
        };
        console.log(`✅ VPS data storage initialised at ${this.dataPath}`);
    }

    async getState(type, res) {
        try {
            const state = await this.readJson(`${type}-state`);
            res.setHeader('Cache-Control', 'no-store');
            res.json({ success: true, state, lastUpdated: state ? state.timestamp || null : null, message: state ? undefined : 'No saved state found' });
        } catch (error) {
            console.error(`Error getting ${type} state:`, error);
            res.status(500).json({ success: false, error: 'Failed to read state' });
        }
    }

    async saveState(type, data, res) {
        if (!data || typeof data !== 'object' || Array.isArray(data)) {
            return res.status(400).json({ success: false, error: 'State must be a JSON object' });
        }
        try {
            const stateData = { ...data, timestamp: new Date().toISOString(), version: '1.1', source: 'openclaw-frontend' };
            await this.writeJsonAtomic(`${type}-state`, stateData);
            this.broadcastUpdate(type, stateData);
            return res.json({ success: true, message: `${type} state saved successfully`, timestamp: stateData.timestamp });
        } catch (error) {
            console.error(`Error saving ${type} state:`, error);
            return res.status(500).json({ success: false, error: 'Failed to save state' });
        }
    }

    knowledgeStats() {
        const kb = this.knowledgeBase || {};
        return {
            documents: (kb.documents || []).length,
            compliance_checks: ((kb.compliance_data || {}).checks_performed || []).length,
            interactions: ((kb.user_interactions || {}).button_clicks || []).length
        };
    }

    async getKnowledge(res) {
        if (!this.knowledgeBase) await this.initializeData();
        res.setHeader('Cache-Control', 'no-store');
        res.json({ success: true, state: this.knowledgeBase, lastUpdated: this.knowledgeBase.lastUpdated || null, stats: this.knowledgeStats() });
    }

    async saveKnowledge(newData, res) {
        if (!newData || typeof newData !== 'object' || Array.isArray(newData)) {
            return res.status(400).json({ success: false, error: 'Knowledge update must be a JSON object' });
        }
        try {
            if (!this.knowledgeBase) await this.initializeData();
            this.mergeKnowledgeData(newData);
            await this.writeJsonAtomic('knowledge', this.knowledgeBase);
            this.broadcastUpdate('knowledge', { lastUpdated: this.knowledgeBase.lastUpdated, stats: this.knowledgeStats() });
            return res.json({ success: true, message: 'Knowledge base updated successfully', timestamp: this.knowledgeBase.lastUpdated, stats: this.knowledgeStats() });
        } catch (error) {
            console.error('Error saving knowledge:', error);
            return res.status(500).json({ success: false, error: 'Failed to save knowledge' });
        }
    }

    /** Appends items to a list while keeping it bounded to MAX_LIST_ITEMS. */
    static appendBounded(target, items) {
        if (!Array.isArray(items) || items.length === 0) return target;
        const merged = target.concat(items);
        return merged.length > MAX_LIST_ITEMS ? merged.slice(merged.length - MAX_LIST_ITEMS) : merged;
    }

    mergeKnowledgeData(newData) {
        const kb = this.knowledgeBase;
        kb.lastUpdated = new Date().toISOString();

        if (Array.isArray(newData.documents)) {
            kb.documents = kb.documents || [];
            const known = new Set(kb.documents.map((doc) => doc && doc.id));
            const fresh = newData.documents.filter((doc) => doc && doc.id && !known.has(doc.id));
            kb.documents = OpenClawVPSServer.appendBounded(kb.documents, fresh);
        }

        if (newData.compliance_data && typeof newData.compliance_data === 'object') {
            kb.compliance_data = kb.compliance_data || { checks_performed: [], standards_verified: [] };
            kb.compliance_data.checks_performed = OpenClawVPSServer.appendBounded(kb.compliance_data.checks_performed || [], newData.compliance_data.checks_performed);
            const verified = new Set([...(kb.compliance_data.standards_verified || []), ...(newData.compliance_data.standards_verified || [])]);
            kb.compliance_data.standards_verified = Array.from(verified);
        }

        if (newData.user_interactions && typeof newData.user_interactions === 'object') {
            kb.user_interactions = kb.user_interactions || { button_clicks: [], page_visits: [] };
            for (const [key, list] of Object.entries(newData.user_interactions)) {
                if (!SAFE_TYPE.test(key) || !Array.isArray(list)) continue;
                kb.user_interactions[key] = OpenClawVPSServer.appendBounded(kb.user_interactions[key] || [], list);
            }
        }

        if (newData.learning_patterns && typeof newData.learning_patterns === 'object') {
            kb.learning_patterns = { ...(kb.learning_patterns || {}), ...newData.learning_patterns };
        }
    }

    // ------------------------------------------------------------- websocket

    setupWebSocket(server) {
        const wss = new WebSocket.Server({ server, maxPayload: 64 * 1024 });

        wss.on('connection', (ws) => {
            ws.isAlive = true;
            this.clients.add(ws);
            ws.on('pong', () => { ws.isAlive = true; });
            ws.on('close', () => this.clients.delete(ws));
            ws.on('error', () => this.clients.delete(ws));
            ws.on('message', (message) => {
                try {
                    this.handleClientMessage(ws, JSON.parse(message));
                } catch (error) {
                    ws.send(JSON.stringify({ type: 'error', error: 'Invalid JSON' }));
                }
            });
            ws.send(JSON.stringify({ type: 'connection_established', timestamp: new Date().toISOString(), message: 'VPS persistence layer active' }));
        });

        this.heartbeat = setInterval(() => {
            for (const ws of this.clients) {
                if (!ws.isAlive) { ws.terminate(); this.clients.delete(ws); continue; }
                ws.isAlive = false;
                ws.ping();
            }
        }, this.heartbeatMs);
        if (this.heartbeat.unref) this.heartbeat.unref();

        this.wss = wss;
        return wss;
    }

    handleClientMessage(ws, data) {
        switch (data && data.type) {
            case 'ping':
                ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
                break;
            case 'request_sync':
                this.sendFullSync(ws);
                break;
            default:
                ws.send(JSON.stringify({ type: 'error', error: `Unknown message type: ${data && data.type}` }));
        }
    }

    async sendFullSync(ws) {
        for (const type of STATE_TYPES) {
            const state = await this.readJson(`${type}-state`).catch(() => null);
            if (state) ws.send(JSON.stringify({ type: `${type}_update`, data: state, timestamp: new Date().toISOString() }));
        }
        if (!this.knowledgeBase) await this.initializeData();
        ws.send(JSON.stringify({ type: 'knowledge_update', data: { stats: this.knowledgeStats(), lastUpdated: this.knowledgeBase.lastUpdated }, timestamp: new Date().toISOString() }));
    }

    broadcastUpdate(type, data) {
        const message = JSON.stringify({ type: `${type}_update`, data, timestamp: new Date().toISOString() });
        for (const client of this.clients) {
            if (client.readyState === WebSocket.OPEN) client.send(message);
        }
    }

    // ------------------------------------------------------------- lifecycle

    async start(port = Number(process.env.PORT) || 3000, host = '0.0.0.0') {
        await this.initializeData();
        this.server = http.createServer(this.app);
        this.setupWebSocket(this.server);
        await new Promise((resolve, reject) => {
            this.server.once('error', reject);
            this.server.listen(port, host, () => { this.server.off('error', reject); resolve(); });
        });
        console.log(`🚀 OpenClaw VPS Server ${VERSION} listening on ${host}:${this.server.address().port}${this.writeKey ? ' (writes protected)' : ' (writes OPEN - set VPS_WRITE_KEY)'}`);
        return this.server;
    }

    async stop() {
        clearInterval(this.heartbeat);
        for (const client of this.clients) client.close(1001, 'Server shutting down');
        this.clients.clear();
        if (this.server) await new Promise((resolve) => this.server.close(resolve));
    }
}

module.exports = OpenClawVPSServer;

if (require.main === module) {
    const server = new OpenClawVPSServer();
    server.start().catch((error) => {
        console.error('Failed to start VPS server:', error);
        process.exit(1);
    });
    const shutdown = () => server.stop().then(() => process.exit(0));
    process.once('SIGTERM', shutdown);
    process.once('SIGINT', shutdown);
}
