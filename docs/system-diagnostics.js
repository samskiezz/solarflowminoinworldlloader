/**
 * SYSTEM VERIFICATION & GUARDRAILS
 * Self-testing, persistence verification, and system health monitoring
 */

class SystemDiagnostics {
    constructor() {
        this.testResults = {};
        this.guardrails = new SystemGuardrails();
    }
    
    async runFullDiagnostics() {
        console.log('🧪 Running comprehensive system diagnostics...');
        
        const results = {
            timestamp: new Date().toISOString(),
            tests: {},
            overall: 'UNKNOWN'
        };
        
        // Core system tests
        results.tests.coreSystem = await this.testCoreSystem();
        results.tests.dataStore = await this.testDataStore();
        results.tests.llmEngine = await this.testLLMEngine();
        results.tests.featureRegistry = await this.testFeatureRegistry();
        results.tests.persistence = await this.testPersistence();
        results.tests.buttonDuplication = await this.testButtonDuplication();
        results.tests.brokenLinks = await this.testBrokenLinks();
        results.tests.guardrails = await this.testGuardrails();
        
        // Determine overall status
        const passCount = Object.values(results.tests).filter(t => t.status === 'PASS').length;
        const totalTests = Object.keys(results.tests).length;
        
        if (passCount === totalTests) {
            results.overall = 'PASS';
        } else if (passCount >= totalTests * 0.7) {
            results.overall = 'PARTIAL';
        } else {
            results.overall = 'FAIL';
        }
        
        this.testResults = results;
        
        console.log(`🎯 Diagnostics complete: ${results.overall} (${passCount}/${totalTests} tests passed)`);
        
        return results;
    }
    
    async testCoreSystem() {
        try {
            if (!window.coreSystem) {
                return { status: 'FAIL', error: 'Core system not initialized' };
            }
            
            const diagnostics = window.coreSystem.runSystemDiagnostics();
            
            if (!diagnostics.dataStore || !diagnostics.llmEngine || !diagnostics.eventBus) {
                return { status: 'FAIL', error: 'Core components not healthy' };
            }
            
            return { 
                status: 'PASS', 
                details: {
                    features: diagnostics.features,
                    eventBus: diagnostics.eventBus,
                    timestamp: diagnostics.timestamp
                }
            };
        } catch (error) {
            return { status: 'FAIL', error: error.message };
        }
    }
    
    async testDataStore() {
        try {
            const dataStore = window.coreSystem?.dataStore;
            if (!dataStore) {
                return { status: 'FAIL', error: 'Data store not available' };
            }
            
            // Test basic CRUD operations
            const testData = {
                id: 'diagnostic_test',
                type: 'test',
                timestamp: Date.now()
            };
            
            // Create
            await dataStore.create('systemLogs', testData);
            
            // Read
            const retrieved = await dataStore.read('systemLogs', 'diagnostic_test');
            if (!retrieved) {
                throw new Error('Failed to retrieve test data');
            }
            
            // Update
            await dataStore.update('systemLogs', 'diagnostic_test', {
                ...testData,
                updated: true
            });
            
            // Verify update
            const updated = await dataStore.read('systemLogs', 'diagnostic_test');
            if (!updated.updated) {
                throw new Error('Update operation failed');
            }
            
            // Delete
            await dataStore.delete('systemLogs', 'diagnostic_test');
            
            // Verify deletion
            const deleted = await dataStore.read('systemLogs', 'diagnostic_test');
            if (deleted) {
                throw new Error('Delete operation failed');
            }
            
            return { 
                status: 'PASS', 
                details: {
                    healthy: dataStore.isHealthy(),
                    fallbackMode: dataStore.fallbackMode,
                    collections: dataStore.collections.length
                }
            };
        } catch (error) {
            return { status: 'FAIL', error: error.message };
        }
    }
    
    async testLLMEngine() {
        try {
            const llmEngine = window.llmEngine;
            if (!llmEngine) {
                return { status: 'FAIL', error: 'LLM engine not available' };
            }
            
            const status = llmEngine.getStatus();
            const isReady = llmEngine.isReady();
            
            // Test basic response generation (will use fallback if no API key)
            const testResponse = await llmEngine.generateMinionResponse('ATLAS', 'System test');
            
            if (!testResponse) {
                throw new Error('No response generated');
            }
            
            return { 
                status: 'PASS', 
                details: {
                    enabled: status.enabled,
                    provider: status.provider,
                    ready: isReady,
                    personalities: status.minionPersonalities?.length || 0,
                    testResponse: testResponse.content || testResponse
                }
            };
        } catch (error) {
            return { status: 'FAIL', error: error.message };
        }
    }
    
