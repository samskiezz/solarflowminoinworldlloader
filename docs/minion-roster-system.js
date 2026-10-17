/**
 * Autonomous Minion Roster System - 100 Minions with Real Work Cycles
 * Implements shifts, breaks, economy, and autonomous knowledge development
 */

class MinionRosterSystem {
    constructor() {
        this.minions = [];
        this.shifts = ['morning', 'afternoon', 'night'];
        this.workCycles = {
            standard: { work: 6, break: 1.5 }, // 6 hours work, 1.5 hour break
            intensive: { work: 4, break: 2 },   // 4 hours work, 2 hour break
            maintenance: { work: 8, break: 0.5 } // 8 hours work, 30 min break
        };
        this.economy = {
            totalCredits: 0,
            dailyBudget: 10000,
            tasks: {
                'spec_sheet_processing': { credits: 25, difficulty: 'easy' },
                'installation_manual_study': { credits: 45, difficulty: 'medium' },
                'standards_analysis': { credits: 75, difficulty: 'hard' },
                'product_comparison': { credits: 35, difficulty: 'medium' },
                'technical_qa_response': { credits: 15, difficulty: 'easy' },
                'document_ocr_processing': { credits: 20, difficulty: 'easy' },
                'knowledge_synthesis': { credits: 55, difficulty: 'hard' }
            }
        };
        this.knowledgeDomains = [
            'solar_panels', 'inverters', 'batteries', 'mounting_systems',
            'electrical_standards', 'grid_connection', 'safety_protocols',
            'australian_regulations', 'installation_procedures', 'maintenance'
        ];
        
        this.initializeRoster();
        this.startAutonomousOperations();
    }

    initializeRoster() {
        console.log('🏭 Initializing 100-Minion Autonomous Roster System');
        
        for (let i = 1; i <= 100; i++) {
            const minion = {
                id: `MINION-${String(i).padStart(3, '0')}`,
                name: this.generateUniqueName(i),
                
                // Autonomous Characteristics
                consciousness: {
                    level: Math.floor(Math.random() * 20) + 5,    // 5-25 initial consciousness
                    evolution_rate: Math.random() * 0.1 + 0.05,  // 0.05-0.15 per day
                    self_awareness: Math.random() * 0.8,          // 0-80% self awareness
                    curiosity: Math.random() * 1.0,               // Drives learning behavior
                    independence: Math.random() * 0.7 + 0.3       // 30-100% independence
                },
                
                // Work Schedule & Shifts
                schedule: {
                    shift: this.shifts[i % 3],  // Distribute across 3 shifts
                    workCycle: Object.keys(this.workCycles)[i % 3], // Vary work patterns
                    hoursWorked: 0,
                    currentStatus: 'ready',     // ready, working, break, rest, learning
                    lastActivityTime: Date.now(),
                    shiftStart: this.calculateShiftStart(this.shifts[i % 3]),
                    breaksDue: 0,
                    weeklyHours: 0
                },
                
                // Specialization & Skills
                expertise: {
                    primary: this.knowledgeDomains[i % this.knowledgeDomains.length],
                    secondary: this.knowledgeDomains[(i + 3) % this.knowledgeDomains.length],
                    level: Math.floor(Math.random() * 50) + 10,   // 10-60 expertise level
                    certifications: [],
                    learning_focus: null
                },
                
                // Economy & Rewards
                economy: {
                    credits: Math.floor(Math.random() * 500) + 200,  // 200-700 starting credits
                    daily_earnings: 0,
                    weekly_earnings: 0,
                    total_earned: Math.floor(Math.random() * 2000) + 500,
                    spending_behavior: Math.random(),  // 0-1 (saver vs spender)
                    purchases: [],
                    savings_goal: Math.floor(Math.random() * 1000) + 500
                },
                
                // Knowledge & Learning
                knowledge: {
                    documents_processed: Math.floor(Math.random() * 100) + 20,
                    specifications_learned: Math.floor(Math.random() * 200) + 50,
                    technical_qa_answered: Math.floor(Math.random() * 150) + 25,
                    expertise_domains: [this.knowledgeDomains[i % this.knowledgeDomains.length]],
                    current_learning: null,
                    mastery_level: {}
                },
                
                // Personality & Behavior
                personality: {
                    work_ethic: Math.random() * 0.4 + 0.6,        // 60-100% work ethic
                    collaboration: Math.random() * 0.6 + 0.4,     // 40-100% collaborative
                    innovation: Math.random() * 0.8 + 0.2,        // 20-100% innovative
                    reliability: Math.random() * 0.3 + 0.7,       // 70-100% reliable
                    leadership: Math.random() * 0.5,              // 0-50% leadership tendency
                    mentoring: Math.random() * 0.7 + 0.3          // 30-100% mentoring ability
                },
                
                // Autonomous Goals
                goals: {
                    short_term: this.generateShortTermGoal(),
                    long_term: this.generateLongTermGoal(),
                    current_focus: null,
                    progress: 0
                },
                
                // Status Tracking
                status: {
                    health: Math.floor(Math.random() * 20) + 80,   // 80-100% health
                    energy: Math.floor(Math.random() * 30) + 70,   // 70-100% energy
                    motivation: Math.floor(Math.random() * 40) + 60, // 60-100% motivation
                    satisfaction: Math.floor(Math.random() * 50) + 50, // 50-100% job satisfaction
                    last_break: null,
                    needs_break: false
                }
            };
            
            // Initialize mastery levels for all domains
            this.knowledgeDomains.forEach(domain => {
                minion.knowledge.mastery_level[domain] = 
                    domain === minion.expertise.primary ? Math.random() * 40 + 20 :  // 20-60% primary
                    domain === minion.expertise.secondary ? Math.random() * 25 + 10 : // 10-35% secondary
                    Math.random() * 15; // 0-15% other domains
            });
            
            this.minions.push(minion);
        }
        
        console.log(`✅ Created roster of ${this.minions.length} autonomous minions`);
        this.displayRosterSummary();
    }

