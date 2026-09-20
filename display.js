class TeleprompterDisplay {
    constructor() {
        this.ws = null;
        this.isPlaying = false;
        this.isPaused = false;
        this.currentPosition = 0;
        this.startTime = null;
        this.pausedTime = 0;
        this.playbackElapsedMs = 0;
        this.lastAnimationTimestamp = null;
        this.segmentDuration = 10 * 60 * 1000;
        this.speed = 55;
        this.fontSize = 32;
        this.textWidth = 20;
        this.animationId = null;
        this.scrollMetrics = null;
        this.timerInterval = null;
        this.scheduledStartTime = null;
        this.scheduledCountdownInterval = null;
        this.prerollCountdownInterval = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        this.wakeLock = null;
        this.mobileModeEnabled = false;
        this.keepAwakeCanvas = null;
        this.keepAwakeFrame = 0;
        this.keepAwakeInterval = null;
        this.mirrorMode = false;
        this.mobileModeRequestId = 0;
        
        this.initializeElements();
        this.connectWebSocket();
        this.bindKeyboardShortcuts();
        this.bindMobileMode();
        
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
        this.onAirIndicator = document.getElementById('on-air-indicator');
        this.scheduledCountdown = document.getElementById('scheduled-countdown');
        this.countdownTime = document.getElementById('countdown-time');
        this.countdownTarget = document.getElementById('countdown-target');
        this.prerollCountdown = document.getElementById('preroll-countdown');
        this.prerollTime = document.getElementById('preroll-time');
        this.readingGuideLine = document.getElementById('reading-guide-line');
        this.mobileModeBtn = document.getElementById('mobile-mode-btn');
        this.keepAwakeVideo = document.getElementById('keep-awake-video');
    }

    bindMobileMode() {
        this.mobileModeBtn.addEventListener('click', () => {
            this.toggleMobileMode();
        });

        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.mobileModeEnabled) {
                if (!this.wakeLock) {
                    this.requestWakeLock();
                }
                this.startKeepAwakeVideo();
            }
        });
    }

    toggleMobileMode() {
        if (this.mobileModeEnabled) {
            this.disableMobileMode();
        } else {
            this.enableMobileMode();
        }
    }
    
    connectWebSocket() {
        try {
            this.updateConnectionStatus('connecting', 'Connecting...');
            // Construct WebSocket URL dynamically based on current location
            const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsPort = window.location.port || (window.location.protocol === 'https:' ? 443 : 80);
            const wsUrl = `${wsProtocol}//${window.location.hostname}:${wsPort}`;
            this.ws = new WebSocket(wsUrl);
            
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
                this.updateScrollMetrics();
                break;
                
            case 'setFontSize':
                this.fontSize = data.value;
                this.prompterText.style.fontSize = this.fontSize + 'px';
                this.updateScrollMetrics();
                break;

            case 'setTextWidth':
                this.setTextWidth(data.value);
                break;
                
            case 'setSegmentLength':
                this.segmentDuration = (data.totalSeconds || data.value || 600) * 1000; // Convert to milliseconds
                this.updateCountdownDisplay();
                break;
                
            case 'setMirrorMode':
                this.setMirrorMode(data.enabled);
                break;
                
            case 'setHideTimer':
                this.setHideTimer(data.enabled);
                break;

            case 'setReadingGuide':
                this.setReadingGuide(data.enabled);
                break;
                
            case 'setOnAir':
                this.setOnAir(data.enabled);
                break;
                
            case 'setScheduledStart':
                this.setScheduledStart(data.scheduledTime);
                break;
                
            case 'clearScheduledStart':
                this.clearScheduledStart();
                break;

            case 'startPreroll':
                this.startPrerollCountdown(data.startAt);
                break;
                
            case 'start':
                this.start(data.startTime, data.pausedTime, data.elapsedMs);
                break;
                
            case 'pause':
                this.pause(data.pausedTime);
                break;
                
            case 'reset':
                this.reset();
                break;

            case 'rewind':
                this.applyPlaybackState(data);
                break;

            case 'seek':
                this.applyPlaybackState(data);
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
        this.textWidth = state.textWidth || 100;
        this.segmentDuration = (state.segmentLength || 600) * 1000; // Convert seconds to milliseconds
        
        this.prompterText.style.fontSize = this.fontSize + 'px';
        this.setTextWidth(this.textWidth);
        this.setMirrorMode(state.mirrorMode);
        this.setHideTimer(state.hideTimer);
        this.setReadingGuide(state.readingGuide);
        this.setOnAir(state.onAir);
        
        if (state.scheduledStartTime) {
            this.setScheduledStart(state.scheduledStartTime);
        } else {
            this.clearScheduledStart();
        }
        
        if (state.prerollStartAt && state.prerollStartAt > Date.now()) {
            this.startPrerollCountdown(state.prerollStartAt);
        } else if (state.isPlaying) {
            this.start(state.startTime, state.pausedTime, state.elapsedMs);
        } else if (state.isPaused) {
            this.pause(state.pausedTime);
        } else {
            this.reset();
        }
        
        this.updateCountdownDisplay();
    }
    
    setPrompterText(text) {
        if (typeof text === 'string') {
            if (text.includes('<')) {
                this.prompterText.innerHTML = text;
                this.updateScrollMetrics();
                return;
            }

            // Convert plain text to paragraphs
            const paragraphs = text.split('\n\n').filter(p => p.trim().length > 0);
            this.prompterText.innerHTML = paragraphs.map(p => `<p>${p.trim()}</p>`).join('');
        } else {
            this.prompterText.innerHTML = text;
        }
        this.updateScrollMetrics();
    }
    
    setMirrorMode(enabled) {
        this.mirrorMode = enabled;
        if (this.mirrorMode) {
            document.body.classList.add('mirror-mode');
        } else {
            document.body.classList.remove('mirror-mode');
        }
        this.applyPrompterTransform();
    }

    setTextWidth(value) {
        this.textWidth = Math.min(100, Math.max(20, parseInt(value) || 100));
        this.prompterText.style.setProperty('--prompter-text-width', this.textWidth + 'vw');
        requestAnimationFrame(() => this.updateScrollMetrics());
    }

    countWords() {
        const text = this.prompterText.textContent || '';
        const words = text.trim().match(/\S+/g);
        return words ? words.length : 0;
    }

    measureLineCenterOffsets() {
        const containerRect = this.prompterText.getBoundingClientRect();
        const lineCenters = [];
        const walker = document.createTreeWalker(this.prompterText, NodeFilter.SHOW_TEXT);

        while (walker.nextNode()) {
            const node = walker.currentNode;
            if (!node.textContent.trim()) {
                continue;
            }

            const range = document.createRange();
            range.selectNodeContents(node);
            Array.from(range.getClientRects()).forEach(rect => {
                if (rect.width > 0 && rect.height > 0) {
                    lineCenters.push(rect.top + rect.height / 2 - containerRect.top);
                }
            });
            range.detach();
        }

        if (lineCenters.length === 0) {
            const fallbackLineCenter = this.prompterText.scrollHeight / 2;
            return {
                firstLineCenter: fallbackLineCenter,
                lastLineCenter: fallbackLineCenter
            };
        }

        return {
            firstLineCenter: lineCenters[0],
            lastLineCenter: lineCenters[lineCenters.length - 1]
        };
    }

    calculateScrollMetrics() {
        const wordCount = Math.max(1, this.countWords());
        const readingDurationMs = (wordCount / Math.max(1, this.speed)) * 60 * 1000;
        const { firstLineCenter, lastLineCenter } = this.measureLineCenterOffsets();
        const scrollDistance = Math.max(0, lastLineCenter - firstLineCenter);
        const pixelsPerMs = scrollDistance / readingDurationMs;

        return {
            wordCount,
            readingDurationMs,
            scrollDistance,
            firstLineCenter,
            lastLineCenter,
            pixelsPerMs
        };
    }

    updateScrollMetrics() {
        this.scrollMetrics = this.calculateScrollMetrics();
        if (!this.isPlaying) {
            this.currentPosition = this.scrollMetrics.firstLineCenter;
            this.applyPrompterTransform();
        }
    }

    getPrompterTransform(translateY = -this.currentPosition) {
        const mirrorTransform = this.mirrorMode ? ' scaleX(-1)' : '';
        return `translateX(-50%) translateY(${translateY}px)${mirrorTransform}`;
    }

    applyPrompterTransform() {
        this.prompterText.style.transform = this.getPrompterTransform();
    }
    
    setHideTimer(enabled) {
        const timerDisplay = document.querySelector('.timer-display');
        if (enabled) {
            timerDisplay.style.display = 'none';
        } else {
            timerDisplay.style.display = 'flex';
        }
    }

    setReadingGuide(enabled) {
        this.readingGuideLine.classList.toggle('active', Boolean(enabled));
    }
    
    setOnAir(enabled) {
        if (enabled) {
            this.onAirIndicator.classList.add('active');
        } else {
            this.onAirIndicator.classList.remove('active');
        }
    }
    
    setScheduledStart(scheduledTime) {
        this.scheduledStartTime = scheduledTime;
        const targetDate = new Date(scheduledTime);
        this.countdownTarget.textContent = `Starting at: ${targetDate.toLocaleTimeString()}`;
        
        this.scheduledCountdown.classList.add('active');
        this.startScheduledCountdown();
    }
    
    clearScheduledStart() {
        this.scheduledStartTime = null;
        this.scheduledCountdown.classList.remove('active');
        this.stopScheduledCountdown();
    }
    
    startScheduledCountdown() {
        this.stopScheduledCountdown(); // Clear any existing interval
        
        this.scheduledCountdownInterval = setInterval(() => {
            const now = Date.now();
            const timeRemaining = this.scheduledStartTime - now;
            
            if (timeRemaining <= 0) {
                // Time's up - start the prompter automatically
                this.clearScheduledStart();
                this.autoStart();
                return;
            }
            
            // Update countdown display
            const hours = Math.floor(timeRemaining / (1000 * 60 * 60));
            const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000);
            
            this.countdownTime.textContent = 
                `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }, 1000);
    }
    
    stopScheduledCountdown() {
        if (this.scheduledCountdownInterval) {
            clearInterval(this.scheduledCountdownInterval);
            this.scheduledCountdownInterval = null;
        }
    }
    
    autoStart() {
        // Simulate receiving a start message from the server
        this.start(Date.now(), 0);
    }

    startPrerollCountdown(startAt) {
        if (!startAt) {
            return;
        }

        this.stopPrerollCountdown();
        this.isPlaying = false;
        this.isPaused = false;
        this.stopScrolling();
        this.stopTimer();
        this.updateScrollMetrics();
        this.updateDisplay();

        const update = () => {
            const remainingMs = Math.max(0, startAt - Date.now());
            const seconds = Math.ceil(remainingMs / 1000);
            const minutes = Math.floor(seconds / 60);
            const restSeconds = seconds % 60;

            this.prerollTime.textContent = `${minutes.toString().padStart(2, '0')}:${restSeconds.toString().padStart(2, '0')}`;
            this.prerollCountdown.classList.add('active');

            if (remainingMs <= 0) {
                this.stopPrerollCountdown();
            }
        };

        update();
        this.prerollCountdownInterval = setInterval(update, 100);
    }

    stopPrerollCountdown() {
        if (this.prerollCountdownInterval) {
            clearInterval(this.prerollCountdownInterval);
            this.prerollCountdownInterval = null;
        }

        this.prerollCountdown.classList.remove('active');
    }
    
    start(startTime, pausedTime, elapsedMs = pausedTime || 0) {
        this.stopPrerollCountdown();
        this.isPlaying = true;
        this.isPaused = false;
        this.startTime = startTime || Date.now();
        this.pausedTime = pausedTime || 0;
        this.playbackElapsedMs = Math.max(0, elapsedMs);
        this.setPlaybackPosition(this.playbackElapsedMs);
        
        this.startScrolling();
        this.startTimer();
    }
    
    pause(pausedTime) {
        this.stopPrerollCountdown();
        this.isPlaying = false;
        this.isPaused = true;
        this.pausedTime = typeof pausedTime === 'number'
            ? Math.max(0, pausedTime)
            : this.playbackElapsedMs;
        this.playbackElapsedMs = this.pausedTime;
        this.setPlaybackPosition(this.playbackElapsedMs);
        
        this.stopScrolling();
        this.stopTimer();
    }
    
    reset() {
        this.stopPrerollCountdown();
        this.isPlaying = false;
        this.isPaused = false;
        this.startTime = null;
        this.pausedTime = 0;
        this.playbackElapsedMs = 0;
        
        this.stopScrolling();
        this.stopTimer();
        
        this.updateScrollMetrics();
        this.applyPrompterTransform();
        this.updateDisplay();
    }

    applyPlaybackState(data) {
        if (typeof data.startTime === 'number') {
            this.startTime = data.startTime;
        }
        if (typeof data.pausedTime === 'number') {
            this.pausedTime = data.pausedTime;
        }

        this.isPlaying = Boolean(data.isPlaying);
        this.isPaused = Boolean(data.isPaused);

        const elapsedMs = typeof data.elapsedMs === 'number'
            ? data.elapsedMs
            : this.getElapsedMs();
        this.playbackElapsedMs = Math.max(0, elapsedMs);
        this.setPlaybackPosition(this.playbackElapsedMs);

        if (this.isPlaying) {
            this.startScrolling();
            this.startTimer();
        } else {
            this.stopScrolling();
            this.stopTimer();
        }

        this.updateDisplay();
    }

    getElapsedMs() {
        if (this.isPaused) {
            return this.pausedTime;
        }

        return this.playbackElapsedMs;
    }

    setPlaybackPosition(elapsedMs, refreshMetrics = true) {
        if (refreshMetrics) {
            this.updateScrollMetrics();
        }
        elapsedMs = Math.max(0, elapsedMs);
        this.currentPosition = this.scrollMetrics.firstLineCenter + elapsedMs * this.scrollMetrics.pixelsPerMs;
        this.applyPrompterTransform();
    }
    
    startScrolling() {
        this.stopScrolling();
        this.updateScrollMetrics();
        this.lastAnimationTimestamp = null;

        const scroll = (timestamp) => {
            if (!this.isPlaying) return;

            if (this.lastAnimationTimestamp !== null) {
                const deltaMs = Math.max(0, timestamp - this.lastAnimationTimestamp);
                this.playbackElapsedMs += deltaMs;
                this.setPlaybackPosition(this.playbackElapsedMs, false);
            }
            this.lastAnimationTimestamp = timestamp;
            
            this.animationId = requestAnimationFrame(scroll);
        };
        
        this.animationId = requestAnimationFrame(scroll);
    }
    
    stopScrolling() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        this.lastAnimationTimestamp = null;
    }
    
    startTimer() {
        this.stopTimer();
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
        const elapsed = this.getElapsedMs();
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

    async enableMobileMode() {
        const requestId = ++this.mobileModeRequestId;
        this.mobileModeEnabled = true;
        this.setMobileModeStatus('Activating...');

        await Promise.allSettled([
            this.requestFullscreen(),
            this.requestWakeLock(),
            this.startKeepAwakeVideo()
        ]);

        if (!this.mobileModeEnabled || requestId !== this.mobileModeRequestId) {
            return;
        }

        const wakeLockActive = Boolean(this.wakeLock);
        const keepAwakeVideoActive = !this.keepAwakeVideo.paused;
        const fullscreenActive = Boolean(document.fullscreenElement);

        if ((wakeLockActive || keepAwakeVideoActive) && fullscreenActive) {
            this.setMobileModeStatus('Mobile mode active');
        } else if (wakeLockActive || keepAwakeVideoActive) {
            this.setMobileModeStatus('Screen awake');
        } else {
            this.setMobileModeStatus('Fullscreen');
        }
    }

    async disableMobileMode() {
        this.mobileModeRequestId++;
        this.mobileModeEnabled = false;

        if (this.wakeLock) {
            try {
                await this.wakeLock.release();
            } catch (error) {
                console.warn('Unable to release screen wake lock:', error);
            }
            this.wakeLock = null;
        }

        if (this.keepAwakeVideo) {
            this.keepAwakeVideo.pause();
            this.keepAwakeVideo.srcObject = null;
        }

        if (this.keepAwakeInterval) {
            clearInterval(this.keepAwakeInterval);
            this.keepAwakeInterval = null;
        }

        this.keepAwakeCanvas = null;

        if (document.fullscreenElement) {
            try {
                await document.exitFullscreen();
            } catch (error) {
                console.warn('Unable to exit fullscreen:', error);
            }
        }

        this.setMobileModeStatus('Mobile mode');
    }

    async requestFullscreen() {
        if (!document.fullscreenElement) {
            await document.documentElement.requestFullscreen();
        }
    }

    async requestWakeLock() {
        if (!('wakeLock' in navigator)) {
            console.warn('Screen Wake Lock API is not available in this browser.');
            return;
        }

        try {
            this.wakeLock = await navigator.wakeLock.request('screen');
            this.wakeLock.addEventListener('release', () => {
                this.wakeLock = null;
                if (this.mobileModeEnabled && !document.hidden) {
                    this.setMobileModeStatus('Tap to reactivate');
                }
            });
        } catch (error) {
            console.warn('Unable to acquire screen wake lock:', error);
        }
    }

    async startKeepAwakeVideo() {
        if (!this.keepAwakeVideo.srcObject) {
            this.keepAwakeCanvas = document.createElement('canvas');
            this.keepAwakeCanvas.width = 2;
            this.keepAwakeCanvas.height = 2;

            const context = this.keepAwakeCanvas.getContext('2d');
            this.keepAwakeInterval = setInterval(() => {
                this.keepAwakeFrame = (this.keepAwakeFrame + 1) % 2;
                context.fillStyle = this.keepAwakeFrame ? '#000' : '#111';
                context.fillRect(0, 0, 2, 2);
            }, 1000);

            this.keepAwakeVideo.srcObject = this.keepAwakeCanvas.captureStream(1);
        }

        try {
            await this.keepAwakeVideo.play();
        } catch (error) {
            console.warn('Unable to start keep-awake video fallback:', error);
        }
    }

    setMobileModeStatus(text) {
        this.mobileModeBtn.textContent = text;
        this.mobileModeBtn.classList.toggle('active', this.mobileModeEnabled);
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
            this.requestFullscreen().catch(err => {
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
