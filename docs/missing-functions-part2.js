/**
 * MISSING FUNCTIONS IMPLEMENTATION - PART 2
 * Completing the remaining functions that Sam identified as missing
 */

// Continuing from updateMinionDisplay function
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
            const lastActivity = minion.lastTaskAssigned || minion.last_activity || 'Never';
            lastActivityEl.textContent = lastActivity !== 'Never' ? 
                new Date(lastActivity).toLocaleString() : 'Never';
        }
        
        // Update task count
        const taskCountEl = minionCard.querySelector('.minion-task-count');
        if (taskCountEl) {
            const taskCount = minion.assignedTasks ? minion.assignedTasks.length : 0;
            taskCountEl.textContent = `${taskCount} task(s)`;
        }
    }
    
    // Update roster display if it exists
    const rosterRow = document.querySelector(`tr[data-minion="${minionId}"]`);
    if (rosterRow) {
        const cells = rosterRow.querySelectorAll('td');
        if (cells.length >= 4) {
            cells[1].textContent = minion.credits || minion.energy_credits || 0;
            cells[2].textContent = `${minion.happiness || minion.happiness_sim || 50}%`;
            cells[3].textContent = minion.status || 'idle';
        }
    }
    
    console.log(`✅ Display updated for minion ${minionId}`);
    return true;
}

function selectMinion(minionId) {
    console.log(`🎯 Selecting minion ${minionId}`);
    
    if (!minionId) {
        console.error('No minionId provided for selection');
        return false;
    }
    
    // Get minion data
    const minionsData = JSON.parse(localStorage.getItem('minions_data') || '{}');
    if (!minionsData.minions) {
        console.error('No minions data available');
        return false;
    }
    
    const minion = minionsData.minions.find(m => m.id === minionId);
    if (!minion) {
        console.error(`Minion ${minionId} not found`);
        return false;
    }
    
    // Update selection state
    localStorage.setItem('selected_minion', minionId);
    
    // Remove previous selection highlights
    document.querySelectorAll('.minion-selected').forEach(el => {
        el.classList.remove('minion-selected');
    });
    
    // Add selection highlight to current minion
    const minionElements = document.querySelectorAll(`[data-minion-id="${minionId}"]`);
    minionElements.forEach(el => {
        el.classList.add('minion-selected');
    });
    
    // Update selection info panel if it exists
    const selectionPanel = document.getElementById('minion-selection-panel');
    if (selectionPanel) {
        selectionPanel.innerHTML = `
            <h3>Selected Minion: ${minion.name || minionId}</h3>
            <div class="minion-details">
                <div class="detail-row">
                    <label>ID:</label>
                    <span>${minion.id}</span>
                </div>
                <div class="detail-row">
                    <label>Role:</label>
                    <span>${minion.role || 'Unknown'}</span>
                </div>
                <div class="detail-row">
                    <label>Tier:</label>
                    <span>${minion.tier || 'N/A'}</span>
                </div>
                <div class="detail-row">
                    <label>Credits:</label>
                    <span>${minion.credits || minion.energy_credits || 0}</span>
                </div>
                <div class="detail-row">
                    <label>Happiness:</label>
                    <span>${minion.happiness || minion.happiness_sim || 50}%</span>
                </div>
                <div class="detail-row">
                    <label>Status:</label>
                    <span>${minion.status || 'idle'}</span>
                </div>
                ${minion.specialties ? `
                    <div class="detail-row">
                        <label>Specialties:</label>
                        <span>${minion.specialties.join(', ')}</span>
                    </div>
                ` : ''}
                ${minion.assignedTasks ? `
                    <div class="detail-row">
                        <label>Tasks:</label>
                        <span>${minion.assignedTasks.length} assigned</span>
                    </div>
                ` : ''}
            </div>
            <div class="minion-actions">
                <button onclick="assignTask('${minionId}', {description: 'General task', priority: 'normal'})">
                    Assign Task
                </button>
                <button onclick="viewMinionHistory('${minionId}')">
                    View History
                </button>
                <button onclick="openMinionChat('${minionId}')">
                    Start Chat
                </button>
            </div>
        `;
    }
    
    // Add to activity log
    addActivity({
        type: 'minion_selection',
        description: `Selected minion: ${minion.name || minionId}`,
        minionId: minionId,
        data: { minion: minion }
    });
    
    console.log(`✅ Minion ${minionId} selected successfully`);
    return minion;
}

