/**
 * PERFORMANCE MONITOR
 * Track and optimize system performance
 */

class PerformanceMonitor {
    constructor() {
        this.metrics = {
            pageLoad: 0,
            apiCalls: [],
            renderTimes: [],
            memorySnapshots: [],
            slowOperations: []
        };
        
        this.thresholds = {
            slowRender: 16, // 60fps = 16.67ms per frame
            slowAPI: 1000,  // 1 second
            highMemory: 50  // 50% of heap
        };
        
        this.initialized = false;
        console.log('📊 Performance Monitor initialized');
    }
    
    init() {
        if (this.initialized) return;
        
        // Capture page load performance
        this.capturePageLoad();
        
        // Start monitoring
        this.startMemoryMonitoring();
        this.monitorLongTasks();
        
        this.initialized = true;
        console.log('✅ Performance monitoring active');
    }
    
    capturePageLoad() {
        if (!window.performance || !window.performance.timing) {
            console.warn('⚠️ Performance API not available');
            return;
        }
        
        const timing = performance.timing;
        const navigation = performance.getEntriesByType('navigation')[0];
        
        this.metrics.pageLoad = {
            dns: timing.domainLookupEnd - timing.domainLookupStart,
            tcp: timing.connectEnd - timing.connectStart,
            request: timing.responseStart - timing.requestStart,
            response: timing.responseEnd - timing.responseStart,
            domParse: timing.domInteractive - timing.domLoading,
            domReady: timing.domContentLoadedEventEnd - timing.navigationStart,
            fullLoad: timing.loadEventEnd - timing.navigationStart,
            type: navigation ? navigation.type : 'unknown'
        };
        
        console.log('📊 Page Load Metrics:', this.metrics.pageLoad);
    }
    
    // Measure API call performance
    measureAPICall(name, promise) {
        const start = performance.now();
        
        return promise.then(
            result => {
                const duration = performance.now() - start;
                this.recordAPICall(name, duration, true);
                return result;
            },
            error => {
                const duration = performance.now() - start;
                this.recordAPICall(name, duration, false);
                throw error;
            }
        );
    }
    
    recordAPICall(name, duration, success) {
        const record = {
            name: name,
            duration: duration,
            success: success,
            timestamp: Date.now()
        };
        
        this.metrics.apiCalls.push(record);
        
        // Keep only last 100 calls
        if (this.metrics.apiCalls.length > 100) {
            this.metrics.apiCalls.shift();
        }
        
        // Log slow API calls
        if (duration > this.thresholds.slowAPI) {
            console.warn(`🐌 Slow API call: ${name} took ${duration.toFixed(0)}ms`);
            this.metrics.slowOperations.push({
                type: 'api',
                name: name,
                duration: duration,
                timestamp: Date.now()
            });
        }
    }
    
    // Measure render performance
    measureRender(name, fn) {
        const start = performance.now();
        
        try {
            const result = fn();
            const duration = performance.now() - start;
            this.recordRender(name, duration);
            return result;
        } catch (error) {
            const duration = performance.now() - start;
            this.recordRender(name, duration);
            throw error;
        }
    }
    
    recordRender(name, duration) {
        const record = {
            name: name,
            duration: duration,
            timestamp: Date.now()
        };
        
        this.metrics.renderTimes.push(record);
        
        // Keep only last 100 renders
        if (this.metrics.renderTimes.length > 100) {
            this.metrics.renderTimes.shift();
        }
        
        // Log slow renders
        if (duration > this.thresholds.slowRender) {
            console.warn(`🐌 Slow render: ${name} took ${duration.toFixed(1)}ms (target: ${this.thresholds.slowRender}ms)`);
            this.metrics.slowOperations.push({
                type: 'render',
                name: name,
                duration: duration,
                timestamp: Date.now()
            });
        }
    }
    
    // Monitor memory usage
    startMemoryMonitoring() {
        if (!performance.memory) {
            console.warn('⚠️ Memory monitoring not available');
            return;
        }
        
        // Clear existing interval if any
        if (this.memoryMonitorInterval) {
            clearInterval(this.memoryMonitorInterval);
        }
        
        // Sample memory every 30 seconds
        this.memoryMonitorInterval = setInterval(() => {
            const snapshot = {
                used: performance.memory.usedJSHeapSize,
                total: performance.memory.totalJSHeapSize,
                limit: performance.memory.jsHeapSizeLimit,
                percentage: (performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit) * 100,
                timestamp: Date.now()
            };
            
            this.metrics.memorySnapshots.push(snapshot);
            
            // Keep only last 100 snapshots
            if (this.metrics.memorySnapshots.length > 100) {
                this.metrics.memorySnapshots.shift();
            }
            
            // Warn on high memory usage
            if (snapshot.percentage > this.thresholds.highMemory) {
                console.warn(`⚠️ High memory usage: ${snapshot.percentage.toFixed(1)}%`);
            }
        }, 30000);
    }
    
