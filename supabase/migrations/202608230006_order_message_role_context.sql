-- FoodTrekNow Phase 4.2: explicitly distinguish customer and vendor message context.

drop function if exists public.send_order_message(uuid, text);
drop function if exists public.mark_order_messages_read(uuid);

create or replace function public.send_order_message(
  p_order_id uuid,
  p_body text,
  p_sender_role text
)
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

create or replace function public.mark_order_messages_read(
  p_order_id uuid,
  p_reader_role text
)
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

revoke all on function public.send_order_message(uuid, text, text) from public, anon;
grant execute on function public.send_order_message(uuid, text, text) to authenticated;
revoke all on function public.mark_order_messages_read(uuid, text) from public, anon;
grant execute on function public.mark_order_messages_read(uuid, text) to authenticated;
