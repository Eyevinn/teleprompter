class TeleprompterController {
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
        this.timerInterval = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        
        this.initializeElements();
        this.bindEvents();
        this.connectWebSocket();
        this.updateDurationCalculations();
        this.updateDisplayUrl();
    }
    
    initializeElements() {
        this.fileUpload = document.getElementById('file-upload');
        this.clearBtn = document.getElementById('clear-text');
        this.speedControl = document.getElementById('speed-control');
        this.speedDisplay = document.getElementById('speed-display');
        this.segmentLengthInput = document.getElementById('segment-length');
        this.fontSizeControl = document.getElementById('font-size');
        this.fontSizeDisplay = document.getElementById('font-size-display');
        this.mirrorModeCheckbox = document.getElementById('mirror-mode');
        this.hideTimerCheckbox = document.getElementById('hide-timer');
        this.startBtn = document.getElementById('start-btn');
        this.pauseBtn = document.getElementById('pause-btn');
        this.resetBtn = document.getElementById('reset-btn');
        this.textPreview = document.getElementById('text-preview');
        this.wordCount = document.getElementById('word-count');
        this.expectedDuration = document.getElementById('expected-duration');
        this.durationDiff = document.getElementById('duration-diff');
        this.diffValue = document.getElementById('diff-value');
        this.segmentTimer = document.getElementById('segment-timer');
        this.elapsedTimer = document.getElementById('elapsed-timer');
        this.connectionStatus = document.getElementById('connection-status');
        this.statusIndicator = this.connectionStatus.querySelector('.status-indicator');
        this.statusText = this.connectionStatus.querySelector('.status-text');
        this.displayUrl = document.getElementById('display-url');
        this.copyUrlBtn = document.getElementById('copy-url');
    }
    
    bindEvents() {
        this.fileUpload.addEventListener('change', (e) => this.handleFileUpload(e));
        this.clearBtn.addEventListener('click', () => this.clearText());
        this.speedControl.addEventListener('input', (e) => this.updateSpeed(e.target.value));
        this.segmentLengthInput.addEventListener('input', (e) => this.updateSegmentLength(e.target.value));
        this.fontSizeControl.addEventListener('input', (e) => this.updateFontSize(e.target.value));
        this.mirrorModeCheckbox.addEventListener('change', (e) => this.updateMirrorMode(e.target.checked));
        this.hideTimerCheckbox.addEventListener('change', (e) => this.updateHideTimer(e.target.checked));
        this.startBtn.addEventListener('click', () => this.start());
        this.pauseBtn.addEventListener('click', () => this.pause());
        this.resetBtn.addEventListener('click', () => this.reset());
        this.copyUrlBtn.addEventListener('click', () => this.copyDisplayUrl());
        
        // Text preview updates
        this.textPreview.addEventListener('input', () => {
            this.sendTextUpdate();
            this.updateDurationCalculations();
        });
        
        // Prevent form submission on enter
        this.textPreview.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.ctrlKey) {
                e.preventDefault();
                this.start();
            }
        });
    }
    
    connectWebSocket() {
        try {
            this.updateConnectionStatus('connecting', 'Connecting...');
            this.ws = new WebSocket('ws://localhost:8081');
            
            this.ws.onopen = () => {
                console.log('Connected to WebSocket server');
                this.updateConnectionStatus('connected', 'Connected');
                this.reconnectAttempts = 0;
                
                // Register as controller
                this.ws.send(JSON.stringify({
                    type: 'register',
                    role: 'controller'
                }));
                
                // Send initial state
                this.sendInitialState();
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
    
    sendMessage(message) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        }
    }
    
    sendInitialState() {
        // Send current text content
        this.sendTextUpdate();
        
        // Send all current settings
        this.sendMessage({ type: 'setSpeed', value: this.speed });
        this.sendMessage({ type: 'setFontSize', value: this.fontSize });
        this.sendMessage({ type: 'setSegmentLength', value: parseInt(this.segmentLengthInput.value) });
        this.sendMessage({ type: 'setMirrorMode', enabled: this.mirrorModeCheckbox.checked });
        this.sendMessage({ type: 'setHideTimer', enabled: this.hideTimerCheckbox.checked });
    }
    
    handleMessage(data) {
        switch (data.type) {
            case 'stateSync':
                // Server is syncing state - we're already the source of truth
                break;
                
            case 'pong':
                // Heartbeat response
                break;
                
            case 'connectionCount':
                this.updateConnectionInfo(data);
                break;
                
            default:
                console.log('Unknown message type:', data.type);
        }
    }
    
    updateConnectionInfo(data) {
        // Update connection status display with count info
        const totalConnections = data.controllers + data.displays;
        const displayText = `Connected (${data.displays} display${data.displays !== 1 ? 's' : ''})`;
        this.updateConnectionStatus('connected', displayText);
    }
    
    async handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        try {
            let text = '';
            
            if (file.type === 'text/plain') {
                text = await this.readTextFile(file);
            } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
                       file.name.toLowerCase().endsWith('.docx')) {
                text = await this.readWordDocument(file);
            } else if (file.type.includes('word') || file.name.toLowerCase().endsWith('.doc')) {
                alert('Legacy .doc files are not supported. Please use .docx format or convert to text.');
                return;
            } else {
                text = await this.readTextFile(file);
            }
            
            this.setPrompterText(text);
        } catch (error) {
            alert('Error reading file: ' + error.message);
        }
    }
    
    readTextFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }
    
    readWordDocument(file) {
        return new Promise((resolve, reject) => {
            if (typeof mammoth === 'undefined') {
                reject(new Error('Mammoth library not loaded. Please refresh the page.'));
                return;
            }
            
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const arrayBuffer = e.target.result;
                    const result = await mammoth.extractRawText({arrayBuffer: arrayBuffer});
                    
                    if (result.messages && result.messages.length > 0) {
                        console.warn('Word document conversion warnings:', result.messages);
                    }
                    
                    resolve(result.value);
                } catch (error) {
                    reject(new Error('Failed to parse Word document: ' + error.message));
                }
            };
            reader.onerror = (e) => reject(new Error('Failed to read Word document'));
            reader.readAsArrayBuffer(file);
        });
    }
    
    setPrompterText(text) {
        const paragraphs = text.split('\n\n').filter(p => p.trim().length > 0);
        this.textPreview.innerHTML = paragraphs.map(p => `<p>${p.trim()}</p>`).join('');
        this.sendTextUpdate();
        this.updateDurationCalculations();
    }
    
    sendTextUpdate() {
        const content = this.textPreview.innerHTML;
        this.sendMessage({ type: 'setText', content: content });
    }
    
    clearText() {
        this.textPreview.innerHTML = '<p>Upload your manuscript or type your text here...</p>';
        this.sendTextUpdate();
        this.reset();
        this.updateDurationCalculations();
    }
    
    updateSpeed(value) {
        this.speed = parseInt(value);
        this.speedDisplay.textContent = this.speed;
        this.sendMessage({ type: 'setSpeed', value: this.speed });
        this.updateDurationCalculations();
    }
    
    updateSegmentLength(value) {
        this.segmentDuration = parseInt(value) * 60 * 1000;
        this.sendMessage({ type: 'setSegmentLength', value: parseInt(value) });
        this.updateDurationCalculations();
        this.updateCountdownDisplay();
    }
    
    updateFontSize(value) {
        this.fontSize = parseInt(value);
        this.fontSizeDisplay.textContent = this.fontSize + 'px';
        this.sendMessage({ type: 'setFontSize', value: this.fontSize });
    }
    
    updateMirrorMode(enabled) {
        this.sendMessage({ type: 'setMirrorMode', enabled: enabled });
    }
    
    updateHideTimer(enabled) {
        this.sendMessage({ type: 'setHideTimer', enabled: enabled });
    }
    
    start() {
        if (this.isPaused) {
            this.resume();
            return;
        }
        
        this.isPlaying = true;
        this.isPaused = false;
        this.startTime = Date.now() - (this.pausedTime || 0);
        
        this.startBtn.disabled = true;
        this.pauseBtn.disabled = false;
        
        this.sendMessage({ type: 'start' });
        this.startTimer();
    }
    
    pause() {
        this.isPaused = true;
        this.isPlaying = false;
        this.pausedTime = Date.now() - this.startTime;
        
        this.startBtn.disabled = false;
        this.pauseBtn.disabled = true;
        
        this.sendMessage({ type: 'pause' });
        this.stopTimer();
    }
    
    resume() {
        this.isPlaying = true;
        this.isPaused = false;
        this.startTime = Date.now() - this.pausedTime;
        
        this.startBtn.disabled = true;
        this.pauseBtn.disabled = false;
        
        this.sendMessage({ type: 'start' });
        this.startTimer();
    }
    
    reset() {
        this.isPlaying = false;
        this.isPaused = false;
        this.currentPosition = 0;
        this.startTime = null;
        this.pausedTime = 0;
        
        this.startBtn.disabled = false;
        this.pauseBtn.disabled = true;
        
        this.sendMessage({ type: 'reset' });
        this.stopTimer();
        this.updateDisplay();
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
        
        // Auto-pause when segment time is reached
        if (remaining <= 0 && this.isPlaying) {
            this.pause();
            alert('Segment time completed!');
        }
    }
    
    updateCountdownDisplay(remaining = this.segmentDuration) {
        const minutes = Math.floor(remaining / 60000);
        const seconds = Math.floor((remaining % 60000) / 1000);
        
        this.segmentTimer.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    updateElapsedDisplay(elapsed) {
        const minutes = Math.floor(elapsed / 60000);
        const seconds = Math.floor((elapsed % 60000) / 1000);
        
        this.elapsedTimer.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    updateDurationCalculations() {
        const wordCount = this.getWordCount();
        const expectedDurationMs = this.calculateExpectedDuration(wordCount);
        const segmentDurationMs = this.segmentDuration;
        
        this.wordCount.textContent = wordCount.toLocaleString();
        this.expectedDuration.textContent = this.formatDuration(expectedDurationMs);
        
        // Calculate and display difference
        const differenceMs = segmentDurationMs - expectedDurationMs;
        this.diffValue.textContent = this.formatDurationDiff(differenceMs);
        
        // Update styling based on difference
        this.durationDiff.classList.remove('positive', 'negative', 'neutral');
        if (Math.abs(differenceMs) < 30000) {
            this.durationDiff.classList.add('neutral');
        } else if (differenceMs > 0) {
            this.durationDiff.classList.add('positive');
        } else {
            this.durationDiff.classList.add('negative');
        }
    }
    
    getWordCount() {
        const text = this.textPreview.textContent || this.textPreview.innerText || '';
        const words = text.trim().split(/\s+/).filter(word => word.length > 0);
        return words.length;
    }
    
    calculateExpectedDuration(wordCount) {
        return Math.round((wordCount / this.speed) * 60 * 1000);
    }
    
    formatDuration(milliseconds) {
        const totalSeconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    
    formatDurationDiff(milliseconds) {
        const isNegative = milliseconds < 0;
        const absMs = Math.abs(milliseconds);
        const totalSeconds = Math.floor(absMs / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        const sign = isNegative ? '-' : '+';
        return `${sign}${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    
    updateConnectionStatus(status, text) {
        this.statusIndicator.className = `status-indicator ${status}`;
        this.statusText.textContent = text;
    }
    
    updateDisplayUrl() {
        const protocol = window.location.protocol;
        const hostname = window.location.hostname;
        const port = window.location.port ? `:${window.location.port}` : '';
        const displayUrl = `${protocol}//${hostname}${port}/display.html`;
        this.displayUrl.textContent = displayUrl;
    }
    
    copyDisplayUrl() {
        const protocol = window.location.protocol;
        const hostname = window.location.hostname;
        const port = window.location.port ? `:${window.location.port}` : '';
        const displayUrl = `${protocol}//${hostname}${port}/display.html`;
        
        navigator.clipboard.writeText(displayUrl).then(() => {
            this.copyUrlBtn.textContent = 'Copied!';
            setTimeout(() => {
                this.copyUrlBtn.textContent = 'Copy';
            }, 2000);
        }).catch(() => {
            // Fallback for browsers that don't support clipboard API
            const textArea = document.createElement('textarea');
            textArea.value = displayUrl;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            
            this.copyUrlBtn.textContent = 'Copied!';
            setTimeout(() => {
                this.copyUrlBtn.textContent = 'Copy';
            }, 2000);
        });
    }
}

// Initialize controller when page loads
document.addEventListener('DOMContentLoaded', () => {
    new TeleprompterController();
});