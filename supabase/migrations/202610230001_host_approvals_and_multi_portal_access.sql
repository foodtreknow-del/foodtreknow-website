-- FoodTrekNow: approved Customer/Vendor/Host portal access on one account.

begin;

do $$
begin
  create type public.host_application_status as enum ('pending', 'approved', 'rejected', 'withdrawn');
exception
  when duplicate_object then null;
end
$$;

create table if not exists public.host_applications (
  id uuid primary key default gen_random_uuid(),
  applicant_id uuid not null unique references public.profiles(id) on delete cascade,
  host_kind text not null check (host_kind in ('business', 'property_manager', 'event_organizer', 'community', 'other')),
  host_name text not null,
  business_name text not null,
  contact_email text not null,
  contact_phone text not null,
  status public.host_application_status not null default 'pending',
  review_notes text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_host_applications_status
  on public.host_applications(status, created_at);

drop trigger if exists set_host_applications_updated_at on public.host_applications;
create trigger set_host_applications_updated_at
  before update on public.host_applications
  for each row execute function public.set_updated_at();

alter table public.host_applications enable row level security;

drop policy if exists host_applications_read on public.host_applications;
create policy host_applications_read on public.host_applications for select
  using (applicant_id = auth.uid() or public.is_admin());

grant select on public.host_applications to authenticated;

-- Hosts created before approval applications existed are trusted legacy hosts.
update public.location_hosts
set verification_status = 'verified', updated_at = now()
where verification_status = 'pending';

create or replace function public.submit_host_application(
  p_host_kind text,
  p_host_name text,
  p_business_name text,
  p_contact_email text,
  p_contact_phone text
)
returns public.host_applications
language plpgsql
security definer
set search_path = ''
as $$
declare
  application public.host_applications%rowtype;
begin
  if auth.uid() is null then raise exception 'Authentication is required'; end if;
  if exists (select 1 from public.location_hosts where owner_id = auth.uid() and verification_status = 'verified') then
    raise exception 'This account is already approved as a Host';
  end if;
  if p_host_kind not in ('business', 'property_manager', 'event_organizer', 'community', 'other') then
    raise exception 'Select a valid Host type';
  end if;
  if char_length(btrim(coalesce(p_host_name, ''))) < 2 or char_length(btrim(coalesce(p_business_name, ''))) < 2 then
    raise exception 'Host and business names are required';
  end if;
  if position('@' in coalesce(p_contact_email, '')) <= 1 then raise exception 'Enter a valid contact email'; end if;
  if char_length(btrim(coalesce(p_contact_phone, ''))) < 7 then raise exception 'Enter a valid contact phone'; end if;

  insert into public.host_applications (
    applicant_id, host_kind, host_name, business_name, contact_email, contact_phone,
    status, review_notes, reviewed_by, reviewed_at
  ) values (
    auth.uid(), p_host_kind, btrim(p_host_name), btrim(p_business_name),
    lower(btrim(p_contact_email)), btrim(p_contact_phone),
    'pending', null, null, null
  )
  on conflict (applicant_id) do update set
    host_kind = excluded.host_kind,
    host_name = excluded.host_name,
    business_name = excluded.business_name,
    contact_email = excluded.contact_email,
    contact_phone = excluded.contact_phone,
    status = 'pending',
    review_notes = null,
    reviewed_by = null,
    reviewed_at = null
  where public.host_applications.status in ('rejected', 'withdrawn')
  returning * into application;

  if application.id is null then raise exception 'A Host application is already pending or approved'; end if;
  return application;
end;
$$;

create or replace function public.review_host_application(
  p_application_id uuid,
  p_decision public.host_application_status,
  p_review_notes text default null
)
returns public.host_applications
language plpgsql
security definer
set search_path = ''
as $$
declare
  application public.host_applications%rowtype;
begin
  if not public.is_admin() then raise exception 'Administrator access is required'; end if;
  if p_decision not in ('approved', 'rejected') then raise exception 'Decision must be approved or rejected'; end if;

  select * into application
  from public.host_applications
  where id = p_application_id and status = 'pending'
  for update;
  if not found then raise exception 'This Host application is no longer pending'; end if;

  if p_decision = 'approved' then
    insert into public.location_hosts (
      owner_id, host_kind, host_name, business_name, contact_email, contact_phone, verification_status
    ) values (
      application.applicant_id, application.host_kind, application.host_name,
      application.business_name, application.contact_email, application.contact_phone, 'verified'
    )
    on conflict (owner_id) do update set
      host_kind = excluded.host_kind,
      host_name = excluded.host_name,
      business_name = excluded.business_name,
      contact_email = excluded.contact_email,
      contact_phone = excluded.contact_phone,
      verification_status = 'verified',
      updated_at = now();
  end if;

  update public.host_applications set
    status = p_decision,
    review_notes = nullif(btrim(p_review_notes), ''),
    reviewed_by = auth.uid(),
    reviewed_at = now()
  where id = p_application_id
  returning * into application;

  return application;
end;
$$;

-- Editing Host contact information is allowed only after administrator approval.
create or replace function public.upsert_location_host(
  p_host_kind text,
  p_host_name text,
  p_business_name text,
  p_contact_email text,
  p_contact_phone text
)
returns public.location_hosts
language plpgsql
security definer
set search_path = ''
as $$
declare
  saved public.location_hosts%rowtype;
begin
  if auth.uid() is null then raise exception 'Sign in to manage a Host account'; end if;
  if p_host_kind not in ('business', 'property_manager', 'event_organizer', 'community', 'other') then raise exception 'Select a valid Host type'; end if;
  if char_length(btrim(coalesce(p_host_name, ''))) < 2 or char_length(btrim(coalesce(p_business_name, ''))) < 2 then raise exception 'Host and business names are required'; end if;
  if position('@' in coalesce(p_contact_email, '')) <= 1 then raise exception 'Enter a valid contact email'; end if;
  if char_length(btrim(coalesce(p_contact_phone, ''))) < 7 then raise exception 'Enter a valid contact phone'; end if;

  update public.location_hosts set
    host_kind = p_host_kind,
    host_name = btrim(p_host_name),
    business_name = btrim(p_business_name),
    contact_email = lower(btrim(p_contact_email)),
    contact_phone = btrim(p_contact_phone),
    updated_at = now()
  where owner_id = auth.uid() and verification_status = 'verified'
  returning * into saved;

  if saved.id is null then raise exception 'Host approval is required before opening the Host Portal'; end if;
  return saved;
end;
$$;

create or replace function public.current_portal_access()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'is_admin', public.is_admin(),
    'vendor_approved', exists(select 1 from public.vendor_profiles v where v.owner_id = auth.uid()),
    'vendor_profile_id', (select v.id from public.vendor_profiles v where v.owner_id = auth.uid() limit 1),
    'truck_id', (
      select t.id from public.trucks t
      join public.vendor_profiles v on v.id = t.vendor_id
      where v.owner_id = auth.uid() and t.is_active = true
      order by t.created_at limit 1
    ),
    'host_approved', exists(select 1 from public.location_hosts h where h.owner_id = auth.uid() and h.verification_status = 'verified'),
    'host_id', (select h.id from public.location_hosts h where h.owner_id = auth.uid() and h.verification_status = 'verified' limit 1),
    'vendor_application_status', (select va.status::text from public.vendor_applications va where va.applicant_id = auth.uid() limit 1),
    'host_application_status', (select ha.status::text from public.host_applications ha where ha.applicant_id = auth.uid() limit 1)
  )
$$;

revoke all on function public.submit_host_application(text, text, text, text, text) from public, anon;
grant execute on function public.submit_host_application(text, text, text, text, text) to authenticated;
revoke all on function public.review_host_application(uuid, public.host_application_status, text) from public, anon;
grant execute on function public.review_host_application(uuid, public.host_application_status, text) to authenticated;
revoke all on function public.current_portal_access() from public, anon;
grant execute on function public.current_portal_access() to authenticated;
revoke all on function public.upsert_location_host(text, text, text, text, text) from public, anon;
grant execute on function public.upsert_location_host(text, text, text, text, text) to authenticated;

commit;
