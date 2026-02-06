// MINIMAL BUTTON FUNCTION FIX - Just make buttons work
console.log('🔧 Loading minimal button fix...');

// Ensure basic functions exist
window.BUTTON_FIX_LOADED = true;

// Fix pause/resume functionality
function ensurePauseResumeWorks() {
    let paused = false;
    
    window.setPaused = function(newPaused) {
        paused = newPaused;
        const btn = document.getElementById('btnToggle');
        if (btn) {
            btn.textContent = paused ? '▶️ Resume' : '⏸️ Pause';
        }
        
        // Update spinner state
        const spinners = document.querySelectorAll('.spin');
        spinners.forEach(spinner => {
            if (paused) {
                spinner.classList.add('paused');
            } else {
                spinner.classList.remove('paused');
            }
        });
        
        console.log(`System ${paused ? 'paused' : 'resumed'}`);
    };
    
    window.paused = paused;
    
    // Ensure toggle button works
    const toggleBtn = document.getElementById('btnToggle');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', function() {
            window.setPaused(!paused);
        });
    }
}

// Fix 3D realm navigation
function ensure3DRealmWorks() {
    // Make sure 3D realm button actually works
    const realmButtons = document.querySelectorAll('button[onclick*="realm.html"], a[href*="realm.html"]');
    realmButtons.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('🌐 Opening 3D realm...');
            window.open('./realm.html', '_blank');
        });
    });
}

// Fix dropdown menus
function ensureDropdownsWork() {
    const dropdowns = document.querySelectorAll('.dropdown');
    dropdowns.forEach(dropdown => {
        const btn = dropdown.querySelector('.dropdown-btn');
        const content = dropdown.querySelector('.dropdown-content');
        
        if (btn && content) {
            // Remove hover-only behavior, add click behavior
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                
                // Toggle visibility
                const isVisible = content.style.display === 'block';
                
                // Hide all other dropdowns
                document.querySelectorAll('.dropdown-content').forEach(c => {
                    c.style.display = 'none';
                });
                
                // Show/hide this dropdown
                content.style.display = isVisible ? 'none' : 'block';
            });
            
            // Close dropdown when clicking outside
            document.addEventListener('click', function(e) {
                if (!dropdown.contains(e.target)) {
                    content.style.display = 'none';
                }
            });
        }
    });
}

// Fix navigation functions
function ensureNavigationWorks() {
    // Function test page
    window.openFunctionTest = function() {
        window.open('./comprehensive-function-test.html', '_blank');
    };
    
    // Document dashboard
    window.openDocumentDashboard = function() {
        window.open('./document-dashboard.html', '_blank');
    };
    
    // Project Solar Australia
    window.openProjectSolar = function() {
        window.open('./simple-solar-australia.html', '_blank');
    };
    
    // Minion chat
    window.openMinionChat = function() {
        window.open('./minion-chat.html', '_blank');
    };
    
    // Activity feed
    window.openActivityFeed = function() {
        window.open('./activity-feed.html', '_blank');
    };
    
    // Minion control
    window.openMinionControl = function() {
        window.open('./minion-control.html', '_blank');
    };
    
    // CER products
    window.openCERProducts = function() {
        window.open('./cer-products.html', '_blank');
    };
    
    // Autonomous system
    window.openAutonomousSystem = function() {
        window.open('./autonomous-minion-knowledge-system.html', '_blank');
    };
}

// Fix refresh functionality
function ensureRefreshWorks() {
    window.refreshInterface = function() {
        console.log('🔄 Refreshing interface...');
        location.reload();
    };
    
    // Add refresh to all refresh buttons
    const refreshButtons = document.querySelectorAll('a[onclick*="reload"], button[onclick*="reload"]');
    refreshButtons.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            window.refreshInterface();
        });
    });
}

// Add sound support (basic)
function ensureSoundWorks() {
    let audioEnabled = false;
    let audioContext = null;
    
    window.toggleSound = function() {
        audioEnabled = !audioEnabled;
        
        if (audioEnabled && !audioContext) {
            try {
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
                console.log('🔊 Audio enabled');
            } catch (error) {
                console.log('❌ Audio not supported');
                audioEnabled = false;
            }
        }
        
        console.log(`🔊 Sound ${audioEnabled ? 'enabled' : 'disabled'}`);
        return audioEnabled;
    };
    
    window.playTone = function(frequency = 440, duration = 200) {
        if (!audioEnabled || !audioContext) return;
        
        try {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = frequency;
            oscillator.type = 'sine';
            
            gainNode.gain.value = 0.1;
            
            oscillator.start();
            oscillator.stop(audioContext.currentTime + duration / 1000);
        } catch (error) {
            console.log('Sound error:', error);
        }
    };
}

// Initialize all fixes when DOM is ready
function initializeButtonFixes() {
    console.log('🔧 Initializing button fixes...');
    
    ensurePauseResumeWorks();
    ensure3DRealmWorks();
    ensureDropdownsWork();
    ensureNavigationWorks();
    ensureRefreshWorks();
    ensureSoundWorks();
    
    console.log('✅ Button fixes initialized');
    
    // Add test functions to window for debugging
    window.testButtons = function() {
        console.log('🧪 Testing buttons...');
        console.log('Pause function exists:', typeof window.setPaused === 'function');
        console.log('Navigation functions exist:', typeof window.openFunctionTest === 'function');
        console.log('Sound functions exist:', typeof window.toggleSound === 'function');
        console.log('Refresh function exists:', typeof window.refreshInterface === 'function');
    };
}

// Run initialization
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeButtonFixes);
} else {
    initializeButtonFixes();
}

console.log('✅ Minimal button fix loaded');