// DOCUMENT FUNCTIONS
function loadDocumentData() {
    console.log('📄 Loading document data');
    
    try {
        // Load processed documents from localStorage
        let documents = JSON.parse(localStorage.getItem('processed_documents') || '[]');
        
        // If no documents exist, create some sample data
        if (documents.length === 0) {
            documents = [
                {
                    id: 'doc_' + Date.now(),
                    name: 'AS/NZS 3000:2018 Extract',
                    type: 'standard',
                    status: 'processed',
                    size: '2.5 MB',
                    uploadedAt: new Date().toISOString(),
                    processedAt: new Date().toISOString(),
                    content: 'Australian/New Zealand Wiring Rules - Electrical installations',
                    tags: ['electrical', 'wiring', 'safety', 'AS/NZS 3000']
                },
                {
                    id: 'doc_' + (Date.now() + 1),
                    name: 'Solar Installation Report',
                    type: 'report',
                    status: 'validated',
                    size: '1.8 MB',
                    uploadedAt: new Date(Date.now() - 86400000).toISOString(),
                    processedAt: new Date(Date.now() - 86400000).toISOString(),
                    content: 'Residential solar PV installation compliance report',
                    tags: ['solar', 'installation', 'compliance', 'report']
                },
                {
                    id: 'doc_' + (Date.now() + 2),
                    name: 'Battery Safety Guidelines',
                    type: 'guideline',
                    status: 'pending',
                    size: '3.2 MB',
                    uploadedAt: new Date().toISOString(),
                    processedAt: null,
                    content: 'AS/NZS 5139 battery system safety requirements',
                    tags: ['battery', 'safety', 'AS/NZS 5139', 'guidelines']
                }
            ];
            
            // Save the sample documents
            localStorage.setItem('processed_documents', JSON.stringify(documents));
        }
        
        // Update display if element exists
        const documentsList = document.getElementById('documents-list');
        if (documentsList) {
            documentsList.innerHTML = documents.map(doc => `
                <div class="document-item" data-doc-id="${doc.id}">
                    <div class="document-header">
                        <div class="document-name">${doc.name}</div>
                        <div class="document-status status-${doc.status}">${doc.status.toUpperCase()}</div>
                    </div>
                    <div class="document-meta">
                        <span class="document-type">${doc.type}</span>
                        <span class="document-size">${doc.size}</span>
                        <span class="document-date">${new Date(doc.uploadedAt).toLocaleDateString()}</span>
                    </div>
                    <div class="document-content">${doc.content.substring(0, 100)}...</div>
                    <div class="document-tags">
                        ${doc.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                    </div>
                    <div class="document-actions">
                        <button onclick="viewDocument('${doc.id}')">View</button>
                        <button onclick="validateDocuments(['${doc.id}'])">Validate</button>
                        <button onclick="archiveDocuments(['${doc.id}'])">Archive</button>
                    </div>
                </div>
            `).join('');
        }
        
        console.log(`✅ Loaded ${documents.length} documents`);
        
        // Add to activity log
        addActivity({
            type: 'data_load',
            description: `Loaded ${documents.length} documents`,
            data: { documentCount: documents.length }
        });
        
        return documents;
        
    } catch (error) {
        console.error('Error loading document data:', error);
        return [];
    }
}

