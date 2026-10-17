/**
 * CENTRAL DATA LOADER
 * Single source of truth for all data loading
 * Prevents duplicate loads and inconsistent state
 */

class CentralDataLoader {
    constructor() {
        this.cache = new Map();
        this.loading = new Map();
        this.listeners = new Map();
        this.initialized = false;

        console.log('📂 Central Data Loader initialized');
    }

    async init() {
        if (this.initialized) {
            console.log('⚠️ Central Data Loader already initialized');
            return;
        }

        console.log('🚀 Loading all core data...');

        // The lightweight summary loads first so the UI can show counts
        // immediately; the full catalogue follows.
        await Promise.all([
            this.loadMinions(),
            this.loadCERSummary().catch(() => null),
            this.loadCERProducts(),
            this.loadStandards(),
            this.loadHiveState(),
            this.loadProgress()
        ]);

        this.initialized = true;
        console.log('✅ Central Data Loader ready');

        window.dispatchEvent(new CustomEvent('central-data-ready', {
            detail: {
                minions: this.cache.get('minions'),
                cerProducts: this.cache.get('cerProducts'),
                cerSummary: this.cache.get('cerSummary'),
                standards: this.cache.get('standards'),
                hiveState: this.cache.get('hiveState'),
                progress: this.cache.get('progress')
            }
        }));
    }

    // Storage helper: namespaced via storageManager when present, legacy key otherwise.
    _store(key, value) {
        try {
            if (window.storageManager && window.storageManager.initialized) {
                window.storageManager.set(key, value);
            } else {
                localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
            }
        } catch (error) {
            console.warn(`Could not persist ${key}:`, error.message);
        }
    }

    _read(key) {
        try {
            if (window.storageManager && window.storageManager.initialized && window.storageManager.has(key)) {
                return window.storageManager.get(key);
            }
            const raw = localStorage.getItem(key);
            if (raw === null) return null;
            try { return JSON.parse(raw); } catch (e) { return raw; }
        } catch (error) {
            return null;
        }
    }

    async loadMinions() {
        return this.loadData('minions', './minions.json', (data) => {
            if (!data.minions || !Array.isArray(data.minions)) {
                throw new Error('Invalid minions.json structure - expected { minions: [...] }');
            }
            if (data.minions.length === 0) {
                throw new Error('minions.json is empty - no minions found');
            }

            data.minions.forEach((minion, index) => {
                if (!minion.id) throw new Error(`Minion at index ${index} missing id`);
                if (!minion.name) minion.name = minion.id;
                if (minion.tier === undefined) throw new Error(`Minion ${minion.id} missing tier`);
            });

            this._store('minions-count', data.minions.length.toString());
            console.log(`✅ Validated ${data.minions.length} minions`);
            return data.minions;
        }, { small: true });
    }

    async loadCERSummary() {
        return this.loadData('cerSummary', './cer-product-summary.json', (data) => {
            if (typeof data.totalProducts !== 'number') throw new Error('Invalid summary file');
            return data;
        }, { small: true });
    }

    async loadCERProducts() {
        return this.loadData('cerProducts', './cer-product-database.json', (data) => {
            // Structure: { metadata, categories: { solar_panels: [], inverters: [], batteries: [] } }
            const categories = data.categories || {};
            const allProducts = [
                ...(categories.solar_panels || []),
                ...(categories.inverters || []),
                ...(categories.batteries || [])
            ];

            if (allProducts.length === 0) {
                throw new Error('CER database loaded but contains no products');
            }

            this._store('cer-products-count', allProducts.length.toString());
            this._store('cer-products-loaded', 'true');
            if (data.metadata) {
                this.cache.set('cerMetadata', data.metadata);
                if (!this.cache.has('cerSummary')) {
                    this.cache.set('cerSummary', { totalProducts: allProducts.length, simulated: Boolean(data.metadata.simulated) });
                }
            }

            console.log(`✅ Loaded ${allProducts.length} products from catalogue${data.metadata && data.metadata.simulated ? ' (simulated dataset)' : ''}`);
            return allProducts;
        });
    }

    async loadStandards() {
        return this.loadData('standards', './as-nzs-standards-scraped.json', (data) => {
            // File is grouped by topic: { metadata, electrical_installations: {...}, solar_specific_standards: {...}, ... }
            // Older builds used { standards: {...} }; accept both.
            const groups = data.standards && typeof data.standards === 'object'
                ? data.standards
                : Object.fromEntries(Object.entries(data).filter(([key, value]) => key !== 'metadata' && value && typeof value === 'object'));

            const standardCount = Object.keys(groups).length;
            if (standardCount === 0) {
                throw new Error('Standards file is empty');
            }

            this._store('standards-count', standardCount.toString());
            console.log(`✅ Validated ${standardCount} standards groups`);
            return groups;
        }, { small: true });
    }

