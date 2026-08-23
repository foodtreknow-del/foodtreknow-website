import { json, isAllowedOrigin, messageFrom } from '../_shared/http.ts';
import { applicationUrl, stripeRequest, type StripeAccount } from '../_shared/stripe.ts';
import { authenticatedVendor } from '../_shared/vendor.ts';

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return json(request, { ok: true });
  if (request.method !== 'POST') return json(request, { error: 'Method not allowed.' }, 405);
  if (!isAllowedOrigin(request)) return json(request, { error: 'This website origin is not allowed.' }, 403);

  try {
    const { serviceClient, user, vendor } = await authenticatedVendor(request);
    const { data: savedAccount, error: savedError } = await serviceClient
      .from('stripe_connect_accounts')
      .select('stripe_account_id')
      .eq('vendor_profile_id', vendor.id)
      .maybeSingle();
    if (savedError) throw savedError;

    let accountId = savedAccount?.stripe_account_id;
    if (!accountId) {
      const form = new URLSearchParams();
      form.set('type', 'standard');
      form.set('country', 'US');
      const accountEmail = vendor.contact_email || user.email;
      if (accountEmail) form.set('email', accountEmail);
      form.set('business_profile[url]', 'https://www.foodtreknow.com');
      form.set('metadata[foodtreknow_vendor_profile_id]', vendor.id);
      const account = await stripeRequest<StripeAccount>('/v1/accounts', {
        form,
        idempotencyKey: `foodtreknow-connect-${vendor.id}`
      });
      accountId = account.id;
      const { error: saveError } = await serviceClient.from('stripe_connect_accounts').insert({
        vendor_profile_id: vendor.id,
        stripe_account_id: accountId,
        status: 'onboarding_required'
      });
      if (saveError) throw saveError;
    }

    const linkForm = new URLSearchParams();
    linkForm.set('account', accountId);
    linkForm.set('refresh_url', applicationUrl('refresh'));
    linkForm.set('return_url', applicationUrl('return'));
    linkForm.set('type', 'account_onboarding');
    linkForm.set('collection_options[fields]', 'eventually_due');
    const accountLink = await stripeRequest<{ url: string }>('/v1/account_links', { form: linkForm });
    return json(request, { onboardingUrl: accountLink.url });
  } catch (error) {
    console.error('Stripe Connect start failed:', messageFrom(error));
    return json(request, { error: messageFrom(error) }, 400);
  }
});
