import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const workflow = fs.readFileSync(new URL('../.github/workflows/ios-production-build.yml', import.meta.url), 'utf8');

test('iOS production workflow creates a signed live-mode IPA without submitting it', () => {
  assert.match(workflow, /name: iOS Production Package/);
  assert.match(workflow, /release-builds\/production-1\.0\.14\.md/);
  assert.match(workflow, /Xcode_26\*\.app/);
  assert.match(workflow, /IOS_SDK_VERSION.*26\.\*/s);
  assert.match(workflow, /"paymentMode":"live"/);
  assert.match(workflow, /"distribution":"production"/);
  assert.match(workflow, /APPLE_CERTIFICATE_BASE64/);
  assert.match(workflow, /APPLE_PROVISIONING_PROFILE_BASE64/);
  assert.match(workflow, /MARKETING_VERSION="\$RELEASE_VERSION_NAME"/);
  assert.match(workflow, /CURRENT_PROJECT_VERSION="\$RELEASE_BUILD_NUMBER"/);
  assert.match(workflow, /FoodTrekNow-iOS-\$\{\{ env\.RELEASE_VERSION_NAME \}\}-\$\{\{ env\.RELEASE_BUILD_NUMBER \}\}/);
  assert.doesNotMatch(workflow, /--upload-app|Upload build to App Store Connect/);
});

