import { createClient } from 'npm:@supabase/supabase-js@2';

function requiredEnvironment(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

function hex(bytes: ArrayBuffer) {
  return [...new Uint8Array(bytes)].map(value => value.toString(16).padStart(2, '0')).join('');
}

function safeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return difference === 0;
}

async function verifyWithSecret(payload: string, timestamp: string, signatures: string[], secret: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const expected = hex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${timestamp}.${payload}`)));
  return signatures.some(signature => safeEqual(signature, expected));
}

async function verifyStripeSignature(payload: string, signatureHeader: string) {
  const values = signatureHeader.split(',').map(value => value.split('='));
  const timestamp = values.find(([key]) => key === 't')?.[1] || '';
  const signatures = values.filter(([key]) => key === 'v1').map(([, value]) => value);
  if (!timestamp || !signatures.length) return false;
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;
  const secrets = [
    Deno.env.get('STRIPE_WEBHOOK_SECRET'),
    Deno.env.get('STRIPE_BILLING_WEBHOOK_SECRET'),
    Deno.env.get('STRIPE_LIVE_WEBHOOK_SECRET'),
    Deno.env.get('STRIPE_LIVE_BILLING_WEBHOOK_SECRET')
  ].filter(Boolean) as string[];
  if (!secrets.length) throw new Error('No Stripe webhook signing secret is configured.');
  for (const secret of secrets) if (await verifyWithSecret(payload, timestamp, signatures, secret)) return true;
  return false;
}

const subscriptionStatuses = new Set([
  'incomplete', 'incomplete_expired', 'trialing', 'active', 'past_due', 'unpaid', 'canceled', 'paused'
]);

async function stripeGet(path: string) {
  const response = await fetch(`https://api.stripe.com${path}`, {
    headers: { Authorization: `Bearer ${requiredEnvironment('STRIPE_SECRET_KEY')}` }
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload?.error?.message || 'Stripe could not retrieve billing details.');
  return payload;
}

function subscriptionRecord(subscription: Record<string, any>, existing: Record<string, any> | null = null) {
  const item = subscription.items?.data?.[0] || {};
  const status = subscriptionStatuses.has(subscription.status) ? subscription.status : 'incomplete';
  const periodEnd = Number(subscription.current_period_end || item.current_period_end || 0);
  const priorGrace = existing?.grace_period_ends_at;
  return {
    stripe_customer_id: typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id,
    stripe_subscription_id: subscription.id,
    stripe_product_id: typeof item.price?.product === 'string' ? item.price.product : item.price?.product?.id || null,
    stripe_price_id: item.price?.id || null,
    status,
    current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    cancel_at_period_end: Boolean(subscription.cancel_at_period_end),
    grace_period_ends_at: status === 'past_due' ? priorGrace || new Date(Date.now() + 7 * 86400000).toISOString() : null,
    last_synced_at: new Date().toISOString()
  };
}

async function syncVendorSubscription(serviceClient: ReturnType<typeof createClient>, subscription: Record<string, any>) {
  const vendorId = subscription.metadata?.foodtreknow_vendor_profile_id;
  let existingQuery = serviceClient.from('vendor_subscriptions').select('*');
  existingQuery = vendorId
    ? existingQuery.eq('vendor_profile_id', vendorId)
    : existingQuery.eq('stripe_subscription_id', subscription.id);
  const { data: existing } = await existingQuery.maybeSingle();
  const resolvedVendorId = vendorId || existing?.vendor_profile_id;
  if (!resolvedVendorId) throw new Error('Vendor subscription could not be matched to a FoodTrekNow vendor.');
  const record = subscriptionRecord(subscription, existing);
  const { error } = await serviceClient.from('vendor_subscriptions').upsert({
    vendor_profile_id: resolvedVendorId,
    ...record
  }, { onConflict: 'vendor_profile_id' });
  if (error) throw error;
  const graceActive = record.status === 'past_due' && record.grace_period_ends_at && Date.parse(record.grace_period_ends_at) > Date.now();
  const { error: truckError } = await serviceClient.from('trucks').update({
    is_active: ['active', 'trialing'].includes(record.status) || Boolean(graceActive)
  }).eq('vendor_id', resolvedVendorId);
  if (truckError) throw truckError;
}

