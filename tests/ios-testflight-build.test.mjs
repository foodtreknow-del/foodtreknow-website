import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const workflow = fs.readFileSync(
  new URL('../.github/workflows/ios-testflight-build.yml', import.meta.url),
  'utf8'
);

test('TestFlight workflow builds a signed no-charge iOS release', () => {
  assert.match(workflow, /runs-on: macos-latest/);
  assert.match(workflow, /FOODTREKNOW_PAYMENT_MODE: test/);
  assert.match(workflow, /pnpm exec cap sync ios/);
  assert.match(workflow, /xcodebuild[\s\S]*clean archive/);
  assert.match(workflow, /MARKETING_VERSION="\$RELEASE_VERSION_NAME"/);
  assert.match(workflow, /CURRENT_PROJECT_VERSION="\$RELEASE_BUILD_NUMBER"/);
  assert.match(workflow, /FoodTrekNow-iOS-TEST/);
});

test('TestFlight workflow uses protected signing and App Store Connect credentials', () => {
  assert.match(workflow, /secrets\.APPLE_CERTIFICATE_BASE64/);
  assert.match(workflow, /secrets\.APPLE_CERTIFICATE_PASSWORD/);
  assert.match(workflow, /secrets\.APPLE_PROVISIONING_PROFILE_BASE64/);
  assert.match(workflow, /secrets\.APP_STORE_CONNECT_API_KEY_ID/);
  assert.match(workflow, /secrets\.APP_STORE_CONNECT_ISSUER_ID/);
  assert.match(workflow, /secrets\.APP_STORE_CONNECT_API_PRIVATE_KEY/);
  assert.match(workflow, /xcrun altool --upload-app/);
  assert.doesNotMatch(workflow, /BEGIN (?:EC )?PRIVATE KEY/);
  assert.doesNotMatch(workflow, /Q8CSN4357X|3d6febd0-9ded-45d7-b8e3-fbab654f46f1/);
});
