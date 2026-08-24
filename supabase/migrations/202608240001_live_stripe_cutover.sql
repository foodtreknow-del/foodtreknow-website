-- FoodTrekNow live Stripe cutover.
-- Preserve sandbox financial state for audit while ensuring test Stripe IDs and
-- promotional credits can never be used against live transactions.

begin;

create table if not exists public.stripe_live_cutover_log (
  cutover_key text primary key,
  completed_at timestamptz not null default now()
);

alter table public.stripe_live_cutover_log enable row level security;
revoke all on public.stripe_live_cutover_log from public, anon, authenticated;
grant select on public.stripe_live_cutover_log to service_role;

do $$
begin
  if exists (
    select 1
    from public.stripe_live_cutover_log
    where cutover_key = '20260824_live_stripe'
  ) then
    raise exception 'The FoodTrekNow live Stripe cutover has already completed';
  end if;
end;
$$;

create table if not exists public.stripe_connect_accounts_sandbox_archive_20260824
as table public.stripe_connect_accounts with no data;
create table if not exists public.vendor_subscriptions_sandbox_archive_20260824
as table public.vendor_subscriptions with no data;
create table if not exists public.vendor_credit_accounts_sandbox_archive_20260824
as table public.vendor_credit_accounts with no data;
create table if not exists public.vendor_credit_transactions_sandbox_archive_20260824
as table public.vendor_credit_transactions with no data;
create table if not exists public.stripe_webhook_events_sandbox_archive_20260824
as table public.stripe_webhook_events with no data;

alter table public.stripe_connect_accounts_sandbox_archive_20260824 enable row level security;
alter table public.vendor_subscriptions_sandbox_archive_20260824 enable row level security;
alter table public.vendor_credit_accounts_sandbox_archive_20260824 enable row level security;
alter table public.vendor_credit_transactions_sandbox_archive_20260824 enable row level security;
alter table public.stripe_webhook_events_sandbox_archive_20260824 enable row level security;

revoke all on public.stripe_connect_accounts_sandbox_archive_20260824 from public, anon, authenticated;
revoke all on public.vendor_subscriptions_sandbox_archive_20260824 from public, anon, authenticated;
revoke all on public.vendor_credit_accounts_sandbox_archive_20260824 from public, anon, authenticated;
revoke all on public.vendor_credit_transactions_sandbox_archive_20260824 from public, anon, authenticated;
revoke all on public.stripe_webhook_events_sandbox_archive_20260824 from public, anon, authenticated;
grant select on public.stripe_connect_accounts_sandbox_archive_20260824 to service_role;
grant select on public.vendor_subscriptions_sandbox_archive_20260824 to service_role;
grant select on public.vendor_credit_accounts_sandbox_archive_20260824 to service_role;
grant select on public.vendor_credit_transactions_sandbox_archive_20260824 to service_role;
grant select on public.stripe_webhook_events_sandbox_archive_20260824 to service_role;

-- The cutover guard above prevents rerunning this archive-and-clear operation
-- after live Stripe records have been created.
truncate table public.stripe_connect_accounts_sandbox_archive_20260824;
truncate table public.vendor_subscriptions_sandbox_archive_20260824;
truncate table public.vendor_credit_accounts_sandbox_archive_20260824;
truncate table public.vendor_credit_transactions_sandbox_archive_20260824;
truncate table public.stripe_webhook_events_sandbox_archive_20260824;

insert into public.stripe_connect_accounts_sandbox_archive_20260824 select * from public.stripe_connect_accounts;
insert into public.vendor_subscriptions_sandbox_archive_20260824 select * from public.vendor_subscriptions;
insert into public.vendor_credit_accounts_sandbox_archive_20260824 select * from public.vendor_credit_accounts;
insert into public.vendor_credit_transactions_sandbox_archive_20260824 select * from public.vendor_credit_transactions;
insert into public.stripe_webhook_events_sandbox_archive_20260824 select * from public.stripe_webhook_events;

-- Existing checkout and order Stripe references were created in test mode.
-- Existing rows retain false while all future rows default to live mode.
alter table public.orders add column if not exists stripe_livemode boolean not null default false;
alter table public.payment_checkout_drafts add column if not exists stripe_livemode boolean not null default false;
alter table public.orders alter column stripe_livemode set default true;
alter table public.payment_checkout_drafts alter column stripe_livemode set default true;

comment on column public.orders.stripe_livemode is
  'True only for orders paid after the production Stripe cutover.';
comment on column public.payment_checkout_drafts.stripe_livemode is
  'True only for checkout drafts created after the production Stripe cutover.';

-- Prevent a sandbox PaymentIntent from being refunded or converted into credit
-- after the application begins using live Stripe credentials.
create or replace function public.prevent_sandbox_financial_resolution()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.stripe_livemode = false
     and old.stripe_payment_intent_id is not null
     and (
       new.cancellation_resolution is distinct from old.cancellation_resolution
       or new.refund_status is distinct from old.refund_status
       or new.stripe_refund_id is distinct from old.stripe_refund_id
       or new.refunded_amount_cents is distinct from old.refunded_amount_cents
     ) then
    raise exception 'This sandbox order is read-only after the live payment cutover';
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_sandbox_financial_resolution on public.orders;
create trigger prevent_sandbox_financial_resolution
before update on public.orders
for each row execute function public.prevent_sandbox_financial_resolution();

-- Remove sandbox-only active state from production-facing tables after it has
-- been copied above. Vendors must connect and subscribe again in live mode.
delete from public.vendor_credit_transactions;
delete from public.vendor_credit_accounts;
delete from public.stripe_connect_accounts;
delete from public.vendor_subscriptions;
delete from public.stripe_webhook_events;

update public.trucks
set is_active = false
where vendor_id in (select id from public.vendor_profiles);

insert into public.stripe_live_cutover_log (cutover_key)
values ('20260824_live_stripe');

commit;
