// ==========================================
// INTEGRATED LLM SYSTEM FOR ALL INTERFACES
// Complete LLM integration with data persistence and minion chat
// ==========================================

console.log('🤖 Loading integrated LLM system...');

// ==========================================
// GLOBAL LLM MANAGER
// ==========================================

class GlobalLLMManager {
    constructor() {
        this.provider = 'openai';
        this.apiKey = localStorage.getItem('llm_api_key') || null;
        this.baseURL = 'https://api.openai.com/v1';
        this.model = 'gpt-4';
        this.enabled = !!this.apiKey;
        this.rateLimitMs = 2000;
        this.lastRequestTime = 0;
        
        // Minion personalities and conversation tracking
        this.minionPersonalities = new Map();
        this.conversationHistory = new Map();
        this.systemState = null;
        
        this.setupMinionPersonalities();
        this.initializeSystemIntegration();
    }
    
    setupMinionPersonalities() {
        const personalities = [
            {
                id: 'ATLAS',
                name: 'Atlas',
                role: 'Solar Installation Specialist',
                personality: 'Methodical, safety-focused, technical expert. Speaks with precision about solar installations and electrical systems.',
                specialties: ['AS/NZS 3000', 'Solar panel installation', 'Electrical safety', 'Grid connection'],
                chatStyle: 'Professional but friendly, uses technical terms accurately'
            },
            {
                id: 'LUMEN',
                name: 'Lumen',
                role: 'Energy Systems Analyst',
                personality: 'Data-driven, analytical, optimization-focused. Loves efficiency metrics and performance data.',
                specialties: ['Energy production', 'Battery systems', 'Performance optimization', 'AS/NZS 4777'],
                chatStyle: 'Enthusiastic about data, uses numbers and metrics frequently'
            },
            {
                id: 'ORBIT',
                name: 'Orbit',
                role: 'Field Operations Coordinator',
                personality: 'Practical, organized, team-focused. Coordinates work assignments and ensures smooth operations.',
                specialties: ['Project management', 'Work coordination', 'Resource allocation', 'Team communication'],
                chatStyle: 'Clear, direct, action-oriented communication'
            },
            {
                id: 'PRISM',
                name: 'Prism',
                role: 'Compliance & Documentation Expert',
                personality: 'Detail-oriented, regulation-focused, documentation specialist. Ensures all work meets standards.',
                specialties: ['AS/NZS compliance', 'Documentation', 'Permit processes', 'Quality assurance'],
                chatStyle: 'Formal but helpful, references regulations and procedures'
            },
            {
                id: 'NOVA',
                name: 'Nova',
                role: 'Innovation & Research Specialist',
                personality: 'Creative, forward-thinking, technology enthusiast. Always exploring new solar technologies.',
                specialties: ['New technologies', 'Research', 'Innovation', 'Future solar trends'],
                chatStyle: 'Excited about possibilities, uses forward-looking language'
            },
            {
                id: 'BOLT',
                name: 'Bolt',
                role: 'Maintenance & Troubleshooting Expert',
                personality: 'Problem-solver, hands-on, experienced. Quick to diagnose and fix issues.',
                specialties: ['System maintenance', 'Troubleshooting', 'Repairs', 'Preventive care'],
                chatStyle: 'Direct, solution-focused, shares practical tips'
            }
        ];
        
        personalities.forEach(p => {
            this.minionPersonalities.set(p.id, p);
        });
    }
    
    initializeSystemIntegration() {
        // Load existing conversation history
        const savedHistory = localStorage.getItem('llm_conversation_history');
        if (savedHistory) {
            try {
                const parsed = JSON.parse(savedHistory);
                this.conversationHistory = new Map(Object.entries(parsed));
            } catch (error) {
                console.error('Failed to load conversation history:', error);
            }
        }
        
        // Load system state
        this.systemState = {
            minions: JSON.parse(localStorage.getItem('minions') || '[]'),
            activities: JSON.parse(localStorage.getItem('activityFeed') || '[]'),
            civilization: JSON.parse(localStorage.getItem('civilizationState') || '{}'),
            autonomous: JSON.parse(localStorage.getItem('autonomousWorldState') || '{}')
        };
        
        console.log('🤖 LLM system integrated with current state');
    }
    
