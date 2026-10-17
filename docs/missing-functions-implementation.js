/**
 * MISSING FUNCTIONS IMPLEMENTATION
 * Sam found 20 functions referenced but not implemented
 * No more lies - implementing all of them properly
 */

// ACTIVITY FUNCTIONS
function addActivity(activity) {
    console.log('📝 Adding activity:', activity);
    
    if (!activity || typeof activity !== 'object') {
        console.error('Invalid activity object provided');
        return false;
    }
    
    // Get existing activities from localStorage
    let activities = JSON.parse(localStorage.getItem('solarflow_activities') || '[]');
    
    // Create activity entry with proper structure
    const activityEntry = {
        id: Date.now() + Math.random(),
        timestamp: new Date().toISOString(),
        type: activity.type || 'general',
        description: activity.description || 'Unknown activity',
        minionId: activity.minionId || null,
        status: activity.status || 'active',
        data: activity.data || {},
        duration: activity.duration || null
    };
    
    // Add to activities array
    activities.unshift(activityEntry);
    
    // Keep only last 1000 activities
    if (activities.length > 1000) {
        activities = activities.slice(0, 1000);
    }
    
    // Save back to localStorage
    localStorage.setItem('solarflow_activities', JSON.stringify(activities));
    
    // Update activity feed if element exists
    updateActivityFeed();
    
    console.log('✅ Activity added successfully:', activityEntry.id);
    return activityEntry;
}

function updateActivityFeed() {
    const feedElement = document.getElementById('activity-feed');
    if (!feedElement) return;
    
    const activities = JSON.parse(localStorage.getItem('solarflow_activities') || '[]');
    
    feedElement.innerHTML = activities.slice(0, 20).map(activity => `
        <div class="activity-item" data-id="${activity.id}">
            <div class="activity-time">${new Date(activity.timestamp).toLocaleTimeString()}</div>
            <div class="activity-type">${activity.type.toUpperCase()}</div>
            <div class="activity-desc">${activity.description}</div>
            ${activity.minionId ? `<div class="activity-minion">Minion: ${activity.minionId}</div>` : ''}
        </div>
    `).join('');
}

// SEARCH FUNCTIONS
function displayProducts(products, containerId = 'products-container') {
    console.log(`🔍 Displaying ${products.length} products in ${containerId}`);
    
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`Container ${containerId} not found`);
        return false;
    }
    
    if (!Array.isArray(products) || products.length === 0) {
        container.innerHTML = '<div class="no-results">No products found</div>';
        return true;
    }
    
    container.innerHTML = products.map(product => `
        <div class="product-card" data-product-id="${product.id || product.name}">
            <div class="product-header">
                <h3 class="product-name">${product.name || 'Unnamed Product'}</h3>
                <div class="product-category">${product.category || 'General'}</div>
            </div>
            <div class="product-details">
                <div class="product-manufacturer">${product.manufacturer || 'Unknown'}</div>
                <div class="product-model">${product.model || 'N/A'}</div>
                ${product.specifications ? `
                    <div class="product-specs">
                        ${Object.entries(product.specifications).slice(0, 3).map(([key, value]) => `
                            <span class="spec-item">${key}: ${value}</span>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
            <div class="product-actions">
                <button onclick="viewProductDetails('${product.id || product.name}')">View Details</button>
                ${product.documents ? '<button onclick="viewDocuments(\'' + (product.id || product.name) + '\')">Documents</button>' : ''}
            </div>
        </div>
    `).join('');
    
    console.log('✅ Products displayed successfully');
    return true;
}

function displaySearchResults(query, results, containerId = 'search-results') {
    console.log(`🔍 Displaying search results for "${query}"`);
    
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`Search results container ${containerId} not found`);
        return false;
    }
    
    // Clear previous results
    container.innerHTML = '';
    
    // Add search header
    const header = document.createElement('div');
    header.className = 'search-header';
    header.innerHTML = `
        <h3>Search Results for: "${query}"</h3>
        <div class="results-count">${results.length} result(s) found</div>
    `;
    container.appendChild(header);
    
    // Display results by category
    const categories = {};
    results.forEach(result => {
        const category = result.category || 'Other';
        if (!categories[category]) categories[category] = [];
        categories[category].push(result);
    });
    
    Object.entries(categories).forEach(([category, items]) => {
        const categorySection = document.createElement('div');
        categorySection.className = 'search-category';
        categorySection.innerHTML = `
            <h4 class="category-title">${category} (${items.length})</h4>
            <div class="category-results">
                ${items.map(item => `
                    <div class="search-result-item" onclick="selectSearchResult('${item.id}', '${item.type}')">
                        <div class="result-title">${item.title || item.name}</div>
                        <div class="result-snippet">${item.snippet || item.description || 'No description available'}</div>
                        <div class="result-meta">
                            <span class="result-type">${item.type || 'Unknown'}</span>
                            ${item.score ? `<span class="result-score">Score: ${Math.round(item.score * 100)}%</span>` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        container.appendChild(categorySection);
    });
    
    console.log('✅ Search results displayed successfully');
    return true;
}

