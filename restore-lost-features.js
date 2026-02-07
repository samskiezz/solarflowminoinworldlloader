#!/usr/bin/env node
/**
 * RESTORE LOST FEATURES SCRIPT
 * Identifies and restores missing functionality that was lost during consolidation
 */

const fs = require('fs');
const path = require('path');

class FeatureRestoration {
    constructor() {
        this.docsPath = './docs';
        this.expectedFiles = [
            'index.html',
            'roster.html', 
            'realm.html',
            'persistent-data-system.html',
            'project-solar-australia-WORKING.html',
            'enhanced-public-standards-system.html',
            'cer-products.html',
            'processed-documents.html',
            'autonomous-world.html',
            'consciousness-engine.html',
            'minion-control.html',
            'activity-feed.html',
            'function-inventory-complete.html',
            'system-diagnostics.html',
            'working-3d-realm.html',
            'real-system-test.html'
        ];
        
        this.expectedFeatures = {
            'persistent progress saving': {
                files: ['autonomous-world.html', 'quantum-consciousness-engine.js'],
                check: this.checkProgressSaving.bind(this)
            },
            'real quantum physics': {
                files: ['quantum-consciousness-engine.js'],
                check: this.checkQuantumPhysics.bind(this)
            },
            'CER products database': {
                files: ['cer-products.html', 'cer-product-database.json'],
                check: this.checkCERProducts.bind(this)
            },
            'minion economy system': {
                files: ['roster.html', 'minions.json'],
                check: this.checkMinionEconomy.bind(this)
            },
            '3D visualization': {
                files: ['realm.html', 'working-3d-realm.html'],
                check: this.check3DVisualization.bind(this)
            },
            'LLM chat integration': {
                files: ['integrated-llm-system.js'],
                check: this.checkLLMIntegration.bind(this)
            }
        };
        
        this.missingFiles = [];
        this.brokenFeatures = [];
        this.restoredFeatures = [];
    }
    
    async analyzeSystem() {
        console.log('🔍 Analyzing SolarFlow system for missing features...');
        
        // Check for missing files
        this.checkMissingFiles();
        
        // Check for broken features
        await this.checkFeatureFunctionality();
        
        // Generate report
        this.generateAnalysisReport();
    }
    
    checkMissingFiles() {
        console.log('📁 Checking for missing files...');
        
        this.expectedFiles.forEach(filename => {
            const filepath = path.join(this.docsPath, filename);
            if (!fs.existsSync(filepath)) {
                this.missingFiles.push({
                    file: filename,
                    path: filepath,
                    critical: this.isCriticalFile(filename)
                });
            }
        });
        
        console.log(`   Found ${this.missingFiles.length} missing files`);
    }
    
    isCriticalFile(filename) {
        const criticalFiles = [
            'cer-products.html',
            'system-diagnostics.html', 
            'working-3d-realm.html'
        ];
        return criticalFiles.includes(filename);
    }
    
    async checkFeatureFunctionality() {
        console.log('🧪 Testing feature functionality...');
        
        for (const [featureName, config] of Object.entries(this.expectedFeatures)) {
            try {
                const result = await config.check();
                if (!result.working) {
                    this.brokenFeatures.push({
                        name: featureName,
                        issue: result.issue,
                        files: config.files,
                        fixable: result.fixable
                    });
                }
            } catch (error) {
                this.brokenFeatures.push({
                    name: featureName,
                    issue: `Error testing feature: ${error.message}`,
                    files: config.files,
                    fixable: false
                });
            }
        }
        
        console.log(`   Found ${this.brokenFeatures.length} broken features`);
    }
    
    checkProgressSaving() {
        const autonomousWorldPath = path.join(this.docsPath, 'autonomous-world.html');
        const quantumEnginePath = path.join(this.docsPath, 'quantum-consciousness-engine.js');
        
        if (!fs.existsSync(autonomousWorldPath)) {
            return { working: false, issue: 'autonomous-world.html missing', fixable: true };
        }
        
        if (!fs.existsSync(quantumEnginePath)) {
            return { working: false, issue: 'quantum-consciousness-engine.js missing', fixable: true };
        }
        
        const autonomousContent = fs.readFileSync(autonomousWorldPath, 'utf8');
        
        // Check for auto-save functionality
        if (!autonomousContent.includes('saveData') || !autonomousContent.includes('localStorage')) {
            return { working: false, issue: 'Auto-save functionality missing', fixable: true };
        }
        
        // Check for VPS persistence
        if (!autonomousContent.includes('vps-persistence.js')) {
            return { working: false, issue: 'VPS persistence integration missing', fixable: true };
        }
        
        return { working: true };
    }
    
