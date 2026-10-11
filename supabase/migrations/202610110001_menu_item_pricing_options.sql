-- Vendor-defined size prices and paid add-ons for every menu item.

begin;

alter table public.menu_items
  add column if not exists size_options jsonb not null default '[]'::jsonb,
  add column if not exists add_ons jsonb not null default '[]'::jsonb;

create or replace function public.menu_item_unit_price(
  p_menu_item_id uuid,
  p_modifiers jsonb default '[]'::jsonb
)
returns numeric
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  selected_item public.menu_items%rowtype;
  modifier_payload jsonb;
  configured_option jsonb;
  calculated_price numeric(10, 2);
  selected_size_count integer := 0;
begin
  select * into selected_item from public.menu_items where id = p_menu_item_id;
  if not found then raise exception 'A selected menu item is unavailable'; end if;

  calculated_price := selected_item.price;
  if jsonb_typeof(p_modifiers) <> 'array' then p_modifiers := '[]'::jsonb; end if;

  if jsonb_array_length(selected_item.size_options) > 0 then
    for modifier_payload in select value from jsonb_array_elements(p_modifiers)
    loop
      if modifier_payload ->> 'group' = 'Choose a Size' then
        select value into configured_option
        from jsonb_array_elements(selected_item.size_options)
        where lower(btrim(value ->> 'name')) = lower(btrim(modifier_payload ->> 'name'))
        limit 1;
        if configured_option is null then raise exception 'Select a valid size for %', selected_item.name; end if;
        calculated_price := (configured_option ->> 'price')::numeric;
        selected_size_count := selected_size_count + 1;
      end if;
    end loop;
    if selected_size_count <> 1 then raise exception 'Select one size for %', selected_item.name; end if;
  end if;

  for modifier_payload in select value from jsonb_array_elements(p_modifiers)
  loop
    if modifier_payload ->> 'group' = 'Add-ons' then
      configured_option := null;
      select value into configured_option
      from jsonb_array_elements(selected_item.add_ons)
      where lower(btrim(value ->> 'name')) = lower(btrim(modifier_payload ->> 'name'))
      limit 1;
      if configured_option is null then raise exception 'Select a valid add-on for %', selected_item.name; end if;
      calculated_price := calculated_price + (configured_option ->> 'price')::numeric;
    end if;
  end loop;

  return round(calculated_price, 2);
end;
$$;

revoke all on function public.menu_item_unit_price(uuid, jsonb) from public, anon;
grant execute on function public.menu_item_unit_price(uuid, jsonb) to authenticated, service_role;

