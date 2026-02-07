const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs');
const app = express();
const server = http.createServer(app);

// Configuration
const PORT = process.env.PORT || 8080;
const VPS_MODE = process.env.VPS_MODE === 'true';
const QUANTUM_PERSISTENCE = process.env.QUANTUM_PERSISTENCE === 'true';

// Data directories
const DATA_DIR = VPS_MODE ? '/var/lib/solarflow' : './data';
const QUANTUM_STATE_FILE = path.join(DATA_DIR, 'quantum_state.json');
const CIVILIZATION_STATE_FILE = path.join(DATA_DIR, 'civilization_state.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'docs')));

// CORS for OpenClaw integration
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    next();
});

// WebSocket for real-time quantum updates
const wss = new WebSocket.Server({ server });
const clients = new Set();

wss.on('connection', (ws) => {
    clients.add(ws);
    console.log('Client connected for quantum updates');
    
    ws.on('close', () => {
        clients.delete(ws);
    });
});

function broadcastQuantumUpdate(data) {
    const message = JSON.stringify({ type: 'quantum_update', data });
    clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

// API Routes
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        vps_mode: VPS_MODE,
        quantum_persistence: QUANTUM_PERSISTENCE,
        uptime: process.uptime()
    });
});

// Quantum state persistence API
app.get('/api/quantum/state', (req, res) => {
    try {
        if (fs.existsSync(QUANTUM_STATE_FILE)) {
            const state = JSON.parse(fs.readFileSync(QUANTUM_STATE_FILE, 'utf8'));
            res.json({ success: true, state });
        } else {
            res.json({ success: true, state: null, message: 'No saved state' });
        }
    } catch (error) {
        console.error('Error loading quantum state:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/quantum/state', (req, res) => {
    try {
        const state = req.body;
        fs.writeFileSync(QUANTUM_STATE_FILE, JSON.stringify(state, null, 2));
        
        // Broadcast to connected clients
        broadcastQuantumUpdate(state);
        
        console.log('Quantum state saved to VPS storage');
        res.json({ success: true, message: 'Quantum state saved successfully' });
    } catch (error) {
        console.error('Error saving quantum state:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Civilization state persistence
app.get('/api/civilization/state', (req, res) => {
    try {
        if (fs.existsSync(CIVILIZATION_STATE_FILE)) {
            const state = JSON.parse(fs.readFileSync(CIVILIZATION_STATE_FILE, 'utf8'));
            res.json({ success: true, state });
        } else {
            res.json({ success: true, state: null, message: 'No saved state' });
        }
    } catch (error) {
        console.error('Error loading civilization state:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/civilization/state', (req, res) => {
    try {
        const state = req.body;
        fs.writeFileSync(CIVILIZATION_STATE_FILE, JSON.stringify(state, null, 2));
        
        console.log('Civilization state saved to VPS storage');
        res.json({ success: true, message: 'Civilization state saved successfully' });
    } catch (error) {
        console.error('Error saving civilization state:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Serve main application
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'docs', 'index.html'));
});

// 404 handler
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'docs', 'working.html'));
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// Start server
server.listen(PORT, '127.0.0.1', () => {
    console.log(`🚀 SolarFlow Quantum System running on port ${PORT}`);
    console.log(`   VPS Mode: ${VPS_MODE}`);
    console.log(`   Quantum Persistence: ${QUANTUM_PERSISTENCE}`);
    console.log(`   Data Directory: ${DATA_DIR}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});