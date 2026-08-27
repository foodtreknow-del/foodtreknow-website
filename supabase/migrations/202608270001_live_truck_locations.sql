-- FoodTrekNow live truck location sharing.

begin;

create table if not exists public.truck_live_locations (
  truck_id uuid primary key references public.trucks(id) on delete cascade,
  latitude numeric(9, 6) not null check (latitude between -90 and 90),
  longitude numeric(9, 6) not null check (longitude between -180 and 180),
  accuracy_meters numeric(9, 2) check (accuracy_meters is null or accuracy_meters >= 0),
  is_sharing boolean not null default false,
  recorded_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_truck_live_locations_public
  on public.truck_live_locations(is_sharing, recorded_at desc);

drop trigger if exists set_truck_live_locations_updated_at on public.truck_live_locations;
create trigger set_truck_live_locations_updated_at
  before update on public.truck_live_locations
  for each row execute function public.set_updated_at();

alter table public.truck_live_locations enable row level security;

drop policy if exists truck_live_locations_public_read on public.truck_live_locations;
create policy truck_live_locations_public_read on public.truck_live_locations for select
  using (
    is_sharing
    and recorded_at >= now() - interval '10 minutes'
    and exists (
      select 1 from public.trucks t
      where t.id = truck_id and t.is_active
    )
  );

drop policy if exists truck_live_locations_vendor_read on public.truck_live_locations;
create policy truck_live_locations_vendor_read on public.truck_live_locations for select
  using (public.owns_truck(truck_id));

create or replace function public.publish_live_truck_location(
  p_truck_id uuid,
  p_latitude numeric default null,
  p_longitude numeric default null,
  p_accuracy_meters numeric default null,
  p_is_sharing boolean default true
)
returns public.truck_live_locations
language plpgsql
security definer
set search_path = ''
as $$
declare
  published public.truck_live_locations%rowtype;
begin
  if auth.uid() is null or not public.owns_truck(p_truck_id) then
    raise exception 'Vendor access to this truck is required';
  end if;

  if p_is_sharing then
    if p_latitude is null or p_latitude not between -90 and 90
      or p_longitude is null or p_longitude not between -180 and 180 then
      raise exception 'A valid GPS location is required';
    end if;
    if p_accuracy_meters is not null and p_accuracy_meters < 0 then
      raise exception 'GPS accuracy cannot be negative';
    end if;

    insert into public.truck_live_locations (
      truck_id, latitude, longitude, accuracy_meters, is_sharing, recorded_at
    ) values (
      p_truck_id, p_latitude, p_longitude, p_accuracy_meters, true, now()
    )
    on conflict (truck_id) do update set
      latitude = excluded.latitude,
      longitude = excluded.longitude,
      accuracy_meters = excluded.accuracy_meters,
      is_sharing = true,
      recorded_at = now()
    returning * into published;
  else
    update public.truck_live_locations
    set is_sharing = false, recorded_at = now()
    where truck_id = p_truck_id
    returning * into published;

    if not found then
      raise exception 'No live location has been published for this truck';
    end if;
  end if;

  return published;
end;
$$;

revoke all on public.truck_live_locations from anon, authenticated;
grant select on public.truck_live_locations to anon, authenticated;

revoke all on function public.publish_live_truck_location(uuid, numeric, numeric, numeric, boolean) from public, anon;
grant execute on function public.publish_live_truck_location(uuid, numeric, numeric, numeric, boolean) to authenticated;

alter table public.truck_live_locations replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'truck_live_locations'
  ) then
    alter publication supabase_realtime add table public.truck_live_locations;
  end if;
end
$$;

commit;
