-- FoodTrekNow administrator broadcasts to every approved food-truck account.
-- Each vendor receives an independent notification; recipient data is never shared.

begin;

create table if not exists public.admin_vendor_broadcasts (
  id uuid primary key default gen_random_uuid(),
  administrator_id uuid not null references public.profiles(id) on delete restrict,
  title text not null check (char_length(trim(title)) between 3 and 120),
  body text not null check (char_length(trim(body)) between 1 and 2000),
  recipient_count integer not null default 0 check (recipient_count >= 0),
  created_at timestamptz not null default now()
);

alter table public.admin_vendor_broadcasts enable row level security;
revoke all on public.admin_vendor_broadcasts from public, anon, authenticated;
grant select, insert on public.admin_vendor_broadcasts to service_role;

alter table public.marketplace_notifications drop constraint if exists marketplace_notifications_kind_check;
alter table public.marketplace_notifications add constraint marketplace_notifications_kind_check check (
  kind in ('nearby_opportunity', 'application', 'booking', 'message', 'reminder', 'cancellation', 'recurring', 'review', 'payment', 'logistics', 'admin_message')
);

create or replace function public.admin_broadcast_vendor_message(p_title text, p_body text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  broadcast_id uuid;
  recipients integer;
  clean_title text := trim(coalesce(p_title, ''));
  clean_body text := trim(coalesce(p_body, ''));
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Administrator access is required';
  end if;
  if char_length(clean_title) not between 3 and 120 then
    raise exception 'Enter a message title between 3 and 120 characters';
  end if;
  if char_length(clean_body) not between 1 and 2000 then
    raise exception 'Enter a message between 1 and 2000 characters';
  end if;

  select count(distinct vendor.owner_id)::integer into recipients
  from public.vendor_profiles vendor
  join public.trucks truck on truck.vendor_id = vendor.id;

  insert into public.admin_vendor_broadcasts (administrator_id, title, body, recipient_count)
  values (auth.uid(), clean_title, clean_body, coalesce(recipients, 0))
  returning id into broadcast_id;

  insert into public.marketplace_notifications (profile_id, kind, event_key, title, body)
  select distinct vendor.owner_id,
    'admin_message',
    'admin-vendor-broadcast:' || broadcast_id::text,
    clean_title,
    clean_body
  from public.vendor_profiles vendor
  join public.trucks truck on truck.vendor_id = vendor.id;

  return jsonb_build_object(
    'id', broadcast_id,
    'recipientCount', coalesce(recipients, 0),
    'title', clean_title,
    'body', clean_body,
    'createdAt', now()
  );
end;
$$;

create or replace function public.admin_vendor_broadcast_history()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Administrator access is required';
  end if;

  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', history.id,
      'title', history.title,
      'body', history.body,
      'recipientCount', history.recipient_count,
      'createdAt', history.created_at
    ) order by history.created_at desc)
    from (
      select * from public.admin_vendor_broadcasts
      order by created_at desc
      limit 25
    ) history
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.admin_broadcast_vendor_message(text, text) from public, anon;
revoke all on function public.admin_vendor_broadcast_history() from public, anon;
grant execute on function public.admin_broadcast_vendor_message(text, text) to authenticated;
grant execute on function public.admin_vendor_broadcast_history() to authenticated;

commit;
