#!/usr/bin/env node

/**
 * SolarFlow Production Deployment Script
 * Handles automated deployment to VPS servers
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

class SolarFlowDeployment {
    constructor() {
        this.version = require('../package.json').version;
        this.deployTime = new Date().toISOString();
        this.log(`🚀 SolarFlow Deployment v${this.version} starting...`);
    }
    
    log(message, level = 'info') {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`);
    }
    
    async deploy() {
        try {
            this.log('📋 Starting deployment process...');
            
            // 1. Pre-deployment checks
            await this.preDeploymentChecks();
            
            // 2. Build application
            await this.buildApplication();
            
            // 3. Run validation tests
            await this.runValidation();
            
            // 4. Create deployment package
            await this.createDeploymentPackage();
            
            // 5. Update deployment timestamp
            await this.updateDeploymentTimestamp();
            
            this.log('✅ Deployment completed successfully!');
            this.log(`📦 Version ${this.version} ready for production`);
            
        } catch (error) {
            this.log(`❌ Deployment failed: ${error.message}`, 'error');
            process.exit(1);
        }
    }
    
    async preDeploymentChecks() {
        this.log('🔍 Running pre-deployment checks...');
        
        const checks = [
            {
                name: 'Git Status Clean',
                test: () => {
                    const status = execSync('git status --porcelain', { encoding: 'utf8' });
                    return status.trim() === '';
                },
                error: 'Uncommitted changes detected. Commit or stash changes first.'
            },
            {
                name: 'Package.json Valid',
                test: async () => {
                    try {
                        const pkg = JSON.parse(await fs.readFile('package.json', 'utf8'));
                        return pkg.version && pkg.name && pkg.scripts;
                    } catch { return false; }
                },
                error: 'Invalid package.json file'
            },
            {
                name: 'Required Files Present',
                test: async () => {
                    const requiredFiles = ['boot.js', 'config.production.json', 'docs/index.html'];
                    for (const file of requiredFiles) {
                        try {
                            await fs.access(file);
                        } catch { return false; }
                    }
                    return true;
                },
                error: 'Required deployment files missing'
            },
            {
                name: 'Node.js Version',
                test: () => {
                    const version = process.version.match(/v(\d+)/)[1];
                    return parseInt(version) >= 18;
                },
                error: 'Node.js 18+ required for deployment'
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
    
    async buildApplication() {
        this.log('🔨 Building application...');
        
        try {
            // Run build script if it exists
            const pkg = JSON.parse(await fs.readFile('package.json', 'utf8'));
            if (pkg.scripts && pkg.scripts.build) {
                execSync('npm run build', { stdio: 'inherit' });
                this.log('✅ Build completed');
            } else {
                this.log('ℹ️ No build script defined, skipping');
            }
        } catch (error) {
            throw new Error(`Build failed: ${error.message}`);
        }
    }
    
    async runValidation() {
        this.log('🧪 Running validation tests...');
        
        try {
            // Run validation script
            execSync('npm run validate', { stdio: 'inherit' });
            this.log('✅ Validation passed');
        } catch (error) {
            throw new Error(`Validation failed: ${error.message}`);
        }
    }
    
    async createDeploymentPackage() {
        this.log('📦 Creating deployment package...');
        
        try {
            const deploymentInfo = {
                version: this.version,
                deployTime: this.deployTime,
                gitCommit: execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim(),
                gitBranch: execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim(),
                nodeVersion: process.version,
                platform: process.platform,
                environment: 'production'
            };
            
            await fs.writeFile('DEPLOYMENT_INFO.json', JSON.stringify(deploymentInfo, null, 2));
            this.log('✅ Deployment package created');
            
        } catch (error) {
            throw new Error(`Package creation failed: ${error.message}`);
        }
    }
    
    async updateDeploymentTimestamp() {
        this.log('⏰ Updating deployment timestamp...');
        
        try {
            const timestamp = `Deployed: ${this.deployTime}\nVersion: ${this.version}\nCommit: ${execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim()}`;
            await fs.writeFile('DEPLOY_TIMESTAMP.txt', timestamp);
            this.log('✅ Timestamp updated');
        } catch (error) {
            this.log(`⚠️ Failed to update timestamp: ${error.message}`, 'warn');
        }
    }
}

// VPS Deployment Functions
class VPSDeployment extends SolarFlowDeployment {
    constructor(vpsConfig) {
        super();
        this.vpsConfig = vpsConfig || {};
    }
    
    async deployToVPS() {
        this.log('🌐 Deploying to VPS...');
        
        try {
            // Standard deployment first
            await this.deploy();
            
            if (this.vpsConfig.host && this.vpsConfig.user) {
                await this.uploadToVPS();
                await this.restartVPSService();
            } else {
                this.log('ℹ️ VPS config not provided, skipping remote deployment');
                this.printManualInstructions();
            }
            
        } catch (error) {
            this.log(`❌ VPS deployment failed: ${error.message}`, 'error');
            process.exit(1);
        }
    }
    
    async uploadToVPS() {
        this.log('📤 Uploading to VPS...');
        
        const { host, user, path: remotePath } = this.vpsConfig;
        
        try {
            // Create tarball
            execSync('tar -czf solarflow-deploy.tar.gz --exclude=node_modules --exclude=.git .');
            
            // Upload tarball
            execSync(`scp solarflow-deploy.tar.gz ${user}@${host}:${remotePath}/`);
            
            // Extract on remote
            execSync(`ssh ${user}@${host} "cd ${remotePath} && tar -xzf solarflow-deploy.tar.gz && rm solarflow-deploy.tar.gz"`);
            
            this.log('✅ Upload completed');
            
        } catch (error) {
            throw new Error(`Upload failed: ${error.message}`);
        }
    }
    
    async restartVPSService() {
        this.log('🔄 Restarting VPS service...');
        
        const { host, user, serviceName = 'solarflow' } = this.vpsConfig;
        
        try {
            // Install dependencies and restart
            const commands = [
                'npm install --production',
                `pm2 restart ${serviceName} || pm2 start boot.js --name ${serviceName}`,
                `pm2 save`
            ];
            
            for (const command of commands) {
                execSync(`ssh ${user}@${host} "cd ${this.vpsConfig.path} && ${command}"`);
            }
            
            this.log('✅ Service restarted successfully');
            
        } catch (error) {
            throw new Error(`Service restart failed: ${error.message}`);
        }
    }
    
    printManualInstructions() {
        this.log(`
📋 Manual VPS Deployment Instructions:

1. Copy files to your VPS:
   scp -r ./* user@your-vps:/path/to/solarflow/

2. On your VPS:
   cd /path/to/solarflow
   npm install --production
   
3. Start/restart the service:
   pm2 restart solarflow || pm2 start boot.js --name solarflow
   pm2 save

4. Verify deployment:
   curl http://localhost:3000/api/health
   
See docs/README_PRODUCTION.md for detailed instructions.
        `);
    }
}

// Command Line Interface
function parseArguments() {
    const args = process.argv.slice(2);
    const config = {};
    
    for (let i = 0; i < args.length; i += 2) {
        const key = args[i].replace('--', '');
        const value = args[i + 1];
        config[key] = value;
    }
    
    return config;
}

async function main() {
    const args = parseArguments();
    
    if (args.vps) {
        // VPS deployment
        const vpsConfig = {
            host: args.host,
            user: args.user || 'solarflow',
            path: args.path || '/home/solarflow/app',
            serviceName: args.service || 'solarflow'
        };
        
        const deployment = new VPSDeployment(vpsConfig);
        await deployment.deployToVPS();
        
    } else {
        // Standard deployment
        const deployment = new SolarFlowDeployment();
        await deployment.deploy();
    }
}

// Handle CLI execution
if (require.main === module) {
    main().catch(error => {
        console.error(`❌ Deployment error: ${error.message}`);
        process.exit(1);
    });
}

module.exports = { SolarFlowDeployment, VPSDeployment };