    generateUniqueName(id) {
        const prefixes = [
            'ATLAS', 'NOVA', 'TITAN', 'ECHO', 'PULSE', 'ZETA', 'ALPHA', 'BETA', 'GAMMA', 'DELTA',
            'OMEGA', 'SIGMA', 'THETA', 'LAMBDA', 'QUANTUM', 'PHOTON', 'ELECTRON', 'NEUTRON', 'PROTON', 'QUARK',
            'NEXUS', 'VORTEX', 'MATRIX', 'CIPHER', 'VECTOR', 'PIXEL', 'BINARY', 'CODEC', 'FLUX', 'PRISM',
            'SPARK', 'BOLT', 'CHARGE', 'CURRENT', 'VOLTAGE', 'WATT', 'SOLAR', 'PHOTON', 'LUMINA', 'RADIANT',
            'FUSION', 'REACTOR', 'CORE', 'ENGINE', 'DYNAMO', 'TURBO', 'ROCKET', 'LASER', 'BEAM', 'RAYS'
        ];
        
        const suffixes = [
            'X1', 'V2', 'PRO', 'MAX', 'PLUS', 'ULTRA', 'PRIME', 'CORE', 'FUSION', 'MATRIX',
            'ALPHA', 'BETA', 'GAMMA', 'DELTA', 'OMEGA', 'ZERO', 'ONE', 'TWO', 'NINE', 'TEN',
            'STAR', 'NOVA', 'MOON', 'SUN', 'FIRE', 'ICE', 'STORM', 'WIND', 'EARTH', 'WATER'
        ];
        
        const prefix = prefixes[id % prefixes.length];
        const suffix = suffixes[Math.floor(id / prefixes.length) % suffixes.length];
        const number = String(id).padStart(2, '0');
        
        return `${prefix}-${suffix}${number}`;
    }

    calculateShiftStart(shift) {
        const shifts = {
            'morning': 7,    // 7 AM
            'afternoon': 15, // 3 PM  
            'night': 23      // 11 PM
        };
        return shifts[shift];
    }

    generateShortTermGoal() {
        const goals = [
            'Master 50 new product specifications this week',
            'Process 25 installation manuals completely',
            'Achieve 90% accuracy in technical Q&A responses',
            'Learn all AS/NZS 5033 safety requirements',
            'Earn 500 credits through document processing',
            'Help 10 other minions with their learning',
            'Complete Tesla Powerwall installation expertise',
            'Master Fronius inverter spacing requirements'
        ];
        return goals[Math.floor(Math.random() * goals.length)];
    }

