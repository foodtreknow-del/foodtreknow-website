import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const testFunction = read('supabase/functions/test-checkout-start/index.ts');
const customerPayments = read('js/customer-payments.js');
const buildScript = read('scripts/build-web.mjs');
const testingWorkflow = read('.github/workflows/android-closed-test-build.yml');
const productionWorkflow = read('.github/workflows/android-release-build.yml');
const migration = read('supabase/migrations/202609130001_google_play_test_orders.sql');
const cancellationFunction = read('supabase/functions/stripe-order-cancel/index.ts');

test('no-charge checkout is restricted to server-side allowlisted tester emails', () => {
  assert.match(testFunction, /GOOGLE_PLAY_TESTER_EMAILS/);
  assert.match(testFunction, /auth\.getUser\(\)/);
  assert.match(testFunction, /allowedTesterEmails\(\)\.has\(testerEmail\)/);
  assert.doesNotMatch(testFunction, /api\.stripe\.com|STRIPE_SECRET_KEY/);
});

test('test orders are clearly identified and excluded from live Stripe state', () => {
  assert.match(testFunction, /Google Play Test - No Charge/);
  assert.match(testFunction, /is_test_order: true/);
  assert.match(testFunction, /stripe_livemode: false/);
  assert.match(migration, /is_test_order boolean not null default false/);
});

test('test-order cancellation never requests a Stripe refund', () => {
  assert.match(cancellationFunction, /ownedOrder\.is_test_order/);
  assert.match(cancellationFunction, /testPayment: true, noCharge: true/);
  assert.match(cancellationFunction, /stripe_refund_cents: 0/);
  assert.ok(cancellationFunction.indexOf('ownedOrder.is_test_order') < cancellationFunction.indexOf("userClient.rpc('begin_customer_paid_cancellation'"));
});

test('only the dedicated closed testing bundle selects no-charge checkout', () => {
  assert.match(buildScript, /FOODTREKNOW_PAYMENT_MODE/);
  assert.match(customerPayments, /test-checkout-start/);
  assert.match(testingWorkflow, /FOODTREKNOW_PAYMENT_MODE: test/);
  assert.doesNotMatch(productionWorkflow, /FOODTREKNOW_PAYMENT_MODE:\s*test/);
});