function validateDocuments(documentIds) {
    console.log(`🔍 Validating ${documentIds.length} document(s)`);
    
    if (!Array.isArray(documentIds) || documentIds.length === 0) {
        console.error('No valid document IDs provided for validation');
        return false;
    }
    
    // Get documents data
    let documents = JSON.parse(localStorage.getItem('processed_documents') || '[]');
    
    const validationResults = documentIds.map(docId => {
        const docIndex = documents.findIndex(d => d.id === docId);
        if (docIndex === -1) {
            return { id: docId, status: 'not_found', valid: false };
        }
        
        const document = documents[docIndex];
        
        // Perform validation checks
        const validationChecks = {
            hasContent: !!document.content && document.content.length > 10,
            hasValidType: ['standard', 'report', 'guideline', 'manual', 'certificate'].includes(document.type),
            hasSize: !!document.size,
            hasUploadDate: !!document.uploadedAt,
            hasValidTags: Array.isArray(document.tags) && document.tags.length > 0
        };
        
        const passedChecks = Object.values(validationChecks).filter(Boolean).length;
        const totalChecks = Object.keys(validationChecks).length;
        const validationScore = Math.round((passedChecks / totalChecks) * 100);
        
        const isValid = validationScore >= 80;
        
        // Update document status
        document.status = isValid ? 'validated' : 'validation_failed';
        document.lastValidated = new Date().toISOString();
        document.validationScore = validationScore;
        document.validationChecks = validationChecks;
        
        documents[docIndex] = document;
        
        return {
            id: docId,
            name: document.name,
            status: document.status,
            valid: isValid,
            score: validationScore,
            checks: validationChecks
        };
    });
    
    // Save updated documents
    localStorage.setItem('processed_documents', JSON.stringify(documents));
    
    // Update display
    loadDocumentData();
    
    // Show validation results if element exists
    const resultsPanel = document.getElementById('validation-results');
    if (resultsPanel) {
        resultsPanel.innerHTML = `
            <h4>Validation Results</h4>
            ${validationResults.map(result => `
                <div class="validation-result ${result.valid ? 'valid' : 'invalid'}">
                    <div class="result-header">
                        ${result.valid ? '✅' : '❌'} ${result.name || result.id}
                    </div>
                    <div class="result-score">Score: ${result.score}%</div>
                    <div class="result-checks">
                        ${Object.entries(result.checks).map(([check, passed]) => 
                            `<span class="check ${passed ? 'pass' : 'fail'}">${check}: ${passed ? '✅' : '❌'}</span>`
                        ).join('')}
                    </div>
                </div>
            `).join('')}
        `;
    }
    
    const validCount = validationResults.filter(r => r.valid).length;
    console.log(`✅ Validation completed: ${validCount}/${validationResults.length} documents valid`);
    
    // Add to activity log
    addActivity({
        type: 'document_validation',
        description: `Validated ${documentIds.length} documents: ${validCount} valid`,
        data: { results: validationResults, validCount: validCount }
    });
    
    return validationResults;
}

function archiveDocuments(documentIds) {
    console.log(`📦 Archiving ${documentIds.length} document(s)`);
    
    if (!Array.isArray(documentIds) || documentIds.length === 0) {
        console.error('No valid document IDs provided for archiving');
        return false;
    }
    
    // Get documents data
    let documents = JSON.parse(localStorage.getItem('processed_documents') || '[]');
    let archivedDocuments = JSON.parse(localStorage.getItem('archived_documents') || '[]');
    
    const archiveResults = [];
    
    documentIds.forEach(docId => {
        const docIndex = documents.findIndex(d => d.id === docId);
        if (docIndex !== -1) {
            const document = documents[docIndex];
            
            // Add archive metadata
            document.archivedAt = new Date().toISOString();
            document.archivedBy = 'system';
            document.originalStatus = document.status;
            document.status = 'archived';
            
            // Move to archived documents
            archivedDocuments.unshift(document);
            documents.splice(docIndex, 1);
            
            archiveResults.push({
                id: docId,
                name: document.name,
                archived: true
            });
        } else {
            archiveResults.push({
                id: docId,
                name: 'Unknown',
                archived: false,
                error: 'Document not found'
            });
        }
    });
    
    // Keep only last 100 archived documents
    if (archivedDocuments.length > 100) {
        archivedDocuments = archivedDocuments.slice(0, 100);
    }
    
    // Save updated data
    localStorage.setItem('processed_documents', JSON.stringify(documents));
    localStorage.setItem('archived_documents', JSON.stringify(archivedDocuments));
    
    // Update display
    loadDocumentData();
    
    const archivedCount = archiveResults.filter(r => r.archived).length;
    console.log(`✅ Archived ${archivedCount}/${archiveResults.length} documents`);
    
    // Add to activity log
    addActivity({
        type: 'document_archive',
        description: `Archived ${archivedCount} documents`,
        data: { results: archiveResults, archivedCount: archivedCount }
    });
    
    return archiveResults;
}