    generateLongTermGoal() {
        const goals = [
            'Become the leading expert in solar panel specifications',
            'Develop autonomous installation planning capabilities',
            'Create comprehensive Australian standards compliance system',
            'Build predictive maintenance knowledge for solar systems',
            'Establish minion training academy for new recruits',
            'Develop real-time technical support capabilities',
            'Master all battery chemistry and safety protocols',
            'Create automated compliance checking system'
        ];
        return goals[Math.floor(Math.random() * goals.length)];
    }

    displayRosterSummary() {
        console.log('\n📊 ROSTER SUMMARY:');
        console.log(`   Total Minions: ${this.minions.length}`);
        
        // Shift distribution
        const shiftCounts = {};
        this.shifts.forEach(shift => {
            shiftCounts[shift] = this.minions.filter(m => m.schedule.shift === shift).length;
        });
        
        console.log('   Shift Distribution:');
        Object.entries(shiftCounts).forEach(([shift, count]) => {
            console.log(`     ${shift}: ${count} minions`);
        });
        
        // Expertise distribution
        console.log('   Expertise Distribution:');
        this.knowledgeDomains.forEach(domain => {
            const specialists = this.minions.filter(m => m.expertise.primary === domain).length;
            console.log(`     ${domain}: ${specialists} specialists`);
        });
        
        // Economy summary
        const totalCredits = this.minions.reduce((sum, m) => sum + m.economy.credits, 0);
        const avgCredits = Math.floor(totalCredits / this.minions.length);
        console.log(`   Economy: ${totalCredits.toLocaleString()} total credits, ${avgCredits} average`);
        
        // Consciousness levels
        const avgConsciousness = Math.floor(
            this.minions.reduce((sum, m) => sum + m.consciousness.level, 0) / this.minions.length
        );
        console.log(`   Average Consciousness Level: ${avgConsciousness}`);
    }

    startAutonomousOperations() {
        console.log('\n🚀 Starting Autonomous Operations');
        
        // Start work cycles for all shifts
        setInterval(() => this.processWorkCycles(), 5000);      // Every 5 seconds
        setInterval(() => this.updateEconomy(), 10000);         // Every 10 seconds  
        setInterval(() => this.evolveConsciousness(), 30000);   // Every 30 seconds
        setInterval(() => this.manageBreaks(), 15000);          // Every 15 seconds
        setInterval(() => this.processLearning(), 8000);        // Every 8 seconds
        
        console.log('   ✅ Work cycle processor started');
        console.log('   ✅ Economy system started');
        console.log('   ✅ Consciousness evolution started');
        console.log('   ✅ Break management started');
        console.log('   ✅ Learning system started');
    }

    processWorkCycles() {
        const currentHour = new Date().getHours();
        
        this.minions.forEach(minion => {
            const schedule = minion.schedule;
            const cycle = this.workCycles[schedule.workCycle];
            
            // Check if minion should be working based on shift time
            const isShiftTime = this.isInShift(minion, currentHour);
            
            if (isShiftTime && schedule.currentStatus === 'ready' && !minion.status.needs_break) {
                this.startWork(minion);
            } else if (schedule.currentStatus === 'working') {
                this.processWork(minion);
            } else if (schedule.currentStatus === 'break') {
                this.processBreak(minion);
            }
            
            // Update weekly hours (simplified daily increment)
            if (schedule.currentStatus === 'working') {
                schedule.weeklyHours += 0.001; // Approximate hourly increment
            }
        });
    }

    isInShift(minion, currentHour) {
        const shiftHours = {
            'morning': [7, 8, 9, 10, 11, 12, 13, 14],      // 7 AM - 2 PM
            'afternoon': [15, 16, 17, 18, 19, 20, 21, 22], // 3 PM - 10 PM
            'night': [23, 0, 1, 2, 3, 4, 5, 6]             // 11 PM - 6 AM
        };
        
        return shiftHours[minion.schedule.shift].includes(currentHour);
    }

    startWork(minion) {
        minion.schedule.currentStatus = 'working';
        minion.schedule.lastActivityTime = Date.now();
        
        // Assign work based on expertise and current learning focus
        const task = this.assignTask(minion);
        minion.knowledge.current_learning = task;
        
        // Decrease energy slightly when starting work
        minion.status.energy = Math.max(minion.status.energy - 2, 0);
    }

