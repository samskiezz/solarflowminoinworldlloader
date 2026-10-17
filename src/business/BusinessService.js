/**
 * Business service: pulls each configured connector into data/business/raw,
 * builds the model with the same code the game uses (docs/realm/js/business)
 * and serves it. Credentials come from config only; the model and raw
 * payloads stay in DATA_DIR (gitignored), never in the public site.
 */
'use strict';

const fsp = require('fs').promises;
const path = require('path');
const { pathToFileURL } = require('url');
const config = require('../config');
const logger = require('../logger');
const servicem8 = require('./adapters/servicem8');
const xero = require('./adapters/xero');
const google = require('./adapters/google');
const bank = require('./adapters/bank');
const meta = require('./adapters/meta');

const ADAPTERS = { servicem8: { adapter: servicem8, cfg: () => config.business.servicem8 }, xero: { adapter: xero, cfg: () => config.business.xero }, google: { adapter: google, cfg: () => config.business.google }, bank: { adapter: bank, cfg: () => config.business.bank }, meta: { adapter: meta, cfg: () => config.business.meta } };
const SOURCES = Object.keys(ADAPTERS);

class BusinessService {
    constructor({ dir = path.join(config.dataDir, 'business'), fetchFn = globalThis.fetch, adapters = ADAPTERS, modelPath = path.join(config.rootDir, 'docs/realm/js/business/model.js'), cryptoPath = path.join(config.rootDir, 'docs/realm/js/business/crypto.js') } = {}) {
        this.dir = dir; this.rawDir = path.join(dir, 'raw'); this.fetchFn = fetchFn; this.adapters = adapters; this.modelPath = modelPath; this.cryptoPath = cryptoPath;
        this.running = null; this.last = null; this.timer = null; this.builder = null;
    }
    async init() { await fsp.mkdir(this.rawDir, { recursive: true }); return this; }

    configured() { return Object.fromEntries(Object.entries(this.adapters).map(([id, { adapter, cfg }]) => [id, adapter.isConfigured(cfg())])); }

    async readJson(file) { try { return JSON.parse(await fsp.readFile(file, 'utf8')); } catch (error) { if (error.code === 'ENOENT') return null; throw error; } }
    async writeJson(file, data) { const tmp = `${file}.${process.pid}.tmp`; await fsp.writeFile(tmp, JSON.stringify(data)); await fsp.rename(tmp, file); }
    rawFile(source) { return path.join(this.rawDir, `${source}.json`); }
    modelFile() { return path.join(this.dir, 'model.json'); }

    async raw(source) { return SOURCES.includes(source) ? this.readJson(this.rawFile(source)) : null; }
    async model() { return this.readJson(this.modelFile()); }
    async status() {
        const model = await this.model();
        const raw = {}; for (const id of SOURCES) { try { const st = await fsp.stat(this.rawFile(id)); raw[id] = { syncedAt: st.mtime.toISOString(), bytes: st.size }; } catch { raw[id] = null; } }
        return { configured: this.configured(), raw, model: model ? { generatedAt: model.generatedAt, jobs: model.jobs?.length || 0, sites: model.sites?.length || 0, findings: model.insights?.length || 0, health: model.insightSummary?.score ?? null } : null, running: Boolean(this.running), last: this.last, schedule: config.business.syncMinutes };
    }

    /** Pull the given connectors (default: every configured one) into raw files, then rebuild. */
    async sync({ only = null, build = true } = {}) {
        if (this.running) return this.running;
        this.running = (async () => {
            const started = new Date().toISOString(); const results = {};
            for (const [id, { adapter, cfg }] of Object.entries(this.adapters)) {
                if (only && !only.includes(id)) continue;
                if (!adapter.isConfigured(cfg())) { results[id] = { skipped: 'not configured' }; continue; }
                try { const data = await adapter.pull(cfg(), { fetchFn: this.fetchFn, log: (m) => logger.info(`[business] ${m}`) }); await this.writeJson(this.rawFile(id), data); results[id] = { ok: true, syncedAt: data.syncedAt }; }
                catch (error) { logger.warn(`[business] ${id} sync failed`, { message: error.message }); results[id] = { error: error.message }; }
            }
            let built = null; if (build) built = await this.build().catch((error) => ({ error: error.message }));
            this.last = { started, finished: new Date().toISOString(), results, built: built && built.error ? built : (built ? { generatedAt: built.generatedAt, jobs: built.jobs.length, sites: built.sites.length, findings: built.insights.length } : null) };
            return this.last;
        })();
        try { return await this.running; } finally { this.running = null; }
    }

