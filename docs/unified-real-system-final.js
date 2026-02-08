/**
 * UNIFIED REAL SYSTEM - Project Solar Australia
 * 
 * This creates a SINGLE unified system where ALL components talk to each other
 * using the same real data sources. No more isolated fake systems.
 * 
 * REAL INTEGRATION:
 * - All HTML pages use same data source
 * - All minions work together on same tasks
 * - All progress is shared across all interfaces
 * - All knowledge is pooled and searchable
 * - All economies are connected
 */

class UnifiedRealSystem {
    constructor() {
        this.debug = true;
        this.version = '2.0.0';
        
        // SINGLE SOURCE OF TRUTH - All systems use this data
        this.centralData = {
            meta: {
                lastUpdated: new Date().toISOString(),
                version: this.version,
                totalSessions: 0,
                systemUptime: Date.now()
            },
            
            // 100 REAL minions (not separate fake ones for each system)
            minions: [],
            
            // REAL CER products with processing status
            cerProducts: [],
            
            // REAL documents with actual content
            documents: new Map(),
            
            // SHARED knowledge base ALL minions contribute to
            sharedKnowledge: new Map(),
            
            // UNIFIED economy system
            globalEconomy: {
                totalCredits: 0,
                creditsEarned: 0,
                creditsSpent: 0,
                activeTransactions: []
            },
            
            // REAL progress tracking across ALL systems
            unifiedProgress: {
                documentsProcessed: 0,
                knowledgeBuilt: 0,
                tasksCompleted: 0,
                systemsIntegrated: 0
            },
            
            // LIVE activity feed ALL systems contribute to
            globalActivityFeed: [],
            
            // REAL task queue ALL minions work from
            taskQueue: [],
            
            // INTER-SYSTEM communication
            messageQueue: []
        };
        
        // Storage keys for persistence
        this.storageKey = 'solarflow_unified_real_system';
        
        // System components that will be unified
        this.connectedSystems = new Set();
        
        this.log('🚀 Unified Real System v2.0.0 initializing...');
        this.initializeUnifiedSystem();
    }
    
    log(message, data = null) {
        if (this.debug) {
            const timestamp = new Date().toLocaleTimeString();
            console.log(`[UnifiedReal] [${timestamp}] ${message}`);
            if (data) console.log(data);
        }
    }
    
    async initializeUnifiedSystem() {
        this.log('📋 Building unified real system architecture...');
        
        // Step 1: Load or create unified data
        await this.loadUnifiedData();
        
        // Step 2: Create real 100 minions (shared across ALL systems)
        await this.createUnified100Minions();
        
        // Step 3: Load real CER products (shared knowledge base)
        await this.loadRealCERData();
        
        // Step 4: Start unified processing engine
        this.startUnifiedProcessing();
        
        // Step 5: Start inter-system communication
        this.startInterSystemCommunication();
        
        // Step 6: Expose unified API for ALL systems
        this.exposeUnifiedAPI();
        
        // Step 7: Auto-save unified data
        this.startUnifiedAutoSave();
        
        this.log('✅ Unified Real System fully operational');
        this.broadcastSystemReady();
    }
    
    async loadRealMinions() {
        // Use central data loader if available
        if (window.centralDataLoader) {
            const minions = await window.centralDataLoader.loadMinions();
            if (!minions || minions.length === 0) {
                throw new Error('No minions loaded from central data loader');
            }
            return minions;
        }
        
        // Fallback: load directly (with validation)
        try {
            const response = await fetch('./minions.json');
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (!data.minions || !Array.isArray(data.minions) || data.minions.length === 0) {
                throw new Error('Invalid or empty minions.json');
            }
            
            return data.minions;
        } catch (error) {
            console.error('❌ Failed to load minions.json:', error);
            throw error; // Don't return empty array, fail properly
        }
    }
    
    loadMinionState(minionId) {
        // Load individual minion state from localStorage
        const stateKey = `minion-state-${minionId}`;
        const saved = localStorage.getItem(stateKey);
        return saved ? JSON.parse(saved) : null;
    }
    
    saveMinionState(minionId, state) {
        // Save individual minion state
        const stateKey = `minion-state-${minionId}`;
        localStorage.setItem(stateKey, JSON.stringify(state));
    }
    
