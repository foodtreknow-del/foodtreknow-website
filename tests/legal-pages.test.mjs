import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('public Terms and Privacy pages contain launch-critical disclosures', async () => {
  const [terms, privacy] = await Promise.all([read('terms.html'), read('privacy.html')]);

  assert.match(terms, /operated by Kevin Lisenby/i);
  assert.match(terms, /14-day free trial/i);
  assert.match(terms, /\$14\.99 per month/i);
  assert.match(terms, /cancel at any time with no cancellation fee/i);
  assert.match(terms, /end of the current paid billing period/i);
  assert.match(terms, /selected vendor's connected Stripe account/i);
  assert.match(terms, /food allerg/i);
  assert.match(terms, /vendor-specific credits/i);

  assert.match(privacy, /Information we collect/i);
  assert.match(privacy, /Supabase provides authentication/i);
  assert.match(privacy, /Stripe provides payment/i);
  assert.match(privacy, /does not store complete payment card numbers/i);
  assert.match(privacy, /retention and security/i);
  assert.match(privacy, /Delete My Account/i);
  assert.match(privacy, /id="your-choices"/i);
  assert.match(privacy, /mailto:kevinl@foodtreknow\.com/i);
  assert.match(terms, /mailto:kevinl@foodtreknow\.com/i);
  assert.doesNotMatch(`${terms}\n${privacy}`, /(?:support|privacy|legal)@foodtreknow\.com/i);
});

test('legal pages and privacy choices are linked throughout customer and vendor flows', async () => {
  const [home, customerApp, terms, privacy] = await Promise.all([
    read('index.html'),
    read('js/customer-account.js'),
    read('terms.html'),
    read('privacy.html')
  ]);

  assert.doesNotMatch(home, /Terms of Service placeholder|Privacy Policy placeholder/);
  assert.match(home, /href="terms\.html"/);
  assert.match(home, /href="privacy\.html"/);
  assert.match(home, /href="privacy\.html#your-choices"/);
  assert.match(home, /Vendor Subscription Terms/);
  assert.match(customerApp, /Legal & Privacy/);
  assert.match(customerApp, /privacy\.html#your-choices/);
  assert.match(terms, /href="privacy\.html"/);
  assert.match(privacy, /href="terms\.html"/);
});

test('mobile build and offline shell include the public legal pages', async () => {
  const [buildScript, serviceWorker, styles] = await Promise.all([
    read('scripts/build-web.mjs'),
    read('service-worker.js'),
    read('css/legal.css')
  ]);

  for (const asset of ['terms.html', 'privacy.html', 'css/legal.css']) {
    assert.match(`${buildScript}\n${serviceWorker}`, new RegExp(asset.replace('.', '\\.')));
  }
  assert.match(serviceWorker, /foodtreknow-shell-v12/);
  assert.match(serviceWorker, /offlinePage/);
  assert.match(styles, /@media\(max-width:480px\)/);
  assert.match(styles, /prefers-reduced-motion/);
});
