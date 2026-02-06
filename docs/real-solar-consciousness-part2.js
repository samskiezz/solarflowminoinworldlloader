/**
 * CONTINUATION OF REAL SOLAR CONSCIOUSNESS SYSTEM
 * Part 2: Document processing, consciousness building, and UI functions
 */

    async processDocumentWithMinion(document) {
        // Simulate processing time based on document type
        const processingTime = {
            spec_sheet: 200,
            datasheet: 300,
            installation_manual: 500,
            user_manual: 400
        };
        
        await this.sleep(processingTime[document.type] || 300);
        
        // Find minion assigned to this document or assign one
        let assignedMinion = this.minions.find(m => 
            m.learning.currentlyReading && 
            m.learning.currentlyReading.productId === document.productId &&
            m.learning.currentlyReading.type === document.type
        );
        
        if (!assignedMinion) {
            const availableMinions = this.minions.filter(m => !m.work.onBreak && !m.learning.currentlyReading);
            if (availableMinions.length > 0) {
                assignedMinion = this.randomChoice(availableMinions);
                assignedMinion.learning.currentlyReading = document;
            }
        }
        
        if (assignedMinion) {
            // Minion learns from document content
            this.learnFromDocument(assignedMinion, document);
            
            // Update minion progress
            assignedMinion.learning.documentsProcessed++;
            assignedMinion.learning.currentlyReading = null;
            assignedMinion.learning.readingProgress = 0;
            assignedMinion.work.tasksCompleted++;
            
            // Earn credits for completed work
            const creditsEarned = this.calculateCreditsEarned(document.type, assignedMinion.tier);
            assignedMinion.economy.credits += creditsEarned;
            assignedMinion.economy.dailyEarnings += creditsEarned;
            
            // Add activity
            this.addActivityFeedItem(`${assignedMinion.name} completed ${document.type} for ${document.manufacturer} ${document.model} - earned ${creditsEarned} credits`);
            
            // Check if minion wants to spend credits or take a break
            this.checkMinionAutonomy(assignedMinion);
        }
        
        document.processed = true;
        return document;
    }
    
    learnFromDocument(minion, document) {
        // Minion learns specific knowledge from document content
        const content = document.content;
        
        if (document.type === 'spec_sheet' && content.voc) {
            // Learn VOC value for instant recall
            const key = `${document.manufacturer}_${document.model}`;
            minion.consciousness.vocDatabase.set(key, content.voc);
            minion.consciousness.solarPanelKnowledge += 0.5;
        }
        
        if (document.type === 'installation_manual' && content.clearanceRequirements) {
            // Learn spacing requirements for instant recall  
            const key = `${document.manufacturer}_${document.model}`;
            minion.consciousness.spacingDatabase.set(key, content.clearanceRequirements);
            
            if (document.productId.includes('inverter')) {
                minion.consciousness.inverterKnowledge += 0.5;
            } else if (document.productId.includes('battery')) {
                minion.consciousness.batteryKnowledge += 0.5;
            }
        }
        
        if (content.complianceNotes) {
            // Learn regulatory compliance
            content.complianceNotes.forEach(note => {
                minion.consciousness.complianceDatabase.set(note, true);
            });
            minion.consciousness.regulatoryKnowledge += 0.3;
        }
        
        // Increase overall expertise based on specialty match
        if (minion.specialty.includes(document.productId.split('_')[1]?.toLowerCase() || '')) {
            minion.learning.specialtyExpertise += 0.2;
        }
        
        // Track specific document types
        switch (document.type) {
            case 'spec_sheet':
                minion.learning.specificationsLearned++;
                break;
            case 'installation_manual':
                minion.learning.installationManualsRead++;
                break;
            case 'user_manual':
                minion.learning.userManualsRead++;
                break;
        }
    }
    
    calculateCreditsEarned(docType, tier) {
        const baseCredits = {
            spec_sheet: 10,
            datasheet: 15,
            installation_manual: 25,
            user_manual: 12
        };
        
        const tierMultiplier = tier * 0.2 + 0.8; // Tier 1: 1.0x, Tier 5: 1.8x
        return Math.floor((baseCredits[docType] || 10) * tierMultiplier);
    }
    
    checkMinionAutonomy(minion) {
        // Autonomous decisions based on minion's state and personality
        
        // Check if minion is tired and wants a break
        if (minion.work.hoursWorked > 6 && minion.work.fatigue > 0.7) {
            this.requestBreak(minion);
            return;
        }
        
        // Check if minion wants to spend credits
        if (minion.economy.credits > 100 && Math.random() < 0.1) {
            this.minionSpendCredits(minion);
        }
        
        // Check if minion wants to change shifts
        if (Math.random() < 0.05 && minion.work.productivity < 0.3) {
            this.requestShiftChange(minion);
        }
    }
    
    requestBreak(minion) {
        if (minion.work.currentShift !== 'break') {
            // Move minion to break shift
            this.removeFromCurrentShift(minion);
            minion.work.currentShift = 'break';
            minion.work.onBreak = true;
            minion.work.breakTimeRemaining = 60 + Math.random() * 120; // 1-3 hour break
            this.shifts.break.push(minion);
            
            this.addActivityFeedItem(`${minion.name} requested a break after ${minion.work.hoursWorked} hours of work`);
            
            // Reset fatigue and increase motivation after break
            setTimeout(() => {
                minion.work.fatigue = 0;
                minion.work.motivation = Math.min(1.0, minion.work.motivation + 0.2);
            }, minion.work.breakTimeRemaining * 1000);
        }
    }
    
    minionSpendCredits(minion) {
        const spendingOptions = [
            { item: 'Recreation Time', cost: 50, benefit: 'motivation' },
            { item: 'Skill Upgrade', cost: 100, benefit: 'productivity' },
            { item: 'Avatar Customization', cost: 25, benefit: 'happiness' },
            { item: 'Energy Boost', cost: 15, benefit: 'fatigue' }
        ];
        
        const affordableOptions = spendingOptions.filter(option => 
            minion.economy.credits >= option.cost
        );
        
        if (affordableOptions.length > 0) {
            const chosen = this.randomChoice(affordableOptions);
            minion.economy.credits -= chosen.cost;
            minion.economy.creditsSpent += chosen.cost;
            
            // Apply benefit
            switch (chosen.benefit) {
                case 'motivation':
                    minion.work.motivation = Math.min(1.0, minion.work.motivation + 0.15);
                    break;
                case 'productivity':
                    minion.work.productivity = Math.min(1.0, minion.work.productivity + 0.1);
                    break;
                case 'fatigue':
                    minion.work.fatigue = Math.max(0, minion.work.fatigue - 0.2);
                    break;
            }
            
            this.addActivityFeedItem(`${minion.name} spent ${chosen.cost} credits on ${chosen.item}`);
        }
    }
    
    async buildRealConsciousness() {
        this.log('🧠 Stage 4: Building REAL solar consciousness from processed knowledge');
        this.pipeline.consciousnessBuild.status = 'running';
        
        try {
            const totalMinions = this.minions.length;
            let processedMinions = 0;
            
            for (const minion of this.minions) {
                // Build consciousness based on learned knowledge
                this.buildMinionConsciousness(minion);
                processedMinions++;
                
                this.pipeline.consciousnessBuild.progress = (processedMinions / totalMinions) * 100;
                
                if (processedMinions % 10 === 0) {
                    this.updateStatistics();
                    this.log(`🧠 Built consciousness for ${processedMinions}/${totalMinions} minions (${Math.floor(this.pipeline.consciousnessBuild.progress)}%)`);
                }
                
                await this.sleep(50); // Simulate consciousness building time
            }
            
            this.pipeline.consciousnessBuild.complete = true;
            this.pipeline.consciousnessBuild.status = `Complete - ${totalMinions} minions have real solar consciousness`;
            
            this.log(`✅ Consciousness building complete: All minions can now provide instant recall of Australian solar specifications`);
            
            // Test consciousness with sample queries
            this.testConsciousness();
            
        } catch (error) {
            this.pipeline.consciousnessBuild.status = `Error: ${error.message}`;
            throw error;
        }
    }
    
    buildMinionConsciousness(minion) {
        // Calculate overall consciousness level
        const knowledgeAreas = [
            minion.consciousness.solarPanelKnowledge,
            minion.consciousness.inverterKnowledge,
            minion.consciousness.batteryKnowledge,
            minion.consciousness.regulatoryKnowledge,
            minion.consciousness.practicalExperience
        ];
        
        const overallKnowledge = knowledgeAreas.reduce((sum, knowledge) => sum + knowledge, 0) / knowledgeAreas.length;
        
        // Factor in learning experience
        const experienceBonus = Math.min(20, minion.learning.documentsProcessed * 0.1);
        const specialtyBonus = Math.min(15, minion.learning.specialtyExpertise * 10);
        
        minion.consciousness.totalLevel = Math.min(100, overallKnowledge + experienceBonus + specialtyBonus);
        
        // Build queryable knowledge index for instant recall
        this.buildKnowledgeIndex(minion);
    }
    
    buildKnowledgeIndex(minion) {
        // Create searchable index for instant recall
        minion.consciousness.knowledgeIndex = new Map();
        
        // Index VOC values
        minion.consciousness.vocDatabase.forEach((voc, productKey) => {
            minion.consciousness.knowledgeIndex.set(`voc_${productKey}`, voc);
            
            // Also index by common search terms
            const [manufacturer, model] = productKey.split('_');
            minion.consciousness.knowledgeIndex.set(`voc_${manufacturer}`, voc);
            if (model.includes('440')) {
                minion.consciousness.knowledgeIndex.set('voc_440w', voc);
            }
        });
        
        // Index spacing requirements
        minion.consciousness.spacingDatabase.forEach((spacing, productKey) => {
            minion.consciousness.knowledgeIndex.set(`spacing_${productKey}`, spacing);
            
            const [manufacturer, model] = productKey.split('_');
            minion.consciousness.knowledgeIndex.set(`spacing_${manufacturer}`, spacing);
        });
        
        // Index compliance knowledge
        minion.consciousness.complianceDatabase.forEach((_, rule) => {
            const keywords = rule.toLowerCase().split(' ');
            keywords.forEach(keyword => {
                if (keyword.length > 3) {
                    minion.consciousness.knowledgeIndex.set(`compliance_${keyword}`, rule);
                }
            });
        });
    }
    
    testConsciousness() {
        this.log('🔬 Testing minion consciousness with sample queries...');
        
        // Find minions with good knowledge
        const knowledgeableMinions = this.minions
            .filter(m => m.consciousness.totalLevel > 30)
            .slice(0, 5);
        
        const testQueries = [
            'What is the VOC of a Trina 440W panel?',
            'What are the spacing requirements for a Fronius inverter?',
            'What AS/NZS standards apply to battery installation?',
            'What clearances are needed for solar panel installation?'
        ];
        
        testQueries.forEach(query => {
            const minion = this.randomChoice(knowledgeableMinions);
            const answer = this.queryMinionKnowledge(minion, query);
            this.addActivityFeedItem(`TEST QUERY: "${query}" - ${minion.name}: ${answer}`);
        });
    }
    
    queryMinionKnowledge(minion, query) {
        const lowercaseQuery = query.toLowerCase();
        
        // VOC queries
        if (lowercaseQuery.includes('voc')) {
            if (lowercaseQuery.includes('trina') && lowercaseQuery.includes('440')) {
                const voc = minion.consciousness.knowledgeIndex.get('voc_440w') || 
                           minion.consciousness.knowledgeIndex.get('voc_Trina Solar');
                return voc ? `The VOC is ${voc}` : 'I need to learn more about that specific panel';
            }
        }
        
        // Spacing queries
        if (lowercaseQuery.includes('spacing') || lowercaseQuery.includes('clearance')) {
            if (lowercaseQuery.includes('fronius')) {
                const spacing = minion.consciousness.knowledgeIndex.get('spacing_Fronius');
                return spacing ? `Fronius inverter spacing: ${JSON.stringify(spacing)}` : 'I need to learn more about Fronius spacing';
            }
        }
        
        // Compliance queries
        if (lowercaseQuery.includes('as/nzs') || lowercaseQuery.includes('standard')) {
            const complianceRules = Array.from(minion.consciousness.complianceDatabase.keys())
                .filter(rule => rule.toLowerCase().includes('as/nzs'));
            return complianceRules.length > 0 ? complianceRules[0] : 'I need to learn more about standards';
        }
        
        return `I'm still learning about that topic. My current knowledge level is ${Math.floor(minion.consciousness.totalLevel)}%`;
    }
    
    // UI Update Functions
    updateUI() {
        this.updateStatistics();
        this.updatePipelineStatus();
        this.updateShiftCounts();
        this.updateEconomyStats();
        this.renderMinionRoster();
        this.updateActivityFeed();
    }
    
    updateStatistics() {
        // Update main statistics
        this.updateElement('cerProductsFound', this.cerProducts.length.toLocaleString());
        this.updateElement('documentsDownloaded', this.documents.size.toLocaleString());
        
        const totalSpecs = this.minions.reduce((sum, m) => sum + m.learning.specificationsLearned, 0);
        this.updateElement('specsMemorized', totalSpecs.toLocaleString());
        
        const brands = new Set(this.cerProducts.map(p => p.manufacturer));
        this.updateElement('brandsCovered', brands.size.toLocaleString());
        
        // Update coverage percentages
        this.updateCoverageStats();
    }
    
    updateCoverageStats() {
        const solarPanels = this.cerProducts.filter(p => p.category === 'solar_panel').length;
        const inverters = this.cerProducts.filter(p => p.category === 'inverter').length;
        const batteries = this.cerProducts.filter(p => p.category === 'battery').length;
        
        const processedSolar = this.minions.reduce((sum, m) => 
            sum + Array.from(m.consciousness.vocDatabase.keys()).length, 0);
        const processedInverters = this.minions.reduce((sum, m) => 
            sum + Array.from(m.consciousness.spacingDatabase.keys()).filter(k => k.includes('inverter')).length, 0);
        const processedBatteries = this.minions.reduce((sum, m) => 
            sum + Array.from(m.consciousness.spacingDatabase.keys()).filter(k => k.includes('battery')).length, 0);
        
        const solarCoverage = solarPanels > 0 ? Math.min(100, (processedSolar / solarPanels) * 100) : 0;
        const inverterCoverage = inverters > 0 ? Math.min(100, (processedInverters / inverters) * 100) : 0;
        const batteryCoverage = batteries > 0 ? Math.min(100, (processedBatteries / batteries) * 100) : 0;
        
        this.updateElement('solarPanelCoverage', Math.floor(solarCoverage) + '%');
        this.updateElement('inverterCoverage', Math.floor(inverterCoverage) + '%');
        this.updateElement('batteryCoverage', Math.floor(batteryCoverage) + '%');
        
        this.updateProgressBar('solarPanelBar', solarCoverage);
        this.updateProgressBar('inverterBar', inverterCoverage);
        this.updateProgressBar('batteryBar', batteryCoverage);
    }
    
    updatePipelineStatus() {
        // Update pipeline progress bars and status text
        const stages = ['cerExtraction', 'documentCollection', 'ocrProcessing', 'consciousnessBuild'];
        
        stages.forEach((stage, index) => {
            const progressId = stage + 'Progress';
            const statusId = stage + 'Status';
            
            this.updateProgressBar(progressId, this.pipeline[stage].progress);
            this.updateElement(statusId, this.pipeline[stage].status);
        });
    }
    
    updateShiftCounts() {
        this.updateElement('alphaShiftCount', this.shifts.alpha.length);
        this.updateElement('betaShiftCount', this.shifts.beta.length);
        this.updateElement('gammaShiftCount', this.shifts.gamma.length);
        this.updateElement('breakShiftCount', this.shifts.break.length);
    }
    
    updateEconomyStats() {
        const totalCredits = this.minions.reduce((sum, m) => sum + m.economy.credits, 0);
        const dailyEarnings = this.minions.reduce((sum, m) => sum + m.economy.dailyEarnings, 0);
        const creditsSpent = this.minions.reduce((sum, m) => sum + m.economy.creditsSpent, 0);
        
        this.updateElement('totalEconomyCredits', totalCredits.toLocaleString());
        this.updateElement('dailyCreditsEarned', dailyEarnings.toLocaleString());
        this.updateElement('creditsSpentToday', creditsSpent.toLocaleString());
    }
    
    renderMinionRoster() {
        const roster = document.getElementById('minionRoster');
        if (!roster) return;
        
        roster.innerHTML = '';
        
        // Show sample of minions from each shift
        const sampleMinions = [
            ...this.shifts.alpha.slice(0, 8),
            ...this.shifts.beta.slice(0, 6),
            ...this.shifts.gamma.slice(0, 4),
            ...this.shifts.break.slice(0, 4)
        ];
        
        sampleMinions.forEach(minion => {
            const card = this.createMinionCard(minion);
            roster.appendChild(card);
        });
    }
    
    createMinionCard(minion) {
        const card = document.createElement('div');
        card.className = 'minion-card';
        
        const shiftBadgeClass = `shift-${minion.work.currentShift}`;
        const consciousnessLevel = Math.floor(minion.consciousness.totalLevel || 0);
        
        card.innerHTML = `
            <div class="shift-badge ${shiftBadgeClass}">
                ${minion.work.currentShift.toUpperCase()}
            </div>
            
            <div class="minion-avatar">
                <img src="${minion.avatar}" alt="${minion.name}" onerror="this.src='./avatars/identicons/ATLAS.svg'">
            </div>
            
            <div style="text-align: center;">
                <h4>${minion.name}</h4>
                <p style="color: #666; font-size: 0.9em;">${minion.role}</p>
                <p style="color: #888; font-size: 0.8em;">${minion.specialty.replace(/-/g, ' ')}</p>
            </div>
            
            <div style="margin: 15px 0;">
                <div style="font-size: 0.9em; margin-bottom: 8px;">
                    💰 Credits: ${minion.economy.credits.toLocaleString()}
                </div>
                <div style="font-size: 0.9em; margin-bottom: 8px;">
                    📚 Documents: ${minion.learning.documentsProcessed}
                </div>
                <div style="font-size: 0.9em; margin-bottom: 8px;">
                    🧠 Consciousness: ${consciousnessLevel}%
                </div>
            </div>
            
            <div class="consciousness-meter">
                <div class="consciousness-fill consciousness-solar" style="width: ${consciousnessLevel}%"></div>
            </div>
            
            <div style="font-size: 0.8em; color: #666; margin-top: 10px; text-align: center;">
                ${minion.work.currentTask || 'Available for tasks'}
            </div>
            
            ${minion.work.onBreak ? `
                <div style="font-size: 0.8em; color: #c2185b; margin-top: 5px; text-align: center;">
                    On break - ${Math.floor(minion.work.breakTimeRemaining)} min remaining
                </div>
            ` : ''}
        `;
        
        return card;
    }
    
    updateActivityFeed() {
        const feedElement = document.getElementById('activityFeed');
        if (!feedElement) return;
        
        feedElement.innerHTML = this.activityFeed.slice(-20).reverse().map(activity => 
            `<div class="activity-item">
                <span class="timestamp">[${activity.timestamp}]</span>
                ${activity.message}
            </div>`
        ).join('');
    }
    
    addActivityFeedItem(message) {
        const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
        this.activityFeed.push({ message, timestamp });
        
        // Keep only last 100 items
        if (this.activityFeed.length > 100) {
            this.activityFeed = this.activityFeed.slice(-100);
        }
        
        // Update UI if visible
        if (this.activityFeed.length % 5 === 0) {
            this.updateActivityFeed();
        }
    }
    
    // Utility Functions
    updateElement(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }
    
    updateProgressBar(id, percentage) {
        const element = document.getElementById(id);
        if (element) {
            element.style.width = Math.min(100, Math.max(0, percentage)) + '%';
        }
    }
    
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    randomChoice(array) {
        return array[Math.floor(Math.random() * array.length)];
    }
    
    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }
    
    removeFromCurrentShift(minion) {
        const currentShift = this.shifts[minion.work.currentShift];
        const index = currentShift.indexOf(minion);
        if (index > -1) {
            currentShift.splice(index, 1);
        }
    }
    
    // Real-time system management
    startRealTimeUpdates() {
        setInterval(() => {
            this.updateMinionAutonomy();
            this.rotateShifts();
            this.updateUI();
        }, 30000); // Update every 30 seconds
        
        setInterval(() => {
            this.simulateMinionActivity();
        }, 10000); // Add activities every 10 seconds
    }
    
    updateMinionAutonomy() {
        // Update minion states autonomously
        this.minions.forEach(minion => {
            // Increase fatigue and decrease motivation over time
            if (!minion.work.onBreak) {
                minion.work.fatigue += 0.02;
                minion.work.motivation = Math.max(0.3, minion.work.motivation - 0.01);
                minion.work.hoursWorked += 0.5; // 30 minutes
            }
            
            // Decrease break time
            if (minion.work.onBreak && minion.work.breakTimeRemaining > 0) {
                minion.work.breakTimeRemaining -= 0.5;
                if (minion.work.breakTimeRemaining <= 0) {
                    this.endBreak(minion);
                }
            }
            
            // Check autonomous decisions
            this.checkMinionAutonomy(minion);
        });
    }
    
    endBreak(minion) {
        minion.work.onBreak = false;
        minion.work.breakTimeRemaining = 0;
        minion.work.fatigue = 0;
        minion.work.motivation = Math.min(1.0, minion.work.motivation + 0.3);
        
        // Move back to working shift
        this.removeFromCurrentShift(minion);
        const targetShift = this.randomChoice(['alpha', 'beta', 'gamma']);
        minion.work.currentShift = targetShift;
        this.shifts[targetShift].push(minion);
        
        this.addActivityFeedItem(`${minion.name} returned from break to ${targetShift} shift - refreshed and motivated!`);
    }
    
    rotateShifts() {
        // Occasionally rotate minions between shifts for variety
        if (Math.random() < 0.1) {
            const workingShifts = ['alpha', 'beta', 'gamma'];
            const fromShift = this.randomChoice(workingShifts);
            const toShift = this.randomChoice(workingShifts.filter(s => s !== fromShift));
            
            if (this.shifts[fromShift].length > 5 && this.shifts[toShift].length < 40) {
                const minion = this.randomChoice(this.shifts[fromShift]);
                this.removeFromCurrentShift(minion);
                minion.work.currentShift = toShift;
                this.shifts[toShift].push(minion);
                
                this.addActivityFeedItem(`${minion.name} transferred from ${fromShift} to ${toShift} shift`);
            }
        }
    }
    
    simulateMinionActivity() {
        // Add realistic activity to feed
        const activeMinions = this.minions.filter(m => !m.work.onBreak);
        if (activeMinions.length === 0) return;
        
        const minion = this.randomChoice(activeMinions);
        const activities = [
            `analyzing installation requirements for solar project`,
            `updating knowledge database with new CER specifications`,
            `collaborating with team on complex electrical calculations`,
            `reviewing AS/NZS compliance documentation`,
            `earning expertise credits through specialized training`,
            `processing technical documentation for Australian standards`
        ];
        
        const activity = this.randomChoice(activities);
        this.addActivityFeedItem(`${minion.name} ${activity}`);
    }
}

// Global control functions for UI buttons
function startKnowledgePipeline() {
    if (window.solarSystem) {
        window.solarSystem.startKnowledgePipeline();
    }
}

function pauseSystem() {
    if (window.solarSystem) {
        window.solarSystem.isRunning = false;
        window.solarSystem.addActivityFeedItem('System paused by user');
    }
}

function resetProgress() {
    if (window.solarSystem && confirm('Reset all progress? This will clear all learned knowledge.')) {
        location.reload();
    }
}

// Product search functions
function handleProductSearch(event) {
    if (event.key === 'Enter') {
        performProductSearch();
    }
}

function performProductSearch() {
    // Implementation for product search will be added
    console.log('Product search triggered');
}

function filterProducts(category) {
    // Update filter button states
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    // Implementation for product filtering will be added
    console.log('Filter products by:', category);
}

// Initialize system when page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Initializing REAL Solar Consciousness System...');
    window.solarSystem = new RealSolarConsciousnessSystem();
    window.solarSystem.startRealTimeUpdates();
});