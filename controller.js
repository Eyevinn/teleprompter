class TeleprompterController {
    constructor() {
        this.settingsStorageKey = 'openTeleprompter.settings';
        this.presetsStorageKey = 'openTeleprompter.presets';
        this.defaultSettings = {
            speed: 55,
            fontSize: 32,
            textWidth: 20,
            prerollSeconds: 0
        };
        const savedSettings = this.loadSavedSettings();

        this.ws = null;
        this.isPlaying = false;
        this.isPaused = false;
        this.currentPosition = 0;
        this.startTime = null;
        this.pausedTime = 0;
        this.segmentDuration = 10 * 60 * 1000;
        this.speed = savedSettings.speed;
        this.fontSize = savedSettings.fontSize;
        this.textWidth = savedSettings.textWidth;
        this.prerollSeconds = savedSettings.prerollSeconds;
        this.timerInterval = null;
        this.prerollTimeout = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        this.currentDisplayUrl = null;
        this.hasSyncedInitialState = false;
        
        this.initializeElements();
        this.applySavedSettingsToControls();
        this.renderPresetOptions();
        this.bindEvents();
        this.bindPlaybackHotkeys();
        this.connectWebSocket();
        this.updateDurationCalculations();
        this.updateDisplayUrl();
    }

    loadSavedSettings() {
        try {
            const savedSettings = JSON.parse(localStorage.getItem(this.settingsStorageKey) || '{}');
            return {
                speed: this.clampSetting(savedSettings.speed, 30, 300, this.defaultSettings.speed),
                fontSize: this.clampSetting(savedSettings.fontSize, 16, 72, this.defaultSettings.fontSize),
                textWidth: this.clampSetting(savedSettings.textWidth, 20, 100, this.defaultSettings.textWidth),
                prerollSeconds: this.clampSetting(savedSettings.prerollSeconds, 0, 60, this.defaultSettings.prerollSeconds)
            };
        } catch (error) {
            console.warn('Unable to load saved teleprompter settings:', error);
            return { ...this.defaultSettings };
        }
    }

    clampSetting(value, min, max, fallback) {
        const parsedValue = parseInt(value);
        if (Number.isNaN(parsedValue)) {
            return fallback;
        }
        return Math.min(max, Math.max(min, parsedValue));
    }

    saveSettings() {
        try {
            localStorage.setItem(this.settingsStorageKey, JSON.stringify({
                speed: this.speed,
                fontSize: this.fontSize,
                textWidth: this.textWidth,
                prerollSeconds: this.prerollSeconds
            }));
        } catch (error) {
            console.warn('Unable to save teleprompter settings:', error);
        }
    }

    applySavedSettingsToControls() {
        this.speedControl.value = this.speed;
        this.speedDisplay.textContent = this.speed;
        this.fontSizeControl.value = this.fontSize;
        this.fontSizeDisplay.textContent = this.fontSize + 'px';
        this.textWidthControl.value = this.textWidth;
        this.textWidthDisplay.textContent = this.textWidth + '%';
        this.prerollSecondsInput.value = this.prerollSeconds;
    }
    
    initializeElements() {
        this.fileUpload = document.getElementById('file-upload');
        this.clearBtn = document.getElementById('clear-text');
        this.speedControl = document.getElementById('speed-control');
        this.speedDisplay = document.getElementById('speed-display');
        this.segmentMinutesInput = document.getElementById('segment-minutes');
        this.segmentSecondsInput = document.getElementById('segment-seconds');
        this.fontSizeControl = document.getElementById('font-size');
        this.fontSizeDisplay = document.getElementById('font-size-display');
        this.textWidthControl = document.getElementById('text-width');
        this.textWidthDisplay = document.getElementById('text-width-display');
        this.prerollSecondsInput = document.getElementById('preroll-seconds');
        this.readingGuideCheckbox = document.getElementById('reading-guide');
        this.presetNameInput = document.getElementById('preset-name');
        this.presetSelect = document.getElementById('preset-select');
        this.savePresetBtn = document.getElementById('save-preset');
        this.loadPresetBtn = document.getElementById('load-preset');
        this.deletePresetBtn = document.getElementById('delete-preset');
        this.mirrorModeCheckbox = document.getElementById('mirror-mode');
        this.hideTimerCheckbox = document.getElementById('hide-timer');
        this.onAirModeCheckbox = document.getElementById('on-air-mode');
        this.scheduledStartInput = document.getElementById('scheduled-start');
        this.clearScheduleBtn = document.getElementById('clear-schedule');
        this.scheduleInfo = document.getElementById('schedule-info');
        this.startBtn = document.getElementById('start-btn');
        this.pauseBtn = document.getElementById('pause-btn');
        this.rewind5Btn = document.getElementById('rewind-5-btn');
        this.rewind10Btn = document.getElementById('rewind-10-btn');
        this.forward5Btn = document.getElementById('forward-5-btn');
        this.seekButtons = [this.rewind5Btn, this.rewind10Btn, this.forward5Btn];
        this.resetBtn = document.getElementById('reset-btn');
        this.textPreview = document.getElementById('text-preview');
        this.wordCount = document.getElementById('word-count');
        this.wordCountLegacy = document.getElementById('word-count-legacy');
        this.expectedDuration = document.getElementById('expected-duration');
        this.expectedDurationLegacy = document.getElementById('expected-duration-legacy');
        this.durationDiff = document.getElementById('duration-diff');
        this.diffValue = document.getElementById('diff-value');
        this.segmentTimer = document.getElementById('segment-timer');
        this.elapsedTimer = document.getElementById('elapsed-timer');
        this.connectionStatus = document.getElementById('connection-status');
        this.statusIndicator = this.connectionStatus.querySelector('.status-indicator');
        this.statusText = this.connectionStatus.querySelector('.status-text');
        this.displayUrl = document.getElementById('display-url');
        this.copyUrlBtn = document.getElementById('copy-url');
        this.formatBtn = document.getElementById('format-text');
        this.formattingOptions = document.getElementById('formatting-options');
        this.autoFormatCheckbox = document.getElementById('auto-format');
        this.formatCapsCheckbox = document.getElementById('format-caps');
        this.formatSentencesCheckbox = document.getElementById('format-sentences');
        this.formatParagraphsCheckbox = document.getElementById('format-paragraphs');
        this.formatPunctuationCheckbox = document.getElementById('format-punctuation');
        this.formatNumbersCheckbox = document.getElementById('format-numbers');
        this.boldTextBtn = document.getElementById('bold-text');
        this.italicTextBtn = document.getElementById('italic-text');
        this.highlightTextBtn = document.getElementById('highlight-text');
        this.accentTextBtn = document.getElementById('accent-text');
        this.clearFormattingBtn = document.getElementById('clear-formatting');
    }
    
    bindEvents() {
        this.fileUpload.addEventListener('change', (e) => this.handleFileUpload(e));
        this.clearBtn.addEventListener('click', () => this.clearText());
        this.speedControl.addEventListener('input', (e) => this.updateSpeed(e.target.value));
        this.segmentMinutesInput.addEventListener('input', () => this.updateSegmentLength());
        this.segmentSecondsInput.addEventListener('input', () => this.updateSegmentLength());
        this.fontSizeControl.addEventListener('input', (e) => this.updateFontSize(e.target.value));
        this.textWidthControl.addEventListener('input', (e) => this.updateTextWidth(e.target.value));
        this.prerollSecondsInput.addEventListener('input', (e) => this.updatePrerollSeconds(e.target.value));
        this.readingGuideCheckbox.addEventListener('change', (e) => this.updateReadingGuide(e.target.checked));
        this.mirrorModeCheckbox.addEventListener('change', (e) => this.updateMirrorMode(e.target.checked));
        this.hideTimerCheckbox.addEventListener('change', (e) => this.updateHideTimer(e.target.checked));
        this.onAirModeCheckbox.addEventListener('change', (e) => this.updateOnAir(e.target.checked));
        this.scheduledStartInput.addEventListener('change', () => this.updateScheduledStart());
        this.clearScheduleBtn.addEventListener('click', () => this.clearScheduledStart());
        this.savePresetBtn.addEventListener('click', () => this.savePreset());
        this.loadPresetBtn.addEventListener('click', () => this.loadSelectedPreset());
        this.deletePresetBtn.addEventListener('click', () => this.deleteSelectedPreset());
        this.startBtn.addEventListener('click', () => this.start());
        this.pauseBtn.addEventListener('click', () => this.pause());
        this.rewind5Btn.addEventListener('click', () => this.seekPlayback(-5000));
        this.rewind10Btn.addEventListener('click', () => this.seekPlayback(-10000));
        this.forward5Btn.addEventListener('click', () => this.seekPlayback(5000));
        this.resetBtn.addEventListener('click', () => this.reset());
        this.copyUrlBtn.addEventListener('click', () => this.copyDisplayUrl());
        this.formatBtn.addEventListener('click', () => this.formatTextForTeleprompter());
        this.boldTextBtn.addEventListener('click', () => this.applyEditorCommand('bold'));
        this.italicTextBtn.addEventListener('click', () => this.applyEditorCommand('italic'));
        this.highlightTextBtn.addEventListener('click', () => this.applyHighlight());
        this.accentTextBtn.addEventListener('click', () => this.applyEditorCommand('foreColor', '#ffd166'));
        this.clearFormattingBtn.addEventListener('click', () => this.clearEditorFormatting());
        
        // Initially show formatting options
        this.formattingOptions.style.display = 'block';
        
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

    bindPlaybackHotkeys() {
        document.addEventListener('keydown', (event) => {
            const target = event.target;
            const isTyping = target && (
                target.isContentEditable ||
                ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
            );

            if (isTyping || !event.altKey) {
                return;
            }

            if (event.key === 'ArrowLeft') {
                event.preventDefault();
                this.seekPlayback(event.shiftKey ? -10000 : -5000); // Alt+Left / Alt+Shift+Left
            } else if (event.key === 'ArrowRight') {
                event.preventDefault();
                this.seekPlayback(5000); // Alt+Right
            }
        });
    }

    loadPresets() {
        try {
            return JSON.parse(localStorage.getItem(this.presetsStorageKey) || '{}');
        } catch (error) {
            console.warn('Unable to load teleprompter presets:', error);
            return {};
        }
    }

    savePresets(presets) {
        try {
            localStorage.setItem(this.presetsStorageKey, JSON.stringify(presets));
        } catch (error) {
            console.warn('Unable to save teleprompter presets:', error);
        }
    }

    getCurrentSettingsPreset() {
        return {
            speed: this.speed,
            fontSize: this.fontSize,
            textWidth: this.textWidth,
            prerollSeconds: this.prerollSeconds,
            segmentMinutes: parseInt(this.segmentMinutesInput.value) || 0,
            segmentSeconds: parseInt(this.segmentSecondsInput.value) || 0,
            mirrorMode: this.mirrorModeCheckbox.checked,
            hideTimer: this.hideTimerCheckbox.checked,
            readingGuide: this.readingGuideCheckbox.checked
        };
    }

    renderPresetOptions(selectedName = this.presetSelect.value) {
        const presets = this.loadPresets();
        const names = Object.keys(presets).sort((a, b) => a.localeCompare(b));

        this.presetSelect.innerHTML = names.length
            ? names.map(name => `<option value="${this.escapeHtml(name)}">${this.escapeHtml(name)}</option>`).join('')
            : '<option value="">No presets saved</option>';
        this.presetSelect.disabled = names.length === 0;
        this.loadPresetBtn.disabled = names.length === 0;
        this.deletePresetBtn.disabled = names.length === 0;

        if (selectedName && presets[selectedName]) {
            this.presetSelect.value = selectedName;
        }
    }

    savePreset() {
        const name = this.presetNameInput.value.trim();
        if (!name) {
            alert('Preset name is required');
            return;
        }

        const presets = this.loadPresets();
        presets[name] = this.getCurrentSettingsPreset();
        this.savePresets(presets);
        this.presetNameInput.value = '';
        this.renderPresetOptions(name);
    }

    loadSelectedPreset() {
        const presets = this.loadPresets();
        const preset = presets[this.presetSelect.value];
        if (!preset) {
            return;
        }

        this.applyPreset(preset);
    }

    deleteSelectedPreset() {
        const name = this.presetSelect.value;
        if (!name) {
            return;
        }

        const presets = this.loadPresets();
        delete presets[name];
        this.savePresets(presets);
        this.renderPresetOptions();
    }

    applyPreset(preset) {
        this.updateSpeed(preset.speed ?? this.speed);
        this.updateFontSize(preset.fontSize ?? this.fontSize);
        this.updateTextWidth(preset.textWidth ?? this.textWidth);
        this.updatePrerollSeconds(preset.prerollSeconds ?? this.prerollSeconds);
        this.segmentMinutesInput.value = this.clampSetting(preset.segmentMinutes, 0, 99, parseInt(this.segmentMinutesInput.value) || 0);
        this.segmentSecondsInput.value = this.clampSetting(preset.segmentSeconds, 0, 59, parseInt(this.segmentSecondsInput.value) || 0);
        this.mirrorModeCheckbox.checked = Boolean(preset.mirrorMode);
        this.hideTimerCheckbox.checked = Boolean(preset.hideTimer);
        this.readingGuideCheckbox.checked = Boolean(preset.readingGuide);
        this.updateSegmentLength();
        this.updateMirrorMode(this.mirrorModeCheckbox.checked);
        this.updateHideTimer(this.hideTimerCheckbox.checked);
        this.updateReadingGuide(this.readingGuideCheckbox.checked);
    }

    escapeHtml(value) {
        return String(value)
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#39;');
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
                
                // Register as controller
                this.ws.send(JSON.stringify({
                    type: 'register',
                    role: 'controller'
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
        this.sendMessage({ type: 'setTextWidth', value: this.textWidth });
        this.updateSegmentLength(); // This will send the segment length
        this.sendMessage({ type: 'setMirrorMode', enabled: this.mirrorModeCheckbox.checked });
        this.sendMessage({ type: 'setHideTimer', enabled: this.hideTimerCheckbox.checked });
        this.sendMessage({ type: 'setOnAir', enabled: this.onAirModeCheckbox.checked });
        this.sendMessage({ type: 'setReadingGuide', enabled: this.readingGuideCheckbox.checked });
        
        // Send scheduled start if set
        if (this.scheduledStartInput.value) {
            this.updateScheduledStart();
        }
    }
    
    handleMessage(data) {
        switch (data.type) {
            case 'stateSync':
                this.handleStateSync(data.state);
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

    handleStateSync(state) {
        if (!state) {
            return;
        }

        const serverHasSession = Boolean(state.text || state.isPlaying || state.isPaused || state.startTime);
        if (!serverHasSession && !this.hasSyncedInitialState) {
            this.hasSyncedInitialState = true;
            this.sendInitialState();
            return;
        }

        this.hasSyncedInitialState = true;

        if (state.text) {
            this.textPreview.innerHTML = state.text;
            this.updateDurationCalculations();
        }

        this.speed = this.clampSetting(state.speed, 30, 300, this.speed);
        this.fontSize = this.clampSetting(state.fontSize, 16, 72, this.fontSize);
        this.textWidth = this.clampSetting(state.textWidth, 20, 100, this.textWidth);
        this.applySavedSettingsToControls();

        const segmentLength = Number(state.segmentLength) || Math.round(this.segmentDuration / 1000);
        this.segmentDuration = segmentLength * 1000;
        this.segmentMinutesInput.value = Math.floor(segmentLength / 60);
        this.segmentSecondsInput.value = segmentLength % 60;

        this.mirrorModeCheckbox.checked = Boolean(state.mirrorMode);
        this.hideTimerCheckbox.checked = Boolean(state.hideTimer);
        this.onAirModeCheckbox.checked = Boolean(state.onAir);
        this.readingGuideCheckbox.checked = Boolean(state.readingGuide);

        this.isPlaying = Boolean(state.isPlaying);
        this.isPaused = Boolean(state.isPaused);
        this.startTime = state.startTime || null;
        this.pausedTime = state.pausedTime || 0;

        this.startBtn.disabled = this.isPlaying;
        this.pauseBtn.disabled = !this.isPlaying;
        this.setSeekButtonsDisabled(!(this.isPlaying || this.isPaused));

        if (this.isPlaying) {
            this.startTimer();
        } else {
            this.stopTimer();
        }
        this.updateDisplay();
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
        // Auto-format if enabled
        if (this.autoFormatCheckbox.checked) {
            text = this.formatTextForTeleprompterStandards(text);
        }
        
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

    applyEditorCommand(command, value = null) {
        this.textPreview.focus();
        document.execCommand(command, false, value);
        this.sendTextUpdate();
        this.updateDurationCalculations();
    }

    applyHighlight() {
        this.textPreview.focus();
        document.execCommand('backColor', false, '#fff3a3');
        document.execCommand('foreColor', false, '#000000');
        this.sendTextUpdate();
        this.updateDurationCalculations();
    }

    clearEditorFormatting() {
        const plainText = this.textPreview.textContent || this.textPreview.innerText || '';
        this.setPrompterTextDirectly(plainText);
    }
    
    updateSpeed(value) {
        this.speed = parseInt(value);
        this.speedDisplay.textContent = this.speed;
        this.saveSettings();
        this.sendMessage({ type: 'setSpeed', value: this.speed });
        this.updateDurationCalculations();
    }
    
    updateSegmentLength() {
        const minutes = parseInt(this.segmentMinutesInput.value) || 0;
        const seconds = parseInt(this.segmentSecondsInput.value) || 0;
        
        // Convert to milliseconds
        this.segmentDuration = (minutes * 60 + seconds) * 1000;
        
        // Send total seconds to server
        this.sendMessage({ 
            type: 'setSegmentLength', 
            minutes: minutes,
            seconds: seconds,
            totalSeconds: minutes * 60 + seconds
        });
        
        this.updateDurationCalculations();
        this.updateCountdownDisplay();
    }
    
    updateFontSize(value) {
        this.fontSize = parseInt(value);
        this.fontSizeDisplay.textContent = this.fontSize + 'px';
        this.saveSettings();
        this.sendMessage({ type: 'setFontSize', value: this.fontSize });
    }

    updateTextWidth(value) {
        this.textWidth = parseInt(value);
        this.textWidthDisplay.textContent = this.textWidth + '%';
        this.saveSettings();
        this.sendMessage({ type: 'setTextWidth', value: this.textWidth });
    }

    updatePrerollSeconds(value) {
        this.prerollSeconds = this.clampSetting(value, 0, 60, this.defaultSettings.prerollSeconds);
        this.prerollSecondsInput.value = this.prerollSeconds;
        this.saveSettings();
    }
    
    updateMirrorMode(enabled) {
        this.sendMessage({ type: 'setMirrorMode', enabled: enabled });
    }
    
    updateHideTimer(enabled) {
        this.sendMessage({ type: 'setHideTimer', enabled: enabled });
    }
    
    updateOnAir(enabled) {
        this.sendMessage({ type: 'setOnAir', enabled: enabled });
    }

    updateReadingGuide(enabled) {
        this.sendMessage({ type: 'setReadingGuide', enabled: enabled });
    }
    
    updateScheduledStart() {
        const scheduledTime = this.scheduledStartInput.value;
        if (scheduledTime) {
            const scheduledDate = new Date(scheduledTime);
            const now = new Date();
            
            if (scheduledDate <= now) {
                alert('Scheduled time must be in the future');
                this.scheduledStartInput.value = '';
                return;
            }
            
            this.scheduleInfo.innerHTML = `<span>Scheduled for: ${scheduledDate.toLocaleString()}</span>`;
            this.sendMessage({ 
                type: 'setScheduledStart', 
                scheduledTime: scheduledDate.getTime() 
            });
        } else {
            this.clearScheduledStart();
        }
    }
    
    clearScheduledStart() {
        this.scheduledStartInput.value = '';
        this.scheduleInfo.innerHTML = '<span>No scheduled start time set</span>';
        this.sendMessage({ type: 'clearScheduledStart' });
    }
    
    start() {
        if (this.isPaused) {
            this.resume();
            return;
        }

        if (this.prerollSeconds > 0) {
            this.startPreroll();
            return;
        }

        this.beginPlayback();
    }

    startPreroll() {
        this.startBtn.disabled = true;
        this.pauseBtn.disabled = false;
        this.setSeekButtonsDisabled(true);
        this.sendMessage({ type: 'startPreroll', seconds: this.prerollSeconds });

        clearTimeout(this.prerollTimeout);
        this.prerollTimeout = setTimeout(() => {
            this.beginPlayback(false);
        }, this.prerollSeconds * 1000);
    }

    beginPlayback(sendStartMessage = true) {
        clearTimeout(this.prerollTimeout);
        this.prerollTimeout = null;
        
        this.isPlaying = true;
        this.isPaused = false;
        this.startTime = Date.now() - (this.pausedTime || 0);
        
        // Auto-enable on air indicator
        this.onAirModeCheckbox.checked = true;
        
        this.startBtn.disabled = true;
        this.pauseBtn.disabled = false;
        this.setSeekButtonsDisabled(false);
        
        if (sendStartMessage) {
            this.sendMessage({ type: 'start' });
        }
        this.startTimer();
    }
    
    pause() {
        if (this.prerollTimeout && !this.isPlaying) {
            clearTimeout(this.prerollTimeout);
            this.prerollTimeout = null;
            this.isPaused = false;
            this.pausedTime = 0;
            this.startBtn.disabled = false;
            this.pauseBtn.disabled = true;
            this.setSeekButtonsDisabled(true);
            this.sendMessage({ type: 'reset' });
            this.stopTimer();
            this.updateDisplay();
            return;
        }

        this.isPaused = true;
        this.isPlaying = false;
        this.pausedTime = Date.now() - this.startTime;
        
        this.startBtn.disabled = false;
        this.pauseBtn.disabled = true;
        this.setSeekButtonsDisabled(false);
        
        this.sendMessage({ type: 'pause' });
        this.stopTimer();
    }
    
    resume() {
        this.isPlaying = true;
        this.isPaused = false;
        this.startTime = Date.now() - this.pausedTime;
        
        this.startBtn.disabled = true;
        this.pauseBtn.disabled = false;
        this.setSeekButtonsDisabled(false);
        
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
        this.setSeekButtonsDisabled(true);
        clearTimeout(this.prerollTimeout);
        this.prerollTimeout = null;
        
        this.sendMessage({ type: 'reset' });
        this.stopTimer();
        this.updateDisplay();
    }

    setSeekButtonsDisabled(disabled) {
        this.seekButtons.forEach(button => {
            button.disabled = disabled;
        });
    }

    rewindTenSeconds() {
        this.seekPlayback(-10000);
    }

    seekPlayback(milliseconds) {
        if (!this.isPlaying && !this.isPaused) {
            return;
        }

        const currentElapsed = this.startTime ? Date.now() - this.startTime : this.pausedTime;
        const nextElapsed = Math.max(0, currentElapsed + milliseconds);

        if (this.isPaused) {
            this.pausedTime = nextElapsed;
        } else {
            this.startTime = Date.now() - nextElapsed;
        }

        this.sendMessage({ type: 'seek', milliseconds });
        this.updateDisplay();
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
        this.wordCountLegacy.textContent = wordCount.toLocaleString();
        const expectedDuration = this.formatDuration(expectedDurationMs);
        this.expectedDuration.textContent = expectedDuration;
        this.expectedDurationLegacy.textContent = expectedDuration;
        
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
    
    getBrowserDisplayUrl() {
        const protocol = window.location.protocol;
        const hostname = window.location.hostname;
        const port = window.location.port ? `:${window.location.port}` : '';
        return `${protocol}//${hostname}${port}/display`;
    }

    async updateDisplayUrl() {
        let displayUrl = this.getBrowserDisplayUrl();

        try {
            const response = await fetch('/config.json');
            if (response.ok) {
                const config = await response.json();
                displayUrl = config.displayUrl || displayUrl;
            }
        } catch (error) {
            console.warn('Unable to load public display URL config:', error);
        }

        this.currentDisplayUrl = displayUrl;
        this.displayUrl.textContent = displayUrl;
    }
    
    copyDisplayUrl() {
        const displayUrl = this.currentDisplayUrl || this.getBrowserDisplayUrl();
        
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
    
    formatTextForTeleprompter() {
        const currentText = this.textPreview.textContent || this.textPreview.innerText || '';
        if (!currentText.trim()) {
            alert('No text to format. Please upload a manuscript or enter text first.');
            return;
        }
        
        const formattedText = this.formatTextForTeleprompterStandards(currentText);
        this.setPrompterTextDirectly(formattedText);
    }
    
    setPrompterTextDirectly(text) {
        const paragraphs = text.split('\n\n').filter(p => p.trim().length > 0);
        this.textPreview.innerHTML = paragraphs.map(p => `<p>${p.trim()}</p>`).join('');
        this.sendTextUpdate();
        this.updateDurationCalculations();
    }
    
    formatTextForTeleprompterStandards(text) {
        let formattedText = text;
        
        // Apply selected formatting options
        if (this.formatCapsCheckbox.checked) {
            formattedText = this.convertToUppercase(formattedText);
        }
        
        if (this.formatNumbersCheckbox.checked) {
            formattedText = this.convertNumbersToWords(formattedText);
        }
        
        if (this.formatPunctuationCheckbox.checked) {
            formattedText = this.enhancePunctuationPauses(formattedText);
        }
        
        if (this.formatSentencesCheckbox.checked) {
            formattedText = this.formatSentenceBreaks(formattedText);
        }
        
        if (this.formatParagraphsCheckbox.checked) {
            formattedText = this.addParagraphBreaks(formattedText);
        }
        
        return formattedText;
    }
    
    convertToUppercase(text) {
        return text.toUpperCase();
    }
    
    convertNumbersToWords(text) {
        const numberWords = {
            '0': 'ZERO', '1': 'ONE', '2': 'TWO', '3': 'THREE', '4': 'FOUR',
            '5': 'FIVE', '6': 'SIX', '7': 'SEVEN', '8': 'EIGHT', '9': 'NINE',
            '10': 'TEN', '11': 'ELEVEN', '12': 'TWELVE', '13': 'THIRTEEN',
            '14': 'FOURTEEN', '15': 'FIFTEEN', '16': 'SIXTEEN', '17': 'SEVENTEEN',
            '18': 'EIGHTEEN', '19': 'NINETEEN', '20': 'TWENTY', '30': 'THIRTY',
            '40': 'FORTY', '50': 'FIFTY', '60': 'SIXTY', '70': 'SEVENTY',
            '80': 'EIGHTY', '90': 'NINETY', '100': 'ONE HUNDRED'
        };
        
        // Convert simple numbers (0-100) to words
        return text.replace(/\b(\d{1,3})\b/g, (match, number) => {
            const num = parseInt(number);
            if (numberWords[num]) {
                return numberWords[num];
            } else if (num < 100) {
                const tens = Math.floor(num / 10) * 10;
                const ones = num % 10;
                if (tens > 0 && ones > 0) {
                    return `${numberWords[tens]}-${numberWords[ones]}`;
                }
            }
            return match; // Return original if not found
        });
    }
    
    enhancePunctuationPauses(text) {
        // Add extra spaces for natural pauses
        return text
            .replace(/\./g, '. ')  // Period pause
            .replace(/,/g, ', ')   // Comma pause
            .replace(/;/g, '; ')   // Semicolon pause
            .replace(/:/g, ': ')   // Colon pause
            .replace(/\?/g, '? ')  // Question pause
            .replace(/!/g, '! ')   // Exclamation pause
            .replace(/\s+/g, ' ')  // Clean up multiple spaces
            .trim();
    }
    
    formatSentenceBreaks(text) {
        // Put each sentence on its own line
        return text
            .replace(/([.!?])\s+/g, '$1\n\n')  // Line break after sentence-ending punctuation
            .replace(/\n\n+/g, '\n\n')         // Clean up multiple line breaks
            .trim();
    }
    
    addParagraphBreaks(text) {
        // Ensure proper paragraph spacing for teleprompter readability
        const sentences = text.split(/\n\n/);
        const groupedSentences = [];
        
        // Group sentences into logical paragraphs (3-4 sentences max)
        for (let i = 0; i < sentences.length; i += 3) {
            const paragraph = sentences.slice(i, i + 3).join('\n\n');
            groupedSentences.push(paragraph);
        }
        
        return groupedSentences.join('\n\n\n'); // Extra space between paragraphs
    }
}

// Initialize controller when page loads
document.addEventListener('DOMContentLoaded', () => {
    new TeleprompterController();
});
