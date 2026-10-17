/**
 * PostgreSQL-backed persistence: users, per-user key/value data, CER products,
 * compliance checks and an audit log.
 *
 * The service never throws from its constructor and never crashes the
 * process: connection problems surface through `isReady()` and the caller
 * decides how to degrade.
 */
'use strict';

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');
const logger = require('../logger');

const MAX_BACKUPS = 20;

class DatabaseService {
    constructor(options = {}) {
        const db = { ...config.database, ...options };
        this.options = db;
        this.ready = false;
        this.lastError = null;
        this.pool = null;

        if (!db.url) {
            logger.warn('DATABASE_URL not set; database features are disabled');
            return;
        }

        this.pool = new Pool({
            connectionString: db.url,
            max: db.poolMax,
            connectionTimeoutMillis: db.connectionTimeoutMs,
            idleTimeoutMillis: 30000,
            ssl: db.ssl ? { rejectUnauthorized: !db.sslInsecure } : false
        });

        // An idle client error must not take the whole process down.
        this.pool.on('error', (error) => {
            this.lastError = error;
            logger.error('PostgreSQL pool error', { message: error.message });
        });
    }

    isConfigured() {
        return Boolean(this.pool);
    }

    isReady() {
        return this.ready;
    }

    async initializeTables() {
        if (!this.pool) throw new Error('Database not configured');
        const client = await this.pool.connect();
        try {
            await client.query(`
                CREATE TABLE IF NOT EXISTS users (
                    id SERIAL PRIMARY KEY,
                    email VARCHAR(255) UNIQUE NOT NULL,
                    password_hash VARCHAR(255) NOT NULL,
                    role VARCHAR(50) NOT NULL DEFAULT 'user',
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
            `);

            await client.query(`
                CREATE TABLE IF NOT EXISTS system_data (
                    id SERIAL PRIMARY KEY,
                    key VARCHAR(255) NOT NULL,
                    value JSONB NOT NULL,
                    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
            `);
            // Older deployments had a global UNIQUE(key); per-user keys need
            // (key, user_id). Both statements are idempotent.
            await client.query('ALTER TABLE system_data DROP CONSTRAINT IF EXISTS system_data_key_key');
            await client.query(`
                CREATE UNIQUE INDEX IF NOT EXISTS system_data_key_user_idx
                ON system_data (key, COALESCE(user_id, 0))
            `);
            await client.query('CREATE INDEX IF NOT EXISTS system_data_user_idx ON system_data (user_id)');

            await client.query(`
                CREATE TABLE IF NOT EXISTS audit_log (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                    action VARCHAR(255) NOT NULL,
                    table_name VARCHAR(255),
                    record_id INTEGER,
                    old_values JSONB,
                    new_values JSONB,
                    ip_address INET,
                    user_agent TEXT,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
            `);
            await client.query('CREATE INDEX IF NOT EXISTS audit_log_user_idx ON audit_log (user_id)');
            await client.query('CREATE INDEX IF NOT EXISTS audit_log_created_idx ON audit_log (created_at DESC)');
            await client.query('CREATE INDEX IF NOT EXISTS audit_log_action_idx ON audit_log (action)');

            await client.query(`
                CREATE TABLE IF NOT EXISTS cer_products (
                    id SERIAL PRIMARY KEY,
                    model_number VARCHAR(255) NOT NULL,
                    manufacturer VARCHAR(255) NOT NULL,
                    product_type VARCHAR(100) NOT NULL,
                    cer_approval_number VARCHAR(255),
                    approval_date DATE,
                    technical_specs JSONB,
                    datasheet_url TEXT,
                    installation_manual_url TEXT,
                    verified BOOLEAN NOT NULL DEFAULT FALSE,
                    last_verified TIMESTAMPTZ,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    UNIQUE (manufacturer, model_number)
                )
            `);
            await client.query('CREATE INDEX IF NOT EXISTS cer_products_manufacturer_idx ON cer_products (lower(manufacturer))');
            await client.query('CREATE INDEX IF NOT EXISTS cer_products_type_idx ON cer_products (product_type)');

            await client.query(`
                CREATE TABLE IF NOT EXISTS standards_compliance (
                    id SERIAL PRIMARY KEY,
                    standard_code VARCHAR(50) NOT NULL,
                    standard_version VARCHAR(20) NOT NULL,
                    compliance_check_id UUID NOT NULL UNIQUE,
                    product_id INTEGER REFERENCES cer_products(id) ON DELETE SET NULL,
                    compliance_status VARCHAR(50) NOT NULL,
                    check_date TIMESTAMPTZ NOT NULL,
                    check_details JSONB,
                    auditor VARCHAR(255),
                    certificate_url TEXT,
                    expiry_date DATE
                )
            `);
            await client.query('CREATE INDEX IF NOT EXISTS standards_compliance_product_idx ON standards_compliance (product_id)');

            this.ready = true;
            this.lastError = null;
            logger.info('Database tables initialised');
        } catch (error) {
            this.ready = false;
            this.lastError = error;
            throw error;
        } finally {
            client.release();
        }
    }

