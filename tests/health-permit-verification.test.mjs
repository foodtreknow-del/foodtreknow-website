import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const read = path => fs.readFileSync(new URL(path, import.meta.url), 'utf8');
const html = read('../index.html');
const app = read('../js/app.js');
const adminUi = read('../js/customer-account.js');
const adminService = read('../js/admin-vendor-management.js');
const vendorAuth = read('../js/vendor-auth.js');
const migration = read('../supabase/migrations/202611110001_health_permit_verification.sql');

test('only the platform administrator can change health permit verification', () => {
  assert.match(migration, /create or replace function public\.admin_set_vendor_health_permit_verified/i);
  assert.match(migration, /if not public\.is_admin\(\) then\s+raise exception 'Administrator access is required'/i);
  assert.match(migration, /vendor_health_permit_events/i);
  assert.match(migration, /revoke all on function public\.admin_set_vendor_health_permit_verified/i);
  assert.match(adminService, /client\.rpc\('admin_set_vendor_health_permit_verified'/);
  assert.doesNotMatch(adminService, /\.from\('vendor_admin_controls'\)\.(?:insert|update|delete)/);
});

test('administrator management shows an explicit permit verification control', () => {
  assert.match(adminService, /admin_vendor_health_permit_statuses/);
  assert.match(adminUi, /data-admin-health-permit/);
  assert.match(adminUi, /Verify Health Permit/);
  assert.match(adminUi, /Remove Verification/);
  assert.match(adminUi, /setHealthPermitVerified/);
});

test('verified vendor context controls the badge beside the dashboard truck name', () => {
  assert.match(migration, /'health_permit_verified'/);
  assert.match(vendorAuth, /healthPermitVerified: Boolean\(accessState\?\.health_permit_verified\)/);
  assert.match(html, /id="pageTitle"[\s\S]*id="vendorHealthPermitBadge"/);
  assert.match(html, /assets\/health-permit-verified-badge\.png/);
  assert.match(app, /syncVendorHealthPermitBadge\(page==='dashboard'&&Boolean\(activeVendorContext\?\.healthPermitVerified\)\)/);
});
