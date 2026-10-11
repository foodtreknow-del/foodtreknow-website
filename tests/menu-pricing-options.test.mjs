import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('vendors can configure independently priced sizes and paid item add-ons', async () => {
  const [html, vendor, data, styles] = await Promise.all([
    read('index.html'), read('js/app.js'), read('js/vendor-data.js'), read('css/vendor.css')
  ]);
  assert.match(html, /id="menuSizeOptions"/);
  assert.match(html, /id="menuAddOns"/);
  assert.match(html, /Add Crab/);
  assert.match(vendor, /sizeOptions=readMenuOptions\('menuSizeOptions'\)/);
  assert.match(vendor, /addOns=readMenuOptions\('menuAddOns'\)/);
  assert.match(vendor, /Math\.min\(\.\.\.sizeOptions\.map\(option=>option\.price\)\)/);
  assert.match(data, /size_options: Array\.isArray\(item\.sizeOptions\)/);
  assert.match(data, /add_ons: Array\.isArray\(item\.addOns\)/);
  assert.match(styles, /\.menu-option-row/);
});

test('customers see configured size prices and optional paid add-ons', async () => {
  const customer = await read('js/customer-account.js');
  assert.match(customer, /sizeOptions: Array\.isArray\(item\.size_options\)/);
  assert.match(customer, /addOns: Array\.isArray\(item\.add_ons\)/);
  assert.match(customer, /name: 'Choose a Size'/);
  assert.match(customer, /name: 'Add-ons'/);
  assert.match(customer, /option\.absolutePrice/);
  assert.match(customer, /configured\.addOnChoice/);
});

test('database validates configured options and calculates final item pricing', async () => {
  const migration = await read('supabase/migrations/202610110001_menu_item_pricing_options.sql');
  assert.match(migration, /add column if not exists size_options jsonb/);
  assert.match(migration, /add column if not exists add_ons jsonb/);
  assert.match(migration, /function public\.menu_item_unit_price/);
  assert.match(migration, /Select one size for/);
  assert.match(migration, /Select a valid add-on for/);
  assert.match(migration, /item_unit_price := public\.menu_item_unit_price/);
  assert.match(migration, /create or replace function public\.create_payment_checkout_draft/);
});