    requireReady() {
        if (!this.pool || !this.ready) {
            const error = new Error('Database unavailable');
            error.status = 503;
            throw error;
        }
    }

    // ---------------------------------------------------------------- users

    async createUser(email, password, role = 'user', meta = {}) {
        this.requireReady();
        const passwordHash = await bcrypt.hash(password, config.auth.bcryptRounds);
        try {
            const result = await this.pool.query(
                'INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id, email, role',
                [email.toLowerCase(), passwordHash, role]
            );
            const user = result.rows[0];
            await this.logAction(null, 'USER_CREATED', 'users', user.id, null, { id: user.id, email: user.email, role: user.role }, meta);
            return user;
        } catch (error) {
            if (error.code === '23505') {
                const conflict = new Error('Email already exists');
                conflict.status = 409;
                throw conflict;
            }
            throw error;
        }
    }

    async authenticateUser(email, password, meta = {}) {
        this.requireReady();
        const result = await this.pool.query(
            'SELECT id, email, password_hash, role FROM users WHERE email = $1',
            [String(email).toLowerCase()]
        );

        // Always run a hash comparison so timing does not reveal whether the
        // email exists.
        const user = result.rows[0];
        const hash = user ? user.password_hash : '$2a$12$CwTycUXWue0Thq9StjUM0uJ8Z7ZJQ3YQ0zXkKq8QvFQqRkYbK3xS6';
        const isValid = await bcrypt.compare(password, hash);

        if (!user || !isValid) {
            if (user) await this.logAction(user.id, 'LOGIN_FAILED', 'users', user.id, null, null, meta);
            const error = new Error('Invalid credentials');
            error.status = 401;
            throw error;
        }

        await this.logAction(user.id, 'LOGIN_SUCCESS', 'users', user.id, null, null, meta);
        return {
            user: { id: user.id, email: user.email, role: user.role },
            token: this.issueToken(user)
        };
    }

    issueToken(user) {
        return jwt.sign(
            { userId: user.id, email: user.email, role: user.role },
            config.auth.jwtSecret,
            { expiresIn: config.auth.jwtExpiresIn, issuer: config.auth.jwtIssuer }
        );
    }

    // ----------------------------------------------------------- key/value

