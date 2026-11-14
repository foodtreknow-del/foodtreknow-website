import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const app = fs.readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');

test('vendor menu saves the entered base price independently of size options', () => {
  assert.match(app, /const price=enteredPrice;/);
  assert.doesNotMatch(app, /const price=sizeOptions\.length\?Math\.min/);
});
