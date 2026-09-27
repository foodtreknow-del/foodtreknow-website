import { createClient } from 'npm:@supabase/supabase-js@2';

const configuredOrigins = (Deno.env.get('APP_ORIGINS') || Deno.env.get('APP_BASE_URL') || '')
  .split(',').map(value => value.trim().replace(/\/$/, '')).filter(Boolean);
const developmentOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000', 'https://localhost', 'capacitor://localhost'];

function isAllowedOrigin(request: Request) {
  const origin = request.headers.get('origin');
  return !origin || configuredOrigins.includes(origin.replace(/\/$/, '')) || developmentOrigins.includes(origin);
}

function json(request: Request, body: unknown, status = 200) {
  const origin = request.headers.get('origin')?.replace(/\/$/, '');
  const allowedOrigin = origin && isAllowedOrigin(request) ? origin : configuredOrigins[0] || developmentOrigins[0];
  return new Response(JSON.stringify(body), { status, headers: {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
    'Vary': 'Origin'
  }});
}

function requiredEnvironment(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

function allowedTesterEmails() {
  return new Set(requiredEnvironment('GOOGLE_PLAY_TESTER_EMAILS')
    .split(',').map(value => value.trim().toLowerCase()).filter(Boolean));
}

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return json(request, { ok: true });
  if (request.method !== 'POST') return json(request, { error: 'Method not allowed.' }, 405);
  if (!isAllowedOrigin(request)) return json(request, { error: 'This application origin is not allowed.' }, 403);

  try {
    const authorization = request.headers.get('Authorization');
    if (!authorization?.startsWith('Bearer ')) throw new Error('Sign in with an approved tester account.');
    const url = requiredEnvironment('SUPABASE_URL');
    const userClient = createClient(url, requiredEnvironment('SUPABASE_ANON_KEY'), {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false }
    });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) throw new Error('Your tester session has expired. Please sign in again.');
    const testerEmail = String(userData.user.email || '').trim().toLowerCase();
    if (!testerEmail || !allowedTesterEmails().has(testerEmail)) {
      throw new Error('This FoodTrekNow account is not approved for no-charge test payments.');
    }

    const body = await request.json();
    const bookingId = String(body.bookingId || '').trim();
    if (!bookingId) throw new Error('A confirmed booking is required.');

    const serviceClient = createClient(url, requiredEnvironment('SUPABASE_SERVICE_ROLE_KEY'), {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    const { data: vendor, error: vendorError } = await serviceClient.from('vendor_profiles')
      .select('id,owner_id').eq('owner_id', userData.user.id).maybeSingle();
    if (vendorError || !vendor) throw new Error('An approved food truck account is required.');

    const { data: booking, error: bookingError } = await serviceClient.from('opportunity_bookings')
      .select('id,opportunity_id,vendor_profile_id,truck_id,status')
      .eq('id', bookingId).eq('vendor_profile_id', vendor.id).maybeSingle();
    if (bookingError || !booking) throw new Error('This booking was not found for your food truck.');
    if (booking.status !== 'confirmed') throw new Error('Only a confirmed booking can receive a test payment.');

    const { data: payment, error: paymentError } = await serviceClient.from('event_fee_payments')
      .select('*').eq('booking_id', booking.id).maybeSingle();
    if (paymentError || !payment) throw new Error('This booking does not have an event fee to test.');
    if (payment.status === 'paid') return json(request, { payment, testPayment: Boolean(payment.is_test_payment), noCharge: Boolean(payment.is_test_payment) });
    if (['checkout_open', 'refund_pending'].includes(payment.status)) throw new Error('A payment or refund is already processing.');

    const testSessionId = `event_fee_test_${payment.id}`;
    const { data: saved, error: updateError } = await serviceClient.from('event_fee_payments').update({
      status: 'paid',
      is_test_payment: true,
      payment_label: 'FoodTrekNow Test Event Fee - No Charge',
      stripe_checkout_session_id: testSessionId,
      stripe_payment_intent_id: null,
      stripe_charge_id: null,
      receipt_url: null,
      paid_at: new Date().toISOString()
    }).eq('id', payment.id).in('status', ['payment_required', 'expired', 'failed']).select('*').maybeSingle();
    if (updateError || !saved) throw new Error('The no-charge test payment could not be completed.');

    const { data: opportunity } = await serviceClient.from('opportunities').select('title,host_id').eq('id', booking.opportunity_id).single();
    const { data: host } = await serviceClient.from('location_hosts').select('owner_id').eq('id', opportunity?.host_id).single();
    const amount = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(saved.amount_due_cents || 0) / 100);
    const notifications = [
      { profile_id: host?.owner_id, opportunity_id: booking.opportunity_id, kind: 'payment', event_key: `event-fee-test-paid-host:${saved.id}`, title: 'Food truck test payment completed', body: `${opportunity?.title || 'Event'} recorded a ${amount} no-charge test payment.` },
      { profile_id: userData.user.id, opportunity_id: booking.opportunity_id, kind: 'payment', event_key: `event-fee-test-paid-vendor:${saved.id}`, title: 'Test payment completed - no charge', body: `${amount} was recorded for ${opportunity?.title || 'the event'} without transferring money.` }
    ].filter(item => item.profile_id);
    if (notifications.length) await serviceClient.from('marketplace_notifications').upsert(notifications, { onConflict: 'profile_id,event_key', ignoreDuplicates: true });

    return json(request, { payment: saved, testPayment: true, noCharge: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'The no-charge event-fee test could not be completed.';
    console.error('Event-fee test payment failed:', message);
    return json(request, { error: message }, 400);
  }
});