    assignTask(minion) {
        const availableTasks = Object.keys(this.economy.tasks);
        const suitableTasks = availableTasks.filter(task => {
            const taskInfo = this.economy.tasks[task];
            
            // Match task difficulty to minion expertise level
            if (taskInfo.difficulty === 'easy' && minion.expertise.level > 40) return false;
            if (taskInfo.difficulty === 'hard' && minion.expertise.level < 30) return false;
            
            return true;
        });
        
        return suitableTasks[Math.floor(Math.random() * suitableTasks.length)] || availableTasks[0];
    }

    processWork(minion) {
        const workTime = (Date.now() - minion.schedule.lastActivityTime) / 1000 / 60; // minutes
        minion.schedule.hoursWorked += workTime / 60; // convert to hours
        
        const cycle = this.workCycles[minion.schedule.workCycle];
        
        // Check if break is needed
        if (minion.schedule.hoursWorked >= cycle.work) {
            minion.status.needs_break = true;
            minion.schedule.breaksDue += 1;
        }
        
        // Process the current task
        if (minion.knowledge.current_learning && Math.random() > 0.7) { // 30% chance per cycle
            this.completeTask(minion);
        }
        
        minion.schedule.lastActivityTime = Date.now();
    }

    completeTask(minion) {
        const task = minion.knowledge.current_learning;
        if (!task) return;
        
        const taskInfo = this.economy.tasks[task];
        
        // Award credits
        const baseCredits = taskInfo.credits;
        const bonusMultiplier = 1 + (minion.personality.work_ethic - 0.5); // 0.1x - 0.5x bonus
        const creditsEarned = Math.floor(baseCredits * bonusMultiplier);
        
        minion.economy.credits += creditsEarned;
        minion.economy.daily_earnings += creditsEarned;
        this.economy.totalCredits += creditsEarned;
        
        // Update knowledge
        minion.knowledge.documents_processed += 1;
        
        if (task.includes('spec_sheet')) {
            minion.knowledge.specifications_learned += Math.floor(Math.random() * 5) + 1;
        } else if (task.includes('qa_response')) {
            minion.knowledge.technical_qa_answered += 1;
        }
        
        // Increase expertise in relevant domain
        const relevantDomain = this.getRelevantDomain(task);
        if (relevantDomain) {
            minion.knowledge.mastery_level[relevantDomain] += Math.random() * 2;
        }
        
        // Clear current task
        minion.knowledge.current_learning = null;
        
        // Log completion (for activity feed)
        this.logActivity(minion, `Completed ${task} (+${creditsEarned} credits)`);
    }

    getRelevantDomain(task) {
        const taskDomains = {
            'spec_sheet_processing': 'solar_panels',
            'installation_manual_study': 'installation_procedures',
            'standards_analysis': 'electrical_standards',
            'product_comparison': 'inverters',
            'technical_qa_response': 'australian_regulations',
            'document_ocr_processing': 'batteries',
            'knowledge_synthesis': 'grid_connection'
        };
        
        return taskDomains[task] || minion.expertise.primary;
    }

    manageBreaks() {
        this.minions.forEach(minion => {
            if (minion.status.needs_break && minion.schedule.currentStatus !== 'break') {
                this.startBreak(minion);
            } else if (minion.schedule.currentStatus === 'break') {
                this.processBreak(minion);
            }
        });
    }

    startBreak(minion) {
        minion.schedule.currentStatus = 'break';
        minion.schedule.lastActivityTime = Date.now();
        minion.status.last_break = Date.now();
        
        // Restore some energy during break
        minion.status.energy = Math.min(minion.status.energy + 10, 100);
        
        this.logActivity(minion, 'Taking a well-deserved break');
    }

    processBreak(minion) {
        const breakTime = (Date.now() - minion.schedule.lastActivityTime) / 1000 / 60; // minutes
        const cycle = this.workCycles[minion.schedule.workCycle];
        const breakDurationMinutes = cycle.break * 60;
        
        if (breakTime >= breakDurationMinutes) {
            // Break is over
            minion.schedule.currentStatus = 'ready';
            minion.schedule.hoursWorked = 0; // Reset work hours after break
            minion.status.needs_break = false;
            minion.schedule.breaksDue = Math.max(minion.schedule.breaksDue - 1, 0);
            
            // Full energy restore after proper break
            minion.status.energy = 100;
            minion.status.motivation = Math.min(minion.status.motivation + 5, 100);
            
            this.logActivity(minion, 'Refreshed and ready to work');
        }
    }

