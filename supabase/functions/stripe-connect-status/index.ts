import { json, isAllowedOrigin, messageFrom } from '../_shared/http.ts';
import { safeAccountState, stripeRequest, type StripeAccount } from '../_shared/stripe.ts';
import { authenticatedVendor } from '../_shared/vendor.ts';

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return json(request, { ok: true });
  if (request.method !== 'POST') return json(request, { error: 'Method not allowed.' }, 405);
  if (!isAllowedOrigin(request)) return json(request, { error: 'This website origin is not allowed.' }, 403);

  try {
    const { serviceClient, vendor } = await authenticatedVendor(request);
    const { data: savedAccount, error: savedError } = await serviceClient
      .from('stripe_connect_accounts')
      .select('stripe_account_id')
      .eq('vendor_profile_id', vendor.id)
      .maybeSingle();
    if (savedError) throw savedError;
    if (!savedAccount) return json(request, { status: 'not_connected' });

    const account = await stripeRequest<StripeAccount>(`/v1/accounts/${encodeURIComponent(savedAccount.stripe_account_id)}`);
    const state = safeAccountState(account);
    const { error: updateError } = await serviceClient
      .from('stripe_connect_accounts')
      .update(state)
      .eq('vendor_profile_id', vendor.id);
    if (updateError) throw updateError;
    return json(request, state);
  } catch (error) {
    console.error('Stripe Connect status failed:', messageFrom(error));
    return json(request, { error: messageFrom(error) }, 400);
  }
});