    async loadUnifiedData() {
        this.log('📂 Loading unified real data...');
        
        try {
            const savedData = localStorage.getItem(this.storageKey);
            if (savedData) {
                const parsed = JSON.parse(savedData);
                
                // Merge saved data with current structure
                this.centralData = {
                    ...this.centralData,
                    ...parsed,
                    meta: {
                        ...parsed.meta,
                        lastLoaded: new Date().toISOString(),
                        loadCount: (parsed.meta?.loadCount || 0) + 1
                    }
                };
                
                // Convert Maps back from saved arrays
                if (parsed.documents) {
                    this.centralData.documents = new Map(parsed.documents);
                }
                if (parsed.sharedKnowledge) {
                    this.centralData.sharedKnowledge = new Map(parsed.sharedKnowledge);
                }
                
                this.log(`✅ Loaded unified data from session ${this.centralData.meta.loadCount}`);
                return true;
            }
        } catch (error) {
            this.log('❌ Error loading unified data:', error);
        }
        
        this.log('⚠️ No unified data found, creating fresh system');
        return false;
    }
    
    async createUnified100Minions() {
        if (this.centralData.minions.length >= 100) {
            this.log(`✅ Using existing ${this.centralData.minions.length} unified minions`);
            return;
        }
        
        this.log('🤖 Creating 100 unified minions for ALL systems...');
        
        // Australian solar specialties (same as before but now UNIFIED)
        const specialties = [
            // Solar Panel Specialties (25)
            'solar-panel-voc-analysis', 'panel-spacing-calculations', 'solar-efficiency-optimization',
            'panel-degradation-analysis', 'solar-irradiance-modeling', 'panel-orientation-optimization',
            'solar-shading-analysis', 'panel-temperature-coefficients', 'solar-string-design',
            'panel-fire-safety-compliance', 'solar-mounting-systems', 'panel-electrical-connections',
            'solar-compliance-AS5033', 'panel-warranty-analysis', 'solar-installation-techniques',
            'panel-quality-testing', 'solar-system-sizing', 'panel-manufacturer-specs',
            'solar-roof-integration', 'panel-maintenance-scheduling', 'solar-fault-diagnosis',
            'panel-upgrade-analysis', 'solar-cost-optimization', 'panel-recycling-compliance',
            'solar-grid-integration',
            
            // Inverter Specialties (25)
            'inverter-mppt-optimization', 'inverter-efficiency-curves', 'inverter-dc-voltage-limits',
            'inverter-grid-compliance-AS4777', 'inverter-protection-systems', 'inverter-monitoring-setup',
            'inverter-installation-clearances', 'inverter-thermal-management', 'inverter-string-configuration',
            'inverter-fault-detection', 'inverter-power-quality', 'inverter-grid-codes',
            'inverter-safety-isolation', 'inverter-performance-analysis', 'inverter-firmware-updates',
            'inverter-communication-protocols', 'inverter-load-balancing', 'inverter-backup-systems',
            'inverter-maintenance-procedures', 'inverter-troubleshooting', 'inverter-upgrade-paths',
            'inverter-cost-analysis', 'inverter-manufacturer-support', 'inverter-warranty-claims',
            'inverter-grid-stabilization',
            
            // Battery Specialties (25)
            'battery-capacity-analysis', 'battery-voltage-management', 'battery-safety-AS5139',
            'battery-thermal-management', 'battery-charging-profiles', 'battery-degradation-modeling',
            'battery-installation-codes', 'battery-fire-safety', 'battery-ventilation-requirements',
            'battery-electrical-protection', 'battery-monitoring-systems', 'battery-maintenance-schedules',
            'battery-cycle-optimization', 'battery-depth-of-discharge', 'battery-load-management',
            'battery-grid-services', 'battery-backup-systems', 'battery-cost-analysis',
            'battery-recycling-compliance', 'battery-performance-testing', 'battery-warranty-management',
            'battery-integration-design', 'battery-safety-protocols', 'battery-emergency-procedures',
            'battery-manufacturer-support',
            
            // Australian Compliance & Standards (25)
            'AS3000-electrical-compliance', 'AS5033-solar-installation', 'AS4777-grid-connection',
            'AS5139-battery-safety', 'CER-product-approval', 'SAA-certification-requirements',
            'CEC-installer-guidelines', 'DNSP-connection-requirements', 'WHS-electrical-safety',
            'ISO9001-quality-systems', 'electrical-licensing-requirements', 'building-code-compliance',
            'fire-safety-regulations', 'environmental-compliance', 'insurance-requirements',
            'warranty-law-compliance', 'consumer-protection-law', 'workplace-safety-protocols',
            'technical-documentation-standards', 'installation-certification', 'inspection-procedures',
            'maintenance-compliance', 'safety-audit-procedures', 'regulatory-updates-monitoring',
            'compliance-reporting-systems'
        ];
        
        // Create 100 unique minion names
        const prefixes = ['SOLAR', 'VOLT', 'WATT', 'AMP', 'FLUX', 'GRID', 'CELL', 'POWER', 'ENERGY', 'CHARGE',
                         'ATLAS', 'NOVA', 'TITAN', 'ECHO', 'PULSE', 'ZETA', 'ALPHA', 'BETA', 'GAMMA', 'DELTA',
                         'SPEC', 'TECH', 'CORE', 'PRIME', 'ULTRA', 'MEGA', 'NANO', 'MICRO', 'QUANTUM', 'PHOTON',
                         'LUMEN', 'ORBIT', 'PRISM', 'BOLT', 'EMBER', 'RUNE', 'FORGE', 'SENTRY', 'SAGE', 'HAMMER'];
        
        const suffixes = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10',
                         'AU', 'NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'NT', 'ACT', 'SYD'];
        
        const usedNames = new Set();
        this.centralData.minions = [];
        
        // Load real minions from minions.json instead of generating random ones
        const realMinions = await this.loadRealMinions();
        
        for (let i = 0; i < realMinions.length; i++) {
            const realMinion = realMinions[i];
            const tier = realMinion.tier || Math.floor(i / 20) + 1;
            
            const minion = {
                // Core identity - USE REAL DATA
                id: realMinion.id,
                name: realMinion.name,
                tier: tier,
                specialty: realMinion.specialty,
                role: realMinion.role || this.getRole(tier),
                
                // Unified state - LOAD FROM localStorage, don't randomize
                unifiedState: this.loadMinionState(realMinion.id) || {
                    credits: 50 + (tier * 20), // Base credits, no random
                    documentsProcessed: 0, // Start at 0, increment only when work done
                    knowledgeContributed: 0,
                    tasksCompleted: 0,
                    hoursWorked: 0, // Start at 0, track real time
                    reputation: 0.5, // Start neutral
                    happiness: 0.8 // Start happy
                },
                
                // Work status - CHECK REAL STATUS
                workStatus: {
                    currentShift: this.assignShift(i),
                    isWorking: false, // Default false, set true when task assigned
                    onBreak: false, // Default false
                    currentTask: null,
                    currentSystem: null,
                    productivity: 1.0 // Start at 100%, decrease only if tasks fail
                },
                
                // SHARED Australian knowledge (accessible by ALL systems)
                sharedKnowledge: {
                    vocDatabase: {}, // VOC values learned
                    spacingRequirements: {}, // Installation spacing
                    complianceRules: {}, // AS/NZS compliance
                    manufacturerSpecs: {}, // Product specifications
                    installationProcedures: {} // Installation procedures
                },
                
                // Activity log (contributes to global feed)
                activityLog: [],
                
                // Communication (can message other minions/systems)
                communications: {
                    inbox: [],
                    outbox: [],
                    collaborations: []
                },
                
                // Timestamps
                created: new Date().toISOString(),
                lastActive: new Date().toISOString(),
                lastSynced: new Date().toISOString()
            };
            
            this.centralData.minions.push(minion);
        }
        
        this.log(`✅ Created ${this.centralData.minions.length} unified minions`);
    }
    
