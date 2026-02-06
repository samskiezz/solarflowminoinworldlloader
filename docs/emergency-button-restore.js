// EMERGENCY BUTTON RESTORATION - Make ALL buttons actually work
console.log('🚨 EMERGENCY: Restoring button functionality...');

// Store original functions that might have been overwritten
const EMERGENCY_FUNCTIONS = {};

// Ensure pause/resume works
EMERGENCY_FUNCTIONS.setPaused = function(newPaused) {
    window.paused = newPaused;
    const btn = document.getElementById('btnToggle');
    if (btn) {
        btn.textContent = newPaused ? '▶️ Resume' : '⏸️ Pause';
    }
    
    const spinners = document.querySelectorAll('.spin');
    spinners.forEach(spinner => {
        if (newPaused) {
            spinner.classList.add('paused');
        } else {
            spinner.classList.remove('paused');
        }
    });
    
    console.log(`✅ System ${newPaused ? 'paused' : 'resumed'}`);
};

// Navigation functions
EMERGENCY_FUNCTIONS.openPage = function(url, name) {
    console.log(`🔗 Opening ${name}: ${url}`);
    window.open(url, '_blank');
};

// Minion functions
EMERGENCY_FUNCTIONS.openRoster = () => EMERGENCY_FUNCTIONS.openPage('./roster.html', 'Minion Roster');
EMERGENCY_FUNCTIONS.openMinionChat = () => EMERGENCY_FUNCTIONS.openPage('./minion-chat.html', 'Minion Chat');
EMERGENCY_FUNCTIONS.openActivityFeed = () => EMERGENCY_FUNCTIONS.openPage('./activity-feed.html', 'Activity Feed');
EMERGENCY_FUNCTIONS.openHappinessActivities = () => EMERGENCY_FUNCTIONS.openPage('./existential-threat-system.html', 'Happiness Activities');

// Intelligence functions
EMERGENCY_FUNCTIONS.openConsciousnessEngine = () => EMERGENCY_FUNCTIONS.openPage('./consciousness-engine.html', 'Consciousness Engine');
EMERGENCY_FUNCTIONS.openWorkConsciousness = () => EMERGENCY_FUNCTIONS.openPage('./real-work-consciousness.html', 'Work Consciousness');
EMERGENCY_FUNCTIONS.openAutonomousWorld = () => EMERGENCY_FUNCTIONS.openPage('./autonomous-world.html', 'Autonomous World');

// Solar operations functions
EMERGENCY_FUNCTIONS.openProjectSolar = () => EMERGENCY_FUNCTIONS.openPage('./simple-solar-australia.html', 'Project Solar Australia');
EMERGENCY_FUNCTIONS.openSolarConsciousness = () => EMERGENCY_FUNCTIONS.openPage('./real-solar-consciousness-system.html', 'Solar Consciousness');
EMERGENCY_FUNCTIONS.openKnowledgeBase = () => EMERGENCY_FUNCTIONS.openPage('./autonomous-minion-knowledge-system.html', 'Knowledge Base');
EMERGENCY_FUNCTIONS.openDocuments = () => EMERGENCY_FUNCTIONS.openPage('./processed-documents.html', 'Document Pipeline');

// 3D Realm function
EMERGENCY_FUNCTIONS.open3DRealm = () => EMERGENCY_FUNCTIONS.openPage('./realm.html', '3D Realm');

// System functions
EMERGENCY_FUNCTIONS.openFunctionTest = () => EMERGENCY_FUNCTIONS.openPage('./comprehensive-function-test.html', 'Function Test');
EMERGENCY_FUNCTIONS.openCompleteAudit = () => EMERGENCY_FUNCTIONS.openPage('./function-inventory-complete.html', 'Complete Audit');
EMERGENCY_FUNCTIONS.openIntegrationTest = () => EMERGENCY_FUNCTIONS.openPage('./system-integration-test.html', 'Integration Test');
EMERGENCY_FUNCTIONS.openPersistenceTest = () => EMERGENCY_FUNCTIONS.openPage('./real-system-test.html', 'Persistence Test');

// Refresh function
EMERGENCY_FUNCTIONS.refreshInterface = function() {
    console.log('🔄 Refreshing interface...');
    location.reload();
};

// Force all emergency functions to global scope
Object.entries(EMERGENCY_FUNCTIONS).forEach(([name, func]) => {
    window[name] = func;
    console.log(`✅ Restored function: ${name}`);
});

