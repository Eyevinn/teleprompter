const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const rootDir = path.join(__dirname, '..');

test('controller exposes settings preset controls', () => {
    const html = fs.readFileSync(path.join(rootDir, 'controller.html'), 'utf8');
    const js = fs.readFileSync(path.join(rootDir, 'controller.js'), 'utf8');

    assert.match(html, /id="preset-name"/);
    assert.match(html, /id="preset-select"/);
    assert.match(html, /id="save-preset"/);
    assert.match(html, /id="load-preset"/);
    assert.match(html, /id="delete-preset"/);
    assert.match(js, /presetsStorageKey/);
    assert.match(js, /savePreset/);
    assert.match(js, /loadSelectedPreset/);
    assert.match(js, /deleteSelectedPreset/);
});

test('controller exposes rerecording seek controls and hotkeys', () => {
    const html = fs.readFileSync(path.join(rootDir, 'controller.html'), 'utf8');
    const js = fs.readFileSync(path.join(rootDir, 'controller.js'), 'utf8');

    assert.match(html, /id="rewind-5-btn"/);
    assert.match(html, /id="rewind-10-btn"/);
    assert.match(html, /id="forward-5-btn"/);
    assert.match(js, /seekPlayback/);
    assert.match(js, /bindPlaybackHotkeys/);
    assert.match(js, /Alt\+Left/);
    assert.match(js, /Alt\+Right/);
});

test('controller syncs playback state before enabling seek controls', () => {
    const js = fs.readFileSync(path.join(rootDir, 'controller.js'), 'utf8');

    assert.match(js, /handleStateSync/);
    assert.match(js, /this\.isPlaying = Boolean\(state\.isPlaying\)/);
    assert.match(js, /this\.isPaused = Boolean\(state\.isPaused\)/);
    assert.match(js, /this\.setSeekButtonsDisabled\(!\(this\.isPlaying \|\| this\.isPaused\)\)/);
    assert.doesNotMatch(js, /this\.sendInitialState\(\);\s*};/);
});

test('server and display handle signed seek playback state', () => {
    const server = fs.readFileSync(path.join(rootDir, 'server.js'), 'utf8');
    const display = fs.readFileSync(path.join(rootDir, 'display.js'), 'utf8');

    assert.match(server, /case 'seek'/);
    assert.match(server, /Math\.max\(0, elapsedMs \+ milliseconds\)/);
    assert.match(display, /case 'seek'/);
    assert.match(display, /applyPlaybackState\(data\)/);
});