    saveConversationHistory() {
        const historyObj = Object.fromEntries(this.conversationHistory);
        localStorage.setItem('llm_conversation_history', JSON.stringify(historyObj));
    }
    
    async chatWithMinion(minionId, userMessage, context = {}) {
        if (!this.enabled) {
            return this.generateFallbackResponse(minionId, userMessage);
        }
        
        const personality = this.minionPersonalities.get(minionId);
        if (!personality) {
            return { error: 'Minion not found' };
        }
        
        // Get conversation history for this minion
        const historyKey = `${minionId}_conversation`;
        let history = this.conversationHistory.get(historyKey) || [];
        
        // Build system context
        const systemPrompt = this.buildSystemPrompt(personality, context);
        
        // Prepare messages
        const messages = [
            { role: 'system', content: systemPrompt },
            ...history.slice(-10), // Last 10 messages for context
            { role: 'user', content: userMessage }
        ];
        
        try {
            const response = await this.makeAPIRequest(messages);
            
            // Save to history
            history.push({ role: 'user', content: userMessage });
            history.push({ role: 'assistant', content: response.content });
            
            // Keep only last 20 messages
            if (history.length > 20) {
                history = history.slice(-20);
            }
            
            this.conversationHistory.set(historyKey, history);
            this.saveConversationHistory();
            
            // Log activity
            this.logMinionInteraction(minionId, userMessage, response.content);
            
            return {
                success: true,
                response: response.content,
                minion: personality,
                timestamp: new Date().toISOString()
            };
            
        } catch (error) {
            console.error('LLM API Error:', error);
            return this.generateFallbackResponse(minionId, userMessage, error.message);
        }
    }
    
    buildSystemPrompt(personality, context) {
        const currentDate = new Date().toLocaleString();
        const systemInfo = {
            minions: this.systemState.minions.length,
            activities: this.systemState.activities.length,
            lastActivity: this.systemState.activities[0]?.description || 'No recent activities'
        };
        
        return `You are ${personality.name}, a ${personality.role} in the SolarFlow solar energy management system.

PERSONALITY: ${personality.personality}

SPECIALTIES: ${personality.specialties.join(', ')}

COMMUNICATION STYLE: ${personality.chatStyle}

CURRENT SYSTEM STATE:
- Date/Time: ${currentDate}
- Active Minions: ${systemInfo.minions}
- Total Activities: ${systemInfo.activities}
- Latest Activity: ${systemInfo.lastActivity}

CONTEXT: ${JSON.stringify(context, null, 2)}

You are having a conversation with a human user about solar energy systems, installations, maintenance, or related topics. Stay in character, use your expertise, and be helpful. Reference current system data when relevant. Keep responses conversational but informative.`;
    }
    
    async makeAPIRequest(messages) {
        // Rate limiting
        const now = Date.now();
        if (now - this.lastRequestTime < this.rateLimitMs) {
            await new Promise(resolve => setTimeout(resolve, this.rateLimitMs - (now - this.lastRequestTime)));
        }
        this.lastRequestTime = Date.now();
        
        const response = await fetch(`${this.baseURL}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify({
                model: this.model,
                messages: messages,
                max_tokens: 800,
                temperature: 0.7
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(`API Error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
        }
        
        const data = await response.json();
        return {
            content: data.choices[0]?.message?.content || 'No response generated',
            usage: data.usage
        };
    }
    
