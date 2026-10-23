import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const html = read('index.html');
const customer = read('js/customer-account.js');
const vendor = read('js/app.js');
const hostMarketplace = read('js/opportunity-marketplace.js');
const hostService = read('js/host-onboarding.js');
const migration = read('supabase/migrations/202610230001_host_approvals_and_multi_portal_access.sql');

test('customer navigation offers vendor and Host applications then changes to portal switches', () => {
  assert.match(html, /id="vendorApplicationNav"[\s\S]*Become a Vendor/);
  assert.match(html, /id="hostApplicationNav"[\s\S]*Become a Host/);
  assert.match(customer, /portalAccess\.vendor_approved \? 'Vendor Portal' : 'Become a Vendor'/);
  assert.match(customer, /portalAccess\.host_approved \? 'Host Portal' : 'Become a Host'/);
});

test('approved Vendor and Host portals can return to Customer and switch to each other', () => {
  assert.match(html, /id="switchToCustomerPortalButton"[\s\S]*id="switchToVendorPortalFromHostButton"/);
  assert.match(html, /id="vendorCustomerPortalButton"[\s\S]*id="vendorHostPortalButton"[\s\S]*id="logoutButton"/);
  assert.match(vendor, /vendorHostPortalButton[\s\S]*FoodTrekNowOpenHostPortal/);
  assert.match(customer, /window\.FoodTrekNowOpenHostPortal/);
});

test('Host access requires administrator approval and cannot be self-created', () => {
  assert.match(migration, /if not public\.is_admin\(\) then raise exception 'Administrator access is required'/i);
  assert.match(migration, /insert into public\.location_hosts[\s\S]*verification_status/i);
  assert.match(migration, /where owner_id = auth\.uid\(\) and verification_status = 'verified'/i);
  assert.match(hostMarketplace, /Administrator approval is required before this account can use the Host Portal/);
});

test('Host applications remain private and use protected RPCs', () => {
  assert.match(migration, /alter table public\.host_applications enable row level security/i);
  assert.match(migration, /applicant_id = auth\.uid\(\) or public\.is_admin\(\)/i);
  assert.match(hostService, /client\.rpc\('submit_host_application'/);
  assert.match(hostService, /client\.rpc\('review_host_application'/);
  assert.doesNotMatch(hostService, /from\('host_applications'\)\.(insert|update|delete)/);
});

test('the singleton administrator receives a Host approval screen', () => {
  assert.match(html, /id="adminHostReviewNav"[^>]+data-customer-page="hostReviews"/);
  assert.match(customer, /function renderHostReviews\(\)/);
  assert.match(customer, /FoodTrekNowHostOnboarding\.review/);
});
