/**
 * CLEAN WORKING SERVER - NO DEPENDENCIES REQUIRED
 * Uses only built-in Node.js modules for immediate testing
 */

const http = require('http');
const fs = require('fs').promises;
const path = require('path');
const url = require('url');

class WorkingServer {
    constructor() {
        this.port = process.env.PORT || 3000;
        this.staticDir = path.join(__dirname, 'docs');
        console.log(`🔧 Initializing server on port ${this.port}`);
        console.log(`📁 Static files from: ${this.staticDir}`);
    }

    getMimeType(ext) {
        const mimeTypes = {
            '.html': 'text/html; charset=utf-8',
            '.css': 'text/css',
            '.js': 'application/javascript',
            '.json': 'application/json',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.gif': 'image/gif',
            '.svg': 'image/svg+xml',
            '.ico': 'image/x-icon',
            '.pdf': 'application/pdf'
        };
        return mimeTypes[ext] || 'application/octet-stream';
    }

    log(message, level = 'info') {
        const timestamp = new Date().toISOString();
        const prefix = {
            info: '✅',
            warn: '⚠️',
            error: '❌',
            debug: '🔍'
        }[level] || 'ℹ️';
        
        console.log(`${prefix} [${timestamp}] ${message}`);
    }

    async handleRequest(req, res) {
        const parsedUrl = url.parse(req.url, true);
        const pathname = parsedUrl.pathname;
        const method = req.method;

        this.log(`${method} ${pathname}`, 'debug');

        // Set security headers
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('X-XSS-Protection', '1; mode=block');

        try {
            // Health check endpoint
            if (pathname === '/health') {
                const health = {
                    status: 'healthy',
                    timestamp: new Date().toISOString(),
                    uptime: process.uptime(),
                    memory: process.memoryUsage(),
                    version: '1.0.0',
                    environment: process.env.NODE_ENV || 'development'
                };
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(health, null, 2));
                return;
            }

            // API endpoints (placeholder responses)
            if (pathname.startsWith('/api/')) {
                if (pathname === '/api/status') {
                    const status = {
                        server: 'running',
                        database: 'not connected',
                        services: {
                            static: 'active',
                            api: 'limited'
                        }
                    };
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(status, null, 2));
                    return;
                }

                // Generic API response
                const apiResponse = {
                    error: 'Service Initializing',
                    message: 'Full API will be available after dependency installation',
                    timestamp: new Date().toISOString(),
                    endpoint: pathname
                };
                
                res.writeHead(503, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(apiResponse, null, 2));
                return;
            }

