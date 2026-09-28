import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const migration = read('supabase/migrations/202609160001_vendor_walk_up_cash_sales.sql');
const liveWorkflowMigration = read('supabase/migrations/202609280001_live_orders_cash_mobile.sql');
const service = read('js/live-orders.js');
const browser = read('js/vendor-cash-sales.js');
const html = read('index.html');
const styles = read('css/vendor.css');

test('walk-up cash sales are vendor-authorized and server-priced', () => {
  assert.match(migration, /place_vendor_cash_sale/);
  assert.match(migration, /public\.owns_truck\(p_truck_id\)/);
  assert.match(migration, /from public\.menu_items/);
  assert.match(migration, /selected_item\.price \* item_quantity/);
  assert.match(migration, /selected_truck\.tax_rate/);
  assert.match(migration, /payment_label, payment_status/);
  assert.match(migration, /'Cash \(Walk-up\)', 'paid'/);
  assert.match(migration, /order_source, cash_received, cash_change/);
  assert.doesNotMatch(browser, /insert\(|from\('orders'\)/);
});

test('vendor portal provides a responsive cash-sale workflow with close control', () => {
  for (const phrase of ['New Cash Sale', 'Walk-up Cash Sale', 'Cash Received', 'Change Due', 'Save Paid Cash Sale']) {
    assert.ok(html.includes(phrase), `Missing cash-sale UI: ${phrase}`);
  }
  assert.match(html, /id="closeCashSaleModal"/);
  assert.match(html, /js\/vendor-cash-sales\.js/);
  assert.match(styles, /\.cash-sale-modal-card/);
  assert.match(styles, /@media\(max-width:700px\)/);
});

test('browser calls the protected RPC and refreshes vendor orders', () => {
  assert.match(service, /placeVendorCashSale/);
  assert.match(service, /place_vendor_cash_sale/);
  assert.match(browser, /FoodTrekNowLiveOrders\.placeVendorCashSale/);
  assert.match(browser, /hydrateVendorOrders\(activeVendorContext\)/);
  assert.match(browser, /cashSaleReceived/);
});

test('cash sales enter the received queue with an order number and optional customer cell', () => {
  assert.match(liveWorkflowMigration, /p_customer_mobile text default null/);
  assert.match(liveWorkflowMigration, /p_truck_id, 'received'/);
  assert.match(liveWorkflowMigration, /customer_name, customer_mobile/);
  assert.doesNotMatch(liveWorkflowMigration, /preparing_at, ready_at, picked_up_at/);
  assert.match(html, /id="cashSaleMobile"/);
  assert.match(service, /p_customer_mobile: payload\.customerMobile/);
  assert.match(browser, /customerMobile: field\('cashSaleMobile'\)\.value/);
});

test('walk-up cash sales remain paid report transactions and expose a ready-text action', () => {
  const app = read('js/app.js');
  const reports = read('js/vendor-reports.js');
  assert.match(liveWorkflowMigration, /'Cash \(Walk-up\)', 'paid'/);
  assert.match(app, /Text Customer: Order Ready/);
  assert.match(reports, /order\.paid !== false/);
  assert.match(reports, /filter\(order => !order\.isTest\)/);
});
