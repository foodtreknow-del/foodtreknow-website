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