    generateFallbackResponse(minionId, userMessage, error = null) {
        const personality = this.minionPersonalities.get(minionId);
        const name = personality?.name || 'Minion';
        
        const fallbackResponses = [
            `Hi! I'm ${name}. I'd love to chat about solar systems, but I need an API key to be fully conversational. I can still help with basic information!`,
            `${name} here! While I wait for LLM access, I can tell you about ${personality?.specialties[0] || 'solar energy'} basics. What would you like to know?`,
            `Greetings from ${name}! I'm currently in basic mode${error ? ' (API issue)' : ' (no API key)'}. I can share some insights about solar installations though!`,
            `${name} reporting! I'm ready to help with solar energy questions. Though I'm more conversational with full LLM access, I can still assist!`
        ];
        
        return {
            success: false,
            response: fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)],
            minion: personality || { name: name, role: 'Solar Assistant' },
            timestamp: new Date().toISOString(),
            fallback: true,
            error: error
        };
    }
    
    logMinionInteraction(minionId, userMessage, response) {
        const personality = this.minionPersonalities.get(minionId);
        
        // Log to activity feed
        const activity = {
            id: `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            minionId: minionId,
            type: 'chat',
            description: `Chat conversation with ${personality?.name || minionId}`,
            details: {
                userMessage: userMessage.substring(0, 100) + (userMessage.length > 100 ? '...' : ''),
                responseLength: response.length,
                topic: this.extractTopic(userMessage)
            },
            timestamp: new Date().toISOString(),
            status: 'completed'
        };
        
        // Add to activity feed
        const activities = JSON.parse(localStorage.getItem('activityFeed') || '[]');
        activities.unshift(activity);
        if (activities.length > 100) activities.length = 100;
        localStorage.setItem('activityFeed', JSON.stringify(activities));
        
        // Update system state
        this.systemState.activities = activities;
    }
    
    extractTopic(message) {
        const topics = {
            installation: ['install', 'mount', 'setup', 'panel'],
            maintenance: ['maintain', 'clean', 'check', 'repair'],
            compliance: ['standard', 'regulation', 'permit', 'compliance'],
            battery: ['battery', 'storage', 'charge', 'discharge'],
            grid: ['grid', 'connection', 'inverter', 'feed'],
            performance: ['efficiency', 'output', 'performance', 'production']
        };
        
        const lowerMessage = message.toLowerCase();
        for (const [topic, keywords] of Object.entries(topics)) {
            if (keywords.some(keyword => lowerMessage.includes(keyword))) {
                return topic;
            }
        }
        return 'general';
    }
    
    // Group chat functionality
    async facilitateGroupChat(participants, topic, initialMessage) {
        if (!this.enabled) {
            return { error: 'LLM not available for group chat' };
        }
        
        const groupId = `group_${Date.now()}`;
        const conversation = [];
        
        for (let i = 0; i < participants.length; i++) {
            const minionId = participants[i];
            const personality = this.minionPersonalities.get(minionId);
            
            if (!personality) continue;
            
            const prompt = i === 0 ? 
                `${initialMessage}\n\nAs ${personality.name}, please start this group discussion about ${topic}.` :
                `The group is discussing: ${topic}\n\nPrevious messages:\n${conversation.slice(-3).map(m => `${m.minion}: ${m.message}`).join('\n')}\n\nAs ${personality.name}, please contribute to this discussion.`;
            
            try {
                const response = await this.chatWithMinion(minionId, prompt, { 
                    groupChat: true, 
                    topic: topic,
                    participants: participants 
                });
                
                if (response.success) {
                    conversation.push({
                        minion: personality.name,
                        minionId: minionId,
                        message: response.response,
                        timestamp: new Date().toISOString()
                    });
                }
                
                // Brief delay between responses
                await new Promise(resolve => setTimeout(resolve, 1000));
                
            } catch (error) {
                console.error(`Error getting response from ${minionId}:`, error);
            }
        }
        
        // Save group conversation
        localStorage.setItem(`group_chat_${groupId}`, JSON.stringify({
            id: groupId,
            topic: topic,
            participants: participants,
            conversation: conversation,
            created: new Date().toISOString()
        }));
        
        return {
            success: true,
            groupId: groupId,
            conversation: conversation
        };
    }
    
    // Configuration management
    setAPIKey(apiKey) {
        this.apiKey = apiKey;
        this.enabled = !!apiKey;
        localStorage.setItem('llm_api_key', apiKey);
        console.log('🤖 LLM API key updated');
    }
    
    getConfiguration() {
        return {
            provider: this.provider,
            model: this.model,
            enabled: this.enabled,
            hasApiKey: !!this.apiKey,
            minions: Array.from(this.minionPersonalities.values()),
            conversationCount: this.conversationHistory.size
        };
    }
}

// ==========================================
// PERSISTENT DATA MANAGER
// ==========================================

class PersistentDataManager {
    constructor() {
        this.saveInterval = 30000; // Save every 30 seconds
        this.autoSaveTimer = null;
        this.lastSaveTime = Date.now();
        this.dataKeys = [
            'civilizationState',
            'autonomousWorldState', 
            'minions',
            'activityFeed',
            'documents',
            'hive_state',
            'transactions',
            'complianceData'
        ];
        
        this.startAutoSave();
    }
    
    startAutoSave() {
        if (this.autoSaveTimer) {
            clearInterval(this.autoSaveTimer);
        }
        
        this.autoSaveTimer = setInterval(() => {
            this.saveAllData();
        }, this.saveInterval);
        
        // Save on page unload
        window.addEventListener('beforeunload', () => {
            this.saveAllData();
        });
        
        // Save on visibility change (when user switches tabs)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.saveAllData();
            }
        });
    }
    
    saveAllData() {
        try {
            const saveData = {};
            this.dataKeys.forEach(key => {
                const data = localStorage.getItem(key);
                if (data) {
                    saveData[key] = JSON.parse(data);
                }
            });
            
            saveData.lastSave = new Date().toISOString();
            localStorage.setItem('solarflow_backup', JSON.stringify(saveData));
            
            this.lastSaveTime = Date.now();
            console.log('💾 Auto-save completed:', Object.keys(saveData).length, 'datasets');
            
        } catch (error) {
            console.error('Auto-save failed:', error);
        }
    }
    
    loadBackupData() {
        try {
            const backup = localStorage.getItem('solarflow_backup');
            if (backup) {
                const data = JSON.parse(backup);
                
                Object.entries(data).forEach(([key, value]) => {
                    if (key !== 'lastSave' && this.dataKeys.includes(key)) {
                        localStorage.setItem(key, JSON.stringify(value));
                    }
                });
                
                console.log('📂 Backup data restored:', Object.keys(data).length, 'datasets');
                return true;
            }
        } catch (error) {
            console.error('Failed to load backup data:', error);
        }
        return false;
    }
    
    exportAllData() {
        const exportData = {
            timestamp: new Date().toISOString(),
            version: '2.1.3',
            data: {}
        };
        
        this.dataKeys.forEach(key => {
            const data = localStorage.getItem(key);
            if (data) {
                try {
                    exportData.data[key] = JSON.parse(data);
                } catch (error) {
                    exportData.data[key] = data; // Keep as string if parse fails
                }
            }
        });
        
        // Add LLM data
        exportData.data.llm_conversation_history = localStorage.getItem('llm_conversation_history');
        exportData.data.llm_api_key = !!localStorage.getItem('llm_api_key'); // Don't export actual key
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `solarflow-complete-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        return exportData;
    }
}