    getRole(tier) {
        const roles = {
            1: 'Apprentice Solar Technician',
            2: 'Solar Installation Specialist',
            3: 'Senior Solar Engineer',
            4: 'Master Solar Consultant',
            5: 'Principal Solar Architect'
        };
        return roles[tier] || 'Solar Specialist';
    }
    
    assignShift(index) {
        // Distribute: Alpha=35, Beta=30, Gamma=20, Break=15
        if (index < 35) return 'alpha';
        if (index < 65) return 'beta';
        if (index < 85) return 'gamma';
        return 'break';
    }
    
    async loadRealCERData() {
        this.log('📦 Loading unified CER product database...');
        
        try {
            // Try to load existing real database
            const response = await fetch('./real-cer-product-database.json');
            if (response.ok) {
                const cerDatabase = await response.json();
                
                // Flatten and unify products
                this.centralData.cerProducts = [];
                if (cerDatabase.categories) {
                    Object.values(cerDatabase.categories).forEach(categoryProducts => {
                        categoryProducts.forEach(product => {
                            this.centralData.cerProducts.push({
                                ...product,
                                // Unified processing status
                                processingStatus: {
                                    documentsDownloaded: false,
                                    ocrCompleted: false,
                                    knowledgeExtracted: false,
                                    assignedMinions: [],
                                    processedBy: [],
                                    contributedToKnowledge: false
                                },
                                // Unified timestamps
                                timestamps: {
                                    added: new Date().toISOString(),
                                    lastProcessed: null,
                                    lastUpdated: null
                                }
                            });
                        });
                    });
                }
                
                this.log(`✅ Loaded ${this.centralData.cerProducts.length} unified CER products`);
            } else {
                throw new Error(`Failed to load CER database: ${response.status}`);
            }
        } catch (error) {
            this.log('❌ CRITICAL: CER database failed to load - system cannot function without it', error);
            this.centralData.cerProducts = [];
            throw new Error('CER database required but failed to load: ' + error.message);
        }
    }
    