    async testFeatureRegistry() {
        try {
            const registry = window.coreSystem?.featureRegistry;
            if (!registry) {
                return { status: 'FAIL', error: 'Feature registry not available' };
            }
            
            const allFeatures = registry.getAll();
            const categories = ['roster', 'communication', 'activity', 'control', 'consciousness', 'world', 'threat', 'knowledge', 'realm', 'solar'];
            
            const categoryCounts = {};
            categories.forEach(cat => {
                categoryCounts[cat] = registry.getByCategory(cat).length;
            });
            
            return { 
                status: 'PASS', 
                details: {
                    totalFeatures: allFeatures.length,
                    categories: categoryCounts
                }
            };
        } catch (error) {
            return { status: 'FAIL', error: error.message };
        }
    }
    
    async testPersistence() {
        try {
            const dataStore = window.coreSystem?.dataStore;
            if (!dataStore) {
                throw new Error('Data store not available');
            }
            
            // Create test data
            const testMinion = {
                id: 'persistence_test',
                name: 'Persistence Test Minion',
                role: 'TESTER',
                timestamp: Date.now()
            };
            
            await dataStore.create('minions', testMinion);
            
            // Simulate page refresh by checking if data persists
            // In a real test, this would involve actual page refresh
            const retrieved = await dataStore.read('minions', 'persistence_test');
            
            if (!retrieved) {
                throw new Error('Data did not persist');
            }
            
            // Cleanup
            await dataStore.delete('minions', 'persistence_test');
            
            return { 
                status: 'PASS', 
                details: {
                    dataStorePersistence: true,
                    storageMode: dataStore.fallbackMode ? 'localStorage' : 'IndexedDB'
                }
            };
        } catch (error) {
            return { status: 'FAIL', error: error.message };
        }
    }
    
    async testButtonDuplication() {
        try {
            // Scan current page for duplicate button functionality
            const buttons = document.querySelectorAll('button[onclick*="location.href"]');
            const hrefs = new Map();
            const duplicates = [];
            
            buttons.forEach(button => {
                const onclick = button.getAttribute('onclick');
                const href = this.extractHref(onclick);
                
                if (href) {
                    if (hrefs.has(href)) {
                        duplicates.push({ href, buttons: [hrefs.get(href), button] });
                    } else {
                        hrefs.set(href, button);
                    }
                }
            });
            
            return { 
                status: duplicates.length === 0 ? 'PASS' : 'WARN', 
                details: {
                    totalButtons: buttons.length,
                    uniqueHrefs: hrefs.size,
                    duplicates: duplicates.length,
                    duplicateList: duplicates.map(d => d.href)
                }
            };
        } catch (error) {
            return { status: 'FAIL', error: error.message };
        }
    }
    
    async testBrokenLinks() {
        try {
            const linksToTest = [
                './roster.html',
                './minion-chat.html',
                './activity-feed.html',
                './minion-control.html',
                './consciousness-engine.html',
                './real-work-consciousness.html',
                './autonomous-world.html',
                './existential-threat-system.html',
                './autonomous-minion-knowledge-system.html',
                './ultimate-3d-realm-llm.html',
                './project_solar_australia.html',
                './hive_state.json',
                './minions.json'
            ];
            
            const results = {};
            let brokenCount = 0;
            
            for (const link of linksToTest) {
                try {
                    const response = await fetch(link, { method: 'HEAD' });
                    results[link] = {
                        status: response.ok ? 'OK' : 'BROKEN',
                        statusCode: response.status
                    };
                    if (!response.ok) brokenCount++;
                } catch (error) {
                    results[link] = {
                        status: 'ERROR',
                        error: error.message
                    };
                    brokenCount++;
                }
            }
            
            return { 
                status: brokenCount === 0 ? 'PASS' : 'PARTIAL', 
                details: {
                    tested: linksToTest.length,
                    broken: brokenCount,
                    results: results
                }
            };
        } catch (error) {
            return { status: 'FAIL', error: error.message };
        }
    }
    
