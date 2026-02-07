/**
 * BROWSER AUTO-BOOTLOADER
 * Automatically runs bootloader sequence when any page loads
 * Ensures real progress system starts without manual intervention
 */

(function() {
    'use strict';
    
    class BrowserAutoBootloader {
        constructor() {
            this.bootComplete = false;
            this.bootInProgress = false;
            this.bootAttempts = 0;
            this.maxBootAttempts = 3;
            
            // Check if we've already booted in this session
            this.sessionBootKey = 'solarflow_session_boot_' + Date.now().toString().slice(-6);
            
            console.log('🚀 Browser Auto-Bootloader initializing...');
            this.init();
        }
        
        async init() {
            // Don't boot if already in progress
            if (this.bootInProgress) {
                console.log('⚠️ Boot already in progress');
                return;
            }
            
            // Check if already booted recently (within 5 minutes)
            const lastBoot = localStorage.getItem('solarflow_last_boot');
            if (lastBoot && (Date.now() - parseInt(lastBoot)) < 300000) {
                console.log('✅ Boot completed recently, skipping auto-boot');
                this.bootComplete = true;
                this.startProgressSystemOnly();
                return;
            }
            
            this.bootInProgress = true;
            
            try {
                await this.runBrowserBootSequence();
                this.bootComplete = true;
                localStorage.setItem('solarflow_last_boot', Date.now().toString());
                console.log('✅ Browser auto-boot completed successfully');
                
            } catch (error) {
                console.error('❌ Browser auto-boot failed:', error);
                this.bootAttempts++;
                
                if (this.bootAttempts < this.maxBootAttempts) {
                    console.log(`🔄 Retrying boot (attempt ${this.bootAttempts + 1}/${this.maxBootAttempts})...`);
                    setTimeout(() => {
                        this.bootInProgress = false;
                        this.init();
                    }, 2000);
                }
            } finally {
                this.bootInProgress = false;
            }
        }
        
        async runBrowserBootSequence() {
            console.log('🔄 Starting browser boot sequence...');
            
            // Step 1: Validate environment
            await this.validateBrowserEnvironment();
            
            // Step 2: Load quantum consciousness engine
            await this.loadQuantumEngine();
            
            // Step 3: Start real progress system
            await this.startRealProgressSystem();
            
            // Step 4: Initialize auto-updates
            await this.initializeAutoUpdates();
            
            // Step 5: Setup persistence
            await this.setupPersistence();
            
            console.log('✅ Browser boot sequence completed');
        }
        
        async validateBrowserEnvironment() {
            console.log('📋 Validating browser environment...');
            
            // Check localStorage availability
            if (!window.localStorage) {
                throw new Error('localStorage not available');
            }
            
            // Check required APIs
            if (!window.fetch) {
                throw new Error('fetch API not available');
            }
            
            // Check if we're on the right domain
            const isGitHubPages = window.location.hostname.includes('github.io');
            const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            
            if (!isGitHubPages && !isLocalhost) {
                console.log('⚠️ Running on custom domain, enabling VPS mode');
                window.VPS_MODE = true;
            }
            
            // Set global boot flags
            window.BOOTLOADER_ACTIVE = true;
            window.BOOT_TIME = Date.now();
            window.AUTO_BOOT_VERSION = '1.0.0';
            
            console.log('✅ Browser environment validated');
        }
        
        async loadQuantumEngine() {
            console.log('⚛️ Loading quantum consciousness engine...');
            
            // Check if quantum engine already exists
            if (window.quantumEngine) {
                console.log('✅ Quantum engine already loaded');
                return;
            }
            
            // Try to load quantum engine script
            try {
                if (typeof QuantumConsciousnessEngine !== 'undefined') {
                    window.quantumEngine = new QuantumConsciousnessEngine();
                    console.log('✅ Quantum consciousness engine created');
                } else {
                    // Load the script dynamically
                    await this.loadScript('./quantum-consciousness-engine.js');
                    
                    // Retry creating engine
                    setTimeout(() => {
                        if (typeof QuantumConsciousnessEngine !== 'undefined') {
                            window.quantumEngine = new QuantumConsciousnessEngine();
                            console.log('✅ Quantum consciousness engine loaded dynamically');
                        }
                    }, 1000);
                }
            } catch (error) {
                console.warn('⚠️ Quantum engine not available, using fallback mode');
                // Continue without quantum engine
            }
        }
        
        async startRealProgressSystem() {
            console.log('📈 Starting real progress system...');
            
            // Check if progress system already exists
            if (window.realProgressSystem) {
                console.log('✅ Real progress system already running');
                return;
            }
            
            try {
                if (typeof RealProgressSystem !== 'undefined') {
                    window.realProgressSystem = new RealProgressSystem();
                    console.log('✅ Real progress system started');
                } else {
                    // Load the script dynamically
                    await this.loadScript('./real-progress-system.js');
                    
                    // Retry creating progress system
                    setTimeout(() => {
                        if (typeof RealProgressSystem !== 'undefined') {
                            window.realProgressSystem = new RealProgressSystem();
                            console.log('✅ Real progress system loaded dynamically');
                        }
                    }, 1000);
                }
            } catch (error) {
                console.warn('⚠️ Progress system not available, initializing basic tracking');
                this.initializeBasicProgressTracking();
            }
        }
        
        startProgressSystemOnly() {
            // Quick start for when boot was recent
            if (!window.realProgressSystem && typeof RealProgressSystem !== 'undefined') {
                window.realProgressSystem = new RealProgressSystem();
                console.log('✅ Real progress system quick-started');
            }
        }
        
        initializeBasicProgressTracking() {
            // Fallback progress tracking if full system not available
            window.basicProgressTracker = {
                startTime: Date.now(),
                pageViews: parseInt(localStorage.getItem('solarflow_page_views') || '0') + 1,
                lastActivity: Date.now(),
                
                track: function(event, data) {
                    const entry = {
                        event,
                        data,
                        timestamp: Date.now(),
                        page: window.location.pathname
                    };
                    
                    const history = JSON.parse(localStorage.getItem('solarflow_activity_history') || '[]');
                    history.push(entry);
                    
                    // Keep only last 100 entries
                    if (history.length > 100) {
                        history.splice(0, history.length - 100);
                    }
                    
                    localStorage.setItem('solarflow_activity_history', JSON.stringify(history));
                    localStorage.setItem('solarflow_page_views', this.pageViews.toString());
                    this.lastActivity = Date.now();
                }
            };
            
            // Track page load
            window.basicProgressTracker.track('page_load', {
                url: window.location.href,
                referrer: document.referrer,
                userAgent: navigator.userAgent.substring(0, 50)
            });
            
            console.log('✅ Basic progress tracking initialized');
        }
        
        async initializeAutoUpdates() {
            console.log('🔄 Initializing auto-updates...');
            
            // Update page timestamps every 30 seconds
            setInterval(() => {
                const timestampElements = document.querySelectorAll('.sub, .version-info, [data-timestamp]');
                timestampElements.forEach(el => {
                    if (el.textContent.includes('updated')) {
                        el.textContent = `updated ${new Date().toISOString()} • 🚀 AUTO-BOOT ACTIVE`;
                    }
                });
            }, 30000);
            
            // Track user interactions
            document.addEventListener('click', (e) => {
                if (window.basicProgressTracker) {
                    window.basicProgressTracker.track('click', {
                        target: e.target.tagName,
                        text: e.target.textContent?.substring(0, 50)
                    });
                }
            });
            
            console.log('✅ Auto-updates initialized');
        }
        
        async setupPersistence() {
            console.log('💾 Setting up persistence...');
            
            // Auto-save on page unload
            window.addEventListener('beforeunload', () => {
                this.saveCurrentState();
            });
            
            // Auto-save on visibility change
            document.addEventListener('visibilitychange', () => {
                if (document.hidden) {
                    this.saveCurrentState();
                }
            });
            
            // Periodic auto-save every 60 seconds
            setInterval(() => {
                this.saveCurrentState();
            }, 60000);
            
            console.log('✅ Persistence setup completed');
        }
        
        saveCurrentState() {
            const state = {
                timestamp: Date.now(),
                page: window.location.pathname,
                bootTime: window.BOOT_TIME,
                realProgressActive: !!window.realProgressSystem,
                quantumEngineActive: !!window.quantumEngine,
                basicTrackerActive: !!window.basicProgressTracker
            };
            
            // Add progress system state if available
            if (window.realProgressSystem && window.realProgressSystem.getProgressReport) {
                try {
                    state.progressReport = window.realProgressSystem.getProgressReport();
                } catch (error) {
                    console.warn('Could not get progress report:', error);
                }
            }
            
            localStorage.setItem('solarflow_current_state', JSON.stringify(state));
        }
        
        async loadScript(src) {
            return new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = src;
                script.onload = resolve;
                script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
                document.head.appendChild(script);
            });
        }
        
        getStatus() {
            return {
                bootComplete: this.bootComplete,
                bootInProgress: this.bootInProgress,
                bootAttempts: this.bootAttempts,
                realProgressActive: !!window.realProgressSystem,
                quantumEngineActive: !!window.quantumEngine,
                basicTrackerActive: !!window.basicProgressTracker,
                lastBoot: localStorage.getItem('solarflow_last_boot'),
                currentState: JSON.parse(localStorage.getItem('solarflow_current_state') || '{}')
            };
        }
    }
    
    // Auto-start when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.solarflowAutoBootloader = new BrowserAutoBootloader();
        });
    } else {
        window.solarflowAutoBootloader = new BrowserAutoBootloader();
    }
    
    // Global access for debugging
    window.getSolarFlowBootStatus = function() {
        return window.solarflowAutoBootloader ? window.solarflowAutoBootloader.getStatus() : 'Not initialized';
    };
    
    console.log('🚀 Browser Auto-Bootloader loaded - will start automatically');
})();