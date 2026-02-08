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
        
        // Load all core data in parallel
        await Promise.all([
            this.loadMinions(),
            this.loadCERProducts(),
            this.loadStandards(),
            this.loadHiveState(),
            this.loadProgress()
        ]);
        
        this.initialized = true;
        console.log('✅ Central Data Loader ready');
        
        // Broadcast ready event
        window.dispatchEvent(new CustomEvent('central-data-ready', {
            detail: {
                minions: this.cache.get('minions'),
                cerProducts: this.cache.get('cerProducts'),
                standards: this.cache.get('standards'),
                hiveState: this.cache.get('hiveState'),
                progress: this.cache.get('progress')
            }
        }));
    }
    
    async loadMinions() {
        return this.loadData('minions', './minions.json', (data) => {
            // Validate structure
            if (!data.minions || !Array.isArray(data.minions)) {
                throw new Error('Invalid minions.json structure - expected { minions: [...] }');
            }
            
            if (data.minions.length === 0) {
                throw new Error('minions.json is empty - no minions found');
            }
            
            // Validate each minion
            data.minions.forEach((minion, index) => {
                if (!minion.id) throw new Error(`Minion at index ${index} missing id`);
                if (!minion.name) throw new Error(`Minion ${minion.id} missing name`);
                if (minion.tier === undefined) throw new Error(`Minion ${minion.id} missing tier`);
            });
            
            localStorage.setItem('minions-count', data.minions.length.toString());
            console.log(`✅ Validated ${data.minions.length} minions`);
            return data.minions;
        });
    }
    
    async loadCERProducts() {
        return this.loadData('cerProducts', './cer-product-database.json', (data) => {
            // CER database has structure: { categories: { solar_panels: [], inverters: [], batteries: [] } }
            // Flatten into single array
            const allProducts = [
                ...(data.categories?.solar_panels || []),
                ...(data.categories?.inverters || []),
                ...(data.categories?.batteries || [])
            ];
            
            if (allProducts.length === 0) {
                throw new Error('CER database loaded but contains no products');
            }
            
            localStorage.setItem('cer-products-count', allProducts.length.toString());
            localStorage.setItem('cer-products-loaded', 'true');
            
            console.log(`✅ Loaded ${allProducts.length} CER products from database`);
            return allProducts;
        });
    }
    
    async loadStandards() {
        return this.loadData('standards', './as-nzs-standards-scraped.json', (data) => {
            // Validate structure
            if (!data.standards || typeof data.standards !== 'object') {
                throw new Error('Invalid standards file structure - expected { standards: {...} }');
            }
            
            const standardCount = Object.keys(data.standards).length;
            if (standardCount === 0) {
                throw new Error('Standards file is empty');
            }
            
            localStorage.setItem('standards-count', standardCount.toString());
            console.log(`✅ Validated ${standardCount} standards`);
            return data.standards;
        });
    }
    
    async loadHiveState() {
        return this.loadData('hiveState', './hive_state.json', (data) => {
            // Merge with localStorage state
            const localState = localStorage.getItem('solarflow-state');
            if (localState) {
                const parsed = JSON.parse(localState);
                return { ...data, ...parsed };
            }
            return data;
        });
    }
    
    async loadProgress() {
        return this.loadData('progress', './progress.json', (data) => {
            // Don't overwrite if local progress is newer
            const localProgress = localStorage.getItem('progress-state');
            if (localProgress) {
                const local = JSON.parse(localProgress);
                if (local.lastUpdate > data.lastUpdate) {
                    console.log('📊 Using local progress (newer)');
                    return local;
                }
            }
            return data;
        });
    }
    
    async loadData(key, url, transformer = null) {
        // Check cache first
        if (this.cache.has(key)) {
            console.log(`📂 ${key}: Using cached data`);
            return this.cache.get(key);
        }
        
        // Check if already loading
        if (this.loading.has(key)) {
            console.log(`⏳ ${key}: Waiting for existing load...`);
            return this.loading.get(key);
        }
        
        // Start loading
        const loadPromise = this._loadFromSource(key, url, transformer);
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
    
    async _loadFromSource(key, url, transformer) {
        try {
            console.log(`📥 ${key}: Loading from ${url}...`);
            
            // Performance tracking
            const fetchPromise = fetch(url + '?t=' + Date.now());
            const trackedFetch = window.performanceMonitor ? 
                window.performanceMonitor.measureAPICall(`load-${key}`, fetchPromise) : 
                fetchPromise;
            
            const response = await trackedFetch;
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            // Rate limiting check
            if (window.rateLimiters && !window.rateLimiters.apiCall()) {
                console.warn('🚫 API rate limit exceeded for data loading');
            }
            
            const transformed = transformer ? transformer(data) : data;
            
            console.log(`✅ ${key}: Loaded successfully`);
            return transformed;
            
        } catch (error) {
            console.error(`❌ ${key}: Failed to load from ${url}:`, error);
            
            // Try localStorage fallback
            const fallbackKey = `fallback-${key}`;
            const fallback = localStorage.getItem(fallbackKey);
            
            if (fallback) {
                console.log(`📂 ${key}: Using localStorage fallback`);
                return JSON.parse(fallback);
            }
            
            throw error;
        }
    }
    
    // Subscribe to data changes
    subscribe(key, callback) {
        if (!this.listeners.has(key)) {
            this.listeners.set(key, []);
        }
        this.listeners.get(key).push(callback);
        
        // If data already loaded, call immediately
        if (this.cache.has(key)) {
            callback(this.cache.get(key));
        }
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
    
    // Get data synchronously (returns null if not loaded)
    get(key) {
        return this.cache.get(key) || null;
    }
    
    // Update cached data
    update(key, data) {
        this.cache.set(key, data);
        
        // Save to localStorage as fallback
        const fallbackKey = `fallback-${key}`;
        try {
            localStorage.setItem(fallbackKey, JSON.stringify(data));
        } catch (error) {
            console.warn(`Failed to save fallback for ${key}:`, error);
        }
        
        this.notifyListeners(key, data);
    }
    
    // Clear cache
    clearCache(key = null) {
        if (key) {
            this.cache.delete(key);
            console.log(`🗑️ Cleared cache for ${key}`);
        } else {
            this.cache.clear();
            console.log('🗑️ Cleared all cache');
        }
    }
    
    // Get status
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
// Will be initialized by init-orchestrator.js in correct order

console.log('✅ Central Data Loader module loaded');