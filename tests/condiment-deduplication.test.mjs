import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('duplicate menu options are removed across vendor and customer ordering views', async () => {
  const [vendor, customer, cashSales, data] = await Promise.all([
    read('js/app.js'),
    read('js/customer-account.js'),
    read('js/vendor-cash-sales.js'),
    read('js/vendor-data.js')
  ]);
  assert.match(vendor, /seen\.has\(key\)/);
  assert.match(customer, /seen\.has\(key\)/);
  assert.match(cashSales, /seen\.has\(key\)/);
  assert.match(data, /uniquePriceOptions/);
  assert.match(data, /addOns: uniquePriceOptions\(item\.add_ons\)/);
  assert.match(data, /add_ons: uniquePriceOptions\(item\.addOns\)/);
});

test('database repair keeps only the first case-insensitive option name', async () => {
  const migration = await read('supabase/migrations/202610160001_deduplicate_menu_options.sql');
  assert.match(migration, /distinct on \(lower\(btrim\(option_value ->> 'name'\)\)\)/);
  assert.match(migration, /jsonb_agg\(deduplicated\.option_value order by deduplicated\.first_position\)/);
  assert.match(migration, /add_ons = coalesce/);
});
