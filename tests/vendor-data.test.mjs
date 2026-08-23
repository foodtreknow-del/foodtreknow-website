import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../js/vendor-data.js', import.meta.url), 'utf8');
const appSource = fs.readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const settingsSource = fs.readFileSync(new URL('../js/vendor-settings.js', import.meta.url), 'utf8');
const customerSource = fs.readFileSync(new URL('../js/customer-account.js', import.meta.url), 'utf8');
const migration = fs.readFileSync(new URL('../supabase/migrations/202608230004_vendor_menu_sync.sql', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

function harness() {
  const calls = [];
  const rows = {
    menu_categories: [{ id: 'cat-1', name: 'Entrees', sort_order: 1 }],
    menu_items: [{ client_key: '7', name: 'Fish Plate', price: '14.50', description: 'Fresh fish', photo_url: 'fish.jpg', is_featured: true, is_sold_out: true, sort_order: 2, menu_categories: { name: 'Entrees' } }],
    truck_hours: [{ day_of_week: 1, opens_at: '11:00:00', closes_at: '20:00:00', is_closed: false }]
  };
  const builder = table => {
    const state = { table, action: 'select', payload: null };
    const query = {
      select() { state.action = 'select'; return this; },
      update(payload) { state.action = 'update'; state.payload = payload; calls.push(['update', table, payload]); return this; },
      upsert(payload, options) { state.action = 'upsert'; state.payload = payload; calls.push(['upsert', table, payload, options]); return this; },
      eq() { return this; },
      order() { return this; },
      then(resolve) { resolve({ data: state.action === 'select' ? rows[table] : null, error: null }); }
    };
    return query;
  };
  const client = {
    from: table => builder(table),
    async rpc(name, payload) { calls.push(['rpc', name, payload]); return { error: null }; }
  };
  const localStorage = { getItem: key => key === 'ftnActiveVendorTruckId' ? 'truck-1' : null };
  const window = { FoodTrekNowSupabaseClient: client, dispatchEvent() {} };
  vm.runInContext(source, vm.createContext({ window, localStorage, CustomEvent: class {}, clearTimeout, setTimeout, console }));
  return { api: window.FoodTrekNowVendorData, calls };
}

test('vendor menu loads categories, sold-out status, featured status, photos, and prices', async () => {
  const { api } = harness();
  const menu = await api.loadMenu('truck-1');
  assert.deepEqual(Array.from(menu.categories), ['Entrees']);
  assert.equal(menu.items[0].id, 7);
  assert.equal(menu.items[0].available, false);
  assert.equal(menu.items[0].featured, true);
  assert.equal(menu.items[0].image, 'fish.jpg');
  assert.equal(menu.items[0].price, 14.5);
});

test('vendor menu changes use the protected synchronization function', async () => {
  const { api, calls } = harness();
  await api.syncMenu(['Entrees'], [{ id: 7, name: 'Fish Plate', category: 'Entrees', price: 14.5, description: '', image: '', featured: false, available: true, order: 1 }], 'truck-1');
  const call = calls.find(entry => entry[0] === 'rpc');
  assert.equal(call[1], 'sync_vendor_menu');
  assert.equal(call[2].p_truck_id, 'truck-1');
  assert.equal(call[2].p_items[0].client_key, '7');
});

test('vendor settings update the truck and all weekly operating hours', async () => {
  const { api, calls } = harness();
  await api.syncSettings({
    profile: { truckName: 'BCS Food Truck', cuisine: 'Soul Food', description: '', phone: '123', email: 'vendor@example.com', city: 'Bowie', state: 'MD', logo: '' },
    operations: { acceptingOrders: true, prepTime: 25, minimumOrder: 5, taxRate: 6, pickupInstructions: 'At the window' },
    hours: { monday: { enabled: true, open: '11:00', close: '20:00' }, sunday: { enabled: false, open: '11:00', close: '20:00' } }
  }, 'truck-1');
  assert.ok(calls.some(entry => entry[0] === 'update' && entry[1] === 'trucks' && entry[2].estimated_prep_minutes === 25));
  const hours = calls.find(entry => entry[0] === 'upsert' && entry[1] === 'truck_hours');
  assert.equal(hours[2][0].truck_id, 'truck-1');
  assert.ok(hours[2].some(row => row.day_of_week === 0 && row.is_closed));
  assert.equal(hours[3].onConflict, 'truck_id,day_of_week');
});

test('remote vendor hours map back into the settings model', async () => {
  const { api } = harness();
  const hours = await api.loadHours('truck-1');
  assert.deepEqual({ ...hours.monday }, { enabled: true, open: '11:00', close: '20:00' });
});

test('database migration restricts menu synchronization to the owning authenticated vendor', () => {
  assert.match(migration, /if not public\.owns_truck\(p_truck_id\)/i);
  assert.match(migration, /revoke all on function public\.sync_vendor_menu[\s\S]*from public, anon/i);
  assert.match(migration, /grant execute[\s\S]*to authenticated/i);
  assert.match(migration, /unique index[\s\S]*truck_id, client_key/i);
});

test('vendor data loads before the dashboard and UI mutations queue synchronization', () => {
  const vendorDataPosition = html.search(/js\/vendor-data\.js\?v=vendor-data-\d+/);
  const appPosition = html.search(/js\/app\.js/);
  assert.ok(vendorDataPosition >= 0 && vendorDataPosition < appPosition);
  assert.match(appSource, /hydrateVendorMenu/);
  assert.match(appSource, /queueMenuSync\(categories,menuItems\)/);
  assert.match(settingsSource, /queueSettingsSync\(vendorSettings\)/);
  assert.match(customerSource, /if \(localStorage\.getItem\('ftnVendorLoggedIn'\)\) return/);
  assert.match(html, /Approved vendor accounts sync securely across devices/);
});
