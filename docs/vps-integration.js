/**
 * VPS INTEGRATION FOR OPENCLAW HOSTINGER SERVER
 * Enables real-time data saving and growing knowledge persistence
 */

class OpenClawVPSIntegration {
    constructor() {
        this.isVPSDeployment = this.detectVPSEnvironment();
        this.persistenceEnabled = false;
        this.wsConnection = null;
        this.saveQueue = [];
        this.lastSaveTime = 0;
        this.saveInterval = 5000; // Save every 5 seconds
        
        console.log('🌐 OpenClaw VPS Integration initialized');
        console.log(`   Environment: ${this.isVPSDeployment ? 'VPS' : 'Local'}`);
        
        if (this.isVPSDeployment) {
            this.initializeVPSPersistence();
        }
    }
    
    detectVPSEnvironment() {
        const hostname = window.location.hostname;
        const isVPS = !['localhost', '127.0.0.1', ''].includes(hostname) && 
                     !hostname.includes('github.io');
        
        // Check for VPS-specific indicators
        const hasVPSIndicators = document.querySelector('meta[name="vps-deployment"]') ||
                               window.location.href.includes('.openclaw.') ||
                               window.location.href.includes('hostinger');
                               
        return isVPS || hasVPSIndicators;
    }
    
    async initializeVPSPersistence() {
        try {
            console.log('🔌 Connecting to VPS persistence layer...');
            
            // Initialize WebSocket connection for real-time sync
            await this.connectWebSocket();
            
            // Load existing data from VPS
            await this.loadVPSData();
            
            // Start auto-save system
            this.startAutoSave();
            
            this.persistenceEnabled = true;
            console.log('✅ VPS persistence layer active');
            
        } catch (error) {
            console.error('❌ VPS persistence initialization failed:', error);
            this.fallbackToLocalStorage();
        }
    }
    
    async connectWebSocket() {
        return new Promise((resolve, reject) => {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${protocol}//${window.location.host}/ws`;
            
            this.wsConnection = new WebSocket(wsUrl);
            
            this.wsConnection.onopen = () => {
                console.log('📡 VPS WebSocket connection established');
                resolve();
            };
            
            this.wsConnection.onmessage = (event) => {
                this.handleVPSUpdate(JSON.parse(event.data));
            };
            
            this.wsConnection.onclose = () => {
                console.log('🔌 VPS connection lost, attempting reconnect...');
                setTimeout(() => this.connectWebSocket(), 5000);
            };
            
            this.wsConnection.onerror = (error) => {
                console.error('❌ VPS WebSocket error:', error);
                reject(error);
            };
            
            // Timeout if connection takes too long
            setTimeout(() => {
                if (this.wsConnection.readyState !== WebSocket.OPEN) {
                    reject(new Error('WebSocket connection timeout'));
                }
            }, 10000);
        });
    }
    
    async loadVPSData() {
        try {
            const endpoints = [
                '/api/quantum/state',
                '/api/civilization/state',
                '/api/minions/state',
                '/api/knowledge/state'
            ];
            
            for (const endpoint of endpoints) {
                const response = await fetch(endpoint);
                const result = await response.json();
                
                if (result.success && result.state) {
                    const dataType = endpoint.split('/')[2];
                    this.applyVPSData(dataType, result.state);
                    console.log(`📊 Loaded ${dataType} data from VPS`);
                }
            }
            
        } catch (error) {
            console.error('Failed to load VPS data:', error);
        }
    }
    
    applyVPSData(type, data) {
        switch (type) {
            case 'quantum':
                if (window.quantumEngine) {
                    window.quantumEngine.loadFromVPSState(data);
                }
                break;
                
            case 'civilization':
                if (window.autonomousWorld) {
                    window.autonomousWorld.loadFromVPSState(data);
                }
                break;
                
            case 'minions':
                if (window.minionRoster) {
                    window.minionRoster.loadFromVPSState(data);
                }
                break;
                
            case 'knowledge':
                this.loadKnowledgeState(data);
                break;
        }
    }
    
    loadKnowledgeState(knowledge) {
        // Apply accumulated knowledge from VPS
        if (knowledge.documents) {
            this.mergeDocuments(knowledge.documents);
        }
        
        if (knowledge.compliance_data) {
            this.mergeComplianceData(knowledge.compliance_data);
        }
        
        if (knowledge.user_interactions) {
            this.mergeUserInteractions(knowledge.user_interactions);
        }
        
        console.log('🧠 Knowledge base synchronized with VPS');
    }
    
    async saveToVPS(type, data) {
        if (!this.persistenceEnabled) {
            this.saveQueue.push({ type, data, timestamp: Date.now() });
            return false;
        }
        
        try {
            const response = await fetch(`/api/${type}/state`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...data,
                    timestamp: Date.now(),
                    source: 'openclaw-frontend'
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                console.log(`💾 ${type} data saved to VPS`);
                return true;
            } else {
                console.error(`Failed to save ${type}:`, result.error);
                return false;
            }
            
        } catch (error) {
            console.error(`VPS save error for ${type}:`, error);
            return false;
        }
    }
    
    startAutoSave() {
        setInterval(() => {
            this.performAutoSave();
        }, this.saveInterval);
        
        // Save on page unload
        window.addEventListener('beforeunload', () => {
            this.performImmediateSave();
        });
        
        console.log(`🕐 Auto-save enabled (every ${this.saveInterval/1000}s)`);
    }
    