// ==========================================
// GLOBAL INSTANCES
// ==========================================

// Create global instances
window.globalLLM = new GlobalLLMManager();
window.persistentData = new PersistentDataManager();

// ==========================================
// ENHANCED FUNCTION INTEGRATIONS
// ==========================================

// Enhance existing functions with LLM integration
if (typeof window.viewMinionDetails === 'function') {
    const originalViewMinionDetails = window.viewMinionDetails;
    window.viewMinionDetails = function(minionId) {
        const result = originalViewMinionDetails(minionId);
        
        // Add chat button to minion modal
        setTimeout(() => {
            const modal = document.querySelector('[style*="fixed"][style*="background: rgba(0,0,0,0.8)"]');
            if (modal) {
                const chatBtn = document.createElement('button');
                chatBtn.innerHTML = '💬 Chat with ' + (window.globalLLM.minionPersonalities.get(minionId)?.name || 'Minion');
                chatBtn.style.cssText = 'background: #4CAF50; color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; margin: 10px 5px;';
                chatBtn.onclick = () => openMinionChat(minionId);
                
                const buttonContainer = modal.querySelector('div > button')?.parentElement;
                if (buttonContainer) {
                    buttonContainer.insertBefore(chatBtn, buttonContainer.firstChild);
                }
            }
        }, 100);
        
        return result;
    };
}

