import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../css/vendor-settings.css', import.meta.url), 'utf8');
const migration = fs.readFileSync(new URL('../supabase/migrations/202608230007_stripe_connect_foundation.sql', import.meta.url), 'utf8');
const startFunction = fs.readFileSync(new URL('../supabase/functions/stripe-connect-start/index.ts', import.meta.url), 'utf8');
const statusFunction = fs.readFileSync(new URL('../supabase/functions/stripe-connect-status/index.ts', import.meta.url), 'utf8');
const stripeHelper = fs.readFileSync(new URL('../supabase/functions/_shared/stripe.ts', import.meta.url), 'utf8');
const vendorHelper = fs.readFileSync(new URL('../supabase/functions/_shared/vendor.ts', import.meta.url), 'utf8');
const browserSource = fs.readFileSync(new URL('../js/vendor-payments.js', import.meta.url), 'utf8');

class ElementMock {
  constructor() {
    this.textContent = '';
    this.className = '';
    this.disabled = false;
    this.listeners = new Map();
    this.classList = { toggle() {} };
  }
  addEventListener(type, callback) { this.listeners.set(type, callback); }
  click() { this.listeners.get('click')?.({}); }
}

const elements = new Map();
const element = id => {
  if (!elements.has(id)) elements.set(id, new ElementMock());
  return elements.get(id);
};
const settingsNavigation = new ElementMock();

const context = {
  URL,
  console,
  window: null,
  document: {
    getElementById: element,
    querySelector: selector => selector === '[data-page="settings"]' ? settingsNavigation : null
  },
  localStorage: { getItem: () => null },
  setTimeout: () => 1,
  location: { href: 'http://localhost:3000/', assign() {} },
  history: { replaceState() {} },
  FoodTrekNowSupabaseClient: null
};
context.window = context;
vm.runInNewContext(browserSource, context, { filename: 'vendor-payments.js' });

test('vendor settings contains a responsive Stripe connection panel', () => {
  for (const text of ['Stripe Payments', 'Connect with Stripe', 'Check Status', 'FoodTrekNow never sees or stores your bank login']) {
    assert.ok(html.includes(text), `Missing Stripe UI: ${text}`);
  }
  assert.match(html, /js\/vendor-payments\.js/);
  assert.match(css, /\.stripe-connect-panel/);
  assert.match(css, /@media\(max-width:700px\)/);
});

test('Stripe connection state is normalized and rendered safely', () => {
  const api = context.FoodTrekNowVendorPayments;
  assert.equal(api.normalizeStatus('active'), 'active');
  assert.equal(api.normalizeStatus('unexpected'), 'not_connected');
  assert.equal(api.renderState({ status: 'active', charges_enabled: true, payouts_enabled: true }), 'active');
  assert.equal(element('stripeConnectBadge').textContent, 'Connected');
  assert.match(element('stripeConnectTitle').textContent, /ready/i);
  assert.equal(element('connectStripeButton').textContent, 'Stripe Connected');
  assert.equal(element('connectStripeButton').disabled, true);
});

test('Stripe account records are vendor-readable but server-write-only', () => {
  assert.match(migration, /create table if not exists public\.stripe_connect_accounts/i);
  assert.match(migration, /alter table public\.stripe_connect_accounts enable row level security/i);
  assert.match(migration, /vendor\.owner_id = auth\.uid\(\)/i);
  assert.match(migration, /revoke all on public\.stripe_connect_accounts from public, anon, authenticated/i);
  assert.match(migration, /grant select on public\.stripe_connect_accounts to authenticated/i);
  assert.doesNotMatch(migration, /grant (?:insert|update|delete|all).*stripe_connect_accounts.*authenticated/i);
});

test('Edge Functions verify the vendor and keep Stripe calls server-side', () => {
  assert.match(vendorHelper, /userClient\.auth\.getUser\(\)/);
  assert.match(vendorHelper, /Only an approved vendor can connect a Stripe account/);
  assert.match(startFunction, /authenticatedVendor\(request\)/);
  assert.match(startFunction, /type', 'standard'/);
  assert.match(startFunction, /Idempotency-Key|idempotencyKey/);
  assert.match(statusFunction, /safeAccountState\(account\)/);
  assert.match(stripeHelper, /Deno\.env\.get\('STRIPE_SECRET_KEY'\)/);
  assert.match(stripeHelper, /https:\/\/api\.stripe\.com/);
});

test('Stripe integration source contains no real API keys or webhook secrets', () => {
  const allSource = [migration, startFunction, statusFunction, stripeHelper, vendorHelper, browserSource].join('\n');
  assert.doesNotMatch(allSource, /\b(?:sk|rk)_(?:test|live)_[A-Za-z0-9]{12,}/);
  assert.doesNotMatch(allSource, /\bwhsec_[A-Za-z0-9]{12,}/);
  assert.doesNotMatch(browserSource, /STRIPE_SECRET_KEY|SUPABASE_SERVICE_ROLE_KEY/);
});

test('browser accepts only HTTPS Stripe onboarding destinations', () => {
  assert.match(browserSource, /destination\.protocol !== 'https:'/);
  assert.match(browserSource, /destination\.hostname\.endsWith\('\.stripe\.com'\)/);
});
