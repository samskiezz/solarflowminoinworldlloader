/**
 * MINION COGNITION ENGINE - EMBEDDED LLM SYSTEM
 * OpenAI-compatible API with provider swapping support
 * 
 * Provides minion-to-minion communication, task reasoning,
 * threat analysis, solar insights, and knowledge synthesis
 */

class MinionCognitionEngine {
    constructor() {
        this.provider = 'openai'; // Default provider
        this.apiKey = null;
        this.baseURL = 'https://api.openai.com/v1';
        this.model = 'gpt-4-turbo-preview';
        this.enabled = false;
        this.rateLimitMs = 2000; // 2 second minimum between requests
        this.lastRequestTime = 0;
        this.requestQueue = [];
        this.isProcessingQueue = false;
        
        this.minionPersonalities = new Map();
        this.conversationHistory = new Map();
        this.reasoningStates = new Map();
        
        this.setupMinionPersonalities();
    }
    
    async init() {
        console.log('🧠 Initializing Minion Cognition Engine...');
        
        // Check for API key in localStorage or environment
        this.loadConfiguration();
        
        // Initialize minion memory states
        await this.initializeMinionMemories();
        
        console.log(`🤖 LLM Engine ready (${this.enabled ? 'ENABLED' : 'DISABLED'})`);
    }
    
    loadConfiguration() {
        // Try to load from localStorage
        const storedConfig = localStorage.getItem('solarflow_llm_config');
        if (storedConfig) {
            const config = JSON.parse(storedConfig);
            this.provider = config.provider || 'openai';
            this.apiKey = config.apiKey;
            this.baseURL = config.baseURL || 'https://api.openai.com/v1';
            this.model = config.model || 'gpt-4-turbo-preview';
            this.enabled = !!config.apiKey;
        }
        
        // Show configuration UI if not configured
        if (!this.enabled) {
            this.showConfigurationPrompt();
        }
    }
    
