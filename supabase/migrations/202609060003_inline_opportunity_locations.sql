-- Let each Host opportunity capture its own freely entered event location.
-- Location rows act as immutable event-location snapshots so editing one event
-- cannot silently change the address shown on another event.

begin;

create or replace function public.publish_opportunity_with_location(
  p_opportunity_id uuid,
  p_location_name text,
  p_location_type text,
  p_location_address_line1 text,
  p_location_address_line2 text,
  p_location_city text,
  p_location_state text,
  p_location_postal_code text,
  p_location_latitude numeric,
  p_location_longitude numeric,
  p_title text,
  p_description text,
  p_opportunity_type text,
  p_event_type text,
  p_booking_mode text,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_expected_customers integer,
  p_trucks_requested integer,
  p_cuisine_preferences text[],
  p_indoor_outdoor text,
  p_flat_vendor_fee numeric,
  p_sales_percentage numeric,
  p_minimum_sales_guarantee numeric,
  p_refundable_deposit numeric,
  p_electricity_available boolean,
  p_water_available boolean,
  p_arrival_time timestamptz,
  p_parking_instructions text,
  p_setup_instructions text,
  p_special_requirements text,
  p_cancellation_policy text,
  p_recurrence jsonb default null
)
returns public.opportunities
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_host uuid;
  current_location public.host_locations%rowtype;
  saved_location public.host_locations%rowtype;
  saved_opportunity public.opportunities%rowtype;
  location_changed boolean := true;
begin
  select id into selected_host
  from public.location_hosts
  where owner_id = auth.uid();

  if selected_host is null then
    raise exception 'Create your Host account first';
  end if;
  if char_length(trim(coalesce(p_location_name, ''))) < 2 then
    raise exception 'Enter the event location or venue name';
  end if;
  if char_length(trim(coalesce(p_location_address_line1, ''))) < 3
    or char_length(trim(coalesce(p_location_city, ''))) < 2
    or char_length(trim(coalesce(p_location_state, ''))) < 2
    or char_length(trim(coalesce(p_location_postal_code, ''))) < 3 then
    raise exception 'Enter the complete event street address, city, state, and ZIP code';
  end if;
  if p_location_latitude is not null and p_location_latitude not between -90 and 90 then
    raise exception 'Latitude is invalid';
  end if;
  if p_location_longitude is not null and p_location_longitude not between -180 and 180 then
    raise exception 'Longitude is invalid';
  end if;

  if p_opportunity_id is not null then
    select l.* into current_location
    from public.opportunities o
    join public.host_locations l on l.id = o.location_id
    where o.id = p_opportunity_id
      and o.host_id = selected_host;

    if current_location.id is null then
      raise exception 'Opportunity not found or not owned by this Host';
    end if;

    location_changed := not (
      current_location.name = trim(p_location_name)
      and current_location.location_type = p_location_type
      and current_location.address_line1 = trim(p_location_address_line1)
      and current_location.address_line2 = trim(coalesce(p_location_address_line2, ''))
      and current_location.city = trim(p_location_city)
      and current_location.state = trim(p_location_state)
      and current_location.postal_code = trim(p_location_postal_code)
      and current_location.latitude is not distinct from p_location_latitude
      and current_location.longitude is not distinct from p_location_longitude
    );
  end if;

  if p_opportunity_id is not null and not location_changed then
    saved_location := current_location;
  else
    insert into public.host_locations (
      host_id, name, location_type, address_line1, address_line2, city, state,
      postal_code, latitude, longitude, parking_instructions, setup_instructions,
      electricity_available, water_available, restrooms_available,
      trash_disposal_available, photos
    ) values (
      selected_host, trim(p_location_name), p_location_type,
      trim(p_location_address_line1), trim(coalesce(p_location_address_line2, '')),
      trim(p_location_city), trim(p_location_state), trim(p_location_postal_code),
      p_location_latitude, p_location_longitude,
      trim(coalesce(p_parking_instructions, '')), trim(coalesce(p_setup_instructions, '')),
      coalesce(p_electricity_available, false), coalesce(p_water_available, false),
      false, false, '{}'
    )
    returning * into saved_location;
  end if;

  saved_opportunity := public.publish_opportunity(
    p_opportunity_id => p_opportunity_id,
    p_location_id => saved_location.id,
    p_title => p_title,
    p_description => p_description,
    p_opportunity_type => p_opportunity_type,
    p_event_type => p_event_type,
    p_booking_mode => p_booking_mode,
    p_starts_at => p_starts_at,
    p_ends_at => p_ends_at,
    p_expected_customers => p_expected_customers,
    p_trucks_requested => p_trucks_requested,
    p_cuisine_preferences => p_cuisine_preferences,
    p_indoor_outdoor => p_indoor_outdoor,
    p_flat_vendor_fee => p_flat_vendor_fee,
    p_sales_percentage => p_sales_percentage,
    p_minimum_sales_guarantee => p_minimum_sales_guarantee,
    p_refundable_deposit => p_refundable_deposit,
    p_electricity_available => p_electricity_available,
    p_water_available => p_water_available,
    p_arrival_time => p_arrival_time,
    p_parking_instructions => p_parking_instructions,
    p_setup_instructions => p_setup_instructions,
    p_special_requirements => p_special_requirements,
    p_cancellation_policy => p_cancellation_policy,
    p_recurrence => p_recurrence
  );

  return saved_opportunity;
end;
$$;

revoke all on function public.publish_opportunity_with_location(
  uuid, text, text, text, text, text, text, text, numeric, numeric,
  text, text, text, text, text, timestamptz, timestamptz, integer, integer,
  text[], text, numeric, numeric, numeric, numeric, boolean, boolean,
  timestamptz, text, text, text, text, jsonb
) from public, anon;

grant execute on function public.publish_opportunity_with_location(
  uuid, text, text, text, text, text, text, text, numeric, numeric,
  text, text, text, text, text, timestamptz, timestamptz, integer, integer,
  text[], text, numeric, numeric, numeric, numeric, boolean, boolean,
  timestamptz, text, text, text, text, jsonb
) to authenticated;

commit;
