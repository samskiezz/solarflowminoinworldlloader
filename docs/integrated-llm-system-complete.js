// ==========================================
// INTEGRATED LLM SYSTEM - CONTINUATION
// Complete LLM configuration and autonomous world integration
// ==========================================

function showLLMConfig() {
    const config = window.globalLLM.getConfiguration();
    const currentKey = localStorage.getItem('llm_api_key') || '';
    
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.8); z-index: 1002; padding: 20px;
        display: flex; align-items: center; justify-content: center;
    `;
    
    modal.innerHTML = `
        <div style="background: #1a1a1a; padding: 30px; border-radius: 15px; color: #fff; max-width: 500px; width: 100%;">
            <h3 style="color: #4CAF50; margin-bottom: 20px;">🤖 LLM Configuration</h3>
            
            <div style="margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 5px; color: #ddd;">OpenAI API Key:</label>
                <input id="apiKeyInput" type="password" value="${currentKey.substring(0, 8) + '...'}" 
                    style="width: 100%; padding: 10px; border: 1px solid #444; border-radius: 6px; background: #333; color: white;" />
                <small style="color: #888;">Required for minion chat functionality</small>
            </div>
            
            <div style="margin-bottom: 20px;">
                <strong>Status:</strong> ${config.enabled ? '✅ Enabled' : '❌ Disabled'}<br>
                <strong>Model:</strong> ${config.model}<br>
                <strong>Available Minions:</strong> ${config.minions.length}<br>
                <strong>Active Conversations:</strong> ${config.conversationCount}
            </div>
            
            <div style="margin-bottom: 20px;">
                <h4 style="color: #4CAF50;">Available Minions:</h4>
                ${config.minions.map(m => `
                    <div style="padding: 8px; border-left: 3px solid #4CAF50; margin: 5px 0; background: rgba(76,175,80,0.1);">
                        <strong>${m.name}</strong> - ${m.role}<br>
                        <small style="color: #aaa;">${m.specialties.slice(0, 2).join(', ')}</small>
                    </div>
                `).join('')}
            </div>
            
            <div style="display: flex; gap: 10px; justify-content: flex-end;">
                <button id="saveConfigBtn" style="background: #4CAF50; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer;">Save</button>
                <button id="testChatBtn" style="background: #2196F3; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer;">Test Chat</button>
                <button id="closeConfigBtn" style="background: #666; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer;">Close</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Event handlers
    modal.querySelector('#saveConfigBtn').onclick = () => {
        const newKey = modal.querySelector('#apiKeyInput').value;
        if (newKey && !newKey.includes('...')) {
            window.globalLLM.setAPIKey(newKey);
            alert('✅ API key saved! Minion chat is now enabled.');
        }
    };
    
    modal.querySelector('#testChatBtn').onclick = () => {
        modal.remove();
        openMinionChat('ATLAS');
    };
    
    modal.querySelector('#closeConfigBtn').onclick = () => modal.remove();
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
}

// ==========================================
// AUTONOMOUS WORLD INTEGRATION
// ==========================================

