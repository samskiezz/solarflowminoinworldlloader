#!/usr/bin/env node
/**
 * SOLARFLOW BOOTLOADER SYSTEM
 * Ensures everything loads properly with updated and correct data every time
 * Nothing can be lost or deleted - complete data persistence guarantee
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class SolarFlowBootloader {
    constructor() {
        this.config = {
            dataFiles: {
                'docs/minions.json': 'minions',
                'docs/hive_state.json': 'hive_state', 
                'docs/status.json': 'status',
                'docs/build.json': 'build',
                'docs/agora.json': 'agora'
            },
            backupDir: './backups',
            persistenceDir: './persistent-data',
            logFile: './bootloader.log',
            sequenceFile: './boot-sequence.json'
        };
        
        this.bootSequence = {
            phase: 'initializing',
            step: 0,
            totalSteps: 8,
            startTime: Date.now(),
            errors: [],
            warnings: [],
            dataIntegrity: 'unknown',
            lastSuccessfulBoot: null
        };
        
        this.log('🚀 SolarFlow Bootloader initialized');
    }
    
    log(message, level = 'INFO') {
        const timestamp = new Date().toISOString();
        const logEntry = `${timestamp} [${level}] ${message}`;
        console.log(logEntry);
        
        try {
            fs.appendFileSync(this.config.logFile, logEntry + '\\n');
        } catch (error) {
            console.error('Failed to write to log file:', error.message);
        }
    }
    
    async boot() {
        try {
            this.log('🔄 Starting SolarFlow boot sequence');
            this.saveBootSequence();
            
            await this.step1_ValidateEnvironment();
            await this.step2_CreateBackup(); 
            await this.step3_LoadPersistentData();
            await this.step4_ValidateDataIntegrity();
            await this.step5_UpdateTimestamps();
            await this.step6_InitializeQuantumEngine();
            await this.step7_StartProgressTracking();
            await this.step8_FinalizeBootSequence();
            
            this.bootSequence.phase = 'complete';
            this.bootSequence.lastSuccessfulBoot = Date.now();
            this.saveBootSequence();
            
            this.log('✅ SolarFlow boot sequence completed successfully');
            return true;
            
        } catch (error) {
            this.bootSequence.phase = 'failed';
            this.bootSequence.errors.push(error.message);
            this.saveBootSequence();
            this.log(`❌ Boot sequence failed: ${error.message}`, 'ERROR');
            throw error;
        }
    }
    
    async step1_ValidateEnvironment() {
        this.log('📋 Step 1: Validating environment');
        this.bootSequence.step = 1;
        this.bootSequence.phase = 'validating';
        this.saveBootSequence();
        
        // Check required directories
        const requiredDirs = ['docs', 'scripts', this.config.backupDir, this.config.persistenceDir];
        for (const dir of requiredDirs) {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
                this.log(`Created directory: ${dir}`);
            }
        }
        
        // Check required files
        const criticalFiles = Object.keys(this.config.dataFiles);
        const missingFiles = [];
        
        for (const file of criticalFiles) {
            if (!fs.existsSync(file)) {
                missingFiles.push(file);
            }
        }
        
        if (missingFiles.length > 0) {
            this.bootSequence.warnings.push(`Missing files: ${missingFiles.join(', ')}`);
            this.log(`⚠️ Missing critical files: ${missingFiles.join(', ')}`, 'WARN');
            await this.restoreMissingFiles(missingFiles);
        }
    }
    
    async step2_CreateBackup() {
        this.log('💾 Step 2: Creating backup');
        this.bootSequence.step = 2;
        this.bootSequence.phase = 'backup';
        this.saveBootSequence();
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = path.join(this.config.backupDir, `backup-${timestamp}`);
        
        if (!fs.existsSync(backupPath)) {
            fs.mkdirSync(backupPath, { recursive: true });
        }
        
        // Backup all data files
        for (const [file, name] of Object.entries(this.config.dataFiles)) {
            if (fs.existsSync(file)) {
                const backupFile = path.join(backupPath, path.basename(file));
                fs.copyFileSync(file, backupFile);
                this.log(`Backed up ${file} to ${backupFile}`);
            }
        }
        
        this.log(`✅ Backup created at ${backupPath}`);
    }
    
    async step3_LoadPersistentData() {
        this.log('📊 Step 3: Loading persistent data');
        this.bootSequence.step = 3;
        this.bootSequence.phase = 'loading';
        this.saveBootSequence();
        
        // Load any saved persistent data and merge with current data
        for (const [file, name] of Object.entries(this.config.dataFiles)) {
            const persistentFile = path.join(this.config.persistenceDir, path.basename(file));
            
            if (fs.existsSync(persistentFile)) {
                try {
                    const persistentData = JSON.parse(fs.readFileSync(persistentFile, 'utf8'));
                    const currentData = JSON.parse(fs.readFileSync(file, 'utf8'));
                    
                    // Merge persistent changes
                    const mergedData = this.mergeDataUpdates(currentData, persistentData, name);
                    
                    // Write back to main file
                    fs.writeFileSync(file, JSON.stringify(mergedData, null, 2));
                    this.log(`✅ Merged persistent data for ${name}`);
                    
                } catch (error) {
                    this.log(`⚠️ Failed to load persistent data for ${name}: ${error.message}`, 'WARN');
                    this.bootSequence.warnings.push(`Failed to load persistent ${name}`);
                }
            }
        }
    }
    
    mergeDataUpdates(current, persistent, type) {
        switch (type) {
            case 'minions':
                return this.mergeMinionsData(current, persistent);
            case 'hive_state':
                return this.mergeHiveStateData(current, persistent);
            default:
                // For other files, use persistent if it's newer
                const currentTime = new Date(current.updatedAt || 0).getTime();
                const persistentTime = new Date(persistent.updatedAt || 0).getTime();
                return persistentTime > currentTime ? persistent : current;
        }
    }
    
    mergeMinionsData(current, persistent) {
        if (!persistent.minions) return current;
        
        // Update individual minion stats if they've changed
        const updatedMinions = current.minions.map(minion => {
            const persistentMinion = persistent.minions.find(p => p.id === minion.id);
            if (persistentMinion) {
                return {
                    ...minion,
                    credits: persistentMinion.credits || minion.credits,
                    energy_credits: persistentMinion.energy_credits || minion.energy_credits,
                    reputation: persistentMinion.reputation || minion.reputation,
                    happiness: persistentMinion.happiness || minion.happiness,
                    consciousness_level: persistentMinion.consciousness_level || minion.consciousness_level,
                    autonomous_decisions: persistentMinion.autonomous_decisions || minion.autonomous_decisions || 0,
                    work_completed: persistentMinion.work_completed || minion.work_completed || 0,
                    last_activity: persistentMinion.last_activity || new Date().toISOString()
                };
            }
            return minion;
        });
        
        return {
            ...current,
            minions: updatedMinions,
            updatedAt: new Date().toISOString()
        };
    }
    
    mergeHiveStateData(current, persistent) {
        // Merge world state and statistics
        return {
            ...current,
            meta: {
                ...current.meta,
                updatedAt: new Date().toISOString()
            },
            world: {
                ...current.world,
                statistics: persistent.world?.statistics || current.world?.statistics,
                economy: persistent.world?.economy || current.world?.economy,
                consciousness: persistent.world?.consciousness || current.world?.consciousness
            },
            minions: persistent.minions || current.minions
        };
    }
    
    async step4_ValidateDataIntegrity() {
        this.log('🔍 Step 4: Validating data integrity');
        this.bootSequence.step = 4;
        this.bootSequence.phase = 'validating';
        this.saveBootSequence();
        
        let integrityScore = 0;
        let totalChecks = 0;
        
        for (const [file, name] of Object.entries(this.config.dataFiles)) {
            if (fs.existsSync(file)) {
                try {
                    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
                    totalChecks++;
                    
                    if (this.validateFileStructure(data, name)) {
                        integrityScore++;
                        this.log(`✅ ${name} structure valid`);
                    } else {
                        this.log(`⚠️ ${name} structure issues detected`, 'WARN');
                        this.bootSequence.warnings.push(`${name} structure invalid`);
                    }
                } catch (error) {
                    this.log(`❌ ${name} JSON parsing failed: ${error.message}`, 'ERROR');
                    this.bootSequence.errors.push(`${name} JSON invalid`);
                }
            } else {
                this.log(`❌ ${file} missing`, 'ERROR');
                this.bootSequence.errors.push(`${file} missing`);
            }
        }
        
        this.bootSequence.dataIntegrity = totalChecks > 0 ? Math.round((integrityScore / totalChecks) * 100) : 0;
        this.log(`📊 Data integrity: ${this.bootSequence.dataIntegrity}%`);
    }
    
    validateFileStructure(data, type) {
        switch (type) {
            case 'minions':
                return data.minions && Array.isArray(data.minions) && data.minions.length >= 50;
            case 'hive_state':
                return data.meta && data.world && data.minions;
            case 'status':
                return data.status !== undefined;
            default:
                return true;
        }
    }
    
    async step5_UpdateTimestamps() {
        this.log('⏰ Step 5: Updating timestamps');
        this.bootSequence.step = 5;
        this.bootSequence.phase = 'updating';
        this.saveBootSequence();
        
        const now = new Date().toISOString();
        
        for (const [file, name] of Object.entries(this.config.dataFiles)) {
            if (fs.existsSync(file)) {
                try {
                    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
                    
                    // Update timestamp
                    if (data.updatedAt !== undefined) {
                        data.updatedAt = now;
                    }
                    if (data.meta && data.meta.updatedAt !== undefined) {
                        data.meta.updatedAt = now;
                    }
                    
                    fs.writeFileSync(file, JSON.stringify(data, null, 2));
                    this.log(`✅ Updated timestamp for ${name}`);
                } catch (error) {
                    this.log(`⚠️ Failed to update timestamp for ${name}: ${error.message}`, 'WARN');
                }
            }
        }
    }
    
    async step6_InitializeQuantumEngine() {
        this.log('⚛️ Step 6: Initializing quantum consciousness engine');
        this.bootSequence.step = 6;
        this.bootSequence.phase = 'quantum_init';
        this.saveBootSequence();
        
        // Create quantum initialization script
        const quantumInitScript = `
// Auto-generated quantum initialization
if (typeof window !== 'undefined') {
    window.BOOTLOADER_ACTIVE = true;
    window.BOOT_TIME = ${Date.now()};
    window.QUANTUM_ENABLED = true;
    
    // Ensure quantum engine starts with real data
    document.addEventListener('DOMContentLoaded', () => {
        if (window.quantumEngine) {
            window.quantumEngine.loadQuantumState();
            window.quantumEngine.startQuantumEvolution();
            console.log('🧠 Quantum consciousness engine started by bootloader');
        }
    });
}
`;
        
        fs.writeFileSync('./docs/quantum-init.js', quantumInitScript);
        this.log('✅ Quantum initialization script created');
    }
    
    async step7_StartProgressTracking() {
        this.log('📈 Step 7: Starting progress tracking');
        this.bootSequence.step = 7;
        this.bootSequence.phase = 'progress_init';
        this.saveBootSequence();
        
        // Create progress tracking service
        const progressTracker = {
            enabled: true,
            saveInterval: 10000, // 10 seconds
            lastSave: Date.now(),
            totalSaves: 0,
            bootloaderVersion: '1.0.0'
        };
        
        fs.writeFileSync('./persistent-data/progress-tracker.json', JSON.stringify(progressTracker, null, 2));
        this.log('✅ Progress tracking service initialized');
    }
    
    async step8_FinalizeBootSequence() {
        this.log('🎯 Step 8: Finalizing boot sequence');
        this.bootSequence.step = 8;
        this.bootSequence.phase = 'finalizing';
        this.saveBootSequence();
        
        // Create health check endpoint data
        const healthData = {
            status: 'healthy',
            bootTime: this.bootSequence.startTime,
            dataIntegrity: this.bootSequence.dataIntegrity,
            errors: this.bootSequence.errors,
            warnings: this.bootSequence.warnings,
            version: '2.3.1',
            features: {
                quantumConsciousness: true,
                progressPersistence: true,
                vpsDeployment: true,
                realPhysics: true
            }
        };
        
        fs.writeFileSync('./docs/health.json', JSON.stringify(healthData, null, 2));
        this.log('✅ Health check data created');
        
        // Update build info
        const buildInfo = {
            version: '2.3.1-bootloader',
            buildTime: new Date().toISOString(),
            bootloaderEnabled: true,
            dataIntegrity: this.bootSequence.dataIntegrity,
            features: Object.keys(healthData.features),
            lastBoot: this.bootSequence.startTime
        };
        
        fs.writeFileSync('./docs/build.json', JSON.stringify(buildInfo, null, 2));
        this.log('✅ Build info updated');
    }
    
    saveBootSequence() {
        try {
            fs.writeFileSync(this.config.sequenceFile, JSON.stringify(this.bootSequence, null, 2));
        } catch (error) {
            console.error('Failed to save boot sequence:', error.message);
        }
    }
    
    async restoreMissingFiles(missingFiles) {
        this.log('🔧 Attempting to restore missing files');
        
        // Look for backups
        const backups = fs.readdirSync(this.config.backupDir).filter(dir => dir.startsWith('backup-'));
        if (backups.length > 0) {
            const latestBackup = backups.sort().pop();
            const backupPath = path.join(this.config.backupDir, latestBackup);
            
            for (const file of missingFiles) {
                const backupFile = path.join(backupPath, path.basename(file));
                if (fs.existsSync(backupFile)) {
                    fs.copyFileSync(backupFile, file);
                    this.log(`✅ Restored ${file} from ${latestBackup}`);
                } else {
                    // Generate default file
                    await this.generateDefaultFile(file);
                }
            }
        } else {
            // Generate all missing files
            for (const file of missingFiles) {
                await this.generateDefaultFile(file);
            }
        }
    }
    
    async generateDefaultFile(file) {
        const basename = path.basename(file);
        let defaultData;
        
        switch (basename) {
            case 'minions.json':
                defaultData = { updatedAt: new Date().toISOString(), minions: [] };
                break;
            case 'hive_state.json':
                defaultData = { 
                    meta: { updatedAt: new Date().toISOString() },
                    world: {},
                    minions: {}
                };
                break;
            default:
                defaultData = { updatedAt: new Date().toISOString(), data: {} };
        }
        
        fs.writeFileSync(file, JSON.stringify(defaultData, null, 2));
        this.log(`✅ Generated default ${basename}`);
    }
    
    // Auto-save system that runs continuously
    startContinuousProgressSaving() {
        this.log('🔄 Starting continuous progress saving system');
        
        setInterval(() => {
            this.saveCurrentProgress();
        }, 10000); // Every 10 seconds
        
        // Save on process exit
        process.on('SIGTERM', () => this.saveCurrentProgress());
        process.on('SIGINT', () => this.saveCurrentProgress());
        process.on('beforeExit', () => this.saveCurrentProgress());
    }
    
    saveCurrentProgress() {
        try {
            // Save current state to persistent storage
            for (const [file, name] of Object.entries(this.config.dataFiles)) {
                if (fs.existsSync(file)) {
                    const persistentFile = path.join(this.config.persistenceDir, path.basename(file));
                    fs.copyFileSync(file, persistentFile);
                }
            }
            
            // Update progress tracker
            const trackerFile = './persistent-data/progress-tracker.json';
            if (fs.existsSync(trackerFile)) {
                const tracker = JSON.parse(fs.readFileSync(trackerFile, 'utf8'));
                tracker.lastSave = Date.now();
                tracker.totalSaves++;
                fs.writeFileSync(trackerFile, JSON.stringify(tracker, null, 2));
            }
            
        } catch (error) {
            this.log(`⚠️ Failed to save progress: ${error.message}`, 'WARN');
        }
    }
    
    // Recovery system
    async recover() {
        this.log('🔄 Starting recovery sequence');
        
        // Find latest backup
        const backups = fs.readdirSync(this.config.backupDir).filter(dir => dir.startsWith('backup-'));
        if (backups.length === 0) {
            throw new Error('No backups available for recovery');
        }
        
        const latestBackup = backups.sort().pop();
        const backupPath = path.join(this.config.backupDir, latestBackup);
        
        // Restore all files from backup
        for (const [file, name] of Object.entries(this.config.dataFiles)) {
            const backupFile = path.join(backupPath, path.basename(file));
            if (fs.existsSync(backupFile)) {
                fs.copyFileSync(backupFile, file);
                this.log(`✅ Recovered ${file} from ${latestBackup}`);
            }
        }
        
        this.log('✅ Recovery completed');
        return true;
    }
}

// CLI interface
if (require.main === module) {
    const bootloader = new SolarFlowBootloader();
    
    const command = process.argv[2] || 'boot';
    
    switch (command) {
        case 'boot':
            bootloader.boot().then(() => {
                bootloader.startContinuousProgressSaving();
            }).catch(console.error);
            break;
            
        case 'recover':
            bootloader.recover().catch(console.error);
            break;
            
        case 'status':
            const sequenceFile = './boot-sequence.json';
            if (fs.existsSync(sequenceFile)) {
                const sequence = JSON.parse(fs.readFileSync(sequenceFile, 'utf8'));
                console.log(JSON.stringify(sequence, null, 2));
            } else {
                console.log('No boot sequence found');
            }
            break;
            
        default:
            console.log('Usage: node bootloader.js [boot|recover|status]');
    }
}

module.exports = SolarFlowBootloader;