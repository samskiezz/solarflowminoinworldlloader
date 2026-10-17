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
        this.ready = [];
        this.failed = [];
        this.initialized = false;
        this.errors = [];
        this.startedAt = null;
        this.finishedAt = null;
    }

    async init() {
        if (this.initialized || this.startedAt) return this.initialized;
        this.startedAt = Date.now();
        console.log('🚀 SolarFlow Init Orchestrator starting...');

        try {
            console.log('=== Phase 1: Foundation ===');
            await this.initFoundation();

            console.log('=== Phase 2: Core Systems ===');
            await this.initCore();

            console.log('=== Phase 3: Advanced Systems ===');
            await this.initAdvanced();

            this.initialized = true;
            this.finishedAt = Date.now();
            console.log(`✅ All systems initialized in ${this.finishedAt - this.startedAt}ms (${this.ready.length} ready, ${this.failed.length} optional failed)`);

            window.dispatchEvent(new CustomEvent('solarflow-ready', { detail: { status: this.getStatus() } }));
            return true;

        } catch (error) {
            console.error('❌ Initialization failed:', error);
            this.errors.push(error);
            this.finishedAt = Date.now();
            this.showInitError(error);
            window.dispatchEvent(new CustomEvent('solarflow-init-failed', { detail: { error: error.message, status: this.getStatus() } }));
            throw error;
        }
    }

    async initFoundation() {
        await this.initModule('Storage Manager', () => {
            if (!window.storageManager) throw new Error('storage-manager.js not loaded');
            window.storageManager.init();
        }, { phase: 'foundation' });

        await this.initModule('Event Manager', () => {
            if (!window.eventManager) throw new Error('event-manager.js not loaded');
            window.eventManager.init();
        }, { phase: 'foundation' });

        await this.initModule('Error Handler', async () => {
            if (!window.errorHandler) throw new Error('error-handler.js not loaded');
            await window.errorHandler.loadErrorLog();
            window.errorHandler.init();
        }, { phase: 'foundation' });

        await this.initModule('Security Utils', () => {
            if (!window.securityUtils) throw new Error('security-utils.js not loaded');
            window.rateLimiters = {
                creditAward: window.securityUtils.createRateLimiter(60, 60000),
                localStorage: window.securityUtils.createRateLimiter(100, 60000),
                apiCall: window.securityUtils.createRateLimiter(30, 60000),
                stateUpdate: window.securityUtils.createRateLimiter(10, 1000)
            };
        }, { phase: 'foundation' });

        await this.initModule('Performance Monitor', () => {
            if (!window.performanceMonitor) throw new Error('performance-monitor.js not loaded');
            window.performanceMonitor.init();
        }, { phase: 'foundation' });
    }

    async initCore() {
        await this.initModule('Central Data Loader', async () => {
            if (!window.centralDataLoader) throw new Error('central-data-loader.js not loaded');
            await window.centralDataLoader.init();

            const minions = window.centralDataLoader.get('minions');
            const cerProducts = window.centralDataLoader.get('cerProducts');
            if (!minions || minions.length === 0) throw new Error('Failed to load minions - system cannot function');
            if (!cerProducts || cerProducts.length === 0) throw new Error('Failed to load CER products - system cannot function');
            console.log(`  ✅ Minions: ${minions.length}, Products: ${cerProducts.length}`);
        }, { phase: 'core' });

        await this.initModule('Unified Credit System', async () => {
            if (!window.unifiedCreditSystem) throw new Error('unified-credit-system.js not loaded');
            await window.unifiedCreditSystem.init();
        }, { phase: 'core' });
    }

    async initAdvanced() {
        await this.initModule('VPS Integration', () => {
            if (!window.realVPS) throw new Error('real-vps-integration.js not loaded');
            // Connects asynchronously in its constructor; local mode is a valid outcome.
        }, { optional: true });

        await this.initModule('Health Monitor', () => {
            if (!window.realHealthMonitor) throw new Error('real-health-monitor.js not loaded');
            if (!window.realHealthMonitor.monitoring) window.realHealthMonitor.init();
        }, { optional: true });

        await this.initModule('Neural Processor', () => {
            if (!window.realNeuralProcessor) throw new Error('real-neural-processor.js not loaded');
            if (!window.realNeuralProcessor.initialized) throw new Error('neural processor failed to initialise');
        }, { optional: true });

        await this.initModule('Compliance Engine', () => {
            if (!window.realComplianceEngine) throw new Error('real-compliance-engine.js not loaded');
            if (!window.realComplianceEngine.initialized) throw new Error('compliance engine failed to initialise');
        }, { optional: true });
    }

    async initModule(name, initFn, options = {}) {
        const phase = options.phase || (options.optional ? 'advanced' : 'core');
        const started = performance.now();
        try {
            console.log(`  🔧 ${name}...`);
            await initFn();
            console.log(`  ✅ ${name} ready (${Math.round(performance.now() - started)}ms)`);
            this.phases[phase].push(name);
            this.ready.push(name);
            return true;
        } catch (error) {
            if (options.optional) {
                console.warn(`  ⚠️ ${name} unavailable (optional):`, error.message);
                this.failed.push(name);
                return false;
            }
            console.error(`  ❌ ${name} failed (required):`, error.message);
            this.failed.push(name);
            throw new Error(`Required module ${name} failed: ${error.message}`);
        }
    }

    getModuleCount() {
        return this.phases.foundation.length + this.phases.core.length + this.phases.advanced.length;
    }

    getStatus() {
        return {
            initialized: this.initialized,
            phases: {
                foundation: [...this.phases.foundation],
                core: [...this.phases.core],
                advanced: [...this.phases.advanced]
            },
            ready: [...this.ready],
            failed: [...this.failed],
            errors: this.errors.map((e) => e.message),
            totalModules: this.getModuleCount(),
            durationMs: this.finishedAt && this.startedAt ? this.finishedAt - this.startedAt : null
        };
    }

    showInitError(error) {
        const errorDiv = document.createElement('div');
        errorDiv.setAttribute('role', 'alert');
        errorDiv.style.cssText = `
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            background: #d32f2f; color: white; padding: 30px; border-radius: 12px;
            max-width: 600px; width: 90%; z-index: 10000; font-family: monospace;
            box-shadow: 0 8px 32px rgba(0,0,0,0.5);
        `;

        const title = document.createElement('h2');
        title.style.marginTop = '0';
        title.textContent = '❌ System Initialization Failed';

        const message = document.createElement('p');
        const strong = document.createElement('strong');
        strong.textContent = 'Error: ';
        message.appendChild(strong);
        message.appendChild(document.createTextNode(error.message)); // never innerHTML: messages can contain user data

        const hint = document.createElement('p');
        hint.style.cssText = 'font-size: 0.9em; margin-top: 15px;';
        hint.textContent = 'The system cannot start because a critical module failed to load. Check the browser console for details.';

        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = 'Reload Page';
        button.style.cssText = 'margin-top: 15px; padding: 10px 20px; background: white; color: #d32f2f; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;';
        button.onclick = () => location.reload();

        errorDiv.append(title, message, hint, button);
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
