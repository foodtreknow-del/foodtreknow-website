-- FoodTrekNow paid-order cancellation, Stripe refunds, and vendor-specific credits.
-- Credits belong to one customer and one food truck and cannot be transferred.

begin;

alter table public.orders drop constraint if exists orders_payment_status_check;
alter table public.orders add constraint orders_payment_status_check check (
  payment_status in ('unpaid', 'authorized', 'paid', 'refund_pending', 'refunded', 'credited', 'partially_refunded')
);

alter table public.orders
  add column if not exists vendor_credit_applied_cents bigint not null default 0 check (vendor_credit_applied_cents >= 0),
  add column if not exists stripe_refund_id text,
  add column if not exists refunded_amount_cents bigint not null default 0 check (refunded_amount_cents >= 0),
  add column if not exists refund_status text not null default 'none' check (refund_status in ('none', 'pending', 'succeeded', 'failed')),
  add column if not exists cancellation_resolution text check (cancellation_resolution in ('original_payment', 'vendor_credit')),
  add column if not exists refund_failure_message text;

alter table public.payment_checkout_drafts
  add column if not exists vendor_credit_applied_cents bigint not null default 0 check (vendor_credit_applied_cents >= 0),
  add column if not exists stripe_due_cents bigint not null default 0 check (stripe_due_cents >= 0);

update public.payment_checkout_drafts
set stripe_due_cents = total_cents
where stripe_due_cents = 0 and vendor_credit_applied_cents = 0;

create table if not exists public.vendor_credit_accounts (
  customer_id uuid not null references public.profiles(id) on delete cascade,
  truck_id uuid not null references public.trucks(id) on delete cascade,
  balance_cents bigint not null default 0 check (balance_cents >= 0),
  lifetime_issued_cents bigint not null default 0 check (lifetime_issued_cents >= 0),
  lifetime_redeemed_cents bigint not null default 0 check (lifetime_redeemed_cents >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (customer_id, truck_id)
);

create table if not exists public.vendor_credit_transactions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) on delete cascade,
  truck_id uuid not null references public.trucks(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  checkout_draft_id uuid references public.payment_checkout_drafts(id) on delete set null,
  transaction_type text not null check (transaction_type in ('issued', 'reserved', 'redeemed', 'released')),
  amount_cents bigint not null check (amount_cents <> 0),
  description text not null,
  idempotency_key text not null unique,
  created_at timestamptz not null default now()
);

drop trigger if exists set_vendor_credit_accounts_updated_at on public.vendor_credit_accounts;
create trigger set_vendor_credit_accounts_updated_at before update on public.vendor_credit_accounts
for each row execute function public.set_updated_at();

alter table public.vendor_credit_accounts enable row level security;
alter table public.vendor_credit_transactions enable row level security;

drop policy if exists vendor_credit_accounts_participant_read on public.vendor_credit_accounts;
create policy vendor_credit_accounts_participant_read on public.vendor_credit_accounts for select
using (customer_id = auth.uid() or public.owns_truck(truck_id));
drop policy if exists vendor_credit_transactions_participant_read on public.vendor_credit_transactions;
create policy vendor_credit_transactions_participant_read on public.vendor_credit_transactions for select
using (customer_id = auth.uid() or public.owns_truck(truck_id));

revoke all on public.vendor_credit_accounts, public.vendor_credit_transactions from public, anon, authenticated;
grant select on public.vendor_credit_accounts, public.vendor_credit_transactions to authenticated;
grant select, insert, update on public.vendor_credit_accounts, public.vendor_credit_transactions to service_role;

