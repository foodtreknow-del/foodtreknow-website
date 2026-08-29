import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const migration = fs.readFileSync(new URL('../supabase/migrations/202608280002_customer_event_discovery.sql', import.meta.url), 'utf8');

test('customer event discovery exposes only upcoming events with confirmed trucks', () => {
  assert.match(migration, /create or replace function public\.list_customer_events\(\)/i);
  assert.match(migration, /b\.status = 'confirmed'/i);
  assert.match(migration, /o\.ends_at >= now\(\)/i);
  assert.match(migration, /o\.status in \('published', 'filled'\)/i);
  assert.match(migration, /t\.is_active = true/i);
});

test('customer event feed is callable by guests and signed-in customers without exposing private contacts', () => {
  assert.match(migration, /grant execute on function public\.list_customer_events\(\) to anon, authenticated/i);
  assert.doesNotMatch(migration, /contact_email|contact_phone|contact_mobile|vendor_message|host_response|special_requirements/i);
});