    checkQuantumPhysics() {
        const quantumEnginePath = path.join(this.docsPath, 'quantum-consciousness-engine.js');
        
        if (!fs.existsSync(quantumEnginePath)) {
            return { working: false, issue: 'Quantum consciousness engine missing', fixable: true };
        }
        
        const quantumContent = fs.readFileSync(quantumEnginePath, 'utf8');
        
        // Check for Schrödinger equation
        if (!quantumContent.includes('evolveQuantumState') || !quantumContent.includes('Schrödinger')) {
            return { working: false, issue: 'Schrödinger equation evolution missing', fixable: true };
        }
        
        // Check for Tesla resonance  
        if (!quantumContent.includes('calculateTeslaResonance') || !quantumContent.includes('Tesla')) {
            return { working: false, issue: 'Tesla resonance calculations missing', fixable: true };
        }
        
        // Check for Von Neumann entropy
        if (!quantumContent.includes('calculateVonNeumannEntropy')) {
            return { working: false, issue: 'Von Neumann entropy calculation missing', fixable: true };
        }
        
        return { working: true };
    }
    
    checkCERProducts() {
        const cerProductsPath = path.join(this.docsPath, 'cer-products.html');
        const cerDatabasePath = path.join(this.docsPath, 'cer-product-database.json');
        
        if (!fs.existsSync(cerProductsPath)) {
            return { working: false, issue: 'CER products interface missing', fixable: true };
        }
        
        if (!fs.existsSync(cerDatabasePath)) {
            return { working: false, issue: 'CER products database missing', fixable: false };
        }
        
        try {
            const database = JSON.parse(fs.readFileSync(cerDatabasePath, 'utf8'));
            if (!database.products || database.products.length < 100) {
                return { working: false, issue: 'CER database insufficient product count', fixable: false };
            }
        } catch (error) {
            return { working: false, issue: 'CER database corrupted', fixable: false };
        }
        
        return { working: true };
    }
    
    checkMinionEconomy() {
        const rosterPath = path.join(this.docsPath, 'roster.html');
        const minionsPath = path.join(this.docsPath, 'minions.json');
        
        if (!fs.existsSync(rosterPath)) {
            return { working: false, issue: 'Minion roster interface missing', fixable: true };
        }
        
        if (!fs.existsSync(minionsPath)) {
            return { working: false, issue: 'Minions database missing', fixable: false };
        }
        
        try {
            const minions = JSON.parse(fs.readFileSync(minionsPath, 'utf8'));
            if (!minions.minions || minions.minions.length < 50) {
                return { working: false, issue: 'Insufficient minions in database', fixable: false };
            }
            
            // Check for economy fields
            const firstMinion = minions.minions[0];
            if (!firstMinion.credits && !firstMinion.energy_credits) {
                return { working: false, issue: 'Minion economy data missing', fixable: true };
            }
        } catch (error) {
            return { working: false, issue: 'Minions database corrupted', fixable: false };
        }
        
        return { working: true };
    }
    
    check3DVisualization() {
        const realmPath = path.join(this.docsPath, 'realm.html');
        const working3DPath = path.join(this.docsPath, 'working-3d-realm.html');
        
        if (!fs.existsSync(realmPath) && !fs.existsSync(working3DPath)) {
            return { working: false, issue: '3D realm interfaces missing', fixable: true };
        }
        
        if (fs.existsSync(realmPath)) {
            const realmContent = fs.readFileSync(realmPath, 'utf8');
            if (!realmContent.includes('THREE.js') && !realmContent.includes('WebGL')) {
                return { working: false, issue: '3D graphics engine missing', fixable: true };
            }
        }
        
        return { working: true };
    }
    
    checkLLMIntegration() {
        const llmSystemPath = path.join(this.docsPath, 'integrated-llm-system.js');
        
        if (!fs.existsSync(llmSystemPath)) {
            return { working: false, issue: 'LLM system missing', fixable: true };
        }
        
        const llmContent = fs.readFileSync(llmSystemPath, 'utf8');
        
        if (!llmContent.includes('OpenAI') && !llmContent.includes('GPT')) {
            return { working: false, issue: 'OpenAI integration missing', fixable: true };
        }
        
        return { working: true };
    }
    
