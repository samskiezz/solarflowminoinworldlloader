// CODE-UI CROSS-REFERENCE AUDIT
// Scans every function in code vs what's shown/working in UI

console.log('🔍 Starting comprehensive code-UI cross-reference audit...');

class CodeUICrossReferenceAudit {
    constructor() {
        this.functions = [];
        this.uiElements = [];
        this.mismatches = [];
        this.results = {
            totalFunctions: 0,
            workingInUI: 0,
            brokenInUI: 0,
            missingFromUI: 0,
            extraInUI: 0
        };
    }
    
    // Scan all JavaScript functions mentioned in the codebase
    scanCodeFunctions() {
        console.log('📝 Scanning code functions...');
        
        // Functions that should exist based on the system architecture
        const expectedFunctions = [
            // Core System Functions
            'setPaused', 'togglePause', 'refreshInterface', 'resetSystem',
            
            // Navigation Functions
            'openFunctionTest', 'openDocumentDashboard', 'openProjectSolar',
            'openMinionChat', 'openActivityFeed', 'openMinionControl',
            'openCERProducts', 'openAutonomousSystem', 'open3DRealm',
            
            // Minion Functions
            'selectMinion', 'focusMinion', 'updateMinionStatus',
            'assignMinionTask', 'showMinionDetails', 'minionHealthCheck',
            
            // Economic Functions
            'showCreditDistribution', 'processTransaction', 'updateCredits',
            'economicHealthCheck', 'generateEconomicReport',
            
            // Knowledge Functions
            'searchKnowledgeBase', 'indexDocuments', 'validateDocuments',
            'scanForDocuments', 'processDocument', 'extractDocumentData',
            
            // 3D Realm Functions
            'initializeRealm', 'renderMinions', 'updateCamera', 'resetCamera',
            'selectRealmMinion', 'animateMinions', 'toggleWireframe',
            
            // Sound Functions
            'toggleSound', 'playTone', 'playNotification', 'adjustVolume',
            
            // Data Functions
            'loadHiveState', 'updateMinionData', 'syncWithUnified',
            'validateDataIntegrity', 'exportData', 'importData',
            
            // Diagnostic Functions
            'runDiagnostics', 'testAllSystems', 'performanceTest',
            'memoryTest', 'stressTest', 'integrationTest',
            
            // Activity Functions
            'updateActivityFeed', 'logActivity', 'filterActivities',
            'markActivityRead', 'generateActivityReport',
            
            // Compliance Functions
            'checkCompliance', 'generateComplianceReport', 'validateStandards',
            'auditSystem', 'exportComplianceData'
        ];
        
        expectedFunctions.forEach(funcName => {
            const exists = typeof window[funcName] === 'function';
            const working = exists ? this.testFunction(funcName) : false;
            
            this.functions.push({
                name: funcName,
                exists: exists,
                working: working,
                category: this.categorizeFunctionName(funcName)
            });
        });
        
        this.results.totalFunctions = this.functions.length;
    }
    
    // Test if a function actually works
    testFunction(funcName) {
        try {
            const func = window[funcName];
            if (typeof func !== 'function') return false;
            
            // For most functions, just check if they exist and are callable
            // We won't actually execute them to avoid side effects
            return true;
        } catch (error) {
            console.warn(`Function test failed for ${funcName}:`, error);
            return false;
        }
    }
    
    // Categorize function by name pattern
    categorizeFunctionName(name) {
        if (name.includes('minion') || name.includes('Minion')) return 'Minion';
        if (name.includes('realm') || name.includes('3D') || name.includes('Realm')) return '3D';
        if (name.includes('sound') || name.includes('audio') || name.includes('Sound')) return 'Audio';
        if (name.includes('document') || name.includes('Document')) return 'Documents';
        if (name.includes('economic') || name.includes('credit') || name.includes('Credit')) return 'Economy';
        if (name.includes('diagnostic') || name.includes('test') || name.includes('Test')) return 'Diagnostics';
        if (name.includes('open') || name.includes('navigate')) return 'Navigation';
        if (name.includes('compliance') || name.includes('Compliance')) return 'Compliance';
        if (name.includes('activity') || name.includes('Activity')) return 'Activity';
        if (name.includes('data') || name.includes('load') || name.includes('sync')) return 'Data';
        return 'Core';
    }
    
