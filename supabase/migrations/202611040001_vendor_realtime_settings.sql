begin;

alter table public.trucks
  add column if not exists portal_settings jsonb not null default '{}'::jsonb;

comment on column public.trucks.portal_settings is
  'Non-sensitive vendor portal preferences synchronized across the vendor devices for this truck.';

alter table public.menu_categories replica identity full;
alter table public.truck_hours replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'menu_categories'
  ) then
    alter publication supabase_realtime add table public.menu_categories;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'truck_hours'
  ) then
    alter publication supabase_realtime add table public.truck_hours;
  end if;
end
$$;

commit;
