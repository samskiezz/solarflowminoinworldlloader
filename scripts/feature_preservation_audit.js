#!/usr/bin/env node
/**
 * FEATURE PRESERVATION AUDIT SYSTEM
 * Prevents accidental deletion/breaking of existing features
 * Run before ANY changes to verify all features are intact
 */

const fs = require('fs');
const path = require('path');

const DOCS_DIR = path.join(__dirname, '../docs');
const EXPECTED_FILES = [
    'index.html',
    'roster.html',
    'minion-chat.html',
    'activity-feed.html',
    'minion-control.html',
    'consciousness-engine.html',
    'real-work-consciousness.html',
    'autonomous-world.html',
    'existential-threat-system.html',
    'autonomous-minion-knowledge-system.html',
    'realm.html',
    'simple-solar-australia.html',
    'processed-documents.html', // MISSING - needs restoration
    'project_solar_australia.html',
    'document-dashboard.html',
    'launch.html',
    'realm.js',
    'hive_state.json',
    'cer-product-database.json'
];

const EXPECTED_BUTTONS = [
    '👥 Workforce Manager',
    '💬 Direct Communication', 
    '📊 Economic Activity',
    '🎛️ Shift Controls',
    '🧠 Evolution Tracking',
    '⚙️ Performance Analytics',
    '🌍 Solar Operations',
    'Happiness & Activities', // Updated name
    '🤖 Knowledge Base',
    '🌐 Enter 3D Realm',
    '🇦🇺 Project Solar Australia',
    '🏛️ CER Products & Knowledge',
    '📚 Processed Documents',
    '🔄 Refresh'
];

class FeaturePreservationAudit {
    constructor() {
        this.issues = [];
        this.warnings = [];
        this.fixes = [];
    }

    async runAudit() {
        console.log('🔍 FEATURE PRESERVATION AUDIT STARTING...\n');
        
        await this.checkFileExistence();
        await this.checkButtonIntegrity();
        await this.checkJavaScriptIntegrity();
        await this.checkDataIntegrity();
        
        this.reportResults();
        
        if (this.issues.length > 0) {
            console.log('\n❌ AUDIT FAILED - Critical issues found!');
            process.exit(1);
        } else {
            console.log('\n✅ AUDIT PASSED - All features preserved!');
        }
    }

    async checkFileExistence() {
        console.log('📁 Checking file existence...');
        
        for (const file of EXPECTED_FILES) {
            const filePath = path.join(DOCS_DIR, file);
            
            if (!fs.existsSync(filePath)) {
                if (file === 'processed-documents.html') {
                    this.issues.push(`MISSING CRITICAL FILE: ${file} - Referenced by main interface button`);
                    this.fixes.push(`Need to restore: ${file}`);
                } else {
                    this.issues.push(`MISSING FILE: ${file}`);
                }
            } else {
                // Check file size - empty files indicate problems
                const stats = fs.statSync(filePath);
                if (stats.size < 100) {
                    this.warnings.push(`SUSPICIOUSLY SMALL FILE: ${file} (${stats.size} bytes)`);
                }
            }
        }
    }

