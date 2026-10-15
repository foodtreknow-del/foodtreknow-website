-- Repair incomplete legacy vendor accounts and ensure future login failures are actionable.

begin;

-- Some accounts were created before the profile trigger was installed. Restore
-- the customer profile without granting vendor access automatically.
insert into public.profiles (
  id, first_name, last_name, preferred_name, mobile_number, role
)
select
  users.id,
  coalesce(users.raw_user_meta_data ->> 'first_name', ''),
  coalesce(users.raw_user_meta_data ->> 'last_name', ''),
  nullif(users.raw_user_meta_data ->> 'preferred_name', ''),
  coalesce(nullif(users.phone, ''), nullif(users.raw_user_meta_data ->> 'mobile_number', '')),
  'customer'::public.app_role
from auth.users as users
where not exists (
  select 1 from public.profiles as profiles where profiles.id = users.id
);

insert into public.notification_preferences (customer_id)
select profiles.id
from public.profiles as profiles
where not exists (
  select 1
  from public.notification_preferences as preferences
  where preferences.customer_id = profiles.id
)
on conflict (customer_id) do nothing;

-- An approved application is the authority for vendor access. Recreate any
-- missing vendor profile and truck left by earlier/manual approval workflows.
update public.profiles as profiles
set role = 'vendor'::public.app_role
from public.vendor_applications as applications
where applications.applicant_id = profiles.id
  and applications.status = 'approved'
  and profiles.role <> 'vendor'::public.app_role;

insert into public.vendor_profiles (
  owner_id, business_name, contact_email, contact_mobile
)
select
  applications.applicant_id,
  applications.business_name,
  applications.business_email,
  applications.business_mobile
from public.vendor_applications as applications
where applications.status = 'approved'
on conflict (owner_id) do update set
  business_name = excluded.business_name,
  contact_email = excluded.contact_email,
  contact_mobile = excluded.contact_mobile;

insert into public.trucks (
  vendor_id, slug, name, cuisine, description, contact_email,
  contact_mobile, location_name, accepting_orders, is_active
)
select
  vendors.id,
  trim(both '-' from regexp_replace(lower(applications.truck_name), '[^a-z0-9]+', '-', 'g'))
    || '-' || left(replace(applications.id::text, '-', ''), 8),
  applications.truck_name,
  applications.cuisine,
  applications.description,
  applications.business_email,
  applications.business_mobile,
  applications.city || ', ' || applications.state,
  false,
  true
from public.vendor_applications as applications
join public.vendor_profiles as vendors on vendors.owner_id = applications.applicant_id
where applications.status = 'approved'
  and not exists (
    select 1 from public.trucks as trucks where trucks.vendor_id = vendors.id
  )
on conflict (slug) do nothing;

commit;
