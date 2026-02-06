/**
 * UNIFIED REAL SYSTEM - COMPLETE INTEGRATION
 * Part 2: API exposure, auto-save, and system integration
 */

    exposeUnifiedAPI() {
        this.log('🔌 Exposing unified API for all systems...');
        
        // Global API for ALL systems to use
        window.UNIFIED_REAL_SYSTEM = {
            // Data access
            getData: () => this.centralData,
            getMinions: () => this.centralData.minions,
            getCERProducts: () => this.centralData.cerProducts,
            getSharedKnowledge: () => this.centralData.sharedKnowledge,
            getGlobalEconomy: () => this.centralData.globalEconomy,
            getUnifiedProgress: () => this.centralData.unifiedProgress,
            getGlobalActivityFeed: () => this.centralData.globalActivityFeed,
            
            // Minion operations
            getMinionById: (id) => this.centralData.minions.find(m => m.id === id),
            getMinionsByShift: (shift) => this.centralData.minions.filter(m => m.workStatus.currentShift === shift),
            getWorkingMinions: () => this.centralData.minions.filter(m => m.workStatus.isWorking && !m.workStatus.onBreak),
            assignMinionTask: (minionId, task) => this.assignMinionTask(minionId, task),
            
            // Knowledge operations
            queryKnowledge: (query) => this.queryUnifiedKnowledge(query),
            addKnowledge: (key, value, source) => this.addToSharedKnowledge(key, value, source),
            searchKnowledge: (searchTerm) => this.searchSharedKnowledge(searchTerm),
            
            // Activity operations
            addActivity: (message, source) => this.addGlobalActivity(message, source),
            getRecentActivities: (count = 10) => this.centralData.globalActivityFeed.slice(0, count),
            
            // Economy operations
            earnCredits: (minionId, amount, reason) => this.earnCredits(minionId, amount, reason),
            spendCredits: (minionId, amount, reason) => this.spendCredits(minionId, amount, reason),
            
            // System operations
            registerSystem: (systemName) => this.registerSystem(systemName),
            broadcastMessage: (type, data) => this.broadcastToAllSystems(type, data),
            saveData: () => this.saveUnifiedData(),
            
            // Real-time subscriptions
            subscribe: (eventType, callback) => this.subscribe(eventType, callback),
            unsubscribe: (eventType, callback) => this.unsubscribe(eventType, callback)
        };
        
        this.log('✅ Unified API exposed globally as window.UNIFIED_REAL_SYSTEM');
    }
    
    queryUnifiedKnowledge(query) {
        const lowercaseQuery = query.toLowerCase();
        const results = [];
        
        // Search shared knowledge
        for (const [key, knowledge] of this.centralData.sharedKnowledge.entries()) {
            if (key.toLowerCase().includes(lowercaseQuery) || 
                JSON.stringify(knowledge).toLowerCase().includes(lowercaseQuery)) {
                results.push({
                    key: key,
                    knowledge: knowledge,
                    source: 'shared_knowledge'
                });
            }
        }
        
        // Search minion knowledge
        this.centralData.minions.forEach(minion => {
            // Check VOC database
            Object.entries(minion.sharedKnowledge.vocDatabase).forEach(([productKey, voc]) => {
                if (lowercaseQuery.includes('voc') && 
                    (productKey.toLowerCase().includes(lowercaseQuery) || 
                     lowercaseQuery.includes(productKey.toLowerCase()))) {
                    results.push({
                        key: `voc_${productKey}`,
                        knowledge: { value: voc, unit: 'V', type: 'VOC' },
                        source: minion.name,
                        minion: minion.id
                    });
                }
            });
            
            // Check spacing requirements
            Object.entries(minion.sharedKnowledge.spacingRequirements).forEach(([productKey, spacing]) => {
                if ((lowercaseQuery.includes('spacing') || lowercaseQuery.includes('clearance')) && 
                    productKey.toLowerCase().includes(lowercaseQuery)) {
                    results.push({
                        key: `spacing_${productKey}`,
                        knowledge: { value: spacing, type: 'Installation Clearances' },
                        source: minion.name,
                        minion: minion.id
                    });
                }
            });
        });
        
        return results.length > 0 ? results : [{ message: `No knowledge found for: ${query}. Minions are still learning.` }];
    }
    
    addToSharedKnowledge(key, value, source) {
        this.centralData.sharedKnowledge.set(key, {
            value: value,
            addedBy: source,
            addedAt: new Date().toISOString()
        });
        
        this.addGlobalActivity(`New knowledge added: ${key} by ${source}`);
        this.centralData.unifiedProgress.knowledgeBuilt = this.centralData.sharedKnowledge.size;
    }
    
    searchSharedKnowledge(searchTerm) {
        const results = [];
        const lowercaseTerm = searchTerm.toLowerCase();
        
        for (const [key, knowledge] of this.centralData.sharedKnowledge.entries()) {
            if (key.toLowerCase().includes(lowercaseTerm)) {
                results.push({ key, knowledge });
            }
        }
        
        return results;
    }
    
    assignMinionTask(minionId, task) {
        const minion = this.centralData.minions.find(m => m.id === minionId);
        if (minion && !minion.workStatus.currentTask) {
            minion.workStatus.currentTask = task;
            minion.workStatus.currentSystem = 'manual_assignment';
            this.addGlobalActivity(`${minion.name} assigned to: ${task}`);
            return true;
        }
        return false;
    }
    
    earnCredits(minionId, amount, reason) {
        const minion = this.centralData.minions.find(m => m.id === minionId);
        if (minion) {
            minion.unifiedState.credits += amount;
            this.centralData.globalEconomy.totalCredits += amount;
            this.centralData.globalEconomy.creditsEarned += amount;
            
            this.addGlobalActivity(`${minion.name} earned ${amount} credits: ${reason}`);
            return true;
        }
        return false;
    }
    
    spendCredits(minionId, amount, reason) {
        const minion = this.centralData.minions.find(m => m.id === minionId);
        if (minion && minion.unifiedState.credits >= amount) {
            minion.unifiedState.credits -= amount;
            this.centralData.globalEconomy.creditsSpent += amount;
            
            this.addGlobalActivity(`${minion.name} spent ${amount} credits: ${reason}`);
            return true;
        }
        return false;
    }
    
    registerSystem(systemName) {
        if (!this.connectedSystems.has(systemName)) {
            this.connectedSystems.add(systemName);
            this.log(`🔌 System registered: ${systemName}`);
            this.centralData.unifiedProgress.systemsIntegrated = this.connectedSystems.size;
            this.addGlobalActivity(`System connected: ${systemName}`);
        }
    }
    
    subscribe(eventType, callback) {
        if (!this.subscribers) this.subscribers = new Map();
        if (!this.subscribers.has(eventType)) this.subscribers.set(eventType, new Set());
        this.subscribers.get(eventType).add(callback);
    }
    
    unsubscribe(eventType, callback) {
        if (this.subscribers && this.subscribers.has(eventType)) {
            this.subscribers.get(eventType).delete(callback);
        }
    }
    
    broadcastSystemReady() {
        // Broadcast that unified system is ready
        this.addGlobalActivity('🚀 Unified Real System v2.0.0 is now fully operational');
        
        // Notify any waiting systems
        if (this.subscribers && this.subscribers.has('system_ready')) {
            this.subscribers.get('system_ready').forEach(callback => {
                try {
                    callback(this.centralData);
                } catch (error) {
                    this.log('❌ Error in system_ready callback:', error);
                }
            });
        }
    }
    
    startUnifiedAutoSave() {
        this.log('💾 Starting unified auto-save system...');
        
        // Auto-save every 30 seconds
        setInterval(() => {
            this.saveUnifiedData();
        }, 30000);
        
        // Save on page unload
        window.addEventListener('beforeunload', () => {
            this.saveUnifiedData();
        });
        
        this.log('✅ Auto-save system active');
    }
    
    saveUnifiedData() {
        try {
            const dataToSave = {
                ...this.centralData,
                meta: {
                    ...this.centralData.meta,
                    lastSaved: new Date().toISOString(),
                    saveCount: (this.centralData.meta.saveCount || 0) + 1
                },
                // Convert Maps to arrays for storage
                documents: Array.from(this.centralData.documents.entries()),
                sharedKnowledge: Array.from(this.centralData.sharedKnowledge.entries())
            };
            
            localStorage.setItem(this.storageKey, JSON.stringify(dataToSave));
            
            this.log(`💾 Unified data saved (save #${dataToSave.meta.saveCount})`);
            
            // Also save to separate backup key
            localStorage.setItem(this.storageKey + '_backup', JSON.stringify(dataToSave));
            
        } catch (error) {
            this.log('❌ Error saving unified data:', error);
        }
    }
    
    // Emergency recovery functions
    recoverFromBackup() {
        try {
            const backupData = localStorage.getItem(this.storageKey + '_backup');
            if (backupData) {
                localStorage.setItem(this.storageKey, backupData);
                this.log('✅ Data recovered from backup');
                location.reload();
            }
        } catch (error) {
            this.log('❌ Error recovering from backup:', error);
        }
    }
    
    resetUnifiedSystem() {
        if (confirm('⚠️ Reset ALL unified data? This will delete everything!')) {
            localStorage.removeItem(this.storageKey);
            localStorage.removeItem(this.storageKey + '_backup');
            this.log('🗑️ Unified system reset');
            location.reload();
        }
    }
    
    // Diagnostic functions
    getSystemDiagnostics() {
        return {
            version: this.version,
            uptime: Date.now() - this.centralData.meta.systemUptime,
            connectedSystems: Array.from(this.connectedSystems),
            minions: {
                total: this.centralData.minions.length,
                working: this.centralData.minions.filter(m => m.workStatus.isWorking).length,
                onBreak: this.centralData.minions.filter(m => m.workStatus.onBreak).length
            },
            economy: this.centralData.globalEconomy,
            progress: this.centralData.unifiedProgress,
            knowledge: {
                totalEntries: this.centralData.sharedKnowledge.size,
                recentEntries: Array.from(this.centralData.sharedKnowledge.entries()).slice(-5)
            },
            activities: {
                total: this.centralData.globalActivityFeed.length,
                recent: this.centralData.globalActivityFeed.slice(0, 5)
            },
            storage: {
                used: JSON.stringify(this.centralData).length,
                lastSaved: this.centralData.meta.lastSaved,
                saveCount: this.centralData.meta.saveCount
            }
        };
    }
}

