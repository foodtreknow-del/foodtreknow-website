import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const auth = read('js/vendor-auth.js');
const app = read('js/app.js');
const data = read('js/vendor-data.js');
const orders = read('js/live-orders.js');
const reports = read('js/vendor-reports.js');
const marketplace = read('js/customer-marketplace.js');
const customer = read('js/customer-account.js');
const subscription = read('js/vendor-subscription.js');
const migration = read('supabase/migrations/202610150004_approved_vendor_activation_and_isolation.sql');

test('approved vendors enter their own portal without signing out and back in', () => {
  assert.match(customer, /activateApprovedVendorPortal\(true\)/);
  assert.match(customer, /FoodTrekNowVendorAuth\?\.restore\(\)/);
  assert.match(customer, /Open Vendor Portal/);
  assert.match(app, /FoodTrekNowOpenApprovedVendorPortal/);
  assert.doesNotMatch(customer, /Sign out and sign back in to load vendor access/);
});

test('vendor browser, menu, order, and report data are isolated by truck UUID', () => {
  assert.match(auth, /ftnActiveVendorTruckId/);
  assert.match(auth, /`\$\{baseKey\}:\$\{truckId\}`/);
  assert.match(data, /eq\('truck_id', truckId\)/);
  assert.match(data, /p_truck_id: truckId/);
  assert.match(orders, /eq\('truck_id', truckId\)/);
  assert.match(reports, /FoodTrekNowVendorStorageKey/);
  assert.match(app, /vendorStorageKey\(STORAGE_KEY\)/);
});

test('approved non-frozen trucks are active and visible in customer discovery', () => {
  assert.match(migration, /application\.status = 'approved'/);
  assert.match(migration, /set is_active = true/);
  assert.match(migration, /control\.is_frozen/);
  assert.match(migration, /new\.is_active := public\.vendor_subscription_access_allowed/);
  assert.match(marketplace, /from\('trucks'\)\.select\('\*'\)\.eq\('is_active', true\)/);
  assert.match(subscription, /access_allowed: Boolean\(platformState\?\.access_allowed\)/);
});
