import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const migration = fs.readFileSync(new URL('../supabase/migrations/202608230005_order_communications.sql', import.meta.url), 'utf8');
const roleContextMigration = fs.readFileSync(new URL('../supabase/migrations/202608230006_order_message_role_context.sql', import.meta.url), 'utf8');
const customerSource = fs.readFileSync(new URL('../js/customer-account.js', import.meta.url), 'utf8');
const vendorSource = fs.readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../css/customer-account.css', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('communication migration creates protected messages and notifications', () => {
  for (const table of ['order_messages', 'customer_notifications']) {
    assert.match(migration, new RegExp(`create table if not exists public\\.${table}`));
    assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`));
    assert.match(migration, new RegExp(`alter publication supabase_realtime add table public\\.${table}`));
  }
  assert.match(migration, /selected sender role is not authorized/);
  assert.match(migration, /create_order_status_notification/);
  assert.match(migration, /sender_role in \('customer', 'vendor'\)/);
});

test('anonymous users cannot write communications directly', () => {
  assert.match(migration, /revoke all on public\.order_messages, public\.customer_notifications from anon, authenticated/);
  assert.match(migration, /grant select on public\.order_messages, public\.customer_notifications to authenticated/);
  assert.match(migration, /grant execute on function public\.send_order_message\(uuid, text, text\) to authenticated/);
});

test('message RPCs require an authorized customer or vendor screen context', () => {
  assert.match(migration, /p_sender_role text/);
  assert.match(migration, /p_reader_role text/);
  assert.match(roleContextMigration, /drop function if exists public\.send_order_message\(uuid, text\)/);
  assert.match(roleContextMigration, /grant execute on function public\.send_order_message\(uuid, text, text\) to authenticated/);
  assert.match(roleContextMigration, /selected reader role is not authorized/);
});

test('customer notification center includes unread state and live order messages', () => {
  assert.match(html, /data-customer-notification-count/);
  assert.match(customerSource, /customerNotifications/);
  assert.match(customerSource, /data-mark-notifications-read/);
  assert.match(customerSource, /customerOrderMessageForm/);
  assert.match(customerSource, /sendOrderMessage/);
  assert.match(css, /\.communication-notification\.unread/);
  assert.match(css, /\.message-bubble\.mine/);
});

test('vendor order details include unread badges and two-way messaging', () => {
  assert.match(vendorSource, /vendor-message-badge/);
  assert.match(vendorSource, /vendorOrderMessageForm/);
  assert.match(vendorSource, /markOrderMessagesRead/);
  assert.match(vendorSource, /subscribeVendorCommunications/);
  assert.match(vendorSource, /mapped\.messages=previous\.messages/);
});
