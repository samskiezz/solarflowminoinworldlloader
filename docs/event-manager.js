/**
 * EVENT MANAGER
 * Centralized event listener management with automatic cleanup
 */

class EventManager {
    constructor() {
        this.listeners = [];
        this.initialized = false;
        
        console.log('📡 Event Manager initialized');
    }
    
    init() {
        // Setup cleanup on page unload
        window.addEventListener('beforeunload', () => {
            this.cleanup();
        });
        
        this.initialized = true;
        console.log('✅ Event Manager ready');
    }
    
    // Add event listener with tracking
    on(target, event, handler, options = {}) {
        // Default to window if no target specified
        const actualTarget = target || window;
        
        // Add listener
        actualTarget.addEventListener(event, handler, options);
        
        // Track for cleanup
        this.listeners.push({
            target: actualTarget,
            event: event,
            handler: handler,
            addedAt: Date.now()
        });
        
        return () => this.off(target, event, handler);
    }
    
    // Remove event listener
    off(target, event, handler) {
        const actualTarget = target || window;
        
        // Remove listener
        actualTarget.removeEventListener(event, handler);
        
        // Remove from tracking
        this.listeners = this.listeners.filter(listener => 
            !(listener.target === actualTarget && 
              listener.event === event && 
              listener.handler === handler)
        );
    }
    
    // Add one-time listener
    once(target, event, handler, options = {}) {
        const actualTarget = target || window;
        
        const wrappedHandler = (e) => {
            handler(e);
            this.off(actualTarget, event, wrappedHandler);
        };
        
        return this.on(actualTarget, event, wrappedHandler, options);
    }
    
    // Emit custom event
    emit(eventName, detail = {}) {
        const event = new CustomEvent(eventName, { detail });
        window.dispatchEvent(event);
        
        console.log(`📡 Event emitted: ${eventName}`, detail);
    }
    
    // Cleanup all tracked listeners
    cleanup() {
        let cleaned = 0;
        
        this.listeners.forEach(({ target, event, handler }) => {
            try {
                target.removeEventListener(event, handler);
                cleaned++;
            } catch (error) {
                console.warn('Failed to remove listener:', error);
            }
        });
        
        this.listeners = [];
        console.log(`🗑️ Cleaned up ${cleaned} event listeners`);
        
        return cleaned;
    }
    
    // Get status
    getStatus() {
        return {
            initialized: this.initialized,
            activeListeners: this.listeners.length,
            listeners: this.listeners.map(l => ({
                event: l.event,
                target: l.target === window ? 'window' : l.target.tagName || 'custom',
                age: Date.now() - l.addedAt
            }))
        };
    }
    
    // Remove old listeners (>1 hour)
    cleanupOld(maxAgeMs = 60 * 60 * 1000) {
        const now = Date.now();
        const oldListeners = this.listeners.filter(l => now - l.addedAt > maxAgeMs);
        
        oldListeners.forEach(({ target, event, handler }) => {
            this.off(target, event, handler);
        });
        
        if (oldListeners.length > 0) {
            console.log(`🗑️ Cleaned ${oldListeners.length} old listeners (>${maxAgeMs / 60000}min)`);
        }
        
        return oldListeners.length;
    }
}

// Global singleton
window.eventManager = new EventManager();

console.log('✅ Event Manager module loaded');