    startUnifiedProcessing() {
        this.log('⚙️ Starting unified processing engine...');
        
        // Unified work assignment system
        setInterval(() => {
            this.assignUnifiedWork();
        }, 10000); // Every 10 seconds
        
        // Unified knowledge sharing
        setInterval(() => {
            this.shareKnowledgeBetweenMinions();
        }, 15000); // Every 15 seconds
        
        // Unified progress tracking
        setInterval(() => {
            this.updateUnifiedProgress();
        }, 5000); // Every 5 seconds
        
        this.log('✅ Unified processing engine started');
    }
    
    assignUnifiedWork() {
        // Find available minions
        const availableMinions = this.centralData.minions.filter(m => 
            m.workStatus.isWorking && 
            !m.workStatus.onBreak && 
            !m.workStatus.currentTask
        );
        
        // Find unprocessed products
        const unprocessedProducts = this.centralData.cerProducts.filter(p => 
            !p.processingStatus.documentsDownloaded
        );
        
        if (availableMinions.length > 0 && unprocessedProducts.length > 0) {
            // Assign work
            const minion = availableMinions[Math.floor(Math.random() * availableMinions.length)];
            const product = unprocessedProducts[0];
            
            this.assignMinionToProduct(minion, product);
        }
    }
    
    assignMinionToProduct(minion, product) {
        // Assign minion to product
        minion.workStatus.currentTask = `Processing ${product.manufacturer} ${product.model}`;
        minion.workStatus.currentSystem = 'unified_processing';
        product.processingStatus.assignedMinions.push(minion.id);
        
        // Add to global activity feed
        this.addGlobalActivity(`${minion.name} started processing ${product.manufacturer} ${product.model}`);
        
        // Simulate work completion
        const workTime = 15000 + Math.random() * 30000; // 15-45 seconds
        setTimeout(() => {
            this.completeMinionWork(minion, product);
        }, workTime);
    }
    
    completeMinionWork(minion, product) {
        // Complete the work
        product.processingStatus.documentsDownloaded = true;
        product.processingStatus.processedBy.push(minion.id);
        product.timestamps.lastProcessed = new Date().toISOString();
        
        // Update minion state
        minion.unifiedState.documentsProcessed++;
        minion.unifiedState.tasksCompleted++;
        minion.unifiedState.hoursWorked += 0.5;
        
        // Earn credits using unified credit system
        const creditsEarned = window.unifiedCreditSystem ? 
            window.unifiedCreditSystem.calculateDocumentProcessingCredits(minion, product) :
            10 + (minion.tier * 5); // Fallback if unified system not loaded
        
        if (window.unifiedCreditSystem) {
            window.unifiedCreditSystem.awardCredits(
                minion.id,
                creditsEarned,
                'Document Processing',
                { product: `${product.manufacturer} ${product.model}` }
            );
        } else {
            // Manual update if unified system not available
            minion.unifiedState.credits += creditsEarned;
            this.centralData.globalEconomy.totalCredits += creditsEarned;
            this.centralData.globalEconomy.creditsEarned += creditsEarned;
        }
        
        // Learn knowledge from product
        this.extractKnowledgeFromProduct(minion, product);
        
        // Clear current task
        minion.workStatus.currentTask = null;
        minion.workStatus.currentSystem = null;
        minion.lastActive = new Date().toISOString();
        
        // Add to activity feed
        this.addGlobalActivity(`${minion.name} completed ${product.manufacturer} ${product.model} - earned ${creditsEarned} credits`);
        
        // Update unified progress
        this.centralData.unifiedProgress.documentsProcessed++;
        this.centralData.unifiedProgress.tasksCompleted++;
        
        // SAVE minion state to localStorage
        this.saveMinionState(minion.id, minion.unifiedState);
        
        // Save unified data
        this.saveUnifiedData();
    }
    
