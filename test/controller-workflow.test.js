const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const rootDir = path.join(__dirname, '..');

test('controller groups the practical teleprompter workflow first', () => {
    const html = fs.readFileSync(path.join(rootDir, 'controller.html'), 'utf8');

    assert.match(html, /class="control-card manuscript-card/);
    assert.match(html, /class="[^"]*format-toolbar[^"]*"/);
    assert.match(html, /id="bold-text"/);
    assert.match(html, /id="italic-text"/);
    assert.match(html, /id="highlight-text"/);
    assert.match(html, /id="clear-formatting"/);
    assert.match(html, /class="editor-format-toolbar format-toolbar"/);
    assert.match(html, /class="control-card reading-card/);
    assert.match(html, /id="reading-guide"/);
    assert.match(html, /<details class="control-card advanced-card/);
    assert.match(html, /class="control-card preset-controls/);
});

test('controller sends rich text formatting and reading guide changes', () => {
    const js = fs.readFileSync(path.join(rootDir, 'controller.js'), 'utf8');

    assert.match(js, /applyEditorCommand/);
    assert.match(js, /applyHighlight/);
    assert.match(js, /clearEditorFormatting/);
    assert.match(js, /updateReadingGuide/);
    assert.match(js, /type: 'setReadingGuide'/);
    assert.match(js, /document\.execCommand/);
});

test('controller display URL copy uses the clean display route', () => {
    const html = fs.readFileSync(path.join(rootDir, 'controller.html'), 'utf8');
    const js = fs.readFileSync(path.join(rootDir, 'controller.js'), 'utf8');

    assert.match(html, /Open display/);
    assert.match(js, /\/display`/);
    assert.doesNotMatch(html, /display\.html/);
    assert.doesNotMatch(js, /\/display\.html/);
});

test('server and display sync optional reading guide', () => {
    const server = fs.readFileSync(path.join(rootDir, 'server.js'), 'utf8');
    const displayHtml = fs.readFileSync(path.join(rootDir, 'display.html'), 'utf8');
    const displayJs = fs.readFileSync(path.join(rootDir, 'display.js'), 'utf8');
    const displayCss = fs.readFileSync(path.join(rootDir, 'display.css'), 'utf8');

    assert.match(server, /readingGuide: false/);
    assert.match(server, /case 'setReadingGuide'/);
    assert.match(displayHtml, /id="reading-guide-line"/);
    assert.match(displayJs, /text\.includes\('<'/);
    assert.match(displayJs, /setReadingGuide/);
    assert.match(displayCss, /\.reading-guide-line\.active/);
});
