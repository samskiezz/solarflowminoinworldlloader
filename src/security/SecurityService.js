/**
 * Security middleware and helpers: CORS, headers/CSP, rate limiting, input
 * validation, JWT verification and brute-force tracking.
 */
'use strict';

const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');
const validator = require('validator');
const DOMPurify = require('isomorphic-dompurify');
const jwt = require('jsonwebtoken');
const config = require('../config');
const logger = require('../logger');

const ROLE_RANK = { user: 1, auditor: 2, admin: 3 };

class ValidationError extends Error {
    constructor(errors) {
        super(`Validation failed: ${errors.join(', ')}`);
        this.name = 'ValidationError';
        this.status = 400;
        this.errors = errors;
    }
}

class SecurityService {
    constructor(options = {}) {
        this.options = options;
        this.failedAttempts = new Map();
        this.maxFailedLogins = options.maxFailedLogins || config.auth.maxFailedLogins;
        this.lockoutMs = options.lockoutMs || config.auth.lockoutMs;
        this.allowedOrigins = options.allowedOrigins || config.cors.origins;

        // Prune stale brute-force entries so the map cannot grow forever.
        this.pruneTimer = setInterval(() => this.pruneFailedAttempts(), Math.min(this.lockoutMs, 10 * 60 * 1000));
        if (this.pruneTimer.unref) this.pruneTimer.unref();
    }

    // ----------------------------------------------------------------- CORS

    getCORSConfig() {
        const allowed = new Set(this.allowedOrigins);
        return cors({
            origin: (origin, callback) => {
                // Same-origin requests, curl and health checks send no Origin.
                if (!origin || allowed.has(origin)) return callback(null, true);
                logger.warn('CORS origin rejected', { origin });
                return callback(null, false);
            },
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Request-Id'],
            exposedHeaders: ['X-Request-Id', 'RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset'],
            maxAge: 86400
        });
    }

    // -------------------------------------------------------------- headers

