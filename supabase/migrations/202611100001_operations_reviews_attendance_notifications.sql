-- FoodTrekNow operations: bulk archive, event attendance, reviews, and administrator alerts.

begin;

alter table public.trucks
  add column if not exists auto_archive_completed_orders boolean not null default false;

alter table public.customer_notifications
  add column if not exists action_type text,
  add column if not exists action_id uuid;

create or replace function public.set_vendor_orders_archived(p_order_ids uuid[], p_archived boolean)
returns integer
language plpgsql security definer set search_path = public
as $$
declare changed integer;
begin
  if auth.uid() is null then raise exception 'Authentication is required'; end if;
  update public.orders o
  set vendor_archived_at = case when p_archived then now() else null end,
      updated_at = now()
  where o.id = any(coalesce(p_order_ids, array[]::uuid[]))
    and public.owns_truck(o.truck_id)
    and (not p_archived or o.status in ('picked_up', 'cancelled'));
  get diagnostics changed = row_count;
  return changed;
end;
$$;

create or replace function public.auto_archive_picked_up_order()
returns trigger language plpgsql set search_path = public
as $$
begin
  if new.status = 'picked_up' and old.status is distinct from new.status
     and exists (select 1 from public.trucks t where t.id = new.truck_id and t.auto_archive_completed_orders) then
    new.vendor_archived_at := coalesce(new.vendor_archived_at, now());
  end if;
  return new;
end;
$$;

drop trigger if exists auto_archive_picked_up_order on public.orders;
create trigger auto_archive_picked_up_order
  before update of status on public.orders
  for each row execute function public.auto_archive_picked_up_order();

create or replace function public.notify_platform_administrator()
returns trigger language plpgsql security definer set search_path = public
as $$
declare administrator_id uuid; display_name text; notification_title text; notification_body text; target_type text; target_id uuid;
begin
  select profile_id into administrator_id from public.platform_administrator where singleton;
  if administrator_id is null then return new; end if;

  if tg_table_name = 'profiles' then
    if new.id = administrator_id then return new; end if;
    display_name := trim(concat_ws(' ', nullif(new.first_name, ''), nullif(new.last_name, '')));
    notification_title := 'New customer account';
    notification_body := coalesce(nullif(display_name, ''), 'A new customer') || ' joined FoodTrekNow.';
    target_type := 'customer'; target_id := new.id;
  elsif tg_table_name = 'vendor_applications' then
    if new.status::text <> 'pending' then return new; end if;
    notification_title := 'New Vendor application';
    notification_body := new.truck_name || ' is waiting for your approval.';
    target_type := 'vendor_application'; target_id := new.id;
  elsif tg_table_name = 'host_applications' then
    if new.status::text <> 'pending' then return new; end if;
    notification_title := 'New Host application';
    notification_body := new.business_name || ' is waiting for your approval.';
    target_type := 'host_application'; target_id := new.id;
  else
    return new;
  end if;

  insert into public.customer_notifications(customer_id, kind, event_key, title, body, action_type, action_id)
  values (administrator_id, 'system', 'admin:' || target_type || ':' || target_id, notification_title, notification_body, target_type, target_id)
  on conflict (customer_id, event_key) do update
    set title = excluded.title, body = excluded.body, is_read = false, read_at = null, created_at = now();
  return new;
end;
$$;

drop trigger if exists notify_admin_new_customer on public.profiles;
create trigger notify_admin_new_customer after insert on public.profiles
  for each row execute function public.notify_platform_administrator();
drop trigger if exists notify_admin_vendor_application on public.vendor_applications;
create trigger notify_admin_vendor_application after insert or update of status on public.vendor_applications
  for each row when (new.status::text = 'pending') execute function public.notify_platform_administrator();
drop trigger if exists notify_admin_host_application on public.host_applications;
create trigger notify_admin_host_application after insert or update of status on public.host_applications
  for each row when (new.status::text = 'pending') execute function public.notify_platform_administrator();

create table if not exists public.event_attendance (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  customer_id uuid not null references public.profiles(id) on delete cascade,
  checked_in_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique(opportunity_id, customer_id)
);
create index if not exists event_attendance_event_idx on public.event_attendance(opportunity_id, checked_in_at);
alter table public.event_attendance enable row level security;
drop policy if exists event_attendance_customer_read on public.event_attendance;
create policy event_attendance_customer_read on public.event_attendance for select using (
  customer_id = auth.uid() or public.is_admin() or exists (
    select 1 from public.opportunities o where o.id = opportunity_id and public.is_host_owner(o.host_id)
  )
);