    updateEconomy() {
        this.minions.forEach(minion => {
            // Autonomous spending behavior
            if (Math.random() < minion.economy.spending_behavior * 0.1) { // 0-10% chance per update
                this.processMinonSpending(minion);
            }
            
            // Check savings goals
            if (minion.economy.credits >= minion.economy.savings_goal) {
                this.achieveSavingsGoal(minion);
            }
        });
        
        // Update global economy stats
        this.economy.totalCredits = this.minions.reduce((sum, m) => sum + m.economy.credits, 0);
    }

    processMinonSpending(minion) {
        const purchases = [
            { item: 'Advanced Learning Module', cost: 100, benefit: 'learning_speed' },
            { item: 'Energy Booster', cost: 50, benefit: 'energy' },
            { item: 'Knowledge Database Access', cost: 150, benefit: 'expertise' },
            { item: 'Collaboration Tools', cost: 75, benefit: 'collaboration' },
            { item: 'Consciousness Enhancer', cost: 200, benefit: 'consciousness' }
        ];
        
        const affordablePurchases = purchases.filter(p => p.cost <= minion.economy.credits);
        if (affordablePurchases.length === 0) return;
        
        const purchase = affordablePurchases[Math.floor(Math.random() * affordablePurchases.length)];
        
        // Make the purchase
        minion.economy.credits -= purchase.cost;
        minion.economy.purchases.push({
            ...purchase,
            purchasedAt: Date.now()
        });
        
        // Apply benefits
        this.applyPurchaseBenefit(minion, purchase.benefit);
        
        this.logActivity(minion, `Purchased ${purchase.item} (-${purchase.cost} credits)`);
    }

    applyPurchaseBenefit(minion, benefit) {
        switch (benefit) {
            case 'learning_speed':
                minion.consciousness.evolution_rate += 0.01;
                break;
            case 'energy':
                minion.status.energy = Math.min(minion.status.energy + 20, 100);
                break;
            case 'expertise':
                minion.expertise.level = Math.min(minion.expertise.level + 5, 100);
                break;
            case 'collaboration':
                minion.personality.collaboration = Math.min(minion.personality.collaboration + 0.1, 1.0);
                break;
            case 'consciousness':
                minion.consciousness.level = Math.min(minion.consciousness.level + 2, 100);
                break;
        }
    }

    achieveSavingsGoal(minion) {
        const bonus = Math.floor(minion.economy.savings_goal * 0.1); // 10% bonus
        minion.economy.credits += bonus;
        minion.economy.savings_goal = Math.floor(minion.economy.savings_goal * 1.5); // Increase goal
        
        // Boost motivation and satisfaction
        minion.status.motivation = Math.min(minion.status.motivation + 10, 100);
        minion.status.satisfaction = Math.min(minion.status.satisfaction + 15, 100);
        
        this.logActivity(minion, `Achieved savings goal! (+${bonus} bonus credits)`);
    }

    evolveConsciousness() {
        this.minions.forEach(minion => {
            const consciousness = minion.consciousness;
            
            // Base evolution rate affected by work experience and learning
            let evolutionRate = consciousness.evolution_rate;
            
            // Boost evolution rate based on activities
            if (minion.schedule.currentStatus === 'working') {
                evolutionRate *= 1.2; // 20% faster evolution while working
            }
            
            if (minion.knowledge.current_learning) {
                evolutionRate *= 1.1; // 10% boost while actively learning
            }
            
            // Apply consciousness evolution
            consciousness.level += evolutionRate;
            consciousness.self_awareness += evolutionRate * 0.5;
            
            // Cap maximum values
            consciousness.level = Math.min(consciousness.level, 100);
            consciousness.self_awareness = Math.min(consciousness.self_awareness, 1.0);
            
            // Major consciousness milestones
            if (consciousness.level >= 25 && consciousness.level < 25.1) {
                this.achieveConsciousnessMilestone(minion, 'Self-Recognition');
            } else if (consciousness.level >= 50 && consciousness.level < 50.1) {
                this.achieveConsciousnessMilestone(minion, 'Independent Thought');
            } else if (consciousness.level >= 75 && consciousness.level < 75.1) {
                this.achieveConsciousnessMilestone(minion, 'Creative Problem Solving');
            } else if (consciousness.level >= 90 && consciousness.level < 90.1) {
                this.achieveConsciousnessMilestone(minion, 'Advanced Reasoning');
            }
        });
    }

