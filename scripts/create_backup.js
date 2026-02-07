#!/usr/bin/env node

/**
 * SolarFlow Backup Creation Script
 * Creates comprehensive backups of system data and configuration
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

class SolarFlowBackup {
    constructor() {
        this.timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        this.backupDir = process.env.SOLARFLOW_BACKUP_DIR || './backups';
        this.dataDir = process.env.SOLARFLOW_DATA_DIR || '/var/lib/solarflow';
        this.version = require('../package.json').version;
        
        console.log(`🗄️ SolarFlow Backup v${this.version} starting...`);
    }
    
    async createBackup() {
        try {
            console.log('📦 Creating comprehensive backup...');
            
            // 1. Setup backup directory
            await this.setupBackupDirectory();
            
            // 2. Backup configuration files
            await this.backupConfiguration();
            
            // 3. Backup application data
            await this.backupApplicationData();
            
            // 4. Backup static files
            await this.backupStaticFiles();
            
            // 5. Create backup manifest
            await this.createBackupManifest();
            
            // 6. Create compressed archive
            const archivePath = await this.createCompressedArchive();
            
            console.log(`✅ Backup completed successfully!`);
            console.log(`📁 Backup archive: ${archivePath}`);
            
            return archivePath;
            
        } catch (error) {
            console.error(`❌ Backup failed: ${error.message}`);
            throw error;
        }
    }
    
    async setupBackupDirectory() {
        const backupPath = path.join(this.backupDir, `solarflow-backup-${this.timestamp}`);
        await fs.mkdir(backupPath, { recursive: true });
        
        this.currentBackupPath = backupPath;
        console.log(`📁 Backup directory created: ${backupPath}`);
    }
    
    async backupConfiguration() {
        console.log('⚙️ Backing up configuration files...');
        
        const configFiles = [
            'package.json',
            'config.production.json',
            '.env',
            '.env.example',
            'VERSION_TRACKER.md'
        ];
        
        const configBackupDir = path.join(this.currentBackupPath, 'config');
        await fs.mkdir(configBackupDir, { recursive: true });
        
        for (const file of configFiles) {
            try {
                const sourcePath = path.join(process.cwd(), file);
                const targetPath = path.join(configBackupDir, file);
                
                await fs.access(sourcePath);
                await fs.copyFile(sourcePath, targetPath);
                
                console.log(`✅ Backed up: ${file}`);
            } catch (error) {
                console.log(`⚠️ Skipped: ${file} (not found)`);
            }
        }
    }
    
    async backupApplicationData() {
        console.log('💾 Backing up application data...');
        
        const dataBackupDir = path.join(this.currentBackupPath, 'data');
        await fs.mkdir(dataBackupDir, { recursive: true });
        
        // Browser localStorage data (if available)
        const browserDataFiles = [
            'docs/hive_state.json',
            'docs/minions.json',
            'docs/status.json',
            'docs/agora.json',
            'docs/cer-product-database.json'
        ];
        
        for (const file of browserDataFiles) {
            try {
                const sourcePath = path.join(process.cwd(), file);
                const targetPath = path.join(dataBackupDir, path.basename(file));
                
                await fs.access(sourcePath);
                await fs.copyFile(sourcePath, targetPath);
                
                console.log(`✅ Data backed up: ${file}`);
            } catch (error) {
                console.log(`⚠️ Data file not found: ${file}`);
            }
        }
        
        // Server data directory (if exists)
        try {
            await fs.access(this.dataDir);
            
            const serverDataDir = path.join(dataBackupDir, 'server');
            await fs.mkdir(serverDataDir, { recursive: true });
            
            // Copy server state files
            try {
                execSync(`cp -r ${this.dataDir}/* ${serverDataDir}/`, { stdio: 'pipe' });
                console.log(`✅ Server data backed up from: ${this.dataDir}`);
            } catch (error) {
                console.log(`⚠️ Server data backup failed: ${error.message}`);
            }
        } catch (error) {
            console.log(`ℹ️ Server data directory not found: ${this.dataDir}`);
        }
    }
    
    async backupStaticFiles() {
        console.log('🌐 Backing up static files...');
        
        const staticBackupDir = path.join(this.currentBackupPath, 'static');
        await fs.mkdir(staticBackupDir, { recursive: true });
        
        try {
            // Copy docs directory (contains the web application)
            execSync(`cp -r docs/* ${staticBackupDir}/`, { stdio: 'pipe' });
            console.log(`✅ Static files backed up`);
        } catch (error) {
            console.log(`⚠️ Static files backup failed: ${error.message}`);
        }
    }
    
    async createBackupManifest() {
        console.log('📋 Creating backup manifest...');
        
        const manifest = {
            created: new Date().toISOString(),
            version: this.version,
            platform: process.platform,
            nodeVersion: process.version,
            backupType: 'complete',
            contents: {
                configuration: await this.getDirectoryContents(path.join(this.currentBackupPath, 'config')),
                data: await this.getDirectoryContents(path.join(this.currentBackupPath, 'data')),
                static: await this.getDirectoryContents(path.join(this.currentBackupPath, 'static'))
            },
            gitInfo: await this.getGitInfo(),
            systemInfo: {
                hostname: require('os').hostname(),
                platform: process.platform,
                arch: process.arch,
                memoryUsage: process.memoryUsage(),
                uptime: process.uptime()
            }
        };
        
        const manifestPath = path.join(this.currentBackupPath, 'BACKUP_MANIFEST.json');
        await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
        
        console.log(`✅ Backup manifest created`);
    }
    
    async getDirectoryContents(dirPath) {
        try {
            const files = await fs.readdir(dirPath, { recursive: true });
            const fileStats = [];
            
            for (const file of files) {
                try {
                    const fullPath = path.join(dirPath, file);
                    const stats = await fs.stat(fullPath);
                    
                    fileStats.push({
                        name: file,
                        size: stats.size,
                        modified: stats.mtime.toISOString(),
                        type: stats.isDirectory() ? 'directory' : 'file'
                    });
                } catch (error) {
                    // Skip files that can't be accessed
                }
            }
            
            return fileStats;
        } catch (error) {
            return [];
        }
    }
    
    async getGitInfo() {
        try {
            return {
                commit: execSync('git rev-parse HEAD', { encoding: 'utf8', stdio: 'pipe' }).trim(),
                branch: execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8', stdio: 'pipe' }).trim(),
                status: execSync('git status --porcelain', { encoding: 'utf8', stdio: 'pipe' }).trim(),
                lastCommitDate: execSync('git log -1 --format=%cd', { encoding: 'utf8', stdio: 'pipe' }).trim()
            };
        } catch (error) {
            return { error: 'Git information not available' };
        }
    }
    
    async createCompressedArchive() {
        console.log('🗜️ Creating compressed archive...');
        
        const archiveName = `solarflow-backup-${this.timestamp}.tar.gz`;
        const archivePath = path.join(this.backupDir, archiveName);
        
        try {
            const backupDirName = path.basename(this.currentBackupPath);
            execSync(`tar -czf ${archivePath} -C ${this.backupDir} ${backupDirName}`, { stdio: 'pipe' });
            
            // Calculate archive size
            const stats = await fs.stat(archivePath);
            const sizeInMB = (stats.size / 1024 / 1024).toFixed(2);
            
            console.log(`✅ Archive created: ${archiveName} (${sizeInMB}MB)`);
            
            // Clean up temporary directory
            execSync(`rm -rf ${this.currentBackupPath}`, { stdio: 'pipe' });
            
            return archivePath;
            
        } catch (error) {
            throw new Error(`Archive creation failed: ${error.message}`);
        }
    }
    
    // Cleanup old backups
    async cleanupOldBackups(maxBackups = 10) {
        console.log('🧹 Cleaning up old backups...');
        
        try {
            const files = await fs.readdir(this.backupDir);
            const backupFiles = files.filter(f => 
                f.startsWith('solarflow-backup-') && f.endsWith('.tar.gz')
            );
            
            if (backupFiles.length > maxBackups) {
                // Sort by name (which includes timestamp) and remove oldest
                const sortedFiles = backupFiles.sort();
                const filesToRemove = sortedFiles.slice(0, backupFiles.length - maxBackups);
                
                for (const file of filesToRemove) {
                    await fs.unlink(path.join(this.backupDir, file));
                    console.log(`🗑️ Removed old backup: ${file}`);
                }
            }
        } catch (error) {
            console.log(`⚠️ Cleanup failed: ${error.message}`);
        }
    }
}

// Restore functionality
class SolarFlowRestore {
    constructor(backupPath) {
        this.backupPath = backupPath;
        this.restoreDir = './restored';
    }
    
    async restore() {
        try {
            console.log(`📥 Restoring from backup: ${this.backupPath}`);
            
            // 1. Extract backup
            await this.extractBackup();
            
            // 2. Read manifest
            const manifest = await this.readManifest();
            
            // 3. Restore configuration
            await this.restoreConfiguration();
            
            // 4. Restore data
            await this.restoreData();
            
            // 5. Restore static files
            await this.restoreStaticFiles();
            
            console.log(`✅ Restore completed successfully!`);
            console.log(`📁 Files restored to: ${this.restoreDir}`);
            
        } catch (error) {
            console.error(`❌ Restore failed: ${error.message}`);
            throw error;
        }
    }
    
    async extractBackup() {
        await fs.mkdir(this.restoreDir, { recursive: true });
        execSync(`tar -xzf ${this.backupPath} -C ${this.restoreDir}`, { stdio: 'pipe' });
        
        // Find extracted directory
        const files = await fs.readdir(this.restoreDir);
        const backupDir = files.find(f => f.startsWith('solarflow-backup-'));
        
        if (!backupDir) {
            throw new Error('Invalid backup archive structure');
        }
        
        this.extractedPath = path.join(this.restoreDir, backupDir);
        console.log(`📦 Backup extracted to: ${this.extractedPath}`);
    }
    
    async readManifest() {
        const manifestPath = path.join(this.extractedPath, 'BACKUP_MANIFEST.json');
        const manifestData = await fs.readFile(manifestPath, 'utf8');
        
        const manifest = JSON.parse(manifestData);
        console.log(`📋 Backup manifest: Created ${manifest.created}, Version ${manifest.version}`);
        
        return manifest;
    }
    
    async restoreConfiguration() {
        console.log('⚙️ Restoring configuration...');
        
        const configPath = path.join(this.extractedPath, 'config');
        try {
            const files = await fs.readdir(configPath);
            
            for (const file of files) {
                const sourcePath = path.join(configPath, file);
                const targetPath = path.join(process.cwd(), file);
                
                await fs.copyFile(sourcePath, targetPath);
                console.log(`✅ Restored: ${file}`);
            }
        } catch (error) {
            console.log(`⚠️ Configuration restore failed: ${error.message}`);
        }
    }
    
    async restoreData() {
        console.log('💾 Restoring data...');
        
        const dataPath = path.join(this.extractedPath, 'data');
        try {
            const files = await fs.readdir(dataPath, { recursive: true });
            
            for (const file of files) {
                const sourcePath = path.join(dataPath, file);
                const stats = await fs.stat(sourcePath);
                
                if (stats.isFile()) {
                    // Restore to docs directory for browser data
                    const targetPath = path.join(process.cwd(), 'docs', path.basename(file));
                    await fs.copyFile(sourcePath, targetPath);
                    console.log(`✅ Data restored: ${file}`);
                }
            }
        } catch (error) {
            console.log(`⚠️ Data restore failed: ${error.message}`);
        }
    }
    
    async restoreStaticFiles() {
        console.log('🌐 Restoring static files...');
        
        const staticPath = path.join(this.extractedPath, 'static');
        const docsPath = path.join(process.cwd(), 'docs');
        
        try {
            // Create docs directory if it doesn't exist
            await fs.mkdir(docsPath, { recursive: true });
            
            // Copy static files
            execSync(`cp -r ${staticPath}/* ${docsPath}/`, { stdio: 'pipe' });
            console.log(`✅ Static files restored`);
        } catch (error) {
            console.log(`⚠️ Static files restore failed: ${error.message}`);
        }
    }
}

// Command Line Interface
async function main() {
    const args = process.argv.slice(2);
    const command = args[0];
    
    if (command === 'restore') {
        const backupPath = args[1];
        if (!backupPath) {
            console.error('❌ Please specify backup file path');
            console.log('Usage: node create_backup.js restore <backup-file.tar.gz>');
            process.exit(1);
        }
        
        const restore = new SolarFlowRestore(backupPath);
        await restore.restore();
        
    } else {
        // Default: create backup
        const backup = new SolarFlowBackup();
        await backup.createBackup();
        await backup.cleanupOldBackups(10);
    }
}

// Handle CLI execution
if (require.main === module) {
    main().catch(error => {
        console.error(`❌ Backup error: ${error.message}`);
        process.exit(1);
    });
}

module.exports = { SolarFlowBackup, SolarFlowRestore };