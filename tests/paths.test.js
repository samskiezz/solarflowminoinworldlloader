const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const files = [
  path.join(__dirname, '..', 'docs', 'index.html'),
  path.join(__dirname, '..', 'docs', 'roster.html'),
  path.join(__dirname, '..', 'docs', 'realm.html')
];

test('GitHub Pages assets use relative paths', () => {
  files.forEach((file) => {
    const html = fs.readFileSync(file, 'utf8');
    const forbidden = /(src|href)=["']\//g;
    assert.equal(forbidden.test(html), false, `absolute root path found in ${path.basename(file)}`);
  });
});
