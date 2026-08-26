import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const workflow = fs.readFileSync(new URL('../.github/workflows/android-test-build.yml', import.meta.url), 'utf8');
const releaseWorkflow = fs.readFileSync(new URL('../.github/workflows/android-release-build.yml', import.meta.url), 'utf8');
const gradle = fs.readFileSync(new URL('../android/app/build.gradle', import.meta.url), 'utf8');
const manifest = fs.readFileSync(new URL('../android/app/src/main/AndroidManifest.xml', import.meta.url), 'utf8');

test('Android workflow generates a tested API 36 debug application', () => {
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /node-version: "24"/);
  assert.match(workflow, /java-version: "21"/);
  assert.match(workflow, /platforms;android-36/);
  assert.match(workflow, /npm test/);
  assert.match(workflow, /npx cap sync android/);
  assert.doesNotMatch(workflow, /npx cap add android/);
  assert.match(workflow, /targetSdkVersion = 36/);
  assert.match(workflow, /chmod \+x android\/gradlew/);
  assert.match(workflow, /assembleDebug/);
});

test('production workflow builds a versioned signed Android App Bundle', () => {
  assert.match(releaseWorkflow, /workflow_dispatch:/);
  assert.match(releaseWorkflow, /environment: google-play/);
  assert.match(releaseWorkflow, /ANDROID_KEYSTORE_BASE64/);
  assert.match(releaseWorkflow, /ANDROID_KEYSTORE_PASSWORD/);
  assert.match(releaseWorkflow, /ANDROID_KEY_ALIAS/);
  assert.match(releaseWorkflow, /ANDROID_KEY_PASSWORD/);
  assert.match(releaseWorkflow, /chmod \+x android\/gradlew/);
  assert.match(releaseWorkflow, /bundleRelease/);
  assert.match(releaseWorkflow, /jarsigner -verify -verbose -certs/);
  assert.match(releaseWorkflow, /app-release\.aab/);
  assert.doesNotMatch(releaseWorkflow, /BEGIN (?:RSA )?PRIVATE KEY|\.jks['"]?\s*:/);
});

test('native Android release accepts protected signing and version configuration', () => {
  assert.match(gradle, /FOODTREKNOW_VERSION_CODE/);
  assert.match(gradle, /FOODTREKNOW_VERSION_NAME/);
  assert.match(gradle, /ANDROID_KEYSTORE_PATH/);
  assert.match(gradle, /releaseSigningConfigured/);
  assert.match(manifest, /android:allowBackup="false"/);
  assert.match(manifest, /android:usesCleartextTraffic="false"/);
});

test('Android test artifact contains no release signing configuration', () => {
  assert.match(workflow, /app-debug\.apk/);
  assert.match(workflow, /retention-days: 14/);
  assert.doesNotMatch(workflow, /keystore|storePassword|keyPassword|signingConfig/i);
});
