/**
 * REAL VPS INTEGRATION - Working Implementation
 * Connects to actual VPS server and provides real statistics
 */

class RealVPSIntegration {
    constructor() {
        // VPS endpoints - Hostinger VPS on port 3000
        this.vpsEndpoint = 'http://76.13.176.135:3000/api';
        this.fallbackEndpoint = 'http://76.13.176.135:3000';
        this.connected = false;
        this.realData = {};
        this.connectionAttempts = 0;
        this.maxAttempts = 3;
        this.healthMetrics = {
            uptime: 0,
            cpuUsage: 0,
            memoryUsage: 0,
            diskSpace: 0,
            networkLatency: 0,
            lastUpdate: 0
        };
        
        this.init();
    }
    
    async init() {
        console.log('🚀 Initializing Real VPS Integration...');
        
        // Try to connect to actual VPS
        await this.attemptConnection();
        
        // Start health monitoring
        this.startHealthMonitoring();
        
        // Setup real-time updates
        this.setupRealTimeUpdates();
    }
    
    async attemptConnection() {
        const endpoints = [this.vpsEndpoint, this.fallbackEndpoint].filter(e => e !== null);
        
        if (endpoints.length === 0) {
            console.log('📊 No VPS endpoints configured - using local monitoring only');
            this.setupLocalRealTimeMonitoring();
            this.updateConnectionStatus(false);
            return false;
        }
        
        for (const endpoint of endpoints) {
            try {
                console.log(`🔌 Attempting connection to ${endpoint}...`);
                
                const response = await fetch(`${endpoint}/health`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Client': 'SolarFlow-v2.2.0'
                    },
                    timeout: 5000
                });
                
                if (response.ok) {
                    const data = await response.json();
                    this.vpsEndpoint = endpoint;
                    this.connected = true;
                    this.realData = data;
                    
                    console.log(`✅ Connected to VPS: ${endpoint}`);
                    console.log(`📊 Server Status:`, data);
                    
                    // Update UI with real connection status
                    this.updateConnectionStatus(true, endpoint);
                    return true;
                }
            } catch (error) {
                console.log(`❌ Failed to connect to ${endpoint}:`, error.message);
                this.connectionAttempts++;
            }
        }
        
        // If all connections failed, setup local simulation with real monitoring
        console.log('⚠️ VPS not accessible, activating local real-time monitoring');
        this.setupLocalRealTimeMonitoring();
        this.updateConnectionStatus(false);
        return false;
    }
    
    setupLocalRealTimeMonitoring() {
        // Create real monitoring that measures actual browser/system performance
        this.realData = {
            server: 'Local Development',
            status: 'operational',
            timestamp: Date.now(),
            metrics: {
                browserPerformance: this.measureBrowserPerformance(),
                localStorage: this.testLocalStorage(),
                apiResponses: this.measureApiResponseTimes(),
                featureTests: this.runFeatureTests()
            }
        };
        
        // Update metrics every 10 seconds with real measurements
        setInterval(() => {
            this.updateRealMetrics();
        }, 10000);
    }
    
    measureBrowserPerformance() {
        const performance = window.performance;
        const navigation = performance.getEntriesByType('navigation')[0];
        
        return {
            pageLoadTime: navigation ? navigation.loadEventEnd - navigation.loadEventStart : 0,
            domContentLoaded: navigation ? navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart : 0,
            memory: performance.memory ? {
                used: performance.memory.usedJSHeapSize,
                total: performance.memory.totalJSHeapSize,
                limit: performance.memory.jsHeapSizeLimit
            } : null,
            timeOrigin: performance.timeOrigin,
            now: performance.now()
        };
    }
    
    testLocalStorage() {
        try {
            const testKey = 'vps-test-' + Date.now();
            const testData = { test: true, timestamp: Date.now() };
            
            // Measure write time
            const writeStart = performance.now();
            localStorage.setItem(testKey, JSON.stringify(testData));
            const writeTime = performance.now() - writeStart;
            
            // Measure read time
            const readStart = performance.now();
            const retrieved = JSON.parse(localStorage.getItem(testKey));
            const readTime = performance.now() - readStart;
            
            // Cleanup
            localStorage.removeItem(testKey);
            
            return {
                available: true,
                writeTime: writeTime,
                readTime: readTime,
                integrity: retrieved.timestamp === testData.timestamp,
                storageUsed: this.calculateStorageUsage()
            };
        } catch (error) {
            return {
                available: false,
                error: error.message
            };
        }
    }
    
    calculateStorageUsage() {
        let total = 0;
        for (let key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
                total += localStorage[key].length + key.length;
            }
        }
        return total;
    }
    
    async measureApiResponseTimes() {
        const apis = [
            './cer-product-database.json',
            './hive_state.json',
            './progress.json'
        ];
        
        const results = {};
        
        for (const api of apis) {
            try {
                const start = performance.now();
                const response = await fetch(api);
                const end = performance.now();
                
                results[api] = {
                    responseTime: end - start,
                    status: response.status,
                    size: response.headers.get('content-length') || 'unknown',
                    available: response.ok
                };
            } catch (error) {
                results[api] = {
                    responseTime: -1,
                    status: 'error',
                    error: error.message,
                    available: false
                };
            }
        }
        
        return results;
    }
    
    runFeatureTests() {
        const features = {
            webWorkers: typeof Worker !== 'undefined',
            indexedDB: typeof indexedDB !== 'undefined',
            webGL: this.testWebGL(),
            geolocation: 'geolocation' in navigator,
            notifications: 'Notification' in window,
            serviceWorker: 'serviceWorker' in navigator,
            webSocket: typeof WebSocket !== 'undefined',
            canvas: this.testCanvas()
        };
        
        const workingFeatures = Object.values(features).filter(f => f).length;
        const totalFeatures = Object.keys(features).length;
        
        return {
            features: features,
            score: (workingFeatures / totalFeatures) * 100,
            working: workingFeatures,
            total: totalFeatures
        };
    }
    
    testWebGL() {
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            return !!gl;
        } catch (e) {
            return false;
        }
    }
    
    testCanvas() {
        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            return !!ctx;
        } catch (e) {
            return false;
        }
    }
    
    updateRealMetrics() {
        // Update with real, current measurements
        this.healthMetrics = {
            uptime: performance.now() / 1000, // Real browser uptime in seconds
            cpuUsage: this.estimateCPUUsage(),
            memoryUsage: this.getMemoryUsage(),
            diskSpace: this.getStorageUsage(),
            networkLatency: this.measureNetworkLatency(),
            lastUpdate: Date.now()
        };
        
        // Update browser performance metrics
        this.realData.metrics.browserPerformance = this.measureBrowserPerformance();
        this.realData.metrics.featureTests = this.runFeatureTests();
        this.realData.timestamp = Date.now();
        
        // Broadcast real data update
        window.dispatchEvent(new CustomEvent('vps-data-update', {
            detail: this.realData
        }));
    }
    
    estimateCPUUsage() {
        // Measure JavaScript execution time to estimate CPU load
        const start = performance.now();
        let iterations = 0;
        const testStart = performance.now();
        
        // Run a standardized computation
        while (performance.now() - testStart < 10) { // 10ms test window
            Math.sqrt(Math.random() * 1000);
            iterations++;
        }
        
        const end = performance.now();
        const executionTime = end - start;
        
        // Convert to approximate CPU percentage (rough estimate)
        const baselineIterations = 50000; // Calibrated baseline
        const efficiency = iterations / baselineIterations;
        
        return Math.min(100, Math.max(0, 100 - (efficiency * 100)));
    }
    
    getMemoryUsage() {
        if (performance.memory) {
            return (performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit) * 100;
        }
        return 0;
    }
    
    getStorageUsage() {
        try {
            const usage = this.calculateStorageUsage();
            const quota = 5 * 1024 * 1024; // Estimate 5MB quota
            return (usage / quota) * 100;
        } catch (e) {
            return 0;
        }
    }
    
    async measureNetworkLatency() {
        try {
            const start = performance.now();
            await fetch('./progress.json', { cache: 'no-cache' });
            return performance.now() - start;
        } catch (e) {
            return -1;
        }
    }
    
    startHealthMonitoring() {
        // Monitor real system health every 30 seconds
        setInterval(() => {
            this.updateRealMetrics();
            this.checkSystemHealth();
        }, 30000);
    }
    
    checkSystemHealth() {
        const metrics = this.healthMetrics;
        const issues = [];
        
        if (metrics.memoryUsage > 90) issues.push('High memory usage');
        if (metrics.networkLatency > 1000) issues.push('High network latency');
        if (metrics.diskSpace > 80) issues.push('Storage nearly full');
        
        const health = {
            status: issues.length === 0 ? 'healthy' : issues.length < 3 ? 'warning' : 'critical',
            issues: issues,
            score: this.calculateHealthScore(),
            timestamp: Date.now()
        };
        
        // Update UI with real health status
        window.dispatchEvent(new CustomEvent('system-health-update', {
            detail: health
        }));
    }
    
    calculateHealthScore() {
        const metrics = this.healthMetrics;
        let score = 100;
        
        // Deduct points for poor performance
        if (metrics.memoryUsage > 80) score -= 20;
        if (metrics.networkLatency > 500) score -= 15;
        if (metrics.diskSpace > 70) score -= 10;
        
        return Math.max(0, score);
    }
    
    setupRealTimeUpdates() {
        // Try to establish WebSocket connection for real-time updates
        if (this.connected) {
            try {
                const wsUrl = this.vpsEndpoint.replace('http', 'ws') + '/ws';
                const ws = new WebSocket(wsUrl);
                
                ws.onopen = () => {
                    console.log('🔄 Real-time WebSocket connection established');
                };
                
                ws.onmessage = (event) => {
                    const data = JSON.parse(event.data);
                    this.realData = { ...this.realData, ...data };
                    
                    // Broadcast real-time update
                    window.dispatchEvent(new CustomEvent('vps-realtime-update', {
                        detail: data
                    }));
                };
                
                ws.onerror = (error) => {
                    console.log('⚠️ WebSocket error, falling back to polling');
                    this.setupPolling();
                };
                
            } catch (error) {
                console.log('⚠️ WebSocket not supported, using polling');
                this.setupPolling();
            }
        } else {
            // Setup local real-time monitoring
            console.log('📊 Starting local real-time monitoring');
            this.setupPolling();
        }
    }
    
    setupPolling() {
        // Poll for updates every 60 seconds
        setInterval(() => {
            this.updateRealMetrics();
        }, 60000);
    }
    
    updateConnectionStatus(connected, endpoint = 'local') {
        const status = {
            connected: connected,
            endpoint: endpoint,
            timestamp: Date.now()
        };
        
        // Update all connection status displays
        document.querySelectorAll('.vps-connection-status').forEach(el => {
            el.textContent = connected ? `✅ Connected: ${endpoint}` : '⚠️ Local Mode';
            el.className = `vps-connection-status ${connected ? 'connected' : 'local'}`;
        });
        
        // Broadcast connection status
        window.dispatchEvent(new CustomEvent('vps-connection-status', {
            detail: status
        }));
    }
    
    // Public API
    getHealthMetrics() {
        return { ...this.healthMetrics };
    }
    
    getRealData() {
        return { ...this.realData };
    }
    
    isConnected() {
        return this.connected;
    }
    
    async testFeature(featureName) {
        // Test individual features and return real results
        switch (featureName) {
            case 'storage':
                return this.testLocalStorage();
            case 'performance':
                return this.measureBrowserPerformance();
            case 'network':
                return await this.measureApiResponseTimes();
            default:
                return { error: 'Unknown feature' };
        }
    }
}

// Initialize real VPS integration
console.log('🚀 Loading Real VPS Integration...');
window.realVPS = new RealVPSIntegration();

// Export for other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RealVPSIntegration;
}