// Function to integrate with autonomous world
function integrateWithAutonomousWorld() {
    // Add LLM-powered event generation
    window.generateIntelligentEvent = async function() {
        if (!window.globalLLM.enabled) {
            return generateRandomEvent(); // Fallback to existing function
        }
        
        const systemContext = {
            consciousness: document.querySelector('[data-metric="consciousness"]')?.textContent || '27%',
            population: document.querySelector('[data-metric="population"]')?.textContent || '50',
            energy: document.querySelector('[data-metric="production"]')?.textContent || '183 MW'
        };
        
        const prompt = `As a civilization AI managing an autonomous solar energy civilization with ${systemContext.population} entities and ${systemContext.consciousness} consciousness level, generate a realistic civilization event. Return a JSON object with: {\"type\": \"event_type\", \"description\": \"event description\", \"impact\": \"positive/neutral/negative\"}`;
        
        try {
            const response = await window.globalLLM.chatWithMinion('NOVA', prompt, systemContext);
            
            if (response.success) {
                try {
                    const eventData = JSON.parse(response.response);
                    return {
                        text: eventData.description,
                        type: eventData.type,
                        impact: eventData.impact,
                        generated: true
                    };
                } catch (parseError) {
                    // If JSON parsing fails, use the response as description
                    return {
                        text: response.response,
                        type: 'ai_generated',
                        impact: 'positive',
                        generated: true
                    };
                }
            }
        } catch (error) {
            console.error('AI event generation failed:', error);
        }
        
        // Fallback to random event
        return generateRandomEvent();
    };
    
    // Enhanced consciousness evolution with LLM
    window.evolveConsciousnessWithLLM = async function() {
        if (!window.globalLLM.enabled) {
            return evolveConsciousness(); // Fallback
        }
        
        const prompt = 'Generate a consciousness evolution insight for a solar energy minion civilization. Focus on collective intelligence and solar optimization breakthroughs.';
        
        try {
            const response = await window.globalLLM.chatWithMinion('PRISM', prompt);
            if (response.success) {
                // Add to event stream with AI tag
                addEventToStream(`🧠 AI Consciousness Evolution: ${response.response}`);
                return response.response;
            }
        } catch (error) {
            console.error('AI consciousness evolution failed:', error);
        }
        
        return evolveConsciousness();
    };
    
    // LLM-powered minion communication
    window.facilitateMinionDialogue = async function() {
        if (!window.globalLLM.enabled) return;
        
        const participants = ['ATLAS', 'LUMEN', 'ORBIT'];
        const topics = [
            'solar array optimization strategies',
            'autonomous energy distribution methods',
            'collective consciousness development',
            'next-generation solar technologies'
        ];
        
        const topic = topics[Math.floor(Math.random() * topics.length)];
        
        try {
            const groupChat = await window.globalLLM.facilitateGroupChat(
                participants, 
                topic, 
                `Let's discuss ${topic} for our autonomous solar civilization.`
            );
            
            if (groupChat.success) {
                // Add dialogue to event stream
                groupChat.conversation.forEach((msg, index) => {
                    setTimeout(() => {
                        addEventToStream(`💬 ${msg.minion}: ${msg.message.substring(0, 100)}...`);
                    }, index * 2000);
                });
                
                return groupChat;
            }
        } catch (error) {
            console.error('Minion dialogue failed:', error);
        }
    };
}

// ==========================================
// AUTO-SAVE AND RESTORATION FOR AUTONOMOUS WORLD
// ==========================================

