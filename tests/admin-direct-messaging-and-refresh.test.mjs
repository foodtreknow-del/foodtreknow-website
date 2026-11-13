import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const vendor = read('js/app.js');
const customer = read('js/customer-account.js');
const html = read('index.html');
const service = read('js/admin-direct-messaging.js');
const migration = read('supabase/migrations/202611120002_admin_direct_messaging.sql');

test('automatic vendor redraws are limited to the dashboard', () => {
  assert.match(vendor, /let activeVendorPage='dashboard'/);
  assert.match(vendor, /function vendorDashboardIsActive\(\)/);
  assert.match(vendor, /if\(vendorDashboardIsActive\(\)\)render\(\)/);
  assert.match(vendor, /vendorOrderRefreshTimer=setInterval[\s\S]*!vendorDashboardIsActive\(\)/);
  assert.match(vendor, /function activateVendorPage\(page\)[\s\S]*activeVendorPage=page/);
});

test('Main Account has private direct messaging for all account types', () => {
  assert.match(html, /id="adminDirectMessagingNav"[^>]+data-customer-page="adminDirectMessages"/);
  assert.match(html, /js\/admin-direct-messaging\.js/);
  assert.match(customer, /Chat privately with individual customers, Hosts, and Vendors/);
  assert.match(customer, /FoodTrekNowAdminDirectMessaging\.sendFromAdmin/);
  assert.match(customer, /FoodTrekNowAdminDirectMessaging\.reply/);
  assert.match(service, /admin_direct_message_thread/);
  assert.match(service, /my_admin_direct_threads/);
});

test('direct message database functions isolate every participant and require admin authority', () => {
  assert.match(migration, /unique \(participant_id, audience_role\)/i);
  assert.match(migration, /if not public\.is_admin\(\) then[\s\S]*Administrator access is required/i);
  assert.match(migration, /thread\.participant_id = auth\.uid\(\)/i);
  assert.match(migration, /where thread\.participant_id = auth\.uid\(\)/i);
  assert.match(migration, /revoke all on public\.admin_direct_threads, public\.admin_direct_messages from public, anon, authenticated/i);
  assert.match(migration, /grant execute on function public\.account_reply_to_admin\(uuid, text\) to authenticated/i);
});
