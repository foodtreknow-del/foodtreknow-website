-- Administrator-controlled health-permit verification for approved food trucks.
-- Vendors can see the resulting status but cannot approve or remove it themselves.

begin;

alter table public.vendor_admin_controls
  add column if not exists health_permit_verified boolean not null default false,
  add column if not exists health_permit_verified_at timestamptz,
  add column if not exists health_permit_verified_by uuid references public.profiles(id) on delete set null;

create table if not exists public.vendor_health_permit_events (
  id bigint generated always as identity primary key,
  vendor_profile_id uuid not null references public.vendor_profiles(id) on delete cascade,
  is_verified boolean not null,
  changed_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index if not exists idx_vendor_health_permit_events_vendor
  on public.vendor_health_permit_events(vendor_profile_id, created_at desc);

alter table public.vendor_health_permit_events enable row level security;

drop policy if exists vendor_health_permit_events_admin_read on public.vendor_health_permit_events;
create policy vendor_health_permit_events_admin_read on public.vendor_health_permit_events
for select using (public.is_admin());

revoke all on public.vendor_health_permit_events from public, anon, authenticated;
grant select on public.vendor_health_permit_events to authenticated;

create or replace function public.admin_set_vendor_health_permit_verified(
  p_vendor_profile_id uuid,
  p_is_verified boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  vendor_name text;
  truck_name text;
  changed_at timestamptz := now();
begin
  if not public.is_admin() then
    raise exception 'Administrator access is required';
  end if;

  select vendor.business_name, truck.name
    into vendor_name, truck_name
  from public.vendor_profiles vendor
  left join lateral (
    select name from public.trucks
    where vendor_id = vendor.id
    order by created_at
    limit 1
  ) truck on true
  where vendor.id = p_vendor_profile_id;

  if vendor_name is null then
    raise exception 'Vendor profile not found';
  end if;

  insert into public.vendor_admin_controls (
    vendor_profile_id,
    health_permit_verified,
    health_permit_verified_at,
    health_permit_verified_by
  ) values (
    p_vendor_profile_id,
    p_is_verified,
    case when p_is_verified then changed_at else null end,
    case when p_is_verified then auth.uid() else null end
  )
  on conflict (vendor_profile_id) do update set
    health_permit_verified = excluded.health_permit_verified,
    health_permit_verified_at = excluded.health_permit_verified_at,
    health_permit_verified_by = excluded.health_permit_verified_by;

  insert into public.vendor_health_permit_events (
    vendor_profile_id, is_verified, changed_by
  ) values (
    p_vendor_profile_id, p_is_verified, auth.uid()
  );

  return jsonb_build_object(
    'vendorProfileId', p_vendor_profile_id,
    'businessName', vendor_name,
    'truckName', truck_name,
    'healthPermitVerified', p_is_verified,
    'healthPermitVerifiedAt', case when p_is_verified then changed_at else null end
  );
end;
$$;

revoke all on function public.admin_set_vendor_health_permit_verified(uuid, boolean) from public, anon;
grant execute on function public.admin_set_vendor_health_permit_verified(uuid, boolean) to authenticated;

create or replace function public.admin_vendor_health_permit_statuses()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  if not public.is_admin() then
    raise exception 'Administrator access is required';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'vendorProfileId', vendor.id,
    'healthPermitVerified', coalesce(control.health_permit_verified, false),
    'healthPermitVerifiedAt', control.health_permit_verified_at
  ) order by vendor.id), '[]'::jsonb)
  into result
  from public.vendor_profiles vendor
  left join public.vendor_admin_controls control on control.vendor_profile_id = vendor.id;

  return result;
end;
$$;

revoke all on function public.admin_vendor_health_permit_statuses() from public, anon;
grant execute on function public.admin_vendor_health_permit_statuses() to authenticated;

create or replace function public.current_vendor_access_state()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  vendor_id uuid;
  control public.vendor_admin_controls%rowtype;
begin
  select id into vendor_id
  from public.vendor_profiles
  where owner_id = auth.uid();

  if vendor_id is null then
    raise exception 'Only an approved vendor can check platform access';
  end if;

  select * into control
  from public.vendor_admin_controls
  where vendor_profile_id = vendor_id;

  return jsonb_build_object(
    'access_allowed', public.vendor_subscription_access_allowed(vendor_id),
    'admin_frozen', coalesce(control.is_frozen, false),
    'freeze_reason', case when control.is_frozen then control.freeze_reason else null end,
    'health_permit_verified', coalesce(control.health_permit_verified, false),
    'health_permit_verified_at', control.health_permit_verified_at
  );
end;
$$;

revoke all on function public.current_vendor_access_state() from public, anon;
grant execute on function public.current_vendor_access_state() to authenticated;

commit;
