-- FoodTrekNow host event-fee payments.
-- Hosts receive flat event fees and refundable deposits as direct Stripe charges.
-- Stripe secrets and card details are never stored in the database.

begin;

alter table public.marketplace_notifications drop constraint if exists marketplace_notifications_kind_check;
alter table public.marketplace_notifications add constraint marketplace_notifications_kind_check check (
  kind in ('nearby_opportunity', 'application', 'booking', 'message', 'reminder', 'cancellation', 'recurring', 'review', 'payment')
);

create table if not exists public.host_stripe_connect_accounts (
  host_id uuid primary key references public.location_hosts(id) on delete cascade,
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

create table if not exists public.event_fee_payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.opportunity_bookings(id) on delete cascade,
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  host_id uuid not null references public.location_hosts(id) on delete cascade,
  vendor_profile_id uuid not null references public.vendor_profiles(id) on delete cascade,
  truck_id uuid not null references public.trucks(id) on delete cascade,
  currency text not null default 'usd' check (currency ~ '^[a-z]{3}$'),
  flat_fee_cents integer not null default 0 check (flat_fee_cents >= 0),
  refundable_deposit_cents integer not null default 0 check (refundable_deposit_cents >= 0),
  amount_due_cents integer not null check (
    amount_due_cents = flat_fee_cents + refundable_deposit_cents and amount_due_cents > 0
  ),
  sales_percentage numeric(5,2) not null default 0 check (sales_percentage between 0 and 100),
  status text not null default 'payment_required' check (
    status in ('payment_required', 'checkout_open', 'paid', 'refund_pending', 'refunded', 'expired', 'failed')
  ),
  checkout_attempts integer not null default 0 check (checkout_attempts >= 0),
  stripe_account_id text check (stripe_account_id is null or stripe_account_id ~ '^acct_[A-Za-z0-9]+$'),
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text,
  stripe_charge_id text,
  stripe_refund_id text,
  receipt_url text check (receipt_url is null or receipt_url ~ '^https://'),
  paid_at timestamptz,
  refunded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.host_stripe_connect_accounts is
  'Safe Stripe onboarding state for Hosts receiving event fees. Server-written only.';
comment on table public.event_fee_payments is
  'Server-calculated flat event fees and refundable deposits. Card details are held only by Stripe.';
comment on column public.event_fee_payments.sales_percentage is
  'Snapshot for post-event settlement; it is not included in the pre-event Stripe Checkout amount.';

drop trigger if exists set_host_stripe_connect_accounts_updated_at on public.host_stripe_connect_accounts;
create trigger set_host_stripe_connect_accounts_updated_at
before update on public.host_stripe_connect_accounts
for each row execute function public.set_updated_at();

drop trigger if exists set_event_fee_payments_updated_at on public.event_fee_payments;
create trigger set_event_fee_payments_updated_at
before update on public.event_fee_payments
for each row execute function public.set_updated_at();

create or replace function public.create_event_fee_payment_for_booking()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare selected_opportunity public.opportunities%rowtype; flat_cents integer; deposit_cents integer;
begin
  select * into selected_opportunity from public.opportunities where id = new.opportunity_id;
  flat_cents := round(coalesce(selected_opportunity.flat_vendor_fee, 0) * 100)::integer;
  deposit_cents := round(coalesce(selected_opportunity.refundable_deposit, 0) * 100)::integer;
  if flat_cents + deposit_cents > 0 then
    insert into public.event_fee_payments (
      booking_id, opportunity_id, host_id, vendor_profile_id, truck_id,
      flat_fee_cents, refundable_deposit_cents, amount_due_cents, sales_percentage
    ) values (
      new.id, new.opportunity_id, selected_opportunity.host_id, new.vendor_profile_id, new.truck_id,
      flat_cents, deposit_cents, flat_cents + deposit_cents, coalesce(selected_opportunity.sales_percentage, 0)
    ) on conflict (booking_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists create_event_fee_payment_after_booking on public.opportunity_bookings;
create trigger create_event_fee_payment_after_booking
after insert on public.opportunity_bookings
for each row execute function public.create_event_fee_payment_for_booking();

insert into public.event_fee_payments (
  booking_id, opportunity_id, host_id, vendor_profile_id, truck_id,
  flat_fee_cents, refundable_deposit_cents, amount_due_cents, sales_percentage
)
select b.id, b.opportunity_id, o.host_id, b.vendor_profile_id, b.truck_id,
  round(coalesce(o.flat_vendor_fee, 0) * 100)::integer,
  round(coalesce(o.refundable_deposit, 0) * 100)::integer,
  round((coalesce(o.flat_vendor_fee, 0) + coalesce(o.refundable_deposit, 0)) * 100)::integer,
  coalesce(o.sales_percentage, 0)
from public.opportunity_bookings b
join public.opportunities o on o.id = b.opportunity_id
where coalesce(o.flat_vendor_fee, 0) + coalesce(o.refundable_deposit, 0) > 0
on conflict (booking_id) do nothing;

create or replace function public.finalize_event_fee_payment(
  p_payment_id uuid,
  p_checkout_session_id text,
  p_payment_intent_id text,
  p_charge_id text,
  p_amount_paid_cents integer,
  p_receipt_url text default null
)
returns public.event_fee_payments
language plpgsql security definer set search_path = public
as $$
declare selected public.event_fee_payments%rowtype; saved public.event_fee_payments%rowtype; host_owner uuid; vendor_owner uuid;
begin
  select * into selected from public.event_fee_payments where id = p_payment_id for update;
  if selected.id is null then raise exception 'Event fee payment was not found'; end if;
  if selected.stripe_checkout_session_id is distinct from p_checkout_session_id then raise exception 'Stripe Checkout session does not match'; end if;
  if selected.amount_due_cents <> p_amount_paid_cents then raise exception 'Stripe payment amount does not match the event fee'; end if;
  if selected.status = 'refunded' then return selected; end if;

  update public.event_fee_payments set
    status = 'paid',
    stripe_payment_intent_id = nullif(p_payment_intent_id, ''),
    stripe_charge_id = nullif(p_charge_id, ''),
    receipt_url = coalesce(nullif(p_receipt_url, ''), receipt_url),
    paid_at = coalesce(paid_at, now())
  where id = selected.id returning * into saved;

  select owner_id into host_owner from public.location_hosts where id = saved.host_id;
  select owner_id into vendor_owner from public.vendor_profiles where id = saved.vendor_profile_id;
  insert into public.marketplace_notifications (profile_id, opportunity_id, kind, event_key, title, body)
  values
    (host_owner, saved.opportunity_id, 'payment', 'event-fee-paid-host:' || saved.id, 'Event fee paid', 'The approved food truck paid the event fee and deposit.'),
    (vendor_owner, saved.opportunity_id, 'payment', 'event-fee-paid-vendor:' || saved.id, 'Event payment confirmed', 'Your event fee payment was received by the Host.')
  on conflict (profile_id, event_key) do nothing;
  return saved;
end;
$$;

create or replace function public.complete_event_fee_refund(
  p_payment_id uuid,
  p_refund_id text,
  p_refunded_cents integer,
  p_succeeded boolean,
  p_failure text default null
)
returns public.event_fee_payments
language plpgsql security definer set search_path = public
as $$
declare selected public.event_fee_payments%rowtype; saved public.event_fee_payments%rowtype; host_owner uuid; vendor_owner uuid;
begin
  select * into selected from public.event_fee_payments where id = p_payment_id for update;
  if selected.id is null then raise exception 'Event fee payment was not found'; end if;
  if p_succeeded and p_refunded_cents <> selected.amount_due_cents then raise exception 'Only a full event-fee refund is supported'; end if;
  update public.event_fee_payments set
    status = case when p_succeeded then 'refunded' else 'paid' end,
    stripe_refund_id = case when p_succeeded then nullif(p_refund_id, '') else stripe_refund_id end,
    refunded_at = case when p_succeeded then coalesce(refunded_at, now()) else refunded_at end
  where id = selected.id returning * into saved;
  if p_succeeded then
    select owner_id into host_owner from public.location_hosts where id = saved.host_id;
    select owner_id into vendor_owner from public.vendor_profiles where id = saved.vendor_profile_id;
    insert into public.marketplace_notifications (profile_id, opportunity_id, kind, event_key, title, body)
    values
      (host_owner, saved.opportunity_id, 'payment', 'event-fee-refunded-host:' || saved.id, 'Event payment refunded', 'The full event fee and refundable deposit were returned.'),
      (vendor_owner, saved.opportunity_id, 'payment', 'event-fee-refunded-vendor:' || saved.id, 'Event refund issued', 'The Host refunded your full event fee and deposit through Stripe.')
    on conflict (profile_id, event_key) do nothing;
  end if;
  return saved;
end;
$$;

alter table public.host_stripe_connect_accounts enable row level security;
alter table public.event_fee_payments enable row level security;

drop policy if exists host_stripe_connect_accounts_owner_read on public.host_stripe_connect_accounts;
create policy host_stripe_connect_accounts_owner_read on public.host_stripe_connect_accounts
for select using (public.is_host_owner(host_id) or public.is_admin());

drop policy if exists event_fee_payments_participant_read on public.event_fee_payments;
create policy event_fee_payments_participant_read on public.event_fee_payments
for select using (
  public.is_host_owner(host_id) or public.owns_marketplace_vendor(vendor_profile_id) or public.is_admin()
);

revoke all on public.host_stripe_connect_accounts, public.event_fee_payments from public, anon, authenticated;
grant select on public.host_stripe_connect_accounts, public.event_fee_payments to authenticated;

revoke all on function public.create_event_fee_payment_for_booking() from public, anon, authenticated;
revoke all on function public.finalize_event_fee_payment(uuid, text, text, text, integer, text) from public, anon, authenticated;
revoke all on function public.complete_event_fee_refund(uuid, text, integer, boolean, text) from public, anon, authenticated;
grant execute on function public.finalize_event_fee_payment(uuid, text, text, text, integer, text) to service_role;
grant execute on function public.complete_event_fee_refund(uuid, text, integer, boolean, text) to service_role;

alter table public.event_fee_payments replica identity full;
do $$
begin
  if not exists (
    select 1 from pg_publication_tables where pubname = 'supabase_realtime'
      and schemaname = 'public' and tablename = 'event_fee_payments'
  ) then
    alter publication supabase_realtime add table public.event_fee_payments;
  end if;
end $$;

commit;
