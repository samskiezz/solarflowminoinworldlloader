/**
 * REAL VPS INTEGRATION
 * Connects to the optional VPS/API backend when one is reachable, and
 * otherwise measures real browser-side metrics ("local mode").
 *
 * The backend URL comes from solarflow-config.js. On https pages an http://
 * backend is never attempted (the browser would block it as mixed content).
 */

class RealVPSIntegration {
    constructor() {
        const config = window.SOLARFLOW_CONFIG || null;
        this.config = config;
        this.vpsEndpoint = config ? config.getVpsUrl() : null;
        this.inactiveReason = config && config.vps ? config.vps.reason : 'solarflow-config.js not loaded';
        this.connected = false;
        this.realData = {};
        this.connectionAttempts = 0;
        this.maxAttempts = config ? config.maxVpsAttempts : 3;
        this.pollInterval = config ? config.pollIntervals.vpsHealth : 60000;
        this.timers = [];
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
        await this.attemptConnection();
        this.startHealthMonitoring();
        this.setupRealTimeUpdates();
    }

    _timer(fn, ms) {
        const id = setInterval(fn, ms);
        this.timers.push(id);
        return id;
    }

    async fetchWithTimeout(url, options = {}, timeoutMs = 5000) {
        const signal = typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? AbortSignal.timeout(timeoutMs) : undefined;
        return fetch(url, { ...options, signal });
    }

    async attemptConnection() {
        if (!this.vpsEndpoint) {
            console.log(`📊 VPS integration in local mode: ${this.inactiveReason}`);
            this.setupLocalRealTimeMonitoring();
            this.updateConnectionStatus(false);
            return false;
        }

        this.connectionAttempts++;
        try {
            console.log(`🔌 Attempting connection to ${this.vpsEndpoint} (attempt ${this.connectionAttempts}/${this.maxAttempts})...`);
            const response = await this.fetchWithTimeout(`${this.vpsEndpoint}/api/health`, {
                method: 'GET',
                headers: { 'Accept': 'application/json', 'X-Client': 'SolarFlow-' + ((this.config && this.config.version) || 'unknown') }
            });

            if (response.ok) {
                const data = await response.json();
                this.connected = true;
                this.connectionAttempts = 0;
                this.realData = data;
                console.log(`✅ Connected to VPS: ${this.vpsEndpoint}`);
                this.updateConnectionStatus(true, this.vpsEndpoint);
                return true;
            }
            throw new Error(`HTTP ${response.status}`);
        } catch (error) {
            console.log(`❌ VPS connection failed: ${error.message}`);
        }

        this.connected = false;
        if (this.connectionAttempts >= this.maxAttempts) {
            this.inactiveReason = `VPS unreachable after ${this.maxAttempts} attempts`;
            console.log(`⚠️ ${this.inactiveReason}; staying in local mode`);
        }
        if (!this.realData.metrics) this.setupLocalRealTimeMonitoring();
        this.updateConnectionStatus(false);
        return false;
    }

    setupLocalRealTimeMonitoring() {
        this.realData = {
            server: 'Local (browser)',
            status: 'operational',
            timestamp: Date.now(),
            metrics: {
                browserPerformance: this.measureBrowserPerformance(),
                localStorage: this.testLocalStorage(),
                apiResponses: {},
                featureTests: this.runFeatureTests()
            }
        };
        this.measureApiResponseTimes().then((results) => { this.realData.metrics.apiResponses = results; });
    }

    measureBrowserPerformance() {
        const navigation = performance.getEntriesByType('navigation')[0];
        return {
            pageLoadTime: navigation ? Math.round(navigation.loadEventEnd - navigation.startTime) : 0,
            domContentLoaded: navigation ? Math.round(navigation.domContentLoadedEventEnd - navigation.startTime) : 0,
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
            const writeStart = performance.now();
            localStorage.setItem(testKey, JSON.stringify(testData));
            const writeTime = performance.now() - writeStart;
            const readStart = performance.now();
            const retrieved = JSON.parse(localStorage.getItem(testKey));
            const readTime = performance.now() - readStart;
            localStorage.removeItem(testKey);
            return { available: true, writeTime, readTime, integrity: retrieved.timestamp === testData.timestamp, storageUsed: this.calculateStorageUsage() };
        } catch (error) {
            return { available: false, error: error.message };
        }
    }

