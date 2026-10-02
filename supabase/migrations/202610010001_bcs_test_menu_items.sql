-- Add the requested BCS Food Truck test menu items without duplicating them.

begin;

do $$
declare
  target_truck_id uuid;
  sides_category_id uuid;
  drinks_category_id uuid;
  next_category_order integer;
  next_item_order integer;
begin
  select id into target_truck_id
  from public.trucks
  where lower(name) = lower('BCS Food Truck')
  order by created_at
  limit 1;

  if target_truck_id is null then
    raise exception 'BCS Food Truck was not found';
  end if;

  select coalesce(max(sort_order), 0) into next_category_order
  from public.menu_categories
  where truck_id = target_truck_id;

  insert into public.menu_categories (truck_id, name, sort_order, is_active)
  values (target_truck_id, 'Sides', next_category_order + 1, true)
  on conflict (truck_id, name) do update set is_active = true
  returning id into sides_category_id;

  insert into public.menu_categories (truck_id, name, sort_order, is_active)
  values (target_truck_id, 'Drinks', next_category_order + 2, true)
  on conflict (truck_id, name) do update set is_active = true
  returning id into drinks_category_id;

  select coalesce(max(sort_order), 0) into next_item_order
  from public.menu_items
  where truck_id = target_truck_id;

  insert into public.menu_items (
    truck_id, category_id, client_key, name, description, price, photo_url,
    is_featured, is_sold_out, is_active, sort_order
  ) values
    (target_truck_id, sides_category_id, '91001', 'French Fries', 'Crispy golden french fries.', 6.00, 'assets/menu/french-fries.jpg', false, false, true, next_item_order + 1),
    (target_truck_id, drinks_category_id, '91002', 'Water', 'Chilled bottled purified water.', 2.00, 'assets/menu/water.jpg', false, false, true, next_item_order + 2),
    (target_truck_id, drinks_category_id, '91003', 'Coke', 'Chilled Coca-Cola.', 3.75, 'assets/menu/coke.jpg', false, false, true, next_item_order + 3)
  on conflict (truck_id, client_key) do update set
    category_id = excluded.category_id,
    name = excluded.name,
    description = excluded.description,
    price = excluded.price,
    photo_url = excluded.photo_url,
    is_sold_out = false,
    is_active = true;
end;
$$;

commit;
