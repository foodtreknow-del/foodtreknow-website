-- FoodTrekNow user-safety controls required for user-generated content.
-- Participants can report messages/reviews and block another account without
-- gaining access to private profile data. Reports remain available to the
-- single platform administrator for follow-up.

begin;

create table if not exists public.user_blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null default '' check (char_length(reason) <= 300),
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create table if not exists public.content_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reported_user_id uuid not null references public.profiles(id) on delete cascade,
  content_type text not null check (content_type in ('order_message', 'opportunity_message', 'opportunity_review')),
  content_id uuid not null,
  reason text not null check (reason in ('harassment', 'hate', 'spam', 'unsafe', 'false_information', 'other')),
  details text not null default '' check (char_length(details) <= 500),
  status text not null default 'open' check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (reporter_id, content_type, content_id),
  check (reporter_id <> reported_user_id)
);

create index if not exists idx_content_reports_status_created on public.content_reports(status, created_at desc);
create index if not exists idx_content_reports_reported_user on public.content_reports(reported_user_id, created_at desc);

alter table public.user_blocks enable row level security;
alter table public.content_reports enable row level security;

drop policy if exists user_blocks_owner_read on public.user_blocks;
create policy user_blocks_owner_read on public.user_blocks for select
  using (blocker_id = auth.uid() or public.is_admin());

drop policy if exists content_reports_owner_admin_read on public.content_reports;
create policy content_reports_owner_admin_read on public.content_reports for select
  using (reporter_id = auth.uid() or public.is_admin());

revoke all on public.user_blocks, public.content_reports from public, anon, authenticated;
grant select on public.user_blocks, public.content_reports to authenticated;

create or replace function public.users_block_each_other(p_left uuid, p_right uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_blocks b
    where (b.blocker_id = p_left and b.blocked_id = p_right)
       or (b.blocker_id = p_right and b.blocked_id = p_left)
  )
$$;

create or replace function public.has_blocked_user(p_other_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_blocks b
    where b.blocker_id = auth.uid() and b.blocked_id = p_other_user_id
  )
$$;

