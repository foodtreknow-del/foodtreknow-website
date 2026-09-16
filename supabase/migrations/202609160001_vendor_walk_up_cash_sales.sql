-- FoodTrekNow vendor-entered walk-up cash sales.
-- Prices, tax, vendor ownership, and menu availability are verified on the server.

alter table public.orders
  add column if not exists order_source text not null default 'customer',
  add column if not exists cash_received numeric(10, 2),
  add column if not exists cash_change numeric(10, 2);

alter table public.orders drop constraint if exists orders_order_source_check;
alter table public.orders add constraint orders_order_source_check
  check (order_source in ('customer', 'walk_up'));

alter table public.orders drop constraint if exists orders_cash_received_check;
alter table public.orders add constraint orders_cash_received_check
  check (cash_received is null or cash_received >= 0);

alter table public.orders drop constraint if exists orders_cash_change_check;
alter table public.orders add constraint orders_cash_change_check
  check (cash_change is null or cash_change >= 0);

comment on column public.orders.order_source is
  'customer for customer-submitted orders; walk_up for vendor-entered counter sales.';
comment on column public.orders.cash_received is
  'Cash tendered for a vendor-entered walk-up sale.';
comment on column public.orders.cash_change is
  'Change due for a vendor-entered walk-up sale.';

create index if not exists idx_orders_truck_source_created
  on public.orders (truck_id, order_source, created_at desc);

create or replace function public.place_vendor_cash_sale(
  p_truck_id uuid,
  p_items jsonb,
  p_customer_name text default 'Walk-up Customer',
  p_order_notes text default null,
  p_cash_received numeric default null
)
returns table (
  order_id uuid,
  order_number bigint,
  status public.order_status,
  subtotal numeric,
  tax numeric,
  total numeric,
  cash_received numeric,
  cash_change numeric
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_truck public.trucks%rowtype;
  selected_item public.menu_items%rowtype;
  created_order public.orders%rowtype;
  item_payload jsonb;
  item_quantity integer;
  calculated_subtotal numeric(10, 2) := 0;
  calculated_tax numeric(10, 2) := 0;
  calculated_total numeric(10, 2) := 0;
  tendered numeric(10, 2);
begin
  if auth.uid() is null then
    raise exception 'Sign in with an approved vendor account to record a cash sale';
  end if;
  if not public.owns_truck(p_truck_id) then
    raise exception 'Only this food truck owner can record its walk-up sales';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Select at least one menu item';
  end if;

  select * into selected_truck
  from public.trucks
  where id = p_truck_id and is_active
  for update;
  if not found then
    raise exception 'This food truck is not active';
  end if;

  for item_payload in select value from jsonb_array_elements(p_items)
  loop
    begin
      item_quantity := (item_payload ->> 'quantity')::integer;
    exception when others then
      raise exception 'Each item needs a valid quantity';
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
    for update;
    if not found then
      raise exception 'A selected menu item is unavailable';
    end if;
    calculated_subtotal := calculated_subtotal + round(selected_item.price * item_quantity, 2);
  end loop;

  calculated_tax := round(calculated_subtotal * selected_truck.tax_rate, 2);
  calculated_total := calculated_subtotal + calculated_tax;
  tendered := round(coalesce(p_cash_received, calculated_total), 2);
  if tendered < calculated_total then
    raise exception 'Cash received must cover the sale total';
  end if;
  if tendered > 100000 then
    raise exception 'Cash received is above the supported limit';
  end if;

  insert into public.orders (
    customer_id, truck_id, status, customer_name,
    subtotal, tax, total, order_notes,
    payment_label, payment_status,
    received_at, preparing_at, ready_at, picked_up_at,
    order_source, cash_received, cash_change
  ) values (
    null, p_truck_id, 'picked_up',
    coalesce(nullif(btrim(p_customer_name), ''), 'Walk-up Customer'),
    calculated_subtotal, calculated_tax, calculated_total,
    nullif(btrim(p_order_notes), ''),
    'Cash (Walk-up)', 'paid',
    now(), now(), now(), now(),
    'walk_up', tendered, round(tendered - calculated_total, 2)
  ) returning * into created_order;

  for item_payload in select value from jsonb_array_elements(p_items)
  loop
    item_quantity := (item_payload ->> 'quantity')::integer;
    select * into selected_item
    from public.menu_items
    where id = (item_payload ->> 'menu_item_id')::uuid
      and truck_id = p_truck_id;

    insert into public.order_items (
      order_id, menu_item_id, item_name, unit_price,
      quantity, modifiers, special_instructions
    ) values (
      created_order.id, selected_item.id, selected_item.name, selected_item.price,
      item_quantity, '[]'::jsonb, null
    );
  end loop;

  return query select
    created_order.id, created_order.order_number, created_order.status,
    created_order.subtotal, created_order.tax, created_order.total,
    created_order.cash_received, created_order.cash_change;
end;
$$;

revoke all on function public.place_vendor_cash_sale(uuid, jsonb, text, text, numeric)
  from public, anon;
grant execute on function public.place_vendor_cash_sale(uuid, jsonb, text, text, numeric)
  to authenticated;
