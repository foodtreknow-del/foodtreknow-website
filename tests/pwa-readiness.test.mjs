import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const manifest = JSON.parse(fs.readFileSync(new URL('../manifest.webmanifest', import.meta.url), 'utf8'));
const worker = fs.readFileSync(new URL('../service-worker.js', import.meta.url), 'utf8');
const registration = fs.readFileSync(new URL('../js/pwa.js', import.meta.url), 'utf8');

test('FoodTrekNow exposes installable mobile web metadata', () => {
  assert.match(html, /rel="manifest" href="manifest\.webmanifest"/);
  assert.match(html, /name="theme-color"/);
  assert.match(html, /rel="apple-touch-icon"/);
  assert.equal(manifest.name, 'FoodTrekNow');
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.icons[0].purpose, 'any maskable');
});

test('service worker caches only same-origin app assets and preserves live APIs', () => {
  assert.match(registration, /serviceWorker\.register\('\.\/service-worker\.js'\)/);
  assert.match(worker, /url\.origin !== self\.location\.origin/);
  assert.match(worker, /event\.request\.method !== 'GET'/);
  assert.match(worker, /event\.request\.mode === 'navigate'/);
  assert.doesNotMatch(worker, /supabase\.co|stripe\.com|sk_(?:test|live)_|whsec_/);
});