// Auto-initialize unified system when page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Starting Unified Real System v2.0.0...');
    
    // Initialize unified system
    window.unifiedRealSystem = new UnifiedRealSystem();
    
    // Add global diagnostic functions
    window.UNIFIED_DIAGNOSTICS = {
        getStats: () => window.unifiedRealSystem.getSystemDiagnostics(),
        queryKnowledge: (query) => window.UNIFIED_REAL_SYSTEM.queryKnowledge(query),
        saveNow: () => window.UNIFIED_REAL_SYSTEM.saveData(),
        resetSystem: () => window.unifiedRealSystem.resetUnifiedSystem(),
        recoverBackup: () => window.unifiedRealSystem.recoverFromBackup(),
        showMinions: () => window.UNIFIED_REAL_SYSTEM.getMinions().slice(0, 10)
    };
    
    console.log('✅ Unified Real System initialized');
    console.log('🔧 Use UNIFIED_DIAGNOSTICS.getStats() to see system status');
    console.log('🧠 Use UNIFIED_DIAGNOSTICS.queryKnowledge("question") to test knowledge');
});

// Integration helpers for existing systems
window.INTEGRATION_HELPERS = {
    // Update any element with unified data
    updateElement: (elementId, unifiedDataPath) => {
        const element = document.getElementById(elementId);
        if (element && window.UNIFIED_REAL_SYSTEM) {
            const data = window.UNIFIED_REAL_SYSTEM.getData();
            const value = unifiedDataPath.split('.').reduce((obj, key) => obj?.[key], data);
            if (value !== undefined) {
                element.textContent = typeof value === 'number' ? value.toLocaleString() : value;
            }
        }
    },
    
    // Connect any activity feed to unified feed
    connectActivityFeed: (elementId) => {
        const element = document.getElementById(elementId);
        if (element && window.UNIFIED_REAL_SYSTEM) {
            const activities = window.UNIFIED_REAL_SYSTEM.getGlobalActivityFeed();
            element.innerHTML = activities.slice(0, 10).map(activity => 
                `<div class="activity-item">
                    <span class="timestamp">[${activity.timeDisplay}]</span>
                    ${activity.message}
                </div>`
            ).join('');
        }
    },
    
    // Connect any minion roster to unified minions
    connectMinionRoster: (containerId) => {
        const container = document.getElementById(containerId);
        if (container && window.UNIFIED_REAL_SYSTEM) {
            const minions = window.UNIFIED_REAL_SYSTEM.getMinions();
            container.innerHTML = '';
            
            minions.slice(0, 12).forEach(minion => {
                const card = document.createElement('div');
                card.className = 'minion-card unified-minion';
                card.innerHTML = `
                    <div class="minion-info">
                        <h4>${minion.name}</h4>
                        <p class="tier">Tier ${minion.tier} ${minion.role}</p>
                        <p class="specialty">${minion.specialty.replace(/-/g, ' ')}</p>
                        <div class="stats">
                            <span>💰 ${minion.unifiedState.credits}</span>
                            <span>📚 ${minion.unifiedState.documentsProcessed}</span>
                            <span>🧠 ${minion.unifiedState.knowledgeContributed}</span>
                        </div>
                        <p class="status">${minion.workStatus.currentTask || 'Available for work'}</p>
                    </div>
                `;
                container.appendChild(card);
            });
        }
    },
    
    // Connect any progress display to unified progress
    connectProgressDisplay: (elementId, progressType) => {
        const element = document.getElementById(elementId);
        if (element && window.UNIFIED_REAL_SYSTEM) {
            const progress = window.UNIFIED_REAL_SYSTEM.getUnifiedProgress();
            const value = progress[progressType] || 0;
            element.textContent = value.toLocaleString();
        }
    }
};

