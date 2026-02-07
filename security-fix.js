const fs = require('fs');
const path = require('path');

console.log('🛡️ SECURITY & PERFORMANCE FIX SCRIPT');
console.log('═'.repeat(50));

const docsPath = './docs';
const files = fs.readdirSync(docsPath);
let fixedFiles = 0;

files.filter(f => f.endsWith('.html') || f.endsWith('.js')).forEach(file => {
    const filePath = path.join(docsPath, file);
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Fix 1: Secure innerHTML usage
    const insecureInnerHTML = /element\.innerHTML\s*=\s*[^;]+/g;
    if (insecureInnerHTML.test(content)) {
        content = content.replace(
            /(\w+)\.innerHTML\s*=\s*([^;]+);/g,
            '$1.textContent = $2; // Security fix: XSS prevention'
        );
        modified = true;
        console.log(`🔒 Fixed innerHTML XSS in: ${file}`);
    }
    
    // Fix 2: Add setInterval cleanup
    const intervalPattern = /setInterval\s*\([^}]+\}/g;
    if (intervalPattern.test(content) && !content.includes('clearInterval')) {
        const cleanupCode = `
// Performance fix: Interval cleanup
window.addEventListener('beforeunload', () => {
    if (window.activeIntervals) {
        window.activeIntervals.forEach(clearInterval);
    }
});

// Track intervals for cleanup
if (!window.activeIntervals) window.activeIntervals = [];
`;
        content = cleanupCode + content;
        
        // Wrap setInterval calls
        content = content.replace(
            /setInterval\s*\(/g,
            'window.activeIntervals.push(setInterval('
        );
        modified = true;
        console.log(`⚡ Added interval cleanup to: ${file}`);
    }
    
    // Fix 3: Remove hardcoded API keys
    const apiKeyPattern = /(api[_-]?key|openai[_-]?key)\s*[:=]\s*['"]['"]?[a-zA-Z0-9-_]+/gi;
    if (apiKeyPattern.test(content)) {
        content = content.replace(apiKeyPattern, '$1: "YOUR_API_KEY_HERE" // Security: Replace with environment variable');
        modified = true;
        console.log(`🔑 Removed API keys from: ${file}`);
    }
    
    // Fix 4: Optimize DOM queries
    if (content.includes('querySelector') && content.includes('for(') || content.includes('for (')) {
        // Add comment warning
        content = '// Performance warning: DOM queries should be cached outside loops\n' + content;
        modified = true;
        console.log(`🚀 Added performance warning to: ${file}`);
    }
    
    if (modified) {
        fs.writeFileSync(filePath, content);
        fixedFiles++;
    }
});

console.log(`\n✅ FIXES APPLIED: ${fixedFiles} files modified`);
console.log('🎯 NEXT STEPS:');
console.log('1. Test realm.html → ultimate-3d-realm-llm.html redirect');
console.log('2. Verify 50 minion avatars display in 3D');
console.log('3. Check memory usage is stable');
console.log('4. Replace API keys with environment variables');