            // Static file serving
            await this.serveStaticFile(req, res, pathname);

        } catch (error) {
            this.log(`Request error: ${error.message}`, 'error');
            
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                error: 'Internal Server Error',
                timestamp: new Date().toISOString()
            }));
        }
    }

    async serveStaticFile(req, res, pathname) {
        // Default to index.html for root
        let filePath = pathname === '/' ? 
            path.join(this.staticDir, 'index.html') :
            path.join(this.staticDir, pathname);

        // Security: ensure file is within static directory
        const resolvedPath = path.resolve(filePath);
        const resolvedStaticDir = path.resolve(this.staticDir);
        
        if (!resolvedPath.startsWith(resolvedStaticDir)) {
            res.writeHead(403, { 'Content-Type': 'text/plain' });
            res.end('403 Forbidden - Access denied');
            return;
        }

        try {
            const stats = await fs.stat(filePath);
            
            if (stats.isDirectory()) {
                // Try index.html in directory
                filePath = path.join(filePath, 'index.html');
                await fs.stat(filePath); // Will throw if doesn't exist
            }

            const content = await fs.readFile(filePath);
            const ext = path.extname(filePath);
            const mimeType = this.getMimeType(ext);

            // Set cache headers for static assets
            if (ext === '.css' || ext === '.js' || ext.match(/\.(png|jpg|gif|svg|ico)$/)) {
                res.setHeader('Cache-Control', 'public, max-age=3600'); // 1 hour
            }

            res.writeHead(200, { 
                'Content-Type': mimeType,
                'Content-Length': content.length
            });
            res.end(content);

        } catch (error) {
            if (error.code === 'ENOENT') {
                // 404 - File not found
                const notFoundHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>404 - Page Not Found</title>
    <style>
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-align: center;
            padding: 50px;
            margin: 0;
        }
        .container { 
            max-width: 600px;
            margin: 0 auto;
            background: rgba(255,255,255,0.1);
            padding: 40px;
            border-radius: 15px;
            backdrop-filter: blur(10px);
        }
        h1 { font-size: 3em; margin-bottom: 20px; }
        p { font-size: 1.2em; margin-bottom: 30px; }
        a { 
            color: #fff;
            text-decoration: none;
            background: rgba(255,255,255,0.2);
            padding: 12px 24px;
            border-radius: 25px;
            display: inline-block;
            transition: all 0.3s;
        }
        a:hover {
            background: rgba(255,255,255,0.3);
            transform: translateY(-2px);
        }
        .path { 
            background: rgba(0,0,0,0.3);
            padding: 10px;
            border-radius: 5px;
            font-family: monospace;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 SolarFlow Server</h1>
        <h2>404 - Page Not Found</h2>
        <div class="path">Requested: ${pathname}</div>
        <p>The page you're looking for doesn't exist.</p>
        <p><a href="/">🏠 Go to Home</a></p>
        <p><a href="/health">📊 Server Health</a></p>
    </div>
</body>
</html>`;
                
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end(notFoundHtml);
            } else {
                // Other file system error
                throw error;
            }
        }
    }

    async start() {
        const server = http.createServer((req, res) => {
            this.handleRequest(req, res).catch(error => {
                this.log(`Unhandled request error: ${error.message}`, 'error');
                
                if (!res.headersSent) {
                    res.writeHead(500, { 'Content-Type': 'text/plain' });
                    res.end('Internal Server Error');
                }
            });
        });

        // Error handling
        server.on('error', (error) => {
            if (error.code === 'EADDRINUSE') {
                this.log(`Port ${this.port} is already in use`, 'error');
                process.exit(1);
            } else {
                this.log(`Server error: ${error.message}`, 'error');
            }
        });

        // Start listening
        server.listen(this.port, () => {
            this.log(`🚀 SolarFlow server running on port ${this.port}`);
            this.log(`📊 Health check: http://localhost:${this.port}/health`);
            this.log(`🌐 Application: http://localhost:${this.port}`);
            this.log(`📁 Static files from: ${this.staticDir}`);
            this.log(`✅ Server ready for connections`);
        });

        // Graceful shutdown handlers
        const gracefulShutdown = (signal) => {
            this.log(`🛑 Received ${signal}, shutting down gracefully...`);
            
            server.close(() => {
                this.log(`✅ Server stopped`);
                process.exit(0);
            });

            // Force shutdown after 10 seconds
            setTimeout(() => {
                this.log(`❌ Forced shutdown after timeout`);
                process.exit(1);
            }, 10000);
        };

        process.on('SIGTERM', gracefulShutdown);
        process.on('SIGINT', gracefulShutdown);

        // Handle uncaught exceptions
        process.on('uncaughtException', (error) => {
            this.log(`💥 Uncaught exception: ${error.message}`, 'error');
            this.log(`Stack: ${error.stack}`, 'error');
            process.exit(1);
        });

        process.on('unhandledRejection', (reason, promise) => {
            this.log(`🚫 Unhandled rejection: ${reason}`, 'error');
            this.log(`Promise: ${promise}`, 'error');
        });

        return server;
    }
}

// Auto-start if run directly
if (require.main === module) {
    const server = new WorkingServer();
    server.start().catch(error => {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    });
}

module.exports = WorkingServer;