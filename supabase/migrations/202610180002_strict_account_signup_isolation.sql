-- Keep every customer, vendor, food truck, and Host account independent.
-- Approval may create missing records for the applicant, but it must never
-- overwrite an existing vendor profile or food truck.

begin;

create or replace function public.protect_vendor_application_owner()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.applicant_id is distinct from old.applicant_id then
    raise exception 'A vendor application cannot be transferred between accounts';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_vendor_application_owner on public.vendor_applications;
create trigger protect_vendor_application_owner
before update on public.vendor_applications
for each row execute function public.protect_vendor_application_owner();

create or replace function public.protect_opportunity_host()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.host_id is distinct from old.host_id then
    raise exception 'An event cannot be transferred between Host accounts';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_opportunity_host on public.opportunities;
create trigger protect_opportunity_host
before update on public.opportunities
for each row execute function public.protect_opportunity_host();

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
  applicant_vendor_id uuid;
  applicant_truck_id uuid;
  generated_slug text;
begin
  if not public.is_admin() then
    raise exception 'Administrator access is required';
  end if;
  if p_decision not in ('approved', 'rejected') then
    raise exception 'Decision must be approved or rejected';
  end if;

  select * into application
  from public.vendor_applications
  where id = p_application_id
    and status = 'pending'
  for update;
  if not found then
    raise exception 'This vendor application is no longer pending';
  end if;

  if p_decision = 'approved' then
    update public.profiles
    set role = 'vendor'
    where id = application.applicant_id;

    select vendor.id into applicant_vendor_id
    from public.vendor_profiles vendor
    where vendor.owner_id = application.applicant_id
    for update;

    if applicant_vendor_id is null then
      insert into public.vendor_profiles (
        owner_id, business_name, contact_email, contact_mobile
      ) values (
        application.applicant_id,
        application.business_name,
        application.business_email,
        application.business_mobile
      )
      returning id into applicant_vendor_id;
    end if;

    select truck.id into applicant_truck_id
    from public.trucks truck
    where truck.vendor_id = applicant_vendor_id
    for update;

    if applicant_truck_id is null then
      generated_slug := trim(both '-' from regexp_replace(
        lower(application.truck_name), '[^a-z0-9]+', '-', 'g'
      )) || '-' || left(replace(application.id::text, '-', ''), 8);

      insert into public.trucks (
        vendor_id, slug, name, cuisine, description, contact_email,
        contact_mobile, location_name, accepting_orders, is_active
      ) values (
        applicant_vendor_id,
        generated_slug,
        application.truck_name,
        application.cuisine,
        application.description,
        application.business_email,
        application.business_mobile,
        application.city || ', ' || application.state,
        false,
        true
      );
    end if;
  end if;

  update public.vendor_applications
  set status = p_decision,
      review_notes = nullif(btrim(p_review_notes), ''),
      reviewed_by = auth.uid(),
      reviewed_at = now()
  where id = p_application_id
  returning * into application;

  return application;
end;
$$;

revoke all on function public.review_vendor_application(uuid, public.vendor_application_status, text)
from public, anon;
grant execute on function public.review_vendor_application(uuid, public.vendor_application_status, text)
to authenticated;

commit;

