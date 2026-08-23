-- FoodTrekNow Stripe Connect foundation.
-- Stores connected-account identifiers and safe onboarding state only.
-- Stripe secret keys and financial account details must never be stored here.

begin;

create table if not exists public.stripe_connect_accounts (
  vendor_profile_id uuid primary key references public.vendor_profiles(id) on delete cascade,
  stripe_account_id text not null unique check (stripe_account_id ~ '^acct_[A-Za-z0-9]+$'),
  status text not null default 'onboarding_required' check (
    status in ('onboarding_required', 'pending', 'active', 'restricted')
  ),
  details_submitted boolean not null default false,
  charges_enabled boolean not null default false,
  payouts_enabled boolean not null default false,
  requirements_due jsonb not null default '[]'::jsonb check (jsonb_typeof(requirements_due) = 'array'),
  disabled_reason text,
  connected_at timestamptz,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.stripe_connect_accounts is
  'Safe Stripe connected-account state. Written only by trusted server functions.';
comment on column public.stripe_connect_accounts.stripe_account_id is
  'Stripe connected account identifier. This is not an API key or secret.';

drop trigger if exists set_stripe_connect_accounts_updated_at on public.stripe_connect_accounts;
create trigger set_stripe_connect_accounts_updated_at
before update on public.stripe_connect_accounts
for each row execute function public.set_updated_at();

alter table public.stripe_connect_accounts enable row level security;

drop policy if exists stripe_connect_accounts_vendor_read on public.stripe_connect_accounts;
create policy stripe_connect_accounts_vendor_read
on public.stripe_connect_accounts
for select
using (
  public.is_admin()
  or exists (
    select 1
    from public.vendor_profiles vendor
    where vendor.id = stripe_connect_accounts.vendor_profile_id
      and vendor.owner_id = auth.uid()
  )
);

revoke all on public.stripe_connect_accounts from public, anon, authenticated;
grant select on public.stripe_connect_accounts to authenticated;

commit;
