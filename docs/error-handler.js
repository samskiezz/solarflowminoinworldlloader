/**
 * GLOBAL ERROR HANDLER
 * Centralized error tracking and recovery
 */

class ErrorHandler {
    constructor() {
        this.errors = [];
        this.maxErrors = 100;
        this.errorCounts = {};
        this.initialized = false;
        
        console.log('🚨 Error Handler initialized');
    }
    
    init() {
        if (this.initialized) return;
        
        // Global error handler
        window.addEventListener('error', (event) => {
            this.handleError(event.error || event.message, {
                type: 'uncaught',
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno
            });
        });
        
        // Promise rejection handler
        window.addEventListener('unhandledrejection', (event) => {
            this.handleError(event.reason, {
                type: 'unhandled-promise',
                promise: event.promise
            });
        });
        
        this.initialized = true;
        console.log('✅ Global error handlers installed');
    }
    
    handleError(error, context = {}) {
        const errorRecord = {
            message: error.message || String(error),
            stack: error.stack || 'No stack trace',
            timestamp: Date.now(),
            context: context,
            userAgent: navigator.userAgent,
            url: window.location.href
        };
        
        // Add to error log
        this.errors.unshift(errorRecord);
        if (this.errors.length > this.maxErrors) {
            this.errors.pop();
        }
        
        // Count error frequency
        const errorKey = errorRecord.message;
        this.errorCounts[errorKey] = (this.errorCounts[errorKey] || 0) + 1;
        
        // Log error
        console.error('🚨 Error captured:', errorRecord);
        
        // Save to localStorage
        this.saveErrorLog();
        
        // Attempt recovery for known errors
        this.attemptRecovery(errorRecord);
        
        return errorRecord;
    }
    
    attemptRecovery(errorRecord) {
        const message = errorRecord.message.toLowerCase();
        
        // localStorage quota exceeded
        if (message.includes('quota') || message.includes('storage')) {
            console.log('🔧 Attempting recovery: Clearing old localStorage data...');
            this.clearOldLocalStorageData();
        }
        
        // Network errors
        if (message.includes('fetch') || message.includes('network')) {
            console.log('🔧 Network error detected - data will be retried');
        }
        
        // JSON parse errors
        if (message.includes('json') || message.includes('parse')) {
            console.log('🔧 JSON parse error - corrupted data will be removed');
        }
    }
    
    clearOldLocalStorageData() {
        try {
            const now = Date.now();
            const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
            let cleared = 0;
            
            for (let key in localStorage) {
                if (key.startsWith('fallback-') || key.includes('cache')) {
                    try {
                        const data = JSON.parse(localStorage[key]);
                        if (data.timestamp && now - data.timestamp > maxAge) {
                            localStorage.removeItem(key);
                            cleared++;
                        }
                    } catch (e) {
                        // Not JSON or no timestamp, skip
                    }
                }
            }
            
            console.log(`✅ Cleared ${cleared} old localStorage items`);
            return cleared;
            
        } catch (error) {
            console.error('❌ Failed to clear old data:', error);
            return 0;
        }
    }
    
    saveErrorLog() {
        try {
            // Keep only last 50 errors in localStorage
            const recentErrors = this.errors.slice(0, 50);
            localStorage.setItem('error-log', JSON.stringify(recentErrors));
        } catch (error) {
            console.warn('⚠️ Failed to save error log:', error);
        }
    }
    
    loadErrorLog() {
        try {
            const saved = localStorage.getItem('error-log');
            if (saved) {
                this.errors = JSON.parse(saved);
                console.log(`📂 Loaded ${this.errors.length} previous errors`);
            }
        } catch (error) {
            console.warn('⚠️ Failed to load error log:', error);
        }
    }
    
    getErrors(limit = 50) {
        return this.errors.slice(0, limit);
    }
    
    getErrorStats() {
        const stats = {
            total: this.errors.length,
            last24h: this.errors.filter(e => Date.now() - e.timestamp < 24 * 60 * 60 * 1000).length,
            byType: {},
            topErrors: []
        };
        
        // Group by error message
        for (const [message, count] of Object.entries(this.errorCounts)) {
            stats.topErrors.push({ message, count });
        }
        
        // Sort by frequency
        stats.topErrors.sort((a, b) => b.count - a.count);
        stats.topErrors = stats.topErrors.slice(0, 10);
        
        return stats;
    }
    
    clearErrors() {
        this.errors = [];
        this.errorCounts = {};
        localStorage.removeItem('error-log');
        console.log('🗑️ Error log cleared');
    }
    
    // Create error boundary for React-like components
    createErrorBoundary(fn, fallback = null) {
        return function(...args) {
            try {
                return fn.apply(this, args);
            } catch (error) {
                window.errorHandler.handleError(error, {
                    type: 'error-boundary',
                    function: fn.name
                });
                
                if (fallback && typeof fallback === 'function') {
                    return fallback(error);
                }
                
                return null;
            }
        };
    }
    
    // Wrap async functions
    wrapAsync(fn) {
        return async function(...args) {
            try {
                return await fn.apply(this, args);
            } catch (error) {
                window.errorHandler.handleError(error, {
                    type: 'async-error',
                    function: fn.name
                });
                throw error;
            }
        };
    }
}

// Global singleton
window.errorHandler = new ErrorHandler();

// Don't auto-initialize - let init-orchestrator control startup
// Will be initialized by init-orchestrator.js in correct order

console.log('✅ Error Handler module loaded');