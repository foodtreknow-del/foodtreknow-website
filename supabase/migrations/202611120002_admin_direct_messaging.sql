-- Private two-way conversations between the FoodTrekNow administrator and account holders.

begin;

create table if not exists public.admin_direct_threads (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references auth.users(id) on delete cascade,
  audience_role text not null check (audience_role in ('customer', 'vendor', 'host')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (participant_id, audience_role)
);

create table if not exists public.admin_direct_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.admin_direct_threads(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  sender_role text not null check (sender_role in ('admin', 'account')),
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists admin_direct_messages_thread_created_idx
  on public.admin_direct_messages (thread_id, created_at);

alter table public.admin_direct_threads enable row level security;
alter table public.admin_direct_messages enable row level security;
revoke all on public.admin_direct_threads, public.admin_direct_messages from public, anon, authenticated;

create or replace function public.admin_send_direct_message(
  p_participant_id uuid,
  p_audience_role text,
  p_body text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  thread_id uuid;
  message_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Administrator access is required';
  end if;
  if p_audience_role not in ('customer', 'vendor', 'host') then
    raise exception 'A valid account type is required';
  end if;
  if not exists (select 1 from auth.users where id = p_participant_id) then
    raise exception 'The selected account could not be found';
  end if;

  insert into public.admin_direct_threads (participant_id, audience_role)
  values (p_participant_id, p_audience_role)
  on conflict (participant_id, audience_role)
  do update set updated_at = now()
  returning id into thread_id;

  insert into public.admin_direct_messages (thread_id, sender_id, sender_role, body)
  values (thread_id, auth.uid(), 'admin', btrim(p_body))
  returning id into message_id;
  return message_id;
end;
$$;

create or replace function public.account_reply_to_admin(p_thread_id uuid, p_body text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  message_id uuid;
begin
  if not exists (
    select 1 from public.admin_direct_threads thread
    where thread.id = p_thread_id and thread.participant_id = auth.uid()
  ) then
    raise exception 'This conversation does not belong to your account';
  end if;
  insert into public.admin_direct_messages (thread_id, sender_id, sender_role, body)
  values (p_thread_id, auth.uid(), 'account', btrim(p_body))
  returning id into message_id;
  update public.admin_direct_threads set updated_at = now() where id = p_thread_id;
  return message_id;
end;
$$;

create or replace function public.admin_direct_message_thread(
  p_participant_id uuid,
  p_audience_role text
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  if not public.is_admin() then
    raise exception 'Administrator access is required';
  end if;
  select jsonb_build_object(
    'threadId', thread.id,
    'audienceRole', thread.audience_role,
    'messages', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', message.id,
        'body', message.body,
        'senderRole', message.sender_role,
        'readAt', message.read_at,
        'createdAt', message.created_at
      ) order by message.created_at)
      from public.admin_direct_messages message where message.thread_id = thread.id
    ), '[]'::jsonb)
  ) into result
  from public.admin_direct_threads thread
  where thread.participant_id = p_participant_id and thread.audience_role = p_audience_role;
  return coalesce(result, jsonb_build_object('threadId', null, 'audienceRole', p_audience_role, 'messages', '[]'::jsonb));
end;
$$;

create or replace function public.my_admin_direct_threads()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'threadId', thread.id,
    'audienceRole', thread.audience_role,
    'updatedAt', thread.updated_at,
    'unreadCount', (select count(*) from public.admin_direct_messages unread where unread.thread_id = thread.id and unread.sender_role = 'admin' and unread.read_at is null),
    'messages', coalesce((select jsonb_agg(jsonb_build_object(
      'id', message.id,
      'body', message.body,
      'senderRole', message.sender_role,
      'readAt', message.read_at,
      'createdAt', message.created_at
    ) order by message.created_at) from public.admin_direct_messages message where message.thread_id = thread.id), '[]'::jsonb)
  ) order by thread.updated_at desc), '[]'::jsonb)
  from public.admin_direct_threads thread
  where thread.participant_id = auth.uid();
$$;

create or replace function public.mark_admin_direct_thread_read(p_thread_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.is_admin() then
    update public.admin_direct_messages set read_at = now()
    where thread_id = p_thread_id and sender_role = 'account' and read_at is null;
  elsif exists (select 1 from public.admin_direct_threads where id = p_thread_id and participant_id = auth.uid()) then
    update public.admin_direct_messages set read_at = now()
    where thread_id = p_thread_id and sender_role = 'admin' and read_at is null;
  else
    raise exception 'This conversation is not available to your account';
  end if;
end;
$$;

revoke all on function public.admin_send_direct_message(uuid, text, text) from public, anon;
revoke all on function public.account_reply_to_admin(uuid, text) from public, anon;
revoke all on function public.admin_direct_message_thread(uuid, text) from public, anon;
revoke all on function public.my_admin_direct_threads() from public, anon;
revoke all on function public.mark_admin_direct_thread_read(uuid) from public, anon;
grant execute on function public.admin_send_direct_message(uuid, text, text) to authenticated;
grant execute on function public.account_reply_to_admin(uuid, text) to authenticated;
grant execute on function public.admin_direct_message_thread(uuid, text) to authenticated;
grant execute on function public.my_admin_direct_threads() to authenticated;
grant execute on function public.mark_admin_direct_thread_read(uuid) to authenticated;

commit;
