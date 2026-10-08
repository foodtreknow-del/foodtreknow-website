-- Add the requested BCS Food Truck Dessert/Snacks category and place Pound Cake in it.

begin;

do $$
declare
  target_truck_id uuid;
  dessert_snacks_category_id uuid;
  next_category_order integer;
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
  values (target_truck_id, 'Dessert/Snacks', next_category_order + 1, true)
  on conflict (truck_id, name) do update set is_active = true
  returning id into dessert_snacks_category_id;

  update public.menu_items
  set category_id = dessert_snacks_category_id
  where truck_id = target_truck_id
    and lower(btrim(name)) = lower('Pound Cake');
end;
$$;

commit;
