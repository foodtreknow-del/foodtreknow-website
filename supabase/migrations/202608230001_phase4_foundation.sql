-- FoodTrekNow Phase 4: Supabase database foundation
-- Run this migration in the Supabase SQL Editor as the project owner.

begin;

create extension if not exists pgcrypto with schema extensions;

do $$
begin
  create type public.app_role as enum ('customer', 'vendor', 'admin');
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.order_status as enum (
    'received',
    'preparing',
    'ready',
    'picked_up',
    'cancelled'
  );
exception
  when duplicate_object then null;
end
$$;

create sequence if not exists public.order_number_seq start with 1001;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text not null default '',
  last_name text not null default '',
  preferred_name text,
  mobile_number text,
  profile_photo_url text,
  role public.app_role not null default 'customer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.vendor_profiles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references public.profiles(id) on delete cascade,
  business_name text not null,
  contact_email text,
  contact_mobile text,
  notification_settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.trucks (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendor_profiles(id) on delete cascade,
  slug text not null unique,
  name text not null,
  cuisine text,
  description text,
  contact_email text,
  contact_mobile text,
  location_name text,
  latitude numeric(9, 6),
  longitude numeric(9, 6),
  accepting_orders boolean not null default false,
  estimated_prep_minutes integer not null default 20 check (estimated_prep_minutes between 1 and 240),
  minimum_order numeric(10, 2) not null default 0 check (minimum_order >= 0),
  tax_rate numeric(7, 6) not null default 0 check (tax_rate between 0 and 1),
  pickup_instructions text,
  logo_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.truck_members (
  truck_id uuid not null references public.trucks(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  member_role text not null default 'staff' check (member_role in ('manager', 'staff')),
  created_at timestamptz not null default now(),
  primary key (truck_id, profile_id)
);

create table if not exists public.truck_hours (
  id uuid primary key default gen_random_uuid(),
  truck_id uuid not null references public.trucks(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  opens_at time,
  closes_at time,
  is_closed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (truck_id, day_of_week),
  check (is_closed or (opens_at is not null and closes_at is not null))
);

create table if not exists public.menu_categories (
  id uuid primary key default gen_random_uuid(),
  truck_id uuid not null references public.trucks(id) on delete cascade,
  name text not null,
  description text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (truck_id, name)
);

create table if not exists public.menu_items (
  id uuid primary key default gen_random_uuid(),
  truck_id uuid not null references public.trucks(id) on delete cascade,
  category_id uuid references public.menu_categories(id) on delete set null,
  name text not null,
  description text,
  price numeric(10, 2) not null check (price >= 0),
  photo_url text,
  is_featured boolean not null default false,
  is_sold_out boolean not null default false,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number bigint not null unique default nextval('public.order_number_seq'),
  customer_id uuid not null references public.profiles(id) on delete restrict,
  truck_id uuid not null references public.trucks(id) on delete restrict,
  status public.order_status not null default 'received',
  customer_name text not null,
  customer_mobile text,
  customer_email text,
  subtotal numeric(10, 2) not null check (subtotal >= 0),
  tax numeric(10, 2) not null default 0 check (tax >= 0),
  service_fee numeric(10, 2) not null default 0 check (service_fee >= 0),
  total numeric(10, 2) not null check (total >= 0),
  order_notes text,
  payment_label text,
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid', 'authorized', 'paid', 'refunded')),
  received_at timestamptz not null default now(),
  preparing_at timestamptz,
  ready_at timestamptz,
  picked_up_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  menu_item_id uuid references public.menu_items(id) on delete set null,
  item_name text not null,
  unit_price numeric(10, 2) not null check (unit_price >= 0),
  quantity integer not null check (quantity between 1 and 99),
  modifiers jsonb not null default '[]'::jsonb,
  special_instructions text,
  line_total numeric(10, 2) generated always as (round(unit_price * quantity, 2)) stored,
  created_at timestamptz not null default now()
);

create table if not exists public.order_status_events (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders(id) on delete cascade,
  status public.order_status not null,
  changed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.addresses (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) on delete cascade,
  label text not null check (label in ('Home', 'Work', 'Other')),
  recipient_name text,
  street_address text not null,
  apartment_suite text,
  city text not null,
  state text not null,
  postal_code text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.favorite_trucks (
  customer_id uuid not null references public.profiles(id) on delete cascade,
  truck_id uuid not null references public.trucks(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (customer_id, truck_id)
);

create table if not exists public.favorite_orders (
  customer_id uuid not null references public.profiles(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (customer_id, order_id)
);

create table if not exists public.payment_method_preferences (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) on delete cascade,
  provider_payment_method_id text,
  brand text not null,
  last_four text not null check (last_four ~ '^[0-9]{4}$'),
  expiration_month smallint check (expiration_month between 1 and 12),
  expiration_year smallint,
  cardholder_name text,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.payment_method_preferences is
  'Display preferences and future payment-provider tokens only. Never store full card numbers or CVV values.';

create table if not exists public.notification_preferences (
  customer_id uuid primary key references public.profiles(id) on delete cascade,
  order_updates boolean not null default true,
  promotions boolean not null default false,
  favorite_truck_notifications boolean not null default true,
  push_notifications boolean not null default false,
  updated_at timestamptz not null default now()
);

create index if not exists idx_trucks_vendor on public.trucks(vendor_id);
create index if not exists idx_menu_categories_truck on public.menu_categories(truck_id, sort_order);
create index if not exists idx_menu_items_truck on public.menu_items(truck_id, is_active, sort_order);
create index if not exists idx_orders_customer on public.orders(customer_id, created_at desc);
create index if not exists idx_orders_truck_status on public.orders(truck_id, status, created_at desc);
create index if not exists idx_order_items_order on public.order_items(order_id);
create index if not exists idx_order_events_order on public.order_status_events(order_id, created_at);
create index if not exists idx_addresses_customer on public.addresses(customer_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles', 'vendor_profiles', 'trucks', 'truck_hours',
    'menu_categories', 'menu_items', 'orders', 'addresses',
    'payment_method_preferences', 'notification_preferences'
  ]
  loop
    execute format('drop trigger if exists set_%I_updated_at on public.%I', table_name, table_name);
    execute format(
      'create trigger set_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()',
      table_name,
      table_name
    );
  end loop;
end
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (
    id,
    first_name,
    last_name,
    preferred_name,
    mobile_number,
    role
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'first_name', ''),
    coalesce(new.raw_user_meta_data ->> 'last_name', ''),
    nullif(new.raw_user_meta_data ->> 'preferred_name', ''),
    coalesce(nullif(new.phone, ''), nullif(new.raw_user_meta_data ->> 'mobile_number', '')),
    'customer'::public.app_role
  )
  on conflict (id) do nothing;

  insert into public.notification_preferences (customer_id)
  values (new.id)
  on conflict (customer_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid() and role = 'admin'::public.app_role
  );
$$;

create or replace function public.owns_truck(target_truck_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.trucks t
    join public.vendor_profiles v on v.id = t.vendor_id
    where t.id = target_truck_id and v.owner_id = auth.uid()
  ) or exists (
    select 1
    from public.truck_members tm
    where tm.truck_id = target_truck_id and tm.profile_id = auth.uid()
  ) or public.is_admin();
$$;

create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'Only an administrator can change account roles';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_role on public.profiles;
create trigger protect_profile_role
  before update on public.profiles
  for each row execute function public.protect_profile_role();

create or replace function public.validate_order_status_transition()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = old.status then
    return new;
  end if;

  if not (
    (old.status = 'received' and new.status in ('preparing', 'cancelled')) or
    (old.status = 'preparing' and new.status in ('ready', 'cancelled')) or
    (old.status = 'ready' and new.status in ('picked_up', 'cancelled'))
  ) then
    raise exception 'Invalid order status transition from % to %', old.status, new.status;
  end if;

  if new.status = 'preparing' then new.preparing_at = coalesce(new.preparing_at, now()); end if;
  if new.status = 'ready' then new.ready_at = coalesce(new.ready_at, now()); end if;
  if new.status = 'picked_up' then new.picked_up_at = coalesce(new.picked_up_at, now()); end if;
  if new.status = 'cancelled' then new.cancelled_at = coalesce(new.cancelled_at, now()); end if;

  return new;
end;
$$;

drop trigger if exists validate_order_status_transition on public.orders;
create trigger validate_order_status_transition
  before update of status on public.orders
  for each row execute function public.validate_order_status_transition();

create or replace function public.log_order_status_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    insert into public.order_status_events (order_id, status, changed_by)
    values (new.id, new.status, auth.uid());
  end if;
  return new;
end;
$$;

drop trigger if exists log_order_status_event on public.orders;
create trigger log_order_status_event
  after insert or update of status on public.orders
  for each row execute function public.log_order_status_event();

create or replace function public.place_order(
  p_truck_id uuid,
  p_items jsonb,
  p_customer_name text,
  p_customer_mobile text default null,
  p_customer_email text default null,
  p_order_notes text default null,
  p_payment_label text default null
)
returns table (
  order_id uuid,
  order_number bigint,
  status public.order_status,
  subtotal numeric,
  tax numeric,
  total numeric
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_truck public.trucks%rowtype;
  item_payload jsonb;
  selected_item public.menu_items%rowtype;
  item_quantity integer;
  calculated_subtotal numeric(10, 2) := 0;
  calculated_tax numeric(10, 2) := 0;
  calculated_total numeric(10, 2) := 0;
  created_order public.orders%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required to place an order';
  end if;

  if p_customer_name is null or btrim(p_customer_name) = '' then
    raise exception 'Customer name is required';
  end if;

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'At least one menu item is required';
  end if;

  select * into selected_truck
  from public.trucks
  where id = p_truck_id
  for update;

  if not found or not selected_truck.is_active or not selected_truck.accepting_orders then
    raise exception 'This food truck is not accepting orders';
  end if;

  for item_payload in select value from jsonb_array_elements(p_items)
  loop
    item_quantity := (item_payload ->> 'quantity')::integer;
    if item_quantity < 1 or item_quantity > 99 then
      raise exception 'Item quantity must be between 1 and 99';
    end if;

    select * into selected_item
    from public.menu_items
    where id = (item_payload ->> 'menu_item_id')::uuid
      and truck_id = p_truck_id
      and is_active
      and not is_sold_out
    for update;

    if not found then
      raise exception 'A selected menu item is unavailable';
    end if;

    calculated_subtotal := calculated_subtotal + round(selected_item.price * item_quantity, 2);
  end loop;

  if calculated_subtotal < selected_truck.minimum_order then
    raise exception 'The order does not meet the food truck minimum';
  end if;

  calculated_tax := round(calculated_subtotal * selected_truck.tax_rate, 2);
  calculated_total := calculated_subtotal + calculated_tax;

  insert into public.orders (
    customer_id,
    truck_id,
    customer_name,
    customer_mobile,
    customer_email,
    subtotal,
    tax,
    total,
    order_notes,
    payment_label
  )
  values (
    auth.uid(),
    p_truck_id,
    btrim(p_customer_name),
    nullif(btrim(p_customer_mobile), ''),
    nullif(btrim(p_customer_email), ''),
    calculated_subtotal,
    calculated_tax,
    calculated_total,
    nullif(btrim(p_order_notes), ''),
    nullif(btrim(p_payment_label), '')
  )
  returning * into created_order;

  for item_payload in select value from jsonb_array_elements(p_items)
  loop
    item_quantity := (item_payload ->> 'quantity')::integer;
    select * into selected_item
    from public.menu_items
    where id = (item_payload ->> 'menu_item_id')::uuid
      and truck_id = p_truck_id;

    insert into public.order_items (
      order_id,
      menu_item_id,
      item_name,
      unit_price,
      quantity,
      modifiers,
      special_instructions
    )
    values (
      created_order.id,
      selected_item.id,
      selected_item.name,
      selected_item.price,
      item_quantity,
      case
        when jsonb_typeof(item_payload -> 'modifiers') = 'array' then item_payload -> 'modifiers'
        else '[]'::jsonb
      end,
      nullif(btrim(item_payload ->> 'special_instructions'), '')
    );
  end loop;

  return query
  select
    created_order.id,
    created_order.order_number,
    created_order.status,
    created_order.subtotal,
    created_order.tax,
    created_order.total;
end;
$$;

create or replace function public.cancel_my_order(p_order_id uuid)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  updated_order public.orders%rowtype;
begin
  update public.orders
  set status = 'cancelled'
  where id = p_order_id
    and customer_id = auth.uid()
    and status = 'received'
  returning * into updated_order;

  if not found then
    raise exception 'This order cannot be cancelled';
  end if;

  return updated_order;
end;
$$;

alter table public.profiles enable row level security;
alter table public.vendor_profiles enable row level security;
alter table public.trucks enable row level security;
alter table public.truck_members enable row level security;
alter table public.truck_hours enable row level security;
alter table public.menu_categories enable row level security;
alter table public.menu_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_status_events enable row level security;
alter table public.addresses enable row level security;
alter table public.favorite_trucks enable row level security;
alter table public.favorite_orders enable row level security;
alter table public.payment_method_preferences enable row level security;
alter table public.notification_preferences enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles for select
  using (id = auth.uid() or public.is_admin());
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

drop policy if exists vendor_profiles_select_owner on public.vendor_profiles;
create policy vendor_profiles_select_owner on public.vendor_profiles for select
  using (owner_id = auth.uid() or public.is_admin());
drop policy if exists vendor_profiles_update_owner on public.vendor_profiles;
create policy vendor_profiles_update_owner on public.vendor_profiles for update
  using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid() or public.is_admin());

drop policy if exists trucks_public_read on public.trucks;
create policy trucks_public_read on public.trucks for select
  using (is_active or public.owns_truck(id));
drop policy if exists trucks_vendor_insert on public.trucks;
create policy trucks_vendor_insert on public.trucks for insert
  with check (
    exists (select 1 from public.vendor_profiles v where v.id = vendor_id and v.owner_id = auth.uid())
    or public.is_admin()
  );
drop policy if exists trucks_vendor_update on public.trucks;
create policy trucks_vendor_update on public.trucks for update
  using (public.owns_truck(id)) with check (public.owns_truck(id));
drop policy if exists trucks_vendor_delete on public.trucks;
create policy trucks_vendor_delete on public.trucks for delete using (public.owns_truck(id));

drop policy if exists truck_members_read on public.truck_members;
create policy truck_members_read on public.truck_members for select
  using (profile_id = auth.uid() or public.owns_truck(truck_id));
drop policy if exists truck_members_owner_manage on public.truck_members;
create policy truck_members_owner_manage on public.truck_members for all
  using (public.owns_truck(truck_id)) with check (public.owns_truck(truck_id));

drop policy if exists truck_hours_public_read on public.truck_hours;
create policy truck_hours_public_read on public.truck_hours for select
  using (exists (select 1 from public.trucks t where t.id = truck_id and t.is_active) or public.owns_truck(truck_id));
drop policy if exists truck_hours_vendor_manage on public.truck_hours;
create policy truck_hours_vendor_manage on public.truck_hours for all
  using (public.owns_truck(truck_id)) with check (public.owns_truck(truck_id));

drop policy if exists menu_categories_public_read on public.menu_categories;
create policy menu_categories_public_read on public.menu_categories for select
  using (is_active or public.owns_truck(truck_id));
drop policy if exists menu_categories_vendor_manage on public.menu_categories;
create policy menu_categories_vendor_manage on public.menu_categories for all
  using (public.owns_truck(truck_id)) with check (public.owns_truck(truck_id));

drop policy if exists menu_items_public_read on public.menu_items;
create policy menu_items_public_read on public.menu_items for select
  using (is_active or public.owns_truck(truck_id));
drop policy if exists menu_items_vendor_manage on public.menu_items;
create policy menu_items_vendor_manage on public.menu_items for all
  using (public.owns_truck(truck_id)) with check (public.owns_truck(truck_id));

drop policy if exists orders_customer_read on public.orders;
create policy orders_customer_read on public.orders for select
  using (customer_id = auth.uid() or public.owns_truck(truck_id));
drop policy if exists orders_vendor_update on public.orders;
create policy orders_vendor_update on public.orders for update
  using (public.owns_truck(truck_id)) with check (public.owns_truck(truck_id));

drop policy if exists order_items_participant_read on public.order_items;
create policy order_items_participant_read on public.order_items for select
  using (exists (
    select 1 from public.orders o
    where o.id = order_id and (o.customer_id = auth.uid() or public.owns_truck(o.truck_id))
  ));

drop policy if exists order_events_participant_read on public.order_status_events;
create policy order_events_participant_read on public.order_status_events for select
  using (exists (
    select 1 from public.orders o
    where o.id = order_id and (o.customer_id = auth.uid() or public.owns_truck(o.truck_id))
  ));

drop policy if exists addresses_owner_manage on public.addresses;
create policy addresses_owner_manage on public.addresses for all
  using (customer_id = auth.uid()) with check (customer_id = auth.uid());

drop policy if exists favorite_trucks_owner_manage on public.favorite_trucks;
create policy favorite_trucks_owner_manage on public.favorite_trucks for all
  using (customer_id = auth.uid()) with check (customer_id = auth.uid());

drop policy if exists favorite_orders_owner_manage on public.favorite_orders;
create policy favorite_orders_owner_manage on public.favorite_orders for all
  using (customer_id = auth.uid()) with check (
    customer_id = auth.uid()
    and exists (select 1 from public.orders o where o.id = order_id and o.customer_id = auth.uid())
  );

drop policy if exists payment_methods_owner_manage on public.payment_method_preferences;
create policy payment_methods_owner_manage on public.payment_method_preferences for all
  using (customer_id = auth.uid()) with check (customer_id = auth.uid());

drop policy if exists notifications_owner_manage on public.notification_preferences;
create policy notifications_owner_manage on public.notification_preferences for all
  using (customer_id = auth.uid()) with check (customer_id = auth.uid());

revoke all on all tables in schema public from anon, authenticated;
grant select on public.trucks, public.truck_hours, public.menu_categories, public.menu_items to anon, authenticated;
grant select, update on public.profiles to authenticated;
grant select, update on public.vendor_profiles to authenticated;
grant select, insert, update, delete on public.trucks, public.truck_members, public.truck_hours,
  public.menu_categories, public.menu_items to authenticated;
grant select on public.orders, public.order_items, public.order_status_events to authenticated;
grant update (status) on public.orders to authenticated;
grant select, insert, update, delete on public.addresses, public.favorite_trucks, public.favorite_orders,
  public.payment_method_preferences, public.notification_preferences to authenticated;
grant usage, select on sequence public.order_number_seq to authenticated;

revoke all on function public.place_order(uuid, jsonb, text, text, text, text, text) from public, anon;
grant execute on function public.place_order(uuid, jsonb, text, text, text, text, text) to authenticated;
revoke all on function public.cancel_my_order(uuid) from public, anon;
grant execute on function public.cancel_my_order(uuid) to authenticated;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;
revoke all on function public.owns_truck(uuid) from public;
grant execute on function public.owns_truck(uuid) to anon, authenticated;

alter table public.orders replica identity full;
alter table public.order_status_events replica identity full;
alter table public.menu_items replica identity full;
alter table public.trucks replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'orders'
  ) then
    alter publication supabase_realtime add table public.orders;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'order_status_events'
  ) then
    alter publication supabase_realtime add table public.order_status_events;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'menu_items'
  ) then
    alter publication supabase_realtime add table public.menu_items;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'trucks'
  ) then
    alter publication supabase_realtime add table public.trucks;
  end if;
end
$$;

commit;
