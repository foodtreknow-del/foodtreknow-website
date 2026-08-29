-- FoodTrekNow Phase 6.2: customer discovery for confirmed host events.
-- Only public event/location details and public truck details are returned.

create or replace function public.list_customer_events()
returns setof jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'id', o.id,
    'title', o.title,
    'description', o.description,
    'event_type', o.event_type,
    'starts_at', o.starts_at,
    'ends_at', o.ends_at,
    'expected_customers', o.expected_customers,
    'host_name', h.business_name,
    'location', jsonb_build_object(
      'name', l.name,
      'address_line1', l.address_line1,
      'address_line2', l.address_line2,
      'city', l.city,
      'state', l.state,
      'postal_code', l.postal_code,
      'latitude', l.latitude,
      'longitude', l.longitude
    ),
    'trucks', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', t.id,
        'name', t.name,
        'cuisine', t.cuisine,
        'description', t.description,
        'logo_url', t.logo_url,
        'accepting_orders', t.accepting_orders,
        'estimated_prep_minutes', t.estimated_prep_minutes,
        'pickup_instructions', t.pickup_instructions
      ) order by t.name)
      from public.opportunity_bookings b
      join public.trucks t on t.id = b.truck_id and t.is_active = true
      where b.opportunity_id = o.id
        and b.status = 'confirmed'
    ), '[]'::jsonb)
  )
  from public.opportunities o
  join public.location_hosts h on h.id = o.host_id
  join public.host_locations l on l.id = o.location_id and l.is_active = true
  where o.status in ('published', 'filled')
    and o.ends_at >= now()
    and exists (
      select 1
      from public.opportunity_bookings b
      join public.trucks t on t.id = b.truck_id and t.is_active = true
      where b.opportunity_id = o.id
        and b.status = 'confirmed'
    )
  order by o.starts_at;
$$;

revoke all on function public.list_customer_events() from public;
grant execute on function public.list_customer_events() to anon, authenticated;

comment on function public.list_customer_events() is
  'Returns upcoming host events and their confirmed active food trucks for customer discovery.';
