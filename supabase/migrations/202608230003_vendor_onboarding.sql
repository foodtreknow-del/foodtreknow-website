-- FoodTrekNow Phase 4: vendor applications and administrator approval.

begin;

do $$
begin
  create type public.vendor_application_status as enum ('pending', 'approved', 'rejected', 'withdrawn');
exception
  when duplicate_object then null;
end
$$;

create table if not exists public.vendor_applications (
  id uuid primary key default gen_random_uuid(),
  applicant_id uuid not null unique references public.profiles(id) on delete cascade,
  business_name text not null,
  truck_name text not null,
  cuisine text not null,
  business_email text not null,
  business_mobile text not null,
  city text not null,
  state text not null,
  description text,
  status public.vendor_application_status not null default 'pending',
  review_notes text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_vendor_applications_status
  on public.vendor_applications(status, created_at);

drop trigger if exists set_vendor_applications_updated_at on public.vendor_applications;
create trigger set_vendor_applications_updated_at
  before update on public.vendor_applications
  for each row execute function public.set_updated_at();

alter table public.vendor_applications enable row level security;

drop policy if exists vendor_applications_read on public.vendor_applications;
create policy vendor_applications_read on public.vendor_applications for select
  using (applicant_id = auth.uid() or public.is_admin());

grant select on public.vendor_applications to authenticated;

create or replace function public.submit_vendor_application(
  p_business_name text,
  p_truck_name text,
  p_cuisine text,
  p_business_email text,
  p_business_mobile text,
  p_city text,
  p_state text,
  p_description text default null
)
returns public.vendor_applications
language plpgsql
security definer
set search_path = ''
as $$
declare
  applicant_role public.app_role;
  application public.vendor_applications%rowtype;
begin
  if auth.uid() is null then raise exception 'Authentication is required'; end if;

  select role into applicant_role from public.profiles where id = auth.uid();
  if applicant_role is null then raise exception 'Customer profile not found'; end if;
  if applicant_role = 'vendor' then raise exception 'This account is already approved as a vendor'; end if;

  if btrim(coalesce(p_business_name, '')) = '' or btrim(coalesce(p_truck_name, '')) = ''
    or btrim(coalesce(p_cuisine, '')) = '' or btrim(coalesce(p_business_email, '')) = ''
    or btrim(coalesce(p_business_mobile, '')) = '' or btrim(coalesce(p_city, '')) = ''
    or length(btrim(coalesce(p_state, ''))) <> 2 then
    raise exception 'Complete every required vendor application field';
  end if;

  insert into public.vendor_applications (
    applicant_id, business_name, truck_name, cuisine, business_email,
    business_mobile, city, state, description, status,
    review_notes, reviewed_by, reviewed_at
  ) values (
    auth.uid(), btrim(p_business_name), btrim(p_truck_name), btrim(p_cuisine),
    lower(btrim(p_business_email)), btrim(p_business_mobile), btrim(p_city),
    upper(btrim(p_state)), nullif(btrim(p_description), ''), 'pending',
    null, null, null
  )
  on conflict (applicant_id) do update set
    business_name = excluded.business_name,
    truck_name = excluded.truck_name,
    cuisine = excluded.cuisine,
    business_email = excluded.business_email,
    business_mobile = excluded.business_mobile,
    city = excluded.city,
    state = excluded.state,
    description = excluded.description,
    status = 'pending',
    review_notes = null,
    reviewed_by = null,
    reviewed_at = null
  where public.vendor_applications.status in ('rejected', 'withdrawn')
  returning * into application;

  if application.id is null then
    raise exception 'A vendor application is already pending or approved';
  end if;
  return application;
end;
$$;

create or replace function public.review_vendor_application(
  p_application_id uuid,
  p_decision public.vendor_application_status,
  p_review_notes text default null
)
returns public.vendor_applications
language plpgsql
security definer
set search_path = ''
as $$
declare
  application public.vendor_applications%rowtype;
  created_vendor_id uuid;
  generated_slug text;
begin
  if not public.is_admin() then raise exception 'Administrator access is required'; end if;
  if p_decision not in ('approved', 'rejected') then raise exception 'Decision must be approved or rejected'; end if;

  select * into application
  from public.vendor_applications
  where id = p_application_id and status = 'pending'
  for update;
  if not found then raise exception 'This vendor application is no longer pending'; end if;

  if p_decision = 'approved' then
    update public.profiles set role = 'vendor' where id = application.applicant_id;

    insert into public.vendor_profiles (owner_id, business_name, contact_email, contact_mobile)
    values (application.applicant_id, application.business_name, application.business_email, application.business_mobile)
    on conflict (owner_id) do update set
      business_name = excluded.business_name,
      contact_email = excluded.contact_email,
      contact_mobile = excluded.contact_mobile
    returning id into created_vendor_id;

    generated_slug := trim(both '-' from regexp_replace(lower(application.truck_name), '[^a-z0-9]+', '-', 'g'))
      || '-' || left(replace(application.id::text, '-', ''), 8);

    insert into public.trucks (
      vendor_id, slug, name, cuisine, description, contact_email,
      contact_mobile, location_name, accepting_orders, is_active
    ) values (
      created_vendor_id, generated_slug, application.truck_name, application.cuisine,
      application.description, application.business_email, application.business_mobile,
      application.city || ', ' || application.state, false, true
    ) on conflict (slug) do nothing;
  end if;

  update public.vendor_applications set
    status = p_decision,
    review_notes = nullif(btrim(p_review_notes), ''),
    reviewed_by = auth.uid(),
    reviewed_at = now()
  where id = p_application_id
  returning * into application;

  return application;
end;
$$;

revoke all on function public.submit_vendor_application(text, text, text, text, text, text, text, text) from public, anon;
grant execute on function public.submit_vendor_application(text, text, text, text, text, text, text, text) to authenticated;
revoke all on function public.review_vendor_application(uuid, public.vendor_application_status, text) from public, anon;
grant execute on function public.review_vendor_application(uuid, public.vendor_application_status, text) to authenticated;

commit;
