-- FoodTrekNow vendor event alerts and no-charge test event-fee support.

begin;

alter table public.event_fee_payments
  add column if not exists is_test_payment boolean not null default false,
  add column if not exists payment_label text;

comment on column public.event_fee_payments.is_test_payment is
  'True only for an approved no-charge test payment; no Stripe funds moved.';

alter table public.marketplace_notifications drop constraint if exists marketplace_notifications_kind_check;
alter table public.marketplace_notifications add constraint marketplace_notifications_kind_check check (
  kind in ('nearby_opportunity', 'application', 'booking', 'message', 'reminder', 'cancellation', 'recurring', 'review', 'payment', 'logistics')
);

create or replace function public.notify_nearby_vendors_of_opportunity()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare selected_location public.host_locations%rowtype;
begin
  if new.status <> 'published' then return new; end if;
  if tg_op = 'UPDATE' and old.status = 'published' and old.starts_at is not distinct from new.starts_at then return new; end if;

  select * into selected_location from public.host_locations where id = new.location_id;

  insert into public.marketplace_notifications (profile_id, opportunity_id, kind, event_key, title, body)
  select distinct vendor.owner_id, new.id, 'nearby_opportunity', 'host-opportunity:' || new.id,
    'A Host is looking for food trucks',
    new.title || ' at ' || coalesce(selected_location.name, 'a Host location') ||
      ' on ' || to_char(new.starts_at at time zone 'America/New_York', 'Mon FMDD, YYYY at FMHH12:MI AM') ||
      ' is accepting food trucks.'
  from public.vendor_profiles vendor
  where exists (
    select 1 from public.trucks truck
    where truck.vendor_id = vendor.id and truck.is_active
  )
  on conflict (profile_id, event_key) do nothing;

  return new;
end;
$$;

commit;
