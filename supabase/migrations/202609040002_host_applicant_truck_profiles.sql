-- FoodTrekNow Host applicant truck profiles.
-- Gives an event Host a customer-style, read-only view of food trucks that
-- applied to or booked one of the Host's opportunities.

begin;

create or replace function public.get_marketplace_truck_profile(p_truck_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  requester uuid := auth.uid();
  selected_truck public.trucks%rowtype;
  allowed boolean := false;
  hours_json jsonb := '[]'::jsonb;
  categories_json jsonb := '[]'::jsonb;
  items_json jsonb := '[]'::jsonb;
  rating_json jsonb := '{}'::jsonb;
  reviews_json jsonb := '[]'::jsonb;
begin
  if requester is null then
    raise exception 'Sign in as a Host to view a food truck profile';
  end if;

  select * into selected_truck
  from public.trucks
  where id = p_truck_id and is_active = true;

  if not found then
    raise exception 'Food truck profile not found';
  end if;

  allowed := coalesce(public.is_admin(), false)
    or exists (
      select 1
      from public.vendor_profiles v
      where v.id = selected_truck.vendor_id and v.owner_id = requester
    )
    or exists (
      select 1
      from public.opportunity_applications a
      join public.opportunities o on o.id = a.opportunity_id
      join public.location_hosts h on h.id = o.host_id
      where a.truck_id = p_truck_id and h.owner_id = requester
    )
    or exists (
      select 1
      from public.opportunity_bookings b
      join public.opportunities o on o.id = b.opportunity_id
      join public.location_hosts h on h.id = o.host_id
      where b.truck_id = p_truck_id and h.owner_id = requester
    );

  if not allowed then
    raise exception 'Only the applicant food truck and its event Hosts can view this profile';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'day_of_week', th.day_of_week,
    'opens_at', th.opens_at,
    'closes_at', th.closes_at,
    'is_closed', th.is_closed
  ) order by th.day_of_week), '[]'::jsonb)
  into hours_json
  from public.truck_hours th
  where th.truck_id = p_truck_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', mc.id,
    'name', mc.name,
    'description', mc.description,
    'sort_order', mc.sort_order
  ) order by mc.sort_order, mc.name), '[]'::jsonb)
  into categories_json
  from public.menu_categories mc
  where mc.truck_id = p_truck_id and mc.is_active = true;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', mi.id,
    'category_id', mi.category_id,
    'category_name', coalesce(mc.name, 'Other'),
    'name', mi.name,
    'description', mi.description,
    'price', mi.price,
    'photo_url', mi.photo_url,
    'is_featured', mi.is_featured,
    'is_sold_out', mi.is_sold_out,
    'sort_order', mi.sort_order
  ) order by coalesce(mc.sort_order, 2147483647), mi.sort_order, mi.name), '[]'::jsonb)
  into items_json
  from public.menu_items mi
  left join public.menu_categories mc on mc.id = mi.category_id
  where mi.truck_id = p_truck_id and mi.is_active = true;

  select jsonb_build_object(
    'average', coalesce(round(avg(r.rating)::numeric, 2), 0),
    'count', count(*),
    'communication', coalesce(round(avg(r.communication_rating)::numeric, 2), 0),
    'accuracy', coalesce(round(avg(r.accuracy_rating)::numeric, 2), 0),
    'setup', coalesce(round(avg(r.setup_rating)::numeric, 2), 0)
  )
  into rating_json
  from public.opportunity_reviews r
  join public.opportunity_bookings b on b.id = r.booking_id
  where b.truck_id = p_truck_id
    and r.reviewer_role = 'host'
    and not r.is_reported;

  select coalesce(jsonb_agg(review_row.payload order by review_row.created_at desc), '[]'::jsonb)
  into reviews_json
  from (
    select r.created_at, jsonb_build_object(
      'id', r.id,
      'rating', r.rating,
      'comment', r.comment,
      'created_at', r.created_at
    ) as payload
    from public.opportunity_reviews r
    join public.opportunity_bookings b on b.id = r.booking_id
    where b.truck_id = p_truck_id
      and r.reviewer_role = 'host'
      and not r.is_reported
    order by r.created_at desc
    limit 6
  ) review_row;

  return jsonb_build_object(
    'truck', jsonb_build_object(
      'id', selected_truck.id,
      'slug', selected_truck.slug,
      'name', selected_truck.name,
      'cuisine', selected_truck.cuisine,
      'description', selected_truck.description,
      'location_name', selected_truck.location_name,
      'logo_url', selected_truck.logo_url,
      'accepting_orders', selected_truck.accepting_orders,
      'estimated_prep_minutes', selected_truck.estimated_prep_minutes,
      'minimum_order', selected_truck.minimum_order,
      'pickup_instructions', selected_truck.pickup_instructions
    ),
    'hours', hours_json,
    'categories', categories_json,
    'menu_items', items_json,
    'rating', rating_json,
    'reviews', reviews_json
  );
end;
$$;

revoke all on function public.get_marketplace_truck_profile(uuid) from public, anon;
grant execute on function public.get_marketplace_truck_profile(uuid) to authenticated;

commit;