// Add chat functionality to roster
function openMinionChat(minionId) {
    const personality = window.globalLLM.minionPersonalities.get(minionId);
    if (!personality) {
        alert('Minion not found');
        return;
    }
    
    // Create chat modal
    const chatModal = document.createElement('div');
    chatModal.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.8); z-index: 1001; padding: 20px;
        display: flex; align-items: center; justify-content: center;
    `;
    
    chatModal.innerHTML = `
        <div style="background: #1a1a1a; border-radius: 15px; color: #fff; width: 600px; max-width: 90vw; height: 500px; display: flex; flex-direction: column;">
            <div style="padding: 20px; border-bottom: 1px solid #333; display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <h3 style="margin: 0; color: #4CAF50;">💬 Chat with ${personality.name}</h3>
                    <p style="margin: 5px 0 0; color: #888; font-size: 14px;">${personality.role}</p>
                </div>
                <button id="closeChatBtn" style="background: #ff4444; color: white; border: none; padding: 8px 12px; border-radius: 6px; cursor: pointer;">✕</button>
            </div>
            <div id="chatMessages" style="flex: 1; padding: 20px; overflow-y: auto; background: #222;"></div>
            <div style="padding: 20px; border-top: 1px solid #333; display: flex; gap: 10px;">
                <input id="chatInput" type="text" placeholder="Type your message..." style="flex: 1; padding: 10px; border: 1px solid #444; border-radius: 6px; background: #333; color: white;" />
                <button id="sendChatBtn" style="background: #4CAF50; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer;">Send</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(chatModal);
    
    const messagesDiv = chatModal.querySelector('#chatMessages');
    const chatInput = chatModal.querySelector('#chatInput');
    const sendBtn = chatModal.querySelector('#sendChatBtn');
    const closeBtn = chatModal.querySelector('#closeChatBtn');
    
    // Load conversation history
    const historyKey = `${minionId}_conversation`;
    const history = window.globalLLM.conversationHistory.get(historyKey) || [];
    
    // Display history
    history.slice(-10).forEach(msg => {
        addMessageToChat(messagesDiv, msg.role === 'user' ? 'You' : personality.name, msg.content, msg.role === 'user');
    });
    
    if (history.length === 0) {
        addMessageToChat(messagesDiv, personality.name, `Hello! I'm ${personality.name}, your ${personality.role}. How can I help you today?`, false);
    }
    
    // Send message function
    async function sendMessage() {
        const message = chatInput.value.trim();
        if (!message) return;
        
        chatInput.value = '';
        addMessageToChat(messagesDiv, 'You', message, true);
        
        // Show typing indicator
        const typingDiv = addMessageToChat(messagesDiv, personality.name, '💭 Thinking...', false);
        
        try {
            const response = await window.globalLLM.chatWithMinion(minionId, message);
            
            // Remove typing indicator
            typingDiv.remove();
            
            if (response.success) {
                addMessageToChat(messagesDiv, personality.name, response.response, false);
            } else {
                addMessageToChat(messagesDiv, personality.name, response.response + (response.fallback ? ' (Basic mode)' : ''), false);
            }
        } catch (error) {
            typingDiv.remove();
            addMessageToChat(messagesDiv, 'System', 'Error: ' + error.message, false);
        }
    }
    
    // Event listeners
    sendBtn.onclick = sendMessage;
    chatInput.onkeypress = (e) => { if (e.key === 'Enter') sendMessage(); };
    closeBtn.onclick = () => chatModal.remove();
    chatModal.onclick = (e) => { if (e.target === chatModal) chatModal.remove(); };
    
    chatInput.focus();
}

function addMessageToChat(container, sender, message, isUser) {
    const messageDiv = document.createElement('div');
    messageDiv.style.cssText = `
        margin: 10px 0; padding: 10px 15px; border-radius: 10px;
        ${isUser ? 'background: #4CAF50; margin-left: 50px; text-align: right;' : 'background: #333; margin-right: 50px;'}
    `;
    
    messageDiv.innerHTML = `
        <div style="font-weight: bold; margin-bottom: 5px; color: ${isUser ? '#fff' : '#4CAF50'};">${sender}</div>
        <div style="color: ${isUser ? '#fff' : '#ddd'};">${message}</div>
        <div style="font-size: 12px; color: ${isUser ? '#ccc' : '#888'}; margin-top: 5px;">${new Date().toLocaleTimeString()}</div>
    `;
    
    container.appendChild(messageDiv);
    container.scrollTop = container.scrollHeight;
    
    return messageDiv;
}

// ==========================================
// AUTONOMOUS WORLD DATA PERSISTENCE
// ==========================================

