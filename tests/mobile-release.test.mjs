import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const packageConfig = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const capacitor = JSON.parse(fs.readFileSync(new URL('../capacitor.config.json', import.meta.url), 'utf8'));
const buildScript = fs.readFileSync(new URL('../scripts/build-web.mjs', import.meta.url), 'utf8');
const ignore = fs.readFileSync(new URL('../.gitignore', import.meta.url), 'utf8');

test('Capacitor is configured inside the existing FoodTrekNow project', () => {
  assert.equal(capacitor.appId, 'com.foodtreknow.app');
  assert.equal(capacitor.appName, 'FoodTrekNow');
  assert.equal(capacitor.webDir, 'www');
  assert.equal(capacitor.server.androidScheme, 'https');
  assert.equal(capacitor.android.allowMixedContent, false);
  assert.equal(packageConfig.dependencies['@capacitor/core'], '8.5.0');
  assert.equal(packageConfig.dependencies['@capacitor/android'], '8.5.0');
  assert.match(packageConfig.scripts['mobile:sync'], /build:web.*cap sync/);
});

test('mobile web build copies only public application assets', () => {
  assert.match(buildScript, /path\.basename\(output\) !== 'www'/);
  for (const entry of ['index.html', 'manifest.webmanifest', 'service-worker.js', 'assets', 'css', 'js']) {
    assert.match(buildScript, new RegExp(`['"]${entry.replace('.', '\\.')}['"]`));
  }
  assert.doesNotMatch(buildScript, /supabase|tests|\.git/);
  assert.match(ignore, /^www\/$/m);
  assert.match(ignore, /\*\.keystore/);
  assert.match(ignore, /\*\.mobileprovision/);
});
