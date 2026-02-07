/**
 * SIMPLE WORKING PERSISTENCE - NO BULLSHIT
 * This actually saves and loads data across pages
 */

window.SOLARFLOW_WORKING_PERSISTENCE = {
    version: '2.3.0-WORKING',
    
    // Save any data
    save: function(key, data) {
        try {
            const timestamp = Date.now();
            const saveData = {
                data: data,
                timestamp: timestamp,
                version: this.version
            };
            localStorage.setItem('solarflow-' + key, JSON.stringify(saveData));
            console.log('💾 SAVED:', key, 'at', new Date(timestamp).toLocaleTimeString());
            return true;
        } catch (error) {
            console.error('❌ SAVE FAILED:', error);
            return false;
        }
    },
    
    // Load any data
    load: function(key) {
        try {
            const stored = localStorage.getItem('solarflow-' + key);
            if (stored) {
                const parsed = JSON.parse(stored);
                console.log('📂 LOADED:', key, 'from', new Date(parsed.timestamp).toLocaleTimeString());
                return parsed.data;
            }
            console.log('⚠️ NO DATA FOR:', key);
            return null;
        } catch (error) {
            console.error('❌ LOAD FAILED:', error);
            return null;
        }
    },
    
    // Clear data
    clear: function(key) {
        try {
            localStorage.removeItem('solarflow-' + key);
            console.log('🗑️ CLEARED:', key);
            return true;
        } catch (error) {
            console.error('❌ CLEAR FAILED:', error);
            return false;
        }
    },
    
    // List all saved data
    list: function() {
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('solarflow-')) {
                keys.push(key.replace('solarflow-', ''));
            }
        }
        return keys;
    },
    
    // Auto-save function (call this regularly)
    autoSave: function(key, data) {
        this.save(key, data);
        
        // Also save a backup every time
        this.save(key + '-backup', data);
        
        // Keep only last 5 backups
        const backupKeys = [];
        for (let i = 0; i < localStorage.length; i++) {
            const storageKey = localStorage.key(i);
            if (storageKey && storageKey.includes(key + '-backup')) {
                backupKeys.push(storageKey);
            }
        }
        
        if (backupKeys.length > 5) {
            // Remove oldest backups
            backupKeys.sort();
            for (let i = 0; i < backupKeys.length - 5; i++) {
                localStorage.removeItem(backupKeys[i]);
            }
        }
    },
    
    // Test if persistence works
    test: function() {
        const testKey = 'persistence-test';
        const testData = { 
            message: 'TEST DATA', 
            timestamp: Date.now(),
            random: Math.random()
        };
        
        console.log('🧪 TESTING PERSISTENCE...');
        
        // Save test data
        const saved = this.save(testKey, testData);
        if (!saved) {
            console.log('❌ PERSISTENCE TEST FAILED - Cannot save');
            return false;
        }
        
        // Load test data
        const loaded = this.load(testKey);
        if (!loaded) {
            console.log('❌ PERSISTENCE TEST FAILED - Cannot load');
            return false;
        }
        
        // Verify data matches
        if (loaded.random !== testData.random) {
            console.log('❌ PERSISTENCE TEST FAILED - Data corrupted');
            return false;
        }
        
        // Clean up
        this.clear(testKey);
        
        console.log('✅ PERSISTENCE TEST PASSED - Data saves and loads correctly');
        return true;
    }
};

// Auto-test on load
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        window.SOLARFLOW_WORKING_PERSISTENCE.test();
    }, 1000);
});

console.log('📦 WORKING PERSISTENCE LOADED - Use window.SOLARFLOW_WORKING_PERSISTENCE to save/load data');