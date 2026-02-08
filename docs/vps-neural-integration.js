/**
 * SolarFlow VPS Neural Integration
 * Connects GitHub Pages frontend to VPS FastAPI backend
 */

class VPSNeuralConnector {
    constructor() {
        this.vpsUrl = null;  // VPS not currently deployed
        this.connected = false;
        this.lastUpdate = null;
        this.neuralStatus = null;
        this.retryCount = 0;
        this.maxRetries = 3;
        
        console.log('🚀 VPS Neural Connector initialized');
        this.startMonitoring();
    }
    
    async checkConnection() {
        try {
            const response = await fetch(`${this.vpsUrl}/api/health`, {
                method: 'GET',
                mode: 'cors',
                headers: {
                    'Content-Type': 'application/json'
                },
                signal: AbortSignal.timeout(5000)  // 5 second timeout
            });
            
            if (response.ok) {
                const data = await response.json();
                this.connected = true;
                this.retryCount = 0;
                this.lastUpdate = new Date().toISOString();
                console.log('✅ VPS connection healthy:', data);
                return data;
            } else {
                throw new Error(`HTTP ${response.status}`);
            }
        } catch (error) {
            this.connected = false;
            this.retryCount++;
            console.log('❌ VPS connection failed:', error.message);
            return null;
        }
    }
    
    async getNeuralStatus() {
        try {
            const response = await fetch(`${this.vpsUrl}/api/neural/status`, {
                method: 'GET',
                mode: 'cors',
                signal: AbortSignal.timeout(5000)
            });
            
            if (response.ok) {
                const data = await response.json();
                this.neuralStatus = data.neural;
                console.log('📊 Neural status updated:', this.neuralStatus);
                return data;
            } else {
                throw new Error(`HTTP ${response.status}`);
            }
        } catch (error) {
            console.log('⚠️  Neural status failed:', error.message);
            return null;
        }
    }
    
    async getOptimizationMetrics() {
        try {
            const response = await fetch(`${this.vpsUrl}/api/neural/optimization`, {
                method: 'GET',
                mode: 'cors',
                signal: AbortSignal.timeout(5000)
            });
            
            if (response.ok) {
                return await response.json();
            } else {
                throw new Error(`HTTP ${response.status}`);
            }
        } catch (error) {
            console.log('⚠️  Optimization metrics failed:', error.message);
            return null;
        }
    }
    
    async getRepositoryStatus() {
        try {
            const response = await fetch(`${this.vpsUrl}/api/neural/repositories`, {
                method: 'GET',
                mode: 'cors',
                signal: AbortSignal.timeout(5000)
            });
            
            if (response.ok) {
                return await response.json();
            } else {
                throw new Error(`HTTP ${response.status}`);
            }
        } catch (error) {
            console.log('⚠️  Repository status failed:', error.message);
            return null;
        }
    }
    
    async getStandards() {
        try {
            const response = await fetch(`${this.vpsUrl}/api/standards`, {
                method: 'GET',
                mode: 'cors',
                signal: AbortSignal.timeout(10000)  // Longer timeout for standards
            });
            
            if (response.ok) {
                return await response.json();
            } else {
                throw new Error(`HTTP ${response.status}`);
            }
        } catch (error) {
            console.log('⚠️  Standards retrieval failed:', error.message);
            return null;
        }
    }
    
    async getCERProducts() {
        try {
            const response = await fetch(`${this.vpsUrl}/api/cer/products`, {
                method: 'GET',
                mode: 'cors',
                signal: AbortSignal.timeout(10000)  // Longer timeout for products
            });
            
            if (response.ok) {
                return await response.json();
            } else {
                throw new Error(`HTTP ${response.status}`);
            }
        } catch (error) {
            console.log('⚠️  CER products retrieval failed:', error.message);
            return null;
        }
    }
    
    async triggerOptimization() {
        try {
            const response = await fetch(`${this.vpsUrl}/api/neural/optimize`, {
                method: 'POST',
                mode: 'cors',
                headers: {
                    'Content-Type': 'application/json'
                },
                signal: AbortSignal.timeout(10000)
            });
            
            if (response.ok) {
                const data = await response.json();
                console.log('🔧 Neural optimization triggered:', data.message);
                return data;
            } else {
                throw new Error(`HTTP ${response.status}`);
            }
        } catch (error) {
            console.log('⚠️  Optimization trigger failed:', error.message);
            return null;
        }
    }
    
    updateStatusIndicator() {
        // Update the footer status indicator
        const statusElement = document.getElementById('neural-status');
        if (statusElement) {
            if (this.connected && this.neuralStatus) {
                statusElement.innerHTML = `
                    <span style="color: #4ade80;">🟢 VPS Connected</span> |
                    Neural: ${this.neuralStatus.active ? 'Active' : 'Inactive'} |
                    Repos: ${this.neuralStatus.repositories || 0} |
                    Packages: ${this.neuralStatus.packages || 0} |
                    Optimization: ${(this.neuralStatus.optimization_level || 0).toFixed(1)}%
                `;
            } else {
                const retryText = this.retryCount > 0 ? ` (Retry ${this.retryCount}/${this.maxRetries})` : '';
                statusElement.innerHTML = `<span style="color: #f87171;">🔴 VPS Disconnected${retryText}</span>`;
            }
        }
    }
    
    async startMonitoring() {
        console.log('🔄 Starting VPS monitoring...');
        
        // Initial connection check
        await this.checkConnection();
        await this.getNeuralStatus();
        this.updateStatusIndicator();
        
        // Monitor every 30 seconds
        setInterval(async () => {
            await this.checkConnection();
            await this.getNeuralStatus();
            this.updateStatusIndicator();
            
            // Stop retrying if max retries exceeded
            if (this.retryCount >= this.maxRetries) {
                console.log('⏹️  Max retries exceeded, monitoring paused');
                return;
            }
        }, 30000);
        
        console.log('✅ VPS monitoring started');
    }
    
    // Utility methods for the UI
    isConnected() {
        return this.connected;
    }
    
    getConnectionStatus() {
        return {
            connected: this.connected,
            lastUpdate: this.lastUpdate,
            retryCount: this.retryCount,
            neuralActive: this.neuralStatus?.active || false,
            repositories: this.neuralStatus?.repositories || 0,
            packages: this.neuralStatus?.packages || 0,
            optimizationLevel: this.neuralStatus?.optimization_level || 0
        };
    }
}

// Global VPS connector instance
let vpsNeuralConnector;

// Initialize when DOM loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('🌐 Initializing VPS Neural Integration...');
    vpsNeuralConnector = new VPSNeuralConnector();
    
    // Make it globally available
    window.vpsNeuralConnector = vpsNeuralConnector;
    
    // Add status indicator to footer if it exists
    const footer = document.querySelector('footer') || document.querySelector('.footer');
    if (footer && !document.getElementById('neural-status')) {
        const statusDiv = document.createElement('div');
        statusDiv.id = 'neural-status';
        statusDiv.style.cssText = 'margin-top: 10px; font-size: 12px; text-align: center; opacity: 0.8;';
        statusDiv.innerHTML = '<span style="color: #9ca3af;">🔄 Connecting to VPS...</span>';
        footer.appendChild(statusDiv);
    }
});

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VPSNeuralConnector;
}