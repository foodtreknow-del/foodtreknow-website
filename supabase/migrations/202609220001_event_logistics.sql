-- FoodTrekNow event logistics: vendor zones, assigned spaces, shared event maps,
-- arrival instructions, vendor check-in, and customer pickup navigation.

alter table public.opportunities
  add column if not exists site_map_image_url text not null default '',
  add column if not exists vendor_zone_name text not null default '',
  add column if not exists vendor_entrance text not null default '',
  add column if not exists customer_map_enabled boolean not null default false,
  add column if not exists event_logistics_notes text not null default '',
  add column if not exists placement_strategy text not null default 'manual';

alter table public.opportunities drop constraint if exists opportunities_placement_strategy_check;
alter table public.opportunities
  add constraint opportunities_placement_strategy_check
  check (placement_strategy in ('manual', 'smart'));

alter table public.opportunity_bookings
  add column if not exists space_code text not null default '',
  add column if not exists space_label text not null default '',
  add column if not exists map_x numeric(5,2),
  add column if not exists map_y numeric(5,2),
  add column if not exists arrival_window_start timestamptz,
  add column if not exists arrival_window_end timestamptz,
  add column if not exists electrical_access text not null default '',
  add column if not exists water_access text not null default '',
  add column if not exists generator_permitted boolean not null default false,
  add column if not exists check_in_status text not null default 'not_arrived',
  add column if not exists checked_in_at timestamptz;

alter table public.opportunity_bookings drop constraint if exists opportunity_bookings_map_x_check;
alter table public.opportunity_bookings drop constraint if exists opportunity_bookings_map_y_check;
alter table public.opportunity_bookings drop constraint if exists opportunity_bookings_arrival_window_check;
alter table public.opportunity_bookings drop constraint if exists opportunity_bookings_check_in_status_check;
alter table public.opportunity_bookings
  add constraint opportunity_bookings_map_x_check check (map_x is null or map_x between 0 and 100),
  add constraint opportunity_bookings_map_y_check check (map_y is null or map_y between 0 and 100),
  add constraint opportunity_bookings_arrival_window_check check (arrival_window_end is null or arrival_window_start is null or arrival_window_end >= arrival_window_start),
  add constraint opportunity_bookings_check_in_status_check check (check_in_status in ('not_arrived', 'arrived', 'checked_in', 'departed'));

alter table public.marketplace_notifications drop constraint if exists marketplace_notifications_kind_check;
alter table public.marketplace_notifications
  add constraint marketplace_notifications_kind_check
  check (kind in ('nearby_opportunity', 'application', 'booking', 'message', 'reminder', 'cancellation', 'recurring', 'review', 'logistics'));

create or replace function public.save_event_logistics(
  p_opportunity_id uuid,
  p_site_map_image_url text,
  p_vendor_zone_name text,
  p_vendor_entrance text,
  p_customer_map_enabled boolean,
  p_event_logistics_notes text,
  p_placement_strategy text
)
returns public.opportunities
language plpgsql
security definer
set search_path = public
as $$
declare saved public.opportunities%rowtype;
begin
  if not public.host_owns_opportunity(p_opportunity_id) then
    raise exception 'Only the event Host can update event logistics.';
  end if;
  if coalesce(p_placement_strategy, 'manual') not in ('manual', 'smart') then
    raise exception 'Invalid placement strategy.';
  end if;

  update public.opportunities
  set site_map_image_url = trim(coalesce(p_site_map_image_url, '')),
      vendor_zone_name = trim(coalesce(p_vendor_zone_name, '')),
      vendor_entrance = trim(coalesce(p_vendor_entrance, '')),
      customer_map_enabled = coalesce(p_customer_map_enabled, false),
      event_logistics_notes = trim(coalesce(p_event_logistics_notes, '')),
      placement_strategy = coalesce(p_placement_strategy, 'manual'),
      updated_at = now()
  where id = p_opportunity_id
  returning * into saved;

  return saved;
end;
$$;

create or replace function public.assign_vendor_space(
  p_booking_id uuid,
  p_space_code text,
  p_space_label text,
  p_map_x numeric,
  p_map_y numeric,
  p_arrival_window_start timestamptz,
  p_arrival_window_end timestamptz,
  p_electrical_access text,
  p_water_access text,
  p_generator_permitted boolean
)
returns public.opportunity_bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  saved public.opportunity_bookings%rowtype;
  selected_event public.opportunities%rowtype;
  vendor_owner uuid;