create or replace function public.sync_vendor_menu(
  p_truck_id uuid,
  p_categories jsonb,
  p_items jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  category_payload jsonb;
  item_payload jsonb;
  selected_category_id uuid;
begin
  if not public.owns_truck(p_truck_id) then raise exception 'Vendor access is required'; end if;
  if jsonb_typeof(p_categories) <> 'array' or jsonb_typeof(p_items) <> 'array' then raise exception 'Menu categories and items must be arrays'; end if;

  for category_payload in select value from jsonb_array_elements(p_categories)
  loop
    if btrim(category_payload ->> 'name') = '' then raise exception 'Category name is required'; end if;
    insert into public.menu_categories (truck_id, name, sort_order, is_active)
    values (p_truck_id, btrim(category_payload ->> 'name'), coalesce((category_payload ->> 'sort_order')::integer, 0), true)
    on conflict (truck_id, name) do update set sort_order = excluded.sort_order, is_active = true;
  end loop;

  for item_payload in select value from jsonb_array_elements(p_items)
  loop
    select id into selected_category_id from public.menu_categories where truck_id = p_truck_id and name = btrim(item_payload ->> 'category');
    insert into public.menu_items (
      truck_id, category_id, client_key, name, description, price, photo_url,
      is_featured, is_sold_out, is_active, sort_order, size_options, add_ons
    ) values (
      p_truck_id, selected_category_id, btrim(item_payload ->> 'client_key'), btrim(item_payload ->> 'name'),
      nullif(btrim(item_payload ->> 'description'), ''), (item_payload ->> 'price')::numeric,
      nullif(item_payload ->> 'photo_url', ''), coalesce((item_payload ->> 'is_featured')::boolean, false),
      coalesce((item_payload ->> 'is_sold_out')::boolean, false), true,
      coalesce((item_payload ->> 'sort_order')::integer, 0),
      case when jsonb_typeof(item_payload -> 'size_options') = 'array' then item_payload -> 'size_options' else '[]'::jsonb end,
      case when jsonb_typeof(item_payload -> 'add_ons') = 'array' then item_payload -> 'add_ons' else '[]'::jsonb end
    )
    on conflict (truck_id, client_key) do update set
      category_id = excluded.category_id, name = excluded.name, description = excluded.description,
      price = excluded.price, photo_url = excluded.photo_url, is_featured = excluded.is_featured,
      is_sold_out = excluded.is_sold_out, is_active = true, sort_order = excluded.sort_order,
      size_options = excluded.size_options, add_ons = excluded.add_ons;
  end loop;

  delete from public.menu_items where truck_id = p_truck_id and not (client_key = any (array(select value ->> 'client_key' from jsonb_array_elements(p_items))));
  delete from public.menu_categories where truck_id = p_truck_id and not (name = any (array(select value ->> 'name' from jsonb_array_elements(p_categories))));
end;
$$;

revoke all on function public.sync_vendor_menu(uuid, jsonb, jsonb) from public, anon;
grant execute on function public.sync_vendor_menu(uuid, jsonb, jsonb) to authenticated;

create or replace function public.place_order(
  p_truck_id uuid, p_items jsonb, p_customer_name text,
  p_customer_mobile text default null, p_customer_email text default null,
  p_order_notes text default null, p_payment_label text default null
)
returns table (order_id uuid, order_number bigint, status public.order_status, subtotal numeric, tax numeric, total numeric)
language plpgsql security definer set search_path = ''
as $$
declare
  selected_truck public.trucks%rowtype;
  item_payload jsonb;
  selected_item public.menu_items%rowtype;
  item_quantity integer;
  item_unit_price numeric(10, 2);
  calculated_subtotal numeric(10, 2) := 0;
  calculated_tax numeric(10, 2) := 0;
  calculated_total numeric(10, 2) := 0;
  created_order public.orders%rowtype;
begin
  if auth.uid() is null then raise exception 'Authentication is required to place an order'; end if;
  if p_customer_name is null or btrim(p_customer_name) = '' then raise exception 'Customer name is required'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then raise exception 'At least one menu item is required'; end if;
  select * into selected_truck from public.trucks where id = p_truck_id for update;
  if not found or not selected_truck.is_active or not selected_truck.accepting_orders then raise exception 'This food truck is not accepting orders'; end if;

  for item_payload in select value from jsonb_array_elements(p_items)
  loop
    item_quantity := (item_payload ->> 'quantity')::integer;
    if item_quantity < 1 or item_quantity > 99 then raise exception 'Item quantity must be between 1 and 99'; end if;
    select * into selected_item from public.menu_items where id = (item_payload ->> 'menu_item_id')::uuid and truck_id = p_truck_id and is_active and not is_sold_out for update;
    if not found then raise exception 'A selected menu item is unavailable'; end if;
    item_unit_price := public.menu_item_unit_price(selected_item.id, coalesce(item_payload -> 'modifiers', '[]'::jsonb));
    calculated_subtotal := calculated_subtotal + round(item_unit_price * item_quantity, 2);
  end loop;

  if calculated_subtotal < selected_truck.minimum_order then raise exception 'The order does not meet the food truck minimum'; end if;
  calculated_tax := round(calculated_subtotal * selected_truck.tax_rate, 2);
  calculated_total := calculated_subtotal + calculated_tax;
  insert into public.orders (customer_id, truck_id, customer_name, customer_mobile, customer_email, subtotal, tax, total, order_notes, payment_label)
  values (auth.uid(), p_truck_id, btrim(p_customer_name), nullif(btrim(p_customer_mobile), ''), nullif(btrim(p_customer_email), ''), calculated_subtotal, calculated_tax, calculated_total, nullif(btrim(p_order_notes), ''), nullif(btrim(p_payment_label), ''))
  returning * into created_order;

  for item_payload in select value from jsonb_array_elements(p_items)
  loop
    item_quantity := (item_payload ->> 'quantity')::integer;
    select * into selected_item from public.menu_items where id = (item_payload ->> 'menu_item_id')::uuid and truck_id = p_truck_id;
    item_unit_price := public.menu_item_unit_price(selected_item.id, coalesce(item_payload -> 'modifiers', '[]'::jsonb));
    insert into public.order_items (order_id, menu_item_id, item_name, unit_price, quantity, modifiers, special_instructions)
    values (created_order.id, selected_item.id, selected_item.name, item_unit_price, item_quantity, coalesce(item_payload -> 'modifiers', '[]'::jsonb), nullif(btrim(item_payload ->> 'special_instructions'), ''));
  end loop;
  return query select created_order.id, created_order.order_number, created_order.status, created_order.subtotal, created_order.tax, created_order.total;
end;
$$;

revoke all on function public.place_order(uuid, jsonb, text, text, text, text, text) from public, anon;
grant execute on function public.place_order(uuid, jsonb, text, text, text, text, text) to authenticated;

create or replace function public.create_payment_checkout_draft(
  p_truck_id uuid, p_items jsonb, p_customer_name text,
  p_customer_mobile text default null, p_customer_email text default null, p_order_notes text default null
)
returns table (draft_id uuid, stripe_account_id text, truck_name text, currency text, subtotal_cents bigint, tax_cents bigint, service_fee_cents bigint, total_cents bigint, line_items jsonb, expires_at timestamptz)
language plpgsql security definer set search_path = ''
as $$
declare
  selected_truck public.trucks%rowtype;
  connected_account public.stripe_connect_accounts%rowtype;
  item_payload jsonb;
  selected_item public.menu_items%rowtype;
  item_quantity integer;
  item_unit_price numeric(10, 2);
  calculated_subtotal numeric(10, 2) := 0;
  calculated_tax numeric(10, 2) := 0;
  calculated_total numeric(10, 2) := 0;
  snapshot_items jsonb := '[]'::jsonb;
  checkout_lines jsonb := '[]'::jsonb;
  created_draft public.payment_checkout_drafts%rowtype;
begin
  if auth.uid() is null then raise exception 'Sign in to pay online'; end if;
  if p_customer_name is null or btrim(p_customer_name) = '' then raise exception 'Customer name is required'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then raise exception 'At least one menu item is required'; end if;
  select * into selected_truck from public.trucks where id = p_truck_id for share;
  if not found or not selected_truck.is_active or not selected_truck.accepting_orders then raise exception 'This food truck is not accepting orders'; end if;
  select account.* into connected_account from public.stripe_connect_accounts account where account.vendor_profile_id = selected_truck.vendor_id and account.status = 'active' and account.charges_enabled and account.payouts_enabled;
  if not found then raise exception 'This food truck is not ready to accept online payments'; end if;

  for item_payload in select value from jsonb_array_elements(p_items)
  loop
    begin item_quantity := (item_payload ->> 'quantity')::integer; exception when others then raise exception 'Every item needs a valid quantity'; end;
    if item_quantity < 1 or item_quantity > 99 then raise exception 'Item quantity must be between 1 and 99'; end if;
    select * into selected_item from public.menu_items where id = (item_payload ->> 'menu_item_id')::uuid and truck_id = p_truck_id and is_active and not is_sold_out for share;
    if not found then raise exception 'A selected menu item is unavailable'; end if;
    item_unit_price := public.menu_item_unit_price(selected_item.id, coalesce(item_payload -> 'modifiers', '[]'::jsonb));
    calculated_subtotal := calculated_subtotal + round(item_unit_price * item_quantity, 2);
    snapshot_items := snapshot_items || jsonb_build_array(jsonb_build_object('menu_item_id', selected_item.id, 'item_name', selected_item.name, 'unit_amount', round(item_unit_price * 100)::bigint, 'quantity', item_quantity, 'modifiers', coalesce(item_payload -> 'modifiers', '[]'::jsonb), 'special_instructions', nullif(btrim(item_payload ->> 'special_instructions'), '')));
    checkout_lines := checkout_lines || jsonb_build_array(jsonb_build_object('name', selected_item.name, 'unit_amount', round(item_unit_price * 100)::bigint, 'quantity', item_quantity));
  end loop;

  if calculated_subtotal < selected_truck.minimum_order then raise exception 'The order does not meet the food truck minimum'; end if;
  calculated_tax := round(calculated_subtotal * selected_truck.tax_rate, 2);
  calculated_total := calculated_subtotal + calculated_tax;
  if calculated_tax > 0 then checkout_lines := checkout_lines || jsonb_build_array(jsonb_build_object('name', 'Sales tax', 'unit_amount', round(calculated_tax * 100)::bigint, 'quantity', 1)); end if;
  insert into public.payment_checkout_drafts (customer_id, truck_id, stripe_account_id, items, customer_name, customer_mobile, customer_email, order_notes, subtotal_cents, tax_cents, service_fee_cents, total_cents)
  values (auth.uid(), selected_truck.id, connected_account.stripe_account_id, snapshot_items, btrim(p_customer_name), nullif(btrim(p_customer_mobile), ''), nullif(btrim(p_customer_email), ''), nullif(btrim(p_order_notes), ''), round(calculated_subtotal * 100)::bigint, round(calculated_tax * 100)::bigint, 0, round(calculated_total * 100)::bigint)
  returning * into created_draft;
  return query select created_draft.id, created_draft.stripe_account_id, selected_truck.name, created_draft.currency, created_draft.subtotal_cents, created_draft.tax_cents, created_draft.service_fee_cents, created_draft.total_cents, checkout_lines, created_draft.expires_at;
end;
$$;

revoke all on function public.create_payment_checkout_draft(uuid, jsonb, text, text, text, text) from public, anon;
grant execute on function public.create_payment_checkout_draft(uuid, jsonb, text, text, text, text) to authenticated;

commit;