    showConfigurationPrompt() {
        const configDiv = document.createElement('div');
        configDiv.className = 'llm-config-prompt';
        configDiv.innerHTML = `
            <div class="llm-config-modal">
                <h3>🤖 Configure AI Assistant</h3>
                <p>Enable minion AI communication by providing an API key:</p>
                <div class="config-form">
                    <label>Provider:</label>
                    <select id="llm-provider">
                        <option value="openai">OpenAI</option>
                        <option value="claude">Anthropic Claude</option>
                        <option value="local">Local Model</option>
                    </select>
                    
                    <label>API Key:</label>
                    <input type="password" id="llm-api-key" placeholder="sk-..." />
                    
                    <label>Model:</label>
                    <input type="text" id="llm-model" value="gpt-4-turbo-preview" />
                    
                    <div class="config-buttons">
                        <button onclick="llmEngine.saveConfiguration()">💾 Save & Enable</button>
                        <button onclick="llmEngine.skipConfiguration()">⏭️ Skip (Offline Mode)</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(configDiv);
    }
    
    saveConfiguration() {
        const provider = document.getElementById('llm-provider').value;
        const apiKey = document.getElementById('llm-api-key').value;
        const model = document.getElementById('llm-model').value;
        
        if (apiKey) {
            const config = { provider, apiKey, model };
            if (provider === 'claude') {
                config.baseURL = 'https://api.anthropic.com/v1';
                config.model = 'claude-3-sonnet-20240229';
            } else if (provider === 'local') {
                config.baseURL = 'http://localhost:1234/v1';
            }
            
            localStorage.setItem('solarflow_llm_config', JSON.stringify(config));
            this.loadConfiguration();
            
            // Remove config prompt
            document.querySelector('.llm-config-prompt')?.remove();
            
            console.log('✅ LLM configuration saved and enabled');
        }
    }
    
    skipConfiguration() {
        document.querySelector('.llm-config-prompt')?.remove();
        console.log('⚠️ LLM running in offline mode');
    }
    
    setupMinionPersonalities() {
        this.minionPersonalities.set('ATLAS', {
            role: 'System Orchestrator',
            personality: 'methodical, focused, leadership-oriented',
            expertise: ['orchestration', 'governance', 'world-state'],
            communicationStyle: 'direct and authoritative'
        });
        
        this.minionPersonalities.set('LUMEN', {
            role: 'Data Fetcher',
            personality: 'quick, energetic, information-hungry',
            expertise: ['data-mining', 'research', 'discovery'],
            communicationStyle: 'enthusiastic and detailed'
        });
        
        this.minionPersonalities.set('ORBIT', {
            role: 'Validator',
            personality: 'careful, analytical, precision-focused',
            expertise: ['validation', 'quality-assurance', 'verification'],
            communicationStyle: 'cautious and thorough'
        });
        
        this.minionPersonalities.set('PRISM', {
            role: 'Progress Tracker',
            personality: 'organized, steady, reliability-focused',
            expertise: ['progress-tracking', 'metrics', 'reporting'],
            communicationStyle: 'systematic and clear'
        });
        
        this.minionPersonalities.set('NOVA', {
            role: 'Innovation Catalyst',
            personality: 'creative, inspired, forward-thinking',
            expertise: ['innovation', 'ideation', 'creative-solutions'],
            communicationStyle: 'imaginative and inspiring'
        });
        
        this.minionPersonalities.set('BOLT', {
            role: 'Speed Optimizer',
            personality: 'fast, active, efficiency-focused',
            expertise: ['optimization', 'performance', 'automation'],
            communicationStyle: 'rapid and action-oriented'
        });
    }
    
    async initializeMinionMemories() {
        if (window.coreSystem?.dataStore) {
            const minions = await window.coreSystem.dataStore.getAll('minions');
            
            for (const minion of minions) {
                this.reasoningStates.set(minion.id, {
                    currentTask: null,
                    lastThought: null,
                    context: {},
                    conversationHistory: [],
                    memoryFragments: []
                });
                
                this.conversationHistory.set(minion.id, []);
            }
        }
    }
    
    async processRequest(request) {
        if (!this.enabled) {
            return this.generateOfflineFallback(request);
        }
        
        // Add to queue with rate limiting
        return new Promise((resolve) => {
            this.requestQueue.push({ request, resolve });
            this.processQueue();
        });
    }
    
    async processQueue() {
        if (this.isProcessingQueue || this.requestQueue.length === 0) {
            return;
        }
        
        this.isProcessingQueue = true;
        
        while (this.requestQueue.length > 0) {
            const now = Date.now();
            if (now - this.lastRequestTime < this.rateLimitMs) {
                await this.sleep(this.rateLimitMs - (now - this.lastRequestTime));
            }
            
            const { request, resolve } = this.requestQueue.shift();
            try {
                const response = await this.makeAPICall(request);
                resolve(response);
            } catch (error) {
                console.error('LLM API error:', error);
                resolve(this.generateOfflineFallback(request));
            }
            
            this.lastRequestTime = Date.now();
        }
        
        this.isProcessingQueue = false;
    }
    
    async makeAPICall(request) {
        const headers = {
            'Content-Type': 'application/json'
        };
        
        if (this.provider === 'openai') {
            headers['Authorization'] = `Bearer ${this.apiKey}`;
        } else if (this.provider === 'claude') {
            headers['x-api-key'] = this.apiKey;
            headers['anthropic-version'] = '2023-06-01';
        }
        
        const payload = {
            model: this.model,
            messages: request.messages,
            max_tokens: request.maxTokens || 500,
            temperature: request.temperature || 0.7
        };
        
        const response = await fetch(`${this.baseURL}/chat/completions`, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            throw new Error(`API error: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        return data.choices[0]?.message?.content || 'No response generated';
    }
    
    generateOfflineFallback(request) {
        // Generate contextual responses without API calls
        const context = request.context || {};
        const minionId = request.minionId;
        const personality = this.minionPersonalities.get(minionId);
        
        const fallbackResponses = {
            'ATLAS': 'System analysis in progress. Orchestrating next phase of operations.',
            'LUMEN': 'Data scan complete! Found interesting patterns in the solar metrics.',
            'ORBIT': 'Validation protocols running. Checking system integrity...',
            'PRISM': 'Progress tracking nominal. Current metrics within expected ranges.',
            'NOVA': 'New optimization possibilities detected! Innovation mode activated.',
            'BOLT': 'Speed optimization engaged. Performance improvements implemented.'
        };
        
        return {
            content: fallbackResponses[minionId] || 'Processing request in offline mode...',
            confidence: 0.3,
            reasoning: 'Generated offline fallback response',
            minionPersonality: personality
        };
    }
    
