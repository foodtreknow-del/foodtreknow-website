import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migration = await readFile(new URL('../supabase/migrations/202608240001_live_stripe_cutover.sql', import.meta.url), 'utf8');

test('live Stripe cutover archives sandbox financial state before clearing it', () => {
  for (const table of [
    'stripe_connect_accounts',
    'vendor_subscriptions',
    'vendor_credit_accounts',
    'vendor_credit_transactions',
    'stripe_webhook_events'
  ]) {
    assert.match(migration, new RegExp(`insert into public\\.${table}_sandbox_archive_20260824 select \\* from public\\.${table}`, 'i'));
  }
  assert.ok(migration.indexOf('insert into public.stripe_connect_accounts_sandbox_archive_20260824') < migration.indexOf('delete from public.stripe_connect_accounts'));
  assert.ok(migration.indexOf('insert into public.vendor_subscriptions_sandbox_archive_20260824') < migration.indexOf('delete from public.vendor_subscriptions'));
});

test('future payment records are live and old sandbox orders cannot create money movement', () => {
  assert.match(migration, /orders add column if not exists stripe_livemode boolean not null default false/i);
  assert.match(migration, /orders alter column stripe_livemode set default true/i);
  assert.match(migration, /payment_checkout_drafts alter column stripe_livemode set default true/i);
  assert.match(migration, /prevent_sandbox_financial_resolution/i);
  assert.match(migration, /This sandbox order is read-only after the live payment cutover/i);
  assert.match(migration, /update public\.trucks\s+set is_active = false/i);
});

test('sandbox archives are not exposed to customers or vendors', () => {
  assert.match(migration, /enable row level security/gi);
  assert.match(migration, /revoke all on public\.stripe_connect_accounts_sandbox_archive_20260824 from public, anon, authenticated/i);
  assert.match(migration, /grant select on public\.stripe_connect_accounts_sandbox_archive_20260824 to service_role/i);
});

test('cutover is guarded against an accidental second run', () => {
  assert.match(migration, /create table if not exists public\.stripe_live_cutover_log/i);
  assert.match(migration, /raise exception 'The FoodTrekNow live Stripe cutover has already completed'/i);
  assert.match(migration, /values \('20260824_live_stripe'\)/i);
});