// Enhanced save/restore for autonomous world
function setupAutonomousWorldPersistence() {
    if (!window.location.pathname.includes('autonomous-world')) return;
    
    console.log('🔄 Setting up autonomous world persistence...');
    
    // Comprehensive state capture
    function captureWorldState() {
        const state = {
            timestamp: new Date().toISOString(),
            url: window.location.href,
            
            // Visual metrics
            metrics: {
                consciousness: document.querySelector('[data-consciousness]')?.textContent || 
                            document.textContent.match(/(\d+)%\s+Average\s+Awareness/)?.[1] + '%' || '27%',
                transcendent: document.textContent.match(/(\d+)\s+Transcendent\s+Entities/)?.[1] || '12',
                selfDirected: document.textContent.match(/(\d+)\s+Self-Directed\s+Actions/)?.[1] || '74',
                evolutionDays: document.textContent.match(/(\d+)\s+Days\s+of\s+Evolution/)?.[1] || '3',
                
                solarOutput: document.textContent.match(/Solar\s+Output:(\d+)\s+MW/)?.[1] || '183',
                storage: document.textContent.match(/Storage:(\d+)\s+MWh/)?.[1] || '560',
                efficiency: document.textContent.match(/Efficiency:(\d+)%/)?.[1] || '65',
                
                population: document.textContent.match(/Population:\s+(\d+)/)?.[1] || '50',
                territory: document.textContent.match(/Territory:\s+(\d+)/)?.[1] || '12',
                autonomy: document.textContent.match(/Autonomy:\s+(\d+)%/)?.[1] || '22'
            },
            
            // Goals progress
            goals: Array.from(document.querySelectorAll('.goal-card, [class*="goal"]')).map(card => {
                const title = card.querySelector('h4, h3, .goal-title')?.textContent || '';
                const progress = card.textContent.match(/Progress:\s*([^\\n]+)/)?.[1] || '';
                return { title, progress };
            }).filter(g => g.title),
            
            // Active projects
            projects: Array.from(document.querySelectorAll('[class*="project"], .activity-card')).map(project => {
                const title = project.querySelector('h4, h3')?.textContent || '';
                const status = project.textContent.includes('ACTIVE') ? 'ACTIVE' : 
                             project.textContent.includes('PLANNING') ? 'PLANNING' : 'UNKNOWN';
                return { title, status };
            }).filter(p => p.title),
            
            // Event stream
            events: Array.from(document.querySelectorAll('[class*="event"], .event-item')).map(event => ({
                time: event.textContent.match(/\\d{2}:\\d{2}:\\d{2}/)?.[0] || '',
                text: event.textContent.replace(/\\d{2}:\\d{2}:\\d{2}/, '').trim()
            })).filter(e => e.text).slice(0, 10) // Last 10 events
        };
        
        return state;
    }
    
    // Restore state to page
    function restoreWorldState(state) {
        if (!state || !state.metrics) return;
        
        console.log('🔄 Restoring autonomous world state from', state.timestamp);
        
        // Restore metrics by finding and updating text content
        Object.entries(state.metrics).forEach(([key, value]) => {
            // Try to find and update metric elements
            const patterns = {
                consciousness: /\\d+%\\s+Average\\s+Awareness/g,
                transcendent: /\\d+\\s+Transcendent\\s+Entities/g,
                selfDirected: /\\d+\\s+Self-Directed\\s+Actions/g,
                evolutionDays: /\\d+\\s+Days\\s+of\\s+Evolution/g,
                solarOutput: /Solar\\s+Output:\\d+\\s+MW/g,
                storage: /Storage:\\d+\\s+MWh/g,
                efficiency: /Efficiency:\\d+%/g,
                population: /Population:\\s+\\d+/g,
                territory: /Territory:\\s+\\d+/g,
                autonomy: /Autonomy:\\s+\\d+%/g
            };
            
            const pattern = patterns[key];
            if (pattern && value) {
                // Update all matching text in the document
                document.body.innerHTML = document.body.innerHTML.replace(pattern, (match) => {
                    if (key === 'consciousness') return value + ' Average Awareness';
                    if (key === 'transcendent') return value + ' Transcendent Entities';
                    if (key === 'selfDirected') return value + ' Self-Directed Actions';
                    if (key === 'evolutionDays') return value + ' Days of Evolution';
                    if (key === 'solarOutput') return 'Solar Output:' + value + ' MW';
                    if (key === 'storage') return 'Storage:' + value + ' MWh';
                    if (key === 'efficiency') return 'Efficiency:' + value + '%';
                    if (key === 'population') return 'Population: ' + value;
                    if (key === 'territory') return 'Territory: ' + value;
                    if (key === 'autonomy') return 'Autonomy: ' + value + '%';
                    return match;
                });
            }
        });
        
        // Force re-render of any dynamic elements
        setTimeout(() => {
            const event = new Event('staterestored');
            document.dispatchEvent(event);
        }, 1000);
    }
    
    // Auto-save every 30 seconds
    setInterval(() => {
        const state = captureWorldState();
        localStorage.setItem('autonomousWorldState', JSON.stringify(state));
        console.log('💾 Autonomous world state saved');
    }, 30000);
    
    // Save before leaving page
    window.addEventListener('beforeunload', () => {
        const state = captureWorldState();
        localStorage.setItem('autonomousWorldState', JSON.stringify(state));
    });
    
    // Restore on load
    setTimeout(() => {
        const savedState = localStorage.getItem('autonomousWorldState');
        if (savedState) {
            try {
                const state = JSON.parse(savedState);
                restoreWorldState(state);
            } catch (error) {
                console.error('Failed to restore autonomous world state:', error);
            }
        }
    }, 2000); // Wait for page to load
}