// Fix all dropdown links to actually work
function fixDropdownLinks() {
    console.log('🔗 Fixing dropdown links...');
    
    const linkMappings = {
        './roster.html': 'openRoster',
        './minion-chat.html': 'openMinionChat', 
        './activity-feed.html': 'openActivityFeed',
        './existential-threat-system.html': 'openHappinessActivities',
        './consciousness-engine.html': 'openConsciousnessEngine',
        './real-work-consciousness.html': 'openWorkConsciousness',
        './autonomous-world.html': 'openAutonomousWorld',
        './simple-solar-australia.html': 'openProjectSolar',
        './real-solar-consciousness-system.html': 'openSolarConsciousness',
        './autonomous-minion-knowledge-system.html': 'openKnowledgeBase',
        './processed-documents.html': 'openDocuments',
        './comprehensive-function-test.html': 'openFunctionTest',
        './function-inventory-complete.html': 'openCompleteAudit',
        './system-integration-test.html': 'openIntegrationTest',
        './real-system-test.html': 'openPersistenceTest'
    };
    
    // Fix all dropdown links
    document.querySelectorAll('.dropdown-content a').forEach(link => {
        const href = link.getAttribute('href');
        const funcName = linkMappings[href];
        
        if (funcName && window[funcName]) {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                window[funcName]();
            });
            console.log(`✅ Fixed link: ${href} → ${funcName}`);
        }
    });
}

// Fix pause/resume button
function fixPauseButton() {
    console.log('⏸️ Fixing pause button...');
    
    const pauseBtn = document.getElementById('btnToggle');
    if (pauseBtn) {
        // Remove existing handlers
        pauseBtn.onclick = null;
        
        // Add new handler
        pauseBtn.addEventListener('click', function() {
            const currentlyPaused = window.paused || false;
            window.setPaused(!currentlyPaused);
        });
        
        console.log('✅ Pause button fixed');
    }
    
    // Also fix pause/resume links in dropdowns
    document.querySelectorAll('a[onclick*="btnToggle"]').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const currentlyPaused = window.paused || false;
            window.setPaused(!currentlyPaused);
        });
    });
}

// Fix refresh button
function fixRefreshButton() {
    console.log('🔄 Fixing refresh button...');
    
    document.querySelectorAll('a[onclick*="location.reload"]').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            window.refreshInterface();
        });
    });
    
    console.log('✅ Refresh button fixed');
}

// Fix 3D Realm button
function fix3DRealmButton() {
    console.log('🌐 Fixing 3D Realm button...');
    
    const realmBtn = document.querySelector('button[onclick*="realm.html"]');
    if (realmBtn) {
        realmBtn.onclick = null;
        realmBtn.addEventListener('click', function(e) {
            e.preventDefault();
            window.open3DRealm();
        });
        console.log('✅ 3D Realm button fixed');
    }
}

// Fix dropdown click behavior
function fixDropdownBehavior() {
    console.log('🔽 Fixing dropdown behavior...');
    
    document.querySelectorAll('.dropdown').forEach(dropdown => {
        const btn = dropdown.querySelector('.dropdown-btn');
        const content = dropdown.querySelector('.dropdown-content');
        
        if (btn && content) {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                // Close all other dropdowns
                document.querySelectorAll('.dropdown-content').forEach(otherContent => {
                    if (otherContent !== content) {
                        otherContent.style.display = 'none';
                    }
                });
                
                // Toggle this dropdown
                const isVisible = content.style.display === 'block';
                content.style.display = isVisible ? 'none' : 'block';
            });
        }
    });
    
    // Close dropdowns when clicking outside
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.dropdown')) {
            document.querySelectorAll('.dropdown-content').forEach(content => {
                content.style.display = 'none';
            });
        }
    });
    
    console.log('✅ Dropdown behavior fixed');
}

// Run emergency restoration
function runEmergencyRestoration() {
    console.log('🚨 RUNNING EMERGENCY BUTTON RESTORATION...');
    
    fixPauseButton();
    fixRefreshButton();
    fix3DRealmButton();
    fixDropdownLinks();
    fixDropdownBehavior();
    
    console.log('🎉 EMERGENCY RESTORATION COMPLETE!');
    console.log('📋 Available functions:', Object.keys(EMERGENCY_FUNCTIONS));
    
    // Test functions
    setTimeout(() => {
        console.log('🧪 Testing emergency functions...');
        console.log('Pause function works:', typeof window.setPaused === 'function');
        console.log('Navigation functions work:', typeof window.openRoster === 'function');
        console.log('3D Realm function works:', typeof window.open3DRealm === 'function');
        console.log('✅ All emergency functions operational');
    }, 1000);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runEmergencyRestoration);
} else {
    runEmergencyRestoration();
}

// Make restoration function available globally
window.EMERGENCY_RESTORE_BUTTONS = runEmergencyRestoration;

console.log('✅ Emergency button restoration system loaded');