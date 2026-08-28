-- FoodTrekNow Phase 6.1: Location and Event Opportunity Marketplace foundation.
-- Extends the existing profiles, vendor_profiles, trucks, and notification architecture.

create table if not exists public.location_hosts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references public.profiles(id) on delete cascade,
  host_kind text not null default 'business' check (host_kind in ('business', 'property_manager', 'event_organizer', 'community', 'other')),
  host_name text not null check (char_length(trim(host_name)) between 2 and 120),
  business_name text not null check (char_length(trim(business_name)) between 2 and 160),
  contact_email text not null check (position('@' in contact_email) > 1),
  contact_phone text not null check (char_length(trim(contact_phone)) between 7 and 30),
  verification_status text not null default 'pending' check (verification_status in ('pending', 'verified', 'declined', 'suspended')),
  average_rating numeric(3,2) not null default 0 check (average_rating between 0 and 5),
  rating_count integer not null default 0 check (rating_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.host_locations (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.location_hosts(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 160),
  location_type text not null check (location_type in ('office', 'business_park', 'warehouse', 'manufacturing', 'apartments', 'hoa', 'church', 'school', 'college', 'hospital', 'dealership', 'construction', 'brewery', 'sports', 'pool', 'government', 'shopping_center', 'private_property', 'other')),
  address_line1 text not null check (char_length(trim(address_line1)) between 3 and 180),
  address_line2 text not null default '',
  city text not null check (char_length(trim(city)) between 2 and 100),
  state text not null check (char_length(trim(state)) between 2 and 40),
  postal_code text not null check (char_length(trim(postal_code)) between 3 and 16),
  latitude numeric(9,6) check (latitude between -90 and 90),
  longitude numeric(9,6) check (longitude between -180 and 180),
  parking_instructions text not null default '',
  setup_instructions text not null default '',
  electricity_available boolean not null default false,
  water_available boolean not null default false,
  restrooms_available boolean not null default false,
  trash_disposal_available boolean not null default false,
  photos text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.opportunities (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.location_hosts(id) on delete cascade,
  location_id uuid not null references public.host_locations(id) on delete restrict,
  title text not null check (char_length(trim(title)) between 3 and 180),
  description text not null default '',
  opportunity_type text not null check (opportunity_type in ('one_time', 'recurring')),
  event_type text not null default 'location' check (event_type in ('location', 'lunch', 'dinner', 'community', 'private_event', 'festival', 'market', 'sports', 'other')),
  booking_mode text not null check (booking_mode in ('request', 'instant')),
  status text not null default 'draft' check (status in ('draft', 'published', 'filled', 'cancelled', 'completed')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  expected_customers integer not null check (expected_customers > 0),
  trucks_requested integer not null check (trucks_requested between 1 and 100),
  cuisine_preferences text[] not null default '{}',
  indoor_outdoor text not null default 'outdoor' check (indoor_outdoor in ('indoor', 'outdoor', 'both')),
  flat_vendor_fee numeric(10,2) not null default 0 check (flat_vendor_fee >= 0),
  sales_percentage numeric(5,2) not null default 0 check (sales_percentage between 0 and 100),
  minimum_sales_guarantee numeric(10,2) not null default 0 check (minimum_sales_guarantee >= 0),
  refundable_deposit numeric(10,2) not null default 0 check (refundable_deposit >= 0),
  electricity_available boolean not null default false,
  water_available boolean not null default false,
  arrival_time timestamptz,
  parking_instructions text not null default '',
  setup_instructions text not null default '',
  special_requirements text not null default '',
  cancellation_policy text not null default '',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at),
  check (arrival_time is null or arrival_time <= starts_at)
);

create table if not exists public.opportunity_recurrence_rules (
  opportunity_id uuid primary key references public.opportunities(id) on delete cascade,
  frequency text not null default 'weekly' check (frequency in ('daily', 'weekly', 'monthly')),
  interval_count integer not null default 1 check (interval_count between 1 and 12),
  days_of_week integer[] not null default '{}',
  recurrence_ends_on date,
  check (days_of_week <@ array[0,1,2,3,4,5,6])
);

create table if not exists public.opportunity_applications (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  vendor_profile_id uuid not null references public.vendor_profiles(id) on delete cascade,
  truck_id uuid not null references public.trucks(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'declined', 'waitlisted', 'withdrawn')),
  vendor_message text not null default '' check (char_length(vendor_message) <= 1200),
  host_response text not null default '' check (char_length(host_response) <= 1200),
  applied_at timestamptz not null default now(),
  decided_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (opportunity_id, truck_id)
);

create table if not exists public.opportunity_bookings (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  application_id uuid unique references public.opportunity_applications(id) on delete set null,
  vendor_profile_id uuid not null references public.vendor_profiles(id) on delete cascade,
  truck_id uuid not null references public.trucks(id) on delete cascade,
  status text not null default 'confirmed' check (status in ('confirmed', 'cancelled_by_vendor', 'cancelled_by_host', 'completed', 'no_show')),
  confirmed_at timestamptz not null default now(),
  cancelled_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (opportunity_id, truck_id)
);

create table if not exists public.opportunity_favorites (
  vendor_profile_id uuid not null references public.vendor_profiles(id) on delete cascade,
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (vendor_profile_id, opportunity_id)
);

create table if not exists public.vendor_routes (
  id uuid primary key default gen_random_uuid(),
  vendor_profile_id uuid not null references public.vendor_profiles(id) on delete cascade,
  name text not null default 'Weekly Route' check (char_length(trim(name)) between 2 and 100),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.vendor_route_stops (
  id uuid primary key default gen_random_uuid(),
  route_id uuid not null references public.vendor_routes(id) on delete cascade,
  booking_id uuid not null references public.opportunity_bookings(id) on delete cascade,
  day_of_week integer not null check (day_of_week between 0 and 6),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (route_id, booking_id)
);

create table if not exists public.opportunity_messages (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.opportunity_applications(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  sender_role text not null check (sender_role in ('vendor', 'host')),
  body text not null check (char_length(trim(body)) between 1 and 1000),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.marketplace_notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  opportunity_id uuid references public.opportunities(id) on delete cascade,
  application_id uuid references public.opportunity_applications(id) on delete cascade,
  kind text not null check (kind in ('nearby_opportunity', 'application', 'booking', 'message', 'reminder', 'cancellation', 'recurring', 'review')),
  event_key text not null,
  title text not null,
  body text not null,
  is_read boolean not null default false,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  unique (profile_id, event_key)
);

create table if not exists public.opportunity_reviews (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  booking_id uuid not null references public.opportunity_bookings(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id) on delete cascade,
  reviewer_role text not null check (reviewer_role in ('vendor', 'host')),
  rating integer not null check (rating between 1 and 5),
  communication_rating integer check (communication_rating between 1 and 5),
  accuracy_rating integer check (accuracy_rating between 1 and 5),
  setup_rating integer check (setup_rating between 1 and 5),
  comment text not null default '' check (char_length(comment) <= 1200),
  is_reported boolean not null default false,
  created_at timestamptz not null default now(),
  unique (booking_id, reviewer_id)
);

create index if not exists idx_host_locations_host on public.host_locations(host_id);
create index if not exists idx_opportunities_discovery on public.opportunities(status, starts_at, ends_at);
create index if not exists idx_opportunities_location on public.opportunities(location_id);
create index if not exists idx_opportunity_applications_vendor on public.opportunity_applications(vendor_profile_id, status);
create index if not exists idx_opportunity_applications_host on public.opportunity_applications(opportunity_id, status);
create index if not exists idx_opportunity_bookings_vendor on public.opportunity_bookings(vendor_profile_id, status);
create index if not exists idx_opportunity_messages_application on public.opportunity_messages(application_id, created_at);
create index if not exists idx_marketplace_notifications_profile on public.marketplace_notifications(profile_id, is_read, created_at desc);

create or replace function public.is_host_owner(p_host_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.location_hosts h where h.id = p_host_id and h.owner_id = auth.uid()) $$;

create or replace function public.owns_marketplace_vendor(p_vendor_profile_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.vendor_profiles v where v.id = p_vendor_profile_id and v.owner_id = auth.uid()) $$;

create or replace function public.host_owns_opportunity(p_opportunity_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.opportunities o
    join public.location_hosts h on h.id = o.host_id
    where o.id = p_opportunity_id and h.owner_id = auth.uid()
  )
$$;

create or replace function public.upsert_location_host(
  p_host_kind text,
  p_host_name text,
  p_business_name text,
  p_contact_email text,
  p_contact_phone text
)
returns public.location_hosts
language plpgsql security definer set search_path = public
as $$
declare saved public.location_hosts%rowtype;
begin
  if auth.uid() is null then raise exception 'Sign in to create a host account'; end if;
  if p_host_kind not in ('business', 'property_manager', 'event_organizer', 'community', 'other') then raise exception 'Select a valid host type'; end if;
  if char_length(trim(coalesce(p_host_name, ''))) < 2 or char_length(trim(coalesce(p_business_name, ''))) < 2 then raise exception 'Host and business names are required'; end if;
  if position('@' in coalesce(p_contact_email, '')) <= 1 then raise exception 'Enter a valid contact email'; end if;
  if char_length(trim(coalesce(p_contact_phone, ''))) < 7 then raise exception 'Enter a valid contact phone'; end if;

  insert into public.location_hosts (owner_id, host_kind, host_name, business_name, contact_email, contact_phone)
  values (auth.uid(), p_host_kind, trim(p_host_name), trim(p_business_name), lower(trim(p_contact_email)), trim(p_contact_phone))
  on conflict (owner_id) do update set
    host_kind = excluded.host_kind,
    host_name = excluded.host_name,
    business_name = excluded.business_name,
    contact_email = excluded.contact_email,
    contact_phone = excluded.contact_phone,
    updated_at = now()
  returning * into saved;
  return saved;
end;
$$;

create or replace function public.save_host_location(
  p_location_id uuid,
  p_name text,
  p_location_type text,
  p_address_line1 text,
  p_address_line2 text,
  p_city text,
  p_state text,
  p_postal_code text,
  p_latitude numeric,
  p_longitude numeric,
  p_parking_instructions text,
  p_setup_instructions text,
  p_electricity_available boolean,
  p_water_available boolean,
  p_restrooms_available boolean,
  p_trash_disposal_available boolean,
  p_photos text[] default '{}'
)
returns public.host_locations
language plpgsql security definer set search_path = public
as $$
declare selected_host uuid; saved public.host_locations%rowtype;
begin
  select id into selected_host from public.location_hosts where owner_id = auth.uid();
  if selected_host is null then raise exception 'Create your host account first'; end if;
  if char_length(trim(coalesce(p_name, ''))) < 2 or char_length(trim(coalesce(p_address_line1, ''))) < 3 then raise exception 'Location name and address are required'; end if;
  if p_latitude is not null and (p_latitude < -90 or p_latitude > 90) then raise exception 'Latitude is invalid'; end if;
  if p_longitude is not null and (p_longitude < -180 or p_longitude > 180) then raise exception 'Longitude is invalid'; end if;
  if exists (select 1 from unnest(coalesce(p_photos, '{}')) photo where photo !~ '^https://') then raise exception 'Location photo links must use HTTPS'; end if;

  if p_location_id is null then
    insert into public.host_locations (
      host_id, name, location_type, address_line1, address_line2, city, state, postal_code,
      latitude, longitude, parking_instructions, setup_instructions, electricity_available,
      water_available, restrooms_available, trash_disposal_available, photos
    ) values (
      selected_host, trim(p_name), p_location_type, trim(p_address_line1), trim(coalesce(p_address_line2, '')),
      trim(p_city), trim(p_state), trim(p_postal_code), p_latitude, p_longitude,
      trim(coalesce(p_parking_instructions, '')), trim(coalesce(p_setup_instructions, '')),
      coalesce(p_electricity_available, false), coalesce(p_water_available, false),
      coalesce(p_restrooms_available, false), coalesce(p_trash_disposal_available, false), coalesce(p_photos, '{}')
    ) returning * into saved;
  else
    update public.host_locations set
      name = trim(p_name), location_type = p_location_type, address_line1 = trim(p_address_line1),
      address_line2 = trim(coalesce(p_address_line2, '')), city = trim(p_city), state = trim(p_state),
      postal_code = trim(p_postal_code), latitude = p_latitude, longitude = p_longitude,
      parking_instructions = trim(coalesce(p_parking_instructions, '')), setup_instructions = trim(coalesce(p_setup_instructions, '')),
      electricity_available = coalesce(p_electricity_available, false), water_available = coalesce(p_water_available, false),
      restrooms_available = coalesce(p_restrooms_available, false), trash_disposal_available = coalesce(p_trash_disposal_available, false),
      photos = coalesce(p_photos, '{}'),
      updated_at = now()
    where id = p_location_id and host_id = selected_host returning * into saved;
    if saved.id is null then raise exception 'Location not found or not owned by this host'; end if;
  end if;
  return saved;
end;
$$;

create or replace function public.publish_opportunity(
  p_opportunity_id uuid,
  p_location_id uuid,
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
language plpgsql security definer set search_path = public
as $$
declare selected_host uuid; saved public.opportunities%rowtype;
begin
  select h.id into selected_host from public.location_hosts h
    join public.host_locations l on l.host_id = h.id
    where h.owner_id = auth.uid() and l.id = p_location_id and l.is_active;
  if selected_host is null then raise exception 'Choose one of your active host locations'; end if;
  if p_opportunity_type not in ('one_time', 'recurring') or p_booking_mode not in ('request', 'instant') then raise exception 'Opportunity type or booking mode is invalid'; end if;
  if p_starts_at is null or p_ends_at is null or p_ends_at <= p_starts_at then raise exception 'End time must be after start time'; end if;
  if p_ends_at <= now() then raise exception 'Opportunity must end in the future'; end if;
  if p_expected_customers < 1 or p_trucks_requested not between 1 and 100 then raise exception 'Expected customers and requested trucks must be positive'; end if;
  if coalesce(p_flat_vendor_fee, 0) < 0 or coalesce(p_sales_percentage, 0) not between 0 and 100 or coalesce(p_minimum_sales_guarantee, 0) < 0 or coalesce(p_refundable_deposit, 0) < 0 then raise exception 'Fees and guarantees must be valid non-negative amounts'; end if;

  if p_opportunity_id is null then
    insert into public.opportunities (
      host_id, location_id, title, description, opportunity_type, event_type, booking_mode, status,
      starts_at, ends_at, expected_customers, trucks_requested, cuisine_preferences, indoor_outdoor,
      flat_vendor_fee, sales_percentage, minimum_sales_guarantee, refundable_deposit,
      electricity_available, water_available, arrival_time, parking_instructions, setup_instructions,
      special_requirements, cancellation_policy, published_at
    ) values (
      selected_host, p_location_id, trim(p_title), trim(coalesce(p_description, '')), p_opportunity_type,
      p_event_type, p_booking_mode, 'published', p_starts_at, p_ends_at, p_expected_customers,
      p_trucks_requested, coalesce(p_cuisine_preferences, '{}'), p_indoor_outdoor,
      coalesce(p_flat_vendor_fee, 0), coalesce(p_sales_percentage, 0), coalesce(p_minimum_sales_guarantee, 0),
      coalesce(p_refundable_deposit, 0), coalesce(p_electricity_available, false), coalesce(p_water_available, false),
      p_arrival_time, trim(coalesce(p_parking_instructions, '')), trim(coalesce(p_setup_instructions, '')),
      trim(coalesce(p_special_requirements, '')), trim(coalesce(p_cancellation_policy, '')), now()
    ) returning * into saved;
  else
    update public.opportunities set
      location_id = p_location_id, title = trim(p_title), description = trim(coalesce(p_description, '')),
      opportunity_type = p_opportunity_type, event_type = p_event_type, booking_mode = p_booking_mode,
      status = 'published', starts_at = p_starts_at, ends_at = p_ends_at,
      expected_customers = p_expected_customers, trucks_requested = p_trucks_requested,
      cuisine_preferences = coalesce(p_cuisine_preferences, '{}'), indoor_outdoor = p_indoor_outdoor,
      flat_vendor_fee = coalesce(p_flat_vendor_fee, 0), sales_percentage = coalesce(p_sales_percentage, 0),
      minimum_sales_guarantee = coalesce(p_minimum_sales_guarantee, 0), refundable_deposit = coalesce(p_refundable_deposit, 0),
      electricity_available = coalesce(p_electricity_available, false), water_available = coalesce(p_water_available, false),
      arrival_time = p_arrival_time, parking_instructions = trim(coalesce(p_parking_instructions, '')),
      setup_instructions = trim(coalesce(p_setup_instructions, '')), special_requirements = trim(coalesce(p_special_requirements, '')),
      cancellation_policy = trim(coalesce(p_cancellation_policy, '')), published_at = coalesce(published_at, now()), updated_at = now()
    where id = p_opportunity_id and host_id = selected_host returning * into saved;
    if saved.id is null then raise exception 'Opportunity not found or not owned by this host'; end if;
  end if;

  if saved.opportunity_type = 'recurring' then
    insert into public.opportunity_recurrence_rules (opportunity_id, frequency, interval_count, days_of_week, recurrence_ends_on)
    values (
      saved.id,
      coalesce(p_recurrence->>'frequency', 'weekly'),
      greatest(1, least(12, coalesce((p_recurrence->>'interval_count')::integer, 1))),
      coalesce(array(select jsonb_array_elements_text(coalesce(p_recurrence->'days_of_week', '[]'::jsonb))::integer), '{}'),
      nullif(p_recurrence->>'recurrence_ends_on', '')::date
    ) on conflict (opportunity_id) do update set
      frequency = excluded.frequency, interval_count = excluded.interval_count,
      days_of_week = excluded.days_of_week, recurrence_ends_on = excluded.recurrence_ends_on;
  else
    delete from public.opportunity_recurrence_rules where opportunity_id = saved.id;
  end if;
  return saved;
end;
$$;

create or replace function public.list_marketplace_opportunities()
returns setof jsonb
language sql stable security definer set search_path = public
as $$
  select jsonb_build_object(
    'id', o.id, 'title', o.title, 'description', o.description, 'opportunity_type', o.opportunity_type,
    'event_type', o.event_type, 'booking_mode', o.booking_mode, 'starts_at', o.starts_at, 'ends_at', o.ends_at,
    'expected_customers', o.expected_customers, 'trucks_requested', o.trucks_requested,
    'trucks_booked', (select count(*) from public.opportunity_bookings b where b.opportunity_id = o.id and b.status = 'confirmed'),
    'cuisine_preferences', o.cuisine_preferences, 'indoor_outdoor', o.indoor_outdoor,
    'flat_vendor_fee', o.flat_vendor_fee, 'sales_percentage', o.sales_percentage,
    'minimum_sales_guarantee', o.minimum_sales_guarantee, 'refundable_deposit', o.refundable_deposit,
    'electricity_available', o.electricity_available, 'water_available', o.water_available,
    'arrival_time', o.arrival_time, 'parking_instructions', o.parking_instructions,
    'setup_instructions', o.setup_instructions, 'special_requirements', o.special_requirements,
    'cancellation_policy', o.cancellation_policy,
    'location', jsonb_build_object('id', l.id, 'name', l.name, 'location_type', l.location_type,
      'address_line1', l.address_line1, 'address_line2', l.address_line2, 'city', l.city,
      'state', l.state, 'postal_code', l.postal_code, 'latitude', l.latitude, 'longitude', l.longitude,
      'restrooms_available', l.restrooms_available, 'trash_disposal_available', l.trash_disposal_available, 'photos', l.photos),
    'host', jsonb_build_object('business_name', h.business_name, 'verification_status', h.verification_status,
      'average_rating', h.average_rating, 'rating_count', h.rating_count),
    'recurrence', case when r.opportunity_id is null then null else jsonb_build_object(
      'frequency', r.frequency, 'interval_count', r.interval_count, 'days_of_week', r.days_of_week,
      'recurrence_ends_on', r.recurrence_ends_on) end
  )
  from public.opportunities o
  join public.host_locations l on l.id = o.location_id and l.is_active
  join public.location_hosts h on h.id = o.host_id and h.verification_status <> 'suspended'
  left join public.opportunity_recurrence_rules r on r.opportunity_id = o.id
  where auth.uid() is not null and o.status = 'published' and o.ends_at > now()
  order by o.starts_at;
$$;

create or replace function public.apply_to_opportunity(
  p_opportunity_id uuid,
  p_truck_id uuid,
  p_vendor_message text default '',
  p_action text default 'request'
)
returns public.opportunity_applications
language plpgsql security definer set search_path = public
as $$
declare selected_vendor uuid; selected_opportunity public.opportunities%rowtype; created public.opportunity_applications%rowtype; booked_count integer; host_owner uuid; vendor_owner uuid;
begin
  select v.id, v.owner_id into selected_vendor, vendor_owner from public.vendor_profiles v
    join public.trucks t on t.vendor_id = v.id where v.owner_id = auth.uid() and t.id = p_truck_id and t.is_active;
  if selected_vendor is null then raise exception 'Choose a food truck you own'; end if;
  select * into selected_opportunity from public.opportunities where id = p_opportunity_id and status = 'published' and ends_at > now() for update;
  if selected_opportunity.id is null then raise exception 'This opportunity is no longer available'; end if;
  if p_action not in ('request', 'book') then raise exception 'Action must be request or book'; end if;
  if p_action = 'book' and selected_opportunity.booking_mode <> 'instant' then raise exception 'This host requires approval'; end if;
  select count(*) into booked_count from public.opportunity_bookings where opportunity_id = p_opportunity_id and status = 'confirmed';
  if booked_count >= selected_opportunity.trucks_requested then raise exception 'This opportunity is full'; end if;

  insert into public.opportunity_applications (opportunity_id, vendor_profile_id, truck_id, status, vendor_message, decided_at)
  values (p_opportunity_id, selected_vendor, p_truck_id, case when p_action = 'book' then 'approved' else 'pending' end,
    trim(coalesce(p_vendor_message, '')), case when p_action = 'book' then now() else null end)
  returning * into created;

  if p_action = 'book' then
    insert into public.opportunity_bookings (opportunity_id, application_id, vendor_profile_id, truck_id)
    values (p_opportunity_id, created.id, selected_vendor, p_truck_id);
    if booked_count + 1 >= selected_opportunity.trucks_requested then
      update public.opportunities set status = 'filled', updated_at = now() where id = selected_opportunity.id;
    end if;
  end if;

  select owner_id into host_owner from public.location_hosts where id = selected_opportunity.host_id;
  insert into public.marketplace_notifications (profile_id, opportunity_id, application_id, kind, event_key, title, body)
  values (host_owner, p_opportunity_id, created.id, case when p_action = 'book' then 'booking' else 'application' end,
    'marketplace-application:' || created.id, case when p_action = 'book' then 'A food truck booked your opportunity' else 'New food truck application',
    case when p_action = 'book' then 'An instant booking was confirmed for ' else 'A vendor requested a spot at ' end || selected_opportunity.title)
  on conflict (profile_id, event_key) do nothing;

  if p_action = 'book' then
    insert into public.marketplace_notifications (profile_id, opportunity_id, application_id, kind, event_key, title, body)
    values (vendor_owner, p_opportunity_id, created.id, 'booking', 'marketplace-booking:' || created.id,
      'Booking confirmed', 'Your truck is booked for ' || selected_opportunity.title)
    on conflict (profile_id, event_key) do nothing;
  end if;
  return created;
end;
$$;

create or replace function public.decide_opportunity_application(
  p_application_id uuid,
  p_decision text,
  p_host_response text default ''
)
returns public.opportunity_applications
language plpgsql security definer set search_path = public
as $$
declare selected public.opportunity_applications%rowtype; selected_opportunity public.opportunities%rowtype; booked_count integer; vendor_owner uuid;
begin
  if p_decision not in ('approved', 'declined', 'waitlisted') then raise exception 'Decision must be approved, declined, or waitlisted'; end if;
  select a.* into selected from public.opportunity_applications a
    join public.opportunities o on o.id = a.opportunity_id
    join public.location_hosts h on h.id = o.host_id
    where a.id = p_application_id and h.owner_id = auth.uid();
  if selected.id is null then raise exception 'Application not found or not owned by this host'; end if;
  if selected.status <> 'pending' and selected.status <> 'waitlisted' then raise exception 'This application has already been decided'; end if;
  select * into selected_opportunity from public.opportunities where id = selected.opportunity_id for update;
  if p_decision = 'approved' then
    select count(*) into booked_count from public.opportunity_bookings where opportunity_id = selected.opportunity_id and status = 'confirmed';
    if booked_count >= selected_opportunity.trucks_requested then raise exception 'All requested truck spaces are already filled'; end if;
  end if;

  update public.opportunity_applications set status = p_decision, host_response = trim(coalesce(p_host_response, '')),
    decided_at = now(), updated_at = now() where id = selected.id returning * into selected;
  if p_decision = 'approved' then
    insert into public.opportunity_bookings (opportunity_id, application_id, vendor_profile_id, truck_id)
    values (selected.opportunity_id, selected.id, selected.vendor_profile_id, selected.truck_id)
    on conflict (opportunity_id, truck_id) do update set status = 'confirmed', cancelled_at = null, updated_at = now();
    if booked_count + 1 >= selected_opportunity.trucks_requested then
      update public.opportunities set status = 'filled', updated_at = now() where id = selected_opportunity.id;
    end if;
  end if;
  select owner_id into vendor_owner from public.vendor_profiles where id = selected.vendor_profile_id;
  insert into public.marketplace_notifications (profile_id, opportunity_id, application_id, kind, event_key, title, body)
  values (vendor_owner, selected.opportunity_id, selected.id, case when p_decision = 'approved' then 'booking' else 'application' end,
    'marketplace-decision:' || selected.id || ':' || p_decision,
    case p_decision when 'approved' then 'Application accepted' when 'declined' then 'Application declined' else 'Application waitlisted' end,
    'Your application for ' || selected_opportunity.title || ' was ' || p_decision || '.')
  on conflict (profile_id, event_key) do nothing;
  return selected;
end;
$$;

create or replace function public.toggle_opportunity_favorite(p_opportunity_id uuid, p_saved boolean)
returns boolean language plpgsql security definer set search_path = public
as $$
declare selected_vendor uuid;
begin
  select id into selected_vendor from public.vendor_profiles where owner_id = auth.uid();
  if selected_vendor is null then raise exception 'Vendor access is required'; end if;
  if p_saved then
    insert into public.opportunity_favorites (vendor_profile_id, opportunity_id) values (selected_vendor, p_opportunity_id)
    on conflict do nothing;
  else
    delete from public.opportunity_favorites where vendor_profile_id = selected_vendor and opportunity_id = p_opportunity_id;
  end if;
  return p_saved;
end;
$$;

create or replace function public.add_booking_to_weekly_route(p_booking_id uuid, p_day_of_week integer)
returns public.vendor_route_stops
language plpgsql security definer set search_path = public
as $$
declare selected_vendor uuid; selected_route uuid; saved public.vendor_route_stops%rowtype;
begin
  if p_day_of_week not between 0 and 6 then raise exception 'Day of week is invalid'; end if;
  select b.vendor_profile_id into selected_vendor from public.opportunity_bookings b
    join public.vendor_profiles v on v.id = b.vendor_profile_id
    where b.id = p_booking_id and v.owner_id = auth.uid() and b.status = 'confirmed';
  if selected_vendor is null then raise exception 'Confirmed booking not found'; end if;
  select id into selected_route from public.vendor_routes where vendor_profile_id = selected_vendor and is_active order by created_at limit 1;
  if selected_route is null then
    insert into public.vendor_routes (vendor_profile_id, name) values (selected_vendor, 'Weekly Route') returning id into selected_route;
  end if;
  insert into public.vendor_route_stops (route_id, booking_id, day_of_week)
  values (selected_route, p_booking_id, p_day_of_week)
  on conflict (route_id, booking_id) do update set day_of_week = excluded.day_of_week
  returning * into saved;
  return saved;
end;
$$;

create or replace function public.send_opportunity_message(p_application_id uuid, p_body text)
returns public.opportunity_messages
language plpgsql security definer set search_path = public
as $$
declare selected public.opportunity_applications%rowtype; sender_kind text; recipient uuid; selected_opportunity public.opportunities%rowtype; created public.opportunity_messages%rowtype;
begin
  if char_length(trim(coalesce(p_body, ''))) not between 1 and 1000 then raise exception 'Messages must be between 1 and 1000 characters'; end if;
  select * into selected from public.opportunity_applications where id = p_application_id;
  if selected.id is null then raise exception 'Application not found'; end if;
  select * into selected_opportunity from public.opportunities where id = selected.opportunity_id;
  if public.owns_marketplace_vendor(selected.vendor_profile_id) then
    sender_kind := 'vendor';
    select owner_id into recipient from public.location_hosts where id = selected_opportunity.host_id;
  elsif public.host_owns_opportunity(selected.opportunity_id) then
    sender_kind := 'host';
    select owner_id into recipient from public.vendor_profiles where id = selected.vendor_profile_id;
  else raise exception 'Only the vendor and host can message about this application'; end if;
  insert into public.opportunity_messages (application_id, sender_id, sender_role, body)
  values (selected.id, auth.uid(), sender_kind, trim(p_body)) returning * into created;
  insert into public.marketplace_notifications (profile_id, opportunity_id, application_id, kind, event_key, title, body)
  values (recipient, selected.opportunity_id, selected.id, 'message', 'marketplace-message:' || created.id,
    case when sender_kind = 'vendor' then 'Vendor message' else 'Host message' end, trim(p_body))
  on conflict (profile_id, event_key) do nothing;
  return created;
end;
$$;

create or replace function public.submit_opportunity_review(
  p_booking_id uuid,
  p_rating integer,
  p_communication_rating integer,
  p_accuracy_rating integer,
  p_setup_rating integer,
  p_comment text default ''
)
returns public.opportunity_reviews
language plpgsql security definer set search_path = public
as $$
declare selected public.opportunity_bookings%rowtype; selected_opportunity public.opportunities%rowtype; reviewer_kind text; saved public.opportunity_reviews%rowtype;
begin
  if p_rating not between 1 and 5 then raise exception 'Rating must be between 1 and 5'; end if;
  select * into selected from public.opportunity_bookings where id = p_booking_id;
  if selected.id is null then raise exception 'Booking not found'; end if;
  select * into selected_opportunity from public.opportunities where id = selected.opportunity_id;
  if selected.status not in ('completed', 'confirmed') or selected_opportunity.ends_at > now() then raise exception 'Reviews are available after the opportunity ends'; end if;
  if public.owns_marketplace_vendor(selected.vendor_profile_id) then reviewer_kind := 'vendor';
  elsif public.host_owns_opportunity(selected.opportunity_id) then reviewer_kind := 'host';
  else raise exception 'Only booking participants can leave a review'; end if;
  insert into public.opportunity_reviews (opportunity_id, booking_id, reviewer_id, reviewer_role, rating, communication_rating, accuracy_rating, setup_rating, comment)
  values (selected.opportunity_id, selected.id, auth.uid(), reviewer_kind, p_rating, p_communication_rating, p_accuracy_rating, p_setup_rating, trim(coalesce(p_comment, '')))
  on conflict (booking_id, reviewer_id) do update set rating = excluded.rating, communication_rating = excluded.communication_rating,
    accuracy_rating = excluded.accuracy_rating, setup_rating = excluded.setup_rating, comment = excluded.comment
  returning * into saved;
  return saved;
end;
$$;

create or replace function public.mark_marketplace_notifications_read(p_notification_ids uuid[] default null)
returns integer language plpgsql security definer set search_path = public
as $$
declare changed integer;
begin
  update public.marketplace_notifications set is_read = true, read_at = coalesce(read_at, now())
  where profile_id = auth.uid() and not is_read and (p_notification_ids is null or id = any(p_notification_ids));
  get diagnostics changed = row_count;
  return changed;
end;
$$;

create or replace function public.notify_nearby_vendors_of_opportunity()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare selected_location public.host_locations%rowtype;
begin
  if new.status <> 'published' then return new; end if;
  if tg_op = 'UPDATE' and old.status = 'published' and old.starts_at is not distinct from new.starts_at then return new; end if;
  select * into selected_location from public.host_locations where id = new.location_id;
  if selected_location.latitude is null or selected_location.longitude is null then return new; end if;
  insert into public.marketplace_notifications (profile_id, opportunity_id, kind, event_key, title, body)
  select distinct v.owner_id, new.id, 'nearby_opportunity', 'nearby-opportunity:' || new.id,
    case when new.starts_at::date = current_date then 'Food truck opportunity nearby today' else 'New food truck opportunity nearby' end,
    new.title || ' at ' || selected_location.name || ' is accepting food trucks.'
  from public.vendor_profiles v
  join public.trucks t on t.vendor_id = v.id and t.is_active
  join public.truck_live_locations live on live.truck_id = t.id and live.is_sharing and live.updated_at > now() - interval '20 minutes'
  where 3958.8 * acos(greatest(-1.0, least(1.0,
    cos(radians(selected_location.latitude::double precision)) * cos(radians(live.latitude::double precision)) *
    cos(radians(live.longitude::double precision) - radians(selected_location.longitude::double precision)) +
    sin(radians(selected_location.latitude::double precision)) * sin(radians(live.latitude::double precision))
  ))) <= 50
  on conflict (profile_id, event_key) do nothing;
  return new;
end;
$$;

drop trigger if exists notify_nearby_vendors_of_opportunity on public.opportunities;
create trigger notify_nearby_vendors_of_opportunity
  after insert or update of status, starts_at on public.opportunities
  for each row execute function public.notify_nearby_vendors_of_opportunity();

create or replace function public.refresh_location_host_rating()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare selected_opportunity uuid; selected_host uuid;
begin
  if tg_op = 'DELETE' then selected_opportunity := old.opportunity_id;
  else selected_opportunity := new.opportunity_id;
  end if;
  select host_id into selected_host from public.opportunities where id = selected_opportunity;
  if selected_host is null then
    if tg_op = 'DELETE' then return old; else return new; end if;
  end if;
  update public.location_hosts h set
    average_rating = coalesce((select round(avg(r.rating)::numeric, 2) from public.opportunity_reviews r where r.reviewer_role = 'vendor' and not r.is_reported and r.opportunity_id in (select id from public.opportunities where host_id = selected_host)), 0),
    rating_count = (select count(*) from public.opportunity_reviews r where r.reviewer_role = 'vendor' and not r.is_reported and r.opportunity_id in (select id from public.opportunities where host_id = selected_host)),
    updated_at = now()
  where h.id = selected_host;
  if tg_op = 'DELETE' then return old; else return new; end if;
end;
$$;

drop trigger if exists refresh_location_host_rating on public.opportunity_reviews;
create trigger refresh_location_host_rating
  after insert or update or delete on public.opportunity_reviews
  for each row execute function public.refresh_location_host_rating();

alter table public.location_hosts enable row level security;
alter table public.host_locations enable row level security;
alter table public.opportunities enable row level security;
alter table public.opportunity_recurrence_rules enable row level security;
alter table public.opportunity_applications enable row level security;
alter table public.opportunity_bookings enable row level security;
alter table public.opportunity_favorites enable row level security;
alter table public.vendor_routes enable row level security;
alter table public.vendor_route_stops enable row level security;
alter table public.opportunity_messages enable row level security;
alter table public.marketplace_notifications enable row level security;
alter table public.opportunity_reviews enable row level security;

drop policy if exists location_hosts_owner_read on public.location_hosts;
drop policy if exists host_locations_owner_read on public.host_locations;
drop policy if exists opportunities_participant_read on public.opportunities;
drop policy if exists recurrence_participant_read on public.opportunity_recurrence_rules;
drop policy if exists applications_participant_read on public.opportunity_applications;
drop policy if exists bookings_participant_read on public.opportunity_bookings;
drop policy if exists favorites_vendor_read on public.opportunity_favorites;
drop policy if exists routes_vendor_read on public.vendor_routes;
drop policy if exists route_stops_vendor_read on public.vendor_route_stops;
drop policy if exists opportunity_messages_participant_read on public.opportunity_messages;
drop policy if exists marketplace_notifications_owner_read on public.marketplace_notifications;
drop policy if exists opportunity_reviews_participant_read on public.opportunity_reviews;

create policy location_hosts_owner_read on public.location_hosts for select using (owner_id = auth.uid() or public.is_admin());
create policy host_locations_owner_read on public.host_locations for select using (
  public.is_host_owner(host_id) or public.is_admin() or
  exists (
    select 1 from public.opportunities o
    where o.location_id = host_locations.id and (
      o.status = 'published' or
      exists (
        select 1 from public.opportunity_applications a
        join public.vendor_profiles v on v.id = a.vendor_profile_id
        where a.opportunity_id = o.id and v.owner_id = auth.uid()
      )
    )
  )
);
create policy opportunities_participant_read on public.opportunities for select using (
  public.is_host_owner(host_id) or public.is_admin() or
  (status = 'published' and auth.uid() is not null) or
  exists (select 1 from public.opportunity_applications a join public.vendor_profiles v on v.id = a.vendor_profile_id where a.opportunity_id = opportunities.id and v.owner_id = auth.uid())
);
create policy recurrence_participant_read on public.opportunity_recurrence_rules for select using (
  exists (select 1 from public.opportunities o where o.id = opportunity_recurrence_rules.opportunity_id and (o.status = 'published' or public.host_owns_opportunity(o.id)))
);
create policy applications_participant_read on public.opportunity_applications for select using (
  public.owns_marketplace_vendor(vendor_profile_id) or public.host_owns_opportunity(opportunity_id) or public.is_admin()
);
create policy bookings_participant_read on public.opportunity_bookings for select using (
  public.owns_marketplace_vendor(vendor_profile_id) or public.host_owns_opportunity(opportunity_id) or public.is_admin()
);
create policy favorites_vendor_read on public.opportunity_favorites for select using (public.owns_marketplace_vendor(vendor_profile_id));
create policy routes_vendor_read on public.vendor_routes for select using (public.owns_marketplace_vendor(vendor_profile_id));
create policy route_stops_vendor_read on public.vendor_route_stops for select using (
  exists (select 1 from public.vendor_routes r where r.id = route_id and public.owns_marketplace_vendor(r.vendor_profile_id))
);
create policy opportunity_messages_participant_read on public.opportunity_messages for select using (
  exists (select 1 from public.opportunity_applications a where a.id = opportunity_messages.application_id and
    (public.owns_marketplace_vendor(a.vendor_profile_id) or public.host_owns_opportunity(a.opportunity_id)))
);
create policy marketplace_notifications_owner_read on public.marketplace_notifications for select using (profile_id = auth.uid());
create policy opportunity_reviews_participant_read on public.opportunity_reviews for select using (
  reviewer_id = auth.uid() or public.host_owns_opportunity(opportunity_id) or
  exists (select 1 from public.opportunity_bookings b where b.id = opportunity_reviews.booking_id and public.owns_marketplace_vendor(b.vendor_profile_id)) or public.is_admin()
);

revoke all on public.location_hosts, public.host_locations, public.opportunities, public.opportunity_recurrence_rules,
  public.opportunity_applications, public.opportunity_bookings, public.opportunity_favorites, public.vendor_routes,
  public.vendor_route_stops, public.opportunity_messages, public.marketplace_notifications, public.opportunity_reviews
  from anon, authenticated;
grant select on public.location_hosts, public.host_locations, public.opportunities, public.opportunity_recurrence_rules,
  public.opportunity_applications, public.opportunity_bookings, public.opportunity_favorites, public.vendor_routes,
  public.vendor_route_stops, public.opportunity_messages, public.marketplace_notifications, public.opportunity_reviews
  to authenticated;

revoke all on function public.upsert_location_host(text, text, text, text, text) from public, anon;
revoke all on function public.save_host_location(uuid, text, text, text, text, text, text, text, numeric, numeric, text, text, boolean, boolean, boolean, boolean, text[]) from public, anon;
revoke all on function public.publish_opportunity(uuid, uuid, text, text, text, text, text, timestamptz, timestamptz, integer, integer, text[], text, numeric, numeric, numeric, numeric, boolean, boolean, timestamptz, text, text, text, text, jsonb) from public, anon;
revoke all on function public.list_marketplace_opportunities() from public, anon;
revoke all on function public.apply_to_opportunity(uuid, uuid, text, text) from public, anon;
revoke all on function public.decide_opportunity_application(uuid, text, text) from public, anon;
revoke all on function public.toggle_opportunity_favorite(uuid, boolean) from public, anon;
revoke all on function public.add_booking_to_weekly_route(uuid, integer) from public, anon;
revoke all on function public.send_opportunity_message(uuid, text) from public, anon;
revoke all on function public.submit_opportunity_review(uuid, integer, integer, integer, integer, text) from public, anon;
revoke all on function public.mark_marketplace_notifications_read(uuid[]) from public, anon;
revoke all on function public.is_host_owner(uuid) from public, anon;
revoke all on function public.owns_marketplace_vendor(uuid) from public, anon;
revoke all on function public.host_owns_opportunity(uuid) from public, anon;
revoke all on function public.notify_nearby_vendors_of_opportunity() from public, anon, authenticated;
revoke all on function public.refresh_location_host_rating() from public, anon, authenticated;

grant execute on function public.upsert_location_host(text, text, text, text, text) to authenticated;
grant execute on function public.save_host_location(uuid, text, text, text, text, text, text, text, numeric, numeric, text, text, boolean, boolean, boolean, boolean, text[]) to authenticated;
grant execute on function public.publish_opportunity(uuid, uuid, text, text, text, text, text, timestamptz, timestamptz, integer, integer, text[], text, numeric, numeric, numeric, numeric, boolean, boolean, timestamptz, text, text, text, text, jsonb) to authenticated;
grant execute on function public.list_marketplace_opportunities() to authenticated;
grant execute on function public.apply_to_opportunity(uuid, uuid, text, text) to authenticated;
grant execute on function public.decide_opportunity_application(uuid, text, text) to authenticated;
grant execute on function public.toggle_opportunity_favorite(uuid, boolean) to authenticated;
grant execute on function public.add_booking_to_weekly_route(uuid, integer) to authenticated;
grant execute on function public.send_opportunity_message(uuid, text) to authenticated;
grant execute on function public.submit_opportunity_review(uuid, integer, integer, integer, integer, text) to authenticated;
grant execute on function public.mark_marketplace_notifications_read(uuid[]) to authenticated;
grant execute on function public.is_host_owner(uuid) to authenticated;
grant execute on function public.owns_marketplace_vendor(uuid) to authenticated;
grant execute on function public.host_owns_opportunity(uuid) to authenticated;

alter table public.opportunities replica identity full;
alter table public.opportunity_applications replica identity full;
alter table public.opportunity_bookings replica identity full;
alter table public.opportunity_messages replica identity full;
alter table public.marketplace_notifications replica identity full;

do $$
declare table_name text;
begin
  foreach table_name in array array['opportunities', 'opportunity_applications', 'opportunity_bookings', 'opportunity_messages', 'marketplace_notifications'] loop
    if not exists (
      select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = table_name
    ) then
      execute format('alter publication supabase_realtime add table public.%I', table_name);
    end if;
  end loop;
end $$;
