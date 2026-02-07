#!/usr/bin/env node

/**
 * SolarFlow Production Bootloader
 * Handles startup, data persistence, and system management for OpenClaw VPS deployment
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

class SolarFlowBootloader {
    constructor() {
        this.version = '2.2.0';
        this.startTime = Date.now();
        this.config = {};
        this.dataDir = process.env.SOLARFLOW_DATA_DIR || '/var/lib/solarflow';
        this.logDir = process.env.SOLARFLOW_LOG_DIR || '/var/log/solarflow';
        this.port = process.env.SOLARFLOW_PORT || 3000;
        this.mode = process.env.NODE_ENV || 'production';
        
        this.log('🚀 SolarFlow Bootloader v' + this.version + ' starting...');
        this.log('📊 Mode: ' + this.mode);
        this.log('📁 Data Directory: ' + this.dataDir);
        this.log('📋 Log Directory: ' + this.logDir);
    }
    
    log(message, level = 'info') {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
        
        console.log(logMessage);
        
        // Write to log file in production
        if (this.mode === 'production') {
            this.writeLogFile(logMessage).catch(err => 
                console.error('Failed to write log:', err.message)
            );
        }
    }
    
    async writeLogFile(message) {
        try {
            await fs.mkdir(this.logDir, { recursive: true });
            const logFile = path.join(this.logDir, `solarflow-${new Date().toISOString().split('T')[0]}.log`);
            await fs.appendFile(logFile, message + '\n', 'utf8');
        } catch (error) {
            console.error('Log write failed:', error.message);
        }
    }
    
    async init() {
        try {
            this.log('🔧 Initializing SolarFlow system...');
            
            // 1. Load configuration
            await this.loadConfiguration();
            
            // 2. Setup data directories  
            await this.setupDirectories();
            
            // 3. Validate system requirements
            await this.validateSystem();
            
            // 4. Setup data persistence
            await this.setupDataPersistence();
            
            // 5. Start health monitoring
            await this.startHealthMonitoring();
            
            // 6. Load saved data
            await this.loadSavedData();
            
            // 7. Start web server
            await this.startWebServer();
            
            // 8. Setup auto-save
            await this.setupAutoSave();
            
            this.log(`✅ SolarFlow system ready! Running on port ${this.port}`);
            this.log(`🌐 Access at: http://localhost:${this.port}`);
            
            // Register cleanup handlers
            this.setupGracefulShutdown();
            
        } catch (error) {
            this.log(`❌ Initialization failed: ${error.message}`, 'error');
            process.exit(1);
        }
    }
    
    async loadConfiguration() {
        try {
            // Load default configuration
            const defaultConfig = {
                server: {
                    port: this.port,
                    staticDir: './docs',
                    enableCompression: true,
                    enableCORS: true
                },
                data: {
                    autoSaveInterval: 30000, // 30 seconds
                    backupInterval: 300000,  // 5 minutes  
                    maxBackups: 24,          // Keep 24 backups (24 hours)
                    compressionLevel: 6
                },
                llm: {
                    enabled: true,
                    provider: 'openai',
                    model: 'gpt-4',
                    maxTokens: 800,
                    temperature: 0.7
                },
                monitoring: {
                    healthCheckInterval: 60000, // 1 minute
                    performanceMetrics: true,
                    errorTracking: true
                },
                features: {
                    autonomousWorld: true,
                    minionChat: true,
                    realTimeUpdates: true,
                    complianceChecking: true
                }
            };
            
            // Try to load production config
            try {
                const configPath = path.join(__dirname, 'config.production.json');
                const configFile = await fs.readFile(configPath, 'utf8');
                const productionConfig = JSON.parse(configFile);
                this.config = { ...defaultConfig, ...productionConfig };
                this.log('📋 Production configuration loaded');
            } catch (configError) {
                this.config = defaultConfig;
                this.log('⚠️ Using default configuration (config.production.json not found)');
            }
            
            // Override with environment variables
            if (process.env.SOLARFLOW_AUTO_SAVE_INTERVAL) {
                this.config.data.autoSaveInterval = parseInt(process.env.SOLARFLOW_AUTO_SAVE_INTERVAL);
            }
            
            this.log(`⚙️ Configuration loaded: ${Object.keys(this.config).length} sections`);
            
        } catch (error) {
            throw new Error(`Configuration loading failed: ${error.message}`);
        }
    }
    
    async setupDirectories() {
        const dirs = [
            this.dataDir,
            this.logDir,
            path.join(this.dataDir, 'backups'),
            path.join(this.dataDir, 'cache'),
            path.join(this.dataDir, 'state'),
            path.join(this.dataDir, 'conversations')
        ];
        
        for (const dir of dirs) {
            try {
                await fs.mkdir(dir, { recursive: true });
                this.log(`📁 Directory created: ${dir}`);
            } catch (error) {
                throw new Error(`Failed to create directory ${dir}: ${error.message}`);
            }
        }
    }
    
    async validateSystem() {
        const checks = [
            {
                name: 'Node.js Version',
                test: () => {
                    const version = process.version.match(/v(\d+)/)[1];
                    return parseInt(version) >= 18;
                },
                error: 'Node.js 18+ required'
            },
            {
                name: 'Static Files',
                test: async () => {
                    try {
                        await fs.access('./docs/index.html');
                        return true;
                    } catch { return false; }
                },
                error: 'Static files not found in ./docs/'
            },
            {
                name: 'Write Permissions',
                test: async () => {
                    try {
                        const testFile = path.join(this.dataDir, '.write-test');
                        await fs.writeFile(testFile, 'test');
                        await fs.unlink(testFile);
                        return true;
                    } catch { return false; }
                },
                error: 'No write permission to data directory'
            },
            {
                name: 'Port Available',
                test: () => {
                    try {
                        const net = require('net');
                        const server = net.createServer();
                        server.listen(this.port);
                        server.close();
                        return true;
                    } catch { return false; }
                },
                error: `Port ${this.port} is not available`
            }
        ];
        
        for (const check of checks) {
            try {
                const passed = await check.test();
                if (passed) {
                    this.log(`✅ ${check.name}: OK`);
                } else {
                    throw new Error(check.error);
                }
            } catch (error) {
                throw new Error(`❌ ${check.name}: ${error.message}`);
            }
        }
    }
    
    async setupDataPersistence() {
        const stateFile = path.join(this.dataDir, 'state', 'solarflow.json');
        
        try {
            // Create state file if it doesn't exist
            try {
                await fs.access(stateFile);
                this.log('📊 Existing state file found');
            } catch {
                const initialState = {
                    version: this.version,
                    created: new Date().toISOString(),
                    lastUpdate: new Date().toISOString(),
                    autonomous: {},
                    minions: [],
                    activities: [],
                    documents: [],
                    conversations: {},
                    hive_state: {}
                };
                
                await fs.writeFile(stateFile, JSON.stringify(initialState, null, 2));
                this.log('📊 Initial state file created');
            }
            
            this.stateFile = stateFile;
            
        } catch (error) {
            throw new Error(`Data persistence setup failed: ${error.message}`);
        }
    }
    
    async startHealthMonitoring() {
        setInterval(async () => {
            try {
                const health = {
                    timestamp: new Date().toISOString(),
                    uptime: Date.now() - this.startTime,
                    memory: process.memoryUsage(),
                    cpu: process.cpuUsage(),
                    version: this.version,
                    pid: process.pid
                };
                
                const healthFile = path.join(this.dataDir, 'health.json');
                await fs.writeFile(healthFile, JSON.stringify(health, null, 2));
                
            } catch (error) {
                this.log(`⚠️ Health monitoring error: ${error.message}`, 'warn');
            }
        }, this.config.monitoring.healthCheckInterval);
        
        this.log('💓 Health monitoring started');
    }
    
    async loadSavedData() {
        try {
            const stateData = await fs.readFile(this.stateFile, 'utf8');
            const state = JSON.parse(stateData);
            
            this.log(`📂 Loaded saved data: ${Object.keys(state).length} sections`);
            this.log(`🕐 Last save: ${state.lastUpdate}`);
            
            // Store for web server to serve
            this.savedState = state;
            
        } catch (error) {
            this.log(`⚠️ Could not load saved data: ${error.message}`, 'warn');
            this.savedState = {};
        }
    }
    
    async startWebServer() {
        return new Promise((resolve, reject) => {
            const express = require('express');
            const compression = require('compression');
            const cors = require('cors');
            const app = express();
            
            try {
                // Middleware
                if (this.config.server.enableCompression) {
                    app.use(compression());
                }
                
                if (this.config.server.enableCORS) {
                    app.use(cors());
                }
                
                app.use(express.json());
                app.use(express.static(this.config.server.staticDir));
                
                // API endpoints for data persistence
                app.get('/api/state', (req, res) => {
                    res.json(this.savedState || {});
                });
                
                app.post('/api/state', async (req, res) => {
                    try {
                        const newState = {
                            ...this.savedState,
                            ...req.body,
                            lastUpdate: new Date().toISOString()
                        };
                        
                        await fs.writeFile(this.stateFile, JSON.stringify(newState, null, 2));
                        this.savedState = newState;
                        
                        res.json({ success: true, message: 'State saved' });
                    } catch (error) {
                        this.log(`❌ State save error: ${error.message}`, 'error');
                        res.status(500).json({ success: false, error: error.message });
                    }
                });
                
                app.get('/api/health', (req, res) => {
                    res.json({
                        status: 'healthy',
                        version: this.version,
                        uptime: Date.now() - this.startTime,
                        memory: process.memoryUsage()
                    });
                });
                
                // Start server
                this.server = app.listen(this.port, () => {
                    this.log(`🌐 Web server started on port ${this.port}`);
                    resolve();
                });
                
            } catch (error) {
                reject(new Error(`Web server startup failed: ${error.message}`));
            }
        });
    }
    
    async setupAutoSave() {
        // Backup current state every interval
        setInterval(async () => {
            try {
                if (!this.savedState) return;
                
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const backupFile = path.join(this.dataDir, 'backups', `backup-${timestamp}.json`);
                
                await fs.writeFile(backupFile, JSON.stringify(this.savedState, null, 2));
                
                // Clean old backups
                await this.cleanOldBackups();
                
                this.log(`💾 Auto-backup created: backup-${timestamp}.json`);
                
            } catch (error) {
                this.log(`⚠️ Auto-backup failed: ${error.message}`, 'warn');
            }
        }, this.config.data.backupInterval);
        
        this.log(`💾 Auto-save enabled (${this.config.data.autoSaveInterval}ms interval)`);
    }
    
    async cleanOldBackups() {
        try {
            const backupsDir = path.join(this.dataDir, 'backups');
            const files = await fs.readdir(backupsDir);
            const backupFiles = files.filter(f => f.startsWith('backup-') && f.endsWith('.json'));
            
            if (backupFiles.length > this.config.data.maxBackups) {
                // Sort by creation time and remove oldest
                const sortedFiles = backupFiles.sort().slice(0, backupFiles.length - this.config.data.maxBackups);
                
                for (const file of sortedFiles) {
                    await fs.unlink(path.join(backupsDir, file));
                    this.log(`🗑️ Removed old backup: ${file}`);
                }
            }
        } catch (error) {
            this.log(`⚠️ Backup cleanup failed: ${error.message}`, 'warn');
        }
    }
    
    setupGracefulShutdown() {
        const shutdown = async (signal) => {
            this.log(`🛑 Received ${signal}, shutting down gracefully...`);
            
            try {
                // Save final state
                if (this.savedState && this.stateFile) {
                    await fs.writeFile(this.stateFile, JSON.stringify(this.savedState, null, 2));
                    this.log('💾 Final state saved');
                }
                
                // Close server
                if (this.server) {
                    this.server.close(() => {
                        this.log('🌐 Web server closed');
                    });
                }
                
                this.log('✅ Graceful shutdown complete');
                process.exit(0);
                
            } catch (error) {
                this.log(`❌ Shutdown error: ${error.message}`, 'error');
                process.exit(1);
            }
        };
        
        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));
        process.on('SIGUSR2', () => shutdown('SIGUSR2')); // For nodemon restart
    }
}

// Install required dependencies if missing
async function checkAndInstallDependencies() {
    const requiredPackages = ['express', 'compression', 'cors'];
    const missingPackages = [];
    
    for (const pkg of requiredPackages) {
        try {
            require(pkg);
        } catch {
            missingPackages.push(pkg);
        }
    }
    
    if (missingPackages.length > 0) {
        console.log(`📦 Installing missing dependencies: ${missingPackages.join(', ')}`);
        try {
            execSync(`npm install ${missingPackages.join(' ')}`, { stdio: 'inherit' });
            console.log('✅ Dependencies installed successfully');
        } catch (error) {
            console.error('❌ Failed to install dependencies:', error.message);
            process.exit(1);
        }
    }
}

// Main execution
async function main() {
    try {
        // Check dependencies first
        await checkAndInstallDependencies();
        
        // Start bootloader
        const bootloader = new SolarFlowBootloader();
        await bootloader.init();
        
    } catch (error) {
        console.error(`❌ SolarFlow startup failed: ${error.message}`);
        process.exit(1);
    }
}

// Auto-run if called directly
if (require.main === module) {
    main();
}

module.exports = SolarFlowBootloader;