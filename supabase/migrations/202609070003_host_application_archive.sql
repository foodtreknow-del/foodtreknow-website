-- Separate unapproved Host applications from approved food truck bookings.

begin;

alter table public.opportunity_applications
  add column if not exists archived_at timestamptz;

create or replace function public.archive_host_application(p_application_id uuid)
returns public.opportunity_applications
language plpgsql security definer set search_path = public
as $$
declare selected public.opportunity_applications%rowtype; saved public.opportunity_applications%rowtype;
begin
  if auth.uid() is null then raise exception 'Sign in as the Host to archive this application'; end if;

  select application.* into selected
  from public.opportunity_applications application
  where application.id = p_application_id
    and public.host_owns_opportunity(application.opportunity_id)
  for update;

  if selected.id is null then raise exception 'This application was not found for your Host account'; end if;
  if selected.status = 'approved' or exists (
    select 1 from public.opportunity_bookings booking
    where booking.application_id = selected.id and booking.status = 'confirmed'
  ) then
    raise exception 'Approved food trucks belong under Approved Food Trucks and cannot be archived as applications';
  end if;

  update public.opportunity_applications
  set archived_at = coalesce(archived_at, now()), updated_at = now()
  where id = selected.id
  returning * into saved;
  return saved;
end;
$$;

create or replace function public.restore_host_application_archive(p_application_id uuid)
returns public.opportunity_applications
language plpgsql security definer set search_path = public
as $$
declare saved public.opportunity_applications%rowtype;
begin
  if auth.uid() is null then raise exception 'Sign in as the Host to restore this application'; end if;

  update public.opportunity_applications application
  set archived_at = null, updated_at = now()
  where application.id = p_application_id
    and public.host_owns_opportunity(application.opportunity_id)
    and application.status <> 'approved'
  returning * into saved;

  if saved.id is null then raise exception 'This archived application cannot be restored'; end if;
  return saved;
end;
$$;

revoke all on function public.archive_host_application(uuid) from public, anon;
revoke all on function public.restore_host_application_archive(uuid) from public, anon;
grant execute on function public.archive_host_application(uuid) to authenticated;
grant execute on function public.restore_host_application_archive(uuid) to authenticated;

commit;
