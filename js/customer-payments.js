(function exposeCustomerPayments() {
  'use strict';

  const client = window.FoodTrekNowSupabaseClient;

  async function invoke(functionName, body) {
    if (!client) throw new Error('Secure online payments are unavailable.');
    const { data, error } = await client.functions.invoke(functionName, { body });
    if (error) {
      let message = error.message || 'The secure payment service could not be reached.';
      try {
        const details = await error.context?.json();
        if (details?.error) message = details.error;
      } catch {}
      throw new Error(message);
    }
    if (data?.error) throw new Error(data.error);
    return data;
  }

  function trustedStripeCheckoutUrl(value) {
    let url;
    try { url = new URL(value); } catch { throw new Error('Stripe returned an invalid checkout link.'); }
    const stripeHost = url.hostname === 'checkout.stripe.com' || url.hostname.endsWith('.checkout.stripe.com');
    if (url.protocol !== 'https:' || !stripeHost) throw new Error('Stripe returned an untrusted checkout link.');
    return url.toString();
  }

  async function startCheckout(payload) {
    const result = await invoke('stripe-checkout-start', payload);
    window.location.assign(trustedStripeCheckoutUrl(result?.checkoutUrl));
    return result;
  }

  function completeCheckout(sessionId) {
    return invoke('stripe-checkout-complete', { sessionId });
  }

  window.FoodTrekNowCustomerPayments = Object.freeze({
    available: Boolean(client),
    startCheckout,
    completeCheckout
  });
})();
