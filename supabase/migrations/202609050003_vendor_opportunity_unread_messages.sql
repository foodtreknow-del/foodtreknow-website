-- FoodTrekNow unread tracking for Host/vendor opportunity conversations.

begin;

create or replace function public.mark_opportunity_messages_read(p_application_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  selected public.opportunity_applications%rowtype;
  reader_role text;
  changed integer;
begin
  if auth.uid() is null then raise exception 'Sign in to read opportunity messages'; end if;

  select * into selected from public.opportunity_applications where id = p_application_id;
  if selected.id is null then raise exception 'Application not found'; end if;

  if public.owns_marketplace_vendor(selected.vendor_profile_id) then
    reader_role := 'vendor';
  elsif public.host_owns_opportunity(selected.opportunity_id) then
    reader_role := 'host';
  else
    raise exception 'Only the vendor and host can read this event conversation';
  end if;

  update public.opportunity_messages
  set read_at = now()
  where application_id = selected.id and sender_role <> reader_role and read_at is null;
  get diagnostics changed = row_count;
  return changed;
end;
$$;

revoke all on function public.mark_opportunity_messages_read(uuid) from public, anon;
grant execute on function public.mark_opportunity_messages_read(uuid) to authenticated;

commit;
