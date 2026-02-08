/**
 * SECURITY UTILITIES
 * Input validation, XSS prevention, and security helpers
 */

class SecurityUtils {
    constructor() {
        this.initialized = true;
        console.log('🔒 Security Utils initialized');
    }
    
    // Sanitize HTML to prevent XSS
    sanitizeHTML(html) {
        const div = document.createElement('div');
        div.textContent = html;
        return div.innerHTML;
    }
    
    // Escape HTML entities
    escapeHTML(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }
    
    // Validate minion ID format
    validateMinionId(id) {
        if (typeof id !== 'string') return false;
        if (id.length < 2 || id.length > 50) return false;
        // Allow alphanumeric, hyphens, underscores only
        return /^[a-zA-Z0-9_-]+$/.test(id);
    }
    
    // Validate credit amount
    validateCreditAmount(amount) {
        if (typeof amount !== 'number') return false;
        if (!Number.isFinite(amount)) return false;
        if (amount < 0 || amount > 1000000) return false;
        return true;
    }
    
    // Validate progress value (0-100)
    validateProgress(progress) {
        if (typeof progress !== 'number') return false;
        if (!Number.isFinite(progress)) return false;
        if (progress < 0 || progress > 100) return false;
        return true;
    }
    
    // Validate task ID
    validateTaskId(id) {
        if (typeof id !== 'string') return false;
        if (id.length < 1 || id.length > 100) return false;
        return /^[a-zA-Z0-9_-]+$/.test(id);
    }
    
    // Validate timestamp
    validateTimestamp(timestamp) {
        if (typeof timestamp !== 'number') return false;
        if (!Number.isFinite(timestamp)) return false;
        // Must be between 2020 and 2050
        const min = new Date('2020-01-01').getTime();
        const max = new Date('2050-01-01').getTime();
        return timestamp >= min && timestamp <= max;
    }
    
    // Validate JSON string
    validateJSON(str) {
        try {
            JSON.parse(str);
            return true;
        } catch (e) {
            return false;
        }
    }
    
    // Rate limiting helper
    createRateLimiter(maxCalls, windowMs) {
        const calls = [];
        
        return function() {
            const now = Date.now();
            
            // Remove old calls outside window
            while (calls.length > 0 && calls[0] < now - windowMs) {
                calls.shift();
            }
            
            // Check if limit exceeded
            if (calls.length >= maxCalls) {
                console.warn('🚫 Rate limit exceeded');
                return false;
            }
            
            calls.push(now);
            return true;
        };
    }
    
    // Safe localStorage write with size limit
    safeLocalStorageSet(key, value, maxSizeKB = 5000) {
        try {
            // Validate key
            if (typeof key !== 'string' || key.length === 0) {
                throw new Error('Invalid localStorage key');
            }
            
            // Convert value to string
            const valueStr = typeof value === 'string' ? value : JSON.stringify(value);
            
            // Check size
            const sizeKB = new Blob([valueStr]).size / 1024;
            if (sizeKB > maxSizeKB) {
                throw new Error(`Value too large: ${sizeKB.toFixed(0)}KB exceeds ${maxSizeKB}KB limit`);
            }
            
            localStorage.setItem(key, valueStr);
            return true;
            
        } catch (error) {
            console.error('❌ localStorage write failed:', error);
            return false;
        }
    }
    
    // Safe localStorage read with validation
    safeLocalStorageGet(key, validator = null) {
        try {
            const value = localStorage.getItem(key);
            if (value === null) return null;
            
            // Try to parse as JSON
            let parsed;
            try {
                parsed = JSON.parse(value);
            } catch (e) {
                // Not JSON, return as string
                parsed = value;
            }
            
            // Run validator if provided
            if (validator && typeof validator === 'function') {
                if (!validator(parsed)) {
                    console.warn(`🚫 Validation failed for key: ${key}`);
                    return null;
                }
            }
            
            return parsed;
            
        } catch (error) {
            console.error('❌ localStorage read failed:', error);
            return null;
        }
    }
    
    // Generate CSRF token
    generateCSRFToken() {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }
    
    // Verify CSRF token
    verifyCSRFToken(token, storedToken) {
        if (!token || !storedToken) return false;
        if (token.length !== storedToken.length) return false;
        
        // Constant-time comparison to prevent timing attacks
        let result = 0;
        for (let i = 0; i < token.length; i++) {
            result |= token.charCodeAt(i) ^ storedToken.charCodeAt(i);
        }
        return result === 0;
    }
    
    // Content Security Policy helper
    enforceCSP() {
        // Check if CSP is set
        const meta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
        if (!meta) {
            console.warn('⚠️ No Content-Security-Policy meta tag found');
            return false;
        }
        return true;
    }
    
    // Check for unsafe inline scripts
    detectUnsafeInline() {
        const inlineScripts = document.querySelectorAll('script:not([src])');
        if (inlineScripts.length > 0) {
            console.warn(`⚠️ Found ${inlineScripts.length} inline scripts - consider moving to external files`);
        }
        return inlineScripts.length;
    }
    
    // Log security event
    logSecurityEvent(type, details) {
        const event = {
            type: type,
            timestamp: Date.now(),
            details: details,
            userAgent: navigator.userAgent,
            url: window.location.href
        };
        
        // Store in security log
        const logKey = 'security-log';
        const log = this.safeLocalStorageGet(logKey) || [];
        log.unshift(event);
        
        // Keep only last 100 events
        if (log.length > 100) {
            log.splice(100);
        }
        
        this.safeLocalStorageSet(logKey, log);
        
        console.warn('🔒 Security Event:', type, details);
    }
    
    // Get security log
    getSecurityLog(limit = 50) {
        const log = this.safeLocalStorageGet('security-log') || [];
        return log.slice(0, limit);
    }
    
    // Clear security log
    clearSecurityLog() {
        localStorage.removeItem('security-log');
        console.log('🗑️ Security log cleared');
    }
}

// Global singleton
window.securityUtils = new SecurityUtils();

// Rate limiters will be created by init-orchestrator after security utils loads
window.rateLimiters = null;

console.log('✅ Security Utils module loaded');