-- FoodTrekNow Phase 4: authenticated customers may permanently delete only
-- their own account. Cascading foreign keys remove the related profile data.

begin;

-- Completed orders remain available to the vendor for receipts and reporting,
-- but are detached from the customer when that customer deletes their account.
alter table public.orders drop constraint if exists orders_customer_id_fkey;
alter table public.orders alter column customer_id drop not null;
alter table public.orders
  add constraint orders_customer_id_fkey
  foreign key (customer_id) references public.profiles(id) on delete set null;

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Authentication is required';
  end if;

  delete from auth.users where id = current_user_id;
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

commit;
