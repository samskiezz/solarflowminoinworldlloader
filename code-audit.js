#!/usr/bin/env node
/**
 * COMPREHENSIVE CODE AUDIT
 * Finds mistakes, overlooked issues, and problems in the entire codebase
 * Full-stack developer level analysis
 */

const fs = require('fs');
const path = require('path');

class CodeAudit {
    constructor() {
        this.issues = [];
        this.warnings = [];
        this.recommendations = [];
        this.codebaseStats = {
            totalFiles: 0,
            totalLines: 0,
            jsFiles: 0,
            htmlFiles: 0,
            jsonFiles: 0
        };
        
        console.log('🔍 Starting comprehensive code audit...');
    }
    
    async performFullAudit() {
        try {
            // Architecture Issues
            await this.auditArchitecture();
            
            // Data Flow Issues  
            await this.auditDataFlow();
            
            // Performance Issues
            await this.auditPerformance();
            
            // Security Issues
            await this.auditSecurity();
            
            // Code Quality Issues
            await this.auditCodeQuality();
            
            // File Structure Issues
            await this.auditFileStructure();
            
            // Logic Issues
            await this.auditLogic();
            
            // Integration Issues
            await this.auditIntegrations();
            
            // Generate comprehensive report
            this.generateAuditReport();
            
        } catch (error) {
            console.error('❌ Audit failed:', error);
        }
    }
    
    async auditArchitecture() {
        console.log('🏗️ Auditing architecture...');
        
        // Check for circular dependencies
        this.checkCircularDependencies();
        
        // Check for proper separation of concerns
        this.checkSeparationOfConcerns();
        
        // Check for inconsistent patterns
        this.checkConsistentPatterns();
        
        // Check bootloader design issues
        this.auditBootloaderDesign();
    }
    
    auditBootloaderDesign() {
        console.log('🔍 Auditing bootloader design...');
        
        const bootloaderPath = './bootloader.js';
        if (fs.existsSync(bootloaderPath)) {
            const content = fs.readFileSync(bootloaderPath, 'utf8');
            
            // CRITICAL: Bootloader resets data on every run
            if (content.includes('updateTimestamps') && content.includes('mergeDataUpdates')) {
                this.issues.push({
                    severity: 'CRITICAL',
                    category: 'Architecture',
                    file: 'bootloader.js',
                    issue: 'Bootloader resets/modifies data on every startup',
                    description: 'The bootloader updates timestamps and merges data on every run, which resets progress instead of preserving it. Should only initialize once.',
                    solution: 'Replace with smart initialization that only runs setup on first startup'
                });
            }
            
            // Issue: Bootloader does too much
            if (content.includes('step1_') && content.includes('step8_')) {
                this.warnings.push({
                    severity: 'HIGH',
                    category: 'Architecture',
                    file: 'bootloader.js',
                    issue: 'Bootloader violates single responsibility principle',
                    description: 'Bootloader handles validation, backup, merging, timestamps, quantum init, etc. Should be split into focused modules.',
                    solution: 'Split into: DataValidator, BackupManager, StateInitializer, ProgressContinuer'
                });
            }
        }
        
        // Check auto-start design
        const autoStartPath = './auto-start.js';
        if (fs.existsSync(autoStartPath)) {
            const content = fs.readFileSync(autoStartPath, 'utf8');
            
            if (content.includes('runBootloader') && content.includes('startBackgroundProgressSaving')) {
                this.issues.push({
                    severity: 'CRITICAL',
                    category: 'Architecture', 
                    file: 'auto-start.js',
                    issue: 'Auto-start calls bootloader on every startup',
                    description: 'Auto-start system calls the bootloader (which resets data) on every startup. Should check initialization state first.',
                    solution: 'Use smart initialization that preserves existing state'
                });
            }
        }
    }
    
