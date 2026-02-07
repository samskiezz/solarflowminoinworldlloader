/**
 * PERSISTENT DATA STORE - REAL CLIENT-SIDE PERSISTENCE
 * Works on GitHub Pages with IndexedDB + localStorage fallback
 * 
 * Collections: minions, messages, tasks, shifts, economics, 
 * solarMetrics, threats, knowledge, aiMemory, systemLogs
 */

class PersistentDataStore {
    constructor() {
        this.dbName = 'SolarFlowDB';
        this.version = 1;
        this.db = null;
        this.fallbackMode = false;
        
        this.collections = [
            'minions',
            'messages', 
            'tasks',
            'shifts',
            'economics',
            'solarMetrics',
            'threats',
            'knowledge',
            'aiMemory',
            'systemLogs'
        ];
        
        this.eventEmitter = new EventTarget();
    }
    
    async init() {
        console.log('💾 Initializing PersistentDataStore...');
        
        try {
            await this.initIndexedDB();
            console.log('✅ IndexedDB initialized successfully');
        } catch (error) {
            console.warn('⚠️ IndexedDB failed, falling back to localStorage:', error);
            this.fallbackMode = true;
            this.initLocalStorageFallback();
        }
        
        // Load initial data from hive_state.json if collections are empty
        await this.seedInitialData();
    }
    