    async checkButtonIntegrity() {
        console.log('🔘 Checking button integrity...');
        
        const indexPath = path.join(DOCS_DIR, 'index.html');
        if (!fs.existsSync(indexPath)) {
            this.issues.push('CRITICAL: index.html missing');
            return;
        }
        
        const indexContent = fs.readFileSync(indexPath, 'utf8');
        
        // Check for button references
        const brokenButtons = [];
        const buttonLinks = indexContent.match(/onclick="location\.href='\.\/([^']+)'/g) || [];
        
        for (const link of buttonLinks) {
            const match = link.match(/onclick="location\.href='\.\/([^']+)'/);
            if (match) {
                const linkedFile = match[1];
                const linkedPath = path.join(DOCS_DIR, linkedFile);
                
                if (!fs.existsSync(linkedPath)) {
                    brokenButtons.push(linkedFile);
                    this.issues.push(`BROKEN BUTTON LINK: ${linkedFile} - Button exists but file missing`);
                }
            }
        }
        
        // Check for expected button count
        const buttonCount = (indexContent.match(/class="btn"/g) || []).length;
        if (buttonCount < 12) {
            this.warnings.push(`LOW BUTTON COUNT: Only ${buttonCount} buttons found (expected 14-16)`);
        }
    }

    async checkJavaScriptIntegrity() {
        console.log('⚙️ Checking JavaScript integrity...');
        
        // Check main interface JavaScript
        const indexPath = path.join(DOCS_DIR, 'index.html');
        const indexContent = fs.readFileSync(indexPath, 'utf8');
        
        // Check for critical JavaScript functions
        const requiredFunctions = ['HIVE', 'roster', 'activities', 'ledger'];
        for (const func of requiredFunctions) {
            if (!indexContent.includes(func)) {
                this.warnings.push(`MISSING JS REFERENCE: ${func} not found in main interface`);
            }
        }
        
        // Check for hive_state.json loading
        if (!indexContent.includes('hive_state.json')) {
            this.issues.push('CRITICAL: hive_state.json loading missing from main interface');
        }
    }

    async checkDataIntegrity() {
        console.log('📊 Checking data integrity...');
        
        // Check hive_state.json
        const hiveStatePath = path.join(DOCS_DIR, 'hive_state.json');
        if (fs.existsSync(hiveStatePath)) {
            try {
                const hiveData = JSON.parse(fs.readFileSync(hiveStatePath, 'utf8'));
                
                if (!hiveData.roster || Object.keys(hiveData.roster).length < 20) {
                    this.warnings.push('INCOMPLETE ROSTER: Less than 20 minions in hive_state.json');
                }
                
                if (!hiveData.ledger || !hiveData.ledger.credits_total) {
                    this.warnings.push('MISSING CREDITS: No credit system data in hive_state.json');
                }
            } catch (error) {
                this.issues.push(`CORRUPTED DATA: hive_state.json parse error - ${error.message}`);
            }
        }
        
        // Check CER products database
        const cerPath = path.join(DOCS_DIR, 'cer-product-database.json');
        if (fs.existsSync(cerPath)) {
            try {
                const cerData = JSON.parse(fs.readFileSync(cerPath, 'utf8'));
                if (!cerData.categories || !cerData.metadata) {
                    this.warnings.push('INCOMPLETE CER DATA: Missing categories or metadata');
                }
            } catch (error) {
                this.issues.push(`CORRUPTED CER DATA: ${error.message}`);
            }
        }
    }

    reportResults() {
        console.log('\n📋 AUDIT RESULTS:');
        console.log('=================');
        
        if (this.issues.length === 0 && this.warnings.length === 0) {
            console.log('✅ All features preserved and intact!');
            return;
        }
        
        if (this.issues.length > 0) {
            console.log(`\n❌ CRITICAL ISSUES (${this.issues.length}):`);
            this.issues.forEach((issue, i) => {
                console.log(`  ${i + 1}. ${issue}`);
            });
        }
        
        if (this.warnings.length > 0) {
            console.log(`\n⚠️  WARNINGS (${this.warnings.length}):`);
            this.warnings.forEach((warning, i) => {
                console.log(`  ${i + 1}. ${warning}`);
            });
        }
        
        if (this.fixes.length > 0) {
            console.log(`\n🔧 REQUIRED FIXES (${this.fixes.length}):`);
            this.fixes.forEach((fix, i) => {
                console.log(`  ${i + 1}. ${fix}`);
            });
        }
    }
}

// Run audit if called directly
if (require.main === module) {
    const audit = new FeaturePreservationAudit();
    audit.runAudit().catch(console.error);
}

module.exports = FeaturePreservationAudit;