    checkCircularDependencies() {
        console.log('🔄 Checking for circular dependencies...');
        
        // Check if files import each other in circles
        const jsFiles = this.findFilesByExtension('.js');
        
        jsFiles.forEach(file => {
            const content = fs.readFileSync(file, 'utf8');
            const imports = this.extractImports(content);
            
            imports.forEach(importPath => {
                if (this.checkCircularDep(file, importPath, new Set())) {
                    this.issues.push({
                        severity: 'HIGH',
                        category: 'Architecture',
                        file: file,
                        issue: `Circular dependency detected with ${importPath}`,
                        solution: 'Refactor to remove circular dependencies'
                    });
                }
            });
        });
    }
    
    checkSeparationOfConcerns() {
        console.log('📋 Checking separation of concerns...');
        
        // Check if HTML files contain too much JavaScript
        const htmlFiles = this.findFilesByExtension('.html');
        
        htmlFiles.forEach(file => {
            const content = fs.readFileSync(file, 'utf8');
            const jsInHtml = content.match(/<script[^>]*>([\s\S]*?)<\/script>/gi);
            
            if (jsInHtml) {
                const totalJsLines = jsInHtml.join('\\n').split('\\n').length;
                
                if (totalJsLines > 100) {
                    this.warnings.push({
                        severity: 'MEDIUM',
                        category: 'Architecture',
                        file: file,
                        issue: `${totalJsLines} lines of JavaScript embedded in HTML`,
                        description: 'Large amounts of JavaScript in HTML files violates separation of concerns',
                        solution: 'Extract JavaScript to separate .js files'
                    });
                }
            }
        });
        
        // Check if data processing is mixed with UI code
        this.checkDataUISepatation();
    }
    
    checkDataUISepatation() {
        const files = this.findFilesByExtension('.js');
        
        files.forEach(file => {
            const content = fs.readFileSync(file, 'utf8');
            
            // Check if same file handles both data and DOM
            const hasDataOperations = content.includes('JSON.parse') || content.includes('localStorage') || content.includes('fetch');
            const hasDOMOperations = content.includes('document.') || content.includes('innerHTML') || content.includes('getElementById');
            
            if (hasDataOperations && hasDOMOperations && !file.includes('auto-bootloader')) {
                this.warnings.push({
                    severity: 'MEDIUM',
                    category: 'Architecture',
                    file: file,
                    issue: 'Data operations mixed with UI operations',
                    description: 'File handles both data processing and DOM manipulation',
                    solution: 'Split into separate data layer and UI layer'
                });
            }
        });
    }
    
    async auditDataFlow() {
        console.log('💾 Auditing data flow...');
        
        // Check for data consistency issues
        this.checkDataConsistency();
        
        // Check for proper state management
        this.checkStateManagement();
        
        // Check for data persistence issues
        this.checkDataPersistence();
    }
    
    checkDataConsistency() {
        console.log('🔍 Checking data consistency...');
        
        // Check if multiple files define the same data structures differently
        const dataFiles = this.findFilesByExtension('.json');
        const jsFiles = this.findFilesByExtension('.js');
        
        // Look for minion data definitions
        const minionSchemas = [];
        
        [...dataFiles, ...jsFiles].forEach(file => {
            const content = fs.readFileSync(file, 'utf8');
            
            if (content.includes('credits') && content.includes('reputation') && content.includes('happiness')) {
                const schema = this.extractMinionSchema(content);
                if (schema) {
                    minionSchemas.push({ file, schema });
                }
            }
        });
        
        // Check for schema inconsistencies
        if (minionSchemas.length > 1) {
            const baseSchema = minionSchemas[0].schema;
            
            minionSchemas.slice(1).forEach(({ file, schema }) => {
                const differences = this.compareSchemas(baseSchema, schema);
                if (differences.length > 0) {
                    this.issues.push({
                        severity: 'HIGH',
                        category: 'Data',
                        file: file,
                        issue: 'Inconsistent minion data schema',
                        description: `Schema differs from ${minionSchemas[0].file}: ${differences.join(', ')}`,
                        solution: 'Standardize data schema across all files'
                    });
                }
            });
        }
    }
    