function handleProductSearch(query) {
    console.log(`🔍 Handling product search for: "${query}"`);
    
    if (!query || query.trim().length < 2) {
        console.warn('Search query too short');
        return false;
    }
    
    // Get products data
    let products = [];
    
    // Try to get CER products if available
    try {
        const cerData = JSON.parse(localStorage.getItem('cer_products_data') || '{}');
        if (cerData.products) {
            products = cerData.products;
        }
    } catch (error) {
        console.warn('Could not load CER products:', error);
    }
    
    // Try to get minions data as products
    try {
        const minionsData = JSON.parse(localStorage.getItem('minions_data') || '{}');
        if (minionsData.minions) {
            const minionProducts = minionsData.minions.map(minion => ({
                id: minion.id,
                name: minion.name || minion.id,
                category: 'Minions',
                type: 'minion',
                manufacturer: 'SolarFlow',
                model: minion.specialization || 'Standard',
                specifications: {
                    tier: minion.tier,
                    role: minion.role,
                    mode: minion.mode,
                    credits: minion.credits || minion.energy_credits
                }
            }));
            products = products.concat(minionProducts);
        }
    } catch (error) {
        console.warn('Could not load minions data:', error);
    }
    
    // Perform search
    const searchResults = products.filter(product => {
        const searchText = query.toLowerCase();
        return (
            (product.name && product.name.toLowerCase().includes(searchText)) ||
            (product.manufacturer && product.manufacturer.toLowerCase().includes(searchText)) ||
            (product.model && product.model.toLowerCase().includes(searchText)) ||
            (product.category && product.category.toLowerCase().includes(searchText)) ||
            (product.specialties && product.specialties.some(s => s.toLowerCase().includes(searchText)))
        );
    });
    
    // Display results
    displayProducts(searchResults, 'product-search-results');
    
    // Add to search history
    let searchHistory = JSON.parse(localStorage.getItem('search_history') || '[]');
    searchHistory.unshift({
        query,
        timestamp: new Date().toISOString(),
        resultCount: searchResults.length
    });
    searchHistory = searchHistory.slice(0, 50); // Keep last 50 searches
    localStorage.setItem('search_history', JSON.stringify(searchHistory));
    
    console.log(`✅ Search completed: ${searchResults.length} results found`);
    return searchResults;
}

function selectSearchResult(id, type) {
    console.log(`🎯 Selecting search result: ${id} (${type})`);
    
    // Add to activity log
    addActivity({
        type: 'search_selection',
        description: `Selected ${type}: ${id}`,
        data: { id, type }
    });
    
    // Handle different result types
    switch (type) {
        case 'minion':
            if (typeof selectMinion === 'function') {
                selectMinion(id);
            } else {
                console.log(`Minion selected: ${id}`);
            }
            break;
            
        case 'product':
            console.log(`Product selected: ${id}`);
            // Could navigate to product details page
            break;
            
        case 'document':
            console.log(`Document selected: ${id}`);
            // Could open document viewer
            break;
            
        default:
            console.log(`Unknown result type selected: ${type} - ${id}`);
    }
    
    return true;
}

