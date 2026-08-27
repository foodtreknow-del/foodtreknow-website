-- Restore public customer access to active trucks without granting access to
-- private vendor profile records. The security-definer owns_truck helper
-- handles authenticated vendor/admin access safely.

begin;

drop policy if exists trucks_public_read on public.trucks;
create policy trucks_public_read
on public.trucks
for select
using (
  is_active
  or public.owns_truck(id)
);

commit;
