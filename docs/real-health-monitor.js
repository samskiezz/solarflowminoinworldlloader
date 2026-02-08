/**
 * REAL HEALTH MONITOR - Actual System Monitoring
 * Provides real health statistics based on actual measurements
 */

class RealHealthMonitor {
    constructor() {
        this.metrics = {};
        this.history = [];
        this.alerts = [];
        this.monitoring = false;
        this.updateInterval = 15000; // 15 seconds
        this.maxHistory = 100; // Keep last 100 measurements
        
        this.init();
    }
    
    init() {
        console.log('🔍 Initializing Real Health Monitor...');
        this.startMonitoring();
        this.setupEventListeners();
    }
    
    startMonitoring() {
        if (this.monitoring) return;
        
        this.monitoring = true;
        console.log('📊 Starting real-time health monitoring');
        
        // Initial measurement
        this.updateMetrics();
        
        // Regular monitoring
        this.monitoringInterval = setInterval(() => {
            this.updateMetrics();
        }, this.updateInterval);
    }
    
    stopMonitoring() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoring = false;
            console.log('⏹️ Health monitoring stopped');
        }
    }
    
    updateMetrics() {
        const timestamp = Date.now();
        
        // Collect real metrics
        const metrics = {
            timestamp: timestamp,
            browser: this.getBrowserMetrics(),
            performance: this.getPerformanceMetrics(),
            storage: this.getStorageMetrics(),
            network: this.getNetworkMetrics(),
            features: this.getFeatureMetrics(),
            system: this.getSystemMetrics()
        };
        
        // Calculate health scores
        metrics.healthScores = this.calculateHealthScores(metrics);
        metrics.overallHealth = this.calculateOverallHealth(metrics.healthScores);
        
        // Store current metrics
        this.metrics = metrics;
        
        // Add to history
        this.history.push(metrics);
        if (this.history.length > this.maxHistory) {
            this.history.shift();
        }
        
        // Check for alerts
        this.checkAlerts(metrics);
        
        // Broadcast update
        this.broadcastUpdate(metrics);
        
        return metrics;
    }
    
    getBrowserMetrics() {
        const nav = navigator;
        const perf = performance;
        
        return {
            userAgent: nav.userAgent,
            platform: nav.platform,
            language: nav.language,
            onLine: nav.onLine,
            cookieEnabled: nav.cookieEnabled,
            javaEnabled: nav.javaEnabled ? nav.javaEnabled() : false,
            hardwareConcurrency: nav.hardwareConcurrency || 1,
            deviceMemory: nav.deviceMemory || 'unknown',
            connection: nav.connection ? {
                effectiveType: nav.connection.effectiveType,
                downlink: nav.connection.downlink,
                rtt: nav.connection.rtt
            } : null
        };
    }
    
    getPerformanceMetrics() {
        const perf = performance;
        const timing = perf.timing;
        const navigation = perf.getEntriesByType('navigation')[0];
        
        const metrics = {
            timeOrigin: perf.timeOrigin,
            now: perf.now(),
            navigationStart: timing.navigationStart,
            loadComplete: timing.loadEventEnd - timing.navigationStart,
            domContentLoaded: timing.domContentLoadedEventEnd - timing.domContentLoadedEventStart,
            firstPaint: 0,
            firstContentfulPaint: 0
        };
        
        // Get paint timing
        const paintEntries = perf.getEntriesByType('paint');
        paintEntries.forEach(entry => {
            if (entry.name === 'first-paint') {
                metrics.firstPaint = entry.startTime;
            } else if (entry.name === 'first-contentful-paint') {
                metrics.firstContentfulPaint = entry.startTime;
            }
        });
        
        // Memory metrics
        if (perf.memory) {
            metrics.memory = {
                used: perf.memory.usedJSHeapSize,
                total: perf.memory.totalJSHeapSize,
                limit: perf.memory.jsHeapSizeLimit,
                usagePercent: (perf.memory.usedJSHeapSize / perf.memory.jsHeapSizeLimit) * 100
            };
        }
        
        return metrics;
    }
    
    getStorageMetrics() {
        const metrics = {
            localStorage: this.testStorage('localStorage'),
            sessionStorage: this.testStorage('sessionStorage'),
            indexedDB: this.testIndexedDB(),
            total: 0
        };
        
        // Calculate total usage
        metrics.total = (metrics.localStorage.used || 0) + (metrics.sessionStorage.used || 0);
        
        return metrics;
    }
    
    testStorage(storageType) {
        try {
            const storage = window[storageType];
            if (!storage) return { available: false, error: 'Not supported' };
            
            // Calculate current usage
            let used = 0;
            for (let key in storage) {
                if (storage.hasOwnProperty(key)) {
                    used += (storage[key].length + key.length) * 2; // Rough estimate in bytes
                }
            }
            
            // Test write capability
            const testKey = `health-test-${Date.now()}`;
            const testValue = 'test-data';
            const writeStart = performance.now();
            storage.setItem(testKey, testValue);
            const writeTime = performance.now() - writeStart;
            
            // Test read capability
            const readStart = performance.now();
            const readValue = storage.getItem(testKey);
            const readTime = performance.now() - readStart;
            
            // Cleanup
            storage.removeItem(testKey);
            
            return {
                available: true,
                used: used,
                writeTime: writeTime,
                readTime: readTime,
                integrity: readValue === testValue,
                itemCount: storage.length
            };
            
        } catch (error) {
            return {
                available: false,
                error: error.message
            };
        }
    }
    
    testIndexedDB() {
        if (typeof indexedDB === 'undefined') {
            return { available: false, error: 'Not supported' };
        }
        
        try {
            // Basic IndexedDB availability test
            return {
                available: true,
                supported: true
            };
        } catch (error) {
            return {
                available: false,
                error: error.message
            };
        }
    }
    
    async getNetworkMetrics() {
        const metrics = {
            onLine: navigator.onLine,
            connection: navigator.connection ? {
                effectiveType: navigator.connection.effectiveType,
                downlink: navigator.connection.downlink,
                rtt: navigator.connection.rtt,
                saveData: navigator.connection.saveData
            } : null,
            latency: 0,
            throughput: 0,
            apis: {}
        };
        
        // Test API response times
        const testApis = [
            './progress.json',
            './cer-product-database.json',
            './hive_state.json'
        ];
        
        for (const api of testApis) {
            try {
                const start = performance.now();
                const response = await fetch(api, { cache: 'no-cache' });
                const end = performance.now();
                
                metrics.apis[api] = {
                    responseTime: end - start,
                    status: response.status,
                    ok: response.ok,
                    size: response.headers.get('content-length')
                };
                
                // Update average latency
                if (response.ok) {
                    metrics.latency = (metrics.latency + (end - start)) / 2;
                }
                
            } catch (error) {
                metrics.apis[api] = {
                    error: error.message,
                    status: 'failed'
                };
            }
        }
        
        return metrics;
    }
    
    getFeatureMetrics() {
        const features = {
            webWorkers: typeof Worker !== 'undefined',
            serviceWorker: 'serviceWorker' in navigator,
            webGL: this.testWebGL(),
            webGL2: this.testWebGL2(),
            canvas: this.testCanvas(),
            webRTC: 'RTCPeerConnection' in window,
            geolocation: 'geolocation' in navigator,
            notifications: 'Notification' in window,
            fullscreen: 'fullscreenEnabled' in document,
            webSocket: typeof WebSocket !== 'undefined',
            fetch: typeof fetch !== 'undefined',
            promises: typeof Promise !== 'undefined',
            asyncAwait: this.testAsyncAwait(),
            localStorage: typeof Storage !== 'undefined',
            indexedDB: typeof indexedDB !== 'undefined',
            webAssembly: typeof WebAssembly !== 'undefined'
        };
        
        const supported = Object.values(features).filter(Boolean).length;
        const total = Object.keys(features).length;
        
        return {
            features: features,
            supported: supported,
            total: total,
            supportPercent: (supported / total) * 100
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
    
    testWebGL2() {
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl2');
            return !!gl;
        } catch (e) {
            return false;
        }
    }
    
    testCanvas() {
        try {
            const canvas = document.createElement('canvas');
            return !!(canvas.getContext && canvas.getContext('2d'));
        } catch (e) {
            return false;
        }
    }
    
    testAsyncAwait() {
        try {
            eval('(async () => {})');
            return true;
        } catch (e) {
            return false;
        }
    }
    
    getSystemMetrics() {
        const metrics = {
            timestamp: Date.now(),
            uptime: performance.now() / 1000,
            url: window.location.href,
            referrer: document.referrer,
            title: document.title,
            readyState: document.readyState,
            visibilityState: document.visibilityState,
            hidden: document.hidden
        };
        
        // Screen metrics
        if (screen) {
            metrics.screen = {
                width: screen.width,
                height: screen.height,
                availWidth: screen.availWidth,
                availHeight: screen.availHeight,
                colorDepth: screen.colorDepth,
                pixelDepth: screen.pixelDepth,
                orientation: screen.orientation ? screen.orientation.type : 'unknown'
            };
        }
        
        // Viewport metrics
        metrics.viewport = {
            width: window.innerWidth,
            height: window.innerHeight,
            devicePixelRatio: window.devicePixelRatio
        };
        
        return metrics;
    }
    
    calculateHealthScores(metrics) {
        const scores = {};
        
        // Performance score (0-100)
        let perfScore = 100;
        if (metrics.performance.memory) {
            const memUsage = metrics.performance.memory.usagePercent;
            if (memUsage > 80) perfScore -= 30;
            else if (memUsage > 60) perfScore -= 15;
            else if (memUsage > 40) perfScore -= 5;
        }
        
        if (metrics.performance.loadComplete > 5000) perfScore -= 20; // Slow load
        if (metrics.performance.firstContentfulPaint > 3000) perfScore -= 10; // Slow FCP
        
        scores.performance = Math.max(0, perfScore);
        
        // Storage score (0-100)
        let storageScore = 100;
        if (!metrics.storage.localStorage.available) storageScore -= 50;
        if (!metrics.storage.sessionStorage.available) storageScore -= 30;
        if (!metrics.storage.indexedDB.available) storageScore -= 20;
        
        scores.storage = Math.max(0, storageScore);
        
        // Network score (0-100)
        let networkScore = navigator.onLine ? 100 : 0;
        if (metrics.network.latency > 1000) networkScore -= 30;
        else if (metrics.network.latency > 500) networkScore -= 15;
        
        scores.network = Math.max(0, networkScore);
        
        // Feature support score (0-100)
        scores.features = metrics.features.supportPercent;
        
        return scores;
    }
    
    calculateOverallHealth(scores) {
        const weights = {
            performance: 0.3,
            storage: 0.2,
            network: 0.2,
            features: 0.3
        };
        
        let overallScore = 0;
        for (const [metric, score] of Object.entries(scores)) {
            overallScore += score * (weights[metric] || 0);
        }
        
        // Determine health status
        let status, color;
        if (overallScore >= 80) {
            status = 'excellent';
            color = '#4caf50';
        } else if (overallScore >= 60) {
            status = 'good';
            color = '#8bc34a';
        } else if (overallScore >= 40) {
            status = 'fair';
            color = '#ff9800';
        } else if (overallScore >= 20) {
            status = 'poor';
            color = '#f44336';
        } else {
            status = 'critical';
            color = '#d32f2f';
        }
        
        return {
            score: Math.round(overallScore),
            status: status,
            color: color,
            timestamp: Date.now()
        };
    }
    
    checkAlerts(metrics) {
        const newAlerts = [];
        
        // Memory usage alert
        if (metrics.performance.memory && metrics.performance.memory.usagePercent > 90) {
            newAlerts.push({
                type: 'warning',
                message: `High memory usage: ${Math.round(metrics.performance.memory.usagePercent)}%`,
                timestamp: Date.now()
            });
        }
        
        // Network alert
        if (!navigator.onLine) {
            newAlerts.push({
                type: 'error',
                message: 'Network connection lost',
                timestamp: Date.now()
            });
        } else if (metrics.network.latency > 2000) {
            newAlerts.push({
                type: 'warning',
                message: `High network latency: ${Math.round(metrics.network.latency)}ms`,
                timestamp: Date.now()
            });
        }
        
        // Storage alerts
        if (!metrics.storage.localStorage.available) {
            newAlerts.push({
                type: 'error',
                message: 'LocalStorage not available',
                timestamp: Date.now()
            });
        }
        
        // Add new alerts
        this.alerts = [...newAlerts, ...this.alerts.slice(0, 9)]; // Keep last 10 alerts
    }
    
    broadcastUpdate(metrics) {
        // Broadcast to all listening components
        window.dispatchEvent(new CustomEvent('health-metrics-update', {
            detail: metrics
        }));
        
        // Update specific UI elements
        this.updateUI(metrics);
    }
    
    updateUI(metrics) {
        // Update health score displays
        document.querySelectorAll('.health-score').forEach(el => {
            el.textContent = metrics.overallHealth.score + '%';
            el.style.color = metrics.overallHealth.color;
        });
        
        // Update health status displays
        document.querySelectorAll('.health-status').forEach(el => {
            el.textContent = metrics.overallHealth.status.toUpperCase();
            el.style.color = metrics.overallHealth.color;
        });
        
        // Update progress bars
        document.querySelectorAll('.health-progress-bar').forEach(el => {
            const fill = el.querySelector('.progress-fill') || el;
            fill.style.width = metrics.overallHealth.score + '%';
            fill.style.backgroundColor = metrics.overallHealth.color;
        });
        
        // Update individual metric displays
        for (const [metric, score] of Object.entries(metrics.healthScores)) {
            const elements = document.querySelectorAll(`[data-metric="${metric}"]`);
            elements.forEach(el => {
                el.textContent = Math.round(score) + '%';
            });
        }
    }
    
    setupEventListeners() {
        // Listen for page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.monitoring) {
                // Page became visible, update metrics immediately
                this.updateMetrics();
            }
        });
        
        // Listen for online/offline events
        window.addEventListener('online', () => {
            this.updateMetrics();
        });
        
        window.addEventListener('offline', () => {
            this.updateMetrics();
        });
    }
    
    // Public API
    getCurrentMetrics() {
        return { ...this.metrics };
    }
    
    getHistory() {
        return [...this.history];
    }
    
    getAlerts() {
        return [...this.alerts];
    }
    
    clearAlerts() {
        this.alerts = [];
    }
    
    generateReport() {
        const metrics = this.getCurrentMetrics();
        const timestamp = new Date().toLocaleString();
        
        return {
            title: 'Real System Health Report',
            timestamp: timestamp,
            overall: metrics.overallHealth,
            scores: metrics.healthScores,
            details: {
                performance: metrics.performance,
                storage: metrics.storage,
                network: metrics.network,
                features: metrics.features,
                browser: metrics.browser,
                system: metrics.system
            },
            alerts: this.getAlerts(),
            recommendations: this.generateRecommendations(metrics)
        };
    }
    
    generateRecommendations(metrics) {
        const recommendations = [];
        
        if (metrics.healthScores.performance < 70) {
            recommendations.push('Consider closing unused browser tabs to improve performance');
        }
        
        if (!metrics.storage.localStorage.available) {
            recommendations.push('Enable localStorage for full functionality');
        }
        
        if (metrics.healthScores.network < 50) {
            recommendations.push('Check network connection for optimal experience');
        }
        
        if (metrics.features.supportPercent < 80) {
            recommendations.push('Update browser for better feature support');
        }
        
        return recommendations;
    }
}

// Initialize real health monitor
console.log('🔍 Loading Real Health Monitor...');
window.realHealthMonitor = new RealHealthMonitor();

// Export for other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RealHealthMonitor;
}