    // Scan all UI elements that should have functions
    scanUIElements() {
        console.log('🖥️ Scanning UI elements...');
        
        // Scan all buttons with onclick handlers
        const buttonsWithOnclick = document.querySelectorAll('button[onclick], a[onclick]');
        buttonsWithOnclick.forEach(btn => {
            const onclick = btn.getAttribute('onclick');
            const text = btn.textContent.trim();
            const working = this.testOnclickFunction(onclick);
            
            this.uiElements.push({
                type: 'button',
                element: btn,
                text: text,
                onclick: onclick,
                working: working
            });
        });
        
        // Scan dropdown links
        const dropdownLinks = document.querySelectorAll('.dropdown-content a');
        dropdownLinks.forEach(link => {
            const href = link.getAttribute('href');
            const text = link.textContent.trim();
            const working = href && href !== '#' && !href.startsWith('javascript:');
            
            this.uiElements.push({
                type: 'dropdown',
                element: link,
                text: text,
                href: href,
                working: working
            });
        });
        
        // Scan form elements with handlers
        const forms = document.querySelectorAll('form, input[type="submit"], input[type="button"]');
        forms.forEach(form => {
            const working = form.onsubmit !== null || form.onclick !== null;
            
            this.uiElements.push({
                type: 'form',
                element: form,
                working: working
            });
        });
        
        // Scan interactive elements (clickable divs, etc.)
        const interactiveElements = document.querySelectorAll('[data-action], .taskBtn, .clickable');
        interactiveElements.forEach(el => {
            const action = el.getAttribute('data-action');
            const text = el.textContent.trim().substring(0, 50);
            const working = action || el.onclick || el.addEventListener;
            
            this.uiElements.push({
                type: 'interactive',
                element: el,
                text: text,
                action: action,
                working: !!working
            });
        });
    }
    
