/**
 * VPS SERVER FOR OPENCLAW HOSTINGER DEPLOYMENT
 * Real-time data persistence and knowledge growth system
 */

const express = require('express');
const WebSocket = require('ws');
const fs = require('fs').promises;
const path = require('path');

class OpenClawVPSServer {
    constructor() {
        this.app = express();
        this.dataPath = '/opt/openclaw/data';
        this.knowledgeBase = {};
        this.clients = new Set();
        
        this.setupMiddleware();
        this.setupRoutes();
        this.initializeData();
    }
    
    setupMiddleware() {
        this.app.use(express.json({ limit: '50mb' }));
        this.app.use(express.static('docs'));
        
        // CORS for development
        this.app.use((req, res, next) => {
            res.header('Access-Control-Allow-Origin', '*');
            res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
            res.header('Access-Control-Allow-Headers', 'Content-Type');
            next();
        });
        
        console.log('🔧 VPS Server middleware configured');
    }
    
    setupRoutes() {
        // Quantum consciousness state
        this.app.get('/api/quantum/state', (req, res) => {
            this.getState('quantum', res);
        });
        
        this.app.post('/api/quantum/state', (req, res) => {
            this.saveState('quantum', req.body, res);
        });
        
        // Autonomous civilization state
        this.app.get('/api/civilization/state', (req, res) => {
            this.getState('civilization', res);
        });
        
        this.app.post('/api/civilization/state', (req, res) => {
            this.saveState('civilization', req.body, res);
        });
        
        // Minion roster state
        this.app.get('/api/minions/state', (req, res) => {
            this.getState('minions', res);
        });
        
        this.app.post('/api/minions/state', (req, res) => {
            this.saveState('minions', req.body, res);
        });
        
        // Knowledge base (growing knowledge system)
        this.app.get('/api/knowledge/state', (req, res) => {
            this.getKnowledge(res);
        });
        
        this.app.post('/api/knowledge/state', (req, res) => {
            this.saveKnowledge(req.body, res);
        });
        
        // Health check
        this.app.get('/api/health', (req, res) => {
            res.json({
                status: 'healthy',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                clients: this.clients.size
            });
        });
        
        console.log('🛣️  VPS Server routes configured');
    }
    
    async initializeData() {
        try {
            await fs.mkdir(this.dataPath, { recursive: true });
            
            // Load existing knowledge base
            try {
                const knowledgeFile = path.join(this.dataPath, 'knowledge.json');
                const data = await fs.readFile(knowledgeFile, 'utf8');
                this.knowledgeBase = JSON.parse(data);
                console.log('📚 Knowledge base loaded from VPS storage');
            } catch (error) {
                this.knowledgeBase = {
                    documents: [],
                    compliance_data: { checks_performed: [], standards_verified: [] },
                    user_interactions: { button_clicks: [], page_visits: [] },
                    learning_patterns: { common_workflows: [], error_patterns: [] },
                    created: new Date().toISOString()
                };
                console.log('🆕 Initialized new knowledge base');
            }
            
            console.log('✅ VPS data storage initialized');
        } catch (error) {
            console.error('❌ Failed to initialize VPS data:', error);
        }
    }
    