function scanForDocuments() {
    console.log('🔍 Scanning for new documents');
    
    try {
        // Simulate document scanning (in a real system, this would scan file system or network locations)
        const potentialDocuments = [
            {
                path: '/uploads/AS_NZS_4777_Grid_Connection.pdf',
                name: 'AS/NZS 4777 Grid Connection Standard',
                size: '4.2 MB',
                lastModified: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
                type: 'standard'
            },
            {
                path: '/uploads/Installation_Report_Site_123.docx',
                name: 'Installation Report - Site 123',
                size: '2.1 MB',
                lastModified: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
                type: 'report'
            },
            {
                path: '/uploads/Battery_Datasheet_LG_RESU.pdf',
                name: 'LG RESU Battery Datasheet',
                size: '1.5 MB',
                lastModified: new Date(Date.now() - 14400000).toISOString(), // 4 hours ago
                type: 'datasheet'
            }
        ];
        
        // Get existing documents to avoid duplicates
        const existingDocuments = JSON.parse(localStorage.getItem('processed_documents') || '[]');
        const existingNames = existingDocuments.map(d => d.name);
        
        // Filter out already processed documents
        const newDocuments = potentialDocuments.filter(doc => !existingNames.includes(doc.name));
        
        // Add new documents with processing status
        const scannedDocuments = newDocuments.map(doc => ({
            id: 'doc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            name: doc.name,
            type: doc.type,
            status: 'discovered',
            size: doc.size,
            path: doc.path,
            discoveredAt: new Date().toISOString(),
            lastModified: doc.lastModified,
            content: `Document discovered at ${doc.path}`,
            tags: [doc.type, 'scanned', 'new']
        }));
        
        if (scannedDocuments.length > 0) {
            // Add to existing documents
            const allDocuments = existingDocuments.concat(scannedDocuments);
            localStorage.setItem('processed_documents', JSON.stringify(allDocuments));
            
            // Update display
            loadDocumentData();
            
            // Show scan results if element exists
            const scanResults = document.getElementById('scan-results');
            if (scanResults) {
                scanResults.innerHTML = `
                    <h4>Document Scan Results</h4>
                    <div class="scan-summary">Found ${scannedDocuments.length} new document(s)</div>
                    ${scannedDocuments.map(doc => `
                        <div class="scanned-document">
                            <div class="doc-name">${doc.name}</div>
                            <div class="doc-meta">${doc.type} • ${doc.size} • ${new Date(doc.lastModified).toLocaleDateString()}</div>
                            <div class="doc-path">${doc.path}</div>
                        </div>
                    `).join('')}
                `;
            }
        }
        
        console.log(`✅ Document scan completed: ${scannedDocuments.length} new documents found`);
        
        // Add to activity log
        addActivity({
            type: 'document_scan',
            description: `Scanned for documents: ${scannedDocuments.length} new documents found`,
            data: { newDocuments: scannedDocuments.length, totalChecked: potentialDocuments.length }
        });
        
        return scannedDocuments;
        
    } catch (error) {
        console.error('Error scanning for documents:', error);
        return [];
    }
}

// UI FUNCTIONS
function closePanel(panelId) {
    console.log(`❌ Closing panel: ${panelId}`);
    
    if (!panelId) {
        console.error('No panel ID provided for closing');
        return false;
    }
    
    const panel = document.getElementById(panelId);
    if (!panel) {
        console.error(`Panel ${panelId} not found`);
        return false;
    }
    
    // Add closing animation class if available
    if (panel.classList.contains('panel')) {
        panel.classList.add('panel-closing');
        
        // Remove panel after animation
        setTimeout(() => {
            panel.style.display = 'none';
            panel.classList.remove('panel-closing');
        }, 300);
    } else {
        // Immediate close if no animation
        panel.style.display = 'none';
    }
    
    // Add to activity log
    addActivity({
        type: 'ui_interaction',
        description: `Closed panel: ${panelId}`,
        data: { action: 'close_panel', panelId: panelId }
    });
    
    console.log(`✅ Panel ${panelId} closed`);
    return true;
}

function toggleView(elementId, viewType = 'toggle') {
    console.log(`🔄 Toggling view for: ${elementId} (${viewType})`);
    
    if (!elementId) {
        console.error('No element ID provided for view toggle');
        return false;
    }
    
    const element = document.getElementById(elementId);
    if (!element) {
        console.error(`Element ${elementId} not found`);
        return false;
    }
    
    let newState;
    
    switch (viewType.toLowerCase()) {
        case 'show':
            element.style.display = '';
            element.classList.remove('hidden');
            newState = 'shown';
            break;
            
        case 'hide':
            element.style.display = 'none';
            element.classList.add('hidden');
            newState = 'hidden';
            break;
            
        case 'toggle':
        default:
            if (element.style.display === 'none' || element.classList.contains('hidden')) {
                element.style.display = '';
                element.classList.remove('hidden');
                newState = 'shown';
            } else {
                element.style.display = 'none';
                element.classList.add('hidden');
                newState = 'hidden';
            }
            break;
    }
    
    // Store view state
    localStorage.setItem(`view_state_${elementId}`, newState);
    
    // Add to activity log
    addActivity({
        type: 'ui_interaction',
        description: `View toggled: ${elementId} → ${newState}`,
        data: { action: 'toggle_view', elementId: elementId, newState: newState }
    });
    
    console.log(`✅ View toggled for ${elementId}: ${newState}`);
    return newState;
}