// ==========================================
// ENHANCED BUTTON ACTIONS WITH LLM
// ==========================================

// Override autonomous world buttons with LLM integration
function enhanceAutonomousWorldButtons() {
    // Enhance "Accelerate Evolution" button
    const evolveBtn = document.querySelector('[onclick*="accelerate"], [onclick*="evolution"]');
    if (evolveBtn) {
        evolveBtn.onclick = async () => {
            if (window.globalLLM.enabled) {
                await evolveConsciousnessWithLLM();
            } else {
                // Fallback to original function
                if (typeof accelerateEvolution === 'function') {
                    accelerateEvolution();
                }
            }
        };
    }
    
    // Enhance "Initiate Contact" button with LLM dialogue
    const contactBtn = document.querySelector('[onclick*="contact"], [onclick*="initiate"]');
    if (contactBtn) {
        contactBtn.onclick = async () => {
            if (window.globalLLM.enabled) {
                await facilitateMinionDialogue();
            }
            addEventToStream('🤝 Attempting inter-civilization communication protocols...');
        };
    }
    
    // Add new "Group Chat" button
    const buttonContainer = document.querySelector('.civilization-controls, .button-row');
    if (buttonContainer && window.globalLLM.enabled) {
        const groupChatBtn = document.createElement('button');
        groupChatBtn.innerHTML = '💬 Minion Council';
        groupChatBtn.style.cssText = 'background: #2196F3; color: white; border: none; padding: 10px 20px; margin: 5px; border-radius: 6px; cursor: pointer;';
        groupChatBtn.onclick = () => facilitateMinionDialogue();
        buttonContainer.appendChild(groupChatBtn);
    }
}

// ==========================================
// INITIALIZATION
// ==========================================

// Initialize everything when ready
function initializeCompleteSystem() {
    console.log('🚀 Initializing complete integrated system...');
    
    // Initialize LLM system
    if (window.globalLLM) {
        window.globalLLM.init();
    }
    
    // Setup autonomous world enhancements
    integrateWithAutonomousWorld();
    setupAutonomousWorldPersistence();
    enhanceAutonomousWorldButtons();
    
    // Add LLM status indicator
    const statusIndicator = document.createElement('div');
    statusIndicator.style.cssText = `
        position: fixed; top: 20px; right: 20px; z-index: 1000;
        background: ${window.globalLLM?.enabled ? '#4CAF50' : '#FF6B6B'}; 
        color: white; padding: 8px 12px; border-radius: 20px;
        font-size: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.3);
    `;
    statusIndicator.innerHTML = `🤖 LLM: ${window.globalLLM?.enabled ? 'ONLINE' : 'OFFLINE'}`;
    document.body.appendChild(statusIndicator);
    
    console.log('✅ Complete integrated system ready');
    console.log('💬 Minion chat available via minion details');
    console.log('💾 Autonomous world state auto-saving');
    console.log('🤖 LLM integration active');
}

// Auto-initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeCompleteSystem);
} else {
    setTimeout(initializeCompleteSystem, 1000);
}

// Export functions for global access
window.showLLMConfig = showLLMConfig;
window.openMinionChat = openMinionChat;
window.setupAutonomousWorldPersistence = setupAutonomousWorldPersistence;
window.integrateWithAutonomousWorld = integrateWithAutonomousWorld;

console.log('✅ Integrated LLM system complete - ready for minion chat and autonomous world persistence');