import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('vendor completed orders support bulk and automatic archiving', async () => {
  const [html, app, liveOrders, migration] = await Promise.all([
    read('index.html'),
    read('js/app.js'),
    read('js/live-orders.js'),
    read('supabase/migrations/202611100001_operations_reviews_attendance_notifications.sql')
  ]);
  assert.match(html, /completedOrderBulkToolbar/);
  assert.match(html, /archiveSelectedOrdersButton/);
  assert.match(html, /vendorAutoArchiveCompleted/);
  assert.match(app, /selectedCompletedOrderIds/);
  assert.match(liveOrders, /setVendorOrdersArchived/);
  assert.match(migration, /set_vendor_orders_archived/);
  assert.match(migration, /auto_archive_picked_up_order/);
});

test('picked-up orders stay off the vendor dashboard and event alerts are prominent', async () => {
  const [html, app, marketplace] = await Promise.all([
    read('index.html'),
    read('js/app.js'),
    read('js/opportunity-marketplace.js')
  ]);
  assert.match(html, /vendorOpportunityDashboardAlert/);
  assert.doesNotMatch(html, /id="dashboardPickedUpList"/);
  assert.match(app, /const lists=\{new:.*preparing:.*ready:/);
  assert.doesNotMatch(app, /pickedup:document\.getElementById\('pickedUpOrders'\)/);
  assert.match(marketplace, /renderVendorDashboardAlert/);
  assert.doesNotMatch(html, /vendorOpportunityDashboardTitle|vendorOpportunityDashboardDetail/);
  assert.match(marketplace, /const available = activeVendorOpportunities\(\)\.length/);
  assert.match(marketplace, /state\.vendor\.tab = 'discover'/);
});

test('customers can check in and review trucks and events while the sole admin moderates reviews', async () => {
  const [customer, marketplace, admin, migration] = await Promise.all([
    read('js/customer-account.js'),
    read('js/customer-marketplace.js'),
    read('js/admin-reviews.js'),
    read('supabase/migrations/202611100001_operations_reviews_attendance_notifications.sql')
  ]);
  for (const action of ['customer_event_check_in', 'submit_customer_event_review', 'submit_portal_event_review', 'submit_truck_review']) {
    assert.match(migration, new RegExp(action));
  }
  assert.match(customer, /Check In at Event/);
  assert.match(customer, /Review This Event/);
  assert.match(customer, /data-customer-truck-review/);
  assert.match(marketplace, /reviewTruck/);
  assert.match(admin, /remove_platform_review/);
  assert.match(migration, /Only the FoodTrekNow administrator can remove reviews/);
});

test('host and vendor check-ins plus retained attendance reporting are implemented', async () => {
  const [marketplace, migration] = await Promise.all([
    read('js/opportunity-marketplace.js'),
    read('supabase/migrations/202611100001_operations_reviews_attendance_notifications.sql')
  ]);
  assert.match(migration, /create table if not exists public\.event_attendance/);
  assert.match(migration, /host_event_vendor_check_in/);
  assert.match(marketplace, /data-host-vendor-check-in/);
  assert.match(marketplace, /customer check-in/);
  assert.match(marketplace, /vendor_event_check_in/);
});

test('administrator receives new account and application alerts', async () => {
  const [customer, migration] = await Promise.all([
    read('js/customer-account.js'),
    read('supabase/migrations/202611100001_operations_reviews_attendance_notifications.sql')
  ]);
  assert.match(migration, /notify_platform_administrator/);
  assert.match(migration, /notify_admin_new_customer/);
  assert.match(migration, /notify_admin_vendor_application/);
  assert.match(migration, /notify_admin_host_application/);
  assert.match(customer, /vendor_application/);
  assert.match(customer, /host_application/);
});