    async performAutoSave() {
        const currentTime = Date.now();
        
        // Throttle saves to avoid overwhelming the server
        if (currentTime - this.lastSaveTime < this.saveInterval) {
            return;
        }
        
        this.lastSaveTime = currentTime;
        
        // Save all active systems
        const savePromises = [];
        
        // Quantum consciousness state
        if (window.quantumEngine && window.quantumEngine.hasChanges()) {
            savePromises.push(
                this.saveToVPS('quantum', window.quantumEngine.exportState())
            );
        }
        
        // Autonomous civilization state
        if (window.autonomousWorld && window.autonomousWorld.hasChanges()) {
            savePromises.push(
                this.saveToVPS('civilization', window.autonomousWorld.exportState())
            );
        }
        
        // Minion roster state
        if (window.minionRoster && window.minionRoster.hasChanges()) {
            savePromises.push(
                this.saveToVPS('minions', window.minionRoster.exportState())
            );
        }
        
        // Growing knowledge base
        const knowledgeState = this.exportKnowledgeState();
        if (knowledgeState) {
            savePromises.push(
                this.saveToVPS('knowledge', knowledgeState)
            );
        }
        
        // Execute all saves
        const results = await Promise.allSettled(savePromises);
        const successCount = results.filter(r => r.status === 'fulfilled' && r.value).length;
        
        if (successCount > 0) {
            console.log(`📈 Auto-saved ${successCount} data systems to VPS`);
        }
    }
    
    exportKnowledgeState() {
        const knowledge = {
            documents: this.getProcessedDocuments(),
            compliance_data: this.getComplianceHistory(),
            user_interactions: this.getUserInteractionLog(),
            learning_patterns: this.getLearningPatterns(),
            timestamp: Date.now()
        };
        
        // Only save if there's meaningful data
        const hasData = Object.values(knowledge).some(value => 
            Array.isArray(value) ? value.length > 0 : 
            typeof value === 'object' ? Object.keys(value).length > 0 : 
            false
        );
        
        return hasData ? knowledge : null;
    }
    
    getProcessedDocuments() {
        // Extract processed documents from local storage and DOM state
        const processed = [];
        
        // Check for processed documents in various systems
        if (window.documentProcessor && window.documentProcessor.getProcessedList) {
            processed.push(...window.documentProcessor.getProcessedList());
        }
        
        // Check localStorage for document history
        const storedDocs = localStorage.getItem('processed_documents');
        if (storedDocs) {
            try {
                processed.push(...JSON.parse(storedDocs));
            } catch (e) {
                console.warn('Error parsing stored documents');
            }
        }
        
        return processed;
    }
    
    getComplianceHistory() {
        // Extract compliance check history
        const compliance = {
            checks_performed: [],
            standards_verified: [],
            compliance_scores: {}
        };
        
        // Collect from Project Solar Australia
        if (window.solarCompliance) {
            compliance.checks_performed = window.solarCompliance.getCheckHistory();
            compliance.standards_verified = window.solarCompliance.getStandardsHistory();
        }
        
        return compliance;
    }
    
    getUserInteractionLog() {
        // Track user interactions for learning
        const interactions = {
            button_clicks: this.getClickHistory(),
            page_visits: this.getPageHistory(),
            feature_usage: this.getFeatureUsage(),
            preferences: this.getUserPreferences()
        };
        
        return interactions;
    }
    
    getLearningPatterns() {
        // Extract patterns for AI improvement
        return {
            common_workflows: this.detectWorkflowPatterns(),
            error_patterns: this.getErrorPatterns(),
            optimization_opportunities: this.findOptimizations()
        };
    }
    
    handleVPSUpdate(message) {
        console.log('📡 Received VPS update:', message.type);
        
        switch (message.type) {
            case 'quantum_update':
                if (window.quantumEngine) {
                    window.quantumEngine.syncWithRemote(message.data);
                }
                break;
                
            case 'civilization_update':
                if (window.autonomousWorld) {
                    window.autonomousWorld.syncWithRemote(message.data);
                }
                break;
                
            case 'knowledge_update':
                this.syncKnowledge(message.data);
                break;
        }
    }
    
    fallbackToLocalStorage() {
        console.log('🔄 Falling back to localStorage persistence');
        this.persistenceEnabled = false;
        
        // Process any queued saves
        this.saveQueue.forEach(item => {
            localStorage.setItem(`vps_queue_${item.type}`, JSON.stringify(item.data));
        });
        
        this.saveQueue = [];
    }
    
    // Utility methods for tracking
    getClickHistory() { return JSON.parse(localStorage.getItem('click_history') || '[]'); }
    getPageHistory() { return JSON.parse(localStorage.getItem('page_history') || '[]'); }
    getFeatureUsage() { return JSON.parse(localStorage.getItem('feature_usage') || '{}'); }
    getUserPreferences() { return JSON.parse(localStorage.getItem('user_preferences') || '{}'); }
    getErrorPatterns() { return JSON.parse(localStorage.getItem('error_patterns') || '[]'); }
    
    detectWorkflowPatterns() {
        // Analyze user behavior to detect common workflows
        const patterns = [];
        // Implementation would analyze click/navigation patterns
        return patterns;
    }
    
    findOptimizations() {
        // Identify areas for system optimization
        const optimizations = [];
        // Implementation would analyze performance metrics
        return optimizations;
    }
}

// Initialize VPS integration
window.openClawVPS = new OpenClawVPSIntegration();

// Export for use by other systems
window.saveToVPS = (type, data) => window.openClawVPS.saveToVPS(type, data);
window.isVPSConnected = () => window.openClawVPS.persistenceEnabled;

console.log('🌐 OpenClaw VPS Integration loaded');