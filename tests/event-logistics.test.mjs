import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('event logistics migration adds protected site maps, spaces, utilities, and check-in', async () => {
  const migration = await read('supabase/migrations/202609220001_event_logistics.sql');
  for (const field of ['site_map_image_url', 'vendor_zone_name', 'vendor_entrance', 'customer_map_enabled', 'space_code', 'map_x', 'map_y', 'arrival_window_start', 'electrical_access', 'generator_permitted', 'check_in_status']) {
    assert.match(migration, new RegExp(field));
  }
  for (const fn of ['save_event_logistics', 'assign_vendor_space', 'vendor_event_check_in', 'list_customer_events']) {
    assert.match(migration, new RegExp(`create or replace function public\\.${fn}`));
    assert.match(migration, new RegExp(`grant execute on function public\\.${fn}`));
  }
  assert.match(migration, /public\.host_owns_opportunity/);
  assert.match(migration, /v\.owner_id = auth\.uid\(\)/);
  assert.match(migration, /'space_code'.*b\.space_code/s);
});

test('organizer can map vendor zones, assign spaces, and use smart placement', async () => {
  const [marketplace, styles] = await Promise.all([
    read('js/opportunity-marketplace.js'),
    read('css/opportunity-marketplace.css')
  ]);
  for (const label of ['Event Logistics', 'Smart Placement', 'Save Event Map &amp; Instructions', 'Save Vendor Space', 'Map position X', 'Arrival window begins']) {
    assert.match(marketplace, new RegExp(label));
  }
  assert.match(marketplace, /rpc\('save_event_logistics'/);
  assert.match(marketplace, /rpc\('assign_vendor_space'/);
  assert.match(marketplace, /eventSpaceMap/);
  assert.match(styles, /event-space-map/);
  assert.match(styles, /vendor-space-assignment-form/);
});

test('vendors and customers receive assigned-space navigation without removing existing features', async () => {
  const [marketplace, customer, html] = await Promise.all([
    read('js/opportunity-marketplace.js'),
    read('js/customer-account.js'),
    read('index.html')
  ]);
  assert.match(marketplace, /View Assigned Space/);
  assert.match(marketplace, /Navigate to Vendor Space/);
  assert.match(marketplace, /vendor_event_check_in/);
  assert.match(customer, /Event pickup map/);
  assert.match(customer, /Pickup at/);
  assert.match(customer, /Need a Food Truck\?/);
  assert.match(html, /Host \/ Event Organizer Login/);
  assert.match(html, /event-logistics-1/);
});

test('monthly vendor subscription pricing remains unchanged by logistics work', async () => {
  const subscription = await read('js/vendor-subscription.js');
  assert.match(subscription, /monthly/i);
  assert.doesNotMatch(subscription, /event logistics/i);
});
