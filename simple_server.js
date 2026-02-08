/**
 * MINIMAL WORKING SERVER - QUICK TEST
 * Only uses built-in Node.js modules
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

class SimpleServer {
    constructor() {
        this.port = process.env.PORT || 3000;
        this.staticDir = path.join(__dirname, 'docs');
    }

    getMimeType(ext) {
        const mimeTypes = {
            '.html': 'text/html',
            '.css': 'text/css',
            '.js': 'application/javascript',
            '.json': 'application/json',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.gif': 'image/gif',
            '.svg': 'image/svg+xml'
        };
        return mimeTypes[ext] || 'application/octet-stream';
    }

    start() {
        const server = http.createServer((req, res) => {
            console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
            
            // Parse URL
            const parsedUrl = url.parse(req.url, true);
            const pathname = parsedUrl.pathname;

            // Health check
            if (pathname === '/health') {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    status: 'healthy',
                    timestamp: new Date().toISOString(),
                    uptime: process.uptime(),
                    memory: process.memoryUsage()
                }));
                return;
            }

            // API placeholder
            if (pathname.startsWith('/api/')) {
                res.writeHead(503, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    error: 'API not yet implemented',
                    message: 'Database dependencies installing...'
                }));
                return;
            }

            // Static file serving
            let filePath = pathname === '/' ? 
                path.join(this.staticDir, 'index.html') :
                path.join(this.staticDir, pathname);

            // Security check
            if (!filePath.startsWith(this.staticDir)) {
                res.writeHead(403, { 'Content-Type': 'text/plain' });
                res.end('403 Forbidden');
                return;
            }

            fs.readFile(filePath, (err, content) => {
                if (err) {
                    if (err.code === 'ENOENT') {
                        res.writeHead(404, { 'Content-Type': 'text/html' });
                        res.end(`
                            <html>
                                <head><title>404 Not Found</title></head>
                                <body>
                                    <h1>404 Not Found</h1>
                                    <p>File not found: ${pathname}</p>
                                    <p><a href="/">Go to home</a></p>
                                </body>
                            </html>
                        `);
                    } else {
                        res.writeHead(500, { 'Content-Type': 'text/plain' });
                        res.end('500 Internal Server Error');
                    }
                } else {
                    const ext = path.extname(filePath);
                    const mimeType = this.getMimeType(ext);
                    
                    res.writeHead(200, { 'Content-Type': mimeType });
                    res.end(content);
                }
            });
        });

        server.listen(this.port, () => {
            console.log(`🚀 Simple SolarFlow server running on port ${this.port}`);
            console.log(`📊 Health check: http://localhost:${this.port}/health`);
            console.log(`🌐 Application: http://localhost:${this.port}`);
            console.log(`✅ Static files: ${this.staticDir}`);
        });

        // Graceful shutdown
        process.on('SIGTERM', () => {
            console.log('🛑 Shutting down...');
            server.close(() => {
                console.log('✅ Server stopped');
                process.exit(0);
            });
        });

        process.on('SIGINT', () => {
            console.log('🛑 Shutting down...');
            server.close(() => {
                console.log('✅ Server stopped');
                process.exit(0);
            });
        });
    }
}

// Start server
const server = new SimpleServer();
server.start();