Deno.serve(async request => {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const rawBody = await request.text();
  const signature = request.headers.get('stripe-signature') || '';
  if (!await verifyStripeSignature(rawBody, signature)) return new Response('Invalid signature', { status: 400 });
  const serviceClient = createClient(requiredEnvironment('SUPABASE_URL'), requiredEnvironment('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  let event: Record<string, any>;
  try { event = JSON.parse(rawBody); } catch { return new Response('Invalid payload', { status: 400 }); }
  const { data: existing } = await serviceClient.from('stripe_webhook_events').select('processed_at').eq('id', event.id).maybeSingle();
  if (existing?.processed_at) return new Response(JSON.stringify({ received: true, duplicate: true }), { headers: { 'Content-Type': 'application/json' } });
  await serviceClient.from('stripe_webhook_events').upsert({
    id: event.id,
    event_type: event.type,
    stripe_account_id: event.account || null,
    error_message: null
  }, { onConflict: 'id' });
  try {
    const session = event.data?.object;
    if (['checkout.session.completed', 'checkout.session.async_payment_succeeded'].includes(event.type)) {
      if (session?.metadata?.foodtreknow_vendor_subscription === 'true') {
        const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;
        if (!subscriptionId) throw new Error('Vendor subscription Checkout did not return a subscription.');
        const subscription = await stripeGet(`/v1/subscriptions/${encodeURIComponent(subscriptionId)}?expand[]=items.data.price.product`);
        if (!subscription.metadata?.foodtreknow_vendor_profile_id && session.metadata?.foodtreknow_vendor_profile_id) {
          subscription.metadata = { ...subscription.metadata, foodtreknow_vendor_profile_id: session.metadata.foodtreknow_vendor_profile_id };
        }
        await syncVendorSubscription(serviceClient, subscription);
      } else {
        const draftId = session?.metadata?.foodtreknow_draft_id;
        if (draftId && session.payment_status === 'paid') {
          const { data: draft, error: draftError } = await serviceClient.from('payment_checkout_drafts')
            .select('*').eq('id', draftId).eq('stripe_checkout_session_id', session.id).single();
          if (draftError || !draft) throw new Error('Webhook checkout draft was not found.');
          if (event.account && event.account !== draft.stripe_account_id) throw new Error('Webhook connected account did not match.');
          const { error: finalizeError } = await serviceClient.rpc('finalize_paid_checkout', {
            p_draft_id: draft.id,
            p_checkout_session_id: session.id,
            p_payment_intent_id: typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id || '',
            p_charge_id: '',
            p_amount_paid_cents: Number(session.amount_total),
            p_payment_label: 'Stripe Checkout'
          });
          if (finalizeError) throw finalizeError;
        }
      }
    } else if (['customer.subscription.created', 'customer.subscription.updated', 'customer.subscription.deleted', 'customer.subscription.paused', 'customer.subscription.resumed'].includes(event.type)) {
      await syncVendorSubscription(serviceClient, event.data?.object || {});
    } else if (['invoice.paid', 'invoice.payment_failed', 'invoice.payment_action_required'].includes(event.type)) {
      const invoice = event.data?.object || {};
      const subscriptionValue = invoice.parent?.type === 'subscription_details'
        ? invoice.parent?.subscription_details?.subscription
        : invoice.subscription;
      const subscriptionId = typeof subscriptionValue === 'string' ? subscriptionValue : subscriptionValue?.id;
      const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
      if (subscriptionId || customerId) {
        let invoiceUpdate = serviceClient.from('vendor_subscriptions').update({
          last_invoice_status: invoice.status || (event.type === 'invoice.paid' ? 'paid' : 'payment_failed'),
          last_synced_at: new Date().toISOString()
        });
        invoiceUpdate = subscriptionId ? invoiceUpdate.eq('stripe_subscription_id', subscriptionId) : invoiceUpdate.eq('stripe_customer_id', customerId);
        const { error: invoiceError } = await invoiceUpdate;
        if (invoiceError) throw invoiceError;
        if (subscriptionId) {
          const subscription = await stripeGet(`/v1/subscriptions/${encodeURIComponent(subscriptionId)}?expand[]=items.data.price.product`);
          await syncVendorSubscription(serviceClient, subscription);
        }
      }
    } else if (['checkout.session.expired', 'checkout.session.async_payment_failed'].includes(event.type)) {
      const { data: expiringDraft } = await serviceClient.from('payment_checkout_drafts')
        .select('id').eq('stripe_checkout_session_id', session.id).is('order_id', null).maybeSingle();
      if (expiringDraft?.id) await serviceClient.rpc('release_checkout_credit', { p_draft_id: expiringDraft.id });
      await serviceClient.from('payment_checkout_drafts').update({
        status: event.type === 'checkout.session.expired' ? 'expired' : 'failed'
      }).eq('stripe_checkout_session_id', session.id).is('order_id', null);
    } else if (event.type === 'refund.updated') {
      const refund = event.data?.object;
      const paymentIntentId = typeof refund?.payment_intent === 'string' ? refund.payment_intent : refund?.payment_intent?.id;
      if (paymentIntentId && ['succeeded', 'failed', 'canceled'].includes(refund.status)) {
        const { data: order } = await serviceClient.from('orders').select('id,stripe_account_id')
          .eq('stripe_payment_intent_id', paymentIntentId).maybeSingle();
        if (order) {
          if (event.account && event.account !== order.stripe_account_id) throw new Error('Refund connected account did not match.');
          const { error: refundError } = await serviceClient.rpc('complete_order_refund', {
            p_order_id: order.id,
            p_refund_id: refund.id,
            p_refunded_cents: Number(refund.amount || 0),
            p_succeeded: refund.status === 'succeeded',
            p_failure: refund.status === 'succeeded' ? null : `Stripe refund status: ${refund.status}`
          });
          if (refundError) throw refundError;
        }
      }
    }
    await serviceClient.from('stripe_webhook_events').update({ processed_at: new Date().toISOString(), error_message: null }).eq('id', event.id);
    return new Response(JSON.stringify({ received: true }), { headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Webhook processing failed.';
    console.error('Stripe webhook failed:', message);
    await serviceClient.from('stripe_webhook_events').update({ error_message: message }).eq('id', event.id);
    return new Response('Webhook processing failed', { status: 500 });
  }
});
