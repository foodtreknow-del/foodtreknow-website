-- Keep vendor order screens live and route walk-up cash sales through the
-- normal received -> preparing -> ready -> picked-up workflow.

create or replace function public.place_vendor_cash_sale(
  p_truck_id uuid,
  p_items jsonb,
  p_customer_name text default 'Walk-up Customer',
  p_customer_mobile text default null,
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
  customer_mobile text := nullif(btrim(p_customer_mobile), '');
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
  if customer_mobile is not null
    and length(regexp_replace(customer_mobile, '[^0-9]', '', 'g')) not between 10 and 15 then
    raise exception 'Enter a valid customer cell number or leave it blank';
  end if;

  select * into selected_truck
  from public.trucks
  where id = p_truck_id and is_active
  for update;
  if not found then raise exception 'This food truck is not active'; end if;

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
      and truck_id = p_truck_id and is_active and not is_sold_out
    for update;
    if not found then raise exception 'A selected menu item is unavailable'; end if;
    calculated_subtotal := calculated_subtotal + round(selected_item.price * item_quantity, 2);
  end loop;

  calculated_tax := round(calculated_subtotal * selected_truck.tax_rate, 2);
  calculated_total := calculated_subtotal + calculated_tax;
  tendered := round(coalesce(p_cash_received, calculated_total), 2);
  if tendered < calculated_total then raise exception 'Cash received must cover the sale total'; end if;
  if tendered > 100000 then raise exception 'Cash received is above the supported limit'; end if;

  insert into public.orders (
    customer_id, truck_id, status, customer_name, customer_mobile,
    subtotal, tax, total, order_notes, payment_label, payment_status,
    received_at, order_source, cash_received, cash_change
  ) values (
    null, p_truck_id, 'received',
    coalesce(nullif(btrim(p_customer_name), ''), 'Walk-up Customer'), customer_mobile,
    calculated_subtotal, calculated_tax, calculated_total, nullif(btrim(p_order_notes), ''),
    'Cash (Walk-up)', 'paid', now(), 'walk_up', tendered,
    round(tendered - calculated_total, 2)
  ) returning * into created_order;

  for item_payload in select value from jsonb_array_elements(p_items)
  loop
    item_quantity := (item_payload ->> 'quantity')::integer;
    select * into selected_item
    from public.menu_items
    where id = (item_payload ->> 'menu_item_id')::uuid and truck_id = p_truck_id;
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

revoke all on function public.place_vendor_cash_sale(uuid, jsonb, text, text, text, numeric)
  from public, anon;
grant execute on function public.place_vendor_cash_sale(uuid, jsonb, text, text, text, numeric)
  to authenticated;

