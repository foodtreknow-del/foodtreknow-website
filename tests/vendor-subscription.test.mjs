import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read = path => fs.readFileSync(new URL(path, import.meta.url), 'utf8');
const html = read('../index.html');
const css = read('../css/vendor-settings.css');
const migration = read('../supabase/migrations/202608230010_vendor_subscriptions.sql');
const startFunction = read('../supabase/functions/stripe-vendor-subscription-start/index.ts');
const statusFunction = read('../supabase/functions/stripe-vendor-subscription-status/index.ts');
const portalFunction = read('../supabase/functions/stripe-vendor-billing-portal/index.ts');
const webhookFunction = read('../supabase/functions/stripe-webhook/index.ts');
const browserSource = read('../js/vendor-subscription.js');
const appSource = read('../js/app.js');
const serviceWorker = read('../service-worker.js');

class ElementMock {
  constructor() {
    this.textContent = '';
    this.className = '';
    this.disabled = false;
    this.listeners = new Map();
    this.classList = { toggle() {} };
  }
  addEventListener(type, callback) { this.listeners.set(type, callback); }
}

const elements = new Map();
const element = id => {
  if (!elements.has(id)) elements.set(id, new ElementMock());
  return elements.get(id);
};
const settingsNavigation = new ElementMock();
const dispatched = [];
const context = {
  URL,
  Date,
  console,
  CustomEvent: class CustomEvent { constructor(type, options) { this.type = type; this.detail = options?.detail; } },
  window: null,
  document: {
    getElementById: element,
    querySelector: selector => selector === '[data-page="settings"]' ? settingsNavigation : null
  },
  localStorage: { getItem: () => null },
  setTimeout: () => 1,
  location: { href: 'http://localhost:3000/', assign() {} },
  history: { replaceState() {} },
  FoodTrekNowSupabaseClient: null,
  dispatchEvent(event) { dispatched.push(event); }
};
context.window = context;
vm.runInNewContext(browserSource, context, { filename: 'vendor-subscription.js' });

test('vendor settings clearly presents the $14.99 monthly platform plan', () => {
  for (const copy of ['$14.99', 'per month', 'Manage Billing &amp; Invoices', 'Customer food-order payments remain separate']) {
    assert.ok(html.includes(copy), `Missing subscription UI copy: ${copy}`);
  }
  assert.match(html, /js\/vendor-subscription\.js/);
  assert.match(css, /\.vendor-subscription-panel/);
  assert.match(css, /\.vendor-subscription-gate/);
  assert.match(serviceWorker, /vendor-subscription\.js/);
});