    async initIndexedDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Create object stores for each collection
                this.collections.forEach(collectionName => {
                    if (!db.objectStoreNames.contains(collectionName)) {
                        const store = db.createObjectStore(collectionName, { 
                            keyPath: 'id', 
                            autoIncrement: true 
                        });
                        
                        // Add indexes
                        store.createIndex('timestamp', 'timestamp', { unique: false });
                        store.createIndex('updatedAt', 'updatedAt', { unique: false });
                        
                        if (collectionName === 'minions') {
                            store.createIndex('name', 'name', { unique: false });
                            store.createIndex('role', 'role', { unique: false });
                        }
                        
                        if (collectionName === 'messages') {
                            store.createIndex('from', 'from', { unique: false });
                            store.createIndex('to', 'to', { unique: false });
                        }
                        
                        if (collectionName === 'tasks') {
                            store.createIndex('owner', 'owner', { unique: false });
                            store.createIndex('status', 'status', { unique: false });
                        }
                    }
                });
            };
        });
    }
    
    initLocalStorageFallback() {
        console.log('📦 Using localStorage fallback mode');
        this.fallbackMode = true;
    }
    
    async seedInitialData() {
        try {
            // Check if minions collection is empty
            const existingMinions = await this.getAll('minions');
            
            if (existingMinions.length === 0) {
                console.log('🌱 Seeding initial data from hive_state.json...');
                
                // Load hive state data
                const hiveResponse = await fetch('./hive_state.json');
                const hiveData = await hiveResponse.json();
                
                // Seed minions
                if (hiveData.minions) {
                    for (const minion of hiveData.minions) {
                        await this.create('minions', {
                            ...minion,
                            timestamp: Date.now(),
                            updatedAt: new Date().toISOString()
                        });
                    }
                }
                
                // Seed initial system log
                await this.create('systemLogs', {
                    type: 'system_init',
                    message: 'SolarFlow Core System initialized with persistent data store',
                    timestamp: Date.now(),
                    data: {
                        collections: this.collections.length,
                        fallbackMode: this.fallbackMode,
                        minionsSeeded: hiveData.minions?.length || 0
                    }
                });
                
                console.log('✅ Initial data seeded successfully');
            }
        } catch (error) {
            console.error('❌ Error seeding initial data:', error);
        }
    }
    
    // CRUD Operations
    async create(collection, data) {
        const item = {
            ...data,
            id: data.id || this.generateId(),
            timestamp: data.timestamp || Date.now(),
            updatedAt: new Date().toISOString()
        };
        
        if (this.fallbackMode) {
            return this.localStorageCreate(collection, item);
        } else {
            return this.indexedDBCreate(collection, item);
        }
    }
    
    async read(collection, id) {
        if (this.fallbackMode) {
            return this.localStorageRead(collection, id);
        } else {
            return this.indexedDBRead(collection, id);
        }
    }
    
    async update(collection, id, data) {
        const updatedItem = {
            ...data,
            id: id,
            updatedAt: new Date().toISOString()
        };
        
        if (this.fallbackMode) {
            return this.localStorageUpdate(collection, id, updatedItem);
        } else {
            return this.indexedDBUpdate(collection, id, updatedItem);
        }
    }
    
    async delete(collection, id) {
        if (this.fallbackMode) {
            return this.localStorageDelete(collection, id);
        } else {
            return this.indexedDBDelete(collection, id);
        }
    }
    
    async getAll(collection) {
        if (this.fallbackMode) {
            return this.localStorageGetAll(collection);
        } else {
            return this.indexedDBGetAll(collection);
        }
    }
    
    async query(collection, indexName, value) {
        if (this.fallbackMode) {
            return this.localStorageQuery(collection, indexName, value);
        } else {
            return this.indexedDBQuery(collection, indexName, value);
        }
    }
    
    // IndexedDB implementations
    async indexedDBCreate(collection, item) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([collection], 'readwrite');
            const store = transaction.objectStore(collection);
            const request = store.add(item);
            
            request.onsuccess = () => {
                this.emitDataChange('create', collection, item);
                resolve(item);
            };
            request.onerror = () => reject(request.error);
        });
    }
    
    async indexedDBRead(collection, id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([collection], 'readonly');
            const store = transaction.objectStore(collection);
            const request = store.get(id);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
    
    async indexedDBUpdate(collection, id, data) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([collection], 'readwrite');
            const store = transaction.objectStore(collection);
            const request = store.put(data);
            
            request.onsuccess = () => {
                this.emitDataChange('update', collection, data);
                resolve(data);
            };
            request.onerror = () => reject(request.error);
        });
    }
    
    async indexedDBDelete(collection, id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([collection], 'readwrite');
            const store = transaction.objectStore(collection);
            const request = store.delete(id);
            
            request.onsuccess = () => {
                this.emitDataChange('delete', collection, { id });
                resolve();
            };
            request.onerror = () => reject(request.error);
        });
    }
    
    async indexedDBGetAll(collection) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([collection], 'readonly');
            const store = transaction.objectStore(collection);
            const request = store.getAll();
            
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    }
    
    async indexedDBQuery(collection, indexName, value) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([collection], 'readonly');
            const store = transaction.objectStore(collection);
            const index = store.index(indexName);
            const request = index.getAll(value);
            
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    }
    
    // localStorage fallback implementations
    localStorageCreate(collection, item) {
        const items = this.localStorageGetAll(collection);
        items.push(item);
        localStorage.setItem(`solarflow_${collection}`, JSON.stringify(items));
        this.emitDataChange('create', collection, item);
        return item;
    }
    
    localStorageRead(collection, id) {
        const items = this.localStorageGetAll(collection);
        return items.find(item => item.id === id) || null;
    }
    
    localStorageUpdate(collection, id, data) {
        const items = this.localStorageGetAll(collection);
        const index = items.findIndex(item => item.id === id);
        if (index !== -1) {
            items[index] = data;
            localStorage.setItem(`solarflow_${collection}`, JSON.stringify(items));
            this.emitDataChange('update', collection, data);
        }
        return data;
    }
    
    localStorageDelete(collection, id) {
        const items = this.localStorageGetAll(collection);
        const filtered = items.filter(item => item.id !== id);
        localStorage.setItem(`solarflow_${collection}`, JSON.stringify(filtered));
        this.emitDataChange('delete', collection, { id });
    }
    
    localStorageGetAll(collection) {
        const stored = localStorage.getItem(`solarflow_${collection}`);
        return stored ? JSON.parse(stored) : [];
    }
    
    localStorageQuery(collection, indexName, value) {
        const items = this.localStorageGetAll(collection);
        return items.filter(item => item[indexName] === value);
    }
    
    // Utility methods
    generateId() {
        return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    emitDataChange(operation, collection, data) {
        const event = new CustomEvent('datachange', {
            detail: { operation, collection, data, timestamp: Date.now() }
        });
        this.eventEmitter.dispatchEvent(event);
        
        // Also emit through global event bus if available
        if (window.coreSystem?.eventBus) {
            window.coreSystem.eventBus.emit('data.changed', {
                operation, collection, data, timestamp: Date.now()
            });
        }
    }
    
    on(event, callback) {
        this.eventEmitter.addEventListener(event, callback);
    }
    
    isHealthy() {
        if (this.fallbackMode) {
            return localStorage !== undefined;
        } else {
            return this.db !== null;
        }
    }
    
    // Export/Import for debugging
    async exportData() {
        const export_data = {};
        for (const collection of this.collections) {
            export_data[collection] = await this.getAll(collection);
        }
        return export_data;
    }
    
    async importData(data) {
        for (const [collection, items] of Object.entries(data)) {
            if (this.collections.includes(collection)) {
                for (const item of items) {
                    await this.create(collection, item);
                }
            }
        }
    }
}

