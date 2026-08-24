import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const workflow = fs.readFileSync(new URL('../.github/workflows/android-test-build.yml', import.meta.url), 'utf8');

test('Android workflow generates a tested API 36 debug application', () => {
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /node-version: "24"/);
  assert.match(workflow, /java-version: "21"/);
  assert.match(workflow, /platforms;android-36/);
  assert.match(workflow, /npm test/);
  assert.match(workflow, /npx cap add android/);
  assert.match(workflow, /targetSdkVersion = 36/);
  assert.match(workflow, /assembleDebug/);
});

test('Android test artifact contains no release signing configuration', () => {
  assert.match(workflow, /app-debug\.apk/);
  assert.match(workflow, /retention-days: 14/);
  assert.doesNotMatch(workflow, /keystore|storePassword|keyPassword|signingConfig/i);
});
