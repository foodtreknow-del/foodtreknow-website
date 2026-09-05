# Host Event Fee Payments

FoodTrekNow processes flat event fees and refundable deposits as Stripe direct charges on the Host's connected account. FoodTrekNow does not hold the Host's funds and does not add an application fee.

## Payment lifecycle

1. A Host creates a Host profile and connects Stripe from the Host **Payments** tab.
2. The Host posts an opportunity with an optional flat fee, refundable deposit, or post-event sales percentage.
3. An approved or instant booking creates a server-owned payment snapshot from the opportunity amounts.
4. The food truck opens **Bookings** and selects **Pay Event Fee**.
5. A Supabase Edge Function verifies the vendor, booking, fee, and Host Stripe account before creating Checkout on the Host's connected account.
6. The return handler and Stripe webhook independently verify the paid session, amount, connected account, and metadata.
7. Both participants see the paid status. A Stripe receipt is shown when available.
8. The Host can issue a confirmed full refund of the flat fee and deposit. Partial refunds aren't enabled in this release.

Percentage-of-sales fees are displayed as a separate post-event settlement because the final sales total isn't known at booking time.

## Production deployment order

1. Apply `supabase/migrations/202609040001_host_event_fee_payments.sql` in the Supabase SQL Editor.
2. Deploy these Edge Functions with JWT verification enabled:
   - `stripe-host-connect-start`
   - `stripe-host-connect-status`
   - `stripe-event-fee-checkout-start`
   - `stripe-event-fee-checkout-complete`
   - `stripe-event-fee-refund`
3. Redeploy the updated `stripe-webhook` function with JWT verification disabled because Stripe signs webhook requests instead.
4. Confirm each function has access to the existing `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `APP_BASE_URL`, and `APP_ORIGINS` secrets.
5. Confirm the existing Stripe webhook destination receives Connect events for connected accounts, including Checkout Session completion/expiration and refund updates.
6. Deploy the web application, connect a test Host Stripe account, approve a paid opportunity, and complete one Stripe test payment and refund before accepting live event fees.

Never place a Stripe secret key, Supabase service-role key, card number, or webhook signing secret in browser code or this repository.
