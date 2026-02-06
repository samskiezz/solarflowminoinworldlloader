/**
 * Central state management for hive_state.json integration
 * Single source of truth for all minion data and world state
 */
import { eventBus } from './EventBus.js';

export class StateStore {
    constructor() {
        this.hive = null;
        this.minions = [];
        this.schemaVersion = 1;
        this.lastUpdate = null;
        this.worldHealth = { voltage: 0, entropy: 0, loopRisk: 0 };
        this.ledger = { total: 0, transactions: [] };
    }

    async loadHiveState(url = 'hive_state.json') {
        try {
            const response = await fetch(url + '?' + Date.now());
            if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status}`);
            
            const hiveJson = await response.json();
            this.applyHive(hiveJson);
            
            eventBus.emit('hive:loaded', { minions: this.minions, health: this.worldHealth });
            console.log(`[StateStore] Loaded ${this.minions.length} minions from hive state`);
            
        } catch (error) {
            console.warn('[StateStore] Falling back to emergency data:', error.message);
            this.applyFallbackData();
            eventBus.emit('hive:fallback', { minions: this.minions });
        }
    }

    applyHive(hiveJson) {
        this.hive = hiveJson;
        this.schemaVersion = hiveJson.meta?.schema?.version || 1;
        this.lastUpdate = hiveJson.meta?.updatedAt || new Date().toISOString();
        
        // Extract world health
        if (hiveJson.health) {
            this.worldHealth = {
                voltage: hiveJson.health.virtual_voltage || 0,
                entropy: hiveJson.health.entropy || 0,
                loopRisk: hiveJson.health.loop_risk || 0
            };
        }
        
        // Extract ledger data
        if (hiveJson.ledger) {
            this.ledger = {
                total: hiveJson.ledger.credits_total || 0,
                transactions: hiveJson.ledger.transactions || []
            };
        }
        
        // Transform roster to standardized minion format
        const roster = hiveJson.minions?.roster || [];
        this.minions = roster.map(m => this.standardizeMinion(m));
        
        eventBus.emit('minions:updated', this.minions);
    }

    standardizeMinion(rawMinion) {
        return {
            // Core identity
            id: rawMinion.id || rawMinion.name || 'UNKNOWN',
            name: rawMinion.name || rawMinion.id || 'Unknown',
            tier: rawMinion.tier || 1,
            role: rawMinion.role || 'OPERATOR',
            
            // Stats from hive_state.json
            credits: rawMinion.energy_credits || 0,
            happiness: rawMinion.happiness_sim || 50,
            reputation: rawMinion.reputation || 0.5,
            specialties: rawMinion.specialties || [],
            mode: rawMinion.mode || 'EXECUTION',
            
            // 3D Avatar integration (NEW)
            avatarUrl: rawMinion.avatar_url || null,
            avatarRig: rawMinion.avatarRig || 'RPM', // ReadyPlayerMe, VRM, Custom
            lodProfile: rawMinion.lodProfile || 'med', // low, med, high
            
            // AI state (enhanced)
            ai: {
                currentActivity: this.getRandomActivity(),
                currentThought: this.getRandomThought(),
                energy: 80 + Math.random() * 20,
                mood: rawMinion.happiness_sim || 70,
                lastActivityChange: Date.now(),
                destination: null,
                speed: 0.02 + Math.random() * 0.03,
                ...(rawMinion.ai || {})
            },
            
            // 3D World position (NEW)
            position: rawMinion.position || null,
            rotation: rawMinion.rotation || null,
            
            // Metadata
            lastSeen: new Date().toISOString(),
            isActive: rawMinion.mode === 'COLLAB' || rawMinion.mode === 'EXECUTION'
        };
    }

    applyFallbackData() {
        this.minions = [
            {
                id: 'ATLAS', name: 'Atlas', tier: 3, role: 'OVERSEER',
                credits: 160, happiness: 85, reputation: 0.65,
                specialties: ['orchestration', 'governance'],
                avatarRig: 'RPM', lodProfile: 'high',
                ai: { currentActivity: 'Orchestrating systems', currentThought: 'Managing the hive efficiently', energy: 95, mood: 85 }
            },
            {
                id: 'LUMEN', name: 'Lumen', tier: 3, role: 'OVERSEER', 
                credits: 160, happiness: 90, reputation: 0.63,
                specialties: ['priorities', 'paradox-resolution'],
                avatarRig: 'RPM', lodProfile: 'high',
                ai: { currentActivity: 'Analyzing priorities', currentThought: 'This data pattern is interesting', energy: 88, mood: 90 }
            },
            {
                id: 'ORBIT', name: 'Orbit', tier: 2, role: 'SPECIALIST',
                credits: 120, happiness: 75, reputation: 0.54,
                specialties: ['memory', 'signals'],
                avatarRig: 'RPM', lodProfile: 'med',
                ai: { currentActivity: 'Processing memories', currentThought: 'These signals are fascinating', energy: 82, mood: 75 }
            }
        ];
        
        this.worldHealth = { voltage: 0.33, entropy: 0.19, loopRisk: 0.12 };
        this.ledger = { total: 2765, transactions: [] };
    }

    getRandomActivity() {
        const activities = [
            "Working on solar panels", "Analyzing energy data", "Collaborating with team",
            "Taking a coffee break", "Reviewing documentation", "Planning new projects",
            "Debugging code", "Attending meeting", "Learning new skills", "Relaxing in park",
            "Processing hive data", "Optimizing algorithms", "Monitoring systems"
        ];
        return activities[Math.floor(Math.random() * activities.length)];
    }

    getRandomThought() {
        const thoughts = [
            "I love working on renewable energy!", "This solar data is fascinating",
            "Time for a break soon", "Wonder what's for lunch today",
            "This project is going well", "Need to collaborate more with team",
            "The hive is running smoothly", "Feeling productive today",
            "This algorithm needs optimization", "Coffee sounds good right now"
        ];
        return thoughts[Math.floor(Math.random() * thoughts.length)];
    }

    // Getters for easy access
    getMinionById(id) {
        return this.minions.find(m => m.id === id);
    }

    getMinionsByTier(tier) {
        return this.minions.filter(m => m.tier === tier);
    }

    getMinionsByRole(role) {
        return this.minions.filter(m => m.role === role);
    }

    getActiveMinions() {
        return this.minions.filter(m => m.isActive);
    }
    
    getMinions() {
        return this.minions;
    }
    
    getMinion(id) {
        return this.getMinionById(id);
    }

    getTotalCredits() {
        return this.minions.reduce((sum, m) => sum + m.credits, 0);
    }

    getAverageHappiness() {
        return this.minions.reduce((sum, m) => sum + m.happiness, 0) / this.minions.length;
    }
}

// Global instance
export const stateStore = new StateStore();