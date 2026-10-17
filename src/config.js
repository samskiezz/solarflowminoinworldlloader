/**
 * Central runtime configuration.
 *
 * Every environment variable the server reads is declared here with its
 * default, so there is one place to look (and .env.example mirrors it).
 */
'use strict';

const path = require('path');
const crypto = require('crypto');

const env = process.env;
const isProduction = env.NODE_ENV === 'production';

function bool(value, fallback) {
    if (value === undefined || value === '') return fallback;
    return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

function int(value, fallback) {
    const parsed = parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function list(value, fallback) {
    if (!value) return fallback;
    return String(value).split(',').map((item) => item.trim()).filter(Boolean);
}

function resolveJwtSecret() {
    const secret = env.JWT_SECRET;
    if (secret && secret.length >= 32) return secret;
    if (isProduction) {
        throw new Error('JWT_SECRET must be set to at least 32 characters in production');
    }
    // Development only: a random per-process secret means tokens never
    // survive a restart, which is safer than a well-known default.
    return secret || crypto.randomBytes(32).toString('hex');
}

const rootDir = path.join(__dirname, '..');

const config = {
    env: env.NODE_ENV || 'development',
    isProduction,
    port: int(env.PORT, 3000),
    host: env.HOST || '0.0.0.0',
    trustProxy: bool(env.TRUST_PROXY, false),
    logLevel: env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
    rootDir,
    docsDir: path.join(rootDir, 'docs'),
    dataDir: env.DATA_DIR ? path.resolve(env.DATA_DIR) : path.join(rootDir, 'data'),
    logsDir: env.LOG_DIR ? path.resolve(env.LOG_DIR) : path.join(rootDir, 'logs'),

    database: {
        url: env.DATABASE_URL || '',
        enabled: bool(env.DATABASE_ENABLED, Boolean(env.DATABASE_URL)),
        ssl: bool(env.DATABASE_SSL, false),
        sslInsecure: bool(env.DATABASE_SSL_INSECURE, false),
        poolMax: int(env.DATABASE_POOL_MAX, 10),
        connectionTimeoutMs: int(env.DATABASE_CONNECT_TIMEOUT_MS, 5000),
        retryDelayMs: int(env.DATABASE_RETRY_DELAY_MS, 10000),
        maxRetries: int(env.DATABASE_MAX_RETRIES, 0) // 0 = retry forever
    },

    auth: {
        jwtSecret: resolveJwtSecret(),
        jwtExpiresIn: env.JWT_EXPIRES_IN || '24h',
        jwtIssuer: env.JWT_ISSUER || 'solarflow',
        bcryptRounds: int(env.BCRYPT_ROUNDS, 12),
        maxFailedLogins: int(env.MAX_FAILED_LOGINS, 5),
        lockoutMs: int(env.LOGIN_LOCKOUT_MS, 60 * 60 * 1000)
    },

    cors: {
        origins: list(env.CORS_ORIGIN, isProduction
            ? ['https://samskiezz.github.io', 'https://projectsolar.cloud', 'https://www.projectsolar.cloud', 'https://solarflow.openclaw.ai']
            : ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:8000', 'http://127.0.0.1:8000'])
    },

    rateLimit: {
        windowMs: int(env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
        max: int(env.RATE_LIMIT_MAX, 1000),
        authMax: int(env.RATE_LIMIT_AUTH_MAX, 10),
        modifyMax: int(env.RATE_LIMIT_MODIFY_MAX, 100)
    },

    state: {
        // The static front end POSTs its whole state to /api/state without
        // credentials. Writes are off unless explicitly enabled.
        allowAnonymousWrites: bool(env.ALLOW_ANONYMOUS_STATE_WRITES, false),
        maxBytes: int(env.STATE_MAX_BYTES, 1024 * 1024)
    },

    standards: {
        // Outbound scraping only happens when an admin asks for it.
        allowRemoteFetch: bool(env.STANDARDS_REMOTE_FETCH, false),
        requestTimeoutMs: int(env.STANDARDS_REQUEST_TIMEOUT_MS, 10000)
    },

    business: {
        // Static bearer token for the business API (in addition to user JWTs).
        token: env.BUSINESS_API_TOKEN || '',
        syncMinutes: int(env.BUSINESS_SYNC_MINUTES, 0), // 0 = manual sync only
        requestTimeoutMs: int(env.BUSINESS_REQUEST_TIMEOUT_MS, 20000),
        company: { name: env.BUSINESS_NAME || '', domains: list(env.BUSINESS_DOMAINS, []), timezone: env.BUSINESS_TIMEZONE || 'Australia/Sydney' },
        servicem8: { apiKey: env.SERVICEM8_API_KEY || '', email: env.SERVICEM8_EMAIL || '', password: env.SERVICEM8_PASSWORD || '', maxJobs: int(env.SERVICEM8_MAX_JOBS, 5000) },
        xero: { clientId: env.XERO_CLIENT_ID || '', clientSecret: env.XERO_CLIENT_SECRET || '', tenantId: env.XERO_TENANT_ID || '', months: int(env.XERO_MONTHS, 12) },
        google: {
            serviceAccount: env.GOOGLE_SERVICE_ACCOUNT_JSON || '', // path to the key file or the JSON itself
            subject: env.GOOGLE_IMPERSONATE || '', // workspace user to act as (domain-wide delegation)
            allUsers: bool(env.GOOGLE_ALL_USERS, false), // read every mailbox in the workspace (admin portal)
            oauthClientId: env.GOOGLE_OAUTH_CLIENT_ID || '', oauthClientSecret: env.GOOGLE_OAUTH_CLIENT_SECRET || '', oauthRefreshToken: env.GOOGLE_OAUTH_REFRESH_TOKEN || '',
            handoverFolderId: env.GOOGLE_HANDOVER_FOLDER_ID || '', calendarId: env.GOOGLE_CALENDAR_ID || 'primary', mailQuery: env.GOOGLE_MAIL_QUERY || 'newer_than:365d -category:promotions -category:social', mailMaxThreads: int(env.GOOGLE_MAIL_MAX_THREADS, 2000)
        },
        bank: { feedUrl: env.BANK_FEED_URL || '', feedToken: env.BANK_FEED_TOKEN || '' },
        meta: {
            accessToken: env.META_ACCESS_TOKEN || '', // long-lived user or system-user token
            pageIds: list(env.META_PAGE_IDS, []), igUserIds: list(env.META_IG_USER_IDS, []),
            maxPosts: int(env.META_MAX_POSTS, 200), maxCommentPosts: int(env.META_MAX_COMMENT_POSTS, 40), maxInsightPosts: int(env.META_MAX_INSIGHT_POSTS, 30),
            allowPublish: bool(env.META_ALLOW_PUBLISH, false) // publishing needs this AND an admin's approval of a draft
        }
    },

    websocket: {
        heartbeatMs: int(env.WS_HEARTBEAT_MS, 30000),
        maxPayloadBytes: int(env.WS_MAX_PAYLOAD_BYTES, 64 * 1024)
    },

    bodyLimit: env.BODY_LIMIT || '1mb',
    shutdownTimeoutMs: int(env.SHUTDOWN_TIMEOUT_MS, 10000),
    version: require('../package.json').version
};

module.exports = config;
