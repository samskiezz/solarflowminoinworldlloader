#!/usr/bin/env node
/**
 * AUTO-START SYSTEM - BOOTLOADER RUNS AUTOMATICALLY
 * This ensures the bootloader runs automatically on every startup
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');

class AutoStartSystem {
    constructor() {
        this.isProduction = process.env.NODE_ENV === 'production';
        this.isVPS = process.env.VPS_MODE === 'true';
        this.autoStartFile = './auto-start-enabled';
        this.lockFile = './bootloader.lock';
        
        console.log('🚀 Auto-Start System initializing...');
        console.log(`   Environment: ${this.isProduction ? 'Production' : 'Development'}`);
        console.log(`   VPS Mode: ${this.isVPS}`);
    }
    
    async initialize() {
        try {
            // Check if auto-start is enabled
            if (!fs.existsSync(this.autoStartFile)) {
                console.log('📝 Enabling auto-start for first time...');
                this.enableAutoStart();
            }
            
            // Check if bootloader is already running
            if (this.isBootloaderRunning()) {
                console.log('⚠️ Bootloader already running, skipping...');
                return;
            }
            
            // Run bootloader automatically
            console.log('🔄 Starting bootloader automatically...');
            await this.runBootloader();
            
            // Set up automatic restart detection
            this.setupRestartDetection();
            
            console.log('✅ Auto-start system initialized successfully');
            
        } catch (error) {
            console.error('❌ Auto-start initialization failed:', error.message);
            throw error; // Let caller handle the exit decision
        }
    }
    
    enableAutoStart() {
        // Create auto-start indicator file
        fs.writeFileSync(this.autoStartFile, JSON.stringify({
            enabled: true,
            createdAt: new Date().toISOString(),
            environment: process.env.NODE_ENV || 'development',
            autoBootloader: true
        }, null, 2));
        
        // Add to package.json scripts if not already there
        this.updatePackageJsonScripts();
        
        // Create startup script for different environments
        this.createStartupScripts();
        
        console.log('✅ Auto-start enabled');
    }
    
    updatePackageJsonScripts() {
        const packagePath = './package.json';
        if (!fs.existsSync(packagePath)) return;
        
        try {
            const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
            
            if (!packageData.scripts) packageData.scripts = {};
            
            // Add auto-start scripts
            packageData.scripts = {
                ...packageData.scripts,
                'auto-start': 'node auto-start.js',
                'boot': 'node bootloader.js boot',
                'start-with-boot': 'npm run auto-start && npm start',
                'dev-with-boot': 'npm run auto-start && npm run dev'
            };
            
            fs.writeFileSync(packagePath, JSON.stringify(packageData, null, 2));
            console.log('✅ Updated package.json with auto-start scripts');
            
        } catch (error) {
            console.warn('⚠️ Failed to update package.json:', error.message);
        }
    }
    
    createStartupScripts() {
        // Create startup script for Unix systems
        const startupScript = `#!/bin/bash
# SolarFlow Auto-Start Script
echo "🚀 Starting SolarFlow with bootloader..."

# Run auto-start system
node auto-start.js

# Start the application (if server.js exists)
if [ -f "server.js" ]; then
    echo "🌐 Starting production server..."
    node server.js
else
    echo "📄 Static mode - files served via GitHub Pages"
fi
`;
        
        fs.writeFileSync('./start.sh', startupScript);
        
        try {
            // Make executable
            execSync('chmod +x start.sh');
        } catch (error) {
            console.warn('⚠️ Could not make start.sh executable:', error.message);
        }
        
        // Create Windows batch file
        const windowsScript = `@echo off
echo 🚀 Starting SolarFlow with bootloader...

REM Run auto-start system
node auto-start.js

REM Start the application (if server.js exists)
if exist server.js (
    echo 🌐 Starting production server...
    node server.js
) else (
    echo 📄 Static mode - files served via GitHub Pages
    pause
)
`;
        
        fs.writeFileSync('./start.bat', windowsScript);
        
        console.log('✅ Created startup scripts (start.sh, start.bat)');
    }
    
    isBootloaderRunning() {
        if (!fs.existsSync(this.lockFile)) return false;
        
        try {
            const lockData = JSON.parse(fs.readFileSync(this.lockFile, 'utf8'));
            const lockAge = Date.now() - lockData.startTime;
            
            // Consider lock stale after 2 minutes
            if (lockAge > 120000) {
                fs.unlinkSync(this.lockFile);
                return false;
            }
            
            return true;
        } catch (error) {
            // Invalid lock file, remove it
            try {
                fs.unlinkSync(this.lockFile);
            } catch (e) {}
            return false;
        }
    }
    
    async runBootloader() {
        // Create lock file
        fs.writeFileSync(this.lockFile, JSON.stringify({
            pid: process.pid,
            startTime: Date.now(),
            autoStarted: true
        }));
        
        try {
            // Import and run bootloader
            const SolarFlowBootloader = require('./bootloader.js');
            const bootloader = new SolarFlowBootloader();
            
            // Run boot sequence
            await bootloader.boot();
            
            console.log('🎯 Bootloader completed successfully');
            
            // Remove lock file
            if (fs.existsSync(this.lockFile)) {
                fs.unlinkSync(this.lockFile);
            }
            
            // Start background progress saving (but don't block)
            this.startBackgroundProgressSaving();
            
        } catch (error) {
            console.error('❌ Bootloader failed:', error.message);
            
            // Remove lock file even on failure
            if (fs.existsSync(this.lockFile)) {
                fs.unlinkSync(this.lockFile);
            }
            
            throw error;
        }
    }
    
    startBackgroundProgressSaving() {
        // Fork a background process for continuous saving
        const child = spawn('node', ['-e', `
            const SolarFlowBootloader = require('./bootloader.js');
            const bootloader = new SolarFlowBootloader();
            bootloader.startContinuousProgressSaving();
            console.log('💾 Background progress saving started');
            
            // Keep alive
            setInterval(() => {
                console.log('💾 Background saving active...');
            }, 60000); // Log every minute
        `], {
            detached: true,
            stdio: 'ignore'
        });
        
        child.unref(); // Don't keep parent alive
        
        // Save PID for cleanup
        fs.writeFileSync('./progress-saver.pid', child.pid.toString());
        
        console.log('💾 Background progress saving started (PID:', child.pid, ')');
    }
    
    setupRestartDetection() {
        // Create restart detection system
        const restartDetector = {
            lastStartup: Date.now(),
            restartCount: this.getRestartCount() + 1,
            autoStartEnabled: true,
            environment: process.env.NODE_ENV || 'development'
        };
        
        fs.writeFileSync('./restart-count.json', JSON.stringify(restartDetector, null, 2));
        
        console.log(`🔄 Restart detection active (restart #${restartDetector.restartCount})`);
        
        // Clean up old files on restart
        this.cleanupOldFiles();
    }
    
    getRestartCount() {
        try {
            if (fs.existsSync('./restart-count.json')) {
                const data = JSON.parse(fs.readFileSync('./restart-count.json', 'utf8'));
                return data.restartCount || 0;
            }
        } catch (error) {
            console.warn('⚠️ Could not read restart count:', error.message);
        }
        return 0;
    }
    
    cleanupOldFiles() {
        // Clean up old lock files, PIDs, etc.
        const filesToCleanup = [
            './bootloader.lock',
            './progress-saver.pid'
        ];
        
        filesToCleanup.forEach(file => {
            if (fs.existsSync(file)) {
                try {
                    const stats = fs.statSync(file);
                    const age = Date.now() - stats.mtime.getTime();
                    
                    // Remove files older than 10 minutes
                    if (age > 600000) {
                        fs.unlinkSync(file);
                        console.log(`🧹 Cleaned up old file: ${file}`);
                    }
                } catch (error) {
                    console.warn(`⚠️ Could not cleanup ${file}:`, error.message);
                }
            }
        });
    }
    
    // CLI commands
    static async handleCommand(command) {
        const autoStart = new AutoStartSystem();
        
        switch (command) {
            case 'init':
            case 'start':
                await autoStart.initialize();
                break;
                
            case 'enable':
                autoStart.enableAutoStart();
                console.log('✅ Auto-start enabled');
                break;
                
            case 'disable':
                if (fs.existsSync('./auto-start-enabled')) {
                    fs.unlinkSync('./auto-start-enabled');
                }
                console.log('❌ Auto-start disabled');
                break;
                
            case 'status':
                console.log('📊 Auto-Start System Status:');
                console.log(`   Enabled: ${fs.existsSync('./auto-start-enabled')}`);
                console.log(`   Bootloader Running: ${autoStart.isBootloaderRunning()}`);
                console.log(`   Restart Count: ${autoStart.getRestartCount()}`);
                break;
                
            case 'cleanup':
                autoStart.cleanupOldFiles();
                console.log('✅ Cleanup completed');
                break;
                
            default:
                console.log(`
🚀 SolarFlow Auto-Start System

Commands:
  init/start  - Initialize and start bootloader automatically
  enable      - Enable auto-start for future runs  
  disable     - Disable auto-start
  status      - Show current status
  cleanup     - Clean up old files
  
Usage:
  node auto-start.js init
  npm run auto-start
  ./start.sh (Unix)
  start.bat (Windows)
`);
        }
    }
}

// Run if called directly
if (require.main === module) {
    const command = process.argv[2] || 'init';
    AutoStartSystem.handleCommand(command).catch(console.error);
}

module.exports = AutoStartSystem;