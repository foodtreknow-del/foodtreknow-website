-- Administrator-only directory for FoodTrekNow customers, vendors, and hosts.
-- Contact details are returned only after the caller passes public.is_admin().

begin;

create or replace function public.admin_contact_directory_snapshot()
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
    'generatedAt', now(),
    'customers', coalesce((
      select jsonb_agg(jsonb_build_object(
        'profileId', profile.id,
        'displayName', coalesce(nullif(profile.preferred_name, ''), nullif(btrim(profile.first_name || ' ' || profile.last_name), ''), account.email),
        'firstName', profile.first_name,
        'lastName', profile.last_name,
        'username', account.email,
        'email', account.email,
        'mobile', profile.mobile_number,
        'createdAt', profile.created_at
      ) order by coalesce(nullif(profile.preferred_name, ''), nullif(profile.first_name, ''), account.email))
      from public.profiles profile
      join auth.users account on account.id = profile.id
      where profile.role = 'customer'
        and not exists (select 1 from public.vendor_profiles vendor where vendor.owner_id = profile.id)
        and not exists (select 1 from public.location_hosts host where host.owner_id = profile.id)
    ), '[]'::jsonb),
    'vendors', coalesce((
      select jsonb_agg(jsonb_build_object(
        'vendorProfileId', vendor.id,
        'ownerProfileId', profile.id,
        'vendorName', coalesce(nullif(profile.preferred_name, ''), nullif(btrim(profile.first_name || ' ' || profile.last_name), ''), vendor.business_name),
        'businessName', vendor.business_name,
        'username', account.email,
        'email', coalesce(nullif(vendor.contact_email, ''), account.email),
        'loginEmail', account.email,
        'mobile', coalesce(nullif(vendor.contact_mobile, ''), profile.mobile_number),
        'trucks', coalesce((
          select jsonb_agg(jsonb_build_object(
            'truckId', truck.id,
            'name', truck.name,
            'email', coalesce(nullif(truck.contact_email, ''), nullif(vendor.contact_email, ''), account.email),
            'mobile', coalesce(nullif(truck.contact_mobile, ''), nullif(vendor.contact_mobile, ''), profile.mobile_number),
            'location', truck.location_name,
            'isActive', truck.is_active
          ) order by truck.name)
          from public.trucks truck where truck.vendor_id = vendor.id
        ), '[]'::jsonb),
        'createdAt', vendor.created_at
      ) order by vendor.business_name)
      from public.vendor_profiles vendor
      join public.profiles profile on profile.id = vendor.owner_id
      join auth.users account on account.id = vendor.owner_id
    ), '[]'::jsonb),
    'hosts', coalesce((
      select jsonb_agg(jsonb_build_object(
        'hostId', host.id,
        'ownerProfileId', profile.id,
        'hostName', host.host_name,
        'businessName', host.business_name,
        'ownerName', coalesce(nullif(profile.preferred_name, ''), nullif(btrim(profile.first_name || ' ' || profile.last_name), ''), host.host_name),
        'username', account.email,
        'email', coalesce(nullif(host.contact_email, ''), account.email),
        'loginEmail', account.email,
        'mobile', coalesce(nullif(host.contact_phone, ''), profile.mobile_number),
        'verificationStatus', host.verification_status,
        'locations', coalesce((
          select jsonb_agg(jsonb_build_object(
            'locationId', location.id,
            'name', location.name,
            'address', concat_ws(', ', nullif(location.address_line1, ''), nullif(location.address_line2, ''), nullif(location.city, ''), nullif(location.state, ''), nullif(location.postal_code, '')),
            'isActive', location.is_active
          ) order by location.name)
          from public.host_locations location where location.host_id = host.id
        ), '[]'::jsonb),
        'createdAt', host.created_at
      ) order by host.host_name)
      from public.location_hosts host
      join public.profiles profile on profile.id = host.owner_id
      join auth.users account on account.id = host.owner_id
    ), '[]'::jsonb)
  ) into result;

  return result;
end;
$$;

revoke all on function public.admin_contact_directory_snapshot() from public, anon;
grant execute on function public.admin_contact_directory_snapshot() to authenticated;

comment on function public.admin_contact_directory_snapshot() is
  'Returns customer, vendor, truck, and host contact directory data to FoodTrekNow administrators only. Passwords and financial credentials are never returned.';

commit;