    /** Build the model from the raw files (or a supplied payload, or an encrypted snapshot + passphrase) with the game's own builder. */
    async build(payload = null) {
        if (!this.builder) this.builder = await import(pathToFileURL(this.modelPath).href);
        if (payload && payload.snapshot && payload.passphrase) { const cr = await import(pathToFileURL(this.cryptoPath).href); if (!cr.isEncrypted(payload.snapshot)) { const e = new Error('snapshot is not an encrypted envelope'); e.status = 400; throw e; } try { payload = await cr.decryptJson(payload.snapshot, String(payload.passphrase)); } catch (error) { const e = new Error(error.message); e.status = 400; throw e; } }
        const raw = payload || await this.rawPayload();
        const model = this.builder.isModel(raw) ? raw : this.builder.buildModel(raw, { now: new Date() });
        await this.writeJson(this.modelFile(), model);
        return model;
    }
    async rawPayload() {
        const [sm8, xr, gg, bk, mt] = await Promise.all(SOURCES.map((id) => this.raw(id)));
        const market = await this.readJson(path.join(this.dir, 'market.json'));
        const payload = { company: { name: config.business.company.name, domains: config.business.company.domains, timezone: config.business.company.timezone } };
        if (sm8) payload.servicem8 = sm8; if (xr) payload.xero = xr; if (bk) payload.bank = bk; if (market) payload.market = market;
        if (mt) payload.meta = { ...mt, allowPublish: Boolean(config.business.meta.allowPublish) };
        if (gg) { if (gg.gmail) payload.gmail = { syncedAt: gg.syncedAt, pages: gg.gmail.pages }; if (gg.drive) payload.drive = gg.drive; if (gg.calendar) payload.calendar = gg.calendar; }
        if (!payload.company.name) delete payload.company.name; if (!payload.company.domains.length) delete payload.company.domains;
        return payload;
    }

    /** Publish an approved social draft through Meta (requires META_ALLOW_PUBLISH). Keeps a log in DATA_DIR/business/social-log.json. */
    async publishSocial(draft) {
        const { adapter, cfg } = this.adapters.meta || {}; if (!adapter) throw new Error('meta adapter missing');
        if (!adapter.isConfigured(cfg())) { const e = new Error('Meta is not configured on the server'); e.status = 400; throw e; }
        if (!cfg().allowPublish) { const e = new Error('Publishing is disabled on the server (META_ALLOW_PUBLISH=false)'); e.status = 403; throw e; }
        if (!draft || typeof draft.text !== 'string' || !draft.text.trim()) { const e = new Error('Draft text required'); e.status = 400; throw e; }
        const result = await adapter.publish(cfg(), { id: String(draft.id || ''), text: draft.text.slice(0, 5000), platforms: Array.isArray(draft.platforms) ? draft.platforms.filter((p) => ['facebook', 'instagram'].includes(p)) : ['facebook'], imageUrl: typeof draft.imageUrl === 'string' && /^https?:\/\//.test(draft.imageUrl) ? draft.imageUrl : null, link: typeof draft.link === 'string' && /^https?:\/\//.test(draft.link) ? draft.link : null, pageId: draft.pageId ? String(draft.pageId) : null }, { fetchFn: this.fetchFn, log: (m) => logger.info(`[business] ${m}`) });
        const file = path.join(this.dir, 'social-log.json'); const log = (await this.readJson(file)) || []; log.push({ at: result.publishedAt, id: draft.id || null, text: draft.text.slice(0, 200), results: result.results }); await this.writeJson(file, log.slice(-500));
        return result;
    }

    schedule() {
        const minutes = config.business.syncMinutes; if (!minutes || this.timer) return;
        this.timer = setInterval(() => { this.sync().catch((error) => logger.warn('[business] scheduled sync failed', { message: error.message })); }, minutes * 60 * 1000);
        if (this.timer.unref) this.timer.unref();
    }
    stop() { if (this.timer) { clearInterval(this.timer); this.timer = null; } }
}

module.exports = BusinessService;
module.exports.ADAPTERS = ADAPTERS;
module.exports.SOURCES = SOURCES;
