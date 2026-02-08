/**
 * STORAGE MANAGER
 * Centralized localStorage management with namespacing
 * Prevents key collisions and provides consistent interface
 */

class StorageManager {
    constructor() {
        this.namespace = 'solarflow-v2.3:';
        this.version = '2.3.0';
        this.initialized = false;
        
        console.log('💾 Storage Manager initialized');
    }
    
    init() {
        // Migrate old keys to new namespace if needed
        this.migrateOldKeys();
        this.initialized = true;
        console.log('✅ Storage Manager ready');
    }
    
    // Get namespaced key
    key(name) {
        return this.namespace + name;
    }
    
    // Set with namespacing and validation
    set(key, value, options = {}) {
        const nsKey = this.key(key);
        
        try {
            // Validate with security utils if available
            if (window.securityUtils) {
                const maxSize = options.maxSizeKB || 5000;
                return window.securityUtils.safeLocalStorageSet(nsKey, value, maxSize);
            }
            
            // Fallback: basic set
            const valueStr = typeof value === 'string' ? value : JSON.stringify(value);
            localStorage.setItem(nsKey, valueStr);
            return true;
            
        } catch (error) {
            console.error(`❌ Failed to set ${key}:`, error);
            if (window.errorHandler) {
                window.errorHandler.handleError(error, { 
                    type: 'storage-write',
                    key: key 
                });
            }
            return false;
        }
    }
    
    // Get with namespacing and validation
    get(key, options = {}) {
        const nsKey = this.key(key);
        
        try {
            const value = localStorage.getItem(nsKey);
            if (value === null) return null;
            
            // Try to parse as JSON
            let parsed;
            try {
                parsed = JSON.parse(value);
            } catch (e) {
                // Not JSON, return as string
                parsed = value;
            }
            
            // Apply validator if provided
            if (options.validator && typeof options.validator === 'function') {
                if (!options.validator(parsed)) {
                    console.warn(`🚫 Validation failed for key: ${key}`);
                    return options.default || null;
                }
            }
            
            return parsed;
            
        } catch (error) {
            console.error(`❌ Failed to get ${key}:`, error);
            return options.default || null;
        }
    }
    
    // Remove with namespacing
    remove(key) {
        const nsKey = this.key(key);
        try {
            localStorage.removeItem(nsKey);
            return true;
        } catch (error) {
            console.error(`❌ Failed to remove ${key}:`, error);
            return false;
        }
    }
    
    // Check if key exists
    has(key) {
        const nsKey = this.key(key);
        return localStorage.getItem(nsKey) !== null;
    }
    
    // Clear all namespaced keys
    clearAll() {
        const keys = this.getAllKeys();
        keys.forEach(key => localStorage.removeItem(key));
        console.log(`🗑️ Cleared ${keys.length} namespaced keys`);
    }
    
    // Get all namespaced keys
    getAllKeys() {
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(this.namespace)) {
                keys.push(key);
            }
        }
        return keys;
    }
    
    // Get storage usage
    getUsage() {
        let total = 0;
        const items = [];
        
        const nsKeys = this.getAllKeys();
        
        for (const fullKey of nsKeys) {
            const value = localStorage.getItem(fullKey);
            const size = (fullKey.length + value.length) * 2; // Rough bytes
            total += size;
            
            // Remove namespace prefix for display
            const key = fullKey.substring(this.namespace.length);
            items.push({ key, size, fullKey });
        }
        
        items.sort((a, b) => b.size - a.size);
        
        return {
            totalBytes: total,
            totalKB: (total / 1024).toFixed(2),
            itemCount: items.length,
            items: items
        };
    }
    
    // Migrate old keys to new namespace
    migrateOldKeys() {
        const oldKeys = [
            'solarflow-state',
            'unified-credits',
            'minions-count',
            'cer-products-count',
            'cer-products-loaded',
            'standards-count',
            'error-log',
            'security-log',
            'civilization-first-init'
        ];
        
        let migrated = 0;
        
        oldKeys.forEach(oldKey => {
            // Check if old key exists (without namespace)
            const oldValue = localStorage.getItem(oldKey);
            if (oldValue !== null) {
                // Migrate to namespaced key
                const newKey = this.key(oldKey);
                if (!localStorage.getItem(newKey)) {
                    localStorage.setItem(newKey, oldValue);
                    migrated++;
                    console.log(`📦 Migrated: ${oldKey} → ${newKey}`);
                }
                
                // Remove old key
                localStorage.removeItem(oldKey);
            }
        });
        
        if (migrated > 0) {
            console.log(`✅ Migrated ${migrated} keys to namespace`);
        }
    }
    
    // Export data for backup
    exportData() {
        const data = {};
        const keys = this.getAllKeys();
        
        keys.forEach(fullKey => {
            const key = fullKey.substring(this.namespace.length);
            const value = localStorage.getItem(fullKey);
            
            try {
                data[key] = JSON.parse(value);
            } catch (e) {
                data[key] = value;
            }
        });
        
        return {
            version: this.version,
            namespace: this.namespace,
            exportedAt: new Date().toISOString(),
            data: data
        };
    }
    
    // Import data from backup
    importData(backup) {
        if (!backup.data) {
            throw new Error('Invalid backup format');
        }
        
        let imported = 0;
        
        for (const [key, value] of Object.entries(backup.data)) {
            if (this.set(key, value)) {
                imported++;
            }
        }
        
        console.log(`✅ Imported ${imported} items from backup`);
        return imported;
    }
    
    // Cleanup old data
    cleanup(maxAgeDays = 7) {
        const now = Date.now();
        const maxAge = maxAgeDays * 24 * 60 * 60 * 1000;
        const keys = this.getAllKeys();
        let cleaned = 0;
        
        keys.forEach(fullKey => {
            const value = localStorage.getItem(fullKey);
            
            try {
                const data = JSON.parse(value);
                
                // Check for timestamp
                const timestamp = data.timestamp || data.lastUpdate || data.createdAt;
                
                if (timestamp && now - timestamp > maxAge) {
                    localStorage.removeItem(fullKey);
                    cleaned++;
                    
                    const key = fullKey.substring(this.namespace.length);
                    console.log(`🗑️ Cleaned old key: ${key} (${Math.floor((now - timestamp) / (24 * 60 * 60 * 1000))} days old)`);
                }
            } catch (e) {
                // Not JSON, skip
            }
        });
        
        if (cleaned > 0) {
            console.log(`✅ Cleaned ${cleaned} old items`);
        }
        
        return cleaned;
    }
}

// Global singleton
window.storageManager = new StorageManager();

console.log('✅ Storage Manager module loaded');