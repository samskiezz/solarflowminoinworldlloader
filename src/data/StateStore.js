/**
 * Small file-backed key/value store used for the shared front-end state
 * (`/api/state`) and as the fallback when PostgreSQL is not configured.
 *
 * Writes are atomic (temp file + rename) so a crash mid-write can never
 * leave a half-written JSON file behind.
 */
'use strict';

const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');

const SAFE_KEY = /^[a-zA-Z0-9_.-]{1,100}$/;

class StateStore {
    constructor(dir) {
        this.dir = dir;
        this.locks = new Map();
    }

    async init() {
        await fsp.mkdir(this.dir, { recursive: true });
        return this;
    }

    static isValidKey(key) {
        return typeof key === 'string' && SAFE_KEY.test(key) && !key.startsWith('.');
    }

    filePath(key) {
        if (!StateStore.isValidKey(key)) {
            throw new Error(`Invalid state key: ${String(key).slice(0, 40)}`);
        }
        return path.join(this.dir, `${key}.json`);
    }

    async get(key) {
        try {
            const raw = await fsp.readFile(this.filePath(key), 'utf8');
            return JSON.parse(raw);
        } catch (error) {
            if (error.code === 'ENOENT') return null;
            throw error;
        }
    }

    async set(key, value) {
        const target = this.filePath(key);
        const payload = JSON.stringify(value);
        // Serialise writes per key so concurrent requests cannot interleave.
        const previous = this.locks.get(key) || Promise.resolve();
        const next = previous.catch(() => {}).then(async () => {
            const tmp = `${target}.${process.pid}.${Date.now()}.tmp`;
            await fsp.writeFile(tmp, payload, 'utf8');
            await fsp.rename(tmp, target);
        });
        this.locks.set(key, next);
        try {
            await next;
        } finally {
            if (this.locks.get(key) === next) this.locks.delete(key);
        }
        return { success: true, bytes: Buffer.byteLength(payload) };
    }

    async remove(key) {
        try {
            await fsp.unlink(this.filePath(key));
            return true;
        } catch (error) {
            if (error.code === 'ENOENT') return false;
            throw error;
        }
    }

    async keys() {
        try {
            return (await fsp.readdir(this.dir))
                .filter((name) => name.endsWith('.json'))
                .map((name) => name.slice(0, -5));
        } catch (error) {
            if (error.code === 'ENOENT') return [];
            throw error;
        }
    }

    existsSync(key) {
        return fs.existsSync(this.filePath(key));
    }
}

module.exports = StateStore;
