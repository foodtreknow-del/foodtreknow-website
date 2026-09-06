-- Lock agreed financial terms after any food truck has been approved.

begin;

create or replace function public.protect_approved_opportunity_terms()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (
    old.flat_vendor_fee is distinct from new.flat_vendor_fee
    or old.sales_percentage is distinct from new.sales_percentage
    or old.minimum_sales_guarantee is distinct from new.minimum_sales_guarantee
    or old.refundable_deposit is distinct from new.refundable_deposit
  ) and exists (
    select 1
    from public.opportunity_bookings b
    where b.opportunity_id = old.id
  ) then
    raise exception 'Financial terms cannot be changed after a food truck has been approved';
  end if;

  return new;
end;
$$;

drop trigger if exists protect_approved_opportunity_terms on public.opportunities;
create trigger protect_approved_opportunity_terms
before update of flat_vendor_fee, sales_percentage, minimum_sales_guarantee, refundable_deposit
on public.opportunities
for each row execute function public.protect_approved_opportunity_terms();

revoke all on function public.protect_approved_opportunity_terms() from public, anon, authenticated;

commit;
