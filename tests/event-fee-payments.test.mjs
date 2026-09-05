import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('approved bookings snapshot server-owned flat fees and deposits', async () => {
  const migration = await read('supabase/migrations/202609040001_host_event_fee_payments.sql');
  assert.match(migration, /create table if not exists public\.event_fee_payments/);
  assert.match(migration, /create_event_fee_payment_for_booking/);
  assert.match(migration, /after insert on public\.opportunity_bookings/);
  assert.match(migration, /flat_fee_cents \+ refundable_deposit_cents/);
  assert.match(migration, /sales_percentage[^;]+post-event settlement/i);
  assert.match(migration, /alter table public\.event_fee_payments enable row level security/);
  assert.match(migration, /public\.is_host_owner\(host_id\)/);
  assert.match(migration, /public\.owns_marketplace_vendor\(vendor_profile_id\)/);
  assert.doesNotMatch(migration, /grant (?:insert|update|delete|all).*event_fee_payments.*authenticated/i);
});

test('Hosts connect a Stripe account before collecting event fees', async () => {
  const [migration, start, status] = await Promise.all([
    read('supabase/migrations/202609040001_host_event_fee_payments.sql'),
    read('supabase/functions/stripe-host-connect-start/index.ts'),
    read('supabase/functions/stripe-host-connect-status/index.ts')
  ]);
  assert.match(migration, /create table if not exists public\.host_stripe_connect_accounts/);
  assert.match(start, /authenticatedHost\(request\)/);
  assert.match(start, /\/v2\/core\/accounts/);
  assert.match(start, /fees_collector:\s*'stripe'/);
  assert.match(start, /losses_collector:\s*'stripe'/);
  assert.match(start, /dashboard:\s*'full'/);
  assert.match(status, /safeAccountState/);
  assert.match(start, /auth\.getUser\(authorization\.slice\(7\)\.trim\(\)\)/);
  assert.match(start, /location_hosts/);
  assert.doesNotMatch(start, /from ['"]\.\.\/_shared/);
  assert.doesNotMatch(status, /from ['"]\.\.\/_shared/);
});

test('event-fee Checkout uses server amounts and direct charges the Host account', async () => {
  const [start, complete] = await Promise.all([
    read('supabase/functions/stripe-event-fee-checkout-start/index.ts'),
    read('supabase/functions/stripe-event-fee-checkout-complete/index.ts')
  ]);
  assert.match(start, /event_fee_payments/);
  assert.match(start, /host_stripe_connect_accounts/);
  assert.match(start, /payment\.flat_fee_cents/);
  assert.match(start, /payment\.refundable_deposit_cents/);
  assert.match(start, /'Stripe-Account':\s*options\.stripeAccountId/);
  assert.match(start, /foodtreknow_event_fee_payment_id/);
  assert.doesNotMatch(start, /body\.(?:amount|flatFee|deposit)/);
  assert.match(complete, /session\.payment_status !== 'paid'/);
  assert.match(complete, /session\.amount_total[^\n]+payment\.amount_due_cents/);
  assert.match(complete, /finalize_event_fee_payment/);
  assert.doesNotMatch(start, /from ['"]\.\.\/_shared/);
  assert.doesNotMatch(complete, /from ['"]\.\.\/_shared/);
});

test('vendor and Host UIs show payment, receipts, status, and full refunds', async () => {
  const [browser, refund, webhook, html] = await Promise.all([
    read('js/opportunity-marketplace.js'),
    read('supabase/functions/stripe-event-fee-refund/index.ts'),
    read('supabase/functions/stripe-webhook/index.ts'),
    read('index.html')
  ]);
  for (const label of ['Payments', 'Connect with Stripe', 'Pay Event Fee', 'View Receipt', 'Refund Full Payment']) {
    assert.match(browser, new RegExp(label));
  }
  assert.match(browser, /stripe-event-fee-checkout-start/);
  assert.match(browser, /stripe-event-fee-checkout-complete/);
  assert.match(browser, /from\('event_fee_payments'\)\.select\('\*'\)/);
  assert.match(browser, /optionalPaymentQuery/);
  assert.match(browser, /Percentage|% of sales is settled separately after the event/i);
  assert.match(refund, /authenticatedHost\(request\)/);
  assert.match(refund, /complete_event_fee_refund/);
  assert.match(refund, /Confirm the full event-fee refund/);
  assert.match(webhook, /foodtreknow_event_fee/);
  assert.match(webhook, /finalize_event_fee_payment/);
  assert.match(webhook, /complete_event_fee_refund/);
  assert.match(html, /opportunity-marketplace\.js\?v=event-fees-1/);
});

test('event-fee payment sources contain no Stripe secrets or card data', async () => {
  const paths = [
    'supabase/migrations/202609040001_host_event_fee_payments.sql',
    'supabase/functions/stripe-host-connect-start/index.ts',
    'supabase/functions/stripe-host-connect-status/index.ts',
    'supabase/functions/stripe-event-fee-checkout-start/index.ts',
    'supabase/functions/stripe-event-fee-checkout-complete/index.ts',
    'supabase/functions/stripe-event-fee-refund/index.ts',
    'js/opportunity-marketplace.js'
  ];
  const source = (await Promise.all(paths.map(read))).join('\n');
  assert.doesNotMatch(source, /\b(?:sk|rk)_(?:test|live)_[A-Za-z0-9]{12,}/);
  assert.doesNotMatch(source, /\bwhsec_[A-Za-z0-9]{12,}/);
  const browser = await read('js/opportunity-marketplace.js');
  assert.doesNotMatch(browser, /STRIPE_SECRET_KEY|SUPABASE_SERVICE_ROLE_KEY|card_number|cvc/i);
});
