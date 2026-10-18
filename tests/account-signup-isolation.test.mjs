import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const migration = read('supabase/migrations/202610180002_strict_account_signup_isolation.sql');
const hostMigration = read('supabase/migrations/202608280001_location_marketplace_phase1.sql');

test('approving a vendor creates only missing records for that applicant', () => {
  assert.match(migration, /where vendor\.owner_id = application\.applicant_id[\s\S]*for update/i);
  assert.match(migration, /if applicant_vendor_id is null then[\s\S]*insert into public\.vendor_profiles/i);
  assert.match(migration, /where truck\.vendor_id = applicant_vendor_id[\s\S]*for update/i);
  assert.match(migration, /if applicant_truck_id is null then[\s\S]*insert into public\.trucks/i);
  assert.doesNotMatch(migration, /on conflict \(owner_id\) do update set/i);
});

test('vendor applications and Host events cannot be transferred to another account', () => {
  assert.match(migration, /A vendor application cannot be transferred between accounts/i);
  assert.match(migration, /A[n]? event cannot be transferred between Host accounts/i);
  assert.match(migration, /before update on public\.vendor_applications/i);
  assert.match(migration, /before update on public\.opportunities/i);
});

test('Host signup updates only the signed-in owner record', () => {
  assert.match(hostMigration, /insert into public\.location_hosts \(owner_id,[\s\S]*values \(auth\.uid\(\)/i);
  assert.match(hostMigration, /on conflict \(owner_id\) do update set/i);
  assert.match(hostMigration, /select id into selected_host from public\.location_hosts where owner_id = auth\.uid\(\)/i);
});

