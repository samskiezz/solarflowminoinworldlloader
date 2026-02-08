/**
 * UNIFIED CREDIT SYSTEM
 * Single source of truth for all credit calculations
 * Prevents different systems calculating credits differently
 */

class UnifiedCreditSystem {
    constructor() {
        this.rates = {
            documentProcessing: 10,
            tierBonus: 5,
            knowledgeContribution: 3,
            taskCompletion: 8,
            collaborationBonus: 2
        };
        
        this.totalCredits = 0;
        this.creditHistory = [];
        this.initialized = false;
        
        console.log('💰 Unified Credit System initialized');
    }
    
    async init() {
        // Load existing credit state
        const saved = localStorage.getItem('unified-credits');
        if (saved) {
            const data = JSON.parse(saved);
            this.totalCredits = data.totalCredits || 0;
            this.creditHistory = data.creditHistory || [];
        }
        
        this.initialized = true;
        console.log(`💰 Credit System ready - Total: ${this.totalCredits} credits`);
    }
    
    calculateDocumentProcessingCredits(minion, document) {
        // Base rate + tier bonus
        const baseCredits = this.rates.documentProcessing;
        const tierBonus = minion.tier * this.rates.tierBonus;
        
        return baseCredits + tierBonus;
    }
    
    calculateTaskCompletionCredits(minion, task) {
        // Task completion + tier bonus
        const baseCredits = this.rates.taskCompletion;
        const tierBonus = minion.tier * this.rates.tierBonus;
        
        return baseCredits + tierBonus;
    }
    
    calculateKnowledgeContributionCredits(minion, knowledge) {
        // Knowledge contribution + tier bonus
        const baseCredits = this.rates.knowledgeContribution;
        const tierBonus = Math.floor(minion.tier * this.rates.tierBonus / 2);
        
        return baseCredits + tierBonus;
    }
    
    awardCredits(minionId, amount, reason, metadata = {}) {
        // Security validation
        if (window.securityUtils) {
            if (!window.securityUtils.validateMinionId(minionId)) {
                console.error('❌ Invalid minion ID:', minionId);
                return null;
            }
            
            if (!window.securityUtils.validateCreditAmount(amount)) {
                console.error('❌ Invalid credit amount:', amount);
                return null;
            }
            
            // Rate limiting
            if (window.rateLimiters && !window.rateLimiters.creditAward()) {
                console.warn('🚫 Credit award rate limit exceeded');
                window.securityUtils.logSecurityEvent('rate-limit', {
                    type: 'credit-award',
                    minionId: minionId,
                    amount: amount
                });
                return null;
            }
        }
        
        const record = {
            minionId: minionId,
            amount: amount,
            reason: reason,
            timestamp: Date.now(),
            metadata: metadata
        };
        
        // Check for overflow before updating
        if (!Number.isFinite(this.totalCredits)) {
            console.error('❌ Total credits corrupted, resetting to 0');
            this.totalCredits = 0;
        }
        
        if (this.totalCredits + amount > Number.MAX_SAFE_INTEGER) {
            console.error('❌ Credit overflow prevented');
            if (window.securityUtils) {
                window.securityUtils.logSecurityEvent('credit-overflow', {
                    current: this.totalCredits,
                    attempted: amount,
                    minionId: record.minionId
                });
            }
            return null;
        }
        
        // Update total
        this.totalCredits += amount;
        
        // Add to history
        this.creditHistory.unshift(record);
        
        // Keep only last 1000 records
        if (this.creditHistory.length > 1000) {
            this.creditHistory = this.creditHistory.slice(0, 1000);
        }
        
        // Update minion's credit balance
        this.updateMinionCredits(minionId, amount);
        
        // Save state
        this.save();
        
        // Broadcast event
        window.dispatchEvent(new CustomEvent('credits-awarded', {
            detail: record
        }));
        
        console.log(`💰 Awarded ${amount} credits to ${minionId} for ${reason}`);
        
        return record;
    }
    
    updateMinionCredits(minionId, amount) {
        // Single source of truth: localStorage minion-state
        const stateKey = `minion-state-${minionId}`;
        const state = localStorage.getItem(stateKey);
        
        let parsed;
        if (state) {
            try {
                parsed = JSON.parse(state);
            } catch (error) {
                console.error(`❌ Corrupted state for ${minionId}, resetting`);
                parsed = { credits: 0 };
            }
        } else {
            parsed = { credits: 0 };
        }
        
        // Update credits
        parsed.credits = (parsed.credits || 0) + amount;
        parsed.creditsEarned = (parsed.creditsEarned || 0) + amount;
        parsed.lastCreditUpdate = Date.now();
        
        // Validate before saving
        if (window.securityUtils) {
            if (!window.securityUtils.validateCreditAmount(parsed.credits)) {
                console.error(`❌ Invalid credit total for ${minionId}: ${parsed.credits}`);
                return;
            }
        }
        
        // Save to localStorage
        localStorage.setItem(stateKey, JSON.stringify(parsed));
        
        // DON'T update hiveState - it's read-only from file
        // Only localStorage is writeable
    }
    
    getMinionCredits(minionId) {
        const stateKey = `minion-state-${minionId}`;
        const state = localStorage.getItem(stateKey);
        
        if (state) {
            const parsed = JSON.parse(state);
            return parsed.credits || 0;
        }
        
        return 0;
    }
    
    getTotalCredits() {
        return this.totalCredits;
    }
    
    getCreditHistory(minionId = null, limit = 100) {
        let history = this.creditHistory;
        
        if (minionId) {
            history = history.filter(record => record.minionId === minionId);
        }
        
        return history.slice(0, limit);
    }
    
    getTopEarners(limit = 10) {
        // Aggregate credits by minion
        const earnings = {};
        
        this.creditHistory.forEach(record => {
            if (!earnings[record.minionId]) {
                earnings[record.minionId] = 0;
            }
            earnings[record.minionId] += record.amount;
        });
        
        // Sort and return top earners
        return Object.entries(earnings)
            .map(([minionId, total]) => ({ minionId, total }))
            .sort((a, b) => b.total - a.total)
            .slice(0, limit);
    }
    
    getEarningsByReason() {
        const byReason = {};
        
        this.creditHistory.forEach(record => {
            if (!byReason[record.reason]) {
                byReason[record.reason] = { count: 0, total: 0 };
            }
            byReason[record.reason].count++;
            byReason[record.reason].total += record.amount;
        });
        
        return byReason;
    }
    
    save() {
        const data = {
            totalCredits: this.totalCredits,
            creditHistory: this.creditHistory,
            lastSaved: Date.now()
        };
        
        localStorage.setItem('unified-credits', JSON.stringify(data));
    }
    
    getStats() {
        return {
            totalCredits: this.totalCredits,
            totalTransactions: this.creditHistory.length,
            topEarners: this.getTopEarners(5),
            byReason: this.getEarningsByReason(),
            initialized: this.initialized
        };
    }
    
    // Reset credits (admin function)
    reset() {
        if (!confirm('Reset all credits? This cannot be undone.')) {
            return false;
        }
        
        this.totalCredits = 0;
        this.creditHistory = [];
        this.save();
        
        console.log('💰 Credit system reset');
        return true;
    }
}

// Global singleton
window.unifiedCreditSystem = new UnifiedCreditSystem();

// Don't auto-initialize - let init-orchestrator control startup
// Will be initialized by init-orchestrator.js in correct order

console.log('✅ Unified Credit System module loaded');