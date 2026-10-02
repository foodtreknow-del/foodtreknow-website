import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('all three portal sign-in paths expose an accessible password visibility control', async () => {
  const [html, app] = await Promise.all([read('index.html'), read('js/app.js')]);
  assert.match(html, /data-password-toggle="password"/);
  assert.match(html, /data-password-toggle="customerSignInPassword"/);
  assert.match(app, /querySelectorAll\('\[data-password-toggle\]'\)/);
  assert.match(app, /input\.type=showing\?'password':'text'/);
});

test('Host event dates show weekday labels and support a one-day recurrence choice', async () => {
  const marketplace = await read('js/opportunity-marketplace.js');
  assert.match(marketplace, /Today only \(one-day event\)/);
  assert.match(marketplace, /data-weekday-target="startsAtWeekday"/);
  assert.match(marketplace, /weekday: 'long'/);
  assert.match(marketplace, /frequency'\) === 'none' \? 'one_time'/);
  assert.match(marketplace, /frequency'\) !== 'none'/);
});

test('Vendor menu item modal remains scrollable with sticky save actions', async () => {
  const styles = await read('css/vendor.css');
  assert.match(styles, /menu-item-modal-card\{[^}]*max-height:calc\(100dvh - 32px\)[^}]*overflow-y:auto/);
  assert.match(styles, /menu-item-modal-card \.menu-form-actions\{[^}]*position:sticky[^}]*bottom:0/);
});

test('BCS test menu migration is idempotent and references the supplied menu images', async () => {
  const migration = await read('supabase/migrations/202610010001_bcs_test_menu_items.sql');
  for (const item of [
    ['French Fries', '6.00', 'french-fries.jpg'],
    ['Water', '2.00', 'water.jpg'],
    ['Coke', '3.75', 'coke.jpg']
  ]) {
    assert.match(migration, new RegExp(item[0]));
    assert.match(migration, new RegExp(item[1].replace('.', '\\.')));
    assert.match(migration, new RegExp(item[2].replace('.', '\\.')));
  }
  assert.match(migration, /on conflict \(truck_id, client_key\) do update/);
});