create or replace function public.customer_event_check_in(p_opportunity_id uuid)
returns public.event_attendance
language plpgsql security definer set search_path = public
as $$
declare selected_event public.opportunities%rowtype; saved public.event_attendance%rowtype;
begin
  if auth.uid() is null then raise exception 'Sign in to check in at this event'; end if;
  select * into selected_event from public.opportunities where id = p_opportunity_id and status in ('published', 'filled');
  if selected_event.id is null then raise exception 'This event is not available for check-in'; end if;
  if now() < selected_event.starts_at - interval '8 hours' or now() > selected_event.ends_at + interval '4 hours' then
    raise exception 'Event check-in opens on the event day';
  end if;
  insert into public.event_attendance(opportunity_id, customer_id)
  values (selected_event.id, auth.uid())
  on conflict (opportunity_id, customer_id) do update set checked_in_at = public.event_attendance.checked_in_at
  returning * into saved;
  return saved;
end;
$$;

create or replace function public.host_event_vendor_check_in(p_booking_id uuid, p_status text)
returns public.opportunity_bookings
language plpgsql security definer set search_path = public
as $$
declare saved public.opportunity_bookings%rowtype; vendor_owner uuid; event_title text; truck_name text;
begin
  if p_status not in ('arrived', 'checked_in', 'departed') then raise exception 'Invalid event check-in status'; end if;
  update public.opportunity_bookings b
  set check_in_status = p_status,
      checked_in_at = case when p_status = 'checked_in' then now() else b.checked_in_at end,
      updated_at = now()
  from public.opportunities o
  where b.id = p_booking_id and o.id = b.opportunity_id and public.is_host_owner(o.host_id)
  returning b.* into saved;
  if saved.id is null then raise exception 'This approved food truck booking is unavailable'; end if;
  select v.owner_id, o.title, t.name into vendor_owner, event_title, truck_name
  from public.vendor_profiles v
  join public.trucks t on t.vendor_id = v.id and t.id = saved.truck_id
  join public.opportunities o on o.id = saved.opportunity_id
  where v.id = saved.vendor_profile_id;
  insert into public.marketplace_notifications(profile_id, opportunity_id, application_id, kind, event_key, title, body)
  values (vendor_owner, saved.opportunity_id, saved.application_id, 'logistics',
    'host-check-in:' || saved.id || ':' || p_status, 'Host recorded your arrival',
    truck_name || ' was marked ' || replace(p_status, '_', ' ') || ' at ' || event_title || '.')
  on conflict (profile_id, event_key) do nothing;
  return saved;
end;
$$;

create table if not exists public.truck_reviews (
  id uuid primary key default gen_random_uuid(),
  truck_id uuid not null references public.trucks(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  comment text not null default '' check (char_length(comment) <= 1200),
  is_removed boolean not null default false,
  removed_by uuid references public.profiles(id) on delete set null,
  removed_at timestamptz,
  removal_reason text,
  created_at timestamptz not null default now(),
  unique(order_id, reviewer_id)
);

create table if not exists public.event_reviews (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id) on delete cascade,
  reviewer_role text not null default 'customer' check (reviewer_role in ('customer', 'vendor', 'host')),
  rating integer not null check (rating between 1 and 5),
  comment text not null default '' check (char_length(comment) <= 1200),
  is_removed boolean not null default false,
  removed_by uuid references public.profiles(id) on delete set null,
  removed_at timestamptz,
  removal_reason text,
  created_at timestamptz not null default now(),
  unique(opportunity_id, reviewer_id)
);

alter table public.opportunity_reviews
  add column if not exists is_removed boolean not null default false,
  add column if not exists removed_by uuid references public.profiles(id) on delete set null,
  add column if not exists removed_at timestamptz,
  add column if not exists removal_reason text;

alter table public.truck_reviews enable row level security;
alter table public.event_reviews enable row level security;
drop policy if exists truck_reviews_public_read on public.truck_reviews;
create policy truck_reviews_public_read on public.truck_reviews for select using (not is_removed or reviewer_id = auth.uid() or public.is_admin());
drop policy if exists event_reviews_public_read on public.event_reviews;
create policy event_reviews_public_read on public.event_reviews for select using (not is_removed or reviewer_id = auth.uid() or public.is_admin());
grant select on public.truck_reviews, public.event_reviews to anon, authenticated;