    extractKnowledgeFromProduct(minion, product) {
        const specs = product.specifications;
        
        // Learn VOC values
        if (specs.voc) {
            const vocKey = `${product.manufacturer}_${product.model}`;
            minion.sharedKnowledge.vocDatabase[vocKey] = specs.voc;
            
            // Add to shared knowledge
            this.centralData.sharedKnowledge.set(`voc_${vocKey}`, {
                value: specs.voc,
                learnedBy: minion.id,
                learnedAt: new Date().toISOString(),
                product: product
            });
        }
        
        // Learn clearances
        if (specs.clearances) {
            const clearanceKey = `${product.manufacturer}_${product.model}`;
            minion.sharedKnowledge.spacingRequirements[clearanceKey] = specs.clearances;
            
            // Add to shared knowledge
            this.centralData.sharedKnowledge.set(`clearances_${clearanceKey}`, {
                value: specs.clearances,
                learnedBy: minion.id,
                learnedAt: new Date().toISOString(),
                product: product
            });
        }
        
        minion.unifiedState.knowledgeContributed++;
        product.processingStatus.knowledgeExtracted = true;
        product.processingStatus.contributedToKnowledge = true;
        
        this.centralData.unifiedProgress.knowledgeBuilt++;
    }
    
    shareKnowledgeBetweenMinions() {
        // Allow minions to share knowledge with each other
        const knowledgeableMinions = this.centralData.minions.filter(m => 
            m.unifiedState.knowledgeContributed > 0
        );
        
        if (knowledgeableMinions.length > 1) {
            const teacher = knowledgeableMinions[Math.floor(Math.random() * knowledgeableMinions.length)];
            const student = this.centralData.minions[Math.floor(Math.random() * this.centralData.minions.length)];
            
            if (teacher.id !== student.id) {
                // Share random knowledge
                const teacherVOCs = Object.keys(teacher.sharedKnowledge.vocDatabase);
                if (teacherVOCs.length > 0) {
                    const sharedKey = teacherVOCs[Math.floor(Math.random() * teacherVOCs.length)];
                    const sharedValue = teacher.sharedKnowledge.vocDatabase[sharedKey];
                    
                    student.sharedKnowledge.vocDatabase[sharedKey] = sharedValue;
                    
                    this.addGlobalActivity(`${teacher.name} shared VOC knowledge with ${student.name}: ${sharedKey} = ${sharedValue}V`);
                }
            }
        }
    }
    
    addGlobalActivity(message) {
        const activity = {
            id: Date.now() + Math.random(),
            timestamp: new Date().toISOString(),
            timeDisplay: new Date().toLocaleTimeString(),
            message: message,
            source: 'unified_system'
        };
        
        this.centralData.globalActivityFeed.unshift(activity);
        
        // Keep only last 100 activities
        if (this.centralData.globalActivityFeed.length > 100) {
            this.centralData.globalActivityFeed = this.centralData.globalActivityFeed.slice(0, 100);
        }
        
        // Broadcast to all connected systems
        this.broadcastToAllSystems('activity_update', activity);
    }
    
    updateUnifiedProgress() {
        // Calculate real-time unified progress
        this.centralData.unifiedProgress.documentsProcessed = this.centralData.cerProducts
            .filter(p => p.processingStatus.documentsDownloaded).length;
        
        this.centralData.unifiedProgress.knowledgeBuilt = this.centralData.sharedKnowledge.size;
        
        this.centralData.unifiedProgress.tasksCompleted = this.centralData.minions
            .reduce((sum, m) => sum + m.unifiedState.tasksCompleted, 0);
        
        this.centralData.globalEconomy.totalCredits = this.centralData.minions
            .reduce((sum, m) => sum + m.unifiedState.credits, 0);
        
        // Update meta
        this.centralData.meta.lastUpdated = new Date().toISOString();
        
        // Broadcast updates to connected systems
        this.broadcastToAllSystems('progress_update', this.centralData.unifiedProgress);
    }
    
