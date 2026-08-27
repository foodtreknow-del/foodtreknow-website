import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const locationSource = fs.readFileSync(new URL('../js/live-location.js', import.meta.url), 'utf8');
const vendorSource = fs.readFileSync(new URL('../js/vendor-location.js', import.meta.url), 'utf8');
const customerSource = fs.readFileSync(new URL('../js/customer-account.js', import.meta.url), 'utf8');
const marketplaceSource = fs.readFileSync(new URL('../js/customer-marketplace.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const manifest = fs.readFileSync(new URL('../android/app/src/main/AndroidManifest.xml', import.meta.url), 'utf8');
const iosInfo = fs.readFileSync(new URL('../ios/App/App/Info.plist', import.meta.url), 'utf8');
const migration = fs.readFileSync(new URL('../supabase/migrations/202608270001_live_truck_locations.sql', import.meta.url), 'utf8');
const subscriptionMigration = fs.readFileSync(new URL('../supabase/migrations/202608230010_vendor_subscriptions.sql', import.meta.url), 'utf8');
const visibilityFix = fs.readFileSync(new URL('../supabase/migrations/202608270002_fix_public_truck_visibility.sql', import.meta.url), 'utf8');
const privacy = fs.readFileSync(new URL('../privacy.html', import.meta.url), 'utf8');

function locationHarness() {
  const rpcCalls = [];
  const cleared = [];
  const navigator = {
    geolocation: {
      getCurrentPosition(success) {
        success({ coords: { latitude: 38.9423, longitude: -76.7302, accuracy: 8 }, timestamp: 12345 });
      },
      watchPosition() { return 7; },
      clearWatch(id) { cleared.push(id); }
    },
    permissions: { async query() { return { state: 'granted' }; } }
  };
  const window = {
    navigator,
    FoodTrekNowSupabaseClient: {
      async rpc(name, payload) {
        rpcCalls.push({ name, payload });
        return { data: { ...payload }, error: null };
      }
    },
    addEventListener() {},
    dispatchEvent() {}
  };
  const context = vm.createContext({ window, navigator, console, CustomEvent: class { constructor(type, init) { this.type = type; this.detail = init?.detail; } }, Date, Math, Promise, Error, Number, Boolean, String });
  vm.runInContext(locationSource, context);
  return { service: window.FoodTrekNowLocation, rpcCalls, cleared };
}

test('customers can grant permission and capture a real device GPS position', async () => {
  const { service } = locationHarness();
  assert.equal(await service.permissionState(), 'granted');
  const position = await service.requestCurrentPosition();
  assert.equal(position.latitude, 38.9423);
  assert.equal(position.longitude, -76.7302);
  assert.equal(position.accuracy, 8);
});

test('vendors explicitly start and stop secure Supabase location publishing', async () => {
  const { service, rpcCalls, cleared } = locationHarness();
  await service.startVendorSharing('truck-bcs');
  assert.equal(service.isVendorSharing(), true);
  assert.equal(rpcCalls[0].name, 'publish_live_truck_location');
  assert.equal(rpcCalls[0].payload.p_truck_id, 'truck-bcs');
  assert.equal(rpcCalls[0].payload.p_is_sharing, true);
  await service.stopVendorSharing();
  assert.equal(service.isVendorSharing(), false);
  assert.equal(rpcCalls.at(-1).payload.p_is_sharing, false);
  assert.deepEqual(cleared, [7]);
});

test('live location UI and customer map replace the previous placeholders', () => {
  for (const text of ['Live Truck Location', 'Start Sharing Location', 'Stop Sharing']) assert.ok(html.includes(text));
  assert.match(customerSource, /Live Truck Map/);
  assert.match(html, /js\/live-location\.js/);
  assert.match(html, /js\/vendor-location\.js/);
  assert.match(vendorSource, /startVendorSharing/);
  assert.match(customerSource, /requestCurrentPosition/);
  assert.match(customerSource, /google\.com\/maps\/dir/);
  assert.doesNotMatch(customerSource, /GPS connection is prepared for a future phase/);
  assert.doesNotMatch(customerSource, /Live map coming in a future phase/);
});

test('live locations use a private-by-default table, ownership RPC, expiry, and realtime updates', () => {
  assert.match(migration, /create table if not exists public\.truck_live_locations/);
  assert.match(migration, /not public\.owns_truck\(p_truck_id\)/);
  assert.match(migration, /recorded_at >= now\(\) - interval '10 minutes'/);
  assert.match(migration, /revoke all on public\.truck_live_locations from anon, authenticated/);
  assert.match(migration, /supabase_realtime add table public\.truck_live_locations/);
  assert.match(marketplaceSource, /subscribeLocations/);
  assert.match(marketplaceSource, /truck_live_locations/);
});

test('public active truck reads do not require private vendor profile access', () => {
  for (const migration of [subscriptionMigration, visibilityFix]) {
    assert.match(migration, /create policy trucks_public_read/i);
    assert.match(migration, /is_active\s+or public\.owns_truck\(id\)/i);
  }
  assert.doesNotMatch(visibilityFix, /grant select on public\.vendor_profiles to anon/i);
  assert.doesNotMatch(visibilityFix, /from public\.vendor_profiles/i);
});

test('Android requests only foreground location and the privacy policy explains both roles', () => {
  assert.match(manifest, /android\.permission\.ACCESS_COARSE_LOCATION/);
  assert.match(manifest, /android\.permission\.ACCESS_FINE_LOCATION/);
  assert.doesNotMatch(manifest, /ACCESS_BACKGROUND_LOCATION/);
  assert.match(privacy, /Customer location:/);
  assert.match(privacy, /Vendor live location:/);
  assert.match(privacy, /location sharing is off by default/i);
});

test('iOS uses the FoodTrekNow bundle id and explains while-in-use location permission', () => {
  const xcodeProject = fs.readFileSync(new URL('../ios/App/App.xcodeproj/project.pbxproj', import.meta.url), 'utf8');
  assert.match(xcodeProject, /PRODUCT_BUNDLE_IDENTIFIER = com\.foodtreknow\.app/);
  assert.match(iosInfo, /NSLocationWhenInUseUsageDescription/);
  assert.match(iosInfo, /find nearby food trucks/);
  assert.doesNotMatch(iosInfo, /NSLocationAlways/);
});