    async loadHiveState() {
        return this.loadData('hiveState', './hive_state.json', (data) => {
            // Only the hive_state sub-object of the persisted page state is
            // relevant here; the rest of that state has an unrelated shape.
            const localState = this._read('solarflow-state');
            if (localState && localState.hive_state && typeof localState.hive_state === 'object') {
                return { ...data, local: localState.hive_state };
            }
            return data;
        }, { small: true });
    }

    async loadProgress() {
        return this.loadData('progress', './progress.json', (data) => {
            const local = this._read('progress-state');
            const remoteUpdated = Date.parse((data.meta && data.meta.updatedAt) || data.lastUpdate || 0) || 0;
            const localUpdated = local ? (Date.parse((local.meta && local.meta.updatedAt) || local.lastUpdate || 0) || 0) : 0;
            if (local && localUpdated > remoteUpdated) {
                console.log('📊 Using local progress (newer)');
                return local;
            }
            return data;
        }, { small: true });
    }

    async loadData(key, url, transformer = null, options = {}) {
        if (this.cache.has(key)) {
            return this.cache.get(key);
        }

        if (this.loading.has(key)) {
            return this.loading.get(key);
        }

        const loadPromise = this._loadFromSource(key, url, transformer, options);
        this.loading.set(key, loadPromise);

        try {
            const data = await loadPromise;
            this.cache.set(key, data);
            this.loading.delete(key);
            this.notifyListeners(key, data);
            return data;
        } catch (error) {
            this.loading.delete(key);
            throw error;
        }
    }

    async _loadFromSource(key, url, transformer, options) {
        try {
            console.log(`📥 ${key}: Loading from ${url}...`);

            // Small files: revalidate with the server (ETag) every time.
            // Large files (the product catalogue): let the HTTP cache work; the
            // old `?t=Date.now()` query string forced a full download on every visit.
            const fetchPromise = fetch(url, { cache: options.small ? 'no-cache' : 'default' });
            const trackedFetch = window.performanceMonitor
                ? window.performanceMonitor.measureAPICall(`load-${key}`, fetchPromise)
                : fetchPromise;

            const response = await trackedFetch;
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            const transformed = transformer ? transformer(data) : data;
            console.log(`✅ ${key}: Loaded successfully`);
            return transformed;

        } catch (error) {
            console.error(`❌ ${key}: Failed to load from ${url}:`, error);

            const fallback = this._read(`fallback-${key}`);
            if (fallback) {
                console.log(`📂 ${key}: Using localStorage fallback`);
                return fallback;
            }
            throw error;
        }
    }

    subscribe(key, callback) {
        if (!this.listeners.has(key)) {
            this.listeners.set(key, []);
        }
        this.listeners.get(key).push(callback);

        if (this.cache.has(key)) {
            callback(this.cache.get(key));
        }
        return () => {
            const list = this.listeners.get(key) || [];
            const index = list.indexOf(callback);
            if (index >= 0) list.splice(index, 1);
        };
    }

    notifyListeners(key, data) {
        const listeners = this.listeners.get(key) || [];
        listeners.forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`Error in listener for ${key}:`, error);
            }
        });
    }

    get(key) {
        return this.cache.get(key) || null;
    }

    update(key, data) {
        this.cache.set(key, data);

        // The product catalogue is far too large for localStorage; only
        // small datasets get a fallback copy.
        if (key !== 'cerProducts') {
            this._store(`fallback-${key}`, data);
        }

        this.notifyListeners(key, data);
    }

    clearCache(key = null) {
        if (key) {
            this.cache.delete(key);
            console.log(`🗑️ Cleared cache for ${key}`);
        } else {
            this.cache.clear();
            console.log('🗑️ Cleared all cache');
        }
    }

    getStatus() {
        return {
            initialized: this.initialized,
            cached: Array.from(this.cache.keys()),
            loading: Array.from(this.loading.keys()),
            listeners: Array.from(this.listeners.keys()).map(k => ({
                key: k,
                count: this.listeners.get(k).length
            }))
        };
    }
}

// Global singleton
window.centralDataLoader = new CentralDataLoader();

// Don't auto-initialize - let init-orchestrator control startup
console.log('✅ Central Data Loader module loaded');
