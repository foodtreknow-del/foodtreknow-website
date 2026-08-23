-- FoodTrekNow Phase 4: stable vendor menu synchronization across devices.

begin;

alter table public.menu_items add column if not exists client_key text;
update public.menu_items set client_key = id::text where client_key is null;
alter table public.menu_items alter column client_key set not null;
create unique index if not exists idx_menu_items_truck_client_key
  on public.menu_items(truck_id, client_key);

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
  if jsonb_typeof(p_categories) <> 'array' or jsonb_typeof(p_items) <> 'array' then
    raise exception 'Menu categories and items must be arrays';
  end if;

  for category_payload in select value from jsonb_array_elements(p_categories)
  loop
    if btrim(category_payload ->> 'name') = '' then raise exception 'Category name is required'; end if;
    insert into public.menu_categories (truck_id, name, sort_order, is_active)
    values (
      p_truck_id,
      btrim(category_payload ->> 'name'),
      coalesce((category_payload ->> 'sort_order')::integer, 0),
      true
    )
    on conflict (truck_id, name) do update set
      sort_order = excluded.sort_order,
      is_active = true;
  end loop;

  for item_payload in select value from jsonb_array_elements(p_items)
  loop
    select id into selected_category_id
    from public.menu_categories
    where truck_id = p_truck_id and name = btrim(item_payload ->> 'category');

    insert into public.menu_items (
      truck_id, category_id, client_key, name, description, price,
      photo_url, is_featured, is_sold_out, is_active, sort_order
    ) values (
      p_truck_id,
      selected_category_id,
      btrim(item_payload ->> 'client_key'),
      btrim(item_payload ->> 'name'),
      nullif(btrim(item_payload ->> 'description'), ''),
      (item_payload ->> 'price')::numeric,
      nullif(item_payload ->> 'photo_url', ''),
      coalesce((item_payload ->> 'is_featured')::boolean, false),
      coalesce((item_payload ->> 'is_sold_out')::boolean, false),
      true,
      coalesce((item_payload ->> 'sort_order')::integer, 0)
    )
    on conflict (truck_id, client_key) do update set
      category_id = excluded.category_id,
      name = excluded.name,
      description = excluded.description,
      price = excluded.price,
      photo_url = excluded.photo_url,
      is_featured = excluded.is_featured,
      is_sold_out = excluded.is_sold_out,
      is_active = true,
      sort_order = excluded.sort_order;
  end loop;

  delete from public.menu_items
  where truck_id = p_truck_id
    and not (client_key = any (
      array(select value ->> 'client_key' from jsonb_array_elements(p_items))
    ));

  delete from public.menu_categories
  where truck_id = p_truck_id
    and not (name = any (
      array(select value ->> 'name' from jsonb_array_elements(p_categories))
    ));
end;
$$;

revoke all on function public.sync_vendor_menu(uuid, jsonb, jsonb) from public, anon;
grant execute on function public.sync_vendor_menu(uuid, jsonb, jsonb) to authenticated;

commit;