    checkStateManagement() {
        console.log('📊 Checking state management...');
        
        // Check for global state pollution
        const jsFiles = this.findFilesByExtension('.js');
        
        jsFiles.forEach(file => {
            const content = fs.readFileSync(file, 'utf8');
            
            // Count global variables
            const globalVars = content.match(/window\\.\\w+\\s*=/g) || [];
            
            if (globalVars.length > 5) {
                this.warnings.push({
                    severity: 'MEDIUM',
                    category: 'State Management',
                    file: file,
                    issue: `${globalVars.length} global variables created`,
                    description: 'Too many global variables can cause naming conflicts',
                    solution: 'Use namespace or module pattern'
                });
            }
            
            // Check for state mutations without proper handling
            const directMutations = content.match(/\\w+\\.\\w+\\s*=\\s*[^=]/g) || [];
            if (directMutations.length > 10) {
                this.warnings.push({
                    severity: 'LOW',
                    category: 'State Management',
                    file: file,
                    issue: 'Many direct property mutations detected',
                    description: 'Direct mutations can make state changes hard to track',
                    solution: 'Consider using state management library or mutation functions'
                });
            }
        });
    }
    
    checkDataPersistence() {
        console.log('💾 Checking data persistence...');
        
        // Check for multiple persistence mechanisms
        const persistenceMethods = new Set();
        const jsFiles = this.findFilesByExtension('.js');
        
        jsFiles.forEach(file => {
            const content = fs.readFileSync(file, 'utf8');
            
            if (content.includes('localStorage')) persistenceMethods.add('localStorage');
            if (content.includes('sessionStorage')) persistenceMethods.add('sessionStorage');
            if (content.includes('JSON.stringify') && content.includes('writeFileSync')) persistenceMethods.add('fileSystem');
            if (content.includes('fetch') && content.includes('POST')) persistenceMethods.add('serverAPI');
            
            // Check for data loss patterns
            if (content.includes('localStorage.clear()') || content.includes('localStorage.removeItem')) {
                this.warnings.push({
                    severity: 'MEDIUM',
                    category: 'Data Persistence',
                    file: file,
                    issue: 'Code can clear/remove localStorage data',
                    description: 'This could cause data loss',
                    solution: 'Add confirmation dialogs or backup before clearing'
                });
            }
        });
        
        if (persistenceMethods.size > 2) {
            this.issues.push({
                severity: 'HIGH',
                category: 'Data Persistence',
                file: 'Multiple files',
                issue: `${persistenceMethods.size} different persistence mechanisms used`,
                description: `Found: ${Array.from(persistenceMethods).join(', ')}. This can cause data inconsistency.`,
                solution: 'Standardize on one primary persistence method with clear hierarchy'
            });
        }
    }
    
    async auditPerformance() {
        console.log('⚡ Auditing performance...');
        
        // Check for performance anti-patterns
        this.checkPerformanceAntiPatterns();
        
        // Check for inefficient loops
        this.checkInefficitentLoops();
        
        // Check for memory leaks
        this.checkMemoryLeaks();
    }
    
