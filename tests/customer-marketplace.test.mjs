import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../js/customer-marketplace.js', import.meta.url), 'utf8');
const customerSource = fs.readFileSync(new URL('../js/customer-account.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

function harness() {
  const rows = {
    trucks: [{ id: 'truck-live', name: 'BCS Food Truck', cuisine: 'Soul Food', is_active: true, accepting_orders: true }],
    truck_hours: [{ truck_id: 'truck-live', day_of_week: 1, opens_at: '11:00', closes_at: '20:00', is_closed: false }],
    menu_categories: [{ id: 'cat-live', truck_id: 'truck-live', name: 'Entrees', is_active: true, sort_order: 1 }],
    menu_items: [{ id: 'item-live', truck_id: 'truck-live', category_id: 'cat-live', name: 'Fish Plate', description: 'Fresh fish', price: '14.50', photo_url: 'fish.jpg', is_featured: true, is_sold_out: false, is_active: true, sort_order: 1 }]
  };
  const client = {
    rpc(name) {
      assert.equal(name, 'list_customer_events');
      return Promise.resolve({ data: [{ id: 'event-live', title: 'Bowie Food Truck Night', starts_at: '2026-09-01T21:00:00Z', ends_at: '2026-09-02T01:00:00Z', expected_customers: 300, host_name: 'Bowie Community Center', location: { name: 'Town Center', city: 'Bowie', state: 'MD' }, trucks: [{ id: 'truck-live', name: 'BCS Food Truck' }] }], error: null });
    },
    from(table) {
      return {
        select() { return this; }, eq() { return this; }, in() { return this; }, order() { return this; },
        then(resolve) { resolve({ data: rows[table], error: null }); }
      };
    }
  };
  const window = { FoodTrekNowSupabaseClient: client };
  vm.runInContext(source, vm.createContext({ window, console }));
  return window.FoodTrekNowCustomerMarketplace;
}

test('approved active trucks load with their hours, categories, and real menu items', async () => {
  const marketplace = await harness().load();
  assert.equal(marketplace[0].name, 'BCS Food Truck');
  assert.equal(marketplace[0].hours[0].day_of_week, 1);
  assert.equal(marketplace[0].menu[0].category_name, 'Entrees');
  assert.equal(marketplace[0].menu[0].name, 'Fish Plate');
  assert.equal(marketplace[0].menu[0].photo_url, 'fish.jpg');
});

test('confirmed host events load with their attending food trucks', async () => {
  const events = await harness().loadEvents();
  assert.equal(events[0].title, 'Bowie Food Truck Night');
  assert.equal(events[0].location.city, 'Bowie');
  assert.equal(events[0].trucks[0].name, 'BCS Food Truck');
});

test('customer marketplace loads before customer UI code', () => {
  const marketplacePosition = html.indexOf('js/customer-marketplace.js?v=customer-events-1');
  const customerPosition = html.indexOf('js/customer-account.js?v=');
  assert.ok(marketplacePosition >= 0 && marketplacePosition < customerPosition);
});

test('customer UI merges Supabase trucks without removing sample functionality', () => {
  assert.match(customerSource, /refreshCustomerMarketplace\(\)/);
  assert.match(customerSource, /TRUCKS\.push\(/);
  assert.match(customerSource, /TRUCK_MENUS\[truck\.id\]/);
  assert.match(customerSource, /customerCanOrderTruck/);
  assert.match(customerSource, /Sign In to Order/);
  assert.match(customerSource, /item\.image \? `<img/);
  assert.match(customerSource, /customerEventFromMarketplace/);
  assert.match(customerSource, /connectedEvents\.find\(event => event\.truckIds\.includes\(truck\.id\)/);
  assert.match(customerSource, /new Date\(event\.startsAt\).*<= currentTime/s);
  assert.match(customerSource, /data-event-truck/);
});

test('a vendor live Online toggle overrides a closed recurring schedule', () => {
  assert.match(customerSource, /operatingDays: truck\.accepting_orders\s*\? \[0, 1, 2, 3, 4, 5, 6\]/);
});