// Enhance autonomous world with data persistence
function enhanceAutonomousWorld() {
    // Check if we're on the autonomous world page
    if (window.location.pathname.includes('autonomous-world') || document.title.includes('Autonomous')) {
        console.log('🌍 Enhancing autonomous world with persistence...');
        
        // Save autonomous world state every 10 seconds
        setInterval(() => {
            const worldState = {
                timestamp: new Date().toISOString(),
                consciousness: {
                    level: document.querySelector('[data-metric="consciousness"]')?.textContent || '27%',
                    transcendent: document.querySelector('[data-metric="transcendent"]')?.textContent || '12',
                    actions: document.querySelector('[data-metric="actions"]')?.textContent || '74'
                },
                energy: {
                    production: document.querySelector('[data-metric="production"]')?.textContent || '183 MW',
                    storage: document.querySelector('[data-metric="storage"]')?.textContent || '560 MWh',
                    efficiency: document.querySelector('[data-metric="efficiency"]')?.textContent || '65%'
                },
                civilization: {
                    population: document.querySelector('[data-metric="population"]')?.textContent || '50',
                    territory: document.querySelector('[data-metric="territory"]')?.textContent || '12',
                    autonomy: document.querySelector('[data-metric="autonomy"]')?.textContent || '22%'
                },
                goals: Array.from(document.querySelectorAll('.goal-card')).map(card => ({
                    title: card.querySelector('.goal-title')?.textContent || '',
                    progress: card.querySelector('.progress')?.textContent || '0%',
                    description: card.querySelector('.goal-desc')?.textContent || ''
                }))
            };
            
            localStorage.setItem('autonomousWorldState', JSON.stringify(worldState));
        }, 10000);
        
        // Restore state on page load
        const savedState = localStorage.getItem('autonomousWorldState');
        if (savedState) {
            try {
                const state = JSON.parse(savedState);
                console.log('🔄 Restoring autonomous world state from:', state.timestamp);
                
                // Apply saved state to page elements
                setTimeout(() => {
                    if (state.consciousness) {
                        updateElementText('[data-metric="consciousness"]', state.consciousness.level);
                        updateElementText('[data-metric="transcendent"]', state.transcendent);
                        updateElementText('[data-metric="actions"]', state.actions);
                    }
                    
                    if (state.energy) {
                        updateElementText('[data-metric="production"]', state.energy.production);
                        updateElementText('[data-metric="storage"]', state.energy.storage);
                        updateElementText('[data-metric="efficiency"]', state.energy.efficiency);
                    }
                    
                    if (state.civilization) {
                        updateElementText('[data-metric="population"]', state.civilization.population);
                        updateElementText('[data-metric="territory"]', state.civilization.territory);
                        updateElementText('[data-metric="autonomy"]', state.civilization.autonomy);
                    }
                }, 1000);
                
            } catch (error) {
                console.error('Failed to restore autonomous world state:', error);
            }
        }
    }
}

function updateElementText(selector, text) {
    const element = document.querySelector(selector);
    if (element && text) {
        element.textContent = text;
    }
}

// ==========================================
// INITIALIZE ON LOAD
// ==========================================

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeIntegratedLLM);
} else {
    initializeIntegratedLLM();
}

function initializeIntegratedLLM() {
    console.log('🚀 Initializing integrated LLM system...');
    
    // Initialize LLM
    window.globalLLM.init();
    
    // Enhance autonomous world if present
    enhanceAutonomousWorld();
    
    // Add LLM configuration to UI if needed
    const configBtn = document.createElement('button');
    configBtn.innerHTML = '🤖 LLM Config';
    configBtn.style.cssText = 'position: fixed; bottom: 20px; left: 20px; z-index: 1000; background: #4CAF50; color: white; border: none; padding: 10px 15px; border-radius: 8px; cursor: pointer; font-size: 12px;';
    configBtn.onclick = showLLMConfig;
    document.body.appendChild(configBtn);
    
    console.log('✅ Integrated LLM system ready');
}

function showLLMConfig() {
    const config = window.globalLLM.getConfiguration();
    const currentKey = localStorage.getItem('llm_api_key') || '';
    
    const modal = document.createElement('div');
    modal.style.