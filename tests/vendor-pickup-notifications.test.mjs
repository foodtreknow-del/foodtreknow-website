import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const vendorSource = fs.readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const customerSource = fs.readFileSync(new URL('../js/customer-account.js', import.meta.url), 'utf8');

test('vendor dashboard provides direct order-number pickup lookup', () => {
  assert.match(html, /id="pickupOrderLookupForm"/);
  assert.match(html, /id="pickupOrderLookup"/);
  assert.match(html, /Find Order/);
  assert.match(vendorSource, /function findOrderByNumber/);
  assert.match(vendorSource, /window\.showDetails\(order\.id\)/);
});

test('opening one customer notification marks only that notification as read', () => {
  assert.match(customerSource, /data-notification-id=/);
  assert.match(customerSource, /markCustomerNotificationsRead\(\[notificationId\]\)/);
  assert.doesNotMatch(customerSource, /const relatedIds = customerNotifications\.filter/);
});

test('new vendor orders use a persistent three-tone audible alert', () => {
  assert.match(vendorSource, /let vendorAudioContext=null/);
  assert.match(vendorSource, /type==='new'\?\[520,720,880\]/);
  assert.match(vendorSource, /New Order #\$\{newestOrder\.id\} received/);
  assert.match(vendorSource, /three-tone preview confirms alerts are working/);
});

test('vendor dashboard status cards open the matching filtered order list', () => {
  for (const status of ['new', 'preparing', 'ready', 'pickedup', 'completed']) {
    assert.match(html, new RegExp(`data-dashboard-order-filter="${status}"`));
  }
  assert.match(vendorSource, /function setOrderFilter\(filter\)/);
  assert.match(vendorSource, /setOrderFilter\(btn\.dataset\.dashboardOrderFilter\);activateVendorPage\('orders'\)/);
});

test('vendor sign-in always opens the dashboard page', () => {
  assert.match(vendorSource, /function showDashboard[\s\S]*?render\(\);activateVendorPage\('dashboard'\);\}/);
});

test('live checkout waits for the permanent server order number', () => {
  assert.match(customerSource, /truck\?\.supabase \? 'Assigned after checkout'/);
  assert.match(customerSource, /Order number assigned after checkout/);
  assert.match(customerSource, /id: Number\(placed\.order_number\)/);
  assert.match(customerSource, /pickupInstructions: `Show \$\{orderNumberLabel\(placed\.order_number\)\}/);
});
