-- Make Host event edits and vendor notifications one reliable transaction.
-- If a connected vendor cannot be alerted, the edit fails visibly instead of
-- reporting success while silently losing its message or notification.

begin;

create or replace function public.notify_vendors_of_opportunity_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  changed_labels text[] := '{}';
  change_summary text;
  host_owner uuid;
begin
  if old.title is distinct from new.title then changed_labels := array_append(changed_labels, 'event name'); end if;
  if old.location_id is distinct from new.location_id then changed_labels := array_append(changed_labels, 'location'); end if;
  if old.starts_at is distinct from new.starts_at or old.ends_at is distinct from new.ends_at or old.arrival_time is distinct from new.arrival_time then changed_labels := array_append(changed_labels, 'date or time'); end if;
  if old.description is distinct from new.description then changed_labels := array_append(changed_labels, 'description'); end if;
  if old.event_type is distinct from new.event_type or old.opportunity_type is distinct from new.opportunity_type then changed_labels := array_append(changed_labels, 'event type'); end if;
  if old.booking_mode is distinct from new.booking_mode then changed_labels := array_append(changed_labels, 'booking method'); end if;
  if old.expected_customers is distinct from new.expected_customers then changed_labels := array_append(changed_labels, 'expected customers'); end if;
  if old.trucks_requested is distinct from new.trucks_requested then changed_labels := array_append(changed_labels, 'food truck spaces'); end if;
  if old.cuisine_preferences is distinct from new.cuisine_preferences then changed_labels := array_append(changed_labels, 'requested cuisines'); end if;
  if old.indoor_outdoor is distinct from new.indoor_outdoor then changed_labels := array_append(changed_labels, 'indoor/outdoor setting'); end if;
  if old.flat_vendor_fee is distinct from new.flat_vendor_fee or old.sales_percentage is distinct from new.sales_percentage or old.refundable_deposit is distinct from new.refundable_deposit or old.minimum_sales_guarantee is distinct from new.minimum_sales_guarantee then changed_labels := array_append(changed_labels, 'fees or sales guarantee'); end if;
  if old.electricity_available is distinct from new.electricity_available or old.water_available is distinct from new.water_available then changed_labels := array_append(changed_labels, 'available utilities'); end if;
  if old.parking_instructions is distinct from new.parking_instructions or old.setup_instructions is distinct from new.setup_instructions or old.special_requirements is distinct from new.special_requirements then changed_labels := array_append(changed_labels, 'instructions or requirements'); end if;
  if old.cancellation_policy is distinct from new.cancellation_policy then changed_labels := array_append(changed_labels, 'cancellation policy'); end if;

  if cardinality(changed_labels) = 0 then return new; end if;

  select owner_id into host_owner
  from public.location_hosts
  where id = new.host_id;

  if host_owner is null then
    raise exception 'The Host account for this event could not be found';
  end if;

  change_summary := left(
    'The Host updated ' || array_to_string(changed_labels, ', ') || ' for ' || new.title ||
    '. Open this event to review the latest information.',
    1000
  );

  insert into public.opportunity_messages (application_id, sender_id, sender_role, body)
  select a.id, host_owner, 'host', change_summary
  from public.opportunity_applications a
  where a.opportunity_id = new.id
    and (
      a.status in ('pending', 'waitlisted', 'approved')
      or exists (
        select 1
        from public.opportunity_bookings b
        where b.application_id = a.id and b.status = 'confirmed'
      )
    );

  insert into public.marketplace_notifications (
    profile_id, opportunity_id, application_id, kind, event_key, title, body
  )
  select
    v.owner_id,
    new.id,
    a.id,
    'message',
    'opportunity-updated:' || new.id || ':' || a.id || ':' ||
      to_char(clock_timestamp(), 'YYYYMMDDHH24MISSUS'),
    'Opportunity updated',
    change_summary
  from public.opportunity_applications a
  join public.vendor_profiles v on v.id = a.vendor_profile_id
  where a.opportunity_id = new.id
    and (
      a.status in ('pending', 'waitlisted', 'approved')
      or exists (
        select 1
        from public.opportunity_bookings b
        where b.application_id = a.id and b.status = 'confirmed'
      )
    )
  on conflict (profile_id, event_key) do nothing;

  return new;
end;
$$;

drop trigger if exists notify_vendors_of_opportunity_update on public.opportunities;
create trigger notify_vendors_of_opportunity_update
after update of
  title, location_id, starts_at, ends_at, arrival_time, description, opportunity_type,
  event_type, booking_mode, expected_customers, trucks_requested, cuisine_preferences,
  indoor_outdoor, flat_vendor_fee, sales_percentage, minimum_sales_guarantee,
  refundable_deposit, electricity_available, water_available, parking_instructions,
  setup_instructions, special_requirements, cancellation_policy
on public.opportunities
for each row execute function public.notify_vendors_of_opportunity_update();

revoke all on function public.notify_vendors_of_opportunity_update() from public, anon, authenticated;

commit;
