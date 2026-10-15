-- Per-item option labels, editable legacy condiments, and vendor order archiving.

begin;

alter table public.menu_items
  add column if not exists add_on_label text not null default 'Add-ons';

alter table public.orders
  add column if not exists vendor_archived_at timestamptz;

update public.menu_items
set add_on_label = 'Choose Condiments',
    add_ons = '[{"name":"Ketchup","price":0},{"name":"Yellow Mustard","price":0},{"name":"Brown Mustard","price":0},{"name":"Mayonnaise","price":0},{"name":"Pickles","price":0},{"name":"Onions","price":0},{"name":"Relish","price":0},{"name":"Salt","price":0},{"name":"Pepper","price":0}]'::jsonb
where lower(name) ~ '\mhot[[:space:]]*dogs?\M'
  and add_ons = '[]'::jsonb;

update public.menu_items
set add_on_label = 'Choose Condiments',
    add_ons = '[{"name":"Ketchup","price":0},{"name":"Yellow Mustard","price":0},{"name":"Brown Mustard","price":0},{"name":"Mayonnaise","price":0},{"name":"Pickles","price":0},{"name":"Onions","price":0},{"name":"Relish","price":0},{"name":"Salt","price":0},{"name":"Pepper","price":0},{"name":"No Cheese","price":0}]'::jsonb
where lower(name) ~ '\mcheese[[:space:]]*burgers?\M'
  and add_ons = '[]'::jsonb;

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
        select value into configured_option from jsonb_array_elements(selected_item.size_options)
        where lower(btrim(value ->> 'name')) = lower(btrim(modifier_payload ->> 'name')) limit 1;
        if configured_option is null then raise exception 'Select a valid size for %', selected_item.name; end if;
        calculated_price := (configured_option ->> 'price')::numeric;
        selected_size_count := selected_size_count + 1;
      end if;
    end loop;
    if selected_size_count <> 1 then raise exception 'Select one size for %', selected_item.name; end if;
  end if;

  for modifier_payload in select value from jsonb_array_elements(p_modifiers)
  loop
    if modifier_payload ->> 'group' = selected_item.add_on_label
       or (modifier_payload ->> 'group' = 'Add-ons' and selected_item.add_on_label <> 'Choose a Size') then
      configured_option := null;
      select value into configured_option from jsonb_array_elements(selected_item.add_ons)
      where lower(btrim(value ->> 'name')) = lower(btrim(modifier_payload ->> 'name')) limit 1;
      if configured_option is null then raise exception 'Select a valid option for %', selected_item.name; end if;
      calculated_price := calculated_price + (configured_option ->> 'price')::numeric;
    end if;
  end loop;
  return round(calculated_price, 2);
end;
$$;

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
      is_featured, is_sold_out, is_active, sort_order, size_options, add_ons, add_on_label
    ) values (
      p_truck_id, selected_category_id, btrim(item_payload ->> 'client_key'), btrim(item_payload ->> 'name'),
      nullif(btrim(item_payload ->> 'description'), ''), (item_payload ->> 'price')::numeric,
      nullif(item_payload ->> 'photo_url', ''), coalesce((item_payload ->> 'is_featured')::boolean, false),
      coalesce((item_payload ->> 'is_sold_out')::boolean, false), true,
      coalesce((item_payload ->> 'sort_order')::integer, 0),
      case when jsonb_typeof(item_payload -> 'size_options') = 'array' then item_payload -> 'size_options' else '[]'::jsonb end,
      case when jsonb_typeof(item_payload -> 'add_ons') = 'array' then item_payload -> 'add_ons' else '[]'::jsonb end,
      coalesce(nullif(btrim(item_payload ->> 'add_on_label'), ''), 'Add-ons')
    )
    on conflict (truck_id, client_key) do update set
      category_id = excluded.category_id, name = excluded.name, description = excluded.description,
      price = excluded.price, photo_url = excluded.photo_url, is_featured = excluded.is_featured,
      is_sold_out = excluded.is_sold_out, is_active = true, sort_order = excluded.sort_order,
      size_options = excluded.size_options, add_ons = excluded.add_ons, add_on_label = excluded.add_on_label;
  end loop;

  delete from public.menu_items where truck_id = p_truck_id and not (client_key = any (array(select value ->> 'client_key' from jsonb_array_elements(p_items))));
  delete from public.menu_categories where truck_id = p_truck_id and not (name = any (array(select value ->> 'name' from jsonb_array_elements(p_categories))));
end;
$$;

create or replace function public.set_vendor_order_archived(p_order_id uuid, p_archived boolean)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_order public.orders%rowtype;
begin
  select * into selected_order from public.orders where id = p_order_id for update;
  if not found or not public.owns_truck(selected_order.truck_id) then raise exception 'Vendor access is required'; end if;
  if p_archived and selected_order.status::text not in ('picked_up', 'cancelled') then
    raise exception 'Only picked-up or cancelled orders can be archived';
  end if;
  update public.orders set vendor_archived_at = case when p_archived then now() else null end
  where id = p_order_id returning vendor_archived_at into selected_order.vendor_archived_at;
  return selected_order.vendor_archived_at;
end;
$$;

create index if not exists orders_vendor_archive_idx
  on public.orders (truck_id, vendor_archived_at, created_at desc);

revoke all on function public.menu_item_unit_price(uuid, jsonb) from public, anon;
grant execute on function public.menu_item_unit_price(uuid, jsonb) to authenticated, service_role;
revoke all on function public.sync_vendor_menu(uuid, jsonb, jsonb) from public, anon;
grant execute on function public.sync_vendor_menu(uuid, jsonb, jsonb) to authenticated;
revoke all on function public.set_vendor_order_archived(uuid, boolean) from public, anon;
grant execute on function public.set_vendor_order_archived(uuid, boolean) to authenticated;

commit;

