#!/usr/bin/env node
/**
 * SAFETY GUARDRAILS SYSTEM
 * Prevents accidental deletion and feature breaking during development
 * MUST be run before ANY commits or changes
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const DOCS_DIR = path.join(__dirname, '../docs');
const BACKUP_DIR = path.join(__dirname, '../backups');

class SafetyGuardrails {
    constructor() {
        this.protectedFiles = [
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
            'processed-documents.html',
            'project_solar_australia.html',
            'hive_state.json',
            'cer-product-database.json',
            'realm.js'
        ];
        
        this.protectedFeatures = {
            buttons: {
                count: 5,  // Minimum button/dropdown count (consolidated interface)
                required: [
                    'Workforce',      // Dropdown with workforce functions
                    'Intelligence',   // Dropdown with minion intelligence
                    'Solar Ops',      // Dropdown with solar operations  
                    '3D Realm',       // Standalone advanced feature
                    'System'          // Dropdown with system controls
                ]
            },
            dataIntegrity: {
                'hive_state.json': ['minions', 'ledger', 'activities'],
                'cer-product-database.json': ['categories', 'metadata']
            },
            javaScriptFunctions: [
                'HIVE',
                'roster',
                'activities',
                'ledger',
                'hive_state.json'
            ]
        };
        
        this.backupTimestamp = new Date().toISOString().replace(/[:.]/g, '-');
        this.violations = [];
    }

    async enforceGuardrails() {
        console.log('🛡️  SAFETY GUARDRAILS ACTIVATED');
        console.log('==================================');
        
        await this.createBackup();
        await this.checkFileProtection();
        await this.checkFeatureIntegrity();
        await this.checkButtonLinks();
        
        if (this.violations.length > 0) {
            console.log('\n🚨 SAFETY VIOLATIONS DETECTED!');
            console.log('===============================');
            
            this.violations.forEach((violation, i) => {
                console.log(`${i + 1}. ${violation}`);
            });
            
            console.log('\n❌ COMMIT BLOCKED - Fix violations before proceeding!');
            console.log('💡 Run: git restore . && git clean -fd  (to restore from backup if needed)');
            
            process.exit(1);
        }
        
        console.log('\n✅ SAFETY GUARDRAILS PASSED - Proceed with confidence!');
        return true;
    }

    async createBackup() {
        console.log('📦 Creating safety backup...');
        
        if (!fs.existsSync(BACKUP_DIR)) {
            fs.mkdirSync(BACKUP_DIR, { recursive: true });
        }
        
        const backupPath = path.join(BACKUP_DIR, `backup-${this.backupTimestamp}`);
        fs.mkdirSync(backupPath, { recursive: true });
        
        // Backup all protected files
        for (const file of this.protectedFiles) {
            const sourcePath = path.join(DOCS_DIR, file);
            const backupFilePath = path.join(backupPath, file);
            
            if (fs.existsSync(sourcePath)) {
                // Create subdirs if needed
                const backupDir = path.dirname(backupFilePath);
                if (!fs.existsSync(backupDir)) {
                    fs.mkdirSync(backupDir, { recursive: true });
                }
                
                fs.copyFileSync(sourcePath, backupFilePath);
            }
        }
        
        console.log(`   ✓ Backup created: ${backupPath}`);
    }

    async checkFileProtection() {
        console.log('🔒 Checking protected files...');
        
        for (const file of this.protectedFiles) {
            const filePath = path.join(DOCS_DIR, file);
            
            if (!fs.existsSync(filePath)) {
                this.violations.push(`MISSING PROTECTED FILE: ${file} - This file is critical and must not be deleted!`);
                continue;
            }
            
            // Check file size - suspiciously small files indicate corruption
            const stats = fs.statSync(filePath);
            if (stats.size < 100) {
                this.violations.push(`CORRUPTED PROTECTED FILE: ${file} (${stats.size} bytes) - File appears to be empty or corrupted!`);
            }
        }
    }

    async checkFeatureIntegrity() {
        console.log('🎯 Checking feature integrity...');
        
        const indexPath = path.join(DOCS_DIR, 'index.html');
        if (!fs.existsSync(indexPath)) {
            this.violations.push('CRITICAL: index.html missing - Core file cannot be deleted!');
            return;
        }
        
        const indexContent = fs.readFileSync(indexPath, 'utf8');
        
        // Check button and dropdown count (consolidated interface)
        const buttons = indexContent.match(/class="btn"/g) || [];
        const dropdowns = indexContent.match(/class="dropdown"/g) || [];
        const totalControls = buttons.length + dropdowns.length;
        
        if (totalControls < this.protectedFeatures.buttons.count) {
            this.violations.push(`CONTROL COUNT VIOLATION: Only ${totalControls} controls (${buttons.length} buttons + ${dropdowns.length} dropdowns) found, minimum ${this.protectedFeatures.buttons.count} required!`);
        }
        
        // Check for critical JavaScript references
        for (const jsFunc of this.protectedFeatures.javaScriptFunctions) {
            if (!indexContent.includes(jsFunc)) {
                this.violations.push(`JAVASCRIPT VIOLATION: Missing critical reference '${jsFunc}' in main interface!`);
            }
        }
        
        // Check data file integrity
        for (const [dataFile, requiredKeys] of Object.entries(this.protectedFeatures.dataIntegrity)) {
            const dataPath = path.join(DOCS_DIR, dataFile);
            if (fs.existsSync(dataPath)) {
                try {
                    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
                    for (const key of requiredKeys) {
                        if (!(key in data)) {
                            this.violations.push(`DATA INTEGRITY VIOLATION: Missing required key '${key}' in ${dataFile}!`);
                        }
                    }
                } catch (error) {
                    this.violations.push(`DATA CORRUPTION: ${dataFile} is not valid JSON - ${error.message}`);
                }
            }
        }
    }

    async checkButtonLinks() {
        console.log('🔗 Checking button link integrity...');
        
        const indexPath = path.join(DOCS_DIR, 'index.html');
        const indexContent = fs.readFileSync(indexPath, 'utf8');
        
        // Extract all button links
        const buttonLinks = indexContent.match(/onclick="location\.href='\.\/([^']+)'/g) || [];
        
        for (const link of buttonLinks) {
            const match = link.match(/onclick="location\.href='\.\/([^']+)'/);
            if (match) {
                const linkedFile = match[1];
                const linkedPath = path.join(DOCS_DIR, linkedFile);
                
                if (!fs.existsSync(linkedPath)) {
                    this.violations.push(`BROKEN BUTTON LINK: Button links to '${linkedFile}' but file doesn't exist! This will show 404 to users.`);
                }
            }
        }
    }

    // Restore from backup
    static async restoreFromBackup(backupName = null) {
        console.log('🔄 EMERGENCY RESTORE FROM BACKUP');
        console.log('================================');
        
        if (!fs.existsSync(BACKUP_DIR)) {
            console.log('❌ No backups found!');
            return false;
        }
        
        const backups = fs.readdirSync(BACKUP_DIR)
            .filter(name => name.startsWith('backup-'))
            .sort()
            .reverse(); // Most recent first
        
        if (backups.length === 0) {
            console.log('❌ No backups found!');
            return false;
        }
        
        const restoreFrom = backupName || backups[0];
        const backupPath = path.join(BACKUP_DIR, restoreFrom);
        
        if (!fs.existsSync(backupPath)) {
            console.log(`❌ Backup not found: ${restoreFrom}`);
            return false;
        }
        
        console.log(`📦 Restoring from: ${restoreFrom}`);
        
        // Restore all files from backup
        const backupFiles = fs.readdirSync(backupPath);
        for (const file of backupFiles) {
            const backupFilePath = path.join(backupPath, file);
            const targetPath = path.join(DOCS_DIR, file);
            
            if (fs.statSync(backupFilePath).isFile()) {
                fs.copyFileSync(backupFilePath, targetPath);
                console.log(`   ✓ Restored: ${file}`);
            }
        }
        
        console.log('\n✅ RESTORE COMPLETE');
        return true;
    }

    // List available backups
    static listBackups() {
        console.log('📦 AVAILABLE BACKUPS');
        console.log('===================');
        
        if (!fs.existsSync(BACKUP_DIR)) {
            console.log('No backups found.');
            return;
        }
        
        const backups = fs.readdirSync(BACKUP_DIR)
            .filter(name => name.startsWith('backup-'))
            .sort()
            .reverse();
        
        if (backups.length === 0) {
            console.log('No backups found.');
            return;
        }
        
        backups.forEach((backup, i) => {
            const backupPath = path.join(BACKUP_DIR, backup);
            const stats = fs.statSync(backupPath);
            console.log(`${i + 1}. ${backup} (${stats.mtime.toISOString()})`);
        });
    }
}

// Command-line interface
if (require.main === module) {
    const command = process.argv[2];
    
    if (command === 'restore') {
        const backupName = process.argv[3];
        SafetyGuardrails.restoreFromBackup(backupName);
    } else if (command === 'list') {
        SafetyGuardrails.listBackups();
    } else {
        // Default: enforce guardrails
        const guardrails = new SafetyGuardrails();
        guardrails.enforceGuardrails().catch(console.error);
    }
}

module.exports = SafetyGuardrails;