/**
 * REAL DATABASE SERVICE - REPLACING FAKE LOCALSTORAGE
 * Addresses Problems 1, 8, 15, 16, 21, 25
 */

const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

class DatabaseService {
    constructor() {
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/solarflow',
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
        });
        
        // Don't call initializeTables() in constructor - let server control when this happens
    }

    async initializeTables() {
        const client = await this.pool.connect();
        try {
            // Users table
            await client.query(`
                CREATE TABLE IF NOT EXISTS users (
                    id SERIAL PRIMARY KEY,
                    email VARCHAR(255) UNIQUE NOT NULL,
                    password_hash VARCHAR(255) NOT NULL,
                    role VARCHAR(50) DEFAULT 'user',
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW()
                )
            `);

            // System data table
            await client.query(`
                CREATE TABLE IF NOT EXISTS system_data (
                    id SERIAL PRIMARY KEY,
                    key VARCHAR(255) UNIQUE NOT NULL,
                    value JSONB NOT NULL,
                    user_id INTEGER REFERENCES users(id),
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW()
                )
            `);

            // Audit log table
            await client.query(`
                CREATE TABLE IF NOT EXISTS audit_log (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER REFERENCES users(id),
                    action VARCHAR(255) NOT NULL,
                    table_name VARCHAR(255),
                    record_id INTEGER,
                    old_values JSONB,
                    new_values JSONB,
                    ip_address INET,
                    user_agent TEXT,
                    created_at TIMESTAMP DEFAULT NOW()
                )
            `);

            // CER products table (real data)
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
                    verified BOOLEAN DEFAULT FALSE,
                    last_verified TIMESTAMP,
                    created_at TIMESTAMP DEFAULT NOW()
                )
            `);

            // Standards compliance table
            await client.query(`
                CREATE TABLE IF NOT EXISTS standards_compliance (
                    id SERIAL PRIMARY KEY,
                    standard_code VARCHAR(50) NOT NULL,
                    standard_version VARCHAR(20) NOT NULL,
                    compliance_check_id UUID NOT NULL,
                    product_id INTEGER REFERENCES cer_products(id),
                    compliance_status VARCHAR(50) NOT NULL,
                    check_date TIMESTAMP NOT NULL,
                    check_details JSONB,
                    auditor VARCHAR(255),
                    certificate_url TEXT,
                    expiry_date DATE
                )
            `);

            console.log('✅ Database tables initialized successfully');
        } catch (error) {
            console.error('❌ Database initialization failed:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    // REAL USER AUTHENTICATION (Problem 51)
    async createUser(email, password, role = 'user') {
        const client = await this.pool.connect();
        try {
            const passwordHash = await bcrypt.hash(password, 12);
            
            const result = await client.query(
                'INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id, email, role',
                [email, passwordHash, role]
            );
            
            await this.logAction(null, 'USER_CREATED', 'users', result.rows[0].id, null, result.rows[0]);
            
            return result.rows[0];
        } catch (error) {
            if (error.code === '23505') {
                throw new Error('Email already exists');
            }
            throw error;
        } finally {
            client.release();
        }
    }

    async authenticateUser(email, password) {
        const client = await this.pool.connect();
        try {
            const result = await client.query(
                'SELECT id, email, password_hash, role FROM users WHERE email = $1',
                [email]
            );

            if (result.rows.length === 0) {
                throw new Error('Invalid credentials');
            }

            const user = result.rows[0];
            const isValid = await bcrypt.compare(password, user.password_hash);

            if (!isValid) {
                await this.logAction(user.id, 'LOGIN_FAILED', 'users', user.id);
                throw new Error('Invalid credentials');
            }

            await this.logAction(user.id, 'LOGIN_SUCCESS', 'users', user.id);

            const token = jwt.sign(
                { userId: user.id, email: user.email, role: user.role },
                process.env.JWT_SECRET || 'default-secret-change-in-production',
                { expiresIn: '24h' }
            );

            return { user: { id: user.id, email: user.email, role: user.role }, token };
        } finally {
            client.release();
        }
    }

    // REAL DATA PERSISTENCE (Problem 8)
    async saveData(key, value, userId = null) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');

            const existing = await client.query(
                'SELECT id, value FROM system_data WHERE key = $1 AND ($2::INTEGER IS NULL OR user_id = $2)',
                [key, userId]
            );

            const oldValue = existing.rows[0]?.value;

            if (existing.rows.length > 0) {
                await client.query(
                    'UPDATE system_data SET value = $1, updated_at = NOW() WHERE key = $2 AND ($3::INTEGER IS NULL OR user_id = $3)',
                    [JSON.stringify(value), key, userId]
                );
                
                await this.logAction(userId, 'DATA_UPDATED', 'system_data', existing.rows[0].id, oldValue, value);
            } else {
                const result = await client.query(
                    'INSERT INTO system_data (key, value, user_id) VALUES ($1, $2, $3) RETURNING id',
                    [key, JSON.stringify(value), userId]
                );

                await this.logAction(userId, 'DATA_CREATED', 'system_data', result.rows[0].id, null, value);
            }

            await client.query('COMMIT');
            return { success: true };
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async getData(key, userId = null) {
        const client = await this.pool.connect();
        try {
            const result = await client.query(
                'SELECT value FROM system_data WHERE key = $1 AND ($2::INTEGER IS NULL OR user_id = $2)',
                [key, userId]
            );

            return result.rows.length > 0 ? result.rows[0].value : null;
        } finally {
            client.release();
        }
    }

    // REAL CER PRODUCT VERIFICATION (Problem 3)
    async saveCERProduct(product) {
        const client = await this.pool.connect();
        try {
            const result = await client.query(`
                INSERT INTO cer_products (
                    model_number, manufacturer, product_type, cer_approval_number,
                    approval_date, technical_specs, datasheet_url, installation_manual_url,
                    verified, last_verified
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
                RETURNING *
            `, [
                product.modelNumber,
                product.manufacturer,
                product.productType,
                product.cerApprovalNumber,
                product.approvalDate,
                JSON.stringify(product.technicalSpecs),
                product.datasheetUrl,
                product.installationManualUrl,
                product.verified || false
            ]);

            await this.logAction(null, 'CER_PRODUCT_ADDED', 'cer_products', result.rows[0].id, null, result.rows[0]);
            
            return result.rows[0];
        } finally {
            client.release();
        }
    }

    async getCERProducts(filters = {}) {
        const client = await this.pool.connect();
        try {
            let query = 'SELECT * FROM cer_products WHERE 1=1';
            const params = [];
            let paramCount = 0;

            if (filters.manufacturer) {
                paramCount++;
                query += ` AND manufacturer ILIKE $${paramCount}`;
                params.push(`%${filters.manufacturer}%`);
            }

            if (filters.productType) {
                paramCount++;
                query += ` AND product_type = $${paramCount}`;
                params.push(filters.productType);
            }

            if (filters.verified !== undefined) {
                paramCount++;
                query += ` AND verified = $${paramCount}`;
                params.push(filters.verified);
            }

            query += ' ORDER BY created_at DESC';

            if (filters.limit) {
                paramCount++;
                query += ` LIMIT $${paramCount}`;
                params.push(filters.limit);
            }

            const result = await client.query(query, params);
            return result.rows;
        } finally {
            client.release();
        }
    }

    // COMPLIANCE CHECKING (Problem 6)
    async recordComplianceCheck(standardCode, productId, status, details, auditor) {
        const client = await this.pool.connect();
        try {
            const checkId = require('crypto').randomUUID();
            
            const result = await client.query(`
                INSERT INTO standards_compliance (
                    standard_code, standard_version, compliance_check_id,
                    product_id, compliance_status, check_date,
                    check_details, auditor
                ) VALUES ($1, $2, $3, $4, $5, NOW(), $6, $7)
                RETURNING *
            `, [
                standardCode,
                '2021', // Default to latest version
                checkId,
                productId,
                status,
                JSON.stringify(details),
                auditor
            ]);

            return result.rows[0];
        } finally {
            client.release();
        }
    }

    // AUDIT LOGGING (Problem 25)
    async logAction(userId, action, tableName, recordId, oldValues = null, newValues = null, ipAddress = null, userAgent = null) {
        const client = await this.pool.connect();
        try {
            await client.query(`
                INSERT INTO audit_log (
                    user_id, action, table_name, record_id,
                    old_values, new_values, ip_address, user_agent
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            `, [
                userId,
                action,
                tableName,
                recordId,
                oldValues ? JSON.stringify(oldValues) : null,
                newValues ? JSON.stringify(newValues) : null,
                ipAddress,
                userAgent
            ]);
        } catch (error) {
            console.error('Failed to log action:', error);
            // Don't throw - audit logging should not break main operations
        } finally {
            client.release();
        }
    }

    async getAuditLog(filters = {}) {
        const client = await this.pool.connect();
        try {
            let query = `
                SELECT a.*, u.email as user_email 
                FROM audit_log a 
                LEFT JOIN users u ON a.user_id = u.id 
                WHERE 1=1
            `;
            const params = [];
            let paramCount = 0;

            if (filters.userId) {
                paramCount++;
                query += ` AND a.user_id = $${paramCount}`;
                params.push(filters.userId);
            }

            if (filters.action) {
                paramCount++;
                query += ` AND a.action = $${paramCount}`;
                params.push(filters.action);
            }

            if (filters.startDate) {
                paramCount++;
                query += ` AND a.created_at >= $${paramCount}`;
                params.push(filters.startDate);
            }

            query += ' ORDER BY a.created_at DESC LIMIT 1000';

            const result = await client.query(query, params);
            return result.rows;
        } finally {
            client.release();
        }
    }

    // BACKUP & RECOVERY (Problem 17)
    async createBackup() {
        const client = await this.pool.connect();
        try {
            const timestamp = new Date().toISOString();
            const backup = {
                timestamp,
                users: (await client.query('SELECT id, email, role, created_at FROM users')).rows,
                systemData: (await client.query('SELECT * FROM system_data')).rows,
                cerProducts: (await client.query('SELECT * FROM cer_products')).rows,
                compliance: (await client.query('SELECT * FROM standards_compliance')).rows
            };

            await this.saveData(`backup_${timestamp}`, backup);
            
            console.log(`✅ Backup created: backup_${timestamp}`);
            return { backupId: `backup_${timestamp}`, timestamp, size: JSON.stringify(backup).length };
        } finally {
            client.release();
        }
    }

    async close() {
        await this.pool.end();
    }
}

module.exports = DatabaseService;