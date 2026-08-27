-- FoodTrekNow vendor platform subscriptions.
-- Customer order payments continue to use vendor-owned Stripe Connect accounts.

begin;

create table if not exists public.vendor_subscriptions (
  vendor_profile_id uuid primary key references public.vendor_profiles(id) on delete cascade,
  stripe_customer_id text unique check (stripe_customer_id is null or stripe_customer_id ~ '^cus_[A-Za-z0-9]+$'),
  stripe_subscription_id text unique check (stripe_subscription_id is null or stripe_subscription_id ~ '^sub_[A-Za-z0-9]+$'),
  stripe_product_id text check (stripe_product_id is null or stripe_product_id ~ '^prod_[A-Za-z0-9]+$'),
  stripe_price_id text check (stripe_price_id is null or stripe_price_id ~ '^price_[A-Za-z0-9]+$'),
  status text not null default 'not_started' check (
    status in ('not_started', 'incomplete', 'incomplete_expired', 'trialing', 'active', 'past_due', 'unpaid', 'canceled', 'paused')
  ),
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  grace_period_ends_at timestamptz,
  last_invoice_status text,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.vendor_subscriptions is
  'FoodTrekNow $14.99 monthly platform subscriptions. This is separate from vendor Stripe Connect order payments.';

drop trigger if exists set_vendor_subscriptions_updated_at on public.vendor_subscriptions;
create trigger set_vendor_subscriptions_updated_at
before update on public.vendor_subscriptions
for each row execute function public.set_updated_at();

alter table public.vendor_subscriptions enable row level security;

drop policy if exists vendor_subscriptions_owner_read on public.vendor_subscriptions;
create policy vendor_subscriptions_owner_read
on public.vendor_subscriptions
for select
using (
  public.is_admin()
  or exists (
    select 1 from public.vendor_profiles vendor
    where vendor.id = vendor_subscriptions.vendor_profile_id
      and vendor.owner_id = auth.uid()
  )
);

revoke all on public.vendor_subscriptions from public, anon, authenticated;
grant select on public.vendor_subscriptions to authenticated;

create or replace function public.vendor_subscription_access_allowed(p_vendor_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
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

-- Keep vendor identity readable for billing, while requiring a paid subscription
-- for operational ownership checks used by menu, order, hours, and truck writes.
create or replace function public.owns_truck(target_truck_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.trucks truck
    join public.vendor_profiles vendor on vendor.id = truck.vendor_id
    where truck.id = target_truck_id
      and vendor.owner_id = auth.uid()
      and public.vendor_subscription_access_allowed(vendor.id)
  ) or exists (
    select 1
    from public.truck_members member
    join public.trucks truck on truck.id = member.truck_id
    where member.truck_id = target_truck_id
      and member.profile_id = auth.uid()
      and public.vendor_subscription_access_allowed(truck.vendor_id)
  ) or public.is_admin();
$$;

drop policy if exists trucks_public_read on public.trucks;
create policy trucks_public_read on public.trucks for select
using (
  is_active
  or public.owns_truck(id)
);

create or replace function public.enforce_truck_subscription_activation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.is_active and not public.vendor_subscription_access_allowed(new.vendor_id) then
    new.is_active := false;
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_truck_subscription_activation on public.trucks;
create trigger enforce_truck_subscription_activation
before insert or update of is_active on public.trucks
for each row execute function public.enforce_truck_subscription_activation();

-- Existing approved vendors must activate billing before appearing in the
-- customer marketplace. Webhook/status synchronization reactivates the truck.
update public.trucks truck
set is_active = false
where not public.vendor_subscription_access_allowed(truck.vendor_id);

commit;