    calculateStorageUsage() {
        let total = 0;
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            total += key.length + (localStorage.getItem(key) || '').length;
        }
        return total;
    }

    async measureApiResponseTimes() {
        // Small files only: the product catalogue is several megabytes and
        // must never be downloaded just to measure latency.
        const apis = ['./progress.json', './minions.json', './cer-product-summary.json'];
        const results = {};
        for (const api of apis) {
            try {
                const start = performance.now();
                const response = await fetch(api, { cache: 'no-cache' });
                results[api] = { responseTime: Math.round(performance.now() - start), status: response.status, available: response.ok };
            } catch (error) {
                results[api] = { responseTime: -1, status: 'error', error: error.message, available: false };
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
        const working = Object.values(features).filter(Boolean).length;
        const total = Object.keys(features).length;
        return { features, score: (working / total) * 100, working, total };
    }

    testWebGL() {
        try {
            const canvas = document.createElement('canvas');
            return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
        } catch (e) {
            return false;
        }
    }

    testCanvas() {
        try {
            return !!document.createElement('canvas').getContext('2d');
        } catch (e) {
            return false;
        }
    }

    async updateRealMetrics() {
        this.healthMetrics = {
            uptime: performance.now() / 1000,
            cpuUsage: this.estimateCPUUsage(),
            memoryUsage: this.getMemoryUsage(),
            diskSpace: this.getStorageUsage(),
            networkLatency: await this.measureNetworkLatency(),
            lastUpdate: Date.now()
        };

        if (this.realData.metrics) {
            this.realData.metrics.browserPerformance = this.measureBrowserPerformance();
            this.realData.metrics.featureTests = this.runFeatureTests();
        }
        this.realData.timestamp = Date.now();

        window.dispatchEvent(new CustomEvent('vps-data-update', { detail: this.realData }));
    }

    estimateCPUUsage() {
        // Rough busy-loop calibration: how many iterations fit in 10ms.
        let iterations = 0;
        const testStart = performance.now();
        while (performance.now() - testStart < 10) {
            Math.sqrt(Math.random() * 1000);
            iterations++;
        }
        const baselineIterations = 50000;
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
            const quota = 5 * 1024 * 1024;
            return (this.calculateStorageUsage() / quota) * 100;
        } catch (e) {
            return 0;
        }
    }

    async measureNetworkLatency() {
        try {
            const start = performance.now();
            await fetch('./progress.json', { cache: 'no-cache', method: 'HEAD' });
            return Math.round(performance.now() - start);
        } catch (e) {
            return -1;
        }
    }

    startHealthMonitoring() {
        this._timer(() => {
            this.updateRealMetrics().then(() => this.checkSystemHealth());
        }, this.pollInterval);
    }

    checkSystemHealth() {
        const metrics = this.healthMetrics;
        const issues = [];
        if (metrics.memoryUsage > 90) issues.push('High memory usage');
        if (metrics.networkLatency > 1000) issues.push('High network latency');
        if (metrics.diskSpace > 80) issues.push('Storage nearly full');

        window.dispatchEvent(new CustomEvent('system-health-update', {
            detail: {
                status: issues.length === 0 ? 'healthy' : issues.length < 3 ? 'warning' : 'critical',
                issues,
                score: this.calculateHealthScore(),
                timestamp: Date.now()
            }
        }));
    }

    calculateHealthScore() {
        const metrics = this.healthMetrics;
        let score = 100;
        if (metrics.memoryUsage > 80) score -= 20;
        if (metrics.networkLatency > 500) score -= 15;
        if (metrics.diskSpace > 70) score -= 10;
        return Math.max(0, score);
    }

    setupRealTimeUpdates() {
        if (this.connected) {
            try {
                const ws = new WebSocket(this.vpsEndpoint.replace(/^http/, 'ws') + '/ws');
                ws.onopen = () => console.log('🔄 Real-time WebSocket connection established');
                ws.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        this.realData = { ...this.realData, ...data };
                        window.dispatchEvent(new CustomEvent('vps-realtime-update', { detail: data }));
                    } catch (error) {
                        console.warn('Ignoring malformed WebSocket message');
                    }
                };
                ws.onerror = () => {
                    console.log('⚠️ WebSocket error, falling back to polling');
                    this.setupPolling();
                };
                ws.onclose = () => { this.connected = false; this.updateConnectionStatus(false); };
                this.ws = ws;
                return;
            } catch (error) {
                console.log('⚠️ WebSocket not supported, using polling');
            }
        }
        this.setupPolling();
    }

    setupPolling() {
        if (this.pollingTimer) return;
        this.pollingTimer = this._timer(async () => {
            // Retry the VPS a limited number of times, then stop spending bandwidth.
            if (this.vpsEndpoint && !this.connected && this.connectionAttempts < this.maxAttempts) {
                await this.attemptConnection();
            }
        }, this.pollInterval);
    }

    updateConnectionStatus(connected, endpoint = 'local') {
        document.querySelectorAll('.vps-connection-status').forEach(el => {
            el.textContent = connected ? `✅ Connected: ${endpoint}` : '⚠️ Local Mode';
            el.className = `vps-connection-status ${connected ? 'connected' : 'local'}`;
        });
        window.dispatchEvent(new CustomEvent('vps-connection-status', {
            detail: { connected, endpoint, reason: connected ? null : this.inactiveReason, timestamp: Date.now() }
        }));
    }

    // Public API
    getHealthMetrics() { return { ...this.healthMetrics }; }
    getRealData() { return { ...this.realData }; }
    isConnected() { return this.connected; }
    getStatusText() { return this.connected ? `connected to ${this.vpsEndpoint}` : this.inactiveReason; }

    async testFeature(featureName) {
        switch (featureName) {
            case 'storage': return this.testLocalStorage();
            case 'performance': return this.measureBrowserPerformance();
            case 'network': return await this.measureApiResponseTimes();
            default: return { error: 'Unknown feature' };
        }
    }

    shutdown() {
        this.timers.forEach(clearInterval);
        this.timers = [];
        if (this.ws) this.ws.close();
    }
}

console.log('🚀 Loading Real VPS Integration...');
window.realVPS = new RealVPSIntegration();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = RealVPSIntegration;
}