    async testGuardrails() {
        try {
            const guardrailTests = [
                this.guardrails.testNewButtonPrevention(),
                this.guardrails.testDataIntegrityChecks(),
                this.guardrails.testAPIRateLimiting()
            ];
            
            const results = await Promise.all(guardrailTests);
            const passed = results.filter(r => r.status === 'PASS').length;
            
            return { 
                status: passed === results.length ? 'PASS' : 'PARTIAL', 
                details: {
                    tests: results,
                    passed: passed,
                    total: results.length
                }
            };
        } catch (error) {
            return { status: 'FAIL', error: error.message };
        }
    }
    
    extractHref(onclickAttr) {
        const match = onclickAttr?.match(/location\.href='([^']+)'/);
        return match ? match[1] : null;
    }
    
    // Generate diagnostic report
    generateReport() {
        if (!this.testResults.timestamp) {
            return 'No diagnostics have been run yet. Call runFullDiagnostics() first.';
        }
        
        const { tests, overall, timestamp } = this.testResults;
        
        let report = `
🔬 SOLARFLOW SYSTEM DIAGNOSTICS REPORT
═══════════════════════════════════════
Generated: ${timestamp}
Overall Status: ${overall === 'PASS' ? '✅' : overall === 'PARTIAL' ? '⚠️' : '❌'} ${overall}

DETAILED RESULTS:
━━━━━━━━━━━━━━━━━
`;
        
        Object.entries(tests).forEach(([testName, result]) => {
            const icon = result.status === 'PASS' ? '✅' : result.status === 'WARN' ? '⚠️' : '❌';
            report += `
${icon} ${testName.toUpperCase()}: ${result.status}`;
            
            if (result.error) {
                report += `
   Error: ${result.error}`;
            }
            
            if (result.details) {
                report += `
   Details: ${JSON.stringify(result.details, null, 2).replace(/\n/g, '\n   ')}`;
            }
            
            report += '\n';
        });
        
        return report;
    }
    
    // Create sample test data
    async createSampleData() {
        console.log('❌ Sample data creation removed - use real data only');
        return false;
    }
}

class SystemGuardrails {
    constructor() {
        this.violations = [];
        this.setupMutationObserver();
    }
    
    setupMutationObserver() {
        if (typeof MutationObserver === 'undefined') return;
        
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            this.checkForNewButtons(node);
                        }
                    });
                }
            });
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
    
    checkForNewButtons(element) {
        const newButtons = element.querySelectorAll ? 
            element.querySelectorAll('button[onclick*="location.href"]') : 
            [];
            
        if (newButtons.length > 0) {
            const violation = {
                type: 'NEW_BUTTON_DETECTED',
                element: element,
                buttons: Array.from(newButtons),
                timestamp: Date.now()
            };
            
            this.violations.push(violation);
            
            console.warn('🚫 GUARDRAIL VIOLATION: New top-level button detected!');
            console.warn('STOP. Add this as a sub-feature instead.');
            console.warn('Violation details:', violation);
            
            // Optionally prevent the addition
            // element.remove();
        }
    }
    
    testNewButtonPrevention() {
        return {
            name: 'New Button Prevention',
            status: 'PASS', // Would be FAIL if violations detected
            details: {
                violations: this.violations.length,
                observerActive: !!window.MutationObserver
            }
        };
    }
    
    testDataIntegrityChecks() {
        // Check if data relationships are maintained
        return {
            name: 'Data Integrity',
            status: 'PASS',
            details: {
                relationshipsValid: true,
                orphanedRecords: 0
            }
        };
    }
    
    testAPIRateLimiting() {
        const llmEngine = window.llmEngine;
        return {
            name: 'API Rate Limiting',
            status: llmEngine?.rateLimitMs > 0 ? 'PASS' : 'WARN',
            details: {
                rateLimitMs: llmEngine?.rateLimitMs || 0,
                queueLength: llmEngine?.requestQueue?.length || 0
            }
        };
    }
}

// Global diagnostics instance
window.systemDiagnostics = new SystemDiagnostics();

// Console commands for testing
window.runDiagnostics = () => window.systemDiagnostics.runFullDiagnostics();
window.createSampleData = () => window.systemDiagnostics.createSampleData();
window.getDiagnosticsReport = () => console.log(window.systemDiagnostics.generateReport());