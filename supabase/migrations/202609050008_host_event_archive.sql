-- Host event archive with recoverable history access.

begin;

alter table public.opportunities
  add column if not exists archived_at timestamptz;

create index if not exists idx_opportunities_host_archive
  on public.opportunities(host_id, archived_at, ends_at desc);

create or replace function public.archive_host_opportunity(p_opportunity_id uuid)
returns public.opportunities
language plpgsql
security definer
set search_path = public
as $$
declare saved public.opportunities%rowtype;
begin
  select * into saved
  from public.opportunities
  where id = p_opportunity_id and public.host_owns_opportunity(id)
  for update;

  if saved.id is null then raise exception 'Host opportunity not found'; end if;
  if saved.archived_at is not null then return saved; end if;
  if saved.ends_at > now() and saved.status not in ('cancelled', 'completed') then
    raise exception 'Only completed or cancelled opportunities can be archived';
  end if;

  update public.opportunities
  set archived_at = now(),
      status = case when status in ('cancelled', 'completed') then status else 'completed' end,
      updated_at = now()
  where id = saved.id
  returning * into saved;

  return saved;
end;
$$;

create or replace function public.restore_host_opportunity_archive(p_opportunity_id uuid)
returns public.opportunities
language plpgsql
security definer
set search_path = public
as $$
declare saved public.opportunities%rowtype;
begin
  update public.opportunities
  set archived_at = null, updated_at = now()
  where id = p_opportunity_id
    and archived_at is not null
    and public.host_owns_opportunity(id)
  returning * into saved;

  if saved.id is null then raise exception 'Archived Host opportunity not found'; end if;
  return saved;
end;
$$;

revoke all on function public.archive_host_opportunity(uuid) from public, anon;
revoke all on function public.restore_host_opportunity_archive(uuid) from public, anon;
grant execute on function public.archive_host_opportunity(uuid) to authenticated;
grant execute on function public.restore_host_opportunity_archive(uuid) to authenticated;

commit;
