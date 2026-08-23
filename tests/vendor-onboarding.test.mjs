import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const ui = fs.readFileSync(new URL('../js/customer-account.js', import.meta.url), 'utf8');
const service = fs.readFileSync(new URL('../js/vendor-onboarding.js', import.meta.url), 'utf8');
const migration = fs.readFileSync(new URL('../supabase/migrations/202608230003_vendor_onboarding.sql', import.meta.url), 'utf8');

test('customer and administrator onboarding screens are wired into the existing account portal', () => {
  assert.match(html, /id="vendorApplicationNav"[^>]+data-customer-page="vendorApplication"/);
  assert.match(html, /id="adminVendorReviewNav"[^>]+data-customer-page="vendorReviews"/);
  assert.match(html, /js\/vendor-onboarding\.js\?v=vendor-onboarding-1/);
  assert.match(ui, /function renderVendorApplication\(\)/);
  assert.match(ui, /function renderVendorReviews\(\)/);
  assert.match(ui, /currentAccount\.role !== 'admin'/);
});

test('vendor applications are private to their applicant and administrators', () => {
  assert.match(migration, /alter table public\.vendor_applications enable row level security/i);
  assert.match(migration, /applicant_id = auth\.uid\(\) or public\.is_admin\(\)/i);
  assert.doesNotMatch(migration, /grant (?:insert|update|delete)[^;]*vendor_applications to authenticated/i);
});

test('only an administrator can approve vendors and approval creates one vendor and truck', () => {
  assert.match(migration, /if not public\.is_admin\(\) then raise exception 'Administrator access is required'/i);
  assert.match(migration, /update public\.profiles set role = 'vendor'/i);
  assert.match(migration, /insert into public\.vendor_profiles/i);
  assert.match(migration, /insert into public\.trucks/i);
  assert.match(migration, /where id = p_application_id and status = 'pending'/i);
});

test('the browser service uses protected RPCs rather than direct application writes', () => {
  assert.match(service, /client\.rpc\('submit_vendor_application'/);
  assert.match(service, /client\.rpc\('review_vendor_application'/);
  assert.doesNotMatch(service, /from\('vendor_applications'\)\.insert/);
  assert.doesNotMatch(service, /from\('vendor_applications'\)\.update/);
});
