/**
 * Real Neural Status Loader
 * Loads actual status from VPS server data
 */

class RealStatusLoader {
    constructor() {
        this.statusUrl = './live_neural_status.json';
        this.isReal = true;
    }
    
    async loadRealStatus() {
        try {
            const response = await fetch(this.statusUrl + '?t=' + Date.now());
            const data = await response.json();
            
            console.log('🧠 Real Neural Status Loaded:', data);
            
            return {
                neural_cluster_active: data.neural_cluster_active || false,
                repositories_installed: data.repositories_installed || 0,
                total_size_gb: data.total_size_gb || 0,
                server: data.server || 'Unknown',
                is_real: data.is_real || false,
                last_updated: data.last_updated || 'Unknown',
                data_source: 'VPS Server'
            };
        } catch (error) {
            console.warn('⚠️ Could not load real status, using static mode:', error);
            return {
                neural_cluster_active: false,
                repositories_installed: 0,
                total_size_gb: 0,
                server: 'GitHub Pages (Static)',
                is_real: false,
                last_updated: new Date().toISOString(),
                data_source: 'Static Demo',
                error: 'VPS status unavailable'
            };
        }
    }
    
    async updateSystemStatus() {
        const status = await this.loadRealStatus();
        const statusElement = document.getElementById('system-status');
        
        if (statusElement) {
            if (status.neural_cluster_active && status.is_real) {
                statusElement.innerHTML = `
                    <div style="font-size: 1rem; margin-bottom: 5px;">🧠 <span style="color: #00ff00;">Neural Cluster ACTIVE (${status.server})</span></div>
                    <div style="font-size: 0.9rem; opacity: 0.9;">
                        ✅ ${status.repositories_installed} Repositories Installed (${status.total_size_gb}GB) | ✅ Real VPS Server | Last Updated: ${new Date(status.last_updated).toLocaleTimeString()}
                    </div>
                `;
                statusElement.style.background = 'rgba(0,255,0,0.1)';
                statusElement.style.borderColor = 'rgba(0,255,0,0.3)';
            } else {
                statusElement.innerHTML = `
                    <div style="font-size: 1rem; margin-bottom: 5px;">⚡ <span style="color: #ffaa00;">Static Demo Mode</span></div>
                    <div style="font-size: 0.9rem; opacity: 0.9;">
                        ✅ 18 Core Systems | ✅ 9,247 CER Products | ✅ AS/NZS Standards | ⚠️ Neural cluster requires VPS deployment
                    </div>
                `;
                statusElement.style.background = 'rgba(255,170,0,0.1)';
                statusElement.style.borderColor = 'rgba(255,170,0,0.3)';
            }
        }
        
        return status;
    }
}

// Initialize real status loader
const realStatusLoader = new RealStatusLoader();

// Auto-update status when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔍 Loading real neural status from VPS...');
    
    realStatusLoader.updateSystemStatus().then(status => {
        if (status.is_real && status.neural_cluster_active) {
            console.log('✅ Real neural cluster connected:', status);
        } else {
            console.log('📋 Static demo mode - VPS status unavailable');
        }
    });
    
    // Update status every 60 seconds
    setInterval(() => {
        realStatusLoader.updateSystemStatus();
    }, 60000);
});

// Export for global access
window.getRealNeuralStatus = () => realStatusLoader.loadRealStatus();
window.updateNeuralDisplay = () => realStatusLoader.updateSystemStatus();