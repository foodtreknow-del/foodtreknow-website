-- Approved vendors receive immediate portal access. Administrators retain the
-- explicit freeze control for unpaid or suspended accounts. All vendor data
-- continues to be authorized and queried by the individual truck UUID.

begin;

create or replace function public.vendor_subscription_access_allowed(p_vendor_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.vendor_profiles vendor
    where vendor.id = p_vendor_profile_id
  ) and not exists (
    select 1
    from public.vendor_admin_controls control
    where control.vendor_profile_id = p_vendor_profile_id
      and control.is_frozen
  );
$$;

revoke all on function public.vendor_subscription_access_allowed(uuid) from public, anon;
grant execute on function public.vendor_subscription_access_allowed(uuid) to authenticated;

-- The existing activation trigger now enforces the administrator freeze state,
-- instead of hiding every newly approved truck until Stripe billing starts.
create or replace function public.enforce_truck_subscription_activation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.is_active := public.vendor_subscription_access_allowed(new.vendor_id);
  return new;
end;
$$;

-- Make every approved, non-frozen food truck discoverable to customers now.
update public.trucks truck
set is_active = true
from public.vendor_profiles vendor
join public.vendor_applications application
  on application.applicant_id = vendor.owner_id
 and application.status = 'approved'
where truck.vendor_id = vendor.id
  and not exists (
    select 1
    from public.vendor_admin_controls control
    where control.vendor_profile_id = vendor.id
      and control.is_frozen
  );

commit;
