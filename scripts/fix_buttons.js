// Fix the button functionality in index.html

const fs = require('fs');
const path = require('path');

const docs = path.join(__dirname, '..', 'docs');
const indexPath = path.join(docs, 'index.html');

// Read current HTML
let html = fs.readFileSync(indexPath, 'utf8');

// Add working JavaScript for buttons at the end before </body>
const workingJS = `
  <script>
  // REAL BUTTON FUNCTIONALITY
  document.addEventListener('DOMContentLoaded', function() {
    
    // Pause/Resume functionality  
    let isPaused = localStorage.getItem('solarflow-paused') === 'true';
    const pauseBtn = document.getElementById('btnToggle');
    const spinner = document.getElementById('spin');
    
    function updatePauseState() {
      if (pauseBtn) {
        pauseBtn.textContent = isPaused ? 'Resume' : 'Pause';
      }
      if (spinner) {
        spinner.classList.toggle('paused', isPaused);
      }
    }
    
    if (pauseBtn) {
      pauseBtn.addEventListener('click', function() {
        isPaused = !isPaused;
        localStorage.setItem('solarflow-paused', isPaused.toString());
        updatePauseState();
        console.log('Paused state:', isPaused);
      });
    }
    
    updatePauseState();
    
    // Auto-refresh (when not paused)
    function scheduleRefresh() {
      if (!isPaused) {
        setTimeout(() => {
          if (!isPaused) {
            console.log('Auto-refreshing page...');
            location.reload();
          }
        }, 60000); // 60 seconds
      } else {
        setTimeout(scheduleRefresh, 5000); // Check again in 5 seconds
      }
    }
    
    scheduleRefresh();
    
    // Show that JavaScript is working
    console.log('✅ SolarFlow buttons initialized');
    const diagEl = document.getElementById('diag');
    if (diagEl && diagEl.textContent.includes('no-fetch')) {
      diagEl.textContent += ' • JS active • buttons working';
    }
    
    // Fix empty feed by populating it from HIVE data
    try {
      const hiveScript = document.getElementById('data-hive');
      if (hiveScript) {
        const hive = JSON.parse(hiveScript.textContent);
        const feedEl = document.getElementById('feed');
        
        if (feedEl && hive.agora && hive.agora.messages) {
          feedEl.innerHTML = ''; // Clear existing
          
          hive.agora.messages.slice(0, 8).forEach(msg => {
            const feedItem = document.createElement('div');
            feedItem.className = 'tweet';
            
            const timestamp = msg.timestamp ? msg.timestamp.replace('T', ' ').replace('Z', '') : 'unknown time';
            const payload = typeof msg.payload === 'object' ? JSON.stringify(msg.payload).slice(0, 100) : (msg.payload || '').slice(0, 100);
            
            feedItem.innerHTML = \`
              <div class="tweetTop">
                <div class="who">
                  <div class="avatar">
                    <img src="./avatars/identicons/\${msg.sender_id || 'ATLAS'}.svg" alt="\${msg.sender_id}" onerror="this.src='./avatars/bolt.png'" />
                  </div>
                  <div>
                    <div class="name">\${msg.sender_id || 'MINION'}<span class="meta"> • \${timestamp}</span></div>
                    <div class="meta">\${msg.intent || 'UPDATE'}</div>
                  </div>
                </div>
                <div class="tag ip">active</div>
              </div>
              <div class="tweetBody">\${payload}</div>
            \`;
            
            feedEl.appendChild(feedItem);
          });
          
          console.log('✅ Feed populated with', hive.agora.messages.length, 'items');
        }
      }
    } catch (e) {
      console.error('Feed population failed:', e);
    }
  });
  </script>`;

// Insert before closing body tag
html = html.replace('</body>', workingJS + '\n</body>');

// Write updated HTML
fs.writeFileSync(indexPath, html);

console.log('✅ Fixed button functionality in index.html');