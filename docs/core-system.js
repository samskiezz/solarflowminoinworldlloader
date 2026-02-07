/**
 * SOLARFLOW MINION WORLD - CORE SYSTEM ARCHITECTURE
 * Elite Principal Software Architect Implementation
 * 
 * NO NEW BUTTONS POLICY: All features become sub-modules of existing buttons
 * REAL DATA PERSISTENCE: IndexedDB + localStorage fallback
 * EMBEDDED LLM: Minion cognition engine with cross-module AI
 */

class SolarFlowCoreSystem {
    constructor() {
        this.modules = new Map();
        this.eventBus = new EventBus();
        this.dataStore = new PersistentDataStore();
        this.llmEngine = new MinionCognitionEngine();
        this.featureRegistry = new FeatureRegistry();
        
        this.init();
    }

    async init() {
        console.log('🚀 SolarFlow Core System initializing...');
        
        // Initialize data layer
        await this.dataStore.init();
        
        // Register all existing features from repo scan
        this.registerExistingFeatures();
        
        // Setup module routing
        this.setupModuleRouter();
        
        // Initialize LLM engine
        await this.llmEngine.init();
        
        // Setup cross-module communication
        this.setupEventHandlers();
        
        // Run system verification
        this.runSystemDiagnostics();
        
        console.log('✅ SolarFlow Core System ready');
    }

    registerExistingFeatures() {
        // FEATURE INVENTORY FROM REPO SCAN
        const features = [
            // ROSTER MODULE
            { id: 'roster', category: 'roster', files: ['roster.html', 'minions.json'], ui: 'Roster' },
            { id: 'roster-full', category: 'roster', files: ['roster.html'], ui: '👥 Full Roster' },
            
            // COMMUNICATION MODULE  
            { id: 'minion-chat', category: 'communication', files: ['minion-chat.html'], ui: '💬 Chat with Minions' },
            
            // ACTIVITY MODULE
            { id: 'activity-feed', category: 'activity', files: ['activity-feed.html', 'feed.json'], ui: '📊 Live Activity' },
            
            // CONTROL MODULE
            { id: 'minion-control', category: 'control', files: ['minion-control.html'], ui: '🎛️ Control Panel' },
            
            // CONSCIOUSNESS MODULE
            { id: 'consciousness-engine', category: 'consciousness', files: ['consciousness-engine.html'], ui: '🧠 Consciousness Engine' },
            { id: 'real-work-consciousness', category: 'consciousness', files: ['real-work-consciousness.html'], ui: '⚙️ Real Work Evolution' },
            
            // WORLD MODULE
            { id: 'autonomous-world', category: 'world', files: ['autonomous-world.html'], ui: '🌍 Autonomous World' },
            
            // THREAT MODULE
            { id: 'threat-system', category: 'threat', files: ['existential-threat-system.html'], ui: '💀 Threat System' },
            
            // KNOWLEDGE MODULE
            { id: 'knowledge-system', category: 'knowledge', files: ['autonomous-minion-knowledge-system.html'], ui: '🤖 Knowledge System' },
            
            // 3D REALM MODULE - CONSOLIDATED ALL VARIANTS
            { id: 'realm-3d', category: 'realm', files: [
                'ultimate-3d-realm-llm.html',
                'dominion-city.html',
                'enhanced-modular-engine.html', 
                'integrated-engine-main.html',
                'realm.html',
                'realm-interactive.html'
            ], ui: '🤖 3D Realm (Ultimate AI)' },
            
            // SOLAR MODULE
            { id: 'project-solar-australia', category: 'solar', files: ['project_solar_australia.html', 'real-cer-product-database.json'], ui: '🇦🇺 Project Solar Australia' }
        ];
        
        features.forEach(feature => {
            this.featureRegistry.register(feature);
        });
    }

    setupModuleRouter() {
        this.moduleRouter = new ModuleRouter(this.featureRegistry);
    }

    setupEventHandlers() {
        this.eventBus.on('feature.load', (data) => {
            this.loadFeatureModule(data.featureId, data.params);
        });
        
        this.eventBus.on('data.changed', (data) => {
            this.broadcastDataChange(data);
        });
        
        this.eventBus.on('llm.request', (data) => {
            this.llmEngine.process(data);
        });
    }

    async loadFeatureModule(featureId, params = {}) {
        const feature = this.featureRegistry.get(featureId);
        if (!feature) {
            throw new Error(`Feature not found: ${featureId}`);
        }
        
        // Load as panel/iframe within existing button's container
        const container = document.querySelector(`[data-feature-category="${feature.category}"]`);
        if (container) {
            await this.renderFeatureModule(container, feature, params);
        }
    }

    broadcastDataChange(data) {
        // Notify all modules of data changes
        this.modules.forEach((module, moduleId) => {
            if (module.onDataChange) {
                module.onDataChange(data);
            }
        });
    }

    runSystemDiagnostics() {
        console.log('🔍 Running system diagnostics...');
        
        const diagnostics = {
            dataStore: this.dataStore.isHealthy(),
            llmEngine: this.llmEngine.isReady(),
            features: this.featureRegistry.getAll().length,
            eventBus: this.eventBus.isHealthy(),
            timestamp: new Date().toISOString()
        };
        
        console.log('📊 System diagnostics:', diagnostics);
        return diagnostics;
    }
}

class EventBus {
    constructor() {
        this.events = new Map();
    }
    
    on(event, callback) {
        if (!this.events.has(event)) {
            this.events.set(event, []);
        }
        this.events.get(event).push(callback);
    }
    
    emit(event, data) {
        if (this.events.has(event)) {
            this.events.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Event handler error for ${event}:`, error);
                }
            });
        }
    }
    
    isHealthy() {
        return this.events.size > 0;
    }
}

class FeatureRegistry {
    constructor() {
        this.features = new Map();
        this.categories = new Map();
    }
    
    register(feature) {
        this.features.set(feature.id, feature);
        
        if (!this.categories.has(feature.category)) {
            this.categories.set(feature.category, []);
        }
        this.categories.get(feature.category).push(feature.id);
        
        console.log(`📋 Registered feature: ${feature.id} (${feature.category})`);
    }
    
    get(featureId) {
        return this.features.get(featureId);
    }
    
    getByCategory(category) {
        const featureIds = this.categories.get(category) || [];
        return featureIds.map(id => this.features.get(id));
    }
    
    getAll() {
        return Array.from(this.features.values());
    }
}

class ModuleRouter {
    constructor(featureRegistry) {
        this.featureRegistry = featureRegistry;
        this.setupRouting();
    }
    
    setupRouting() {
        // Intercept all button clicks to route through module system
        document.addEventListener('click', (event) => {
            const button = event.target.closest('button[onclick*="location.href"]');
            if (button) {
                event.preventDefault();
                const href = this.extractHref(button.getAttribute('onclick'));
                this.routeToFeature(href);
            }
        });
    }
    
    extractHref(onclickAttr) {
        const match = onclickAttr.match(/location\.href='([^']+)'/);
        return match ? match[1] : null;
    }
    
    routeToFeature(href) {
        // Find feature by file reference
        const feature = this.featureRegistry.getAll().find(f => 
            f.files.some(file => href.includes(file.replace('.html', '')))
        );
        
        if (feature) {
            window.coreSystem.eventBus.emit('feature.load', { 
                featureId: feature.id, 
                href: href 
            });
        } else {
            // Fallback to original navigation
            window.location.href = href;
        }
    }
}

// Initialize global system
window.addEventListener('DOMContentLoaded', async () => {
    window.coreSystem = new SolarFlowCoreSystem();
});