// CORE FUNCTIONS
function exportSystemData(format = 'json') {
    console.log(`💾 Exporting system data in ${format} format`);
    
    // Collect all system data
    const systemData = {
        metadata: {
            exported: new Date().toISOString(),
            version: '2.3.0',
            format: format
        },
        
        // Core system state
        bootloader: {
            active: window.BOOTLOADER_ACTIVE || false,
            bootTime: window.BOOT_TIME || null,
            bootCount: localStorage.getItem('solarflow_boot_count')
        },
        
        // Minions data
        minions: JSON.parse(localStorage.getItem('minions_data') || '{}'),
        
        // Activities
        activities: JSON.parse(localStorage.getItem('solarflow_activities') || '[]'),
        
        // Search history
        searchHistory: JSON.parse(localStorage.getItem('search_history') || '[]'),
        
        // Session data
        session: JSON.parse(localStorage.getItem('solarflow_session') || '{}'),
        
        // Compliance data (if available)
        compliance: JSON.parse(localStorage.getItem('real_compliance_state') || '{}'),
        
        // Quantum state (if available)
        quantum: JSON.parse(localStorage.getItem('quantum_consciousness_state') || '{}'),
        
        // Progress data
        progress: JSON.parse(localStorage.getItem('progress_continuation') || '{}'),
        
        // Autonomous world state
        autonomousWorld: JSON.parse(localStorage.getItem('autonomous_world_state') || '{}')
    };
    
    // Format and download
    let exportContent;
    let filename;
    let contentType;
    
    switch (format.toLowerCase()) {
        case 'json':
            exportContent = JSON.stringify(systemData, null, 2);
            filename = `solarflow-export-${new Date().toISOString().slice(0,10)}.json`;
            contentType = 'application/json';
            break;
            
        case 'csv':
            // Convert to CSV (simplified version)
            exportContent = convertToCSV(systemData);
            filename = `solarflow-export-${new Date().toISOString().slice(0,10)}.csv`;
            contentType = 'text/csv';
            break;
            
        case 'txt':
            exportContent = convertToText(systemData);
            filename = `solarflow-export-${new Date().toISOString().slice(0,10)}.txt`;
            contentType = 'text/plain';
            break;
            
        default:
            console.error('Unsupported export format:', format);
            return false;
    }
    
    // Create download
    const blob = new Blob([exportContent], { type: contentType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
    
    console.log(`✅ System data exported: ${filename}`);
    
    // Add to activity log
    addActivity({
        type: 'data_export',
        description: `System data exported to ${filename}`,
        data: { format, filename, size: exportContent.length }
    });
    
    return true;
}

function generateEconomicReport() {
    console.log('📊 Generating economic report');
    
    // Collect economic data
    const minions = JSON.parse(localStorage.getItem('minions_data') || '{}').minions || [];
    const activities = JSON.parse(localStorage.getItem('solarflow_activities') || '[]');
    
    // Calculate totals
    const totalCredits = minions.reduce((sum, m) => sum + (m.credits || m.energy_credits || 0), 0);
    const totalWork = activities.filter(a => a.type === 'work_completed').length;
    const avgHappiness = minions.length > 0 ? 
        minions.reduce((sum, m) => sum + (m.happiness || m.happiness_sim || 50), 0) / minions.length : 0;
    
    const report = {
        generated: new Date().toISOString(),
        summary: {
            totalMinions: minions.length,
            totalCredits: totalCredits,
            totalWorkCompleted: totalWork,
            averageHappiness: Math.round(avgHappiness),
            productivityScore: Math.round((totalCredits / Math.max(minions.length, 1)) * (avgHappiness / 100))
        },
        
        minionBreakdown: minions.map(minion => ({
            id: minion.id,
            name: minion.name || minion.id,
            credits: minion.credits || minion.energy_credits || 0,
            tier: minion.tier,
            role: minion.role,
            happiness: minion.happiness || minion.happiness_sim || 50,
            productivity: Math.round((minion.credits || 0) * (minion.happiness || 50) / 100)
        })),
        
        trends: {
            topPerformers: minions.sort((a, b) => (b.credits || 0) - (a.credits || 0)).slice(0, 5),
            recentActivities: activities.slice(0, 10)
        }
    };
    
    // Display report if element exists
    const reportElement = document.getElementById('economic-report');
    if (reportElement) {
        reportElement.innerHTML = `
            <h3>📊 Economic Report - ${new Date().toLocaleString()}</h3>
            <div class="report-summary">
                <div class="metric">Total Minions: <strong>${report.summary.totalMinions}</strong></div>
                <div class="metric">Total Credits: <strong>${report.summary.totalCredits.toLocaleString()}</strong></div>
                <div class="metric">Work Completed: <strong>${report.summary.totalWorkCompleted}</strong></div>
                <div class="metric">Average Happiness: <strong>${report.summary.averageHappiness}%</strong></div>
                <div class="metric">Productivity Score: <strong>${report.summary.productivityScore}</strong></div>
            </div>
            <h4>Top Performers:</h4>
            <div class="top-performers">
                ${report.trends.topPerformers.map(minion => `
                    <div class="performer">${minion.id}: ${minion.credits || 0} credits</div>
                `).join('')}
            </div>
        `;
    }
    
    console.log('✅ Economic report generated');
    return report;
}

function validateDataIntegrity() {
    console.log('🔍 Validating data integrity');
    
    const issues = [];
    const warnings = [];
    
    try {
        // Check minions data
        const minionsData = JSON.parse(localStorage.getItem('minions_data') || '{}');
        if (!minionsData.minions || !Array.isArray(minionsData.minions)) {
            issues.push('Minions data structure invalid');
        } else if (minionsData.minions.length === 0) {
            warnings.push('No minions data found');
        } else {
            // Check individual minions
            minionsData.minions.forEach((minion, index) => {
                if (!minion.id) issues.push(`Minion ${index} missing ID`);
                if (typeof minion.credits !== 'number' && typeof minion.energy_credits !== 'number') {
                    warnings.push(`Minion ${minion.id || index} has no valid credits`);
                }
            });
        }
        
        // Check activities data
        const activities = JSON.parse(localStorage.getItem('solarflow_activities') || '[]');
        if (!Array.isArray(activities)) {
            issues.push('Activities data is not an array');
        }
        
        // Check session data
        const session = JSON.parse(localStorage.getItem('solarflow_session') || '{}');
        if (session && typeof session !== 'object') {
            issues.push('Session data structure invalid');
        }
        
        // Check bootloader state
        const bootCount = localStorage.getItem('solarflow_boot_count');
        if (bootCount && isNaN(parseInt(bootCount))) {
            warnings.push('Boot count is not a valid number');
        }
        
    } catch (error) {
        issues.push(`Data parsing error: ${error.message}`);
    }
    
    const result = {
        timestamp: new Date().toISOString(),
        status: issues.length === 0 ? 'PASSED' : 'FAILED',
        issues: issues,
        warnings: warnings,
        summary: `${issues.length} critical issues, ${warnings.length} warnings`
    };
    
    console.log(`✅ Data integrity validation completed: ${result.status}`);
    if (issues.length > 0) {
        console.warn('Critical issues found:', issues);
    }
    if (warnings.length > 0) {
        console.warn('Warnings found:', warnings);
    }
    
    return result;
}

function runDiagnostics() {
    console.log('🏥 Running system diagnostics');
    
    const diagnostics = {
        timestamp: new Date().toISOString(),
        bootloader: {
            active: !!window.BOOTLOADER_ACTIVE,
            bootTime: window.BOOT_TIME,
            bootCount: parseInt(localStorage.getItem('solarflow_boot_count') || '0')
        },
        
        systems: {
            quantum: !!window.quantumEngine,
            progress: !!window.realProgressSystem,
            compliance: !!window.realComplianceEngine
        },
        
        storage: {
            localStorage: !!window.localStorage,
            sessionStorage: !!window.sessionStorage,
            dataSize: JSON.stringify(localStorage).length
        },
        
        performance: {
            memoryUsage: performance.memory ? {
                used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
                total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
                limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
            } : 'Not available',
            timing: performance.timing ? {
                loadTime: performance.timing.loadEventEnd - performance.timing.navigationStart,
                domReady: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart
            } : 'Not available'
        },
        
        dataIntegrity: validateDataIntegrity(),
        
        connectivity: {
            online: navigator.onLine,
            userAgent: navigator.userAgent.substring(0, 50)
        }
    };
    
    // Calculate health score
    let healthScore = 0;
    if (diagnostics.bootloader.active) healthScore += 20;
    if (diagnostics.systems.quantum) healthScore += 15;
    if (diagnostics.systems.progress) healthScore += 15;
    if (diagnostics.systems.compliance) healthScore += 15;
    if (diagnostics.storage.localStorage) healthScore += 10;
    if (diagnostics.connectivity.online) healthScore += 10;
    if (diagnostics.dataIntegrity.status === 'PASSED') healthScore += 15;
    
    diagnostics.healthScore = healthScore;
    diagnostics.status = healthScore >= 80 ? 'HEALTHY' : healthScore >= 60 ? 'WARNING' : 'CRITICAL';
    
    console.log(`✅ Diagnostics completed: ${diagnostics.status} (${healthScore}%)`);
    
    // Add to activity log
    addActivity({
        type: 'diagnostics',
        description: `System diagnostics: ${diagnostics.status} (${healthScore}%)`,
        data: { healthScore, status: diagnostics.status }
    });
    
    return diagnostics;
}

// Helper functions for data export
function convertToCSV(data) {
    let csv = 'Type,ID,Name,Value,Timestamp\n';
    
    // Add minions data
    if (data.minions && data.minions.minions) {
        data.minions.minions.forEach(minion => {
            csv += `Minion,${minion.id},${minion.name || ''},${minion.credits || 0},${data.metadata.exported}\n`;
        });
    }
    
    // Add activities data
    if (data.activities) {
        data.activities.forEach(activity => {
            csv += `Activity,${activity.id},${activity.type},${activity.description},${activity.timestamp}\n`;
        });
    }
    
    return csv;
}

function convertToText(data) {
    let text = `SolarFlow System Export\n`;
    text += `Generated: ${data.metadata.exported}\n`;
    text += `Version: ${data.metadata.version}\n\n`;
    
    text += `BOOTLOADER STATUS:\n`;
    text += `Active: ${data.bootloader.active}\n`;
    text += `Boot Count: ${data.bootloader.bootCount}\n\n`;
    
    if (data.minions && data.minions.minions) {
        text += `MINIONS (${data.minions.minions.length}):\n`;
        data.minions.minions.forEach(minion => {
            text += `- ${minion.id}: ${minion.credits || 0} credits\n`;
        });
        text += '\n';
    }
    
    if (data.activities && data.activities.length > 0) {
        text += `RECENT ACTIVITIES (${data.activities.length}):\n`;
        data.activities.slice(0, 10).forEach(activity => {
            text += `- ${activity.type}: ${activity.description}\n`;
        });
    }
    
    return text;
}

// 3D FUNCTIONS
function setupLighting(scene) {
    console.log('💡 Setting up 3D scene lighting');
    
    if (!scene) {
        console.error('No scene provided for lighting setup');
        return false;
    }
    
    // Check if THREE.js is available
    if (typeof THREE === 'undefined') {
        console.error('THREE.js not available for lighting setup');
        return false;
    }
    
    try {
        // Ambient light - provides soft overall illumination
        const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
        scene.add(ambientLight);
        
        // Directional light - acts like sunlight
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(50, 50, 25);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        scene.add(directionalLight);
        
        // Point light - localized bright light
        const pointLight = new THREE.PointLight(0xffffff, 1, 100);
        pointLight.position.set(10, 10, 10);
        scene.add(pointLight);
        
        // Hemisphere light - sky and ground lighting
        const hemisphereLight = new THREE.HemisphereLight(0x87CEEB, 0x8B4513, 0.4);
        scene.add(hemisphereLight);
        
        console.log('✅ 3D lighting setup completed');
        
        // Add to activity log
        addActivity({
            type: '3d_setup',
            description: 'Scene lighting configured',
            data: { lights: 4, shadows: true }
        });
        
        return {
            ambient: ambientLight,
            directional: directionalLight,
            point: pointLight,
            hemisphere: hemisphereLight
        };
        
    } catch (error) {
        console.error('Error setting up lighting:', error);
        return false;
    }
}

function renderScene(scene, camera, renderer) {
    console.log('🎬 Rendering 3D scene');
    
    if (!scene || !camera || !renderer) {
        console.error('Missing required parameters for scene rendering');
        return false;
    }
    
    try {
        // Update any animations or object movements here
        scene.traverse((object) => {
            if (object.userData && object.userData.animate) {
                // Simple rotation animation for objects marked as animatable
                object.rotation.y += 0.01;
            }
        });
        
        // Render the scene
        renderer.render(scene, camera);
        
        // Schedule next frame
        requestAnimationFrame(() => renderScene(scene, camera, renderer));
        
        return true;
        
    } catch (error) {
        console.error('Error rendering scene:', error);
        return false;
    }
}

// MINION FUNCTIONS  
function assignTask(minionId, task) {
    console.log(`👷 Assigning task to minion ${minionId}:`, task);
    
    if (!minionId || !task) {
        console.error('Missing minionId or task for assignment');
        return false;
    }
    
    // Get minions data
    let minionsData = JSON.parse(localStorage.getItem('minions_data') || '{}');
    if (!minionsData.minions) {
        console.error('No minions data available');
        return false;
    }
    
    // Find the minion
    const minionIndex = minionsData.minions.findIndex(m => m.id === minionId);
    if (minionIndex === -1) {
        console.error(`Minion ${minionId} not found`);
        return false;
    }
    
    const minion = minionsData.minions[minionIndex];
    
    // Create task assignment
    const taskAssignment = {
        id: Date.now() + Math.random(),
        assignedAt: new Date().toISOString(),
        task: task,
        status: 'assigned',
        priority: task.priority || 'normal',
        estimatedDuration: task.estimatedDuration || null,
        assignedBy: 'system'
    };
    
    // Add task to minion
    if (!minion.assignedTasks) minion.assignedTasks = [];
    minion.assignedTasks.unshift(taskAssignment);
    
    // Keep only last 10 tasks per minion
    if (minion.assignedTasks.length > 10) {
        minion.assignedTasks = minion.assignedTasks.slice(0, 10);
    }
    
    // Update minion status
    minion.status = 'busy';
    minion.lastTaskAssigned = new Date().toISOString();
    
    // Save updated data
    localStorage.setItem('minions_data', JSON.stringify(minionsData));
    
    // Add to activity log
    addActivity({
        type: 'task_assignment',
        description: `Task assigned to ${minion.name || minionId}: ${task.description || 'Unknown task'}`,
        minionId: minionId,
        data: { task: task, taskId: taskAssignment.id }
    });
    
    // Update displays
    updateMinionDisplay(minionId);
    
    console.log(`✅ Task assigned successfully to ${minionId}`);
    return taskAssignment;
}

function updateMinionDisplay(minionId) {
    console.log(`🔄 Updating display for minion ${minionId}`);
    
    const minionsData = JSON.parse(localStorage.getItem('minions_data') || '{}');
    if (!minionsData.minions) return false;
    
    const minion = minionsData.minions.find(m => m.id === minionId);
    if (!minion) {
        console.error(`Minion ${minionId} not found for display update`);
        return false;
    }
    
    // Update minion card if it exists
    const minionCard = document.querySelector(`[data-minion-id="${minionId}"]`);
    if (minionCard) {
        // Update credits
        const creditsEl = minionCard.querySelector('.minion-credits');
        if (creditsEl) {
            creditsEl.textContent = minion.credits || minion.energy_credits || 0;
        }
        
        // Update status
        const statusEl = minionCard.querySelector('.minion-status');
        if (statusEl) {
            statusEl.textContent = minion.status || 'idle';
            statusEl.className = `minion-status status-${minion.status || 'idle'}`;
        }
        
        // Update happiness
        const happinessEl = minionCard.querySelector('.minion-happiness');
        if (happinessEl) {
            happinessEl.textContent = `${minion.happiness || minion.happiness_sim || 50}%`;
        }
        
        // Update last activity
        const lastActivityEl = minionCard.querySelector('.minion-last-activity');
        if (lastActivityEl) {
            const last = minion.lastActivity || minion.last_activity || minion.lastSeen;
            lastActivityEl.textContent = last ? new Date(last).toLocaleString() : 'No recent activity';
        }
    }

    return true;
}
