/**
 * PRODUCTION SERVER - REPLACES STATIC HOSTING
 * Addresses Problems 8, 9, 13, 14, 17, 19, 20
 */

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const compression = require('compression');
const winston = require('winston');
require('dotenv').config();

// Import our services
const DatabaseService = require('./src/database/DatabaseService');
const SecurityService = require('./src/security/SecurityService');
const RealStandardsService = require('./src/standards/RealStandardsService');

// Configure logging
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    defaultMeta: { service: 'solarflow-server' },
    transports: [
        new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
        new winston.transports.File({ filename: 'logs/combined.log' }),
        new winston.transports.Console({
            format: winston.format.simple()
        })
    ]
});

class SolarFlowServer {
    constructor() {
        this.app = express();
        this.server = http.createServer(this.app);
        this.wss = new WebSocket.Server({ server: this.server });
        
        this.db = new DatabaseService();
        this.security = new SecurityService();
        this.standards = new RealStandardsService();
        
        this.clients = new Set();
        
        this.setupMiddleware();
        this.setupRoutes();
        this.setupWebSocket();
        this.setupErrorHandling();
    }

    setupMiddleware() {
        // Security middleware
        this.app.use(this.security.getCORSConfig());
        this.app.use(this.security.getCSPConfig());
        
        // Rate limiting
        const rateLimiters = this.security.getRateLimiters();
        this.app.use('/api/auth', rateLimiters.auth);
        this.app.use('/api', rateLimiters.general);
        
        // General middleware
        this.app.use(compression());
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
        
        // Request logging
        this.app.use(this.security.middleware().logRequest);
        
        // Static files
        this.app.use(express.static(path.join(__dirname, 'docs')));
        
        logger.info('✅ Middleware configured');
    }

