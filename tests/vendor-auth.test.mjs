import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../js/vendor-auth.js', import.meta.url), 'utf8');
const appSource = fs.readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const settingsSource = fs.readFileSync(new URL('../js/vendor-settings.js', import.meta.url), 'utf8');
const reportsSource = fs.readFileSync(new URL('../js/vendor-reports.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

class StorageMock {
  constructor() { this.values = new Map(); }
  getItem(key) { return this.values.has(key) ? this.values.get(key) : null; }
  setItem(key, value) { this.values.set(key, String(value)); }
  removeItem(key) { this.values.delete(key); }
}

function harness(role = 'vendor') {
  const calls = [];
  const user = { id: 'vendor-user-1', email: 'vendor@example.com' };
  const rows = {
    profiles: { id: user.id, role, first_name: 'Test', last_name: 'Vendor' },
    vendor_profiles: { id: 'vendor-profile-1', owner_id: user.id, business_name: 'BCS Foods' },
    trucks: { id: 'truck-1', vendor_id: 'vendor-profile-1', name: 'BCS Food Truck', cuisine: 'Soul Food' }
  };
  const client = {
    auth: {
      async signInWithPassword(payload) { calls.push(['signIn', payload]); return { data: { user }, error: null }; },
      async getSession() { return { data: { session: { user } }, error: null }; },
      async resetPasswordForEmail(email, options) { calls.push(['resetPassword', email, options]); return { error: null }; },
      async signOut() { calls.push(['signOut']); return { error: null }; }
    },
    from(table) {
      return {
        select() { return this; }, eq() { return this; }, order() { return this; }, limit() { return this; },
        async single() { return { data: rows[table], error: null }; }
      };
    }
  };
  const context = vm.createContext({ window: { FoodTrekNowSupabaseClient: client, location: { origin: 'https://www.foodtreknow.com', pathname: '/' } }, localStorage: new StorageMock(), console });
  vm.runInContext(source, context, { filename: 'vendor-auth.js' });
  return { api: context.window.FoodTrekNowVendorAuth, context, calls };
}

test('approved vendor credentials resolve the owned vendor profile and truck', async () => {
  const { api, context, calls } = harness();
  const result = await api.signIn('VENDOR@example.com', 'safe-password');
  assert.equal(result.truck.name, 'BCS Food Truck');
  assert.equal(context.localStorage.getItem('ftnActiveVendorTruckId'), 'truck-1');
  assert.deepEqual(JSON.parse(JSON.stringify(calls[0][1])), { email: 'vendor@example.com', password: 'safe-password' });
});

test('customer and administrator accounts cannot enter the vendor dashboard', async () => {
  for (const role of ['customer', 'admin']) {
    const { api, calls } = harness(role);
    await assert.rejects(() => api.signIn('user@example.com', 'safe-password'), /not been approved/i);
    assert.ok(calls.some(call => call[0] === 'signOut'));
  }
});

test('vendor browser persistence is namespaced by approved truck id', async () => {
  const { api, context } = harness();
  await api.signIn('vendor@example.com', 'safe-password');
  assert.equal(context.window.FoodTrekNowVendorStorageKey('ftnVendorOrdersV0231'), 'ftnVendorOrdersV0231:truck-1');
  assert.match(appSource, /vendorStorageKey\(STORAGE_KEY\)/);
  assert.match(appSource, /vendorStorageKey\(MENU_STORAGE_KEY\)/);
  assert.match(settingsSource, /storageKey\(SETTINGS_STORAGE_KEY\)/);
  assert.match(reportsSource, /orderStorageKey\(\)/);
});

test('vendor password recovery validates the email and uses the secure Supabase flow', async () => {
  const { api, calls } = harness();
  await assert.rejects(() => api.requestPasswordReset(''), /vendor email address/i);
  await api.requestPasswordReset('VENDOR@example.com');
  assert.deepEqual(JSON.parse(JSON.stringify(calls.at(-1))), ['resetPassword', 'vendor@example.com', { redirectTo: 'https://www.foodtreknow.com/' }]);
});

test('secure vendor auth loads before the existing dashboard application', () => {
  const authPosition = html.indexOf('js/vendor-auth.js?v=vendor-login-1');
  const appPosition = html.indexOf('js/app.js');
  assert.ok(authPosition >= 0 && authPosition < appPosition);
  assert.match(appSource, /FoodTrekNowVendorAuth\.signIn/);
  assert.match(appSource, /FoodTrekNowVendorAuth\.restore/);
  assert.match(appSource, /FoodTrekNowVendorAuth\.signOut/);
  assert.match(appSource, /FoodTrekNowVendorAuth\.requestPasswordReset/);
});
