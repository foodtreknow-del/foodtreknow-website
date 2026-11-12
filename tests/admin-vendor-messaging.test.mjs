import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const html = read('index.html');
const ui = read('js/customer-account.js');
const service = read('js/admin-vendor-messaging.js');
const vendorMarketplace = read('js/opportunity-marketplace.js');
const migration = read('supabase/migrations/202611120001_admin_vendor_broadcasts.sql');

test('administrator portal exposes a vendor broadcast page', () => {
  assert.match(html, /id="adminVendorMessagingNav"[^>]+data-customer-page="adminVendorMessages"/);
  assert.match(html, /js\/admin-vendor-messaging\.js\?v=admin-vendor-messaging-1/);
  assert.match(ui, /function renderAdminVendorMessages\(\)/);
  assert.match(ui, /id="adminVendorBroadcastForm"/);
  assert.match(ui, /Send to All Food Trucks/);
});

test('vendor broadcasts are protected, audited, and independently delivered', () => {
  assert.match(service, /client\.rpc\('admin_broadcast_vendor_message'/);
  assert.match(service, /client\.rpc\('admin_vendor_broadcast_history'/);
  assert.match(migration, /if auth\.uid\(\) is null or not public\.is_admin\(\)/i);
  assert.match(migration, /create table if not exists public\.admin_vendor_broadcasts/i);
  assert.match(migration, /select distinct vendor\.owner_id[\s\S]*'admin_message'/i);
  assert.match(migration, /grant execute on function public\.admin_broadcast_vendor_message\(text, text\) to authenticated/i);
});

test('vendor portal presents administrator messages without an opportunity error', () => {
  assert.match(vendorMarketplace, /item\.kind === 'admin_message'/);
  assert.match(vendorMarketplace, /Message from FoodTrekNow/);
  assert.match(vendorMarketplace, /Administrator message marked as read/);
});