create or replace function public.set_user_block(
  p_blocked_user_id uuid,
  p_blocked boolean,
  p_reason text default ''
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Sign in to manage blocked users'; end if;
  if p_blocked_user_id is null or p_blocked_user_id = auth.uid() then raise exception 'Select another account to block'; end if;
  if not exists (select 1 from public.profiles where id = p_blocked_user_id) then raise exception 'The selected account was not found'; end if;
  if char_length(trim(coalesce(p_reason, ''))) > 300 then raise exception 'Block reason must be 300 characters or fewer'; end if;

  if p_blocked then
    insert into public.user_blocks (blocker_id, blocked_id, reason)
    values (auth.uid(), p_blocked_user_id, trim(coalesce(p_reason, '')))
    on conflict (blocker_id, blocked_id) do update set reason = excluded.reason, created_at = now();
  else
    delete from public.user_blocks where blocker_id = auth.uid() and blocked_id = p_blocked_user_id;
  end if;
  return p_blocked;
end;
$$;

create or replace function public.report_content(
  p_content_type text,
  p_content_id uuid,
  p_reason text,
  p_details text default ''
)
returns public.content_reports
language plpgsql
security definer
set search_path = public
as $$
declare
  reported_user uuid;
  saved public.content_reports%rowtype;
begin
  if auth.uid() is null then raise exception 'Sign in to report content'; end if;
  if p_content_type not in ('order_message', 'opportunity_message', 'opportunity_review') then raise exception 'Select a valid content type'; end if;
  if p_reason not in ('harassment', 'hate', 'spam', 'unsafe', 'false_information', 'other') then raise exception 'Select a valid report reason'; end if;
  if char_length(trim(coalesce(p_details, ''))) > 500 then raise exception 'Report details must be 500 characters or fewer'; end if;

  if p_content_type = 'order_message' then
    select m.sender_id into reported_user
    from public.order_messages m
    join public.orders o on o.id = m.order_id
    where m.id = p_content_id
      and (o.customer_id = auth.uid() or public.owns_truck(o.truck_id));
  elsif p_content_type = 'opportunity_message' then
    select m.sender_id into reported_user
    from public.opportunity_messages m
    join public.opportunity_applications a on a.id = m.application_id
    where m.id = p_content_id
      and (public.owns_marketplace_vendor(a.vendor_profile_id) or public.host_owns_opportunity(a.opportunity_id));
  else
    select r.reviewer_id into reported_user
    from public.opportunity_reviews r
    join public.opportunity_bookings b on b.id = r.booking_id
    where r.id = p_content_id
      and (public.owns_marketplace_vendor(b.vendor_profile_id) or public.host_owns_opportunity(b.opportunity_id));
  end if;

  if reported_user is null then raise exception 'This content is not available to report'; end if;
  if reported_user = auth.uid() then raise exception 'You cannot report your own content'; end if;

  insert into public.content_reports (reporter_id, reported_user_id, content_type, content_id, reason, details)
  values (auth.uid(), reported_user, p_content_type, p_content_id, p_reason, trim(coalesce(p_details, '')))
  on conflict (reporter_id, content_type, content_id) do update set
    reason = excluded.reason,
    details = excluded.details,
    status = 'open',
    updated_at = now()
  returning * into saved;

  if p_content_type = 'opportunity_review' then
    update public.opportunity_reviews set is_reported = true where id = p_content_id;
  end if;
  return saved;
end;
$$;

-- Hide content from accounts the viewer has blocked while preserving access
-- for the platform administrator who reviews safety reports.
drop policy if exists order_messages_participant_read on public.order_messages;
create policy order_messages_participant_read on public.order_messages for select using (
  public.is_admin() or (
    exists (
      select 1 from public.orders o
      where o.id = order_id and (o.customer_id = auth.uid() or public.owns_truck(o.truck_id))
    )
    and not public.has_blocked_user(sender_id)
  )
);

drop policy if exists opportunity_messages_participant_read on public.opportunity_messages;
create policy opportunity_messages_participant_read on public.opportunity_messages for select using (
  public.is_admin() or (
    exists (
      select 1 from public.opportunity_applications a
      where a.id = opportunity_messages.application_id
        and (public.owns_marketplace_vendor(a.vendor_profile_id) or public.host_owns_opportunity(a.opportunity_id))
    )
    and not public.has_blocked_user(sender_id)
  )
);

drop policy if exists opportunity_reviews_participant_read on public.opportunity_reviews;
create policy opportunity_reviews_participant_read on public.opportunity_reviews for select using (
  public.is_admin() or reviewer_id = auth.uid() or (
    not is_reported
    and not public.has_blocked_user(reviewer_id)
    and (
      public.host_owns_opportunity(opportunity_id) or
      exists (
        select 1 from public.opportunity_bookings b
        where b.id = opportunity_reviews.booking_id and public.owns_marketplace_vendor(b.vendor_profile_id)
      )
    )
  )
);

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
  recipient_id uuid;
  created_message public.order_messages%rowtype;
begin
  if auth.uid() is null then raise exception 'Sign in to send an order message'; end if;
  if char_length(trim(coalesce(p_body, ''))) not between 1 and 500 then raise exception 'Messages must be between 1 and 500 characters'; end if;
  select * into selected_order from public.orders where id = p_order_id;
  if not found then raise exception 'Order not found'; end if;

  if p_sender_role = 'customer' and selected_order.customer_id = auth.uid() then
    sender_kind := 'customer';
    select v.owner_id into recipient_id from public.trucks t join public.vendor_profiles v on v.id = t.vendor_id where t.id = selected_order.truck_id;
  elsif p_sender_role = 'vendor' and public.owns_truck(selected_order.truck_id) then
    sender_kind := 'vendor';
    recipient_id := selected_order.customer_id;
  else
    raise exception 'The selected sender role is not authorized for this order';
  end if;

  if recipient_id is not null and public.users_block_each_other(auth.uid(), recipient_id) then
    raise exception 'Messaging is unavailable because one participant has blocked the other';
  end if;

  insert into public.order_messages (order_id, sender_id, sender_role, body, customer_read_at, vendor_read_at)
  values (selected_order.id, auth.uid(), sender_kind, trim(p_body),
    case when sender_kind = 'customer' then now() else null end,
    case when sender_kind = 'vendor' then now() else null end)
  returning * into created_message;

  if sender_kind = 'vendor' and selected_order.customer_id is not null then
    select name into selected_truck_name from public.trucks where id = selected_order.truck_id;
    insert into public.customer_notifications (customer_id, order_id, kind, event_key, title, body)
    values (selected_order.customer_id, selected_order.id, 'order_message', 'message:' || created_message.id::text,
      coalesce(selected_truck_name, 'Your food truck') || ' sent a message', trim(p_body))
    on conflict (customer_id, event_key) do nothing;
  end if;
  return created_message;
end;
$$;

create or replace function public.send_opportunity_message(p_application_id uuid, p_body text)
returns public.opportunity_messages
language plpgsql
security definer
set search_path = public
as $$
declare
  selected public.opportunity_applications%rowtype;
  sender_kind text;
  recipient uuid;
  selected_opportunity public.opportunities%rowtype;
  created public.opportunity_messages%rowtype;
begin
  if char_length(trim(coalesce(p_body, ''))) not between 1 and 1000 then raise exception 'Messages must be between 1 and 1000 characters'; end if;
  select * into selected from public.opportunity_applications where id = p_application_id;
  if selected.id is null then raise exception 'Application not found'; end if;
  select * into selected_opportunity from public.opportunities where id = selected.opportunity_id;
  if public.owns_marketplace_vendor(selected.vendor_profile_id) then
    sender_kind := 'vendor';
    select owner_id into recipient from public.location_hosts where id = selected_opportunity.host_id;
  elsif public.host_owns_opportunity(selected.opportunity_id) then
    sender_kind := 'host';
    select owner_id into recipient from public.vendor_profiles where id = selected.vendor_profile_id;
  else
    raise exception 'Only the vendor and host can message about this application';
  end if;
  if recipient is not null and public.users_block_each_other(auth.uid(), recipient) then
    raise exception 'Messaging is unavailable because one participant has blocked the other';
  end if;
  insert into public.opportunity_messages (application_id, sender_id, sender_role, body)
  values (selected.id, auth.uid(), sender_kind, trim(p_body)) returning * into created;
  insert into public.marketplace_notifications (profile_id, opportunity_id, application_id, kind, event_key, title, body)
  values (recipient, selected.opportunity_id, selected.id, 'message', 'marketplace-message:' || created.id,
    case when sender_kind = 'vendor' then 'Vendor message' else 'Host message' end, trim(p_body))
  on conflict (profile_id, event_key) do nothing;
  return created;
end;
$$;

revoke all on function public.users_block_each_other(uuid, uuid) from public, anon, authenticated;
revoke all on function public.has_blocked_user(uuid) from public, anon, authenticated;
revoke all on function public.set_user_block(uuid, boolean, text) from public, anon;
revoke all on function public.report_content(text, uuid, text, text) from public, anon;
grant execute on function public.set_user_block(uuid, boolean, text) to authenticated;
grant execute on function public.report_content(text, uuid, text, text) to authenticated;
grant execute on function public.has_blocked_user(uuid) to authenticated;

revoke all on function public.send_order_message(uuid, text, text) from public, anon;
grant execute on function public.send_order_message(uuid, text, text) to authenticated;
revoke all on function public.send_opportunity_message(uuid, text) from public, anon;
grant execute on function public.send_opportunity_message(uuid, text) to authenticated;

commit;
