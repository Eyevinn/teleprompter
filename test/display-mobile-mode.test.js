const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const rootDir = path.join(__dirname, '..');

test('display page exposes a mobile mode control', () => {
    const html = fs.readFileSync(path.join(rootDir, 'display.html'), 'utf8');

    assert.match(html, /id="mobile-mode-btn"/);
    assert.match(html, /Mobile mode/);
    assert.doesNotMatch(html, /Modo móvil/);
});

test('display mobile mode requests fullscreen and screen wake lock', () => {
    const js = fs.readFileSync(path.join(rootDir, 'display.js'), 'utf8');

    assert.match(js, /requestFullscreen/);
    assert.match(js, /navigator\.wakeLock\.request\('screen'\)/);
    assert.match(js, /Mobile mode active/);
    assert.match(js, /Tap to reactivate/);
    assert.doesNotMatch(js, /Modo móvil|Pantalla|Toca|Activando/);
});

test('display mobile mode starts a keep-awake video fallback', () => {
    const html = fs.readFileSync(path.join(rootDir, 'display.html'), 'utf8');
    const js = fs.readFileSync(path.join(rootDir, 'display.js'), 'utf8');

    assert.match(html, /id="keep-awake-video"/);
    assert.match(js, /captureStream/);
    assert.match(js, /keepAwakeVideo\.play\(\)/);
});

test('display mobile mode can be toggled off', () => {
    const js = fs.readFileSync(path.join(rootDir, 'display.js'), 'utf8');

    assert.match(js, /toggleMobileMode/);
    assert.match(js, /disableMobileMode/);
    assert.match(js, /wakeLock\.release\(\)/);
    assert.match(js, /keepAwakeVideo\.pause\(\)/);
    assert.match(js, /document\.exitFullscreen\(\)/);
    assert.match(js, /mobileModeRequestId/);
});

test('mobile mode control is positioned with the timer bar on phones', () => {
    const css = fs.readFileSync(path.join(rootDir, 'display.css'), 'utf8');

    assert.match(css, /@media \(max-width: 768px\)[\s\S]*\.mobile-mode-btn\s*\{[\s\S]*top: max\(8px, env\(safe-area-inset-top\)\)/);
    assert.match(css, /@media \(max-width: 768px\)[\s\S]*\.connection-status\s*\{[\s\S]*top: calc\(52px \+ env\(safe-area-inset-top\)\)/);
    assert.match(css, /@media \(orientation: landscape\) and \(max-height: 600px\)[\s\S]*\.mobile-mode-btn\s*\{[\s\S]*top: max\(8px, env\(safe-area-inset-top\)\)/);
});

test('mirror mode flips all visible display chrome', () => {
    const css = fs.readFileSync(path.join(rootDir, 'display.css'), 'utf8');
    const js = fs.readFileSync(path.join(rootDir, 'display.js'), 'utf8');

    assert.doesNotMatch(css, /\.mirror-mode\s*\{\s*transform:\s*scaleX\(-1\)/);
    assert.match(css, /\.mirror-mode\s+#prompter-text\s*\{/);
    assert.match(css, /\.mirror-mode\s+\.timer-display\s*\{/);
    assert.match(css, /\.mirror-mode\s+\.mobile-mode-btn\s*\{/);
    assert.match(css, /\.mirror-mode\s+\.connection-status\s*\{/);
    assert.match(css, /\.mirror-mode\s+\.on-air-indicator\s*\{/);
    assert.match(js, /getPrompterTransform/);
    assert.match(js, /scaleX\(-1\)/);
});