// Auto-connect common elements every 5 seconds
setInterval(() => {
    if (window.UNIFIED_REAL_SYSTEM && window.INTEGRATION_HELPERS) {
        // Common element mappings
        const elementMappings = {
            'totalMinions': 'minions.length',
            'totalCredits': 'globalEconomy.totalCredits',
            'creditsEarned': 'globalEconomy.creditsEarned',
            'documentsProcessed': 'unifiedProgress.documentsProcessed',
            'knowledgeBuilt': 'unifiedProgress.knowledgeBuilt',
            'cerProductCount': 'cerProducts.length',
            'systemsIntegrated': 'unifiedProgress.systemsIntegrated'
        };
        
        Object.entries(elementMappings).forEach(([elementId, dataPath]) => {
            window.INTEGRATION_HELPERS.updateElement(elementId, dataPath);
        });
        
        // Auto-connect activity feeds
        ['activityFeed', 'globalActivityFeed', 'unifiedActivityFeed'].forEach(feedId => {
            window.INTEGRATION_HELPERS.connectActivityFeed(feedId);
        });
        
        // Auto-connect minion rosters  
        ['minionRoster', 'unifiedMinionRoster', 'minionList'].forEach(rosterId => {
            window.INTEGRATION_HELPERS.connectMinionRoster(rosterId);
        });
    }
}, 5000);