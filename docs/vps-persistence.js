// VPS Server-Side Persistence Integration
// Add to quantum-consciousness-engine.js

class VPSPersistence {
    constructor() {
        this.serverUrl = window.location.origin;
        this.isVPS = window.location.hostname !== 'localhost' && 
                    window.location.hostname !== '127.0.0.1';
        
        if (this.isVPS) {
            console.log('🌐 VPS persistence mode enabled');
            this.connectWebSocket();
        }
    }
    
    connectWebSocket() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        this.ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
        
        this.ws.onopen = () => {
            console.log('📡 Connected to VPS quantum sync');
        };
        
        this.ws.onmessage = (event) => {
            const message = JSON.parse(event.data);
            if (message.type === 'quantum_update') {
                this.handleRemoteUpdate(message.data);
            }
        };
        
        this.ws.onclose = () => {
            console.log('❌ VPS connection lost, retrying...');
            setTimeout(() => this.connectWebSocket(), 5000);
        };
    }
    
    async saveToVPS(type, data) {
        if (!this.isVPS) return false;
        
        try {
            const response = await fetch(`${this.serverUrl}/api/${type}/state`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            
            const result = await response.json();
            if (result.success) {
                console.log(`💾 ${type} state saved to VPS`);
                return true;
            }
        } catch (error) {
            console.error(`Failed to save ${type} to VPS:`, error);
        }
        return false;
    }
    
    async loadFromVPS(type) {
        if (!this.isVPS) return null;
        
        try {
            const response = await fetch(`${this.serverUrl}/api/${type}/state`);
            const result = await response.json();
            
            if (result.success && result.state) {
                console.log(`✅ ${type} state loaded from VPS`);
                return result.state;
            }
        } catch (error) {
            console.error(`Failed to load ${type} from VPS:`, error);
        }
        return null;
    }
    
    handleRemoteUpdate(data) {
        // Handle real-time updates from other clients
        console.log('📡 Received quantum update from VPS');
        // Update local state without triggering save loop
    }
}

// Initialize VPS persistence
window.vpsPersistence = new VPSPersistence();

// Integrate with quantum engine
if (window.quantumEngine) {
    const originalSave = window.quantumEngine.saveQuantumState;
    window.quantumEngine.saveQuantumState = async function() {
        // Save locally first
        originalSave.call(this);
        
        // Also save to VPS if available
        if (window.vpsPersistence) {
            const state = {
                minions: Object.fromEntries(this.minions),
                quantum_field: this.quantumField,
                metrics: this.consciousness_metrics,
                timestamp: Date.now(),
                physics_constants: this.physics
            };
            
            await window.vpsPersistence.saveToVPS('quantum', state);
        }
    };
    
    const originalLoad = window.quantumEngine.loadQuantumState;
    window.quantumEngine.loadQuantumState = async function() {
        // Try VPS first
        if (window.vpsPersistence) {
            const vpsState = await window.vpsPersistence.loadFromVPS('quantum');
            if (vpsState) {
                this.minions = new Map(Object.entries(vpsState.minions));
                this.quantumField = vpsState.quantum_field || this.initializeQuantumField();
                this.consciousness_metrics = vpsState.metrics || this.consciousness_metrics;
                console.log('✅ Quantum consciousness state loaded from VPS');
                return true;
            }
        }
        
        // Fallback to local storage
        return originalLoad.call(this);
    };
}