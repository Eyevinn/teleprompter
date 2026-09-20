const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const rootDir = path.join(__dirname, '..');

test('controller exposes preroll and rewind controls', () => {
    const html = fs.readFileSync(path.join(rootDir, 'controller.html'), 'utf8');
    const js = fs.readFileSync(path.join(rootDir, 'controller.js'), 'utf8');

    assert.match(html, /id="preroll-seconds"/);
    assert.match(html, /id="rewind-10-btn"/);
    assert.match(js, /startPreroll/);
    assert.match(js, /rewindTenSeconds/);
    assert.match(js, /prerollSeconds/);
});

test('server can broadcast preroll and rewind playback state', () => {
    const server = fs.readFileSync(path.join(rootDir, 'server.js'), 'utf8');

    assert.match(server, /case 'startPreroll'/);
    assert.match(server, /case 'rewind'/);
    assert.match(server, /cancelPendingStart/);
    assert.match(server, /beginPlayback/);
    assert.match(server, /function getCurrentElapsedMs/);
    assert.match(server, /function getStateSnapshot/);
    assert.match(server, /elapsedMs: getCurrentElapsedMs\(\)/);
});

test('display handles preroll countdown and rewind messages', () => {
    const html = fs.readFileSync(path.join(rootDir, 'display.html'), 'utf8');
    const js = fs.readFileSync(path.join(rootDir, 'display.js'), 'utf8');

    assert.match(html, /id="preroll-countdown"/);
    assert.match(js, /case 'startPreroll'/);
    assert.match(js, /case 'rewind'/);
    assert.match(js, /startPrerollCountdown/);
    assert.match(js, /applyPlaybackState/);
    assert.match(js, /setPlaybackPosition/);
    assert.match(js, /elapsedMs/);
    assert.match(js, /typeof pausedTime === 'number'/);
});
