class TeleprompterDisplay {
    constructor() {
        this.ws = null;
        this.isPlaying = false;
        this.isPaused = false;
        this.currentPosition = 0;
        this.startTime = null;
        this.pausedTime = 0;
        this.segmentDuration = 10 * 60 * 1000;
        this.speed = 150;
        this.fontSize = 48;
        this.animationId = null;
        this.timerInterval = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        
        this.initializeElements();
        this.connectWebSocket();
        this.bindKeyboardShortcuts();
        
        // Auto-reconnect on connection loss
        this.setupReconnection();
    }
    
    initializeElements() {
        this.prompterText = document.getElementById('prompter-text');
        this.countdownTimer = document.getElementById('countdown-timer');
        this.elapsedTime = document.getElementById('elapsed-time');
        this.connectionStatus = document.getElementById('connection-status');
        this.statusIndicator = this.connectionStatus.querySelector('.status-indicator');
        this.statusText = this.connectionStatus.querySelector('.status-text');
    }
    
    connectWebSocket() {
        try {
            this.updateConnectionStatus('connecting', 'Connecting...');
            this.ws = new WebSocket('ws://localhost:8081');
            
            this.ws.onopen = () => {
                console.log('Connected to WebSocket server');
                this.updateConnectionStatus('connected', 'Connected');
                this.reconnectAttempts = 0;
                
                // Register as display
                this.ws.send(JSON.stringify({
                    type: 'register',
                    role: 'display'
                }));
            };
            
            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.handleMessage(data);
                } catch (error) {
                    console.error('Error parsing message:', error);
                }
            };
            
