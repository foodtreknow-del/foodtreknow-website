import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const html = read('index.html');
const customer = read('js/customer-account.js');
const vendor = read('js/app.js');
const customerAuth = read('js/supabase-auth.js');
const vendorAuth = read('js/vendor-auth.js');

test('only the singleton platform administrator receives admin status', () => {
  assert.match(customerAuth, /client\.rpc\('is_admin'\)/);
  assert.match(customerAuth, /isPlatformAdmin: Boolean\(isPlatformAdmin\)/);
  assert.match(vendorAuth, /client\.rpc\('is_admin'\)/);
  assert.match(vendorAuth, /profile\.role !== 'vendor' && !isPlatformAdmin/);
});

test('administrator portal controls are in both left navigation menus before logout', () => {
  assert.match(html, /id="adminCustomerPortalNav"[\s\S]*id="adminVendorPortalNav"[\s\S]*id="adminVendorReviewNav"/);
  assert.match(html, /id="vendorCustomerPortalButton"[\s\S]*id="vendorAdminPortalButton"[\s\S]*id="logoutButton"/);
  assert.match(customer, /adminVendorPortalNav[\s\S]*FoodTrekNowVendorAuth\?\.restore/);
  assert.match(vendor, /vendorCustomerPortalButton[\s\S]*switchFromVendorPortal\('overview'\)/);
  assert.match(vendor, /vendorAdminPortalButton[\s\S]*switchFromVendorPortal\('vendorReviews'\)/);
});

test('admin pages fail closed for every ordinary customer and vendor', () => {
  assert.match(customer, /\['vendorReviews', 'vendorManagement', 'adminDirectory'\]\.includes\(page\) && !currentAccount\?\.isPlatformAdmin/);
  assert.match(customer, /classList\.toggle\('hidden-view', !isPlatformAdmin\)/);
});
