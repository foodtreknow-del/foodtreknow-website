import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const migration = fs.readFileSync(new URL('../supabase/migrations/202608230008_stripe_customer_checkout.sql', import.meta.url), 'utf8');
const startFunction = fs.readFileSync(new URL('../supabase/functions/stripe-checkout-start/index.ts', import.meta.url), 'utf8');
const completeFunction = fs.readFileSync(new URL('../supabase/functions/stripe-checkout-complete/index.ts', import.meta.url), 'utf8');
const webhookFunction = fs.readFileSync(new URL('../supabase/functions/stripe-webhook/index.ts', import.meta.url), 'utf8');
const browserSource = fs.readFileSync(new URL('../js/customer-payments.js', import.meta.url), 'utf8');
const accountSource = fs.readFileSync(new URL('../js/customer-account.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('checkout drafts use server menu prices and the selected active vendor account', () => {
  assert.match(migration, /create table if not exists public\.payment_checkout_drafts/i);
  assert.match(migration, /selected_item\.price \* item_quantity/i);
  assert.match(migration, /and not is_sold_out/i);
  assert.match(migration, /account\.status = 'active'/i);
  assert.match(migration, /account\.charges_enabled/i);
  assert.match(migration, /account\.payouts_enabled/i);
  assert.match(migration, /grant execute on function public\.finalize_paid_checkout[\s\S]*to service_role/i);
  assert.doesNotMatch(migration, /grant execute on function public\.finalize_paid_checkout[\s\S]*to authenticated/i);
});

test('Checkout is created as a direct charge on the selected connected account', () => {
  assert.match(startFunction, /\/v1\/checkout\/sessions/);
  assert.match(startFunction, /'Stripe-Account': stripeAccountId/);
  assert.match(startFunction, /Idempotency-Key/);
  assert.match(startFunction, /metadata\[foodtreknow_draft_id\]/);
  assert.match(startFunction, /success_url/);
  assert.match(startFunction, /cancel_url/);
  assert.doesNotMatch(startFunction, /application_fee_amount|transfer_data/);
});

test('payment completion verifies ownership, paid state, and server total', () => {
  assert.match(completeFunction, /eq\('customer_id', userData\.user\.id\)/);
  assert.match(completeFunction, /session\.payment_status !== 'paid'/);
  assert.match(completeFunction, /Number\(session\.amount_total\) !== Number\(draft\.total_cents\)/);
  assert.match(completeFunction, /finalize_paid_checkout/);
});

test('Stripe webhook validates the raw signed body and processes each event once', () => {
  assert.match(webhookFunction, /await request\.text\(\)/);
  assert.match(webhookFunction, /stripe-signature/);
  assert.match(webhookFunction, /STRIPE_WEBHOOK_SECRET/);
  assert.match(webhookFunction, /stripe_webhook_events/);
  assert.match(webhookFunction, /checkout\.session\.completed/);
  assert.match(webhookFunction, /checkout\.session\.expired/);
});

test('browser sends live orders to Stripe and never contains a secret key', () => {
  assert.match(html, /js\/customer-payments\.js/);
  assert.match(accountSource, /FoodTrekNowCustomerPayments\.startCheckout/);
  assert.match(accountSource, /FoodTrekNowCustomerPayments\?\.completeCheckout/);
  assert.match(accountSource, /FoodTrekNow never receives or stores your full card number/);
  assert.doesNotMatch(browserSource, /STRIPE_SECRET_KEY|SUPABASE_SERVICE_ROLE_KEY|\bsk_(?:test|live)_/);
});

test('browser accepts only HTTPS Stripe Checkout destinations', async () => {
  let assigned = '';
  const client = { functions: { invoke: async () => ({ data: { checkoutUrl: 'https://checkout.stripe.com/c/pay/test' }, error: null }) } };
  const context = { URL, Error, window: null };
  context.window = { FoodTrekNowSupabaseClient: client, location: { assign(value) { assigned = value; } } };
  vm.runInNewContext(browserSource, context, { filename: 'customer-payments.js' });
  await context.window.FoodTrekNowCustomerPayments.startCheckout({ truckId: 'truck' });
  assert.equal(assigned, 'https://checkout.stripe.com/c/pay/test');

  client.functions.invoke = async () => ({ data: { checkoutUrl: 'https://evil.example/checkout' }, error: null });
  await assert.rejects(() => context.window.FoodTrekNowCustomerPayments.startCheckout({}), /untrusted checkout link/i);
});
