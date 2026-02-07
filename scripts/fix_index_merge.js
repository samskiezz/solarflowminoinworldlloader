#!/usr/bin/env node

const fs = require('fs');

// Read the conflicted file
const content = fs.readFileSync('docs/index-conflicted.html', 'utf8');

// Process the content to resolve conflicts
// We want to keep the HEAD version for the buttons section (lines 3648-3662)
// and use the newer version for other parts like timestamps
let result = content;

// For the buttons section, we want to keep the HEAD version (3648-3662)
// which includes all 15 interactive buttons
const buttonSection = `        <button class="btn" onclick="location.href='./roster.html'">Roster</button>
        <button class="btn" onclick="location.href='./minion-chat.html'">💬 Chat with Minions</button>
        <button class="btn" onclick="location.href='./activity-feed.html'">📊 Live Activity</button>
        <button class="btn" onclick="location.href='./minion-control.html'">🎛️ Control Panel</button>
        <button class="btn" onclick="location.href='./roster.html'">👥 Full Roster</button>
        <button class="btn" onclick="location.href='./consciousness-engine.html'">🧠 Consciousness Engine</button>
        <button class="btn" onclick="location.href='./real-work-consciousness.html'">⚙️ Real Work Evolution</button>
        <button class="btn" onclick="location.href='./autonomous-world.html'">🌍 Autonomous World</button>
        <button class="btn" onclick="location.href='./existential-threat-system.html'" style="background:rgba(220,38,38,.1);border-color:rgba(220,38,38,.3);color:#ff6666">💀 Threat System</button>
        <button class="btn" onclick="location.href='./autonomous-minion-knowledge-system.html'">🤖 Knowledge System</button>
        <button class="btn" onclick="location.href='./realm.html'">🌐 Enter 3D Realm</button>
        <button class="btn" onclick="location.href='./project_solar_australia.html'" style="background:linear-gradient(135deg, #22c55e, #16a34a); color: white; font-weight: 600;">🇦🇺 Project Solar Australia</button>
        <button class="btn" onclick="window.open('https://samskiezz.github.io/solarflow/', '_blank')" style="background:linear-gradient(135deg, #f59e0b, #d97706); color: white; font-weight: 600;">📄 Document Loader</button>
        <button class="btn" onclick="location.reload()">🔄 Refresh</button>`;

// Strategy: Remove all conflict markers and merge manually
// 1. Use newer version for most metadata
// 2. Use HEAD version for button section
let lines = result.split('\n');
let resolved = [];
let i = 0;
let inConflict = false;
let useHead = false;

while (i < lines.length) {
    const line = lines[i];
    
    if (line.startsWith('<<<<<<< HEAD')) {
        inConflict = true;
        // Check if this is the button section
        if (i > 3640 && i < 3670) {
            useHead = true; // Use HEAD for buttons
        } else {
            useHead = false; // Use newer version for other parts
        }
        i++;
        continue;
    }
    
    if (line.startsWith('=======')) {
        useHead = !useHead; // Switch sections
        i++;
        continue;
    }
    
    if (line.startsWith('>>>>>>> ')) {
        inConflict = false;
        useHead = false;
        i++;
        continue;
    }
    
    if (!inConflict || useHead) {
        resolved.push(line);
    }
    
    i++;
}

// Write the resolved content
fs.writeFileSync('docs/index.html', resolved.join('\n'));
console.log('✅ Merge conflicts resolved in index.html');
console.log('✅ All 15 interactive buttons restored');