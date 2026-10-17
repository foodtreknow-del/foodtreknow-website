import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const html = read('index.html');
const ui = read('js/customer-account.js');
const service = read('js/admin-contact-directory.js');
const migration = read('supabase/migrations/202610170001_admin_contact_directory.sql');

test('admin navigation exposes a contact directory for all account groups', () => {
  assert.match(html, /id="adminContactDirectoryNav"[^>]+data-customer-page="adminDirectory"/);
  assert.match(html, /js\/admin-contact-directory\.js\?v=admin-contact-directory-1/);
  assert.match(ui, /function renderAdminDirectory\(\)/);
  assert.match(ui, /Customers/);
  assert.match(ui, /Vendors & Food Trucks/);
  assert.match(ui, /Hosts/);
});

test('customer, vendor, truck, and host names are active contact links', () => {
  assert.match(ui, /data-admin-contact-type=/);
  assert.match(ui, /adminContactButton\('customer'/);
  assert.match(ui, /adminContactButton\('vendor'/);
  assert.match(ui, /adminContactButton\('host'/);
  assert.match(ui, /Username \/ Login Email/);
  assert.match(ui, /href="mailto:/);
  assert.match(ui, /href="tel:/);
});

test('contact data is loaded only through an admin-protected RPC', () => {
  assert.match(service, /client\.rpc\('admin_contact_directory_snapshot'\)/);
  assert.match(migration, /if not public\.is_admin\(\) then\s+raise exception 'Administrator access is required'/i);
  assert.match(migration, /revoke all on function public\.admin_contact_directory_snapshot\(\) from public, anon/i);
  assert.match(migration, /grant execute on function public\.admin_contact_directory_snapshot\(\) to authenticated/i);
  assert.match(migration, /join auth\.users account/);
  assert.match(migration, /'customers'/);
  assert.match(migration, /'vendors'/);
  assert.match(migration, /'hosts'/);
  assert.doesNotMatch(migration, /account\.(?:encrypted_password|confirmation_token|recovery_token)/i);
  assert.doesNotMatch(migration, /from public\.(?:payment_methods|stripe_connect_accounts)/i);
});
