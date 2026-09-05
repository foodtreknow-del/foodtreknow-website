import { createClient } from 'npm:@supabase/supabase-js@2';

const configuredOrigins = (Deno.env.get('APP_ORIGINS') || Deno.env.get('APP_BASE_URL') || '').split(',').map(value => value.trim().replace(/\/$/, '')).filter(Boolean);
const developmentOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000'];
function requiredEnvironment(name: string) { const value = Deno.env.get(name); if (!value) throw new Error(`${name} is not configured.`); return value; }
function isAllowedOrigin(request: Request) { const origin = request.headers.get('origin'); return !origin || configuredOrigins.includes(origin.replace(/\/$/, '')) || developmentOrigins.includes(origin); }
function json(request: Request, body: unknown, status = 200) { const origin = request.headers.get('origin')?.replace(/\/$/, ''); const allowed = origin && isAllowedOrigin(request) ? origin : configuredOrigins[0] || developmentOrigins[0]; return new Response(JSON.stringify(body), { status, headers: { 'Access-Control-Allow-Origin': allowed, 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Content-Type': 'application/json', Vary: 'Origin' } }); }
function messageFrom(error: unknown) { return error instanceof Error ? error.message : 'The request could not be completed.'; }
async function authenticatedVendor(request: Request) { const authorization = request.headers.get('Authorization'); if (!authorization?.startsWith('Bearer ')) throw new Error('Sign in with an approved vendor account.'); const url = requiredEnvironment('SUPABASE_URL'); const userClient = createClient(url, requiredEnvironment('SUPABASE_ANON_KEY'), { global: { headers: { Authorization: authorization } }, auth: { persistSession: false, autoRefreshToken: false } }); const { data: userData, error: userError } = await userClient.auth.getUser(authorization.slice(7).trim()); if (userError || !userData.user) throw new Error('Your vendor session has expired. Please sign in again.'); const serviceClient = createClient(url, requiredEnvironment('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false, autoRefreshToken: false } }); const { data: vendor, error } = await serviceClient.from('vendor_profiles').select('id, business_name, contact_email').eq('owner_id', userData.user.id).single(); if (error || !vendor) throw new Error('Only an approved vendor can pay an event fee.'); return { serviceClient, user: userData.user, vendor }; }
async function stripeRequest<T>(path: string, options: { method?: 'GET' | 'POST'; form?: URLSearchParams; stripeAccountId: string; idempotencyKey?: string }) { const headers: Record<string, string> = { Authorization: `Bearer ${requiredEnvironment('STRIPE_SECRET_KEY')}`, 'Stripe-Account': options.stripeAccountId }; if (options.form) headers['Content-Type'] = 'application/x-www-form-urlencoded'; if (options.idempotencyKey) headers['Idempotency-Key'] = options.idempotencyKey; const response = await fetch(`https://api.stripe.com${path}`, { method: options.method || (options.form ? 'POST' : 'GET'), headers, body: options.form?.toString() }); const payload = await response.json(); if (!response.ok) throw new Error(payload?.error?.message || 'Stripe could not complete the event payment request.'); return payload as T; }

function checkoutUrl(result: 'success' | 'cancelled', values: Record<string, string> = {}) {
  const url = new URL(Deno.env.get('APP_BASE_URL') || 'http://localhost:3000');
  if (url.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(url.hostname)) {
    throw new Error('APP_BASE_URL must use HTTPS outside local development.');
  }
  url.searchParams.set('event_fee', result);
  Object.entries(values).forEach(([key, value]) => url.searchParams.set(key, value));
  return url.toString().replace('%7BCHECKOUT_SESSION_ID%7D', '{CHECKOUT_SESSION_ID}');
}

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return json(request, { ok: true });
  if (request.method !== 'POST') return json(request, { error: 'Method not allowed.' }, 405);
  if (!isAllowedOrigin(request)) return json(request, { error: 'This website origin is not allowed.' }, 403);
  try {
    const { serviceClient, user, vendor } = await authenticatedVendor(request);
    const body = await request.json().catch(() => ({}));
    const bookingId = String(body.bookingId || '');
    if (!/^[0-9a-f-]{36}$/i.test(bookingId)) throw new Error('Choose a valid event booking.');
    const { data: booking, error: bookingError } = await serviceClient.from('opportunity_bookings')
      .select('id, status, vendor_profile_id, opportunity_id, truck_id')
      .eq('id', bookingId).eq('vendor_profile_id', vendor.id).single();
    if (bookingError || !booking) throw new Error('This event booking does not belong to your food truck.');
    if (booking.status !== 'confirmed') throw new Error('Only a confirmed event booking can be paid.');
    const { data: payment, error: paymentError } = await serviceClient.from('event_fee_payments')
      .select('*').eq('booking_id', booking.id).single();
    if (paymentError || !payment) throw new Error('This booking has no event fee to pay.');
    if (payment.status === 'paid') throw new Error('This event fee is already paid.');
    if (payment.status === 'refunded') throw new Error('This event fee was refunded and cannot be paid again.');
    if (Number(payment.amount_due_cents) < 50) throw new Error('Stripe requires the event payment total to be at least $0.50.');
    const { data: hostAccount, error: hostError } = await serviceClient.from('host_stripe_connect_accounts')
      .select('*').eq('host_id', payment.host_id).single();
    if (hostError || !hostAccount || hostAccount.status !== 'active' || !hostAccount.charges_enabled) {
      throw new Error('The Host must finish connecting Stripe before this event fee can be paid.');
    }

    if (payment.status === 'checkout_open' && payment.stripe_checkout_session_id && payment.stripe_account_id) {
      try {
        await stripeRequest(`/v1/checkout/sessions/${encodeURIComponent(payment.stripe_checkout_session_id)}/expire`, {
          method: 'POST', stripeAccountId: payment.stripe_account_id
        });
      } catch {}
    }
    const attempt = Number(payment.checkout_attempts || 0) + 1;
    const form = new URLSearchParams();
    let line = 0;
    if (Number(payment.flat_fee_cents) > 0) {
      form.set(`line_items[${line}][price_data][currency]`, payment.currency);
      form.set(`line_items[${line}][price_data][product_data][name]`, 'Food truck event fee');
      form.set(`line_items[${line}][price_data][unit_amount]`, String(payment.flat_fee_cents));
      form.set(`line_items[${line}][quantity]`, '1');
      line += 1;
    }
    if (Number(payment.refundable_deposit_cents) > 0) {
      form.set(`line_items[${line}][price_data][currency]`, payment.currency);
      form.set(`line_items[${line}][price_data][product_data][name]`, 'Refundable event deposit');
      form.set(`line_items[${line}][price_data][unit_amount]`, String(payment.refundable_deposit_cents));
      form.set(`line_items[${line}][quantity]`, '1');
    }
    form.set('mode', 'payment');
    form.set('success_url', checkoutUrl('success', { session_id: '{CHECKOUT_SESSION_ID}' }));
    form.set('cancel_url', checkoutUrl('cancelled', { booking_id: booking.id }));
    form.set('client_reference_id', payment.id);
    form.set('metadata[foodtreknow_event_fee]', 'true');
    form.set('metadata[foodtreknow_event_fee_payment_id]', payment.id);
    form.set('metadata[foodtreknow_booking_id]', booking.id);
    form.set('metadata[foodtreknow_vendor_profile_id]', vendor.id);
    form.set('metadata[foodtreknow_host_id]', payment.host_id);
    form.set('payment_intent_data[metadata][foodtreknow_event_fee_payment_id]', payment.id);
    form.set('expires_at', String(Math.floor(Date.now() / 1000) + 35 * 60));
    if (vendor.contact_email || user.email) form.set('customer_email', vendor.contact_email || user.email || '');
    const session = await stripeRequest<{ id: string; url: string; expires_at?: number }>('/v1/checkout/sessions', {
      form,
      stripeAccountId: hostAccount.stripe_account_id,
      idempotencyKey: `foodtreknow-event-fee-${payment.id}-${attempt}`
    });
    const { error: saveError } = await serviceClient.from('event_fee_payments').update({
      status: 'checkout_open', checkout_attempts: attempt,
      stripe_account_id: hostAccount.stripe_account_id,
      stripe_checkout_session_id: session.id
    }).eq('id', payment.id);
    if (saveError) throw saveError;
    return json(request, { checkoutUrl: session.url, sessionId: session.id });
  } catch (error) {
    console.error('Event fee Checkout start failed:', messageFrom(error));
    return json(request, { error: messageFrom(error) }, 400);
  }
});
