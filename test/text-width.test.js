const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const rootDir = path.join(__dirname, '..');

test('controller exposes a text width slider', () => {
    const html = fs.readFileSync(path.join(rootDir, 'controller.html'), 'utf8');
    const js = fs.readFileSync(path.join(rootDir, 'controller.js'), 'utf8');

    assert.match(html, /id="text-width"/);
    assert.match(html, /id="text-width" min="20"/);
    assert.match(html, /id="text-width" min="20" max="100" value="20"/);
    assert.match(html, /id="text-width-display"/);
    assert.match(js, /updateTextWidth/);
    assert.match(js, /setTextWidth/);
});

test('server and display sync centered text width', () => {
    const server = fs.readFileSync(path.join(rootDir, 'server.js'), 'utf8');
    const displayJs = fs.readFileSync(path.join(rootDir, 'display.js'), 'utf8');
    const displayCss = fs.readFileSync(path.join(rootDir, 'display.css'), 'utf8');

    assert.match(server, /textWidth:\s*20/);
    assert.match(server, /case 'setTextWidth'/);
    assert.match(displayJs, /Math\.max\(20/);
    assert.match(displayJs, /setTextWidth/);
    assert.match(displayCss, /left:\s*50%/);
    assert.match(displayCss, /max-width:\s*var\(--prompter-text-width/);
    assert.match(displayCss, /overflow-wrap:\s*break-word/);
    assert.match(displayCss, /word-break:\s*normal/);
});

test('personal default font size and text width are applied', () => {
    const html = fs.readFileSync(path.join(rootDir, 'controller.html'), 'utf8');
    const js = fs.readFileSync(path.join(rootDir, 'controller.js'), 'utf8');

    assert.match(html, /id="font-size" min="16" max="72" value="32"/);
    assert.match(html, /id="font-size-display">32px</);
    assert.match(html, /id="text-width-display">20%/);
    assert.match(js, /fontSize:\s*32/);
    assert.match(js, /textWidth:\s*20/);
    assert.match(js, /localStorage/);
});
