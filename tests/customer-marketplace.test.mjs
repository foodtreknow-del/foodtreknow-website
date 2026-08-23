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

test('customer marketplace loads before customer UI code', () => {
  const marketplacePosition = html.indexOf('js/customer-marketplace.js?v=customer-marketplace-1');
  const customerPosition = html.indexOf('js/customer-account.js?v=live-orders-1');
  assert.ok(marketplacePosition >= 0 && marketplacePosition < customerPosition);
});

test('customer UI merges Supabase trucks without removing sample functionality', () => {
  assert.match(customerSource, /refreshCustomerMarketplace\(\)/);
  assert.match(customerSource, /TRUCKS\.push\(/);
  assert.match(customerSource, /TRUCK_MENUS\[truck\.id\]/);
  assert.match(customerSource, /customerCanOrderTruck/);
  assert.match(customerSource, /Sign In to Order/);
  assert.match(customerSource, /item\.image \? `<img/);
});
