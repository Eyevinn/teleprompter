const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const rootDir = path.join(__dirname, '..');

test('speed control supports 30 words per minute', () => {
    const html = fs.readFileSync(path.join(rootDir, 'controller.html'), 'utf8');

    assert.match(html, /id="speed-control" min="30"/);
});

test('personal default speed is 55 words per minute', () => {
    const html = fs.readFileSync(path.join(rootDir, 'controller.html'), 'utf8');
    const js = fs.readFileSync(path.join(rootDir, 'controller.js'), 'utf8');

    assert.match(html, /id="speed-control" min="30" max="300" value="55"/);
    assert.match(html, /id="speed-display">55</);
    assert.match(js, /speed:\s*55/);
});