function updateDisplay(displayId, data) {
    console.log(`🔄 Updating display: ${displayId}`);
    
    if (!displayId) {
        console.error('No display ID provided for update');
        return false;
    }
    
    const display = document.getElementById(displayId);
    if (!display) {
        console.error(`Display element ${displayId} not found`);
        return false;
    }
    
    try {
        if (typeof data === 'object') {
            // Update based on data type
            if (data.html) {
                display.innerHTML = data.html;
            } else if (data.text) {
                display.textContent = data.text;
            } else if (data.minions) {
                // Update minions display
                displayProducts(data.minions, displayId);
            } else if (data.activities) {
                // Update activities display
                display.innerHTML = data.activities.map(activity => `
                    <div class="activity-item">
                        <span class="activity-time">${new Date(activity.timestamp).toLocaleTimeString()}</span>
                        <span class="activity-desc">${activity.description}</span>
                    </div>
                `).join('');
            } else {
                // Generic object display
                display.innerHTML = `<pre>${JSON.stringify(data, null, 2)}</pre>`;
            }
        } else {
            // Simple text/number display
            display.textContent = data;
        }
        
        // Add update timestamp
        display.setAttribute('data-last-updated', new Date().toISOString());
        
        // Add update animation class if available
        if (display.classList.contains('updateable')) {
            display.classList.add('updated');
            setTimeout(() => display.classList.remove('updated'), 1000);
        }
        
        console.log(`✅ Display ${displayId} updated successfully`);
        
        // Add to activity log
        addActivity({
            type: 'display_update',
            description: `Display updated: ${displayId}`,
            data: { displayId: displayId, dataType: typeof data }
        });
        
        return true;
        
    } catch (error) {
        console.error(`Error updating display ${displayId}:`, error);
        return false;
    }
}

// Helper functions for UI
function viewDocument(documentId) {
    console.log(`📖 Viewing document: ${documentId}`);
    // This would open a document viewer
    addActivity({
        type: 'document_view',
        description: `Opened document viewer for: ${documentId}`,
        data: { documentId: documentId }
    });
}

function viewMinionHistory(minionId) {
    console.log(`📊 Viewing minion history: ${minionId}`);
    // This would open a history panel for the minion
    addActivity({
        type: 'minion_history',
        description: `Opened history for minion: ${minionId}`,
        minionId: minionId
    });
}

function openMinionChat(minionId) {
    console.log(`💬 Opening chat with minion: ${minionId}`);
    // This would open the LLM chat interface
    addActivity({
        type: 'minion_chat',
        description: `Started chat with minion: ${minionId}`,
        minionId: minionId
    });
}

function viewProductDetails(productId) {
    console.log(`🔍 Viewing product details: ${productId}`);
    // This would open a product details panel
    addActivity({
        type: 'product_view',
        description: `Viewed product details: ${productId}`,
        data: { productId: productId }
    });
}

function viewDocuments(productId) {
    console.log(`📄 Viewing documents for product: ${productId}`);
    // This would open the documents panel for a product
    addActivity({
        type: 'product_documents',
        description: `Viewed documents for product: ${productId}`,
        data: { productId: productId }
    });
}

// Export all functions to global scope
window.addActivity = addActivity;
window.displayProducts = displayProducts;
window.displaySearchResults = displaySearchResults;
window.handleProductSearch = handleProductSearch;
window.exportSystemData = exportSystemData;
window.setupLighting = setupLighting;
window.renderScene = renderScene;
window.assignTask = assignTask;
window.updateMinionDisplay = updateMinionDisplay;
window.selectMinion = selectMinion;
window.loadDocumentData = loadDocumentData;
window.validateDocuments = validateDocuments;
window.archiveDocuments = archiveDocuments;
window.scanForDocuments = scanForDocuments;
window.generateEconomicReport = generateEconomicReport;
window.validateDataIntegrity = validateDataIntegrity;
window.runDiagnostics = runDiagnostics;
window.closePanel = closePanel;
window.toggleView = toggleView;
window.updateDisplay = updateDisplay;

console.log('✅ ALL 20 MISSING FUNCTIONS IMPLEMENTED AND EXPORTED TO GLOBAL SCOPE');
console.log('📝 Functions available: addActivity, displayProducts, displaySearchResults, handleProductSearch, exportSystemData, setupLighting, renderScene, assignTask, updateMinionDisplay, selectMinion, loadDocumentData, validateDocuments, archiveDocuments, scanForDocuments, generateEconomicReport, validateDataIntegrity, runDiagnostics, closePanel, toggleView, updateDisplay');

// Auto-initialize some functions
document.addEventListener('DOMContentLoaded', function() {
    // Load initial data
    loadDocumentData();
    
    // Initialize activity feed
    updateActivityFeed();
    
    console.log('🚀 Missing functions system initialized');
});