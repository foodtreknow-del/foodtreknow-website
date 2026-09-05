-- FoodTrekNow Host cancellation of an approved food truck booking.
-- Paid event fees must be refunded through Stripe before this RPC completes.

begin;

create or replace function public.cancel_host_opportunity_booking(
  p_booking_id uuid,
  p_reason text default ''
)
returns public.opportunity_bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  selected public.opportunity_bookings%rowtype;
  selected_opportunity public.opportunities%rowtype;
  saved public.opportunity_bookings%rowtype;
  vendor_owner uuid;
  payment_status text;
  cancellation_reason text := trim(coalesce(p_reason, ''));
begin
  if auth.uid() is null then raise exception 'Sign in as the Host to cancel this booking'; end if;
  if char_length(cancellation_reason) < 3 then raise exception 'Enter a brief cancellation reason for the food truck'; end if;
  if char_length(cancellation_reason) > 500 then raise exception 'Cancellation reason must be 500 characters or fewer'; end if;

  select b.* into selected
  from public.opportunity_bookings b
  join public.opportunities o on o.id = b.opportunity_id
  join public.location_hosts h on h.id = o.host_id
  where b.id = p_booking_id and h.owner_id = auth.uid();

  if selected.id is null then raise exception 'Booking not found or not owned by this Host'; end if;
  if selected.status = 'cancelled_by_host' then return selected; end if;
  if selected.status <> 'confirmed' then raise exception 'Only a confirmed food truck booking can be cancelled'; end if;

  select status into payment_status
  from public.event_fee_payments
  where booking_id = selected.id;

  if payment_status = 'paid' then
    raise exception 'Refund the event payment before cancelling this food truck';
  end if;
  if payment_status = 'checkout_open' then
    raise exception 'The food truck has an active Stripe Checkout session. Try again after that short payment session expires';
  end if;

  select * into selected_opportunity from public.opportunities where id = selected.opportunity_id for update;

  update public.opportunity_bookings
  set status = 'cancelled_by_host', cancelled_at = now(), updated_at = now()
  where id = selected.id
  returning * into saved;

  if selected.application_id is not null then
    update public.opportunity_applications
    set status = 'declined',
        host_response = 'Host cancelled approved booking: ' || cancellation_reason,
        decided_at = now(),
        updated_at = now()
    where id = selected.application_id;
  end if;

  delete from public.vendor_route_stops where booking_id = selected.id;

  if payment_status in ('payment_required', 'failed') then
    update public.event_fee_payments set status = 'expired', updated_at = now() where booking_id = selected.id;
  end if;

  if selected_opportunity.status = 'filled' and selected_opportunity.ends_at > now() then
    update public.opportunities set status = 'published', updated_at = now() where id = selected_opportunity.id;
  end if;

  select owner_id into vendor_owner from public.vendor_profiles where id = selected.vendor_profile_id;
  insert into public.marketplace_notifications (
    profile_id, opportunity_id, application_id, kind, event_key, title, body
  ) values (
    vendor_owner, selected.opportunity_id, selected.application_id, 'cancellation',
    'host-booking-cancelled:' || selected.id,
    'Host cancelled your event booking',
    selected_opportunity.title || ' was cancelled by the Host. Reason: ' || cancellation_reason
  ) on conflict (profile_id, event_key) do nothing;

  return saved;
end;
$$;

revoke all on function public.cancel_host_opportunity_booking(uuid, text) from public, anon;
grant execute on function public.cancel_host_opportunity_booking(uuid, text) to authenticated;

commit;
