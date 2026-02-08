/**
 * INITIALIZATION ORCHESTRATOR
 * Ensures all modules initialize in correct order with proper dependencies
 */

class InitOrchestrator {
    constructor() {
        this.phases = {
            foundation: [],
            core: [],
            advanced: []
        };
        this.initialized = false;
        this.errors = [];
    }
    
    async init() {
        console.log('🚀 SolarFlow Init Orchestrator starting...');
        console.log('📋 Initializing modules in dependency order...');
        
        try {
            // Phase 1: Foundation (no dependencies)
            console.log('\n=== Phase 1: Foundation ===');
            await this.initFoundation();
            
            // Phase 2: Core (depends on foundation)
            console.log('\n=== Phase 2: Core Systems ===');
            await this.initCore();
            
            // Phase 3: Advanced (depends on core)
            console.log('\n=== Phase 3: Advanced Systems ===');
            await this.initAdvanced();
            
            this.initialized = true;
            console.log('\n✅ All systems initialized successfully');
            console.log(`📊 Total modules: ${this.getModuleCount()}`);
            
            // Broadcast ready event
            window.dispatchEvent(new Event('solarflow-ready'));
            
            return true;
            
        } catch (error) {
            console.error('❌ Initialization failed:', error);
            this.errors.push(error);
            
            // Show error to user
            this.showInitError(error);
            
            throw error;
        }
    }
    
    async initFoundation() {
        // 1. Storage Manager (centralized localStorage)
        await this.initModule('Storage Manager', () => {
            if (!window.storageManager) {
                throw new Error('storage-manager.js not loaded');
            }
            window.storageManager.init();
        });
        
        // 2. Event Manager (manages listeners)
        await this.initModule('Event Manager', () => {
            if (!window.eventManager) {
                throw new Error('event-manager.js not loaded');
            }
            window.eventManager.init();
        });
        
        // 3. Error Handler (catches all errors)
        await this.initModule('Error Handler', async () => {
            if (!window.errorHandler) {
                throw new Error('error-handler.js not loaded');
            }
            await window.errorHandler.loadErrorLog();
            window.errorHandler.init();
        });
        
        // 4. Security Utils (validates all inputs)
        await this.initModule('Security Utils', () => {
            if (!window.securityUtils) {
                throw new Error('security-utils.js not loaded');
            }
            
            // Create rate limiters now that security utils exists
            window.rateLimiters = {
                creditAward: window.securityUtils.createRateLimiter(60, 60000),
                localStorage: window.securityUtils.createRateLimiter(100, 60000),
                apiCall: window.securityUtils.createRateLimiter(30, 60000),
                stateUpdate: window.securityUtils.createRateLimiter(10, 1000)
            };
            
            console.log('  ✅ Rate limiters created');
        });
        
        // 5. Performance Monitor (tracks all operations)
        await this.initModule('Performance Monitor', () => {
            if (!window.performanceMonitor) {
                throw new Error('performance-monitor.js not loaded');
            }
            window.performanceMonitor.init();
        });
    }
    
    async initCore() {
        // 6. Central Data Loader (loads all data)
        await this.initModule('Central Data Loader', async () => {
            if (!window.centralDataLoader) {
                throw new Error('central-data-loader.js not loaded');
            }
            await window.centralDataLoader.init();
            
            // Verify critical data loaded
            const minions = window.centralDataLoader.get('minions');
            const cerProducts = window.centralDataLoader.get('cerProducts');
            
            if (!minions || minions.length === 0) {
                throw new Error('Failed to load minions - system cannot function');
            }
            
            if (!cerProducts || cerProducts.length === 0) {
                throw new Error('Failed to load CER products - system cannot function');
            }
            
            console.log(`  ✅ Minions: ${minions.length}, Products: ${cerProducts.length}`);
        });
        
        // 7. Unified Credit System (fair credits)
        await this.initModule('Unified Credit System', async () => {
            if (!window.unifiedCreditSystem) {
                throw new Error('unified-credit-system.js not loaded');
            }
            await window.unifiedCreditSystem.init();
        });
    }
    
    async initAdvanced() {
        // 8. VPS Integration (optional)
        await this.initModule('VPS Integration', async () => {
            if (window.realVPS) {
                // VPS integration is optional, don't fail if it doesn't connect
                console.log('  ⏳ Attempting VPS connection...');
                // Already initializes in constructor
            } else {
                console.log('  ⚠️ VPS integration not loaded');
            }
        }, { optional: true });
        
        // 9. Health Monitor
        await this.initModule('Health Monitor', () => {
            if (!window.realHealthMonitor) {
                throw new Error('real-health-monitor.js not loaded');
            }
            // Don't call init - it auto-inits in constructor
            // Just verify it's ready
            if (!window.realHealthMonitor.initialized) {
                window.realHealthMonitor.init();
            }
        });
        
        // 10. Neural Processor
        await this.initModule('Neural Processor', () => {
            if (!window.realNeuralProcessor) {
                throw new Error('real-neural-processor.js not loaded');
            }
            // Already initializes in constructor
            if (!window.realNeuralProcessor.initialized) {
                console.log('  ⚠️ Neural processor failed to initialize');
            }
        }, { optional: true });
        
        // 11. Compliance Engine
        await this.initModule('Compliance Engine', () => {
            if (!window.realComplianceEngine) {
                throw new Error('real-compliance-engine.js not loaded');
            }
            // Already initializes in constructor
            if (!window.realComplianceEngine.initialized) {
                console.log('  ⚠️ Compliance engine failed to initialize');
            }
        }, { optional: true });
    }
    
    async initModule(name, initFn, options = {}) {
        try {
            console.log(`  🔧 ${name}...`);
            await initFn();
            console.log(`  ✅ ${name} ready`);
            
            // Track successful init
            if (options.optional) {
                this.phases.advanced.push(name);
            } else {
                this.phases.core.push(name);
            }
            
            return true;
            
        } catch (error) {
            if (options.optional) {
                console.warn(`  ⚠️ ${name} failed (optional):`, error.message);
                return false;
            } else {
                console.error(`  ❌ ${name} failed (required):`, error.message);
                throw new Error(`Required module ${name} failed: ${error.message}`);
            }
        }
    }
    
    getModuleCount() {
        return this.phases.foundation.length + this.phases.core.length + this.phases.advanced.length;
    }
    
    getStatus() {
        return {
            initialized: this.initialized,
            phases: this.phases,
            errors: this.errors,
            totalModules: this.getModuleCount()
        };
    }
    
    showInitError(error) {
        // Create error display
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #d32f2f;
            color: white;
            padding: 30px;
            border-radius: 12px;
            max-width: 600px;
            z-index: 10000;
            font-family: monospace;
            box-shadow: 0 8px 32px rgba(0,0,0,0.5);
        `;
        
        errorDiv.innerHTML = `
            <h2 style="margin-top: 0;">❌ System Initialization Failed</h2>
            <p><strong>Error:</strong> ${error.message}</p>
            <p style="font-size: 0.9em; margin-top: 15px;">
                The system cannot start because a critical module failed to load.
                Check the browser console for details.
            </p>
            <button onclick="location.reload()" style="
                margin-top: 15px;
                padding: 10px 20px;
                background: white;
                color: #d32f2f;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-weight: bold;
            ">Reload Page</button>
        `;
        
        document.body.appendChild(errorDiv);
    }
}

// Create global orchestrator
window.initOrchestrator = new InitOrchestrator();

// Single DOMContentLoaded handler
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await window.initOrchestrator.init();
    } catch (error) {
        console.error('💥 Fatal initialization error:', error);
    }
});

console.log('✅ Init Orchestrator module loaded');