test('subscription records are private and server-write-only', () => {
  assert.match(migration, /create table if not exists public\.vendor_subscriptions/i);
  assert.match(migration, /status in \('not_started',[\s\S]*'active'[\s\S]*'past_due'[\s\S]*'canceled'/i);
  assert.match(migration, /alter table public\.vendor_subscriptions enable row level security/i);
  assert.match(migration, /vendor\.owner_id = auth\.uid\(\)/i);
  assert.match(migration, /revoke all on public\.vendor_subscriptions from public, anon, authenticated/i);
  assert.doesNotMatch(migration, /grant (?:insert|update|delete|all).*vendor_subscriptions.*authenticated/i);
});

test('subscription access includes paid plans and a bounded past-due grace period', () => {
  assert.match(migration, /status in \('active', 'trialing'\)/i);
  assert.match(migration, /status = 'past_due' and subscription\.grace_period_ends_at > now\(\)/i);
  assert.match(migration, /create or replace function public\.owns_truck/i);
  assert.match(migration, /and public\.vendor_subscription_access_allowed\(vendor\.id\)/i);
  assert.match(migration, /update public\.trucks truck[\s\S]*set is_active = false/i);
  assert.match(migration, /create trigger enforce_truck_subscription_activation/i);
  assert.match(statusFunction, /7 \* 86400000/);
  assert.match(statusFunction, /access_allowed/);
  assert.match(statusFunction, /update\(\{ is_active: accessAllowed \}\)/);
  assert.match(webhookFunction, /is_active: \['active', 'trialing'\]\.includes\(record\.status\)/);
  assert.match(appSource, /ftn:vendor-subscription/);
  assert.match(appSource, /button\.dataset\.page!==['"]settings['"]/);
  assert.match(appSource, /!settingsButton\.classList\.contains\(['"]active['"]\)/);
  assert.doesNotMatch(appSource, /if\(!vendorSubscriptionAccess\)\{document\.querySelector\(['"]\.nav-link\[data-page=['"]settings['"]\]['"]\)\?\.click\(\);\}/);
});

test('Stripe Checkout creates a platform-owned recurring subscription', () => {
  assert.match(startFunction, /STRIPE_VENDOR_MONTHLY_PRICE_ID/);
  assert.match(startFunction, /checkoutForm\.set\('mode', 'subscription'\)/);
  assert.match(startFunction, /line_items\[0\]\[price\]/);
  assert.match(startFunction, /subscription_data\[metadata\]\[foodtreknow_vendor_profile_id\]/);
  assert.match(startFunction, /\/v1\/checkout\/sessions/);
  assert.doesNotMatch(startFunction, /Stripe-Account/);
  assert.doesNotMatch(startFunction, /14\.99.*unit_amount|unit_amount.*14\.99/);
});

test('billing portal is authenticated and bound to the saved Stripe customer', () => {
  assert.match(portalFunction, /userClient\.auth\.getUser\(token\)/);
  assert.match(portalFunction, /stripe_customer_id/);
  assert.match(portalFunction, /\/v1\/billing_portal\/sessions/);
  assert.match(portalFunction, /return_url/);
  assert.doesNotMatch(portalFunction, /Stripe-Account/);
});

test('webhook synchronizes subscription, invoice, and cancellation lifecycle', () => {
  for (const event of ['customer.subscription.created', 'customer.subscription.updated', 'customer.subscription.deleted', 'customer.subscription.paused', 'customer.subscription.resumed', 'invoice.paid', 'invoice.payment_failed']) {
    assert.ok(webhookFunction.includes(event), `Missing webhook event: ${event}`);
  }
  assert.match(webhookFunction, /foodtreknow_vendor_subscription/);
  assert.match(webhookFunction, /syncVendorSubscription/);
  assert.match(webhookFunction, /parent\?\.subscription_details\?\.subscription/);
  assert.match(webhookFunction, /verifyStripeSignature/);
  assert.match(webhookFunction, /STRIPE_BILLING_WEBHOOK_SECRET/);
});

test('browser subscription state renders active access without exposing secrets', () => {
  const api = context.FoodTrekNowVendorSubscription;
  assert.equal(api.normalizeStatus('active'), 'active');
  assert.equal(api.normalizeStatus('unknown'), 'not_started');
  const state = api.renderState({ status: 'active', access_allowed: true, has_customer: true });
  assert.equal(state.access_allowed, true);
  assert.equal(element('vendorSubscriptionBadge').textContent, 'Active');
  assert.match(element('vendorSubscriptionTitle').textContent, /14\.99/);
  assert.ok(dispatched.some(event => event.type === 'ftn:vendor-subscription'));
  assert.match(browserSource, /client\.auth\.getSession\(\)/);
  assert.match(browserSource, /client\.auth\.getUser\(accessToken\)/);
  assert.match(browserSource, /client\.auth\.refreshSession\(\)/);
  assert.match(browserSource, /Authorization: `Bearer \$\{accessToken\}`/);
  assert.match(browserSource, /apikey: config\.publishableKey/);
  assert.match(browserSource, /fetch\(endpoint/);
  assert.doesNotMatch(browserSource, /STRIPE_SECRET_KEY|SUPABASE_SERVICE_ROLE_KEY|sk_(?:test|live)_/);
});

test('subscription source contains no real Stripe keys or webhook secrets', () => {
  const allSource = [migration, startFunction, statusFunction, portalFunction, webhookFunction, browserSource].join('\n');
  assert.doesNotMatch(allSource, /\b(?:sk|rk)_(?:test|live)_[A-Za-z0-9]{12,}/);
  assert.doesNotMatch(allSource, /\bwhsec_[A-Za-z0-9]{12,}/);
});

test('subscription functions verify the explicit caller bearer token', () => {
  for (const source of [startFunction, statusFunction, portalFunction]) {
    assert.match(source, /authorization\.slice\(['"]Bearer ['"]\.length\)\.trim\(\)/);
    assert.match(source, /auth\.getUser\(token\)/);
  }
});
