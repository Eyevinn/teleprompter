const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const rootDir = path.join(__dirname, '..');

test('controller uses production-focused layout sections', () => {
    const html = fs.readFileSync(path.join(rootDir, 'controller.html'), 'utf8');
    const css = fs.readFileSync(path.join(rootDir, 'controller.css'), 'utf8');

    assert.match(html, /class="controls-section settings-rail"/);
    assert.match(html, /class="[^"]*control-card[^"]*manuscript-card[^"]*"/);
    assert.match(html, /class="[^"]*control-card[^"]*reading-card[^"]*"/);
    assert.match(html, /class="[^"]*advanced-card[^"]*"/);
    assert.match(html, /class="transport-cluster"/);
    assert.match(html, /class="seek-cluster"/);
    assert.match(css, /grid-template-columns: minmax\(320px, 380px\) minmax\(0, 1fr\)/);
    assert.match(css, /position: sticky;\s*top: 16px/);
    assert.match(css, /#text-preview[\s\S]*min-height: clamp\(520px, 68vh, 980px\)/);
});