begin
  select o.* into selected_event
  from public.opportunity_bookings b
  join public.opportunities o on o.id = b.opportunity_id
  where b.id = p_booking_id and public.host_owns_opportunity(o.id);

  if selected_event.id is null then
    raise exception 'Only the event Host can assign this vendor space.';
  end if;
  if p_map_x is not null and (p_map_x < 0 or p_map_x > 100) then raise exception 'Map X must be between 0 and 100.'; end if;
  if p_map_y is not null and (p_map_y < 0 or p_map_y > 100) then raise exception 'Map Y must be between 0 and 100.'; end if;
  if p_arrival_window_start is not null and p_arrival_window_end is not null and p_arrival_window_end < p_arrival_window_start then
    raise exception 'Arrival window end must be after its start.';
  end if;

  update public.opportunity_bookings
  set space_code = upper(trim(coalesce(p_space_code, ''))),
      space_label = trim(coalesce(p_space_label, '')),
      map_x = p_map_x,
      map_y = p_map_y,
      arrival_window_start = p_arrival_window_start,
      arrival_window_end = p_arrival_window_end,
      electrical_access = trim(coalesce(p_electrical_access, '')),
      water_access = trim(coalesce(p_water_access, '')),
      generator_permitted = coalesce(p_generator_permitted, false),
      updated_at = now()
  where id = p_booking_id
  returning * into saved;

  select owner_id into vendor_owner from public.vendor_profiles where id = saved.vendor_profile_id;
  insert into public.marketplace_notifications(profile_id, opportunity_id, application_id, kind, event_key, title, body)
  values (
    vendor_owner, saved.opportunity_id, saved.application_id, 'logistics',
    'space-assignment:' || saved.id || ':' || extract(epoch from saved.updated_at)::bigint,
    'Event space assigned',
    selected_event.title || ': ' || coalesce(nullif(saved.space_code, ''), 'your vendor location') || ' is ready. Open Bookings for arrival and utility details.'
  )
  on conflict (profile_id, event_key) do nothing;

  return saved;
end;
$$;

create or replace function public.vendor_event_check_in(p_booking_id uuid, p_status text)
returns public.opportunity_bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  saved public.opportunity_bookings%rowtype;
  host_owner uuid;
  event_title text;
  truck_name text;
begin
  if p_status not in ('arrived', 'checked_in', 'departed') then
    raise exception 'Invalid event check-in status.';
  end if;

  update public.opportunity_bookings b
  set check_in_status = p_status,
      checked_in_at = case when p_status = 'checked_in' then now() else b.checked_in_at end,
      updated_at = now()
  from public.vendor_profiles v
  where b.id = p_booking_id and b.vendor_profile_id = v.id and v.owner_id = auth.uid()
  returning b.* into saved;

  if saved.id is null then raise exception 'This vendor booking is unavailable.'; end if;

  select h.owner_id, o.title, t.name into host_owner, event_title, truck_name
  from public.opportunities o
  join public.location_hosts h on h.id = o.host_id
  join public.trucks t on t.id = saved.truck_id
  where o.id = saved.opportunity_id;

  insert into public.marketplace_notifications(profile_id, opportunity_id, application_id, kind, event_key, title, body)
  values (
    host_owner, saved.opportunity_id, saved.application_id, 'logistics',
    'vendor-check-in:' || saved.id || ':' || p_status,
    'Vendor arrival update',
    truck_name || ' marked ' || replace(p_status, '_', ' ') || ' for ' || event_title || '.'
  )
  on conflict (profile_id, event_key) do nothing;

  return saved;
end;
$$;

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
    'site_map_image_url', case when o.customer_map_enabled then o.site_map_image_url else '' end,
    'vendor_zone_name', case when o.customer_map_enabled then o.vendor_zone_name else '' end,
    'vendor_entrance', case when o.customer_map_enabled then o.vendor_entrance else '' end,
    'customer_map_enabled', o.customer_map_enabled,
    'event_logistics_notes', case when o.customer_map_enabled then o.event_logistics_notes else '' end,
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
        'pickup_instructions', t.pickup_instructions,
        'space_code', case when o.customer_map_enabled then b.space_code else '' end,
        'space_label', case when o.customer_map_enabled then b.space_label else '' end,
        'map_x', case when o.customer_map_enabled then b.map_x else null end,
        'map_y', case when o.customer_map_enabled then b.map_y else null end
      ) order by coalesce(nullif(b.space_code, ''), t.name))
      from public.opportunity_bookings b
      join public.trucks t on t.id = b.truck_id and t.is_active = true
      where b.opportunity_id = o.id and b.status = 'confirmed'
    ), '[]'::jsonb)
  )
  from public.opportunities o
  join public.location_hosts h on h.id = o.host_id
  join public.host_locations l on l.id = o.location_id and l.is_active = true
  where o.status in ('published', 'filled')
    and o.ends_at >= now()
    and exists (
      select 1 from public.opportunity_bookings b
      join public.trucks t on t.id = b.truck_id and t.is_active = true
      where b.opportunity_id = o.id and b.status = 'confirmed'
    )
  order by o.starts_at;
$$;

revoke all on function public.save_event_logistics(uuid, text, text, text, boolean, text, text) from public, anon;
revoke all on function public.assign_vendor_space(uuid, text, text, numeric, numeric, timestamptz, timestamptz, text, text, boolean) from public, anon;
revoke all on function public.vendor_event_check_in(uuid, text) from public, anon;
revoke all on function public.list_customer_events() from public;
grant execute on function public.save_event_logistics(uuid, text, text, text, boolean, text, text) to authenticated;
grant execute on function public.assign_vendor_space(uuid, text, text, numeric, numeric, timestamptz, timestamptz, text, text, boolean) to authenticated;
grant execute on function public.vendor_event_check_in(uuid, text) to authenticated;
grant execute on function public.list_customer_events() to anon, authenticated;

comment on function public.save_event_logistics(uuid, text, text, text, boolean, text, text) is 'Lets an event Host save the shared event-site map and vendor-zone instructions.';
comment on function public.assign_vendor_space(uuid, text, text, numeric, numeric, timestamptz, timestamptz, text, text, boolean) is 'Assigns an approved food truck to an exact event space and notifies the vendor.';
comment on function public.vendor_event_check_in(uuid, text) is 'Lets the booked vendor report arrival, check-in, or departure to the Host.';
