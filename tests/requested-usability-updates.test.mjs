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

test('customer and vendor order details show placed, received, and picked-up date stamps', async () => {
  const [customer, vendor] = await Promise.all([read('js/customer-account.js'), read('js/app.js')]);
  assert.match(customer, /receivedAt: Date\.parse\(row\.received_at \|\| row\.created_at\)/);
  assert.match(customer, /\['Order Placed',[\s\S]*\['Order Received',[\s\S]*\['Order Picked Up'/);
  assert.match(customer, /<span>Order Placed<\/span>/);
  assert.match(customer, /<span>Order Received<\/span>/);
  assert.match(customer, /<span>Picked Up<\/span>/);
  assert.match(vendor, /receivedAt:Date\.parse\(row\.received_at\|\|row\.created_at\)/);
  assert.match(vendor, /function orderMilestoneMarkup/);
  assert.match(vendor, /<span>Order Placed<\/span>/);
  assert.match(vendor, /<span>Order Received<\/span>/);
  assert.match(vendor, /<span>Picked Up<\/span>/);
});

test('picked-up customer status is clearly completed and green', async () => {
  const [customer, styles] = await Promise.all([read('js/customer-account.js'), read('css/customer-account.css')]);
  assert.match(customer, /statusLabel: 'Order Picked Up'/);
  assert.match(customer, /pickedup: 4, picked_up: 4, completed: 4/);
  assert.match(customer, /isPickedUpTrackingStatus\(order\.status\) && index === activeIndex/);
  assert.match(customer, /complete \? 'complete' : index === activeIndex \? 'active'/);
  assert.match(customer, /order\.status === 'completed' \? 'picked-up' : ''/);
  assert.match(styles, /\.status-pill\.picked-up\{background:#dff4e7;color:#126a3c\}/);
});

test('vendor menu supports Dessert/Snacks and migrates BCS Pound Cake into it', async () => {
  const [vendor, customer, migration] = await Promise.all([
    read('js/app.js'),
    read('js/customer-account.js'),
    read('supabase/migrations/202610070001_bcs_dessert_snacks.sql')
  ]);
  assert.match(vendor, /'Dessert\/Snacks'/);
  assert.match(customer, /return 'Dessert\/Snacks'/);
  assert.match(migration, /'Dessert\/Snacks'/);
  assert.match(migration, /lower\(btrim\(name\)\) = lower\('Pound Cake'\)/);
  assert.match(migration, /on conflict \(truck_id, name\) do update set is_active = true/);
});

test('drinks require size and flavor while Pound Cake has no customization', async () => {
  const customer = await read('js/customer-account.js');
  assert.match(customer, /STANDARD_DRINK_SIZE_OPTIONS = \['Small', 'Medium', 'Large'\]/);
  assert.match(customer, /STANDARD_DRINK_FLAVOR_OPTIONS = \['Vanilla', 'Strawberry', 'Chocolate'\]/);
  assert.match(customer, /name: 'Choose a Size'/);
  assert.match(customer, /name: 'Choose a Flavor'/);
  assert.match(customer, /\\bpound\\s\*cake\\b/);
  assert.match(customer, /requiredChoices: \[\], optionalChoices: \[\], allowSpecialInstructions: false/);
  assert.match(customer, /item\.allowSpecialInstructions === false \? ''/);
});

test('vendor picked-up display uses fixed dates and never a running pickup timer', async () => {
  const [vendor, html, worker] = await Promise.all([
    read('js/app.js'),
    read('index.html'),
    read('service-worker.js')
  ]);
  assert.match(vendor, /if\(o\.status==='pickedup'\)return `<div class="timer">✓ Picked up \$\{orderDateStamp\(o\.pickedUpAt\)\}<\/div>`/);
  assert.match(vendor, /<strong>Placed:<\/strong> \$\{orderDateStamp\(o\.createdAt\)\}/);
  assert.match(vendor, /return value&&Number\.isFinite\(date\.getTime\(\)\)\?date\.toLocaleString/);
  assert.match(html, /js\/app\.js\?v=vendor-timestamps-2/);
  assert.match(html, /js\/customer-account\.js\?v=tracking-complete-3/);
  assert.match(worker, /foodtreknow-shell-v63/);
});

test('Today\'s Sales counts paid cash and online orders on the sale date', async () => {
  const vendor = await read('js/app.js');
  assert.match(vendor, /if\(o\.paid!==true\|\|o\.isTest\|\|o\.status==='cancelled'\)return false/);
  assert.match(vendor, /const numeric=Number\(o\.createdAt\),soldAt=/);
  assert.doesNotMatch(vendor, /!\['pickedup','completed'\]\.includes\(o\.status\)/);
});
