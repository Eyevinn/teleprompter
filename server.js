const WebSocket = require('ws');
const http = require('http');
const os = require('os');
const path = require('path');
const fs = require('fs');

const PORT = process.env.PORT || 8080;
const PUBLIC_PORT = process.env.PUBLIC_PORT;

function getLocalNetworkHost() {
    if (process.env.PUBLIC_HOST) {
        return process.env.PUBLIC_HOST;
    }

    const interfaces = os.networkInterfaces();
    for (const addresses of Object.values(interfaces)) {
        for (const address of addresses || []) {
            if (address.family === 'IPv4' && !address.internal) {
                return address.address;
            }
        }
    }

    return 'localhost';
}

function buildPublicConfig() {
    const protocol = process.env.PUBLIC_PROTOCOL || 'http';
    const host = getLocalNetworkHost();
    const port = typeof PUBLIC_PORT === 'string' ? PUBLIC_PORT : PORT;
    const portSuffix = port ? `:${port}` : '';
    const baseUrl = `${protocol}://${host}${portSuffix}`;

    return {
        baseUrl,
        displayUrl: `${baseUrl}/display`
    };
}

// Create HTTP server for serving static files
const server = http.createServer((req, res) => {
    if (req.url === '/healthz') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
        return;
    }

    if (req.url === '/config.json') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(buildPublicConfig()));
        return;
    }

    const routes = {
        '/': 'controller.html',
        '/controller': 'controller.html',
        '/display': 'display.html'
    };
    let filePath = path.join(__dirname, routes[req.url] || req.url);
    
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

// Create WebSocket server using the same HTTP server
const wss = new WebSocket.Server({ server });

// Store connected clients
const clients = {
    controllers: new Set(),
    displays: new Set()
};

// Current state to sync new connections
let currentState = {
    text: '',
    speed: 55,
    fontSize: 32,
    textWidth: 20,
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
    readingGuide: false,
    onAir: false,
    scheduledStartTime: null,
    prerollStartAt: null
};

let pendingStartTimeout = null;

function cancelPendingStart() {
    if (pendingStartTimeout) {
        clearTimeout(pendingStartTimeout);
        pendingStartTimeout = null;
    }
    currentState.prerollStartAt = null;
}

function getCurrentElapsedMs() {
    if (currentState.isPlaying && currentState.startTime) {
        return Math.max(0, Date.now() - currentState.startTime);
    }

    return Math.max(0, currentState.pausedTime || 0);
}

function getStateSnapshot() {
    return {
        ...currentState,
        elapsedMs: getCurrentElapsedMs()
    };
}

function beginPlayback() {
    cancelPendingStart();
    const elapsedMs = currentState.pausedTime || 0;
    currentState.isPlaying = true;
    currentState.isPaused = false;
    currentState.onAir = true; // Automatically turn on air indicator
    currentState.scheduledStartTime = null; // Clear scheduled start
    currentState.startTime = Date.now() - (currentState.pausedTime || 0);

    broadcastToDisplays({
        type: 'start',
        startTime: currentState.startTime,
        pausedTime: currentState.pausedTime,
        elapsedMs
    });
    broadcastToDisplays({ type: 'setOnAir', enabled: true });
    broadcastToDisplays({ type: 'clearScheduledStart' });
}

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

                case 'setTextWidth':
                    currentState.textWidth = data.value;
                    broadcastToDisplays({ type: 'setTextWidth', value: data.value });
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

                case 'setReadingGuide':
                    currentState.readingGuide = data.enabled;
                    broadcastToDisplays({ type: 'setReadingGuide', enabled: data.enabled });
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

                case 'startPreroll': {
                    cancelPendingStart();
                    const seconds = Math.min(60, Math.max(0, Number(data.seconds) || 0));
                    const startAt = Date.now() + seconds * 1000;
                    currentState.isPlaying = false;
                    currentState.isPaused = false;
                    currentState.prerollStartAt = startAt;
                    currentState.pausedTime = 0;
                    currentState.startTime = null;
                    broadcastToDisplays({ type: 'startPreroll', startAt, seconds });
                    pendingStartTimeout = setTimeout(beginPlayback, seconds * 1000);
                    break;
                }
                    
                case 'start':
                    beginPlayback();
                    break;
                    
                case 'pause':
                    cancelPendingStart();
                    currentState.isPlaying = false;
                    currentState.isPaused = true;
                    currentState.pausedTime = currentState.startTime ? Date.now() - currentState.startTime : 0;
                    broadcastToDisplays({ 
                        type: 'pause',
                        pausedTime: currentState.pausedTime
                    });
                    break;
                    
                case 'reset':
                    cancelPendingStart();
                    currentState.isPlaying = false;
                    currentState.isPaused = false;
                    currentState.currentPosition = 0;
                    currentState.startTime = null;
                    currentState.pausedTime = 0;
                    broadcastToDisplays({ type: 'reset' });
                    break;

                case 'rewind': {
                    const milliseconds = Math.min(60_000, Math.max(0, Number(data.milliseconds) || 10_000));
                    let elapsedMs = 0;

                    if (currentState.isPlaying && currentState.startTime) {
                        elapsedMs = Math.max(0, Date.now() - currentState.startTime - milliseconds);
                        currentState.startTime = Date.now() - elapsedMs;
                    } else if (currentState.isPaused) {
                        elapsedMs = Math.max(0, currentState.pausedTime - milliseconds);
                        currentState.pausedTime = elapsedMs;
                    } else {
                        break;
                    }

                    broadcastToDisplays({
                        type: 'rewind',
                        startTime: currentState.startTime,
                        pausedTime: currentState.pausedTime,
                        elapsedMs,
                        isPlaying: currentState.isPlaying,
                        isPaused: currentState.isPaused
                    });
                    break;
                }

                case 'seek': {
                    const milliseconds = Math.min(60_000, Math.max(-60_000, Number(data.milliseconds) || 0));
                    let elapsedMs = 0;

                    if (currentState.isPlaying && currentState.startTime) {
                        elapsedMs = Math.max(0, Date.now() - currentState.startTime);
                        elapsedMs = Math.max(0, elapsedMs + milliseconds);
                        currentState.startTime = Date.now() - elapsedMs;
                    } else if (currentState.isPaused) {
                        elapsedMs = Math.max(0, currentState.pausedTime);
                        elapsedMs = Math.max(0, elapsedMs + milliseconds);
                        currentState.pausedTime = elapsedMs;
                    } else {
                        break;
                    }

                    broadcastToDisplays({
                        type: 'seek',
                        startTime: currentState.startTime,
                        pausedTime: currentState.pausedTime,
                        elapsedMs,
                        isPlaying: currentState.isPlaying,
                        isPaused: currentState.isPaused
                    });
                    break;
                }
                    
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
            state: getStateSnapshot()
        }));
        
    } else if (data.role === 'display') {
        clients.displays.add(ws);
        console.log('Display registered');
        
        // Send current state to new display
        ws.send(JSON.stringify({
            type: 'stateSync',
            state: getStateSnapshot()
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

if (require.main === module) {
    const publicConfig = buildPublicConfig();

    // Start HTTP server
    server.listen(PORT, () => {
        console.log(`HTTP Server running at http://localhost:${PORT}`);
        console.log(`WebSocket Server running on the same port ${PORT}`);
        console.log(`Controller: ${publicConfig.baseUrl}/controller`);
        console.log(`Display: ${publicConfig.displayUrl}`);
    });

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
}

module.exports = { server, wss, buildPublicConfig, getLocalNetworkHost };