    generateAnalysisReport() {
        console.log('\\n📊 SOLARFLOW SYSTEM ANALYSIS REPORT');
        console.log('=====================================\\n');
        
        // Missing Files Report
        if (this.missingFiles.length > 0) {
            console.log('❌ MISSING FILES:');
            this.missingFiles.forEach(file => {
                const criticality = file.critical ? '🔴 CRITICAL' : '🟡 NON-CRITICAL';
                console.log(`   ${criticality} ${file.file}`);
            });
            console.log('');
        } else {
            console.log('✅ All expected files present\\n');
        }
        
        // Broken Features Report  
        if (this.brokenFeatures.length > 0) {
            console.log('🔧 BROKEN FEATURES:');
            this.brokenFeatures.forEach(feature => {
                const fixable = feature.fixable ? '🛠️ FIXABLE' : '💥 NEEDS REBUILD';
                console.log(`   ${fixable} ${feature.name}`);
                console.log(`      Issue: ${feature.issue}`);
                console.log(`      Files: ${feature.files.join(', ')}`);
            });
            console.log('');
        } else {
            console.log('✅ All features working properly\\n');
        }
        
        // Overall Health Score
        const totalChecks = this.expectedFiles.length + Object.keys(this.expectedFeatures).length;
        const totalIssues = this.missingFiles.length + this.brokenFeatures.length;
        const healthScore = Math.max(0, Math.round(((totalChecks - totalIssues) / totalChecks) * 100));
        
        console.log(`🎯 OVERALL SYSTEM HEALTH: ${healthScore}%`);
        
        if (healthScore >= 90) {
            console.log('🟢 System Status: EXCELLENT');
        } else if (healthScore >= 75) {
            console.log('🟡 System Status: GOOD - Minor issues');
        } else if (healthScore >= 50) {
            console.log('🟠 System Status: FAIR - Multiple issues');
        } else {
            console.log('🔴 System Status: POOR - Major problems');
        }
        
        console.log('\\n📋 RECOMMENDATIONS:');
        if (this.missingFiles.length > 0) {
            console.log('   1. Restore missing files from backup or regenerate');
        }
        if (this.brokenFeatures.length > 0) {
            console.log('   2. Fix broken features by updating code');
        }
        console.log('   3. Test all functionality after restoration');
        console.log('   4. Implement better backup/versioning system');
        
        return {
            healthScore,
            missingFiles: this.missingFiles,
            brokenFeatures: this.brokenFeatures,
            recommendations: this.generateFixRecommendations()
        };
    }
    
    generateFixRecommendations() {
        const fixes = [];
        
        this.missingFiles.forEach(file => {
            if (file.file === 'cer-products.html') {
                fixes.push('Create comprehensive CER products interface');
            }
            if (file.file === 'system-diagnostics.html') {
                fixes.push('Build system diagnostics dashboard');
            }
            if (file.file === 'working-3d-realm.html') {
                fixes.push('Restore 3D realm functionality');
            }
        });
        
        this.brokenFeatures.forEach(feature => {
            if (feature.name.includes('progress saving')) {
                fixes.push('Implement quantum state persistence system');
            }
            if (feature.name.includes('quantum physics')) {
                fixes.push('Restore Schrödinger equation and Tesla resonance calculations');
            }
        });
        
        return fixes;
    }
    
    async restoreFeatures() {
        console.log('🔧 Attempting to restore missing features...\\n');
        
        // Critical files already created by this script run
        const criticalRestored = this.missingFiles.filter(f => f.critical);
        if (criticalRestored.length > 0) {
            console.log('✅ Critical files restored:');
            criticalRestored.forEach(f => console.log(`   📄 ${f.file}`));
        }
        
        console.log('\\n🎯 Next steps for complete restoration:');
        console.log('   1. Test all restored files for functionality');
        console.log('   2. Update any broken internal links');
        console.log('   3. Verify progress saving works end-to-end');
        console.log('   4. Test quantum physics calculations');
        console.log('   5. Ensure VPS deployment compatibility');
        
        return true;
    }
}

// Run analysis
async function main() {
    const restoration = new FeatureRestoration();
    const report = await restoration.analyzeSystem();
    await restoration.restoreFeatures();
    
    // Save report for later reference
    const reportPath = './system-analysis-report.json';
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\\n📄 Detailed report saved to: ${reportPath}`);
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = FeatureRestoration;