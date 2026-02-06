/**
 * Central event bus for cross-module communication
 * Replaces scattered event handling across the codebase
 */
export class EventBus {
    constructor() {
        this.map = new Map();
        this.debugMode = false;
    }

    on(evt, fn) {
        if (!this.map.has(evt)) this.map.set(evt, new Set());
        this.map.get(evt).add(fn);
        if (this.debugMode) console.log(`[EventBus] Registered listener for '${evt}'`);
        return () => this.off(evt, fn);
    }

    off(evt, fn) {
        this.map.get(evt)?.delete(fn);
        if (this.debugMode) console.log(`[EventBus] Removed listener for '${evt}'`);
    }

    emit(evt, payload) {
        if (this.debugMode) console.log(`[EventBus] Emitting '${evt}'`, payload);
        this.map.get(evt)?.forEach(fn => {
            try {
                fn(payload);
            } catch (error) {
                console.error(`[EventBus] Error in listener for '${evt}':`, error);
            }
        });
    }

    listEvents() {
        return Array.from(this.map.keys());
    }

    listenerCount(evt) {
        return this.map.get(evt)?.size || 0;
    }
}

// Global instance
export const eventBus = new EventBus();