    getSecurityHeaders() {
        const connectSrc = ["'self'", 'ws:', 'wss:', 'https://api.cleanenergyregulator.gov.au', 'https://standards.org.au'];
        if (process.env.VPS_API_URL) connectSrc.push(process.env.VPS_API_URL);

        return helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    // The legacy pages rely on inline scripts; nonces are a follow-up.
                    scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdnjs.cloudflare.com', 'https://unpkg.com', 'https://cdn.jsdelivr.net'],
                    styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://cdnjs.cloudflare.com'],
                    fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
                    imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
                    connectSrc,
                    workerSrc: ["'self'", 'blob:'],
                    mediaSrc: ["'self'", 'data:', 'blob:'],
                    objectSrc: ["'none'"],
                    frameAncestors: ["'none'"],
                    baseUri: ["'self'"],
                    formAction: ["'self'"]
                }
            },
            crossOriginEmbedderPolicy: false,
            crossOriginResourcePolicy: { policy: 'cross-origin' },
            referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
            hsts: config.isProduction ? { maxAge: 31536000, includeSubDomains: true } : false
        });
    }

    // Kept for backwards compatibility with the previous API.
    getCSPConfig() {
        return this.getSecurityHeaders();
    }

    // -------------------------------------------------------- rate limiting

    getRateLimiters() {
        const common = { standardHeaders: true, legacyHeaders: false };
        return {
            general: rateLimit({
                ...common,
                windowMs: config.rateLimit.windowMs,
                max: config.rateLimit.max,
                message: { error: 'Too many requests from this IP, please try again later.' }
            }),
            auth: rateLimit({
                ...common,
                windowMs: config.rateLimit.windowMs,
                max: config.rateLimit.authMax,
                skipSuccessfulRequests: true,
                message: { error: 'Too many login attempts, please try again later.' }
            }),
            modify: rateLimit({
                ...common,
                windowMs: 60 * 1000,
                max: config.rateLimit.modifyMax,
                message: { error: 'Too many data modifications, please slow down.' }
            })
        };
    }

    // ----------------------------------------------------------- validation

    /**
     * Validates `data` against `schema` and returns a new object containing
     * only the declared fields. Strings are HTML-sanitised unless the rule
     * sets `sanitize: false` (passwords, for example, must not be altered).
     */
    validateAndSanitize(data, schema) {
        const input = data && typeof data === 'object' && !Array.isArray(data) ? data : {};
        const sanitized = {};
        const errors = [];

        for (const [field, rules] of Object.entries(schema)) {
            let value = input[field];

            if (value === undefined || value === null || value === '') {
                if (rules.required) {
                    errors.push(`${field} is required`);
                } else {
                    sanitized[field] = rules.default !== undefined ? rules.default : null;
                }
                continue;
            }

            switch (rules.type) {
                case 'string': {
                    if (typeof value !== 'string') {
                        errors.push(`${field} must be a string`);
                        continue;
                    }
                    if (rules.trim !== false) value = value.trim();
                    if (rules.minLength && value.length < rules.minLength) errors.push(`${field} must be at least ${rules.minLength} characters`);
                    if (rules.maxLength && value.length > rules.maxLength) errors.push(`${field} must be at most ${rules.maxLength} characters`);
                    if (rules.email && !validator.isEmail(value)) errors.push(`${field} must be a valid email`);
                    if (rules.url && !validator.isURL(value, { protocols: ['http', 'https'], require_protocol: true })) errors.push(`${field} must be a valid http(s) URL`);
                    if (rules.enum && !rules.enum.includes(value)) errors.push(`${field} must be one of: ${rules.enum.join(', ')}`);
                    if (rules.pattern && !rules.pattern.test(value)) errors.push(`${field} has an invalid format`);
                    if (rules.email) value = value.toLowerCase();
                    if (rules.sanitize !== false) value = DOMPurify.sanitize(value, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
                    break;
                }
                case 'number':
                case 'integer': {
                    value = typeof value === 'number' ? value : Number(value);
                    if (!Number.isFinite(value)) {
                        errors.push(`${field} must be a number`);
                        continue;
                    }
                    if (rules.type === 'integer' && !Number.isInteger(value)) errors.push(`${field} must be an integer`);
                    if (rules.min !== undefined && value < rules.min) errors.push(`${field} must be at least ${rules.min}`);
                    if (rules.max !== undefined && value > rules.max) errors.push(`${field} must be at most ${rules.max}`);
                    break;
                }
                case 'boolean':
                    if (typeof value === 'string') value = ['true', '1', 'yes'].includes(value.toLowerCase());
                    else value = Boolean(value);
                    break;
                case 'array':
                    if (!Array.isArray(value)) {
                        errors.push(`${field} must be an array`);
                        continue;
                    }
                    if (rules.maxItems && value.length > rules.maxItems) errors.push(`${field} must have at most ${rules.maxItems} items`);
                    break;
                case 'object':
                    if (typeof value !== 'object' || Array.isArray(value)) {
                        errors.push(`${field} must be an object`);
                        continue;
                    }
                    break;
                default:
                    break;
            }

            sanitized[field] = value;
        }

        if (errors.length > 0) throw new ValidationError(errors);
        return sanitized;
    }

    sanitizeHTML(html) {
        return DOMPurify.sanitize(String(html), {
            ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'code', 'pre'],
            ALLOWED_ATTR: []
        });
    }

    // ------------------------------------------------------------------ JWT

    validateJWT(token) {
        try {
            return jwt.verify(token, config.auth.jwtSecret, { issuer: config.auth.jwtIssuer });
        } catch (error) {
            const mapped = new Error(error.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token');
            mapped.status = 401;
            throw mapped;
        }
    }

    middleware() {
        return {
            authenticate: (req, res, next) => {
                const header = req.headers.authorization || '';
                const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
                if (!token) return res.status(401).json({ error: 'No token provided' });
                try {
                    req.user = this.validateJWT(token);
                    return next();
                } catch (error) {
                    return res.status(401).json({ error: error.message });
                }
            },

            /** Allows any of the given roles, or any role ranked at least as high. */
            requireRole: (role) => (req, res, next) => {
                const roles = Array.isArray(role) ? role : [role];
                const userRole = req.user && req.user.role;
                const userRank = ROLE_RANK[userRole] || 0;
                const allowed = roles.some((required) => userRole === required || userRank >= (ROLE_RANK[required] || Infinity));
                if (!allowed) return res.status(403).json({ error: 'Insufficient permissions' });
                return next();
            },

            logRequest: (req, res, next) => {
                const start = process.hrtime.bigint();
                res.on('finish', () => {
                    const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
                    logger.http ? logger.http('request', { id: req.id, method: req.method, path: req.path, status: res.statusCode, ms: Math.round(durationMs), ip: req.ip })
                        : logger.info('request', { id: req.id, method: req.method, path: req.path, status: res.statusCode, ms: Math.round(durationMs), ip: req.ip });
                });
                next();
            }
        };
    }

    // ---------------------------------------------------------- brute force

    key(ip, identifier) {
        return `${ip}:${String(identifier || '').toLowerCase()}`;
    }

    checkBruteForce(ip, identifier) {
        const attempts = this.failedAttempts.get(this.key(ip, identifier));
        if (!attempts) return { allowed: true, remaining: 0 };

        const elapsed = Date.now() - attempts.lastAttempt;
        if (elapsed > this.lockoutMs) {
            this.failedAttempts.delete(this.key(ip, identifier));
            return { allowed: true, remaining: 0 };
        }
        if (attempts.count >= this.maxFailedLogins) {
            return { allowed: false, remaining: this.lockoutMs - elapsed };
        }
        return { allowed: true, remaining: 0 };
    }

    recordFailedAttempt(ip, identifier) {
        const key = this.key(ip, identifier);
        const attempts = this.failedAttempts.get(key) || { count: 0, lastAttempt: 0 };
        this.failedAttempts.set(key, { count: attempts.count + 1, lastAttempt: Date.now() });
    }

    clearFailedAttempts(ip, identifier) {
        this.failedAttempts.delete(this.key(ip, identifier));
    }

    pruneFailedAttempts(now = Date.now()) {
        let pruned = 0;
        for (const [key, attempts] of this.failedAttempts) {
            if (now - attempts.lastAttempt > this.lockoutMs) {
                this.failedAttempts.delete(key);
                pruned++;
            }
        }
        return pruned;
    }

    dispose() {
        clearInterval(this.pruneTimer);
    }

    // -------------------------------------------------------------- schemas

    getSchemas() {
        return {
            user: {
                email: { type: 'string', required: true, email: true, maxLength: 255 },
                // bcrypt only uses the first 72 bytes of a password.
                password: { type: 'string', required: true, minLength: 8, maxLength: 72, sanitize: false, trim: false }
            },
            login: {
                email: { type: 'string', required: true, email: true, maxLength: 255 },
                password: { type: 'string', required: true, minLength: 1, maxLength: 72, sanitize: false, trim: false }
            },
            cerProduct: {
                modelNumber: { type: 'string', required: true, maxLength: 255 },
                manufacturer: { type: 'string', required: true, maxLength: 255 },
                productType: { type: 'string', required: true, maxLength: 100, enum: ['solar_panel', 'inverter', 'battery', 'other'] },
                cerApprovalNumber: { type: 'string', maxLength: 255 },
                approvalDate: { type: 'string', maxLength: 10, pattern: /^\d{4}-\d{2}-\d{2}$/ },
                technicalSpecs: { type: 'object' },
                datasheetUrl: { type: 'string', url: true, maxLength: 2048 },
                installationManualUrl: { type: 'string', url: true, maxLength: 2048 },
                verified: { type: 'boolean', default: false }
            },
            systemData: {
                key: { type: 'string', required: true, maxLength: 255, pattern: /^[a-zA-Z0-9_.-]+$/ },
                value: { type: 'object', required: true }
            },
            complianceCheck: {
                standard_code: { type: 'string', required: true, maxLength: 50, pattern: /^[A-Z0-9_]+$/ },
                installation_data: { type: 'object', required: true }
            }
        };
    }
}

SecurityService.ValidationError = ValidationError;

module.exports = SecurityService;
