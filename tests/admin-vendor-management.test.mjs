import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const ui = fs.readFileSync(new URL('../js/customer-account.js', import.meta.url), 'utf8');
const service = fs.readFileSync(new URL('../js/admin-vendor-management.js', import.meta.url), 'utf8');
const auth = fs.readFileSync(new URL('../js/vendor-auth.js', import.meta.url), 'utf8');
const vendorApp = fs.readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const migration = fs.readFileSync(new URL('../supabase/migrations/202610150002_admin_vendor_management.sql', import.meta.url), 'utf8');

test('admin portal includes the privacy-limited Vendor Management section', () => {
  assert.match(html, /id="adminVendorManagementNav"[^>]+data-customer-page="vendorManagement"/);
  assert.match(html, /js\/admin-vendor-management\.js\?v=admin-vendor-management-1/);
  assert.match(ui, /function renderVendorManagement\(\)/);
  assert.match(ui, /Privacy-limited manager view/);
  assert.match(ui, /Customer names, phone numbers, order contents, passwords, banking information, and card details are never shown/);
});

test('administrator reports use an aggregate-only protected RPC', () => {
  assert.match(service, /client\.rpc\('admin_vendor_management_snapshot'/);
  assert.match(migration, /if not public\.is_admin\(\) then\s+raise exception 'Administrator access is required'/i);
  assert.match(migration, /jsonb_build_object\([\s\S]*'dailySales'/);
  assert.doesNotMatch(migration, /'customer(Name|Email|Mobile|Id)'/i);
  assert.doesNotMatch(migration, /order_items/i);
  assert.match(migration, /not coalesce\(orders\.is_test_order, false\)/i);
});

test('freeze control is audited and enforced by subscription access checks', () => {
  assert.match(migration, /create table if not exists public\.vendor_admin_control_events/i);
  assert.match(migration, /create or replace function public\.admin_set_vendor_frozen/i);
  assert.match(migration, /insert into public\.vendor_admin_control_events/i);
  assert.match(migration, /not exists \([\s\S]*vendor_admin_controls[\s\S]*is_frozen/i);
  assert.match(migration, /update public\.trucks[\s\S]*when p_is_frozen then false/i);
  assert.match(auth, /accessState\?\.admin_frozen/);
  assert.match(vendorApp, /vendorSubscriptionAccess=!secure\|\|!Boolean\(state\.admin_frozen\)/);
  assert.doesNotMatch(vendorApp, /vendorSubscriptionAccess=!secure\|\|Boolean\(state\.access_allowed\)/);
});

test('admin tables are read-only through RLS and state changes require the protected RPC', () => {
  assert.match(migration, /alter table public\.vendor_admin_controls enable row level security/i);
  assert.match(migration, /alter table public\.vendor_admin_control_events enable row level security/i);
  assert.match(migration, /revoke all on public\.vendor_admin_controls from public, anon, authenticated/i);
  assert.match(migration, /revoke all on public\.vendor_admin_control_events from public, anon, authenticated/i);
  assert.doesNotMatch(service, /\.from\('(?:vendor_admin_controls|vendor_admin_control_events)'\)\.(?:insert|update|delete)/);
});
