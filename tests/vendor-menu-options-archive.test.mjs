import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('every vendor menu item supports a renameable priced option group and category creation', async () => {
  const [html, app, data, customer] = await Promise.all([
    read('index.html'), read('js/app.js'), read('js/vendor-data.js'), read('js/customer-account.js')
  ]);
  assert.match(html, /id="menuAddOnLabel"/);
  assert.match(html, /id="createCategoryFromItem"/);
  assert.match(app, /STANDARD_VENDOR_CONDIMENTS/);
  assert.match(app, /No Cheese/);
  assert.match(app, /addOnLabel=document\.getElementById\('menuAddOnLabel'\)/);
  assert.match(data, /add_on_label: String\(item\.addOnLabel/);
  assert.match(customer, /item\?\.addOnLabel/);
});

test('vendors can archive completed orders and restore them from the Archive tab', async () => {
  const [html, app, live, migration] = await Promise.all([
    read('index.html'), read('js/app.js'), read('js/live-orders.js'),
    read('supabase/migrations/202610140001_vendor_menu_options_and_order_archive.sql')
  ]);
  assert.match(html, /data-filter="archived"/);
  assert.match(app, /window\.archiveOrder/);
  assert.match(app, /window\.restoreArchivedOrder/);
  assert.match(live, /setVendorOrderArchived/);
  assert.match(migration, /add column if not exists vendor_archived_at timestamptz/);
  assert.match(migration, /function public\.set_vendor_order_archived/);
});

test('today sales visibly includes picked-up test-order value for demonstrations', async () => {
  const [html, app] = await Promise.all([read('index.html'), read('js/app.js')]);
  assert.match(html, /id="salesTotalNote"/);
  assert.doesNotMatch(app, /o\.isTest\|\|!\['pickedup','completed'\]/);
  assert.match(app, /Includes no-charge test-order value for demonstration/);
});