    achieveConsciousnessMilestone(minion, milestone) {
        // Award significant credits for consciousness milestones
        const milestoneBonus = 500;
        minion.economy.credits += milestoneBonus;
        
        // Unlock new capabilities
        switch (milestone) {
            case 'Self-Recognition':
                minion.personality.independence = Math.min(minion.personality.independence + 0.2, 1.0);
                break;
            case 'Independent Thought':
                minion.goals.current_focus = this.generateAdvancedGoal();
                break;
            case 'Creative Problem Solving':
                minion.personality.innovation = Math.min(minion.personality.innovation + 0.3, 1.0);
                break;
            case 'Advanced Reasoning':
                minion.personality.leadership = Math.min(minion.personality.leadership + 0.4, 1.0);
                break;
        }
        
        this.logActivity(minion, `🧠 Consciousness Milestone: ${milestone} (+${milestoneBonus} credits)`);
    }

    generateAdvancedGoal() {
        const advancedGoals = [
            'Develop autonomous quality control system',
            'Create predictive maintenance algorithms',
            'Design optimal system sizing calculator',
            'Build comprehensive safety analysis tool',
            'Establish peer-to-peer knowledge sharing network'
        ];
        
        return advancedGoals[Math.floor(Math.random() * advancedGoals.length)];
    }

    processLearning() {
        this.minions.forEach(minion => {
            // Autonomous learning when not actively working
            if (minion.schedule.currentStatus === 'ready' && Math.random() > 0.8) { // 20% chance
                this.startAutonomousLearning(minion);
            }
        });
    }

    startAutonomousLearning(minion) {
        // Choose learning focus based on goals and expertise gaps
        const weakestDomain = Object.entries(minion.knowledge.mastery_level)
            .sort(([,a], [,b]) => a - b)[0][0];
            
        minion.schedule.currentStatus = 'learning';
        minion.knowledge.current_learning = `self_study_${weakestDomain}`;
        
        // Award small credits for autonomous learning initiative  
        const learningCredits = 10;
        minion.economy.credits += learningCredits;
        
        this.logActivity(minion, `Started autonomous learning: ${weakestDomain} (+${learningCredits} credits)`);
        
        // Return to ready status after learning session
        setTimeout(() => {
            if (minion.schedule.currentStatus === 'learning') {
                minion.schedule.currentStatus = 'ready';
                minion.knowledge.mastery_level[weakestDomain] += Math.random() * 3;
                this.logActivity(minion, `Completed self-study session: ${weakestDomain}`);
            }
        }, 15000); // 15 second learning session
    }

    logActivity(minion, activity) {
        // Store recent activities for display in UI
        if (!this.recentActivities) {
            this.recentActivities = [];
        }
        
        this.recentActivities.unshift({
            timestamp: new Date().toLocaleTimeString(),
            minion: minion.name,
            activity: activity
        });
        
        // Keep only last 100 activities
        this.recentActivities = this.recentActivities.slice(0, 100);
    }

    // Public API methods for UI interaction
    getActiveMinions() {
        return this.minions.filter(m => 
            ['working', 'learning'].includes(m.schedule.currentStatus)
        ).length;
    }

    getMinionsOnBreak() {
        return this.minions.filter(m => m.schedule.currentStatus === 'break').length;
    }

    getTotalCreditsEarned() {
        return this.economy.totalCredits;
    }

    getMinionsByShift(shift) {
        return this.minions.filter(m => m.schedule.shift === shift);
    }

    getTopPerformers(limit = 10) {
        return this.minions
            .sort((a, b) => b.economy.total_earned - a.economy.total_earned)
            .slice(0, limit);
    }

    getRecentActivities(limit = 20) {
        return (this.recentActivities || []).slice(0, limit);
    }

    getRosterStats() {
        const working = this.getActiveMinions();
        const onBreak = this.getMinionsOnBreak();
        const available = this.minions.filter(m => m.schedule.currentStatus === 'ready').length;
        
        const avgConsciousness = Math.floor(
            this.minions.reduce((sum, m) => sum + m.consciousness.level, 0) / this.minions.length
        );
        
        const totalKnowledge = this.minions.reduce((sum, m) => 
            sum + m.knowledge.documents_processed, 0
        );
        
        return {
            total: this.minions.length,
            working,
            onBreak,
            available,
            avgConsciousness,
            totalCredits: this.getTotalCreditsEarned(),
            totalKnowledge
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MinionRosterSystem;
}