    async generateMinionResponse(minionId, input, context = {}) {
        const personality = this.minionPersonalities.get(minionId);
        const currentState = this.reasoningStates.get(minionId) || {};
        
        const systemPrompt = `You are ${minionId}, a minion in the SolarFlow system. 
        Your role: ${personality?.role}
        Your personality: ${personality?.personality}
        Your expertise: ${personality?.expertise?.join(', ')}
        Your communication style: ${personality?.communicationStyle}
        
        You work collaboratively with other minions in a solar energy management system.
        Current context: ${JSON.stringify(context)}
        
        Respond as ${minionId} would, staying in character. Be helpful, collaborative, and focused on the solar energy domain.`;
        
        const request = {
            minionId,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: input }
            ],
            context,
            maxTokens: 300,
            temperature: 0.8
        };
        
        const response = await this.processRequest(request);
        
        // Store the conversation
        await this.storeConversation(minionId, input, response.content || response);
        
        return response;
    }
    
    async storeConversation(minionId, input, response) {
        if (window.coreSystem?.dataStore) {
            await window.coreSystem.dataStore.create('messages', {
                from: 'user',
                to: minionId,
                message: input,
                response: response,
                timestamp: Date.now()
            });
            
            await window.coreSystem.dataStore.create('aiMemory', {
                minionId,
                type: 'conversation',
                input,
                response,
                timestamp: Date.now()
            });
        }
    }
    
    async analyzeTask(taskData) {
        if (!taskData.owner) return null;
        
        const context = {
            task: taskData,
            currentTime: new Date().toISOString(),
            systemState: 'operational'
        };
        
        const analysis = await this.generateMinionResponse(
            taskData.owner,
            `Analyze this task and provide insights: ${JSON.stringify(taskData)}`,
            context
        );
        
        return analysis;
    }
    
    async generateThreatAnalysis(threatData) {
        const response = await this.generateMinionResponse(
            'ATLAS', // Use ATLAS for threat analysis as the system orchestrator
            `Analyze this potential threat and suggest mitigation strategies: ${JSON.stringify(threatData)}`,
            { threatLevel: threatData.severity || 'unknown' }
        );
        
        return response;
    }
    
    async generateSolarInsights(solarMetrics) {
        const response = await this.generateMinionResponse(
            'NOVA', // Use NOVA for innovative insights
            `Analyze these solar performance metrics and provide actionable insights: ${JSON.stringify(solarMetrics)}`,
            { domain: 'solar_energy', analysisType: 'performance' }
        );
        
        return response;
    }
    
    async facilitateMinionCommunication(fromMinionId, toMinionId, message) {
        const contextMessage = `${fromMinionId} says: "${message}". Respond as ${toMinionId}.`;
        
        const response = await this.generateMinionResponse(toMinionId, contextMessage, {
            conversationType: 'minion_to_minion',
            fromMinion: fromMinionId
        });
        
        // Store the minion-to-minion conversation
        if (window.coreSystem?.dataStore) {
            await window.coreSystem.dataStore.create('messages', {
                from: fromMinionId,
                to: toMinionId,
                message: message,
                response: response.content || response,
                type: 'minion_communication',
                timestamp: Date.now()
            });
        }
        
        return response;
    }
    
    // System-level LLM assistant
    async systemQuery(query, systemState = {}) {
        const systemPrompt = `You are a system-level AI assistant for SolarFlow, a solar energy minion management system.
        You have READ-ONLY access to system data and can explain what the system is doing.
        Current system state: ${JSON.stringify(systemState)}
        
        Answer questions about system operations, data flow, minion activities, and solar energy management.
        Never hallucinate system state - only use the provided data.`;
        
        const request = {
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: query }
            ],
            context: systemState,
            maxTokens: 400,
            temperature: 0.3
        };
        
        return await this.processRequest(request);
    }
    
    // Utility methods
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    isReady() {
        return this.enabled || true; // Always ready due to offline fallback
    }
    
    getStatus() {
        return {
            enabled: this.enabled,
            provider: this.provider,
            model: this.model,
            queueLength: this.requestQueue.length,
            rateLimitMs: this.rateLimitMs,
            minionPersonalities: Array.from(this.minionPersonalities.keys())
        };
    }
    
    // Configuration methods for UI
    updateConfiguration(newConfig) {
        Object.assign(this, newConfig);
        localStorage.setItem('solarflow_llm_config', JSON.stringify({
            provider: this.provider,
            apiKey: this.apiKey,
            baseURL: this.baseURL,
            model: this.model
        }));
        this.enabled = !!this.apiKey;
    }
    
    toggleEnabled() {
        if (!this.apiKey) {
            this.showConfigurationPrompt();
        } else {
            this.enabled = !this.enabled;
        }
        return this.enabled;
    }
}

// Global LLM engine
window.addEventListener('DOMContentLoaded', () => {
    window.llmEngine = new MinionCognitionEngine();
    
    // Integrate with core system
    if (window.coreSystem) {
        window.coreSystem.llmEngine = window.llmEngine;
    }
});