-- Privacy-limited vendor management for FoodTrekNow administrators.
-- Administrators receive aggregate business performance only; customer identity,
-- order contents, payment credentials, and vendor banking details are excluded.

begin;

create table if not exists public.vendor_admin_controls (
  vendor_profile_id uuid primary key references public.vendor_profiles(id) on delete cascade,
  is_frozen boolean not null default false,
  freeze_reason text,
  frozen_at timestamptz,
  frozen_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (not is_frozen or length(btrim(coalesce(freeze_reason, ''))) between 3 and 500)
);

create table if not exists public.vendor_admin_control_events (
  id bigint generated always as identity primary key,
  vendor_profile_id uuid not null references public.vendor_profiles(id) on delete cascade,
  action text not null check (action in ('frozen', 'restored')),
  reason text,
  changed_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index if not exists idx_vendor_admin_control_events_vendor
  on public.vendor_admin_control_events(vendor_profile_id, created_at desc);

drop trigger if exists set_vendor_admin_controls_updated_at on public.vendor_admin_controls;
create trigger set_vendor_admin_controls_updated_at
before update on public.vendor_admin_controls
for each row execute function public.set_updated_at();

alter table public.vendor_admin_controls enable row level security;
alter table public.vendor_admin_control_events enable row level security;

drop policy if exists vendor_admin_controls_admin_read on public.vendor_admin_controls;
create policy vendor_admin_controls_admin_read on public.vendor_admin_controls
for select using (public.is_admin());

drop policy if exists vendor_admin_control_events_admin_read on public.vendor_admin_control_events;
create policy vendor_admin_control_events_admin_read on public.vendor_admin_control_events
for select using (public.is_admin());

revoke all on public.vendor_admin_controls from public, anon, authenticated;
revoke all on public.vendor_admin_control_events from public, anon, authenticated;
grant select on public.vendor_admin_controls to authenticated;
grant select on public.vendor_admin_control_events to authenticated;

create or replace function public.vendor_subscription_access_allowed(p_vendor_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not exists (
    select 1 from public.vendor_admin_controls control
    where control.vendor_profile_id = p_vendor_profile_id
      and control.is_frozen
  ) and exists (
    select 1 from public.vendor_subscriptions subscription
    where subscription.vendor_profile_id = p_vendor_profile_id
      and (
        subscription.status in ('active', 'trialing')
        or (subscription.status = 'past_due' and subscription.grace_period_ends_at > now())
      )
  );
$$;

revoke all on function public.vendor_subscription_access_allowed(uuid) from public, anon;
grant execute on function public.vendor_subscription_access_allowed(uuid) to authenticated;

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
    'freeze_reason', case when control.is_frozen then control.freeze_reason else null end
  );
end;
$$;

revoke all on function public.current_vendor_access_state() from public, anon;
grant execute on function public.current_vendor_access_state() to authenticated;

create or replace function public.admin_set_vendor_frozen(
  p_vendor_profile_id uuid,
  p_is_frozen boolean,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  vendor_name text;
  truck_name text;
begin
  if not public.is_admin() then
    raise exception 'Administrator access is required';
  end if;
  if p_is_frozen and (normalized_reason is null or length(normalized_reason) < 3) then
    raise exception 'Enter a brief reason before freezing vendor access';
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
    vendor_profile_id, is_frozen, freeze_reason, frozen_at, frozen_by
  ) values (
    p_vendor_profile_id, p_is_frozen,
    case when p_is_frozen then normalized_reason else null end,
    case when p_is_frozen then now() else null end,
    case when p_is_frozen then auth.uid() else null end
  )
  on conflict (vendor_profile_id) do update set
    is_frozen = excluded.is_frozen,
    freeze_reason = excluded.freeze_reason,
    frozen_at = excluded.frozen_at,
    frozen_by = excluded.frozen_by;

  insert into public.vendor_admin_control_events (
    vendor_profile_id, action, reason, changed_by
  ) values (
    p_vendor_profile_id,
    case when p_is_frozen then 'frozen' else 'restored' end,
    normalized_reason,
    auth.uid()
  );

  update public.trucks
  set is_active = case
    when p_is_frozen then false
    else public.vendor_subscription_access_allowed(p_vendor_profile_id)
  end
  where vendor_id = p_vendor_profile_id;

  return jsonb_build_object(
    'vendor_profile_id', p_vendor_profile_id,
    'business_name', vendor_name,
    'truck_name', truck_name,
    'is_frozen', p_is_frozen,
    'reason', case when p_is_frozen then normalized_reason else null end
  );
end;
$$;

revoke all on function public.admin_set_vendor_frozen(uuid, boolean, text) from public, anon;
grant execute on function public.admin_set_vendor_frozen(uuid, boolean, text) to authenticated;

create or replace function public.admin_vendor_management_snapshot(p_days integer default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  report_days integer := least(greatest(coalesce(p_days, 30), 1), 90);
  result jsonb;
begin
  if not public.is_admin() then
    raise exception 'Administrator access is required';
  end if;

  with vendor_rows as (
    select
      vendor.id as vendor_profile_id,
      vendor.business_name,
      truck.id as truck_id,
      coalesce(truck.name, vendor.business_name) as truck_name,
      coalesce(truck.cuisine, 'Not provided') as cuisine,
      coalesce(truck.location_name, 'Not provided') as location_name,
      coalesce(subscription.status, 'not_started') as subscription_status,
      subscription.current_period_end,
      subscription.grace_period_ends_at,
      coalesce(control.is_frozen, false) as is_frozen,
      case when control.is_frozen then control.freeze_reason else null end as freeze_reason,
      control.frozen_at,
      coalesce(truck.accepting_orders, false) as accepting_orders,
      coalesce(truck.is_active, false) as is_active
    from public.vendor_profiles vendor
    left join lateral (
      select * from public.trucks
      where vendor_id = vendor.id
      order by created_at
      limit 1
    ) truck on true
    left join public.vendor_subscriptions subscription on subscription.vendor_profile_id = vendor.id
    left join public.vendor_admin_controls control on control.vendor_profile_id = vendor.id
  ), daily as (
    select
      truck.vendor_id as vendor_profile_id,
      (orders.created_at at time zone 'America/New_York')::date as sale_date,
      count(*) filter (where orders.payment_status = 'paid' and orders.status <> 'cancelled')::integer as order_count,
      coalesce(sum(orders.total) filter (where orders.payment_status in ('paid', 'refunded')), 0)::numeric(12,2) as gross_sales,
      coalesce(sum(orders.total) filter (where orders.payment_status = 'refunded' or (orders.status = 'cancelled' and orders.payment_status = 'paid')), 0)::numeric(12,2) as refunds,
      coalesce(sum(orders.total) filter (where orders.payment_status = 'paid' and orders.status <> 'cancelled'), 0)::numeric(12,2) as net_sales,
      coalesce(sum(orders.total) filter (where orders.payment_status = 'paid' and orders.status <> 'cancelled' and orders.order_source = 'walk_up'), 0)::numeric(12,2) as cash_sales,
      coalesce(sum(orders.total) filter (where orders.payment_status = 'paid' and orders.status <> 'cancelled' and orders.order_source <> 'walk_up'), 0)::numeric(12,2) as online_sales
    from public.orders orders
    join public.trucks truck on truck.id = orders.truck_id
    where not coalesce(orders.is_test_order, false)
      and orders.created_at >= (current_date - (report_days - 1))::timestamp at time zone 'America/New_York'
    group by truck.vendor_id, (orders.created_at at time zone 'America/New_York')::date
  )
  select jsonb_build_object(
    'days', report_days,
    'generated_at', now(),
    'vendors', coalesce(jsonb_agg(
      jsonb_build_object(
        'vendorProfileId', vendor.vendor_profile_id,
        'businessName', vendor.business_name,
        'truckId', vendor.truck_id,
        'truckName', vendor.truck_name,
        'cuisine', vendor.cuisine,
        'locationName', vendor.location_name,
        'subscriptionStatus', vendor.subscription_status,
        'currentPeriodEnd', vendor.current_period_end,
        'gracePeriodEndsAt', vendor.grace_period_ends_at,
        'isFrozen', vendor.is_frozen,
        'freezeReason', vendor.freeze_reason,
        'frozenAt', vendor.frozen_at,
        'acceptingOrders', vendor.accepting_orders,
        'isActive', vendor.is_active,
        'dailySales', coalesce((
          select jsonb_agg(jsonb_build_object(
            'date', daily.sale_date,
            'orderCount', daily.order_count,
            'grossSales', daily.gross_sales,
            'refunds', daily.refunds,
            'netSales', daily.net_sales,
            'cashSales', daily.cash_sales,
            'onlineSales', daily.online_sales,
            'averageOrder', case when daily.order_count > 0 then round(daily.net_sales / daily.order_count, 2) else 0 end
          ) order by daily.sale_date desc)
          from daily where daily.vendor_profile_id = vendor.vendor_profile_id
        ), '[]'::jsonb)
      ) order by vendor.truck_name
    ), '[]'::jsonb)
  ) into result
  from vendor_rows vendor;

  return result;
end;
$$;

revoke all on function public.admin_vendor_management_snapshot(integer) from public, anon;
grant execute on function public.admin_vendor_management_snapshot(integer) to authenticated;

commit;