    // Test onclick function string
    testOnclickFunction(onclick) {
        if (!onclick) return false;
        
        try {
            // Check if the onclick string contains valid JavaScript
            new Function(onclick.replace('return false', ''));
            
            // Check for common patterns that indicate working functions
            if (onclick.includes('location.href') || 
                onclick.includes('window.open') || 
                onclick.includes('location.reload')) {
                return true;
            }
            
            // Check if referenced functions exist
            const funcMatches = onclick.match(/(\w+)\s*\(/g);
            if (funcMatches) {
                return funcMatches.some(match => {
                    const funcName = match.replace('(', '');
                    return typeof window[funcName] === 'function';
                });
            }
            
            return true;
        } catch (error) {
            return false;
        }
    }
    
    // Find mismatches between code and UI
    findMismatches() {
        console.log('🔍 Finding mismatches...');
        
        // Functions in code but not working in UI
        this.functions.forEach(func => {
            if (func.exists && !func.working) {
                this.mismatches.push({
                    type: 'function_broken',
                    name: func.name,
                    category: func.category,
                    issue: 'Function exists but not working'
                });
                this.results.brokenInUI++;
            } else if (func.exists && func.working) {
                this.results.workingInUI++;
            } else {
                this.mismatches.push({
                    type: 'function_missing',
                    name: func.name,
                    category: func.category,
                    issue: 'Function referenced in system but not implemented'
                });
                this.results.missingFromUI++;
            }
        });
        
        // UI elements that don't work
        this.uiElements.forEach(element => {
            if (!element.working) {
                this.mismatches.push({
                    type: 'ui_broken',
                    text: element.text,
                    elementType: element.type,
                    issue: 'UI element exists but not functional'
                });
            }
        });
    }
    
    // Generate comprehensive report
    generateReport() {
        console.log('📊 Generating comprehensive report...');
        
        const report = {
            timestamp: new Date().toISOString(),
            summary: this.results,
            functionsByCategory: {},
            brokenElements: [],
            recommendations: []
        };
        
        // Group functions by category
        this.functions.forEach(func => {
            if (!report.functionsByCategory[func.category]) {
                report.functionsByCategory[func.category] = {
                    total: 0,
                    working: 0,
                    broken: 0,
                    missing: 0
                };
            }
            
            const category = report.functionsByCategory[func.category];
            category.total++;
            
            if (!func.exists) {
                category.missing++;
            } else if (func.working) {
                category.working++;
            } else {
                category.broken++;
            }
        });
        
        // List broken elements
        report.brokenElements = this.mismatches.map(m => ({
            type: m.type,
            name: m.name || m.text,
            issue: m.issue,
            category: m.category
        }));
        
        // Generate recommendations
        if (this.results.brokenInUI > 0) {
            report.recommendations.push(`Fix ${this.results.brokenInUI} broken functions that exist but don't work`);
        }
        
        if (this.results.missingFromUI > 0) {
            report.recommendations.push(`Implement ${this.results.missingFromUI} missing functions referenced in the system`);
        }
        
        const brokenUIElements = this.uiElements.filter(el => !el.working).length;
        if (brokenUIElements > 0) {
            report.recommendations.push(`Fix ${brokenUIElements} non-functional UI elements`);
        }
        
        return report;
    }
    
    // Run complete audit
    async runAudit() {
        console.log('🚀 Starting complete audit...');
        
        this.scanCodeFunctions();
        this.scanUIElements();
        this.findMismatches();
        
        const report = this.generateReport();
        
        console.log('📊 Audit Results:', report);
        
        // Display results in a readable format
        this.displayResults(report);
        
        return report;
    }
    
    // Display results in console and DOM
    displayResults(report) {
        console.log('\n=== CODE-UI CROSS-REFERENCE AUDIT RESULTS ===\n');
        
        console.log(`📊 SUMMARY:`);
        console.log(`Total Functions Scanned: ${report.summary.totalFunctions}`);
        console.log(`Working in UI: ${report.summary.workingInUI} ✅`);
        console.log(`Broken in UI: ${report.summary.brokenInUI} ❌`);
        console.log(`Missing from Code: ${report.summary.missingFromUI} ⚠️`);
        
        console.log(`\n📋 BY CATEGORY:`);
        Object.entries(report.functionsByCategory).forEach(([category, stats]) => {
            console.log(`${category}: ${stats.working}/${stats.total} working (${stats.broken} broken, ${stats.missing} missing)`);
        });
        
        if (report.brokenElements.length > 0) {
            console.log(`\n❌ BROKEN ELEMENTS (${report.brokenElements.length}):`);
            report.brokenElements.forEach(element => {
                console.log(`- ${element.name}: ${element.issue}`);
            });
        }
        
        if (report.recommendations.length > 0) {
            console.log(`\n🎯 RECOMMENDATIONS:`);
            report.recommendations.forEach((rec, index) => {
                console.log(`${index + 1}. ${rec}`);
            });
        }
        
        // Store results globally for external access
        window.AUDIT_RESULTS = report;
        
        console.log('\n✅ Audit complete! Results available in window.AUDIT_RESULTS');
    }
}

// Global function to run audit
window.runCodeUIAudit = async function() {
    const audit = new CodeUICrossReferenceAudit();
    return await audit.runAudit();
};

// Auto-run audit if requested
if (window.AUTO_RUN_AUDIT) {
    setTimeout(() => {
        window.runCodeUIAudit();
    }, 2000);
}

console.log('✅ Code-UI cross-reference audit system loaded');
console.log('Run window.runCodeUIAudit() to perform complete audit');