create or replace function public.submit_truck_review(p_order_id uuid, p_rating integer, p_comment text default '')
returns public.truck_reviews
language plpgsql security definer set search_path = public
as $$
declare selected_order public.orders%rowtype; saved public.truck_reviews%rowtype;
begin
  select * into selected_order from public.orders where id = p_order_id and customer_id = auth.uid() and status = 'picked_up';
  if selected_order.id is null then raise exception 'A completed order is required to review this food truck'; end if;
  if p_rating not between 1 and 5 then raise exception 'Choose a rating from 1 to 5'; end if;
  insert into public.truck_reviews(truck_id, order_id, reviewer_id, rating, comment)
  values(selected_order.truck_id, selected_order.id, auth.uid(), p_rating, left(trim(coalesce(p_comment,'')),1200))
  on conflict(order_id, reviewer_id) do update set rating=excluded.rating, comment=excluded.comment, is_removed=false, removed_by=null, removed_at=null, removal_reason=null
  returning * into saved;
  return saved;
end;
$$;

create or replace function public.submit_customer_event_review(p_opportunity_id uuid, p_rating integer, p_comment text default '')
returns public.event_reviews
language plpgsql security definer set search_path = public
as $$
declare saved public.event_reviews%rowtype;
begin
  if not exists(select 1 from public.event_attendance where opportunity_id=p_opportunity_id and customer_id=auth.uid()) then
    raise exception 'Check in at this event before posting a review';
  end if;
  if p_rating not between 1 and 5 then raise exception 'Choose a rating from 1 to 5'; end if;
  insert into public.event_reviews(opportunity_id, reviewer_id, reviewer_role, rating, comment)
  values(p_opportunity_id, auth.uid(), 'customer', p_rating, left(trim(coalesce(p_comment,'')),1200))
  on conflict(opportunity_id, reviewer_id) do update set rating=excluded.rating, comment=excluded.comment, is_removed=false, removed_by=null, removed_at=null, removal_reason=null
  returning * into saved;
  return saved;
end;
$$;

create or replace function public.submit_portal_event_review(p_opportunity_id uuid, p_rating integer, p_comment text default '')
returns public.event_reviews
language plpgsql security definer set search_path = public
as $$
declare selected_event public.opportunities%rowtype; portal_role text; saved public.event_reviews%rowtype;
begin
  if auth.uid() is null then raise exception 'Sign in to review this event'; end if;
  if p_rating not between 1 and 5 then raise exception 'Choose a rating from 1 to 5'; end if;
  select * into selected_event from public.opportunities where id=p_opportunity_id;
  if selected_event.id is null then raise exception 'Event not found'; end if;
  if now() < selected_event.ends_at then raise exception 'Event reviews open after the event ends'; end if;
  if public.is_host_owner(selected_event.host_id) then
    portal_role := 'host';
  elsif exists(
    select 1 from public.opportunity_bookings b
    where b.opportunity_id=selected_event.id and b.status='confirmed' and public.owns_truck(b.truck_id)
  ) then
    portal_role := 'vendor';
  else
    raise exception 'Only the Host or an approved food truck may review this event';
  end if;
  insert into public.event_reviews(opportunity_id, reviewer_id, reviewer_role, rating, comment)
  values(selected_event.id, auth.uid(), portal_role, p_rating, left(trim(coalesce(p_comment,'')),1200))
  on conflict(opportunity_id, reviewer_id) do update set reviewer_role=excluded.reviewer_role, rating=excluded.rating, comment=excluded.comment, is_removed=false, removed_by=null, removed_at=null, removal_reason=null
  returning * into saved;
  return saved;
end;
$$;

create or replace function public.remove_platform_review(p_review_type text, p_review_id uuid, p_reason text default null)
returns boolean
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'Only the FoodTrekNow administrator can remove reviews'; end if;
  if p_review_type = 'truck' then
    update public.truck_reviews set is_removed=true, removed_by=auth.uid(), removed_at=now(), removal_reason=nullif(trim(p_reason),'') where id=p_review_id;
  elsif p_review_type = 'event' then
    update public.event_reviews set is_removed=true, removed_by=auth.uid(), removed_at=now(), removal_reason=nullif(trim(p_reason),'') where id=p_review_id;
  elsif p_review_type = 'opportunity' then
    update public.opportunity_reviews set is_removed=true, removed_by=auth.uid(), removed_at=now(), removal_reason=nullif(trim(p_reason),'') where id=p_review_id;
  else raise exception 'Unknown review type'; end if;
  return found;
