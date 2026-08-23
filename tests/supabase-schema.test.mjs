import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationUrl = new URL(
  "../supabase/migrations/202608230001_phase4_foundation.sql",
  import.meta.url,
);
const sql = await readFile(migrationUrl, "utf8");

const requiredTables = [
  "profiles",
  "vendor_profiles",
  "trucks",
  "truck_members",
  "truck_hours",
  "menu_categories",
  "menu_items",
  "orders",
  "order_items",
  "order_status_events",
  "addresses",
  "favorite_trucks",
  "favorite_orders",
  "payment_method_preferences",
  "notification_preferences",
];

test("migration creates every Phase 4 foundation table", () => {
  for (const table of requiredTables) {
    assert.match(sql, new RegExp(`create table if not exists public\\.${table}\\b`, "i"));
  }
});

test("every application table has row level security enabled", () => {
  for (const table of requiredTables) {
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`, "i"));
  }
});

test("order placement calculates prices on the server", () => {
  assert.match(sql, /create or replace function public\.place_order/i);
  assert.match(sql, /selected_item\.price \* item_quantity/i);
  assert.match(sql, /calculated_subtotal \* selected_truck\.tax_rate/i);
  assert.match(sql, /and not is_sold_out/i);
});

test("order lifecycle and realtime synchronization are configured", () => {
  assert.match(sql, /old\.status = 'received' and new\.status in \('preparing', 'cancelled'\)/i);
  assert.match(sql, /old\.status = 'preparing' and new\.status in \('ready', 'cancelled'\)/i);
  assert.match(sql, /old\.status = 'ready' and new\.status in \('picked_up', 'cancelled'\)/i);
  for (const table of ["orders", "order_status_events", "menu_items", "trucks"]) {
    assert.match(sql, new RegExp(`alter publication supabase_realtime add table public\\.${table}`, "i"));
  }
});

test("new users cannot self-assign vendor or administrator roles", () => {
  assert.match(sql, /'customer'::public\.app_role/i);
  assert.match(sql, /Only an administrator can change account roles/i);
  assert.doesNotMatch(sql, /raw_user_meta_data\s*->>\s*'role'/i);
});

test("migration does not contain Supabase credentials or card security data", () => {
  assert.doesNotMatch(sql, /sb_(?:publishable|secret)_/i);
  assert.doesNotMatch(sql, /service_role/i);
  assert.doesNotMatch(sql, /\bcvv\s+(?:text|varchar|integer|numeric)/i);
  assert.doesNotMatch(sql, /\bcard_number\s+(?:text|varchar|integer|numeric)/i);
});
