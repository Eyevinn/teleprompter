const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const displayJs = fs.readFileSync(path.join(__dirname, '..', 'display.js'), 'utf8');

test('display scroll speed is based on word count and real travel distance', () => {
    assert.match(displayJs, /countWords/);
    assert.match(displayJs, /measureLineCenterOffsets/);
    assert.match(displayJs, /calculateScrollMetrics/);
    assert.match(displayJs, /readingDurationMs/);
    assert.match(displayJs, /scrollDistance/);
    assert.match(displayJs, /firstLineCenter/);
    assert.match(displayJs, /lastLineCenter/);
    assert.match(displayJs, /lastLineCenter - firstLineCenter/);
    assert.doesNotMatch(displayJs, /pixelsPerSecond\s*=\s*wordsPerSecond\s*\*\s*12/);
    assert.doesNotMatch(displayJs, /offsetTop \+ this\.prompterText\.scrollHeight/);
});

test('display scroll advances from a locally measured requestAnimationFrame delta', () => {
    assert.match(displayJs, /playbackElapsedMs/);
    assert.match(displayJs, /lastAnimationTimestamp/);
    assert.match(displayJs, /const deltaMs = Math\.max\(0, timestamp - this\.lastAnimationTimestamp\)/);
    assert.match(displayJs, /this\.playbackElapsedMs \+= deltaMs/);
    assert.match(displayJs, /this\.currentPosition = this\.scrollMetrics\.firstLineCenter \+ elapsedMs \* this\.scrollMetrics\.pixelsPerMs/);
    assert.doesNotMatch(displayJs, /pixelsPerFrame\s*=\s*pixelsPerSecond\s*\/\s*60/);
    assert.doesNotMatch(displayJs, /this\.currentPosition \+=/);
    assert.doesNotMatch(displayJs, /Date\.now\(\) - this\.startTime/);
});

test('reset places the first rendered line on the reading center', () => {
    assert.match(displayJs, /this\.currentPosition = this\.scrollMetrics\.firstLineCenter/);
});

test('display applies scroll position in pixels, not translateY percentages', () => {
    assert.match(displayJs, /translateY\(\$\{translateY\}px\)/);
    assert.doesNotMatch(displayJs, /currentPosition \/ window\.innerHeight/);
});

test('starting scroll cancels any previous animation loop', () => {
    assert.match(displayJs, /startScrolling\(\)\s*\{[\s\S]*this\.stopScrolling\(\)/);
});
