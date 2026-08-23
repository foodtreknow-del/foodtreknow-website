-- FoodTrekNow Phase 4.2: secure order communication and in-app notifications.

create table if not exists public.order_messages (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  sender_role text not null check (sender_role in ('customer', 'vendor')),
  body text not null check (char_length(trim(body)) between 1 and 500),
  customer_read_at timestamptz,
  vendor_read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.customer_notifications (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) on delete cascade,
  order_id uuid references public.orders(id) on delete cascade,
  kind text not null check (kind in ('order_status', 'order_message', 'system')),
  event_key text not null,
  title text not null,
  body text not null,
  is_read boolean not null default false,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  unique (customer_id, event_key)
);

create index if not exists idx_order_messages_order_created
  on public.order_messages(order_id, created_at);
create index if not exists idx_customer_notifications_customer_created
  on public.customer_notifications(customer_id, created_at desc);
create index if not exists idx_customer_notifications_unread
  on public.customer_notifications(customer_id, is_read, created_at desc);

alter table public.order_messages enable row level security;
alter table public.customer_notifications enable row level security;

drop policy if exists order_messages_participant_read on public.order_messages;
create policy order_messages_participant_read on public.order_messages for select
  using (exists (
    select 1 from public.orders o
    where o.id = order_id
      and (o.customer_id = auth.uid() or public.owns_truck(o.truck_id))
  ));

drop policy if exists customer_notifications_owner_read on public.customer_notifications;
create policy customer_notifications_owner_read on public.customer_notifications for select
  using (customer_id = auth.uid());

create or replace function public.send_order_message(p_order_id uuid, p_body text, p_sender_role text)
returns public.order_messages
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_order public.orders%rowtype;
  selected_truck_name text;
  sender_kind text;
  created_message public.order_messages%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Sign in to send an order message';
  end if;
  if char_length(trim(coalesce(p_body, ''))) not between 1 and 500 then
    raise exception 'Messages must be between 1 and 500 characters';
  end if;

  select * into selected_order from public.orders where id = p_order_id;
  if not found then raise exception 'Order not found'; end if;

  if p_sender_role = 'customer' and selected_order.customer_id = auth.uid() then
    sender_kind := 'customer';
  elsif p_sender_role = 'vendor' and public.owns_truck(selected_order.truck_id) then
    sender_kind := 'vendor';
  else
    raise exception 'The selected sender role is not authorized for this order';
  end if;

  insert into public.order_messages (
    order_id, sender_id, sender_role, body, customer_read_at, vendor_read_at
  ) values (
    selected_order.id,
    auth.uid(),
    sender_kind,
    trim(p_body),
    case when sender_kind = 'customer' then now() else null end,
    case when sender_kind = 'vendor' then now() else null end
  ) returning * into created_message;

  if sender_kind = 'vendor' and selected_order.customer_id is not null then
    select name into selected_truck_name from public.trucks where id = selected_order.truck_id;
    insert into public.customer_notifications (
      customer_id, order_id, kind, event_key, title, body
    ) values (
      selected_order.customer_id,
      selected_order.id,
      'order_message',
      'message:' || created_message.id::text,
      coalesce(selected_truck_name, 'Your food truck') || ' sent a message',
      trim(p_body)
    ) on conflict (customer_id, event_key) do nothing;
  end if;

  return created_message;
end;
$$;

create or replace function public.mark_order_messages_read(p_order_id uuid, p_reader_role text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_order public.orders%rowtype;
  changed_count integer;
begin
  select * into selected_order from public.orders where id = p_order_id;
  if not found then raise exception 'Order not found'; end if;

  if p_reader_role = 'customer' and selected_order.customer_id = auth.uid() then
    update public.order_messages
      set customer_read_at = coalesce(customer_read_at, now())
      where order_id = p_order_id and customer_read_at is null;
  elsif p_reader_role = 'vendor' and public.owns_truck(selected_order.truck_id) then
    update public.order_messages
      set vendor_read_at = coalesce(vendor_read_at, now())
      where order_id = p_order_id and vendor_read_at is null;
  else
    raise exception 'The selected reader role is not authorized for this order';
  end if;

  get diagnostics changed_count = row_count;
  return changed_count;
end;
$$;

create or replace function public.mark_customer_notifications_read(p_notification_ids uuid[] default null)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  changed_count integer;
begin
  if auth.uid() is null then raise exception 'Sign in to update notifications'; end if;
  update public.customer_notifications
    set is_read = true, read_at = coalesce(read_at, now())
    where customer_id = auth.uid()
      and not is_read
      and (p_notification_ids is null or id = any(p_notification_ids));
  get diagnostics changed_count = row_count;
  return changed_count;
end;
$$;

create or replace function public.create_order_status_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  truck_name text;
  notification_title text;
  notification_body text;
begin
  if new.customer_id is null then return new; end if;
  if tg_op = 'UPDATE' and new.status is not distinct from old.status then return new; end if;
  select name into truck_name from public.trucks where id = new.truck_id;

  notification_title := case new.status
    when 'received' then 'Order #' || new.order_number || ' received'
    when 'preparing' then 'Order #' || new.order_number || ' is being prepared'
    when 'ready' then 'Order #' || new.order_number || ' is ready for pickup'
    when 'picked_up' then 'Order #' || new.order_number || ' was picked up'
    when 'cancelled' then 'Order #' || new.order_number || ' was cancelled'
  end;
  notification_body := case new.status
    when 'received' then coalesce(truck_name, 'The food truck') || ' received your order.'
    when 'preparing' then coalesce(truck_name, 'The food truck') || ' is preparing your meal.'
    when 'ready' then 'Head to ' || coalesce(truck_name, 'the food truck') || ' and show your order number.'
    when 'picked_up' then 'Thanks for ordering with FoodTrekNow. Enjoy your meal!'
    when 'cancelled' then 'The cancellation is recorded in your order history.'
  end;

  insert into public.customer_notifications (
    customer_id, order_id, kind, event_key, title, body
  ) values (
    new.customer_id,
    new.id,
    'order_status',
    'order-status:' || new.id::text || ':' || new.status::text,
    notification_title,
    notification_body
  ) on conflict (customer_id, event_key) do nothing;
  return new;
end;
$$;

drop trigger if exists create_order_status_notification on public.orders;
create trigger create_order_status_notification
  after insert or update of status on public.orders
  for each row execute function public.create_order_status_notification();

revoke all on public.order_messages, public.customer_notifications from anon, authenticated;
grant select on public.order_messages, public.customer_notifications to authenticated;
revoke all on function public.send_order_message(uuid, text, text) from public, anon;
grant execute on function public.send_order_message(uuid, text, text) to authenticated;
revoke all on function public.mark_order_messages_read(uuid, text) from public, anon;
grant execute on function public.mark_order_messages_read(uuid, text) to authenticated;
revoke all on function public.mark_customer_notifications_read(uuid[]) from public, anon;
grant execute on function public.mark_customer_notifications_read(uuid[]) to authenticated;

alter table public.order_messages replica identity full;
alter table public.customer_notifications replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'order_messages'
  ) then
    alter publication supabase_realtime add table public.order_messages;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'customer_notifications'
  ) then
    alter publication supabase_realtime add table public.customer_notifications;
  end if;
end $$;
