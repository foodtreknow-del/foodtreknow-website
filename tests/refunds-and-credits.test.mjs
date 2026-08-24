import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const migration = fs.readFileSync(new URL('../supabase/migrations/202608230009_refunds_and_vendor_credits.sql', import.meta.url), 'utf8');
const cancelFunction = fs.readFileSync(new URL('../supabase/functions/stripe-order-cancel/index.ts', import.meta.url), 'utf8');
const checkoutCancelFunction = fs.readFileSync(new URL('../supabase/functions/stripe-checkout-cancel/index.ts', import.meta.url), 'utf8');
const checkoutStartFunction = fs.readFileSync(new URL('../supabase/functions/stripe-checkout-start/index.ts', import.meta.url), 'utf8');
const webhookFunction = fs.readFileSync(new URL('../supabase/functions/stripe-webhook/index.ts', import.meta.url), 'utf8');
const browserPayments = fs.readFileSync(new URL('../js/customer-payments.js', import.meta.url), 'utf8');
const customerAccount = fs.readFileSync(new URL('../js/customer-account.js', import.meta.url), 'utf8');

test('vendor credits are isolated by customer and selected food truck', () => {
  assert.match(migration, /create table if not exists public\.vendor_credit_accounts/i);
  assert.match(migration, /primary key \(customer_id, truck_id\)/i);
  assert.match(migration, /where customer_id = auth\.uid\(\) and truck_id = p_truck_id/i);
  assert.match(migration, /customer_id = auth\.uid\(\) or public\.owns_truck\(truck_id\)/i);
  assert.doesNotMatch(migration, /grant (?:insert|update|delete|all).*vendor_credit_accounts.*authenticated/i);
});

test('credit reservation, redemption, and release are idempotently recorded', () => {
  assert.match(migration, /transaction_type in \('issued', 'reserved', 'redeemed', 'released'\)/i);
  assert.match(migration, /idempotency_key text not null unique/i);
  assert.match(migration, /checkout-reserve:/i);
  assert.match(migration, /checkout-release:/i);
  assert.match(migration, /set transaction_type = 'redeemed'/i);
  assert.match(checkoutCancelFunction, /\/expire/);
  assert.match(checkoutCancelFunction, /release_checkout_credit/);
});

test('credit is deducted from the amount sent to the selected vendor Stripe account', () => {
  assert.match(checkoutStartFunction, /create_payment_checkout_draft_with_credit/);
  assert.match(checkoutStartFunction, /p_use_vendor_credit/);
  assert.match(migration, /due_to_stripe := base_draft\.total_cents - applied_credit/i);
  assert.match(migration, /p_amount_paid_cents <> selected_draft\.stripe_due_cents/i);
  assert.match(checkoutStartFunction, /Number\(draft\.stripe_due_cents\) === 0/);
});

test('paid cancellation supports either Stripe refund or vendor credit before preparation', () => {
  assert.match(migration, /p_resolution not in \('original_payment', 'vendor_credit'\)/i);
  assert.match(migration, /selected_order\.status <> 'received'/i);
  assert.match(cancelFunction, /\/v1\/refunds/);
  assert.match(cancelFunction, /'Stripe-Account': cancellation\.stripe_account_id/);
  assert.match(cancelFunction, /Idempotency-Key/);
  assert.match(cancelFunction, /resolution === 'vendor_credit'/);
  assert.match(webhookFunction, /refund\.updated/);
  assert.match(webhookFunction, /complete_order_refund/);
});

test('customer UI offers refund or truck-specific credit and shows balances', () => {
  assert.match(browserPayments, /cancelPaidOrder/);
  assert.match(browserPayments, /loadVendorCredits/);
  assert.match(customerAccount, /Refund original payment/);
  assert.match(customerAccount, /Get .* credit/);
  assert.match(customerAccount, /This credit works only with this food truck/);
  assert.match(customerAccount, /Food Truck Credits/);
});

test('refund and credit sources contain no Stripe secret values or card data', () => {
  const all = [migration, cancelFunction, checkoutCancelFunction, checkoutStartFunction, webhookFunction, browserPayments].join('\n');
  assert.doesNotMatch(all, /\b(?:sk|rk)_(?:test|live)_[A-Za-z0-9]{12,}/);
  assert.doesNotMatch(all, /\bwhsec_[A-Za-z0-9]{12,}/);
  assert.doesNotMatch(browserPayments, /STRIPE_SECRET_KEY|SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(migration, /\bcvv\b|card_number/i);
});
