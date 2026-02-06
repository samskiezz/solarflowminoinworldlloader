// TASK PROGRESSION VIA COMMITS - Static hosting approach
// Tasks advance through commits to hive_state.json (not runtime updates)

console.log('📋 Task Progression System (Static Hosting) loaded');

class TaskProgressionSystem {
    constructor() {
        this.hiveState = null;
        this.tasks = [];
        this.minions = [];
        this.lastCommitCheck = null;
        
        this.init();
    }
    
    async init() {
        console.log('🚀 Initializing task progression system...');
        await this.loadHiveState();
        this.extractTasks();
        this.extractMinions();
        this.updateUI();
        
        // Check for updates periodically (simulating static hosting updates)
        setInterval(() => this.checkForUpdates(), 30000); // Every 30 seconds
    }
    
    async loadHiveState() {
        try {
            console.log('📄 Loading hive_state.json...');
            const response = await fetch('./hive_state.json');
            if (!response.ok) {
                throw new Error(`Failed to load hive_state.json: ${response.status}`);
            }
            
            this.hiveState = await response.json();
            console.log('✅ Hive state loaded:', this.hiveState.meta.updatedAt);
            
        } catch (error) {
            console.error('❌ Failed to load hive state:', error);
            this.createFallbackData();
        }
    }
    
    createFallbackData() {
        console.log('🔄 Creating fallback task data...');
        this.hiveState = {
            meta: {
                updatedAt: new Date().toISOString(),
                source: "fallback"
            },
            tasks: {
                board: [
                    {
                        id: "TASK_ATLAS_DOC_DISCOVERY",
                        title: "Doc discovery (robots-safe) + sitemap mapping",
                        owner: "ATLAS",
                        status: "queued",
                        progress: 0
                    },
                    {
                        id: "TASK_LUMEN_DOC_FETCH", 
                        title: "Fetch/verify PDFs + hash/dedupe",
                        owner: "LUMEN",
                        status: "starting",
                        progress: 0.1
                    }
                ]
            },
            minions: {
                roster: [
                    { id: 'ATLAS', role: 'OVERSEER', tier: 3, mode: 'COLLAB' },
                    { id: 'LUMEN', role: 'OVERSEER', tier: 3, mode: 'FOCUS' }
                ]
            }
        };
    }
    
    extractTasks() {
        if (this.hiveState?.tasks?.board) {
            this.tasks = this.hiveState.tasks.board;
            console.log(`📋 Extracted ${this.tasks.length} tasks from hive state`);
        } else {
            console.log('⚠️ No tasks found in hive state');
            this.tasks = [];
        }
    }
    
    extractMinions() {
        if (this.hiveState?.minions?.roster) {
            this.minions = this.hiveState.minions.roster;
            console.log(`👥 Extracted ${this.minions.length} minions from hive state`);
        } else {
            console.log('⚠️ No minions found in hive state');
            this.minions = [];
        }
    }
    
    updateUI() {
        console.log('🖥️ Updating task board UI...');
        this.updateTaskBoard();
        this.updateRosterPreview();
        this.updateSystemStatus();
    }
    
    updateTaskBoard() {
        // Find task containers in the UI
        const taskContainers = document.querySelectorAll('.taskBtn, [data-task-id]');
        
        this.tasks.forEach(task => {
            // Update existing task elements
            taskContainers.forEach(container => {
                const taskText = container.textContent || '';
                if (taskText.includes(task.owner) || taskText.includes(task.title.split(' ')[0])) {
                    this.updateTaskElement(container, task);
                }
            });
        });
        
        // Update task board section if it exists
        this.renderTaskBoard();
    }
    
    updateTaskElement(element, task) {
        // Update task status styling
        element.classList.remove('status-queued', 'status-starting', 'status-in-progress', 'status-done');
        element.classList.add(`status-${task.status.replace(/[^a-z]/gi, '')}`);
        
        // Update progress indicator if present
        const progressEl = element.querySelector('.progress, .k');
        if (progressEl && task.progress !== undefined) {
            progressEl.textContent = `${Math.round(task.progress * 100)}% • ${task.status}`;
        }
        
        // Update last update time
        const timeEl = element.querySelector('.meta, .v');
        if (timeEl && task.last_update) {
            const updateTime = new Date(task.last_update);
            timeEl.textContent = updateTime.toLocaleString();
        }
    }
    
    renderTaskBoard() {
        // Create/update a comprehensive task board
        let taskBoardHtml = '<div class="task-board-section">';
        taskBoardHtml += '<h3>📋 Task Board (Static Hosting)</h3>';
        
        this.tasks.forEach(task => {
            const minion = this.minions.find(m => m.id === task.owner);
            const statusColor = this.getStatusColor(task.status);
            
            taskBoardHtml += `
                <div class="task-item" data-task-id="${task.id}">
                    <div class="task-header">
                        <span class="task-owner" style="color: ${statusColor};">${task.owner}</span>
                        <span class="task-status ${task.status}">${task.status}</span>
                    </div>
                    <div class="task-title">${task.title}</div>
                    <div class="task-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${(task.progress || 0) * 100}%; background: ${statusColor};"></div>
                        </div>
                        <span class="progress-text">${Math.round((task.progress || 0) * 100)}%</span>
                    </div>
                    ${task.last_update ? `<div class="task-meta">Updated: ${new Date(task.last_update).toLocaleString()}</div>` : ''}
                </div>
            `;
        });
        
        taskBoardHtml += '</div>';
        
        // Insert task board if container exists
        const existingBoard = document.querySelector('.task-board-section');
        if (existingBoard) {
            existingBoard.outerHTML = taskBoardHtml;
        } else {
            // Add to the main content area
            const mainCard = document.querySelector('.card');
            if (mainCard) {
                const boardDiv = document.createElement('div');
                boardDiv.innerHTML = taskBoardHtml;
                mainCard.appendChild(boardDiv.firstChild);
            }
        }
    }
    
