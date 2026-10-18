-- Enforce one FoodTrekNow administrator and hard tenant boundaries for every portal.
-- Give each food truck its own independent order-number sequence beginning at 1001.

begin;

create table if not exists public.platform_administrator (
  singleton boolean primary key default true check (singleton),
  profile_id uuid not null unique references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.platform_administrator enable row level security;
revoke all on public.platform_administrator from public, anon, authenticated;
grant select, insert, update on public.platform_administrator to service_role;

do $$
declare selected_admin uuid;
begin
  select application.reviewed_by into selected_admin
  from public.vendor_applications application
  join public.profiles profile on profile.id = application.reviewed_by
  where application.status = 'approved'
    and application.reviewed_by is not null
    and profile.role = 'admin'::public.app_role
  order by application.reviewed_at desc nulls last
  limit 1;

  if selected_admin is null then
    select profile.id into selected_admin
    from public.profiles profile
    where profile.role = 'admin'::public.app_role
    order by profile.created_at
    limit 1;
  end if;

  if selected_admin is null then
    raise exception 'A FoodTrekNow administrator must exist before tenant isolation can be enabled';
  end if;

  insert into public.platform_administrator (singleton, profile_id)
  values (true, selected_admin)
  on conflict (singleton) do update set
    profile_id = excluded.profile_id,
    updated_at = now();
end
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.platform_administrator administrator
    where administrator.singleton
      and administrator.profile_id = auth.uid()
  );
$$;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- One vendor login owns exactly one vendor profile and one food truck.
create unique index if not exists ux_trucks_one_truck_per_vendor
  on public.trucks(vendor_id);

create or replace function public.protect_vendor_profile_owner()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.owner_id is distinct from old.owner_id then
    raise exception 'A vendor profile cannot be transferred between accounts';
  end if;
  return new;
end;
$$;

create or replace function public.protect_truck_vendor()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.vendor_id is distinct from old.vendor_id then
    raise exception 'A food truck cannot be transferred between vendor accounts';
  end if;
  return new;
end;
$$;

create or replace function public.protect_host_owner()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.owner_id is distinct from old.owner_id then
    raise exception 'A Host profile cannot be transferred between accounts';
  end if;
  return new;
end;
$$;

create or replace function public.protect_host_location_owner()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.host_id is distinct from old.host_id then
    raise exception 'A Host location cannot be transferred between Host accounts';
  end if;
  return new;
end;
$$;

create or replace function public.protect_order_tenant()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.customer_id is distinct from old.customer_id
    or new.truck_id is distinct from old.truck_id then
    raise exception 'An order cannot be transferred between customer or food truck accounts';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_vendor_profile_owner on public.vendor_profiles;
create trigger protect_vendor_profile_owner before update on public.vendor_profiles
for each row execute function public.protect_vendor_profile_owner();
drop trigger if exists protect_truck_vendor on public.trucks;
create trigger protect_truck_vendor before update on public.trucks
for each row execute function public.protect_truck_vendor();
drop trigger if exists protect_host_owner on public.location_hosts;
create trigger protect_host_owner before update on public.location_hosts
for each row execute function public.protect_host_owner();
drop trigger if exists protect_host_location_owner on public.host_locations;
create trigger protect_host_location_owner before update on public.host_locations
for each row execute function public.protect_host_location_owner();
drop trigger if exists protect_order_tenant on public.orders;
create trigger protect_order_tenant before update on public.orders
for each row execute function public.protect_order_tenant();

-- Replace the shared global order sequence with one counter per food truck.
create table if not exists public.truck_order_counters (
  truck_id uuid primary key references public.trucks(id) on delete cascade,
  next_order_number bigint not null default 1001 check (next_order_number >= 1001),
  updated_at timestamptz not null default now()
);

alter table public.truck_order_counters enable row level security;
revoke all on public.truck_order_counters from public, anon, authenticated;
grant select, insert, update on public.truck_order_counters to service_role;

insert into public.truck_order_counters (truck_id, next_order_number)
select truck.id, greatest(coalesce(max(orders.order_number), 1000) + 1, 1001)
from public.trucks truck
left join public.orders orders on orders.truck_id = truck.id
group by truck.id
on conflict (truck_id) do update set
  next_order_number = greatest(public.truck_order_counters.next_order_number, excluded.next_order_number),
  updated_at = now();

alter table public.orders alter column order_number drop default;
alter table public.orders drop constraint if exists orders_order_number_key;
drop index if exists public.orders_order_number_key;
create unique index if not exists ux_orders_truck_order_number
  on public.orders(truck_id, order_number);

create or replace function public.assign_truck_order_number()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.truck_order_counters (truck_id, next_order_number)
  values (new.truck_id, 1002)
  on conflict (truck_id) do update set
    next_order_number = public.truck_order_counters.next_order_number + 1,
    updated_at = now()
  returning next_order_number - 1 into new.order_number;
  return new;
end;
$$;

drop trigger if exists assign_truck_order_number on public.orders;
create trigger assign_truck_order_number
before insert on public.orders
for each row execute function public.assign_truck_order_number();

-- This approved test truck is expected to accept no-charge tester orders.
update public.trucks
set accepting_orders = true
where id = '3ad55a9b-57ab-49cf-8127-110b7adacbab'::uuid
  and vendor_id = 'ad2b9aa0-c342-4fdc-afe4-330d1a48f3ab'::uuid;

commit;