end;
$$;

create or replace function public.list_customer_events()
returns setof jsonb
language sql stable security definer set search_path = public
as $$
  select jsonb_build_object(
    'id', o.id, 'title', o.title, 'description', o.description, 'event_type', o.event_type,
    'starts_at', o.starts_at, 'ends_at', o.ends_at, 'expected_customers', o.expected_customers,
    'host_name', h.business_name,
    'attendance_count', (select count(*) from public.event_attendance a where a.opportunity_id=o.id),
    'customer_checked_in', exists(select 1 from public.event_attendance a where a.opportunity_id=o.id and a.customer_id=auth.uid()),
    'customer_reviewed', exists(select 1 from public.event_reviews r where r.opportunity_id=o.id and r.reviewer_id=auth.uid() and not r.is_removed),
    'reviews', coalesce((select jsonb_agg(jsonb_build_object('rating',r.rating,'comment',r.comment,'reviewer_role',r.reviewer_role,'created_at',r.created_at) order by r.created_at desc) from public.event_reviews r where r.opportunity_id=o.id and not r.is_removed),'[]'::jsonb),
    'site_map_image_url', case when o.customer_map_enabled then o.site_map_image_url else '' end,
    'vendor_zone_name', case when o.customer_map_enabled then o.vendor_zone_name else '' end,
    'vendor_entrance', case when o.customer_map_enabled then o.vendor_entrance else '' end,
    'customer_map_enabled', o.customer_map_enabled,
    'event_logistics_notes', case when o.customer_map_enabled then o.event_logistics_notes else '' end,
    'location', jsonb_build_object('name',l.name,'address_line1',l.address_line1,'address_line2',l.address_line2,'city',l.city,'state',l.state,'postal_code',l.postal_code,'latitude',l.latitude,'longitude',l.longitude),
    'trucks', coalesce((select jsonb_agg(jsonb_build_object('id',t.id,'name',t.name,'cuisine',t.cuisine,'description',t.description,'logo_url',t.logo_url,'accepting_orders',t.accepting_orders,'estimated_prep_minutes',t.estimated_prep_minutes,'pickup_instructions',t.pickup_instructions,'space_code',case when o.customer_map_enabled then b.space_code else '' end,'space_label',case when o.customer_map_enabled then b.space_label else '' end,'map_x',case when o.customer_map_enabled then b.map_x else null end,'map_y',case when o.customer_map_enabled then b.map_y else null end) order by coalesce(nullif(b.space_code,''),t.name)) from public.opportunity_bookings b join public.trucks t on t.id=b.truck_id and t.is_active where b.opportunity_id=o.id and b.status='confirmed'),'[]'::jsonb)
  )
  from public.opportunities o
  join public.location_hosts h on h.id=o.host_id
  join public.host_locations l on l.id=o.location_id and l.is_active
  where o.status in ('published','filled','completed') and o.ends_at >= now()-interval '30 days'
    and exists(select 1 from public.opportunity_bookings b join public.trucks t on t.id=b.truck_id and t.is_active where b.opportunity_id=o.id and b.status='confirmed')
  order by (o.ends_at < now()), o.starts_at;
$$;

revoke all on function public.set_vendor_orders_archived(uuid[], boolean) from public, anon;
revoke all on function public.customer_event_check_in(uuid) from public, anon;
revoke all on function public.host_event_vendor_check_in(uuid, text) from public, anon;
revoke all on function public.submit_truck_review(uuid, integer, text) from public, anon;
revoke all on function public.submit_customer_event_review(uuid, integer, text) from public, anon;
revoke all on function public.submit_portal_event_review(uuid, integer, text) from public, anon;
revoke all on function public.remove_platform_review(text, uuid, text) from public, anon;
grant execute on function public.set_vendor_orders_archived(uuid[], boolean) to authenticated;
grant execute on function public.customer_event_check_in(uuid) to authenticated;
grant execute on function public.host_event_vendor_check_in(uuid, text) to authenticated;
grant execute on function public.submit_truck_review(uuid, integer, text) to authenticated;
grant execute on function public.submit_customer_event_review(uuid, integer, text) to authenticated;
grant execute on function public.submit_portal_event_review(uuid, integer, text) to authenticated;
grant execute on function public.remove_platform_review(text, uuid, text) to authenticated;
grant execute on function public.list_customer_events() to anon, authenticated;

do $$ begin
  alter publication supabase_realtime add table public.event_attendance;
exception when duplicate_object then null; end $$;

commit;