    async getState(type, res) {
        try {
            const filePath = path.join(this.dataPath, `${type}-state.json`);
            
            try {
                const data = await fs.readFile(filePath, 'utf8');
                const state = JSON.parse(data);
                
                res.json({
                    success: true,
                    state: state,
                    lastUpdated: state.timestamp || null
                });
                
                console.log(`📤 Sent ${type} state to client`);
                
            } catch (error) {
                // File doesn't exist or is invalid
                res.json({
                    success: true,
                    state: null,
                    message: 'No saved state found'
                });
            }
            
        } catch (error) {
            console.error(`Error getting ${type} state:`, error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    
    async saveState(type, data, res) {
        try {
            const filePath = path.join(this.dataPath, `${type}-state.json`);
            
            const stateData = {
                ...data,
                timestamp: new Date().toISOString(),
                version: '1.0',
                source: 'openclaw-frontend'
            };
            
            await fs.writeFile(filePath, JSON.stringify(stateData, null, 2));
            
            // Broadcast update to connected clients
            this.broadcastUpdate(type, stateData);
            
            res.json({
                success: true,
                message: `${type} state saved successfully`,
                timestamp: stateData.timestamp
            });
            
            console.log(`💾 Saved ${type} state to VPS storage`);
            
        } catch (error) {
            console.error(`Error saving ${type} state:`, error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    
    async getKnowledge(res) {
        try {
            res.json({
                success: true,
                state: this.knowledgeBase,
                lastUpdated: this.knowledgeBase.lastUpdated || null,
                stats: {
                    documents: this.knowledgeBase.documents?.length || 0,
                    compliance_checks: this.knowledgeBase.compliance_data?.checks_performed?.length || 0,
                    interactions: this.knowledgeBase.user_interactions?.button_clicks?.length || 0
                }
            });
            
            console.log('🧠 Sent knowledge base to client');
            
        } catch (error) {
            console.error('Error getting knowledge:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    
    async saveKnowledge(newData, res) {
        try {
            // Merge new knowledge with existing
            this.mergeKnowledgeData(newData);
            
            // Save to file
            const filePath = path.join(this.dataPath, 'knowledge.json');
            await fs.writeFile(filePath, JSON.stringify(this.knowledgeBase, null, 2));
            
            // Broadcast knowledge update
            this.broadcastUpdate('knowledge', this.knowledgeBase);
            
            res.json({
                success: true,
                message: 'Knowledge base updated successfully',
                timestamp: this.knowledgeBase.lastUpdated,
                stats: {
                    documents: this.knowledgeBase.documents?.length || 0,
                    compliance_checks: this.knowledgeBase.compliance_data?.checks_performed?.length || 0
                }
            });
            
            console.log('🧠 Knowledge base updated and saved to VPS');
            
        } catch (error) {
            console.error('Error saving knowledge:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    
    mergeKnowledgeData(newData) {
        this.knowledgeBase.lastUpdated = new Date().toISOString();
        
        // Merge documents
        if (newData.documents) {
            this.knowledgeBase.documents = this.knowledgeBase.documents || [];
            newData.documents.forEach(doc => {
                if (!this.knowledgeBase.documents.find(existing => existing.id === doc.id)) {
                    this.knowledgeBase.documents.push(doc);
                }
            });
        }
        
        // Merge compliance data
        if (newData.compliance_data) {
            this.knowledgeBase.compliance_data = this.knowledgeBase.compliance_data || {
                checks_performed: [], standards_verified: []
            };
            
            if (newData.compliance_data.checks_performed) {
                this.knowledgeBase.compliance_data.checks_performed.push(
                    ...newData.compliance_data.checks_performed
                );
            }
            
            if (newData.compliance_data.standards_verified) {
                this.knowledgeBase.compliance_data.standards_verified.push(
                    ...newData.compliance_data.standards_verified
                );
            }
        }
        
        // Merge user interactions
        if (newData.user_interactions) {
            this.knowledgeBase.user_interactions = this.knowledgeBase.user_interactions || {
                button_clicks: [], page_visits: []
            };
            
            Object.keys(newData.user_interactions).forEach(key => {
                if (Array.isArray(newData.user_interactions[key])) {
                    this.knowledgeBase.user_interactions[key] = 
                        this.knowledgeBase.user_interactions[key] || [];
                    this.knowledgeBase.user_interactions[key].push(
                        ...newData.user_interactions[key]
                    );
                }
            });
        }
        
        // Merge learning patterns
        if (newData.learning_patterns) {
            this.knowledgeBase.learning_patterns = this.knowledgeBase.learning_patterns || {};
            Object.assign(this.knowledgeBase.learning_patterns, newData.learning_patterns);
        }
    }
    
    setupWebSocket(server) {
        const wss = new WebSocket.Server({ server });
        
        wss.on('connection', (ws) => {
            this.clients.add(ws);
            console.log(`📡 New VPS client connected (${this.clients.size} total)`);
            
            ws.on('close', () => {
                this.clients.delete(ws);
                console.log(`📡 VPS client disconnected (${this.clients.size} remaining)`);
            });
            
            ws.on('message', (message) => {
                try {
                    const data = JSON.parse(message);
                    this.handleClientMessage(ws, data);
                } catch (error) {
                    console.error('Invalid WebSocket message:', error);
                }
            });
            
            // Send initial connection success
            ws.send(JSON.stringify({
                type: 'connection_established',
                timestamp: new Date().toISOString(),
                message: 'VPS persistence layer active'
            }));
        });
        
        console.log('🔌 WebSocket server initialized');
        return wss;
    }
    
    handleClientMessage(ws, data) {
        switch (data.type) {
            case 'ping':
                ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
                break;
                
            case 'request_sync':
                // Send current state to requesting client
                this.sendFullSync(ws);
                break;
        }
    }
    
    async sendFullSync(ws) {
        try {
            // Send all current states
            const states = ['quantum', 'civilization', 'minions'];
            
            for (const type of states) {
                const filePath = path.join(this.dataPath, `${type}-state.json`);
                try {
                    const data = await fs.readFile(filePath, 'utf8');
                    const state = JSON.parse(data);
                    
                    ws.send(JSON.stringify({
                        type: `${type}_update`,
                        data: state,
                        timestamp: new Date().toISOString()
                    }));
                } catch (error) {
                    // State file doesn't exist, skip
                }
            }
            
            // Send knowledge base
            ws.send(JSON.stringify({
                type: 'knowledge_update',
                data: this.knowledgeBase,
                timestamp: new Date().toISOString()
            }));
            
            console.log('📤 Full sync sent to client');
            
        } catch (error) {
            console.error('Error sending full sync:', error);
        }
    }
    
    broadcastUpdate(type, data) {
        const message = JSON.stringify({
            type: `${type}_update`,
            data: data,
            timestamp: new Date().toISOString()
        });
        
        this.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });
        
        console.log(`📡 Broadcasted ${type} update to ${this.clients.size} clients`);
    }
    
    start(port = 3000) {
        const server = this.app.listen(port, () => {
            console.log(`🚀 OpenClaw VPS Server running on port ${port}`);
        });
        
        this.setupWebSocket(server);
        
        return server;
    }
}

module.exports = OpenClawVPSServer;

// If running directly
if (require.main === module) {
    const server = new OpenClawVPSServer();
    server.start(process.env.PORT || 3000);
}