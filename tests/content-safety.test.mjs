import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const migration = read('supabase/migrations/202611070001_content_reporting_and_blocking.sql');
const liveOrders = read('js/live-orders.js');
const customer = read('js/customer-account.js');
const vendor = read('js/app.js');
const marketplace = read('js/opportunity-marketplace.js');

test('content safety migration stores reports and account blocks behind RLS', () => {
  assert.match(migration, /create table if not exists public\.user_blocks/i);
  assert.match(migration, /create table if not exists public\.content_reports/i);
  assert.match(migration, /alter table public\.user_blocks enable row level security/i);
  assert.match(migration, /alter table public\.content_reports enable row level security/i);
  assert.match(migration, /create or replace function public\.report_content/i);
  assert.match(migration, /create or replace function public\.set_user_block/i);
  assert.match(migration, /grant execute on function public\.report_content\(text, uuid, text, text\) to authenticated/i);
});

test('blocked participants cannot continue order or opportunity messaging', () => {
  assert.match(migration, /users_block_each_other\(auth\.uid\(\), recipient_id\)/i);
  assert.match(migration, /users_block_each_other\(auth\.uid\(\), recipient\)/i);
  assert.match(migration, /Messaging is unavailable because one participant has blocked the other/);
  assert.match(migration, /not public\.has_blocked_user\(sender_id\)/i);
  assert.match(migration, /not public\.has_blocked_user\(reviewer_id\)/i);
});

test('shared client exposes report and block operations with a visible report dialog', () => {
  assert.match(liveOrders, /async function reportContent/);
  assert.match(liveOrders, /client\.rpc\('report_content'/);
  assert.match(liveOrders, /async function setUserBlocked/);
  assert.match(liveOrders, /client\.rpc\('set_user_block'/);
  assert.match(liveOrders, /Community Safety/);
  assert.match(liveOrders, /Also block this account/);
  assert.match(liveOrders, /data-report-content/);
});

test('customer and vendor order conversations expose controls only on incoming messages', () => {
  assert.match(customer, /message\.sender_role !== 'customer'.*data-report-content="order_message"/s);
  assert.match(customer, /data-block-user=/);
  assert.match(vendor, /message\.sender_role!=='vendor'.*data-report-content="order_message"/s);
  assert.match(vendor, /data-block-user=/);
});

test('event conversations and reviews expose report and block controls', () => {
  assert.match(marketplace, /data-report-content="opportunity_message"/);
  assert.match(marketplace, /data-report-content="opportunity_review"/);
  assert.match(marketplace, /state\.currentUserId/);
  assert.match(marketplace, /data-block-user=/);
});
