-- Secure contact exchange for confirmed Host and food truck bookings.
-- Contact details remain private until both parties have a confirmed booking.

create or replace function public.get_marketplace_booking_contacts(p_booking_id uuid)
returns table (
  booking_id uuid,
  host_name text,
  host_business_name text,
  host_email text,
  host_phone text,
  truck_name text,
  truck_email text,
  truck_phone text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Sign in to view booking contacts';
  end if;

  return query
  select
    b.id,
    h.host_name,
    h.business_name,
    h.contact_email,
    h.contact_phone,
    t.name,
    coalesce(nullif(t.contact_email, ''), nullif(v.contact_email, '')),
    coalesce(nullif(t.contact_mobile, ''), nullif(v.contact_mobile, ''))
  from public.opportunity_bookings b
  join public.opportunities o on o.id = b.opportunity_id
  join public.location_hosts h on h.id = o.host_id
  join public.vendor_profiles v on v.id = b.vendor_profile_id
  join public.trucks t on t.id = b.truck_id
  where b.id = p_booking_id
    and b.status = 'confirmed'
    and (
      h.owner_id = auth.uid()
      or v.owner_id = auth.uid()
      or public.is_admin()
    );

  if not found then
    raise exception 'Confirmed booking not found or access denied';
  end if;
end;
$$;

revoke all on function public.get_marketplace_booking_contacts(uuid) from public, anon;
grant execute on function public.get_marketplace_booking_contacts(uuid) to authenticated;
