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
            const response = await fetch(this.statusUrl, { cache: 'no-cache' });
            if (!response.ok) throw new Error('HTTP ' + response.status);
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
            console.warn('⚠️ VPS status unavailable - checking local neural processor:', error);

            // Check if real neural processor is active locally
            const localNeural = window.realNeuralProcessor;
            if (localNeural && localNeural.initialized) {
                const localStatus = localNeural.getStatus();
                return {
                    neural_cluster_active: localStatus.initialized,
                    repositories_installed: localStatus.models.length,
                    total_size_gb: 0,
                    server: 'Local Browser (WebWorkers)',
                    is_real: true,
                    last_updated: new Date().toISOString(),
                    data_source: 'Local Neural Processor',
                    workers: localStatus.workers
                };
            }

            // If no VPS and no local, return honest status
            return {
                neural_cluster_active: false,
                repositories_installed: 0,
                total_size_gb: 0,
                server: 'Not Available',
                is_real: false,
                last_updated: new Date().toISOString(),
                data_source: 'No Neural System',
                error: 'VPS and local neural processor both unavailable'
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
                const loader = window.centralDataLoader;
                const products = loader && loader.get('cerProducts') ? loader.get('cerProducts').length : null;
                const summary = loader ? loader.get('cerSummary') : null;
                const minions = loader && loader.get('minions') ? loader.get('minions').length : null;
                const orchestrator = window.initOrchestrator ? window.initOrchestrator.getStatus() : null;
                const parts = [];
                if (orchestrator) parts.push(`✅ ${orchestrator.ready.length} modules ready`);
                if (products !== null) parts.push(`✅ ${products.toLocaleString()} ${summary && summary.simulated ? 'simulated ' : ''}catalogue products`);
                if (minions !== null) parts.push(`✅ ${minions} minions`);
                parts.push('⚠️ Neural cluster requires a VPS deployment');
                statusElement.innerHTML = `
                    <div style="font-size: 1rem; margin-bottom: 5px;">⚡ <span style="color: #ffaa00;">Local Mode (Browser-Based)</span></div>
                    <div style="font-size: 0.9rem; opacity: 0.9;">${parts.join(' | ')}</div>
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
            console.log('📋 Local mode - VPS status unavailable, using browser systems');
        }
    });

    const interval = (window.SOLARFLOW_CONFIG && window.SOLARFLOW_CONFIG.pollIntervals.statusLoader) || 120000;
    setInterval(() => {
        if (!document.hidden) realStatusLoader.updateSystemStatus();
    }, interval);
});

// Export for global access
window.getRealNeuralStatus = () => realStatusLoader.loadRealStatus();
window.updateNeuralDisplay = () => realStatusLoader.updateSystemStatus();