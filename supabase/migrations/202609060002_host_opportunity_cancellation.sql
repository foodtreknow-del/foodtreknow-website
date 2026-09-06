-- Host cancellation of an entire posted opportunity.
-- Every connected food truck receives an event-specific message and notification.

begin;

create or replace function public.cancel_host_opportunity(
  p_opportunity_id uuid,
  p_reason text
)
returns public.opportunities
language plpgsql
security definer
set search_path = public
as $$
declare
  selected public.opportunities%rowtype;
  saved public.opportunities%rowtype;
  affected record;
  cancellation_reason text := trim(coalesce(p_reason, ''));
begin
  if auth.uid() is null then raise exception 'Sign in as the Host to cancel this opportunity'; end if;
  if char_length(cancellation_reason) < 3 then raise exception 'Enter a reason for cancelling the event'; end if;
  if char_length(cancellation_reason) > 600 then raise exception 'Cancellation reason must be 600 characters or fewer'; end if;

  select o.* into selected
  from public.opportunities o
  join public.location_hosts h on h.id = o.host_id
  where o.id = p_opportunity_id and h.owner_id = auth.uid()
  for update of o;

  if selected.id is null then raise exception 'Posted opportunity not found or not owned by this Host'; end if;
  if selected.status = 'cancelled' then return selected; end if;
  if selected.status not in ('published', 'filled') then raise exception 'Only a posted opportunity can be cancelled'; end if;

  if exists (
    select 1
    from public.event_fee_payments p
    join public.opportunity_bookings b on b.id = p.booking_id
    where b.opportunity_id = selected.id and p.status = 'paid'
  ) then
    raise exception 'Refund all paid food truck event fees before cancelling this opportunity';
  end if;

  if exists (
    select 1
    from public.event_fee_payments p
    join public.opportunity_bookings b on b.id = p.booking_id
    where b.opportunity_id = selected.id and p.status = 'checkout_open'
  ) then
    raise exception 'A food truck has an active Stripe Checkout session. Try again after that short payment session expires';
  end if;

  for affected in
    select a.id, v.owner_id as vendor_owner
    from public.opportunity_applications a
    join public.vendor_profiles v on v.id = a.vendor_profile_id
    where a.opportunity_id = selected.id
      and a.status in ('pending', 'waitlisted', 'approved')
  loop
    update public.opportunity_applications
    set status = 'cancelled',
        host_response = 'Host cancelled event: ' || cancellation_reason,
        decided_at = now(),
        updated_at = now()
    where id = affected.id;

    insert into public.opportunity_messages (application_id, sender_id, sender_role, body)
    values (
      affected.id,
      auth.uid(),
      'host',
      'The Host cancelled ' || selected.title || '. Reason: ' || cancellation_reason
    );

    insert into public.marketplace_notifications (
      profile_id, opportunity_id, application_id, kind, event_key, title, body
    ) values (
      affected.vendor_owner,
      selected.id,
      affected.id,
      'cancellation',
      'host-opportunity-cancelled:' || selected.id || ':' || affected.id,
      'Event cancelled by Host',
      selected.title || ' was cancelled. Reason: ' || cancellation_reason
    ) on conflict (profile_id, event_key) do nothing;
  end loop;

  update public.opportunity_bookings
  set status = 'cancelled_by_host', cancelled_at = now(), updated_at = now()
  where opportunity_id = selected.id and status = 'confirmed';

  delete from public.vendor_route_stops
  where booking_id in (
    select id from public.opportunity_bookings where opportunity_id = selected.id
  );

  update public.event_fee_payments p
  set status = 'expired', updated_at = now()
  from public.opportunity_bookings b
  where b.id = p.booking_id
    and b.opportunity_id = selected.id
    and p.status in ('payment_required', 'failed');

  update public.opportunities
  set status = 'cancelled', archived_at = now(), updated_at = now()
  where id = selected.id
  returning * into saved;

  return saved;
end;
$$;

revoke all on function public.cancel_host_opportunity(uuid, text) from public, anon;
grant execute on function public.cancel_host_opportunity(uuid, text) to authenticated;

commit;