    getStatusColor(status) {
        const colorMap = {
            'queued': '#666666',
            'starting': '#60a5fa',
            'in-progress': '#00ff88',
            'done': '#22c55e',
            'blocked': '#f59e0b',
            'failed': '#ef4444'
        };
        return colorMap[status] || '#888888';
    }
    
    updateRosterPreview() {
        console.log('👥 Updating roster preview...');
        
        // Update roster grid if it exists
        const rosterGrid = document.querySelector('.rosterGrid');
        if (rosterGrid && this.minions.length > 0) {
            // Show first 12 minions in preview
            const previewMinions = this.minions.slice(0, 12);
            
            rosterGrid.innerHTML = previewMinions.map(minion => {
                const task = this.tasks.find(t => t.owner === minion.id);
                const statusText = task ? `${task.status} • ${task.title.split(' ')[0]}` : minion.mode || 'idle';
                
                return `
                    <div class="minion-card" data-minion-id="${minion.id}">
                        <div class="avatar">
                            <img src="${minion.avatar_url || `./avatars/identicons/${minion.id}.svg`}" alt="${minion.id}" />
                        </div>
                        <div class="info">
                            <div class="name">${minion.id}</div>
                            <div class="role">${minion.role}</div>
                            <div class="status">${statusText}</div>
                        </div>
                    </div>
                `;
            }).join('');
            
            // Add link to full roster
            const fullRosterLink = document.createElement('div');
            fullRosterLink.className = 'full-roster-link';
            fullRosterLink.innerHTML = `
                <a href="./roster.html" style="color: #00ff88; text-decoration: none;">
                    📋 View Full Roster (${this.minions.length} minions) →
                </a>
            `;
            rosterGrid.appendChild(fullRosterLink);
        }
    }
    
    updateSystemStatus() {
        // Update system status indicators
        if (this.hiveState?.meta?.updatedAt) {
            const updatedAtEl = document.getElementById('updatedAt');
            if (updatedAtEl) {
                updatedAtEl.textContent = this.hiveState.meta.updatedAt;
            }
        }
        
        // Update CI status based on task health
        const healthyTasks = this.tasks.filter(t => t.status !== 'failed').length;
        const totalTasks = this.tasks.length;
        const healthScore = totalTasks > 0 ? healthyTasks / totalTasks : 1;
        
        const ciEl = document.getElementById('ciText');
        if (ciEl) {
            ciEl.textContent = healthScore > 0.8 ? 'passing' : healthScore > 0.5 ? 'unstable' : 'failing';
            ciEl.style.color = healthScore > 0.8 ? '#22c55e' : healthScore > 0.5 ? '#f59e0b' : '#ef4444';
        }
    }
    
    async checkForUpdates() {
        try {
            // In static hosting, check if hive_state.json has been updated
            const response = await fetch('./hive_state.json?bust=' + Date.now());
            if (response.ok) {
                const newHiveState = await response.json();
                
                // Check if updated
                if (newHiveState.meta.updatedAt !== this.hiveState?.meta?.updatedAt) {
                    console.log('🔄 Hive state updated, refreshing tasks...');
                    this.hiveState = newHiveState;
                    this.extractTasks();
                    this.extractMinions();
                    this.updateUI();
                    
                    // Show update notification
                    this.showUpdateNotification();
                }
            }
        } catch (error) {
            console.log('⚠️ Update check failed (normal for static hosting):', error.message);
        }
    }
    
    showUpdateNotification() {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(0, 255, 136, 0.9);
            color: #000;
            padding: 10px 15px;
            border-radius: 8px;
            font-weight: bold;
            z-index: 9999;
            animation: slideIn 0.3s ease;
        `;
        notification.textContent = '🔄 Tasks updated via commit';
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
    
    // Simulate task progression (for demo purposes)
    simulateTaskProgression() {
        console.log('🎮 Simulating task progression...');
        
        this.tasks.forEach(task => {
            // Simulate random progress
            if (task.status === 'starting' || task.status === 'in-progress') {
                task.progress = Math.min(1, (task.progress || 0) + Math.random() * 0.1);
                
                if (task.progress > 0.9) {
                    task.status = 'done';
                } else if (task.progress > 0.1) {
                    task.status = 'in-progress';
                }
                
                task.last_update = new Date().toISOString();
            }
        });
        
        this.updateUI();
    }
    
    // Public API
    getTasks() { return this.tasks; }
    getMinions() { return this.minions; }
    getHiveState() { return this.hiveState; }
}

// Initialize task progression system
let taskProgressionSystem;

document.addEventListener('DOMContentLoaded', () => {
    taskProgressionSystem = new TaskProgressionSystem();
    
    // Make available globally for debugging
    window.TASK_PROGRESSION = taskProgressionSystem;
});

// Export for other modules
window.TaskProgressionSystem = TaskProgressionSystem;

console.log('✅ Task progression via commits system loaded');