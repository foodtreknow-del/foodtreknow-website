-- FoodTrekNow independent vendor unread state for Applications, Messages, and Bookings.

begin;

alter table public.opportunity_messages
  add column if not exists vendor_applications_read_at timestamptz,
  add column if not exists vendor_messages_read_at timestamptz,
  add column if not exists vendor_bookings_read_at timestamptz;

-- Preserve messages the vendor had already read before independent section tracking.
update public.opportunity_messages
set vendor_applications_read_at = coalesce(vendor_applications_read_at, read_at),
    vendor_messages_read_at = coalesce(vendor_messages_read_at, read_at),
    vendor_bookings_read_at = coalesce(vendor_bookings_read_at, read_at)
where sender_role = 'host' and read_at is not null;

create or replace function public.mark_vendor_opportunity_section_read(
  p_application_id uuid,
  p_section text
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  selected public.opportunity_applications%rowtype;
  changed integer;
begin
  if auth.uid() is null then raise exception 'Sign in to read opportunity messages'; end if;
  if p_section not in ('applications', 'messages', 'bookings') then raise exception 'Message section is invalid'; end if;

  select * into selected from public.opportunity_applications where id = p_application_id;
  if selected.id is null then raise exception 'Application not found'; end if;
  if not public.owns_marketplace_vendor(selected.vendor_profile_id) then
    raise exception 'Only the food truck can update its unread messages';
  end if;

  if p_section = 'applications' then
    update public.opportunity_messages
    set vendor_applications_read_at = now()
    where application_id = selected.id and sender_role = 'host' and vendor_applications_read_at is null;
  elsif p_section = 'messages' then
    update public.opportunity_messages
    set vendor_messages_read_at = now()
    where application_id = selected.id and sender_role = 'host' and vendor_messages_read_at is null;
  else
    update public.opportunity_messages
    set vendor_bookings_read_at = now()
    where application_id = selected.id and sender_role = 'host' and vendor_bookings_read_at is null;
  end if;

  get diagnostics changed = row_count;
  return changed;
end;
$$;

revoke all on function public.mark_vendor_opportunity_section_read(uuid, text) from public, anon;
grant execute on function public.mark_vendor_opportunity_section_read(uuid, text) to authenticated;

commit;