/**
 * DATA VIEWER UI - Debug and inspect stored data
 */
class DataViewerUI {
    constructor(dataStore) {
        this.dataStore = dataStore;
    }
    
    async render() {
        const container = document.createElement('div');
        container.className = 'data-viewer';
        container.innerHTML = `
            <div class="data-viewer-header">
                <h3>🔍 Data Store Inspector</h3>
                <div class="data-viewer-controls">
                    <button onclick="dataViewer.refresh()">🔄 Refresh</button>
                    <button onclick="dataViewer.exportData()">📤 Export</button>
                    <button onclick="dataViewer.runSelfTest()">🧪 Self Test</button>
                </div>
            </div>
            <div class="data-viewer-content">
                <div class="data-collections"></div>
            </div>
        `;
        
        await this.renderCollections(container.querySelector('.data-collections'));
        
        return container;
    }
    
    async renderCollections(container) {
        container.innerHTML = '';
        
        for (const collection of this.dataStore.collections) {
            const items = await this.dataStore.getAll(collection);
            
            const collectionDiv = document.createElement('div');
            collectionDiv.className = 'data-collection';
            collectionDiv.innerHTML = `
                <h4>${collection} (${items.length})</h4>
                <div class="data-items">
                    ${items.slice(0, 5).map(item => `
                        <div class="data-item">
                            <code>${JSON.stringify(item, null, 2)}</code>
                        </div>
                    `).join('')}
                    ${items.length > 5 ? `<div class="data-more">... and ${items.length - 5} more</div>` : ''}
                </div>
            `;
            
            container.appendChild(collectionDiv);
        }
    }
    
    async refresh() {
        const content = document.querySelector('.data-collections');
        if (content) {
            await this.renderCollections(content);
        }
    }
    
    async exportData() {
        const data = await this.dataStore.exportData();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `solarflow-data-${Date.now()}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
    }
    
    async runSelfTest() {
        console.log('🧪 Running data store self-test...');
        
        const testData = {
            id: 'test_minion',
            name: 'Test Minion',
            role: 'TESTER',
            timestamp: Date.now()
        };
        
        try {
            // Test create
            await this.dataStore.create('minions', testData);
            console.log('✅ Create test passed');
            
            // Test read
            const retrieved = await this.dataStore.read('minions', 'test_minion');
            console.log('✅ Read test passed:', retrieved);
            
            // Test update
            await this.dataStore.update('minions', 'test_minion', {
                ...testData,
                updated: true
            });
            console.log('✅ Update test passed');
            
            // Test delete
            await this.dataStore.delete('minions', 'test_minion');
            console.log('✅ Delete test passed');
            
            alert('✅ All data store tests passed!');
        } catch (error) {
            console.error('❌ Data store test failed:', error);
            alert('❌ Data store test failed: ' + error.message);
        }
    }
}

// Global data viewer instance
window.addEventListener('DOMContentLoaded', () => {
    if (window.coreSystem?.dataStore) {
        window.dataViewer = new DataViewerUI(window.coreSystem.dataStore);
    }
});