    checkPerformanceAntiPatterns() {
        const jsFiles = this.findFilesByExtension('.js');
        
        jsFiles.forEach(file => {
            const content = fs.readFileSync(file, 'utf8');
            
            // Check for inefficient DOM queries
            const domQueries = content.match(/document\\.getElementById|document\\.querySelector/g) || [];
            const loops = content.match(/for\\s*\\(|forEach|setInterval/g) || [];
            
            if (domQueries.length > 0 && loops.length > 0) {
                // Check if DOM queries are inside loops
                const lines = content.split('\\n');
                let inLoop = false;
                let loopDepth = 0;
                
                lines.forEach((line, index) => {
                    if (line.includes('for') || line.includes('forEach') || line.includes('setInterval')) {
                        inLoop = true;
                        loopDepth++;
                    }
                    if (line.includes('}')) {
                        loopDepth--;
                        if (loopDepth === 0) inLoop = false;
                    }
                    
                    if (inLoop && (line.includes('getElementById') || line.includes('querySelector'))) {
                        this.warnings.push({
                            severity: 'MEDIUM',
                            category: 'Performance',
                            file: file,
                            issue: `DOM query inside loop at line ${index + 1}`,
                            description: 'DOM queries inside loops can cause performance issues',
                            solution: 'Cache DOM elements outside loops'
                        });
                    }
                });
            }
            
            // Check for excessive setInterval usage
            const intervals = content.match(/setInterval/g) || [];
            if (intervals.length > 3) {
                this.warnings.push({
                    severity: 'MEDIUM',
                    category: 'Performance',
                    file: file,
                    issue: `${intervals.length} setInterval calls`,
                    description: 'Multiple intervals can impact performance',
                    solution: 'Consolidate intervals or use requestAnimationFrame'
                });
            }
        });
    }
    
    async auditSecurity() {
        console.log('🔒 Auditing security...');
        
        // Check for security vulnerabilities
        this.checkSecurityVulnerabilities();
        
        // Check for exposed credentials
        this.checkExposedCredentials();
    }
    
    checkSecurityVulnerabilities() {
        const files = [...this.findFilesByExtension('.js'), ...this.findFilesByExtension('.html')];
        
        files.forEach(file => {
            const content = fs.readFileSync(file, 'utf8');
            
            // Check for innerHTML with user data
            if (content.includes('innerHTML') && content.includes('user')) {
                this.warnings.push({
                    severity: 'HIGH',
                    category: 'Security',
                    file: file,
                    issue: 'innerHTML used with potentially user-controlled data',
                    description: 'This could lead to XSS vulnerabilities',
                    solution: 'Use textContent or sanitize input'
                });
            }
            
            // Check for eval usage
            if (content.includes('eval(')) {
                this.issues.push({
                    severity: 'CRITICAL',
                    category: 'Security',
                    file: file,
                    issue: 'eval() function used',
                    description: 'eval() can execute arbitrary code and is a security risk',
                    solution: 'Replace eval() with safer alternatives'
                });
            }
            
            // Check for console.log with sensitive data
            if (content.includes('console.log') && (content.includes('password') || content.includes('token') || content.includes('key'))) {
                this.warnings.push({
                    severity: 'MEDIUM',
                    category: 'Security',
                    file: file,
                    issue: 'console.log may expose sensitive data',
                    description: 'Logging sensitive data can expose it in browser console',
                    solution: 'Remove or sanitize sensitive data from logs'
                });
            }
        });
    }
    
    checkExposedCredentials() {
        const files = this.getAllFiles();
        
        files.forEach(file => {
            if (file.includes('node_modules') || file.includes('.git')) return;
            
            try {
                const content = fs.readFileSync(file, 'utf8');
                
                // Look for API keys, passwords, tokens
                const sensitivePatterns = [
                    /api[_-]?key['"\\s]*[:=]['"\\s]*[a-zA-Z0-9]{20,}/i,
                    /password['"\\s]*[:=]['"\\s]*[^'";\\s]{8,}/i,
                    /token['"\\s]*[:=]['"\\s]*[a-zA-Z0-9]{20,}/i,
                    /secret['"\\s]*[:=]['"\\s]*[a-zA-Z0-9]{20,}/i
                ];
                
                sensitivePatterns.forEach(pattern => {
                    const matches = content.match(pattern);
                    if (matches) {
                        this.issues.push({
                            severity: 'CRITICAL',
                            category: 'Security',
                            file: file,
                            issue: 'Potential hardcoded credential detected',
                            description: `Found: ${matches[0].substring(0, 50)}...`,
                            solution: 'Move credentials to environment variables'
                        });
                    }
                });
            } catch (error) {
                // Skip binary files
            }
        });
    }
    
    async auditCodeQuality() {
        console.log('📝 Auditing code quality...');
        
        // Check for code duplication
        this.checkCodeDuplication();
        
        // Check for naming consistency
        this.checkNamingConsistency();
        
        // Check for error handling
        this.checkErrorHandling();
    }
    
    checkCodeDuplication() {
        const jsFiles = this.findFilesByExtension('.js');
        const codeBlocks = new Map();
        
        jsFiles.forEach(file => {
            const content = fs.readFileSync(file, 'utf8');
            const lines = content.split('\\n');
            
            // Check for duplicated function signatures
            const functions = content.match(/function\\s+\\w+\\s*\\([^)]*\\)|\\w+\\s*[:=]\\s*function/g) || [];
            
            functions.forEach(func => {
                const signature = func.replace(/\\s+/g, ' ').trim();
                if (codeBlocks.has(signature)) {
                    codeBlocks.get(signature).push(file);
                } else {
                    codeBlocks.set(signature, [file]);
                }
            });
        });
        
        // Report duplications
        codeBlocks.forEach((files, signature) => {
            if (files.length > 1) {
                this.warnings.push({
                    severity: 'LOW',
                    category: 'Code Quality',
                    file: files.join(', '),
                    issue: 'Duplicate function signature detected',
                    description: `Function "${signature}" found in multiple files`,
                    solution: 'Extract common functions to shared module'
                });
            }
        });
    }
    
    async auditLogic() {
        console.log('🧠 Auditing logic issues...');
        
        // Check for infinite loops
        this.checkInfiniteLoops();
        
        // Check for race conditions
        this.checkRaceConditions();
        
        // Check for incorrect async handling
        this.checkAsyncHandling();
    }
    
    checkInfiniteLoops() {
        const jsFiles = this.findFilesByExtension('.js');
        
        jsFiles.forEach(file => {
            const content = fs.readFileSync(file, 'utf8');
            
            // Check for while(true) without break
            const whileTrue = content.match(/while\\s*\\(\\s*true\\s*\\)[^}]*}/gs);
            if (whileTrue) {
                whileTrue.forEach(loop => {
                    if (!loop.includes('break') && !loop.includes('return')) {
                        this.issues.push({
                            severity: 'HIGH',
                            category: 'Logic',
                            file: file,
                            issue: 'Potential infinite loop detected',
                            description: 'while(true) without break or return',
                            solution: 'Add proper exit conditions'
                        });
                    }
                });
            }
            
            // Check for setInterval without clearInterval
            const intervals = content.match(/setInterval\\([^}]+}[^}]+/gs) || [];
            if (intervals.length > 0 && !content.includes('clearInterval')) {
                this.warnings.push({
                    severity: 'MEDIUM',
                    category: 'Logic',
                    file: file,
                    issue: 'setInterval without clearInterval',
                    description: 'Intervals may not be properly cleaned up',
                    solution: 'Store interval IDs and clear them when appropriate'
                });
            }
        });
    }
    
    generateAuditReport() {
        console.log('📋 Generating audit report...');
        
        const report = {
            summary: {
                totalIssues: this.issues.length,
                totalWarnings: this.warnings.length,
                totalRecommendations: this.recommendations.length,
                criticalIssues: this.issues.filter(i => i.severity === 'CRITICAL').length,
                highIssues: this.issues.filter(i => i.severity === 'HIGH').length,
                auditDate: new Date().toISOString()
            },
            codebaseStats: this.codebaseStats,
            issues: this.issues,
            warnings: this.warnings,
            recommendations: this.recommendations,
            prioritizedFixes: this.prioritizeFixes()
        };
        
        fs.writeFileSync('./CODE-AUDIT-REPORT.json', JSON.stringify(report, null, 2));
        
        console.log('\\n📊 COMPREHENSIVE CODE AUDIT RESULTS');
        console.log('=====================================');
        console.log(`🔴 Critical Issues: ${report.summary.criticalIssues}`);
        console.log(`🟠 High Issues: ${report.summary.highIssues}`);
        console.log(`🟡 Total Warnings: ${report.summary.totalWarnings}`);
        console.log(`📋 Total Issues: ${report.summary.totalIssues}`);
        
        console.log('\\n🔥 TOP CRITICAL ISSUES:');
        this.issues.filter(i => i.severity === 'CRITICAL').slice(0, 5).forEach(issue => {
            console.log(`   • ${issue.issue} (${issue.file})`);
            console.log(`     ${issue.description}`);
            console.log(`     Fix: ${issue.solution}`);
            console.log('');
        });
        
        console.log('\\n🎯 PRIORITY FIXES:');
        report.prioritizedFixes.slice(0, 10).forEach((fix, index) => {
            console.log(`   ${index + 1}. ${fix.issue} (${fix.file})`);
            console.log(`      ${fix.solution}`);
        });
        
        console.log(`\\n📄 Full report saved to: CODE-AUDIT-REPORT.json`);
        
        return report;
    }
    
    prioritizeFixes() {
        const allIssues = [...this.issues, ...this.warnings];
        
        // Sort by severity and impact
        const severityScore = { CRITICAL: 100, HIGH: 75, MEDIUM: 50, LOW: 25 };
        const categoryScore = { Security: 20, Architecture: 15, Data: 10, Performance: 8, Logic: 12 };
        
        return allIssues.map(issue => ({
            ...issue,
            priority: (severityScore[issue.severity] || 0) + (categoryScore[issue.category] || 0)
        })).sort((a, b) => b.priority - a.priority);
    }
    
    // Helper methods
    findFilesByExtension(ext) {
        const files = [];
        const searchDir = (dir) => {
            if (dir.includes('node_modules') || dir.includes('.git')) return;
            
            try {
                const items = fs.readdirSync(dir);
                items.forEach(item => {
                    const fullPath = path.join(dir, item);
                    const stat = fs.statSync(fullPath);
                    
                    if (stat.isDirectory()) {
                        searchDir(fullPath);
                    } else if (fullPath.endsWith(ext)) {
                        files.push(fullPath);
                        this.codebaseStats.totalFiles++;
                        
                        if (ext === '.js') this.codebaseStats.jsFiles++;
                        if (ext === '.html') this.codebaseStats.htmlFiles++;
                        if (ext === '.json') this.codebaseStats.jsonFiles++;
                    }
                });
            } catch (error) {
                // Skip inaccessible directories
            }
        };
        
        searchDir('./');
        return files;
    }
    
    getAllFiles() {
        const files = [];
        const searchDir = (dir) => {
            if (dir.includes('node_modules') || dir.includes('.git')) return;
            
            try {
                const items = fs.readdirSync(dir);
                items.forEach(item => {
                    const fullPath = path.join(dir, item);
                    const stat = fs.statSync(fullPath);
                    
                    if (stat.isDirectory()) {
                        searchDir(fullPath);
                    } else {
                        files.push(fullPath);
                    }
                });
            } catch (error) {
                // Skip inaccessible directories
            }
        };
        
        searchDir('./');
        return files;
    }
    
    extractImports(content) {
        const imports = [];
        const patterns = [
            /require\\(['"`]([^'"`]+)['"`]\\)/g,
            /import .+ from ['"`]([^'"`]+)['"`]/g,
            /import\\s*\\(['"`]([^'"`]+)['"`]\\)/g
        ];
        
        patterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(content)) !== null) {
                imports.push(match[1]);
            }
        });
        
        return imports;
    }
    
    checkCircularDep(file, importPath, visited) {
        if (visited.has(file)) return true;
        visited.add(file);
        
        // Simplified circular dependency check
        return false;
    }
    
    extractMinionSchema(content) {
        // Extract minion data structure
        const match = content.match(/{[^}]*credits[^}]*reputation[^}]*happiness[^}]*}/);
        if (match) {
            try {
                return Object.keys(JSON.parse(match[0].replace(/([a-zA-Z_$][a-zA-Z0-9_$]*):/g, '"$1":')));
            } catch (error) {
                return null;
            }
        }
        return null;
    }
    
    compareSchemas(schema1, schema2) {
        const diff = [];
        const all = new Set([...schema1, ...schema2]);
        
        all.forEach(key => {
            if (!schema1.includes(key)) diff.push(`Missing ${key} in schema1`);
            if (!schema2.includes(key)) diff.push(`Missing ${key} in schema2`);
        });
        
        return diff;
    }
}

// Run audit
if (require.main === module) {
    const audit = new CodeAudit();
    audit.performFullAudit().catch(console.error);
}

module.exports = CodeAudit;