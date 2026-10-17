/**
 * File-backed CER product catalogue.
 *
 * The front end ships the product database as a static JSON file. Serving
 * it through the API (with filtering and paging) means the API works even
 * when PostgreSQL is not configured, and the UI can fetch a few kilobytes
 * instead of the whole 8 MB file.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const CATEGORY_KEYS = ['solar_panels', 'inverters', 'batteries'];
const MAX_LIMIT = 500;

class CerProductStore {
    constructor(filePath) {
        this.filePath = filePath || path.join(__dirname, '..', '..', 'docs', 'cer-product-database.json');
        this.products = null;
        this.metadata = null;
        this.loadedAt = null;
    }

    load() {
        if (this.products) return this.products;
        const raw = JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
        const categories = raw.categories || {};
        this.products = CATEGORY_KEYS.flatMap((key) => (Array.isArray(categories[key]) ? categories[key] : []));
        this.metadata = {
            ...(raw.metadata || {}),
            totalProducts: this.products.length,
            simulated: Boolean(raw.metadata && raw.metadata.simulated)
        };
        this.loadedAt = new Date().toISOString();
        return this.products;
    }

    get count() {
        return this.load().length;
    }

    getSummary() {
        const products = this.load();
        const byCategory = {};
        const manufacturers = new Set();
        for (const product of products) {
            byCategory[product.category] = (byCategory[product.category] || 0) + 1;
            if (product.manufacturer) manufacturers.add(product.manufacturer);
        }
        return {
            totalProducts: products.length,
            byCategory,
            manufacturers: Array.from(manufacturers).sort(),
            metadata: this.metadata,
            loadedAt: this.loadedAt
        };
    }

    /**
     * @param {object} filters
     * @param {string} [filters.manufacturer] case-insensitive substring match
     * @param {string} [filters.category] exact category (solar_panel, inverter, battery)
     * @param {string} [filters.q] free-text search on id, manufacturer, model
     * @param {boolean} [filters.verified] cerApproved flag
     * @param {number} [filters.limit]
     * @param {number} [filters.offset]
     */
    query(filters = {}) {
        const products = this.load();
        const limit = clampInt(filters.limit, 1, MAX_LIMIT, 100);
        const offset = clampInt(filters.offset, 0, Number.MAX_SAFE_INTEGER, 0);
        const manufacturer = normalise(filters.manufacturer);
        const category = normalise(filters.category);
        const q = normalise(filters.q);

        const matches = products.filter((product) => {
            if (category && String(product.category || '').toLowerCase() !== category) return false;
            if (manufacturer && !String(product.manufacturer || '').toLowerCase().includes(manufacturer)) return false;
            if (typeof filters.verified === 'boolean' && Boolean(product.cerApproved) !== filters.verified) return false;
            if (q) {
                const haystack = `${product.id} ${product.manufacturer} ${product.model} ${product.type}`.toLowerCase();
                if (!haystack.includes(q)) return false;
            }
            return true;
        });

        return {
            total: matches.length,
            limit,
            offset,
            products: matches.slice(offset, offset + limit)
        };
    }

    getById(id) {
        if (typeof id !== 'string') return null;
        return this.load().find((product) => product.id === id) || null;
    }
}

function normalise(value) {
    if (value === undefined || value === null) return '';
    return String(value).trim().toLowerCase();
}

function clampInt(value, min, max, fallback) {
    const parsed = parseInt(value, 10);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(max, Math.max(min, parsed));
}

CerProductStore.MAX_LIMIT = MAX_LIMIT;

module.exports = CerProductStore;
