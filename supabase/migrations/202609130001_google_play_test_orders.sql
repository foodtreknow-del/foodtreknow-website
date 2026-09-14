-- Identify no-charge Google Play testing orders without mixing them into live sales reporting.

begin;

alter table public.orders
  add column if not exists is_test_order boolean not null default false;

comment on column public.orders.is_test_order is
  'True only for allowlisted Google Play testing orders that never charged a payment method.';

create index if not exists orders_test_mode_created_at_idx
  on public.orders (is_test_order, created_at desc);

commit;