create or replace function public.create_payment_checkout_draft_with_credit(
  p_truck_id uuid,
  p_items jsonb,
  p_customer_name text,
  p_customer_mobile text default null,
  p_customer_email text default null,
  p_order_notes text default null,
  p_use_vendor_credit boolean default true
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
  vendor_credit_applied_cents bigint,
  stripe_due_cents bigint,
  line_items jsonb,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  base_draft record;
  credit_account public.vendor_credit_accounts%rowtype;
  applied_credit bigint := 0;
  due_to_stripe bigint;
  adjusted_lines jsonb;
begin
  select * into base_draft from public.create_payment_checkout_draft(
    p_truck_id, p_items, p_customer_name, p_customer_mobile, p_customer_email, p_order_notes
  );
  due_to_stripe := base_draft.total_cents;
  adjusted_lines := base_draft.line_items;

  if coalesce(p_use_vendor_credit, true) then
    select * into credit_account from public.vendor_credit_accounts
    where customer_id = auth.uid() and truck_id = p_truck_id
    for update;
    if found and credit_account.balance_cents > 0 then
      applied_credit := least(credit_account.balance_cents, base_draft.total_cents);
      due_to_stripe := base_draft.total_cents - applied_credit;
      if due_to_stripe between 1 and 49 then
        applied_credit := greatest(0, applied_credit - (50 - due_to_stripe));
        due_to_stripe := base_draft.total_cents - applied_credit;
      end if;
      if applied_credit > 0 then
        update public.vendor_credit_accounts
        set balance_cents = balance_cents - applied_credit
        where customer_id = auth.uid() and truck_id = p_truck_id;
        insert into public.vendor_credit_transactions (
          customer_id, truck_id, checkout_draft_id, transaction_type,
          amount_cents, description, idempotency_key
        ) values (
          auth.uid(), p_truck_id, base_draft.draft_id, 'reserved',
          -applied_credit, 'Reserved for checkout', 'checkout-reserve:' || base_draft.draft_id::text
        );
      end if;
    end if;
  end if;

  if applied_credit > 0 and due_to_stripe > 0 then
    adjusted_lines := jsonb_build_array(jsonb_build_object(
      'name', base_draft.truck_name || ' order after food truck credit',
      'unit_amount', due_to_stripe,
      'quantity', 1
    ));
  elsif due_to_stripe = 0 then
    adjusted_lines := '[]'::jsonb;
  end if;

  update public.payment_checkout_drafts set
    vendor_credit_applied_cents = applied_credit,
    stripe_due_cents = due_to_stripe
  where id = base_draft.draft_id;

  return query select base_draft.draft_id, base_draft.stripe_account_id,
    base_draft.truck_name, base_draft.currency, base_draft.subtotal_cents,
    base_draft.tax_cents, base_draft.service_fee_cents, base_draft.total_cents,
    applied_credit, due_to_stripe, adjusted_lines, base_draft.expires_at;
end;
$$;

create or replace function public.release_checkout_credit(p_draft_id uuid)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare selected_draft public.payment_checkout_drafts%rowtype;
begin
  select * into selected_draft from public.payment_checkout_drafts where id = p_draft_id for update;
  if not found or selected_draft.vendor_credit_applied_cents = 0 or selected_draft.order_id is not null then return 0; end if;
  if not exists (select 1 from public.vendor_credit_transactions where idempotency_key = 'checkout-release:' || p_draft_id::text) then
    insert into public.vendor_credit_accounts (customer_id, truck_id, balance_cents)
    values (selected_draft.customer_id, selected_draft.truck_id, selected_draft.vendor_credit_applied_cents)
    on conflict (customer_id, truck_id) do update set balance_cents = public.vendor_credit_accounts.balance_cents + excluded.balance_cents;
    insert into public.vendor_credit_transactions (
      customer_id, truck_id, checkout_draft_id, transaction_type, amount_cents, description, idempotency_key
    ) values (
      selected_draft.customer_id, selected_draft.truck_id, p_draft_id, 'released',
      selected_draft.vendor_credit_applied_cents, 'Released from cancelled or expired checkout',
      'checkout-release:' || p_draft_id::text
    );
  end if;
  update public.payment_checkout_drafts set status = 'cancelled' where id = p_draft_id and order_id is null;
  return selected_draft.vendor_credit_applied_cents;
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
returns table (order_id uuid, order_number bigint, status public.order_status, subtotal numeric, tax numeric, total numeric)
language plpgsql
security definer
set search_path = ''
as $$
declare selected_draft public.payment_checkout_drafts%rowtype; snapshot_item jsonb; created_order public.orders%rowtype;
begin
  select * into selected_draft from public.payment_checkout_drafts where id = p_draft_id for update;
  if not found then raise exception 'Checkout draft not found'; end if;
  if selected_draft.order_id is not null then
    return query select o.id, o.order_number, o.status, o.subtotal, o.tax, o.total from public.orders o where o.id = selected_draft.order_id;
    return;
  end if;
  if selected_draft.stripe_checkout_session_id is distinct from p_checkout_session_id then raise exception 'Checkout session does not match this order'; end if;
  if p_amount_paid_cents <> selected_draft.stripe_due_cents then raise exception 'The paid amount does not match the amount due'; end if;

  insert into public.orders (
    customer_id, truck_id, customer_name, customer_mobile, customer_email,
    subtotal, tax, service_fee, total, order_notes, payment_label, payment_status,
    stripe_account_id, stripe_checkout_session_id, stripe_payment_intent_id, stripe_charge_id,
    amount_paid_cents, vendor_credit_applied_cents, payment_completed_at
  ) values (
    selected_draft.customer_id, selected_draft.truck_id, selected_draft.customer_name,
    selected_draft.customer_mobile, selected_draft.customer_email,
    selected_draft.subtotal_cents / 100.0, selected_draft.tax_cents / 100.0,
    selected_draft.service_fee_cents / 100.0, selected_draft.total_cents / 100.0,
    selected_draft.order_notes,
    case when selected_draft.vendor_credit_applied_cents > 0 and p_amount_paid_cents > 0 then 'Stripe + Food Truck Credit'
         when selected_draft.vendor_credit_applied_cents > 0 then 'Food Truck Credit' else nullif(btrim(p_payment_label), '') end,
    'paid', selected_draft.stripe_account_id, p_checkout_session_id,
    nullif(p_payment_intent_id, ''), nullif(p_charge_id, ''), p_amount_paid_cents,
    selected_draft.vendor_credit_applied_cents, now()
  ) returning * into created_order;

  for snapshot_item in select value from jsonb_array_elements(selected_draft.items) loop
    insert into public.order_items (order_id, menu_item_id, item_name, unit_price, quantity, modifiers, special_instructions)
    values (created_order.id, nullif(snapshot_item ->> 'menu_item_id', '')::uuid,
      snapshot_item ->> 'item_name', (snapshot_item ->> 'unit_amount')::numeric / 100.0,
      (snapshot_item ->> 'quantity')::integer, coalesce(snapshot_item -> 'modifiers', '[]'::jsonb),
      nullif(snapshot_item ->> 'special_instructions', ''));
  end loop;

  update public.vendor_credit_transactions set transaction_type = 'redeemed', order_id = created_order.id,
    description = 'Applied to paid order'
  where checkout_draft_id = selected_draft.id and transaction_type = 'reserved';
  update public.vendor_credit_accounts set lifetime_redeemed_cents = lifetime_redeemed_cents + selected_draft.vendor_credit_applied_cents
  where customer_id = selected_draft.customer_id and truck_id = selected_draft.truck_id and selected_draft.vendor_credit_applied_cents > 0;
  update public.payment_checkout_drafts set status = 'completed', order_id = created_order.id where id = selected_draft.id;
  return query select created_order.id, created_order.order_number, created_order.status, created_order.subtotal, created_order.tax, created_order.total;
end;
$$;

create or replace function public.begin_customer_paid_cancellation(p_order_id uuid, p_resolution text)
returns table (
  order_id uuid, stripe_account_id text, stripe_payment_intent_id text,
  stripe_refund_id text, stripe_refund_cents bigint, restored_credit_cents bigint,
  total_credit_issued_cents bigint, resolution text
)
language plpgsql
security definer
set search_path = ''
as $$
declare selected_order public.orders%rowtype; total_cents bigint; credit_to_issue bigint := 0; credit_to_restore bigint := 0;
begin
  if auth.uid() is null then raise exception 'Sign in to cancel an order'; end if;
  if p_resolution not in ('original_payment', 'vendor_credit') then raise exception 'Choose a refund or food truck credit'; end if;
  select * into selected_order from public.orders where id = p_order_id and customer_id = auth.uid() for update;
  if not found then raise exception 'Order not found'; end if;
  if selected_order.status = 'cancelled' then
    if selected_order.cancellation_resolution is distinct from p_resolution then raise exception 'A different cancellation option was already selected'; end if;
    return query select selected_order.id, selected_order.stripe_account_id, selected_order.stripe_payment_intent_id,
      selected_order.stripe_refund_id, selected_order.amount_paid_cents, selected_order.vendor_credit_applied_cents,
      case when p_resolution = 'vendor_credit' then round(selected_order.total * 100)::bigint else selected_order.vendor_credit_applied_cents end,
      selected_order.cancellation_resolution;
    return;
  end if;
  if selected_order.status <> 'received' then raise exception 'This order is already being prepared and can no longer be cancelled automatically'; end if;
  if selected_order.payment_status <> 'paid' then raise exception 'This paid cancellation service cannot process the order'; end if;
  total_cents := round(selected_order.total * 100)::bigint;
  if p_resolution = 'vendor_credit' then credit_to_issue := total_cents; else credit_to_restore := selected_order.vendor_credit_applied_cents; end if;

  if credit_to_issue + credit_to_restore > 0 then
    insert into public.vendor_credit_accounts (customer_id, truck_id, balance_cents, lifetime_issued_cents)
    values (selected_order.customer_id, selected_order.truck_id, credit_to_issue + credit_to_restore, credit_to_issue + credit_to_restore)
    on conflict (customer_id, truck_id) do update set
      balance_cents = public.vendor_credit_accounts.balance_cents + excluded.balance_cents,
      lifetime_issued_cents = public.vendor_credit_accounts.lifetime_issued_cents + excluded.lifetime_issued_cents;
    insert into public.vendor_credit_transactions (
      customer_id, truck_id, order_id, transaction_type, amount_cents, description, idempotency_key
    ) values (
      selected_order.customer_id, selected_order.truck_id, selected_order.id, 'issued',
      credit_to_issue + credit_to_restore,
      case when p_resolution = 'vendor_credit' then 'Cancelled order converted to food truck credit' else 'Order credit restored during refund' end,
      'order-cancel-credit:' || selected_order.id::text
    ) on conflict (idempotency_key) do nothing;
  end if;

  update public.orders set status = 'cancelled', cancellation_resolution = p_resolution,
    payment_status = case when p_resolution = 'vendor_credit' then 'credited' when amount_paid_cents > 0 then 'refund_pending' else 'refunded' end,
    refund_status = case when p_resolution = 'original_payment' and amount_paid_cents > 0 then 'pending' when p_resolution = 'original_payment' then 'succeeded' else 'none' end,
    cancelled_at = now()
  where id = selected_order.id returning * into selected_order;

  return query select selected_order.id, selected_order.stripe_account_id, selected_order.stripe_payment_intent_id,
    selected_order.stripe_refund_id,
    case when p_resolution = 'original_payment' then selected_order.amount_paid_cents else 0 end,
    credit_to_restore, credit_to_issue + credit_to_restore, p_resolution;
end;
$$;

create or replace function public.complete_order_refund(p_order_id uuid, p_refund_id text, p_refunded_cents bigint, p_succeeded boolean, p_failure text default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.orders set stripe_refund_id = nullif(p_refund_id, ''), refunded_amount_cents = case when p_succeeded then p_refunded_cents else refunded_amount_cents end,
    refund_status = case when p_succeeded then 'succeeded' else 'failed' end,
    payment_status = case when p_succeeded and p_refunded_cents >= amount_paid_cents then 'refunded' when p_succeeded then 'partially_refunded' else 'refund_pending' end,
    refund_failure_message = case when p_succeeded then null else left(p_failure, 500) end
  where id = p_order_id;
end;
$$;

revoke all on function public.create_payment_checkout_draft_with_credit(uuid, jsonb, text, text, text, text, boolean) from public, anon;
grant execute on function public.create_payment_checkout_draft_with_credit(uuid, jsonb, text, text, text, text, boolean) to authenticated;
revoke all on function public.release_checkout_credit(uuid) from public, anon, authenticated;
grant execute on function public.release_checkout_credit(uuid) to service_role;
revoke all on function public.begin_customer_paid_cancellation(uuid, text) from public, anon;
grant execute on function public.begin_customer_paid_cancellation(uuid, text) to authenticated;
revoke all on function public.complete_order_refund(uuid, text, bigint, boolean, text) from public, anon, authenticated;
grant execute on function public.complete_order_refund(uuid, text, bigint, boolean, text) to service_role;

commit;