            this.ws.onclose = () => {
                console.log('WebSocket connection closed');
                this.updateConnectionStatus('disconnected', 'Disconnected');
                this.scheduleReconnect();
            };
            
            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                this.updateConnectionStatus('disconnected', 'Connection Error');
            };
            
        } catch (error) {
            console.error('Failed to connect to WebSocket:', error);
            this.updateConnectionStatus('disconnected', 'Failed to Connect');
            this.scheduleReconnect();
        }
    }
    
    scheduleReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
            
            this.updateConnectionStatus('connecting', `Reconnecting in ${Math.ceil(delay / 1000)}s...`);
            
            setTimeout(() => {
                this.connectWebSocket();
            }, delay);
        } else {
            this.updateConnectionStatus('disconnected', 'Max reconnect attempts reached');
        }
    }
    
    setupReconnection() {
        // Try to reconnect when the page becomes visible again
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && (!this.ws || this.ws.readyState !== WebSocket.OPEN)) {
                this.reconnectAttempts = 0;
                this.connectWebSocket();
            }
        });
    }
    
    handleMessage(data) {
        switch (data.type) {
            case 'stateSync':
                this.syncState(data.state);
                break;
                
            case 'setText':
                this.setPrompterText(data.content);
                break;
                
            case 'setSpeed':
                this.speed = data.value;
                break;
                
            case 'setFontSize':
                this.fontSize = data.value;
                this.prompterText.style.fontSize = this.fontSize + 'px';
                break;
                
            case 'setSegmentLength':
                this.segmentDuration = data.value * 60 * 1000;
                this.updateCountdownDisplay();
                break;
                
            case 'setMirrorMode':
                this.setMirrorMode(data.enabled);
                break;
                
            case 'setHideTimer':
                this.setHideTimer(data.enabled);
                break;
                
            case 'start':
                this.start(data.startTime, data.pausedTime);
                break;
                
            case 'pause':
                this.pause(data.pausedTime);
                break;
                
            case 'reset':
                this.reset();
                break;
                
            case 'pong':
                // Heartbeat response
                break;
                
            default:
                console.log('Unknown message type:', data.type);
        }
    }
    
    syncState(state) {
        console.log('Syncing state:', state);
        
        if (state.text) {
            this.setPrompterText(state.text);
        }
        
        this.speed = state.speed;
        this.fontSize = state.fontSize;
        this.segmentDuration = state.segmentLength * 60 * 1000;
        
        this.prompterText.style.fontSize = this.fontSize + 'px';
        this.setMirrorMode(state.mirrorMode);
        this.setHideTimer(state.hideTimer);
        
        if (state.isPlaying) {
            this.start(state.startTime, state.pausedTime);
        } else if (state.isPaused) {
            this.pause(state.pausedTime);
        } else {
            this.reset();
        }
        
        this.updateCountdownDisplay();
    }
    
    setPrompterText(text) {
        if (typeof text === 'string') {
            // Convert plain text to paragraphs
            const paragraphs = text.split('\n\n').filter(p => p.trim().length > 0);
            this.prompterText.innerHTML = paragraphs.map(p => `<p>${p.trim()}</p>`).join('');
        } else {
            this.prompterText.innerHTML = text;
        }
    }
    
    setMirrorMode(enabled) {
        if (enabled) {
            document.body.classList.add('mirror-mode');
        } else {
            document.body.classList.remove('mirror-mode');
        }
    }
    
    setHideTimer(enabled) {
        const timerDisplay = document.querySelector('.timer-display');
        if (enabled) {
            timerDisplay.style.display = 'none';
        } else {
            timerDisplay.style.display = 'flex';
        }
    }
    
    start(startTime, pausedTime) {
        this.isPlaying = true;
        this.isPaused = false;
        this.startTime = startTime || Date.now();
        this.pausedTime = pausedTime || 0;
        
        this.startScrolling();
        this.startTimer();
    }
    
    pause(pausedTime) {
        this.isPlaying = false;
        this.isPaused = true;
        this.pausedTime = pausedTime || 0;
        
        this.stopScrolling();
        this.stopTimer();
    }
    
    reset() {
        this.isPlaying = false;
        this.isPaused = false;
        this.currentPosition = 0;
        this.startTime = null;
        this.pausedTime = 0;
        
        this.stopScrolling();
        this.stopTimer();
        
        // Reset text position
        this.prompterText.style.transform = 'translateY(-50%)';
        this.updateDisplay();
    }
    
    startScrolling() {
        const scroll = () => {
            if (!this.isPlaying) return;
            
            // Calculate scroll speed based on words per minute
            const wordsPerSecond = this.speed / 60;
            const pixelsPerSecond = wordsPerSecond * 12; // Approximate pixels per word
            const pixelsPerFrame = pixelsPerSecond / 60; // 60 FPS
            
            this.currentPosition += pixelsPerFrame;
            const translateY = -50 - (this.currentPosition / window.innerHeight) * 100;
            this.prompterText.style.transform = `translateY(${translateY}%)`;
            
            this.animationId = requestAnimationFrame(scroll);
        };
        
        this.animationId = requestAnimationFrame(scroll);
    }
    
    stopScrolling() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }
    
    startTimer() {
        this.timerInterval = setInterval(() => {
            this.updateDisplay();
        }, 1000);
    }
    
    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }
    
    updateDisplay() {
        const elapsed = this.startTime ? Date.now() - this.startTime : this.pausedTime;
        const remaining = Math.max(0, this.segmentDuration - elapsed);
        
        this.updateCountdownDisplay(remaining);
        this.updateElapsedDisplay(elapsed);
    }
    
    updateCountdownDisplay(remaining = this.segmentDuration) {
        const minutes = Math.floor(remaining / 60000);
        const seconds = Math.floor((remaining % 60000) / 1000);
        
        this.countdownTimer.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        // Update timer color based on remaining time
        this.countdownTimer.className = '';
        if (remaining < 60000) {
            this.countdownTimer.classList.add('danger');
        } else if (remaining < 300000) {
            this.countdownTimer.classList.add('warning');
        }
    }
    
    updateElapsedDisplay(elapsed) {
        const minutes = Math.floor(elapsed / 60000);
        const seconds = Math.floor((elapsed % 60000) / 1000);
        
        this.elapsedTime.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    updateConnectionStatus(status, text) {
        this.statusIndicator.className = `status-indicator ${status}`;
        this.statusText.textContent = text;
    }
    
    bindKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // F11 or F for fullscreen
            if (e.key === 'F11' || e.key === 'f' || e.key === 'F') {
                e.preventDefault();
                this.toggleFullscreen();
            }
            
            // Escape to exit fullscreen
            if (e.key === 'Escape') {
                if (document.fullscreenElement) {
                    document.exitFullscreen();
                }
            }
        });
        
        // Handle fullscreen change
        document.addEventListener('fullscreenchange', () => {
            if (document.fullscreenElement) {
                document.body.classList.add('fullscreen');
            } else {
                document.body.classList.remove('fullscreen');
            }
        });
    }
    
    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.error('Error attempting to enable fullscreen:', err);
            });
        } else {
            document.exitFullscreen();
        }
    }
}

// Initialize display when page loads
document.addEventListener('DOMContentLoaded', () => {
    new TeleprompterDisplay();
});