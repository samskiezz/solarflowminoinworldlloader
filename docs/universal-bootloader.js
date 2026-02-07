/**
 * SolarFlow Universal Bootloader v2.2.0
 * Provides data persistence across ALL pages in the SolarFlow system
 * Include this script on any page to enable data persistence
 */

// Prevent multiple initialization
if (!window.SOLARFLOW_BOOTLOADER_INITIALIZED) {
    window.SOLARFLOW_BOOTLOADER_INITIALIZED = true;

    class SolarFlowUniversalBootloader {
        constructor() {
            this.version = '2.2.0';
            this.initialized = false;
            this.state = {};
            this.autoSaveInterval = null;
            this.sessionId = 'solarflow-' + Date.now();
            this.pageName = this.detectPageName();
            
            console.log('🚀 SolarFlow Universal Bootloader v' + this.version + ' starting on:', this.pageName);
            this.init();
        }
        
        detectPageName() {
            const path = window.location.pathname;
            const filename = path.split('/').pop() || 'index.html';
            return filename.replace('.html', '');
        }
        
        async init() {
            try {
                console.log('🔧 Initializing universal bootloader...');
                
                // 1. Load existing state
                await this.loadState();
                
                // 2. Initialize systems if first run or data is missing
                if (!this.state.initialized || this.shouldReinitialize()) {
                    await this.initializeSystemData();
                }
                
                // 3. Update page visit tracking
                this.trackPageVisit();
                
                // 4. Setup auto-save
                this.setupAutoSave();
                
                // 5. Setup before unload handler
                this.setupBeforeUnload();
                
                // 6. Mark as initialized
                this.initialized = true;
                this.state.lastBootTime = Date.now();
                this.state.lastPage = this.pageName;
                await this.saveState();
                
                console.log('✅ Universal Bootloader ready on', this.pageName);
                console.log('📊 State loaded:', Object.keys(this.state).length, 'sections');
                console.log('💾 Auto-save enabled every 30 seconds');
                
                // Fire ready event for pages to listen to
                window.dispatchEvent(new CustomEvent('solarflow-ready', { 
                    detail: { bootloader: this, state: this.state }
                }));
                
            } catch (error) {
                console.error('❌ Universal Bootloader initialization failed:', error);
            }
        }
        
        shouldReinitialize() {
            const lastBoot = this.state.lastBootTime || 0;
            const timeSinceLastBoot = Date.now() - lastBoot;
            const maxAge = 24 * 60 * 60 * 1000; // 24 hours
            
            return timeSinceLastBoot > maxAge;
        }
        
        async loadState() {
            try {
                // Try localStorage first (primary storage for static hosting)
                const localData = localStorage.getItem('solarflow-state');
                if (localData) {
                    this.state = JSON.parse(localData);
                    console.log('📂 State loaded from localStorage (' + Math.round(localData.length/1024) + 'KB)');
                    
                    // Validate state structure
                    if (!this.state.version) {
                        this.state.version = this.version;
                    }
                    return;
                }
                
                // Try API endpoint if available (for VPS hosting)
                try {
                    const response = await fetch('/api/state');
                    if (response.ok) {
                        this.state = await response.json();
                        console.log('📂 State loaded from API');
                        // Also save to localStorage as backup
                        localStorage.setItem('solarflow-state', JSON.stringify(this.state));
                        return;
                    }
                } catch (apiError) {
                    // API not available, continue with localStorage
                }
                
                // Initialize empty state
                this.state = this.getDefaultState();
                console.log('📂 Initialized empty state');
                
            } catch (error) {
                console.error('⚠️ State loading error:', error);
                this.state = this.getDefaultState();
            }
        }
        
        getDefaultState() {
            return {
                version: this.version,
                initialized: false,
                created: Date.now(),
                lastUpdate: Date.now(),
                sessionCount: 0,
                pageVisits: {},
                
                // Core system data
                minions: [],
                activities: [],
                conversations: {},
                documents: [],
                
                // Autonomous world state
                autonomous: {
                    population: 24,
                    energyCredits: 2765,
                    activeWorkers: 18,
                    shiftRotation: 'Alpha',
                    productivity: 94.2,
                    lastUpdate: Date.now(),
                    events: [],
                    milestones: []
                },
                
                // Minion chat state
                minionChat: {
                    conversations: {},
                    lastActive: Date.now(),
                    totalMessages: 0
                },
                
                // Dominion city state
                dominionCity: {
                    buildings: [],
                    population: 1000,
                    resources: { energy: 500, materials: 300, research: 150 },
                    lastUpdate: Date.now()
                },
                
                // Consciousness engine state
                consciousness: {
                    level: 0.75,
                    patterns: [],
                    insights: [],
                    lastEvolution: Date.now()
                },
                
                // 3D realm state
                realm3D: {
                    avatarPositions: {},
                    lastInteraction: Date.now(),
                    activeMinions: []
                },
                
                // Hive state (unified system state)
                hive_state: {
                    version: this.version,
                    timestamp: Date.now(),
                    systems: {
                        core: { status: "operational", uptime: 0 },
                        solar: { status: "operational", compliance: 100 },
                        advanced: { status: "operational", ai_active: true },
                        utilities: { status: "operational", diagnostics: "passing" }
                    }
                }
            };
        }
        
        async initializeSystemData() {
            try {
                console.log('🔧 Initializing system data...');
                
                // Initialize minions if empty
                if (!this.state.minions || this.state.minions.length === 0) {
                    this.state.minions = await this.loadMinions();
                }
                
                // Initialize activities if empty
                if (!this.state.activities || this.state.activities.length === 0) {
                    this.state.activities = this.generateInitialActivities();
                }
                
                // Ensure all subsystems have valid states
                this.validateSubsystemStates();
                
                // Update timestamps
                this.state.initialized = true;
                this.state.lastUpdate = Date.now();
                this.state.sessionCount = (this.state.sessionCount || 0) + 1;
                
                console.log('✅ System data initialized');
                
            } catch (error) {
                console.error('❌ System initialization failed:', error);
            }
        }
        
        validateSubsystemStates() {
            const defaults = this.getDefaultState();
            
            // Ensure all major subsystems exist
            const subsystems = ['autonomous', 'minionChat', 'dominionCity', 'consciousness', 'realm3D'];
            for (const subsystem of subsystems) {
                if (!this.state[subsystem]) {
                    this.state[subsystem] = defaults[subsystem];
                    console.log('🔧 Restored missing subsystem:', subsystem);
                }
            }
        }
        
        async loadMinions() {
            try {
                const response = await fetch('./minions.json');
                if (response.ok) {
                    const data = await response.json();
                    console.log('👥 Loaded', data.minions?.length || 0, 'minions');
                    return data.minions || [];
                }
            } catch (error) {
                console.log('⚠️ Could not load minions.json, using defaults');
            }
            
            // Return default minions
            return [
                { id: 'ATLAS', tier: 'Alpha', specialty: 'Architecture', status: 'active', energy: 100, lastSeen: Date.now() },
                { id: 'LUMEN', tier: 'Alpha', specialty: 'Illumination', status: 'active', energy: 95, lastSeen: Date.now() },
                { id: 'NOVA', tier: 'Beta', specialty: 'Stellar', status: 'active', energy: 88, lastSeen: Date.now() },
                { id: 'BOLT', tier: 'Beta', specialty: 'Energy', status: 'active', energy: 92, lastSeen: Date.now() },
                { id: 'PRISM', tier: 'Beta', specialty: 'Refraction', status: 'active', energy: 89, lastSeen: Date.now() },
                { id: 'ORBIT', tier: 'Gamma', specialty: 'Navigation', status: 'active', energy: 85, lastSeen: Date.now() }
            ];
        }
        
        generateInitialActivities() {
            const now = Date.now();
            return [
                {
                    id: 'boot-' + now,
                    timestamp: now,
                    type: 'system',
                    message: '🚀 SolarFlow universal system initialized on ' + this.pageName,
                    minion: 'SYSTEM',
                    page: this.pageName
                },
                {
                    id: 'data-' + now,
                    timestamp: now - 1000,
                    type: 'data',
                    message: '💾 Universal data persistence enabled',
                    minion: 'ATLAS',
                    page: this.pageName
                }
            ];
        }
        
        trackPageVisit() {
            if (!this.state.pageVisits) this.state.pageVisits = {};
            if (!this.state.pageVisits[this.pageName]) {
                this.state.pageVisits[this.pageName] = { count: 0, firstVisit: Date.now() };
            }
            
            this.state.pageVisits[this.pageName].count++;
            this.state.pageVisits[this.pageName].lastVisit = Date.now();
            
            console.log('📊 Page visit tracked:', this.pageName, 'visits:', this.state.pageVisits[this.pageName].count);
        }
        
        async saveState() {
            try {
                this.state.lastUpdate = Date.now();
                this.state.lastSavedFrom = this.pageName;
                
                // Save to localStorage (primary for static hosting)
                const stateJson = JSON.stringify(this.state);
                localStorage.setItem('solarflow-state', stateJson);
                
                console.log('💾 State saved from', this.pageName, '(' + Math.round(stateJson.length/1024) + 'KB)');
                
                // Try to save to API if available (for VPS hosting)
                try {
                    await fetch('/api/state', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: stateJson
                    });
                    console.log('🌐 State also saved to API');
                } catch (apiError) {
                    // API not available, localStorage save is sufficient
                }
                
            } catch (error) {
                console.error('❌ State save failed:', error);
            }
        }
        
        setupAutoSave() {
            // Clear any existing auto-save
            if (this.autoSaveInterval) {
                clearInterval(this.autoSaveInterval);
            }
            
            // Save state every 30 seconds
            this.autoSaveInterval = setInterval(() => {
                if (this.initialized) {
                    this.saveState();
                }
            }, 30000);
        }
        
        setupBeforeUnload() {
            // Save state when leaving page
            window.addEventListener('beforeunload', () => {
                if (this.initialized) {
                    // Synchronous save for page unload
                    const stateJson = JSON.stringify(this.state);
                    localStorage.setItem('solarflow-state', stateJson);
                    console.log('💾 State saved on page unload from', this.pageName);
                }
            });
            
            // Also save on visibility change (tab switching)
            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'hidden' && this.initialized) {
                    this.saveState();
                }
            });
        }
        
        // Public API for pages to use
        getState() { 
            return JSON.parse(JSON.stringify(this.state)); // Deep copy to prevent mutation
        }
        
        async updateState(updates) {
            // Deep merge updates into state
            this.deepMerge(this.state, updates);
            await this.saveState();
            
            // Fire update event
            window.dispatchEvent(new CustomEvent('solarflow-state-updated', { 
                detail: { updates, newState: this.getState() }
            }));
        }
        
        deepMerge(target, source) {
            for (const key in source) {
                if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                    if (!target[key]) target[key] = {};
                    this.deepMerge(target[key], source[key]);
                } else {
                    target[key] = source[key];
                }
            }
        }
        
        // Subsystem getters
        getMinions() { return this.state.minions || []; }
        getActivities() { return this.state.activities || []; }
        getAutonomousState() { return this.state.autonomous || {}; }
        getMinionChatState() { return this.state.minionChat || {}; }
        getDominionCityState() { return this.state.dominionCity || {}; }
        getConsciousnessState() { return this.state.consciousness || {}; }
        getRealm3DState() { return this.state.realm3D || {}; }
        
        // Activity management
        async addActivity(activity) {
            if (!this.state.activities) this.state.activities = [];
            
            const newActivity = {
                id: 'activity-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
                timestamp: Date.now(),
                page: this.pageName,
                ...activity
            };
            
            this.state.activities.unshift(newActivity);
            
            // Keep only last 200 activities
            if (this.state.activities.length > 200) {
                this.state.activities = this.state.activities.slice(0, 200);
            }
            
            await this.saveState();
            
            console.log('📝 Activity added from', this.pageName, ':', activity.message || activity.type);
        }
        
        // Page-specific state management
        getPageState(pageName = this.pageName) {
            if (!this.state.pageStates) this.state.pageStates = {};
            if (!this.state.pageStates[pageName]) this.state.pageStates[pageName] = {};
            return this.state.pageStates[pageName];
        }
        
        async setPageState(pageState, pageName = this.pageName) {
            if (!this.state.pageStates) this.state.pageStates = {};
            this.state.pageStates[pageName] = pageState;
            await this.saveState();
        }
        
        // Cross-page communication
        async sendMessage(targetPage, message) {
            const msg = {
                id: 'msg-' + Date.now(),
                timestamp: Date.now(),
                from: this.pageName,
                to: targetPage,
                message: message,
                read: false
            };
            
            if (!this.state.crossPageMessages) this.state.crossPageMessages = [];
            this.state.crossPageMessages.unshift(msg);
            
            // Keep only last 50 cross-page messages
            if (this.state.crossPageMessages.length > 50) {
                this.state.crossPageMessages = this.state.crossPageMessages.slice(0, 50);
            }
            
            await this.saveState();
        }
        
        getMessagesFor(targetPage = this.pageName) {
            if (!this.state.crossPageMessages) return [];
            return this.state.crossPageMessages.filter(msg => msg.to === targetPage && !msg.read);
        }
        
        async markMessageRead(messageId) {
            if (!this.state.crossPageMessages) return;
            const msg = this.state.crossPageMessages.find(m => m.id === messageId);
            if (msg) {
                msg.read = true;
                await this.saveState();
            }
        }
    }

    // Initialize bootloader when DOM loads or immediately if DOM is ready
    let SOLARFLOW_BOOTLOADER = null;
    
    function initBootloader() {
        if (SOLARFLOW_BOOTLOADER) return; // Already initialized
        
        SOLARFLOW_BOOTLOADER = new SolarFlowUniversalBootloader();
        
        // Make bootloader globally accessible
        window.SolarFlow = {
            bootloader: SOLARFLOW_BOOTLOADER,
            getState: () => SOLARFLOW_BOOTLOADER.getState(),
            saveState: (updates) => SOLARFLOW_BOOTLOADER.updateState(updates),
            addActivity: (activity) => SOLARFLOW_BOOTLOADER.addActivity(activity),
            
            // Subsystem accessors
            getMinions: () => SOLARFLOW_BOOTLOADER.getMinions(),
            getActivities: () => SOLARFLOW_BOOTLOADER.getActivities(),
            getAutonomous: () => SOLARFLOW_BOOTLOADER.getAutonomousState(),
            getMinionChat: () => SOLARFLOW_BOOTLOADER.getMinionChatState(),
            getDominionCity: () => SOLARFLOW_BOOTLOADER.getDominionCityState(),
            getConsciousness: () => SOLARFLOW_BOOTLOADER.getConsciousnessState(),
            getRealm3D: () => SOLARFLOW_BOOTLOADER.getRealm3DState(),
            
            // Page-specific state
            getPageState: (page) => SOLARFLOW_BOOTLOADER.getPageState(page),
            setPageState: (state, page) => SOLARFLOW_BOOTLOADER.setPageState(state, page),
            
            // Cross-page communication
            sendMessage: (target, message) => SOLARFLOW_BOOTLOADER.sendMessage(target, message),
            getMessages: (target) => SOLARFLOW_BOOTLOADER.getMessagesFor(target),
            markRead: (messageId) => SOLARFLOW_BOOTLOADER.markMessageRead(messageId)
        };
        
        console.log('🌐 SolarFlow global API available');
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initBootloader);
    } else {
        initBootloader();
    }

    // For debugging
    console.log('📦 SolarFlow Universal Bootloader loaded');
}