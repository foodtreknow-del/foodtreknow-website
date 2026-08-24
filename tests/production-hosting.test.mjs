import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const config = JSON.parse(fs.readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));

test('Vercel production hosting keeps the service worker updateable', () => {
  const worker = config.headers.find(rule => rule.source === '/service-worker.js');
  assert.ok(worker);
  assert.equal(worker.headers.find(header => header.key === 'Cache-Control')?.value, 'public, max-age=0, must-revalidate');
  assert.equal(worker.headers.find(header => header.key === 'Service-Worker-Allowed')?.value, '/');
});

test('production responses include baseline mobile web security headers', () => {
  const global = config.headers.find(rule => rule.source === '/(.*)');
  const headers = Object.fromEntries(global.headers.map(header => [header.key, header.value]));
  assert.equal(headers['X-Content-Type-Options'], 'nosniff');
  assert.equal(headers['X-Frame-Options'], 'DENY');
  assert.match(headers['Strict-Transport-Security'], /max-age=31536000/);
  assert.match(headers['Permissions-Policy'], /camera=\(\)/);
  assert.match(headers['Permissions-Policy'], /geolocation=\(self\)/);
});
