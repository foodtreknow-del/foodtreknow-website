import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const migration = read('supabase/migrations/202610180001_single_admin_and_tenant_isolation.sql');
const signupIsolation = read('supabase/migrations/202610180002_strict_account_signup_isolation.sql');
const checkout = read('supabase/functions/test-checkout-start/index.ts');
const vendorData = read('js/vendor-data.js');
const settings = read('js/vendor-settings.js');
const app = read('js/app.js');

test('only the designated singleton FoodTrekNow administrator passes is_admin', () => {
  assert.match(migration, /create table if not exists public\.platform_administrator/i);
  assert.match(migration, /singleton boolean primary key default true check \(singleton\)/i);
  assert.match(migration, /application\.reviewed_by/i);
  assert.match(migration, /administrator\.profile_id = auth\.uid\(\)/i);
  assert.match(migration, /revoke all on public\.platform_administrator from public, anon, authenticated/i);
});

test('vendor, truck, Host, location, and order ownership cannot be reassigned', () => {
  assert.match(migration, /ux_trucks_one_truck_per_vendor/i);
  assert.match(migration, /A vendor profile cannot be transferred between accounts/i);
  assert.match(migration, /A food truck cannot be transferred between vendor accounts/i);
  assert.match(migration, /A Host profile cannot be transferred between accounts/i);
  assert.match(migration, /A Host location cannot be transferred between Host accounts/i);
  assert.match(migration, /An order cannot be transferred between customer or food truck accounts/i);
  assert.match(signupIsolation, /A vendor application cannot be transferred between accounts/i);
  assert.match(signupIsolation, /An event cannot be transferred between Host accounts/i);
});

test('each food truck receives an independent order sequence beginning at 1001', () => {
  assert.match(migration, /create table if not exists public\.truck_order_counters/i);
  assert.match(migration, /primary key references public\.trucks\(id\)/i);
  assert.match(migration, /drop constraint if exists orders_order_number_key/i);
  assert.match(migration, /on public\.orders\(truck_id, order_number\)/i);
  assert.match(migration, /values \(new\.truck_id, 1002\)/i);
  assert.match(migration, /returning next_order_number - 1 into new\.order_number/i);
});

test('no-charge checkout creates a real isolated order without requiring Stripe onboarding', () => {
  assert.match(checkout, /userClient\.rpc\('place_order'/);
  assert.match(checkout, /p_payment_label: 'Test Order - No Charge'/);
  assert.match(checkout, /\.eq\('customer_id', userData\.user\.id\)/);
  assert.match(checkout, /\.eq\('truck_id', body\.truckId\)/);
  assert.match(checkout, /payment_status: 'paid'/);
  assert.doesNotMatch(checkout, /create_payment_checkout_draft_with_credit|finalize_paid_checkout/);
});

test('delayed vendor saves retain the truck that initiated the save', () => {
  assert.match(vendorData, /const truckId = activeTruckId\(\);[\s\S]*syncMenu\(categories, items, truckId\)/);
  assert.match(vendorData, /const truckId = activeTruckId\(\);[\s\S]*syncSettings\(settings, truckId\)/);
  assert.match(settings, /storageKey\(SOUND_STORAGE_KEY\)/);
  assert.match(app, /localStorage\.setItem\(vendorStorageKey\(SOUND_KEY\)/);
});

