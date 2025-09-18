const WebSocket = require('ws');
const http = require('http');
const path = require('path');
const fs = require('fs');

const PORT = 8080;
const WS_PORT = 8081;

// Create HTTP server for serving static files
const server = http.createServer((req, res) => {
    let filePath = path.join(__dirname, req.url === '/' ? 'controller.html' : req.url);
    
    // Security check - prevent directory traversal
    if (!filePath.startsWith(__dirname)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }
    
    const extname = path.extname(filePath).toLowerCase();
    const mimeTypes = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpg',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
        '.wav': 'audio/wav',
        '.mp4': 'video/mp4',
        '.woff': 'application/font-woff',
        '.ttf': 'application/font-ttf',
        '.eot': 'application/vnd.ms-fontobject',
        '.otf': 'application/font-otf',
        '.wasm': 'application/wasm'
    };
    
    const contentType = mimeTypes[extname] || 'application/octet-stream';
    
    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                res.writeHead(404);
                res.end('File not found');
            } else {
                res.writeHead(500);
                res.end('Server error: ' + error.code);
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

// Create WebSocket server
const wss = new WebSocket.Server({ port: WS_PORT });

// Store connected clients
const clients = {
    controllers: new Set(),
    displays: new Set()
};

// Current state to sync new connections
let currentState = {
    text: '',
    speed: 150,
    fontSize: 48,
    segmentLength: 10 * 60, // 10 minutes in seconds
    segmentMinutes: 10,
    segmentSeconds: 0,
    isPlaying: false,
    isPaused: false,
    currentPosition: 0,
    startTime: null,
    pausedTime: 0,
    mirrorMode: false,
    hideTimer: false,
    onAir: false,
    scheduledStartTime: null
};

wss.on('connection', (ws, req) => {
    console.log('New WebSocket connection');
    
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message.toString());
            
            switch (data.type) {
                case 'register':
                    handleRegistration(ws, data);
                    break;
                    
                case 'setText':
                    currentState.text = data.content;
                    broadcastToDisplays({ type: 'setText', content: data.content });
                    break;
                    
                case 'setSpeed':
                    currentState.speed = data.value;
                    broadcastToDisplays({ type: 'setSpeed', value: data.value });
                    break;
                    
                case 'setFontSize':
                    currentState.fontSize = data.value;
                    broadcastToDisplays({ type: 'setFontSize', value: data.value });
                    break;
                    
                case 'setSegmentLength':
                    currentState.segmentLength = data.totalSeconds || data.value || 10 * 60; // fallback to 10 minutes
                    currentState.segmentMinutes = data.minutes || Math.floor(currentState.segmentLength / 60);
                    currentState.segmentSeconds = data.seconds || (currentState.segmentLength % 60);
                    broadcastToDisplays({ 
                        type: 'setSegmentLength', 
                        totalSeconds: currentState.segmentLength,
                        minutes: currentState.segmentMinutes,
                        seconds: currentState.segmentSeconds
                    });
                    break;
                    
                case 'setMirrorMode':
                    currentState.mirrorMode = data.enabled;
                    broadcastToDisplays({ type: 'setMirrorMode', enabled: data.enabled });
                    break;
                    
                case 'setHideTimer':
                    currentState.hideTimer = data.enabled;
                    broadcastToDisplays({ type: 'setHideTimer', enabled: data.enabled });
                    break;
                    
                case 'setOnAir':
                    currentState.onAir = data.enabled;
                    broadcastToDisplays({ type: 'setOnAir', enabled: data.enabled });
                    break;
                    
                case 'setScheduledStart':
                    currentState.scheduledStartTime = data.scheduledTime;
                    broadcastToDisplays({ type: 'setScheduledStart', scheduledTime: data.scheduledTime });
                    break;
                    
                case 'clearScheduledStart':
                    currentState.scheduledStartTime = null;
                    broadcastToDisplays({ type: 'clearScheduledStart' });
                    break;
                    
                case 'start':
                    currentState.isPlaying = true;
                    currentState.isPaused = false;
                    currentState.onAir = true; // Automatically turn on air indicator
                    currentState.scheduledStartTime = null; // Clear scheduled start
                    currentState.startTime = Date.now() - (currentState.pausedTime || 0);
                    broadcastToDisplays({ 
                        type: 'start', 
                        startTime: currentState.startTime,
                        pausedTime: currentState.pausedTime
                    });
                    // Send on air update to displays
                    broadcastToDisplays({ type: 'setOnAir', enabled: true });
                    // Clear scheduled start on displays
                    broadcastToDisplays({ type: 'clearScheduledStart' });
                    break;
                    
                case 'pause':
                    currentState.isPlaying = false;
                    currentState.isPaused = true;
                    currentState.pausedTime = Date.now() - currentState.startTime;
                    broadcastToDisplays({ 
                        type: 'pause',
                        pausedTime: currentState.pausedTime
                    });
                    break;
                    
                case 'reset':
                    currentState.isPlaying = false;
                    currentState.isPaused = false;
                    currentState.currentPosition = 0;
                    currentState.startTime = null;
                    currentState.pausedTime = 0;
                    broadcastToDisplays({ type: 'reset' });
                    break;
                    
                case 'ping':
                    ws.send(JSON.stringify({ type: 'pong' }));
                    break;
                    
                default:
                    console.log('Unknown message type:', data.type);
            }
        } catch (error) {
            console.error('Error parsing message:', error);
        }
    });
    
    ws.on('close', () => {
        clients.controllers.delete(ws);
        clients.displays.delete(ws);
        console.log('WebSocket connection closed');
        broadcastConnectionCount();
    });
    
    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });
});

function handleRegistration(ws, data) {
    if (data.role === 'controller') {
        clients.controllers.add(ws);
        console.log('Controller registered');
        
        // Send current state to new controller
        ws.send(JSON.stringify({
            type: 'stateSync',
            state: currentState
        }));
        
    } else if (data.role === 'display') {
        clients.displays.add(ws);
        console.log('Display registered');
        
        // Send current state to new display
        ws.send(JSON.stringify({
            type: 'stateSync',
            state: currentState
        }));
    }
    
    broadcastConnectionCount();
}

function broadcastToDisplays(message) {
    const messageStr = JSON.stringify(message);
    clients.displays.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(messageStr);
        }
    });
}

function broadcastToControllers(message) {
    const messageStr = JSON.stringify(message);
    clients.controllers.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(messageStr);
        }
    });
}

function broadcastConnectionCount() {
    const connectionInfo = {
        type: 'connectionCount',
        controllers: clients.controllers.size,
        displays: clients.displays.size
    };
    
    [...clients.controllers, ...clients.displays].forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(connectionInfo));
        }
    });
}

// Start HTTP server
server.listen(PORT, () => {
    console.log(`HTTP Server running at http://localhost:${PORT}`);
    console.log(`Controller: http://localhost:${PORT}/controller.html`);
    console.log(`Display: http://localhost:${PORT}/display.html`);
});

// Log WebSocket server start
console.log(`WebSocket Server running on port ${WS_PORT}`);

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('Shutting down servers...');
    wss.close(() => {
        server.close(() => {
            console.log('Servers closed');
            process.exit(0);
        });
    });
});

module.exports = { server, wss };