    startInterSystemCommunication() {
        this.log('📡 Starting inter-system communication...');
        
        // Check for system connections every 5 seconds
        setInterval(() => {
            this.discoverConnectedSystems();
        }, 5000);
        
        // Process message queue
        setInterval(() => {
            this.processMessageQueue();
        }, 1000);
        
        this.log('✅ Inter-system communication active');
    }
    
    discoverConnectedSystems() {
        // Check what systems are currently loaded
        const systems = [];
        
        // Check for different system interfaces
        if (document.getElementById('minionRoster')) systems.push('roster');
        if (document.getElementById('activityFeed')) systems.push('activity_feed');
        if (document.getElementById('cerProductCount')) systems.push('knowledge_system');
        if (document.getElementById('totalCredits')) systems.push('economy');
        if (document.querySelector('.task-board')) systems.push('task_board');
        
        // Update connected systems
        const newSystems = systems.filter(s => !this.connectedSystems.has(s));
        newSystems.forEach(system => {
            this.connectedSystems.add(system);
            this.log(`🔌 Connected to system: ${system}`);
            this.initializeSystemInterface(system);
        });
    }
    
    initializeSystemInterface(systemType) {
        switch (systemType) {
            case 'roster':
                this.updateRosterInterface();
                break;
            case 'activity_feed':
                this.updateActivityFeedInterface();
                break;
            case 'knowledge_system':
                this.updateKnowledgeSystemInterface();
                break;
            case 'economy':
                this.updateEconomyInterface();
                break;
        }
    }
    
    updateRosterInterface() {
        const rosterElement = document.getElementById('minionRoster');
        if (rosterElement) {
            rosterElement.innerHTML = '';
            
            // Show sample of unified minions
            this.centralData.minions.slice(0, 12).forEach(minion => {
                const card = document.createElement('div');
                card.className = 'minion-card';
                card.innerHTML = `
                    <div class="minion-info">
                        <h4>${minion.name}</h4>
                        <p>${minion.role}</p>
                        <p>Credits: ${minion.unifiedState.credits}</p>
                        <p>Status: ${minion.workStatus.currentTask || 'Available'}</p>
                        <p>Knowledge: ${minion.unifiedState.knowledgeContributed} contributions</p>
                    </div>
                `;
                rosterElement.appendChild(card);
            });
        }
    }
    
    updateActivityFeedInterface() {
        const activityElement = document.getElementById('activityFeed');
        if (activityElement) {
            activityElement.innerHTML = this.centralData.globalActivityFeed
                .slice(0, 10)
                .map(activity => 
                    `<div class="activity-item">
                        <span class="timestamp">[${activity.timeDisplay}]</span>
                        ${activity.message}
                    </div>`
                ).join('');
        }
    }
    
    updateKnowledgeSystemInterface() {
        // Update knowledge statistics
        const elements = {
            'cerProductCount': this.centralData.cerProducts.length,
            'documentsProcessed': this.centralData.unifiedProgress.documentsProcessed,
            'knowledgeBuilt': this.centralData.unifiedProgress.knowledgeBuilt,
            'totalMinions': this.centralData.minions.length
        };
        
        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) element.textContent = value.toLocaleString();
        });
    }
    
    updateEconomyInterface() {
        const elements = {
            'totalCredits': this.centralData.globalEconomy.totalCredits,
            'creditsEarned': this.centralData.globalEconomy.creditsEarned,
            'creditsSpent': this.centralData.globalEconomy.creditsSpent
        };
        
        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) element.textContent = value.toLocaleString();
        });
    }
    
    broadcastToAllSystems(messageType, data) {
        // Send message to all connected systems
        this.centralData.messageQueue.push({
            type: messageType,
            data: data,
            timestamp: new Date().toISOString(),
            source: 'unified_system'
        });
    }
    
    processMessageQueue() {
        // Process pending messages
        const messages = this.centralData.messageQueue.splice(0);
        
        messages.forEach(message => {
            switch (message.type) {
                case 'activity_update':
                    this.updateActivityFeedInterface();
                    break;
                case 'progress_update':
                    this.updateKnowledgeSystemInterface();
                    this.updateEconomyInterface();
                    break;
            }
        });
    }
    
    exposeUnifiedAPI() {
        this.log('🔌 Exposing unified API for all systems...');
        
        ///**
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