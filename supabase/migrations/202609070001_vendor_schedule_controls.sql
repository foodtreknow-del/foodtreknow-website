-- FoodTrekNow Vendor schedule controls.
-- Vendors may manage their own route placement and cancel their own confirmed booking.
-- Host-owned event details remain editable only by the Host.

begin;

create or replace function public.remove_booking_from_weekly_route(p_booking_id uuid)
returns boolean
language plpgsql security definer set search_path = public
as $$
declare removed_count integer;
begin
  if auth.uid() is null then raise exception 'Sign in as a food truck to update your schedule'; end if;

  delete from public.vendor_route_stops stop
  using public.vendor_routes route, public.opportunity_bookings booking, public.vendor_profiles vendor
  where stop.route_id = route.id
    and stop.booking_id = p_booking_id
    and booking.id = stop.booking_id
    and vendor.id = booking.vendor_profile_id
    and route.vendor_profile_id = vendor.id
    and vendor.owner_id = auth.uid();

  get diagnostics removed_count = row_count;
  return removed_count > 0;
end;
$$;

create or replace function public.cancel_vendor_opportunity_booking(
  p_booking_id uuid,
  p_reason text
)
returns public.opportunity_bookings
language plpgsql security definer set search_path = public
as $$
declare
  selected public.opportunity_bookings%rowtype;
  saved public.opportunity_bookings%rowtype;
  selected_opportunity public.opportunities%rowtype;
  selected_application public.opportunity_applications%rowtype;
  payment_status text;
  host_owner uuid;
  cancellation_reason text := trim(coalesce(p_reason, ''));
begin
  if auth.uid() is null then raise exception 'Sign in as a food truck to cancel this booking'; end if;
  if char_length(cancellation_reason) not between 3 and 500 then
    raise exception 'Please provide a cancellation reason between 3 and 500 characters';
  end if;

  select booking.* into selected
  from public.opportunity_bookings booking
  join public.vendor_profiles vendor on vendor.id = booking.vendor_profile_id
  where booking.id = p_booking_id and vendor.owner_id = auth.uid()
  for update of booking;

  if selected.id is null then raise exception 'This booking was not found for your food truck'; end if;
  if selected.status = 'cancelled_by_vendor' then return selected; end if;
  if selected.status <> 'confirmed' then raise exception 'Only a confirmed booking can be cancelled'; end if;

  select payment.status into payment_status
  from public.event_fee_payments payment
  where payment.booking_id = selected.id;

  if payment_status in ('checkout_open', 'refund_pending') then
    raise exception 'Wait for the active payment or refund process to finish before cancelling';
  end if;

  select * into selected_opportunity from public.opportunities where id = selected.opportunity_id for update;
  if selected.application_id is not null then
    select * into selected_application from public.opportunity_applications where id = selected.application_id;
  end if;
  select owner_id into host_owner from public.location_hosts where id = selected_opportunity.host_id;

  update public.opportunity_bookings
  set status = 'cancelled_by_vendor', cancelled_at = now(), updated_at = now()
  where id = selected.id
  returning * into saved;

  if selected.application_id is not null then
    update public.opportunity_applications
    set status = 'withdrawn', updated_at = now()
    where id = selected.application_id;

    insert into public.opportunity_messages (application_id, sender_id, sender_role, body)
    values (
      selected.application_id,
      auth.uid(),
      'vendor',
      'The food truck cancelled this booking. Reason: ' || cancellation_reason
    );
  end if;

  delete from public.vendor_route_stops where booking_id = selected.id;

  if selected_opportunity.status = 'filled' and (
    select count(*) from public.opportunity_bookings
    where opportunity_id = selected_opportunity.id and status = 'confirmed'
  ) < selected_opportunity.trucks_requested then
    update public.opportunities set status = 'published', updated_at = now()
    where id = selected_opportunity.id;
  end if;

  if host_owner is not null then
    insert into public.marketplace_notifications (
      profile_id, opportunity_id, kind, event_key, title, body
    ) values (
      host_owner,
      selected.opportunity_id,
      'cancellation',
      'vendor-booking-cancelled:' || selected.id,
      'Food truck cancelled booking',
      'A food truck cancelled its booking for ' || selected_opportunity.title || '. Reason: ' || cancellation_reason
    ) on conflict (profile_id, event_key) do nothing;
  end if;

  return saved;
end;
$$;

revoke all on function public.remove_booking_from_weekly_route(uuid) from public, anon;
revoke all on function public.cancel_vendor_opportunity_booking(uuid, text) from public, anon;
grant execute on function public.remove_booking_from_weekly_route(uuid) to authenticated;
grant execute on function public.cancel_vendor_opportunity_booking(uuid, text) to authenticated;

commit;
