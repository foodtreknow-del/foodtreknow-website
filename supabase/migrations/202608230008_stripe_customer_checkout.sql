-- FoodTrekNow customer checkout foundation.
-- Direct Stripe charges are created on each selected vendor account.
-- FoodTrekNow never stores card numbers, CVV values, or bank credentials.

begin;

alter table public.orders
  add column if not exists stripe_account_id text,
  add column if not exists stripe_checkout_session_id text,
  add column if not exists stripe_payment_intent_id text,
  add column if not exists stripe_charge_id text,
  add column if not exists amount_paid_cents bigint not null default 0 check (amount_paid_cents >= 0),
  add column if not exists payment_completed_at timestamptz;

create unique index if not exists idx_orders_stripe_checkout_session
  on public.orders (stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;

create table if not exists public.payment_checkout_drafts (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) on delete cascade,
  truck_id uuid not null references public.trucks(id) on delete restrict,
  stripe_account_id text not null check (stripe_account_id ~ '^acct_[A-Za-z0-9]+$'),
  stripe_checkout_session_id text unique,
  items jsonb not null check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) > 0),
  customer_name text not null,
  customer_mobile text,
  customer_email text,
  order_notes text,
  currency text not null default 'usd' check (currency = 'usd'),
  subtotal_cents bigint not null check (subtotal_cents >= 0),
  tax_cents bigint not null default 0 check (tax_cents >= 0),
  service_fee_cents bigint not null default 0 check (service_fee_cents >= 0),
  total_cents bigint not null check (total_cents >= 0),
  status text not null default 'created' check (
    status in ('created', 'checkout_open', 'paid', 'completed', 'cancelled', 'expired', 'failed')
  ),
  order_id uuid unique references public.orders(id) on delete set null,
  expires_at timestamptz not null default (now() + interval '30 minutes'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.stripe_webhook_events (
  id text primary key check (id ~ '^evt_[A-Za-z0-9]+$'),
  event_type text not null,
  stripe_account_id text,
  processed_at timestamptz,
  error_message text,
  created_at timestamptz not null default now()
);

comment on table public.stripe_webhook_events is
  'Idempotency log for trusted Stripe webhook processing. Raw webhook payloads are not stored.';

comment on table public.payment_checkout_drafts is
  'Server-priced Stripe Checkout drafts. Contains no card or bank credentials.';

drop trigger if exists set_payment_checkout_drafts_updated_at on public.payment_checkout_drafts;
create trigger set_payment_checkout_drafts_updated_at
before update on public.payment_checkout_drafts
for each row execute function public.set_updated_at();

alter table public.payment_checkout_drafts enable row level security;
alter table public.stripe_webhook_events enable row level security;

drop policy if exists payment_checkout_drafts_customer_read on public.payment_checkout_drafts;
create policy payment_checkout_drafts_customer_read
on public.payment_checkout_drafts for select
using (customer_id = auth.uid());

revoke all on public.payment_checkout_drafts from public, anon, authenticated;
grant select on public.payment_checkout_drafts to authenticated;
grant select, insert, update on public.payment_checkout_drafts to service_role;
revoke all on public.stripe_webhook_events from public, anon, authenticated;
grant select, insert, update on public.stripe_webhook_events to service_role;

create or replace function public.create_payment_checkout_draft(
  p_truck_id uuid,
  p_items jsonb,
  p_customer_name text,
  p_customer_mobile text default null,
  p_customer_email text default null,
  p_order_notes text default null
)
returns table (
  draft_id uuid,
  stripe_account_id text,
  truck_name text,
  currency text,
  subtotal_cents bigint,
  tax_cents bigint,
  service_fee_cents bigint,
  total_cents bigint,
  line_items jsonb,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_truck public.trucks%rowtype;
  connected_account public.stripe_connect_accounts%rowtype;
  item_payload jsonb;
  selected_item public.menu_items%rowtype;
  item_quantity integer;
  calculated_subtotal numeric(10, 2) := 0;
  calculated_tax numeric(10, 2) := 0;
  calculated_total numeric(10, 2) := 0;
  snapshot_items jsonb := '[]'::jsonb;
  checkout_lines jsonb := '[]'::jsonb;
  created_draft public.payment_checkout_drafts%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Sign in to pay online';
  end if;
  if p_customer_name is null or btrim(p_customer_name) = '' then
    raise exception 'Customer name is required';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'At least one menu item is required';
  end if;

  select * into selected_truck
  from public.trucks
  where id = p_truck_id
  for share;

  if not found or not selected_truck.is_active or not selected_truck.accepting_orders then
    raise exception 'This food truck is not accepting orders';
  end if;

  select account.* into connected_account
  from public.stripe_connect_accounts account
  where account.vendor_profile_id = selected_truck.vendor_id
    and account.status = 'active'
    and account.charges_enabled
    and account.payouts_enabled;

  if not found then
    raise exception 'This food truck is not ready to accept online payments';
  end if;

  for item_payload in select value from jsonb_array_elements(p_items)
  loop
    begin
      item_quantity := (item_payload ->> 'quantity')::integer;
    exception when others then
      raise exception 'Every item needs a valid quantity';
    end;
    if item_quantity < 1 or item_quantity > 99 then
      raise exception 'Item quantity must be between 1 and 99';
    end if;

    select * into selected_item
    from public.menu_items
    where id = (item_payload ->> 'menu_item_id')::uuid
      and truck_id = p_truck_id
      and is_active
      and not is_sold_out
    for share;

    if not found then
      raise exception 'A selected menu item is unavailable';
    end if;

    calculated_subtotal := calculated_subtotal + round(selected_item.price * item_quantity, 2);
    snapshot_items := snapshot_items || jsonb_build_array(jsonb_build_object(
      'menu_item_id', selected_item.id,
      'item_name', selected_item.name,
      'unit_amount', round(selected_item.price * 100)::bigint,
      'quantity', item_quantity,
      'modifiers', case when jsonb_typeof(item_payload -> 'modifiers') = 'array' then item_payload -> 'modifiers' else '[]'::jsonb end,
      'special_instructions', nullif(btrim(item_payload ->> 'special_instructions'), '')
    ));
    checkout_lines := checkout_lines || jsonb_build_array(jsonb_build_object(
      'name', selected_item.name,
      'unit_amount', round(selected_item.price * 100)::bigint,
      'quantity', item_quantity
    ));
  end loop;

  if calculated_subtotal < selected_truck.minimum_order then
    raise exception 'The order does not meet the food truck minimum';
  end if;

  calculated_tax := round(calculated_subtotal * selected_truck.tax_rate, 2);
  calculated_total := calculated_subtotal + calculated_tax;
  if calculated_tax > 0 then
    checkout_lines := checkout_lines || jsonb_build_array(jsonb_build_object(
      'name', 'Sales tax',
      'unit_amount', round(calculated_tax * 100)::bigint,
      'quantity', 1
    ));
  end if;

  insert into public.payment_checkout_drafts (
    customer_id, truck_id, stripe_account_id, items,
    customer_name, customer_mobile, customer_email, order_notes,
    subtotal_cents, tax_cents, service_fee_cents, total_cents
  ) values (
    auth.uid(), selected_truck.id, connected_account.stripe_account_id, snapshot_items,
    btrim(p_customer_name), nullif(btrim(p_customer_mobile), ''),
    nullif(btrim(p_customer_email), ''), nullif(btrim(p_order_notes), ''),
    round(calculated_subtotal * 100)::bigint,
    round(calculated_tax * 100)::bigint,
    0,
    round(calculated_total * 100)::bigint
  ) returning * into created_draft;

  return query select
    created_draft.id,
    created_draft.stripe_account_id,
    selected_truck.name,
    created_draft.currency,
    created_draft.subtotal_cents,
    created_draft.tax_cents,
    created_draft.service_fee_cents,
    created_draft.total_cents,
    checkout_lines,
    created_draft.expires_at;
end;
$$;

create or replace function public.finalize_paid_checkout(
  p_draft_id uuid,
  p_checkout_session_id text,
  p_payment_intent_id text,
  p_charge_id text,
  p_amount_paid_cents bigint,
  p_payment_label text default 'Stripe Checkout'
)
returns table (
  order_id uuid,
  order_number bigint,
  status public.order_status,
  subtotal numeric,
  tax numeric,
  total numeric
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_draft public.payment_checkout_drafts%rowtype;
  snapshot_item jsonb;
  created_order public.orders%rowtype;
begin
  select * into selected_draft
  from public.payment_checkout_drafts
  where id = p_draft_id
  for update;

  if not found then raise exception 'Checkout draft not found'; end if;
  if selected_draft.order_id is not null then
    return query
    select o.id, o.order_number, o.status, o.subtotal, o.tax, o.total
    from public.orders o where o.id = selected_draft.order_id;
    return;
  end if;
  if selected_draft.stripe_checkout_session_id is distinct from p_checkout_session_id then
    raise exception 'Checkout session does not match this order';
  end if;
  if p_amount_paid_cents <> selected_draft.total_cents then
    raise exception 'The paid amount does not match the order total';
  end if;

  insert into public.orders (
    customer_id, truck_id, customer_name, customer_mobile, customer_email,
    subtotal, tax, service_fee, total, order_notes,
    payment_label, payment_status, stripe_account_id,
    stripe_checkout_session_id, stripe_payment_intent_id, stripe_charge_id,
    amount_paid_cents, payment_completed_at
  ) values (
    selected_draft.customer_id, selected_draft.truck_id, selected_draft.customer_name,
    selected_draft.customer_mobile, selected_draft.customer_email,
    selected_draft.subtotal_cents / 100.0, selected_draft.tax_cents / 100.0,
    selected_draft.service_fee_cents / 100.0, selected_draft.total_cents / 100.0,
    selected_draft.order_notes, nullif(btrim(p_payment_label), ''), 'paid',
    selected_draft.stripe_account_id, p_checkout_session_id,
    nullif(p_payment_intent_id, ''), nullif(p_charge_id, ''),
    p_amount_paid_cents, now()
  ) returning * into created_order;

  for snapshot_item in select value from jsonb_array_elements(selected_draft.items)
  loop
    insert into public.order_items (
      order_id, menu_item_id, item_name, unit_price, quantity, modifiers, special_instructions
    ) values (
      created_order.id,
      nullif(snapshot_item ->> 'menu_item_id', '')::uuid,
      snapshot_item ->> 'item_name',
      (snapshot_item ->> 'unit_amount')::numeric / 100.0,
      (snapshot_item ->> 'quantity')::integer,
      coalesce(snapshot_item -> 'modifiers', '[]'::jsonb),
      nullif(snapshot_item ->> 'special_instructions', '')
    );
  end loop;

  update public.payment_checkout_drafts
  set status = 'completed', order_id = created_order.id
  where id = selected_draft.id;

  return query select
    created_order.id, created_order.order_number, created_order.status,
    created_order.subtotal, created_order.tax, created_order.total;
end;
$$;

revoke all on function public.create_payment_checkout_draft(uuid, jsonb, text, text, text, text) from public, anon;
grant execute on function public.create_payment_checkout_draft(uuid, jsonb, text, text, text, text) to authenticated;
revoke all on function public.finalize_paid_checkout(uuid, text, text, text, bigint, text) from public, anon, authenticated;
grant execute on function public.finalize_paid_checkout(uuid, text, text, text, bigint, text) to service_role;

commit;