    async saveData(key, value, userId = null, meta = {}) {
        this.requireReady();
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            const existing = await client.query(
                'SELECT id, value FROM system_data WHERE key = $1 AND COALESCE(user_id, 0) = COALESCE($2::INTEGER, 0) FOR UPDATE',
                [key, userId]
            );

            let recordId;
            if (existing.rows.length > 0) {
                recordId = existing.rows[0].id;
                await client.query('UPDATE system_data SET value = $1, updated_at = NOW() WHERE id = $2', [value, recordId]);
                await this.logAction(userId, 'DATA_UPDATED', 'system_data', recordId, existing.rows[0].value, value, meta, client);
            } else {
                const inserted = await client.query(
                    'INSERT INTO system_data (key, value, user_id) VALUES ($1, $2, $3) RETURNING id',
                    [key, value, userId]
                );
                recordId = inserted.rows[0].id;
                await this.logAction(userId, 'DATA_CREATED', 'system_data', recordId, null, value, meta, client);
            }

            await client.query('COMMIT');
            return { success: true, id: recordId };
        } catch (error) {
            await client.query('ROLLBACK').catch(() => {});
            throw error;
        } finally {
            client.release();
        }
    }

    async getData(key, userId = null) {
        this.requireReady();
        const result = await this.pool.query(
            'SELECT value FROM system_data WHERE key = $1 AND COALESCE(user_id, 0) = COALESCE($2::INTEGER, 0)',
            [key, userId]
        );
        return result.rows.length > 0 ? result.rows[0].value : null;
    }

    // --------------------------------------------------------- CER products

    async saveCERProduct(product, meta = {}) {
        this.requireReady();
        const result = await this.pool.query(`
            INSERT INTO cer_products (
                model_number, manufacturer, product_type, cer_approval_number,
                approval_date, technical_specs, datasheet_url, installation_manual_url,
                verified, last_verified
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
            ON CONFLICT (manufacturer, model_number) DO UPDATE SET
                product_type = EXCLUDED.product_type,
                cer_approval_number = EXCLUDED.cer_approval_number,
                approval_date = EXCLUDED.approval_date,
                technical_specs = EXCLUDED.technical_specs,
                datasheet_url = EXCLUDED.datasheet_url,
                installation_manual_url = EXCLUDED.installation_manual_url,
                verified = EXCLUDED.verified,
                last_verified = NOW()
            RETURNING *
        `, [
            product.modelNumber,
            product.manufacturer,
            product.productType,
            product.cerApprovalNumber || null,
            product.approvalDate || null,
            product.technicalSpecs || null,
            product.datasheetUrl || null,
            product.installationManualUrl || null,
            Boolean(product.verified)
        ]);

        const row = result.rows[0];
        await this.logAction(meta.userId || null, 'CER_PRODUCT_SAVED', 'cer_products', row.id, null, row, meta);
        return row;
    }

    async getCERProducts(filters = {}) {
        this.requireReady();
        const clauses = [];
        const params = [];

        if (filters.manufacturer) {
            params.push(`%${filters.manufacturer}%`);
            clauses.push(`manufacturer ILIKE $${params.length}`);
        }
        if (filters.productType) {
            params.push(filters.productType);
            clauses.push(`product_type = $${params.length}`);
        }
        if (typeof filters.verified === 'boolean') {
            params.push(filters.verified);
            clauses.push(`verified = $${params.length}`);
        }

        const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
        const limit = Math.min(500, Math.max(1, parseInt(filters.limit, 10) || 100));
        const offset = Math.max(0, parseInt(filters.offset, 10) || 0);

        const [rows, count] = await Promise.all([
            this.pool.query(`SELECT * FROM cer_products ${where} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`, params),
            this.pool.query(`SELECT COUNT(*)::int AS total FROM cer_products ${where}`, params)
        ]);

        return { products: rows.rows, total: count.rows[0].total, limit, offset };
    }

    // ----------------------------------------------------------- compliance

    static versionFromCode(standardCode) {
        const match = /(\d{4})$/.exec(String(standardCode || ''));
        return match ? match[1] : 'unknown';
    }

    async recordComplianceCheck(standardCode, productId, status, details, auditor) {
        this.requireReady();
        const numericProductId = Number.isInteger(Number(productId)) ? Number(productId) : null;
        const result = await this.pool.query(`
            INSERT INTO standards_compliance (
                standard_code, standard_version, compliance_check_id,
                product_id, compliance_status, check_date, check_details, auditor
            ) VALUES ($1, $2, $3, $4, $5, NOW(), $6, $7)
            RETURNING *
        `, [
            standardCode,
            DatabaseService.versionFromCode(standardCode),
            crypto.randomUUID(),
            numericProductId,
            status,
            details || null,
            auditor || null
        ]);
        return result.rows[0];
    }

    // ---------------------------------------------------------------- audit

    async logAction(userId, action, tableName, recordId, oldValues = null, newValues = null, meta = {}, client = null) {
        if (!this.pool) return;
        const runner = client || this.pool;
        try {
            await runner.query(`
                INSERT INTO audit_log (
                    user_id, action, table_name, record_id,
                    old_values, new_values, ip_address, user_agent
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            `, [
                userId,
                action,
                tableName,
                Number.isInteger(recordId) ? recordId : null,
                oldValues === null ? null : JSON.stringify(oldValues),
                newValues === null ? null : JSON.stringify(newValues),
                meta.ip || null,
                meta.userAgent ? String(meta.userAgent).slice(0, 1000) : null
            ]);
        } catch (error) {
            // Audit logging must never break the main operation.
            logger.error('Failed to write audit log', { action, message: error.message });
        }
    }

    async getAuditLog(filters = {}) {
        this.requireReady();
        const clauses = [];
        const params = [];

        if (filters.userId) {
            params.push(parseInt(filters.userId, 10));
            clauses.push(`a.user_id = $${params.length}`);
        }
        if (filters.action) {
            params.push(filters.action);
            clauses.push(`a.action = $${params.length}`);
        }
        if (filters.startDate && !Number.isNaN(Date.parse(filters.startDate))) {
            params.push(new Date(filters.startDate));
            clauses.push(`a.created_at >= $${params.length}`);
        }
        const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
        const limit = Math.min(1000, Math.max(1, parseInt(filters.limit, 10) || 200));

        const result = await this.pool.query(`
            SELECT a.*, u.email AS user_email
            FROM audit_log a
            LEFT JOIN users u ON a.user_id = u.id
            ${where}
            ORDER BY a.created_at DESC
            LIMIT ${limit}
        `, params);
        return result.rows;
    }

    // --------------------------------------------------------------- backup

    /**
     * Writes a JSON snapshot to DATA_DIR/backups. Backups used to be stored
     * inside system_data, which meant every backup contained all previous
     * backups and the table grew exponentially.
     */
    async createBackup(backupDir) {
        this.requireReady();
        const dir = backupDir || path.join(config.dataDir, 'backups');
        await fs.mkdir(dir, { recursive: true });

        const timestamp = new Date().toISOString();
        const [users, systemData, cerProducts, compliance] = await Promise.all([
            this.pool.query('SELECT id, email, role, created_at FROM users'),
            this.pool.query('SELECT * FROM system_data'),
            this.pool.query('SELECT * FROM cer_products'),
            this.pool.query('SELECT * FROM standards_compliance')
        ]);

        const backup = {
            version: config.version,
            timestamp,
            users: users.rows,
            systemData: systemData.rows,
            cerProducts: cerProducts.rows,
            compliance: compliance.rows
        };

        const safeName = `backup-${timestamp.replace(/[:.]/g, '-')}.json`;
        const payload = JSON.stringify(backup);
        await fs.writeFile(path.join(dir, safeName), payload, 'utf8');

        // Keep the directory bounded.
        const existing = (await fs.readdir(dir)).filter((name) => name.startsWith('backup-') && name.endsWith('.json')).sort();
        for (const stale of existing.slice(0, Math.max(0, existing.length - MAX_BACKUPS))) {
            await fs.unlink(path.join(dir, stale)).catch(() => {});
        }

        logger.info('Backup created', { file: safeName, bytes: payload.length });
        return { backupId: safeName, timestamp, size: payload.length, path: path.join(dir, safeName) };
    }

    async close() {
        if (this.pool) {
            await this.pool.end();
            this.pool = null;
            this.ready = false;
        }
    }
}

module.exports = DatabaseService;