    // Monitor long tasks
    monitorLongTasks() {
        if (!window.PerformanceObserver) {
            console.warn('⚠️ PerformanceObserver not available');
            return;
        }
        
        try {
            const observer = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    console.warn(`🐌 Long task detected: ${entry.duration.toFixed(0)}ms`);
                    this.metrics.slowOperations.push({
                        type: 'long-task',
                        name: entry.name,
                        duration: entry.duration,
                        timestamp: Date.now()
                    });
                }
            });
            
            observer.observe({ entryTypes: ['longtask'] });
        } catch (error) {
            // longtask type not supported in all browsers
            console.warn('⚠️ Long task monitoring not supported');
        }
    }
    
    // Get performance summary
    getSummary() {
        const apiCalls = this.metrics.apiCalls;
        const renders = this.metrics.renderTimes;
        const memory = this.metrics.memorySnapshots[this.metrics.memorySnapshots.length - 1];
        
        return {
            pageLoad: this.metrics.pageLoad,
            apiCalls: {
                total: apiCalls.length,
                avgDuration: apiCalls.length > 0 ? 
                    apiCalls.reduce((sum, c) => sum + c.duration, 0) / apiCalls.length : 0,
                slowCalls: apiCalls.filter(c => c.duration > this.thresholds.slowAPI).length
            },
            renders: {
                total: renders.length,
                avgDuration: renders.length > 0 ?
                    renders.reduce((sum, r) => sum + r.duration, 0) / renders.length : 0,
                slowRenders: renders.filter(r => r.duration > this.thresholds.slowRender).length
            },
            memory: memory ? {
                used: (memory.used / 1024 / 1024).toFixed(2) + ' MB',
                total: (memory.total / 1024 / 1024).toFixed(2) + ' MB',
                percentage: memory.percentage.toFixed(1) + '%'
            } : null,
            slowOperations: this.metrics.slowOperations.length
        };
    }
    
    // Get detailed metrics
    getMetrics() {
        return { ...this.metrics };
    }
    
    // Clear metrics
    clearMetrics() {
        this.metrics = {
            pageLoad: this.metrics.pageLoad, // Keep page load
            apiCalls: [],
            renderTimes: [],
            memorySnapshots: [],
            slowOperations: []
        };
        console.log('🗑️ Performance metrics cleared');
    }
    
    // Cleanup method
    shutdown() {
        if (this.memoryMonitorInterval) {
            clearInterval(this.memoryMonitorInterval);
            this.memoryMonitorInterval = null;
        }
        console.log('🛑 Performance monitor shut down');
    }
    
    // Optimize localStorage usage
    optimizeLocalStorage() {
        console.log('🔧 Optimizing localStorage...');
        
        let totalSize = 0;
        const items = [];
        
        // Calculate size of each item
        for (let key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
                const size = (localStorage[key].length + key.length) * 2; // Rough estimate in bytes
                totalSize += size;
                items.push({ key, size });
            }
        }
        
        // Sort by size
        items.sort((a, b) => b.size - a.size);
        
        console.log(`📊 Total localStorage: ${(totalSize / 1024).toFixed(2)}KB`);
        console.log('📊 Top 5 largest items:');
        items.slice(0, 5).forEach(item => {
            console.log(`  - ${item.key}: ${(item.size / 1024).toFixed(2)}KB`);
        });
        
        // Recommend cleanup
        const oldKeys = [];
        const now = Date.now();
        const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
        
        for (let key in localStorage) {
            if (key.includes('timestamp') || key.includes('lastUpdate')) {
                try {
                    const data = JSON.parse(localStorage[key]);
                    if (data.timestamp && now - data.timestamp > maxAge) {
                        oldKeys.push(key);
                    }
                } catch (e) {
                    // Not JSON, skip
                }
            }
        }
        
        if (oldKeys.length > 0) {
            console.log(`🗑️ Found ${oldKeys.length} old items (>7 days)`);
        }
        
        return {
            totalSize: totalSize,
            totalSizeKB: (totalSize / 1024).toFixed(2),
            itemCount: items.length,
            largestItems: items.slice(0, 10),
            oldKeys: oldKeys
        };
    }
    
    // Debounce helper
    debounce(fn, delay) {
        let timeoutId;
        return function(...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => fn.apply(this, args), delay);
        };
    }
    
    // Throttle helper
    throttle(fn, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                fn.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
}

// Global singleton
window.performanceMonitor = new PerformanceMonitor();

// Don't auto-initialize - let init-orchestrator control startup
// Will be initialized by init-orchestrator.js in correct order

console.log('✅ Performance Monitor module loaded');