    setupRoutes() {
        // Authentication routes
        this.app.post('/api/auth/register', async (req, res) => {
            try {
                const userData = this.security.validateAndSanitize(req.body, this.security.getSchemas().user);
                const user = await this.db.createUser(userData.email, userData.password);
                
                res.status(201).json({
                    success: true,
                    message: 'User created successfully',
                    user: { id: user.id, email: user.email, role: user.role }
                });
            } catch (error) {
                logger.error('Registration failed:', error);
                res.status(400).json({ error: error.message });
            }
        });

        this.app.post('/api/auth/login', async (req, res) => {
            try {
                const { email, password } = req.body;
                const ip = req.ip || req.connection.remoteAddress;
                
                // Check brute force protection
                const bruteCheck = this.security.checkBruteForce(ip, email);
                if (!bruteCheck.allowed) {
                    return res.status(429).json({
                        error: 'Too many failed attempts',
                        retryAfter: Math.ceil(bruteCheck.remaining / 1000)
                    });
                }
                
                try {
                    const result = await this.db.authenticateUser(email, password);
                    this.security.clearFailedAttempts(ip, email);
                    
                    res.json({
                        success: true,
                        token: result.token,
                        user: result.user
                    });
                } catch (authError) {
                    this.security.recordFailedAttempt(ip, email);
                    throw authError;
                }
            } catch (error) {
                logger.error('Login failed:', error);
                res.status(401).json({ error: 'Authentication failed' });
            }
        });

        // Protected data routes
        const auth = this.security.middleware().authenticate;
        
        this.app.get('/api/data/:key', auth, async (req, res) => {
            try {
                if (!this.db) {
                    return res.status(503).json({ error: "Database unavailable" });
                }
                
                const data = await this.db.getData(req.params.key, req.user.userId);
                res.json({ success: true, data });
            } catch (error) {
                logger.error('Data retrieval failed:', error);
                res.status(500).json({ error: 'Data retrieval failed' });
            }
        });

        this.app.post('/api/data/:key', auth, async (req, res) => {
            try {
                if (!this.db) {
                    return res.status(503).json({ error: "Database unavailable" });
                }
                
                const result = await this.db.saveData(req.params.key, req.body, req.user.userId);
                
                // Broadcast to WebSocket clients
                this.broadcast({
                    type: 'data_update',
                    key: req.params.key,
                    userId: req.user.userId,
                    timestamp: new Date().toISOString()
                });
                
                res.json(result);
            } catch (error) {
                logger.error('Data save failed:', error);
                res.status(500).json({ error: 'Data save failed' });
            }
        });

        // CER Products API
        this.app.get('/api/cer-products', async (req, res) => {
            try {
                if (!this.db) {
                    return res.status(503).json({ error: "Database unavailable" });
                }
                
                const filters = {
                    manufacturer: req.query.manufacturer,
                    productType: req.query.type,
                    verified: req.query.verified === 'true',
                    limit: parseInt(req.query.limit) || 100
                };
                
                const products = await this.db.getCERProducts(filters);
                res.json({ success: true, products, count: products.length });
            } catch (error) {
                logger.error('CER products retrieval failed:', error);
                res.status(500).json({ error: 'Failed to retrieve CER products' });
            }
        });

        this.app.post('/api/cer-products', auth, async (req, res) => {
            try {
                const productData = this.security.validateAndSanitize(req.body, this.security.getSchemas().cerProduct);
                const product = await this.db.saveCERProduct(productData);
                
                res.status(201).json({ success: true, product });
            } catch (error) {
                logger.error('CER product creation failed:', error);
                res.status(400).json({ error: error.message });
            }
        });

        // Standards API
        this.app.get('/api/standards', async (req, res) => {
            try {
                const standards = await this.standards.getLocalStandards();
                res.json({ success: true, standards });
            } catch (error) {
                logger.error('Standards retrieval failed:', error);
                res.status(500).json({ error: 'Failed to retrieve standards' });
            }
        });

        this.app.post('/api/standards/refresh', auth, async (req, res) => {
            try {
                const standards = await this.standards.fetchPublicStandardsContent();
                res.json({ success: true, standards, message: 'Standards refreshed successfully' });
            } catch (error) {
                logger.error('Standards refresh failed:', error);
                res.status(500).json({ error: 'Failed to refresh standards' });
            }
        });

        // Compliance checking API
        this.app.post('/api/compliance/check', auth, async (req, res) => {
            try {
                const { installation_data, standard_code } = req.body;
                
                if (!installation_data || !standard_code) {
                    return res.status(400).json({ error: 'Missing installation_data or standard_code' });
                }
                
                const result = await this.standards.checkCompliance(installation_data, standard_code);
                
                // Record compliance check
                if (installation_data.product_id) {
                    await this.db.recordComplianceCheck(
                        standard_code,
                        installation_data.product_id,
                        result.overall_status,
                        result,
                        req.user.email
                    );
                }
                
                res.json({ success: true, compliance: result });
            } catch (error) {
                logger.error('Compliance check failed:', error);
                res.status(500).json({ error: error.message });
            }
        });

        // Audit log API
        this.app.get('/api/audit', auth, this.security.middleware().requireRole('admin'), async (req, res) => {
            try {
                const filters = {
                    userId: req.query.userId,
                    action: req.query.action,
                    startDate: req.query.startDate
                };
                
                const logs = await this.db.getAuditLog(filters);
                res.json({ success: true, logs, count: logs.length });
            } catch (error) {
                logger.error('Audit log retrieval failed:', error);
                res.status(500).json({ error: 'Failed to retrieve audit logs' });
            }
        });

        // Backup API
        this.app.post('/api/backup', auth, this.security.middleware().requireRole('admin'), async (req, res) => {
            try {
                const backup = await this.db.createBackup();
                res.json({ success: true, backup });
            } catch (error) {
                logger.error('Backup failed:', error);
                res.status(500).json({ error: 'Backup failed' });
            }
        });

        // Health check
        this.app.get('/health', async (req, res) => {
            const health = {
                status: 'healthy',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                database: this.db ? 'connected' : 'unavailable',
                services: {
                    database: this.db ? 'healthy' : 'unavailable',
                    standards: 'healthy',
                    security: 'healthy'
                }
            };
            
            res.json(health);
        });

        // Serve main application
        this.app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, 'docs', 'index.html'));
        });

        logger.info('✅ Routes configured');
    }

    setupWebSocket() {
        this.wss.on('connection', (ws, req) => {
            logger.info(`WebSocket client connected: ${req.socket.remoteAddress}`);
            this.clients.add(ws);
            
            ws.on('message', (message) => {
                try {
                    const data = JSON.parse(message);
                    logger.debug('WebSocket message received:', data);
                    
                    // Handle different message types
                    switch (data.type) {
                        case 'ping':
                            ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
                            break;
                        case 'subscribe':
                            ws.subscriptions = data.channels || [];
                            break;
                        default:
                            logger.warn('Unknown WebSocket message type:', data.type);
                    }
                } catch (error) {
                    logger.error('WebSocket message error:', error);
                }
            });
            
            ws.on('close', () => {
                logger.info('WebSocket client disconnected');
                this.clients.delete(ws);
            });
            
            ws.on('error', (error) => {
                logger.error('WebSocket error:', error);
                this.clients.delete(ws);
            });
        });
        
        logger.info('✅ WebSocket server configured');
    }

    broadcast(message) {
        const payload = JSON.stringify(message);
        this.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(payload);
            }
        });
    }

    setupErrorHandling() {
        // Global error handler
        this.app.use((error, req, res, next) => {
            logger.error('Unhandled error:', error);
            
            if (res.headersSent) {
                return next(error);
            }
            
            res.status(500).json({
                error: 'Internal server error',
                requestId: req.id,
                timestamp: new Date().toISOString()
            });
        });

        // 404 handler
        this.app.use((req, res) => {
            res.status(404).json({
                error: 'Not found',
                path: req.path,
                method: req.method
            });
        });

        // Process error handling
        process.on('uncaughtException', (error) => {
            logger.error('Uncaught exception:', error);
            process.exit(1);
        });

        process.on('unhandledRejection', (reason, promise) => {
            logger.error('Unhandled rejection at:', promise, 'reason:', reason);
        });

        logger.info('✅ Error handling configured');
    }

    async start() {
        const port = process.env.PORT || 3000;
        
        try {
            // Start HTTP server first (always succeeds)
            await this.startHttpServer(port);
        } catch (err) {
            logger.error("❌ HTTP server failed to start", err);
            process.exit(1);
        }

        // DB connects AFTER server is alive
        this.initDatabase();
    }

    async startHttpServer(port) {
        return new Promise((resolve, reject) => {
            this.server.listen(port, (err) => {
                if (err) {
                    reject(err);
                } else {
                    logger.info(`🚀 SolarFlow server running on port ${port}`);
                    logger.info(`📊 Health check: http://localhost:${port}/health`);
                    logger.info(`🌐 Application: http://localhost:${port}`);
                    logger.info(`🔗 WebSocket: ws://localhost:${port}`);
                    resolve();
                }
            });
        });
    }

    async initDatabase() {
        try {
            await this.db.initializeTables();
            logger.info("✅ Database connected");
        } catch (err) {
            logger.error("❌ Database unavailable", err);
            this.db = null;

            // Retry loop (Google style)
            logger.info("🔄 Retrying database connection in 10 seconds...");
            setTimeout(() => this.initDatabase(), 10000);
        }
    }

    async stop() {
        logger.info('🛑 Shutting down server...');
        
        // Close WebSocket connections
        this.clients.forEach(client => {
            client.close();
        });
        
        // Close database connection
        await this.db.close();
        
        // Close HTTP server
        this.server.close(() => {
            logger.info('✅ Server stopped');
            process.exit(0);
        });
    }
}

// Start server
const server = new SolarFlowServer();

// Graceful shutdown
process.on('SIGTERM', () => server.stop());
process.on('SIGINT', () => server.stop());

server.start();