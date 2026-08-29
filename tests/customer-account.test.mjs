import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const vendorSource = fs.readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const source = fs.readFileSync(new URL('../js/customer-account.js', import.meta.url), 'utf8');
const betaBannerSource = fs.readFileSync(new URL('../js/beta-banner.js', import.meta.url), 'utf8');
const betaBannerStyles = fs.readFileSync(new URL('../css/beta-banner.css', import.meta.url), 'utf8');
const accountStyles = fs.readFileSync(new URL('../css/customer-account.css', import.meta.url), 'utf8');
const orderingStyles = fs.readFileSync(new URL('../css/customer-ordering.css', import.meta.url), 'utf8');
const officialLogo = fs.readFileSync(new URL('../assets/foodtreknow-logo.png', import.meta.url));

class StorageMock {
  constructor() { this.values = new Map(); }
  getItem(key) { return this.values.has(key) ? this.values.get(key) : null; }
  setItem(key, value) { this.values.set(key, String(value)); }
  removeItem(key) { this.values.delete(key); }
  clear() { this.values.clear(); }
}

class ClassListMock {
  constructor() { this.values = new Set(); }
  add(...values) { values.forEach(value => this.values.add(value)); }
  remove(...values) { values.forEach(value => this.values.delete(value)); }
  contains(value) { return this.values.has(value); }
  toggle(value, force) {
    if (force === true) this.values.add(value);
    else if (force === false) this.values.delete(value);
    else if (this.values.has(value)) this.values.delete(value);
    else this.values.add(value);
    return this.values.has(value);
  }
}

class ElementMock {
  constructor(id = '') {
    this.id = id;
    this.value = '';
    this.checked = false;
    this.files = [];
    this.dataset = {};
    this.classList = new ClassListMock();
    this.listeners = new Map();
    this.style = {};
  }
  addEventListener(type, callback) {
    const callbacks = this.listeners.get(type) || [];
    callbacks.push(callback);
    this.listeners.set(type, callbacks);
  }
  setAttribute(name, value) { this[name] = String(value); }
  querySelectorAll() { return []; }
  querySelector() { return null; }
  closest() { return null; }
  reset() {}
  focus() {}
}

const elements = new Map();
const element = id => {
  if (!elements.has(id)) elements.set(id, new ElementMock(id));
  return elements.get(id);
};
const emit = async (target, type, event = {}) => {
  for (const callback of target.listeners.get(type) || []) await callback(event);
};
const actionTarget = dataset => ({
  dataset,
  closest(selector) {
    const match = selector.match(/^\[data-([a-z-]+)\]$/);
    if (!match) return null;
    const key = match[1].replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    return Object.hasOwn(dataset, key) ? this : null;
  }
});

globalThis.window = globalThis;
globalThis.localStorage = new StorageMock();
globalThis.sessionStorage = new StorageMock();
globalThis.FoodTrekNowSupabaseConfig = { enabled: false };
globalThis.document = {
  body: element('body'),
  getElementById: element,
  querySelectorAll: () => [],
  querySelector: () => null
};
globalThis.alert = () => {};
globalThis.confirm = () => true;
globalThis.scrollTo = () => {};
globalThis.setInterval = () => 0;

vm.runInThisContext(vendorSource, { filename: 'app.js' });
vm.runInThisContext(source, { filename: 'customer-account.js' });
vm.runInThisContext(betaBannerSource, { filename: 'beta-banner.js' });

test('vendor and customer modules initialize together without a startup error', () => {
  assert.ok(window.FoodTrekNowCustomerAuth);
  assert.ok(elements.get('loginForm').listeners.has('submit'));
  assert.ok(elements.get('openCustomerPortalButton').listeners.has('click'));
  assert.ok(elements.get('openHostPortalButton').listeners.has('click'));
  assert.match(html, /js\/customer-account\.js\?v=[a-z0-9-]+/);
});

test('customer account UI includes every required area and has unique static IDs', () => {
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(ids).size, ids.length, 'HTML IDs must be unique');

  const requiredText = [
    'Sign In', 'Create Account', 'Guest Checkout', 'First Name', 'Last Name',
    'Mobile Number', 'Email Address', 'Confirm Password', 'Remember me',
    'Forgot Password', 'Profile', 'Preferred Name', 'Addresses', 'Favorites',
    'Order History', 'Payment Methods', 'Notifications', 'Privacy Settings',
    'Delete Account', 'Ready for something delicious?', 'Current Location',
    'Search food trucks, menu items, cuisines, or events...', 'Order Food',
    'Find Trucks', 'Events Near You', 'Favorite Trucks', 'Recent Orders',
    'Add Address', 'Add Payment Method', 'Explore', 'My Cart', 'Cart',
    'Find Food Trucks Near Your Location', 'Showing Trucks Within:',
    'Drive time', 'Hours today', 'Estimated pickup', 'Order Now', 'Directions',
    'Appetizers', 'Entrees', 'Sides', 'Desserts', 'Drinks',
    'Tap an item to add it', 'Add to Cart', 'Item Notes',
    'No onions', 'Extra pickles', 'Well done', 'Cut in half',
    'Shopping Cart', 'Service Fee', 'Proceed to Checkout', 'Pickup Information',
    'Schedule Later', 'Promo Code', 'Place Order', 'Order Successfully Placed',
    'Track My Order', 'Order Received', 'Ready for Pickup', 'Order Number',
    'Cancel Order', 'Full refund'
  ];
  const completeUiSource = `${html}\n${source}`;
  requiredText.forEach(text => assert.ok(completeUiSource.includes(text), `Missing UI contract: ${text}`));
  assert.doesNotMatch(completeUiSource, /loyalty points|rewards program/i);
  assert.match(fs.readFileSync(new URL('../css/customer-account.css', import.meta.url), 'utf8'), /@media\(max-width:760px\)/);
  assert.match(source, /PERSISTENT_SESSION_KEY/);
  assert.match(source, /TEMP_SESSION_KEY/);
  assert.match(source, /LocalCustomerAuthAdapter/);
  assert.match(source, /setAdapter\(adapter\)/);
  assert.match(source, /LocalCustomerOrderingAdapter/);
  assert.match(source, /window\.FoodTrekNowOrdering/);
  assert.match(orderingStyles, /@media\(max-width:760px\)/);
  assert.doesNotMatch(source, /Choose Spice Level|Choose Protein|Extra Sauce/);
  assert.match(orderingStyles, /floating-cart-summary/);
  assert.match(html, /id="customerMobileCartButton"/);
  assert.equal((html.match(/data-customer-cart-count/g) || []).length, 3);
  assert.match(source, /cancelOrder\(account, orderId\)/);
});

test('homepage presents separate customer, host, and vendor entry points', () => {
  const customerActionIndex = html.indexOf("I'm Hungry Login");
  const hostActionIndex = html.indexOf('Host / Event Organizer Login');
  const vendorActionIndex = html.indexOf('Vendor Log In');
  assert.ok(customerActionIndex >= 0);
  assert.ok(hostActionIndex > customerActionIndex);
  assert.ok(vendorActionIndex > hostActionIndex);
  assert.match(html, /customer-entry customer-entry-primary/);
  assert.match(html, /class="vendor-login-button full"/);
  assert.match(html, /id="backToVendorButton"[^>]*>← Back<\/button>\s*<p class="customer-back-tagline">Find it\. Order it\. Pick it Up\.<\/p>/);
  assert.match(accountStyles, /\.customer-back-tagline\{[^}]*font-size:36px/);
  assert.match(accountStyles, /\.customer-entry-button\{[^}]*background:var\(--brand\)/);
  assert.match(accountStyles, /\.vendor-login-button\{[^}]*background:#17241d/);
  assert.match(accountStyles, /\.host-entry-button\{[^}]*background:#173d2a/);
});

test('official FoodTrekNow logo replaces every FTN badge and customer sign-in says I am hungry', () => {
  assert.doesNotMatch(html, />\s*FTN\s*</);
  assert.equal((html.match(/class="foodtrek-logo/g) || []).length, 6);
  assert.equal((html.match(/src="assets\/foodtreknow-logo\.png"/g) || []).length, 6);
  assert.deepEqual([...officialLogo.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.match(html, /<h1[^>]*>I'm Hungry<\/h1>/);
  const customerActionIndex = html.indexOf("I'm Hungry Login");
  const vendorFormIndex = html.indexOf('id="loginForm"');
  assert.doesNotMatch(html.slice(customerActionIndex, vendorFormIndex), /Vendor Portal/);
});

test('beta banner is the first homepage content and includes responsive persisted interactions', () => {
  assert.ok(html.indexOf('id="betaBanner"') < html.indexOf('id="loginView"'));
  [
    'FoodTrekNow Beta',
    'Thank you for helping us test FoodTrekNow!',
    "We're currently in our Beta Testing phase.",
    "We'd love your feedback!",
    'Thank you for being one of our early testers.',
    'Dismiss',
    '💬 Send Feedback',
    'Feedback submission coming soon.'
  ].forEach(text => assert.ok(html.includes(text), `Missing beta banner contract: ${text}`));
  assert.match(betaBannerSource, /ftnBetaBannerDismissedV1/);
  assert.match(betaBannerSource, /localStorage\.setItem/);
  assert.match(betaBannerStyles, /background:\s*#fff8e1/i);
  assert.match(betaBannerStyles, /@media \(max-width: 600px\)/);
});

test('beta banner dismissal persists and feedback placeholder opens and closes', async () => {
  localStorage.clear();
  element('betaBanner').classList.remove('hidden-view');
  element('feedbackPlaceholderModal').classList.add('hidden');

  await emit(element('openFeedbackModalButton'), 'click');
  assert.equal(element('feedbackPlaceholderModal').classList.contains('hidden'), false);

  await emit(element('confirmFeedbackModalButton'), 'click');
  assert.equal(element('feedbackPlaceholderModal').classList.contains('hidden'), true);

  await emit(element('dismissBetaBannerButton'), 'click');
  assert.equal(localStorage.getItem('ftnBetaBannerDismissedV1'), 'true');
  assert.equal(element('betaBanner').classList.contains('hidden-view'), true);
});

test('local auth adapter creates accounts with hashed passwords and required persisted collections', async () => {
  localStorage.clear();
  const account = await window.FoodTrekNowCustomerAuth.signUp({
    firstName: 'Avery',
    lastName: 'Jordan',
    mobile: '(555) 555-0198',
    email: 'avery@example.com',
    password: 'safe-password'
  });

  assert.equal(account.firstName, 'Avery');
  assert.equal(account.emailVerified, false);
  assert.notEqual(account.passwordHash, 'safe-password');
  assert.ok(Array.isArray(account.addresses));
  assert.ok(Array.isArray(account.favoriteTrucks));
  assert.ok(Array.isArray(account.favoriteOrders));
  assert.ok(Array.isArray(account.paymentMethods));
  assert.ok(Array.isArray(account.orders));
  assert.deepEqual(account.paymentMethods.map(method => method.last4), ['1234', '9876']);
  assert.equal(account.preferredLocation, null);
  assert.equal(account.nearbyRadiusMiles, 5);
  assert.equal(account.preferences.notifications.orderUpdates, true);
  assert.equal(account.preferences.privacy.activityHistory, true);
});

test('customers can sign in by email or mobile and invalid credentials are rejected', async () => {
  const byEmail = await window.FoodTrekNowCustomerAuth.signIn('AVERY@example.com', 'safe-password');
  const byMobile = await window.FoodTrekNowCustomerAuth.signIn('5555550198', 'safe-password');
  assert.equal(byEmail.id, byMobile.id);
  await assert.rejects(() => window.FoodTrekNowCustomerAuth.signIn('avery@example.com', 'wrong-password'), /incorrect/);
});

test('an existing FoodTrekNow login opens the dedicated host portal and can switch back to customer', async () => {
  const account = await window.FoodTrekNowCustomerAuth.signIn('avery@example.com', 'safe-password');
  localStorage.setItem('ftnCustomerSessionV1', JSON.stringify({ accountId: account.id }));
  await emit(element('openHostPortalButton'), 'click');
  assert.equal(element('hostPortalView').classList.contains('hidden-view'), false);
  assert.equal(element('customerAccountView').classList.contains('hidden-view'), true);
  assert.equal(element('hostPortalAccountName').textContent, 'Avery Jordan');
  assert.equal(localStorage.getItem('ftnPortalDestinationV1'), 'host');

  await emit(element('switchToCustomerPortalButton'), 'click');
  assert.equal(element('customerAccountView').classList.contains('hidden-view'), false);
  assert.equal(element('hostPortalView').classList.contains('hidden-view'), true);
  assert.equal(localStorage.getItem('ftnPortalDestinationV1'), 'customer');
});

test('duplicate email or mobile accounts are rejected', async () => {
  await assert.rejects(() => window.FoodTrekNowCustomerAuth.signUp({
    firstName: 'Other',
    lastName: 'Customer',
    mobile: '555-555-0111',
    email: 'avery@example.com',
    password: 'another-password'
  }), /already exists/);
});

test('profile and password changes persist through the auth boundary', async () => {
  const signedIn = await window.FoodTrekNowCustomerAuth.signIn('avery@example.com', 'safe-password');
  const updated = await window.FoodTrekNowCustomerAuth.updateProfile(signedIn.id, { preferredName: 'Ave' });
  assert.equal(updated.preferredName, 'Ave');

  await assert.rejects(() => window.FoodTrekNowCustomerAuth.changePassword(signedIn.id, 'wrong-current', 'new-password'), /current password/);
  await window.FoodTrekNowCustomerAuth.changePassword(signedIn.id, 'safe-password', 'new-password');
  await assert.rejects(() => window.FoodTrekNowCustomerAuth.signIn('avery@example.com', 'safe-password'), /incorrect/);
  const changed = await window.FoodTrekNowCustomerAuth.signIn('avery@example.com', 'new-password');
  assert.equal(changed.id, signedIn.id);
});

test('addresses, favorites, orders, payment preferences, notifications, and privacy persist', async () => {
  const account = await window.FoodTrekNowCustomerAuth.signIn('avery@example.com', 'new-password');
  const pastOrder = account.orders.find(order => order.status === 'completed');
  const updated = await window.FoodTrekNowCustomerAuth.updateProfile(account.id, {
    addresses: [{ id: 'address-home', label: 'Home', street: '1 Main St', city: 'Raleigh', state: 'NC', zip: '27601', isDefault: true }],
    favoriteTrucks: ['capital-city-eats'],
    favoriteOrders: [pastOrder.id],
    paymentMethods: [{ id: 'payment-1', brand: 'Visa', last4: '4242', name: 'Avery Jordan', expiry: '12/30', isDefault: true }],
    preferences: {
      notifications: { orderUpdates: true, promotions: true, favoriteTrucks: false, push: true },
      privacy: { personalizedOffers: false, activityHistory: true }
    }
  });

  assert.equal(updated.addresses[0].label, 'Home');
  assert.deepEqual(updated.favoriteTrucks, ['capital-city-eats']);
  assert.deepEqual(updated.favoriteOrders, [pastOrder.id]);
  assert.equal(updated.paymentMethods[0].last4, '4242');
  assert.equal(updated.preferences.notifications.push, true);
  assert.equal(updated.preferences.privacy.personalizedOffers, false);
  assert.equal(updated.orders.filter(order => order.status !== 'completed').length, 1);
  assert.ok(updated.orders.filter(order => order.status === 'completed').length >= 2);
});

test('customer UI event layer mutates and persists account collections', async () => {
  let account = await window.FoodTrekNowCustomerAuth.signIn('avery@example.com', 'new-password');
  localStorage.setItem('ftnCustomerSessionV1', JSON.stringify({ accountId: account.id }));
  await emit(element('openCustomerPortalButton'), 'click');

  await emit(element('customerAccountContent'), 'click', { target: actionTarget({ customerAction: 'add-address' }) });
  element('addressId').value = '';
  element('addressLabel').value = 'Work';
  element('addressRecipient').value = 'Avery Jordan';
  element('addressStreet').value = '200 Market Street';
  element('addressUnit').value = 'Suite 3';
  element('addressCity').value = 'Durham';
  element('addressState').value = 'nc';
  element('addressZip').value = '27701';
  element('addressNotes').value = 'Front desk';
  element('addressDefault').checked = false;
  await emit(element('customerAccountModalContent'), 'submit', { preventDefault() {}, target: { id: 'customerAddressForm' } });
  account = await window.FoodTrekNowCustomerAuth.signIn('avery@example.com', 'new-password');
  assert.equal(account.addresses.length, 2);
  assert.equal(account.addresses.find(address => address.label === 'Work').state, 'NC');

  const pastOrder = account.orders.find(order => order.status === 'completed');
  await emit(element('customerAccountContent'), 'click', { target: actionTarget({ toggleTruckFavorite: 'capital-city-eats' }) });
  await emit(element('customerAccountContent'), 'click', { target: actionTarget({ toggleOrderFavorite: pastOrder.id }) });
  const orderCount = account.orders.length;
  await emit(element('customerAccountContent'), 'click', { target: actionTarget({ reorder: pastOrder.id }) });

  await emit(element('customerAccountContent'), 'click', { target: actionTarget({ customerAction: 'add-payment' }) });
  element('paymentName').value = 'Avery Jordan';
  element('paymentNumber').value = '5555555555554444';
  element('paymentExpiry').value = '10/31';
  element('paymentCvv').value = '123';
  element('paymentDefault').checked = true;
  await emit(element('customerAccountModalContent'), 'submit', { preventDefault() {}, target: { id: 'customerPaymentForm' } });

  await emit(element('customerAccountContent'), 'change', { target: { dataset: { notificationSetting: 'promotions' }, checked: false, matches: selector => selector === '[data-notification-setting]' } });
  await emit(element('customerAccountContent'), 'change', { target: { dataset: { privacySetting: 'personalizedOffers' }, checked: true, matches: selector => selector === '[data-privacy-setting]' } });

  account = await window.FoodTrekNowCustomerAuth.signIn('avery@example.com', 'new-password');
  assert.equal(account.favoriteTrucks.length, 0, 'truck favorite toggles off when already saved');
  assert.equal(account.favoriteOrders.length, 0, 'order favorite toggles off when already saved');
  assert.equal(account.orders.length, orderCount + 1);
  assert.equal(account.orders[0].status, 'new');
  assert.equal(account.paymentMethods.length, 2);
  assert.equal(account.paymentMethods.find(method => method.last4 === '4444').isDefault, true);
  assert.equal(account.preferences.notifications.promotions, false);
  assert.equal(account.preferences.privacy.personalizedOffers, true);
});

test('preferred customer location is saved locally from the home dashboard', async () => {
  let account = await window.FoodTrekNowCustomerAuth.signIn('avery@example.com', 'new-password');
  localStorage.setItem('ftnCustomerSessionV1', JSON.stringify({ accountId: account.id }));
  await emit(element('openCustomerPortalButton'), 'click');
  await emit(element('customerAccountContent'), 'click', { target: actionTarget({ customerAction: 'change-location' }) });

  element('customerLocationMethod').value = 'zip';
  element('customerLocationCity').value = '';
  element('customerLocationZip').value = '27601';
  await emit(element('customerAccountModalContent'), 'submit', { preventDefault() {}, target: { id: 'customerLocationForm' } });

  account = await window.FoodTrekNowCustomerAuth.signIn('avery@example.com', 'new-password');
  assert.deepEqual(account.preferredLocation, { method: 'zip', zip: '27601' });
});

test('nearby truck search uses the saved location, filters today, sorts distance, and persists radius', async () => {
  let account = await window.FoodTrekNowCustomerAuth.signIn('avery@example.com', 'new-password');
  localStorage.setItem('ftnCustomerSessionV1', JSON.stringify({ accountId: account.id }));
  await emit(element('openCustomerPortalButton'), 'click');
  await emit(element('customerAccountContent'), 'click', { target: actionTarget({ homeTarget: 'explore' }) });

  const nearbyMarkup = element('customerAccountContent').innerHTML;
  assert.match(nearbyMarkup, /Using ZIP 27601/);
  assert.match(nearbyMarkup, /data-map-provider="foodtreknow-live"/);
  assert.match(nearbyMarkup, /data-map-ready="true"/);
  assert.match(nearbyMarkup, /Within 5 miles/);
  [5, 10, 15, 20, 25, 30, 35, 40, 45, 50].forEach(radius => assert.match(nearbyMarkup, new RegExp(`<option value="${radius}"`)));
  assert.ok(nearbyMarkup.indexOf('Capital City Eats') < nearbyMarkup.indexOf('Rolling Ember BBQ'), 'nearest truck should be listed first');
  assert.match(source, /\.filter\(truck => truck\.operatingDays\.includes\(date\.getDay\(\)\)\)/);
  assert.match(source, /return first\.distance - second\.distance;/);
  assert.ok(window.FoodTrekNowTruckData);
  assert.equal(typeof window.FoodTrekNowTruckData.setAdapter, 'function');
  const sundayResults = window.FoodTrekNowTruckData.searchNearby({
    location: { latitude: 35.7796, longitude: -78.6382 },
    radiusMiles: 50,
    date: new Date(2026, 6, 26, 12, 0)
  });
  assert.equal(sundayResults.some(truck => truck.id === 'triangle-dumpling-co'), false);
  assert.ok(sundayResults.every((truck, index) => index === 0 || sundayResults[index - 1].distance <= truck.distance));

  await emit(element('customerAccountContent'), 'change', {
    target: { value: '25', matches: selector => selector === '[data-nearby-radius]' }
  });
  account = await window.FoodTrekNowCustomerAuth.signIn('avery@example.com', 'new-password');
  assert.equal(account.nearbyRadiusMiles, 25);
  assert.match(element('customerAccountContent').innerHTML, /Within 25 miles/);

  await emit(element('customerAccountContent'), 'click', { target: actionTarget({ nearbyOrder: 'capital-city-eats' }) });
  assert.equal(JSON.parse(localStorage.getItem('ftnSelectedTruckV1')).truckId, 'capital-city-eats');
});

test('active trucks remain discoverable when customer GPS is unavailable', async () => {
  const date = new Date(2026, 7, 28, 12, 0);
  const withoutGps = window.FoodTrekNowTruckData.searchNearby({
    location: { latitude: 35.7796, longitude: -78.6382, hasLocation: false },
    radiusMiles: 1,
    date
  });
  const withGps = window.FoodTrekNowTruckData.searchNearby({
    location: { latitude: 35.7796, longitude: -78.6382, hasLocation: true },
    radiusMiles: 1,
    date
  });

  assert.ok(withoutGps.length > withGps.length, 'missing GPS must not apply a fake radius filter');
  assert.ok(withoutGps.every(truck => truck.distanceLabel === 'Enable location'));
  assert.ok(withoutGps.every(truck => truck.driveTime === 'Location needed'));

  localStorage.removeItem('ftnGuestCustomerV1');
  await emit(element('guestCheckoutButton'), 'click');
  const markup = element('customerAccountContent').innerHTML;
  assert.match(markup, /Showing active trucks — enable location for distances/);
  assert.match(markup, /Location not set/);
  assert.match(markup, /All active trucks/);
  assert.match(markup, /data-nearby-radius[^>]*disabled/);
  assert.doesNotMatch(markup, /No operating trucks within/);
});

test('twenty sample trucks open distinct cuisine-specific menus', async () => {
  const account = await window.FoodTrekNowCustomerAuth.signIn('avery@example.com', 'new-password');
  localStorage.setItem('ftnCustomerSessionV1', JSON.stringify({ accountId: account.id }));
  await emit(element('openCustomerPortalButton'), 'click');
  const expectedMenus = [
    ['capital-city-eats', 'Classic Cheeseburger'],
    ['rolling-ember-bbq', 'Brisket Burnt Ends'],
    ['taco-luna', 'Birria Tacos'],
    ['triangle-dumpling-co', 'Pork Soup Dumplings'],
    ['oak-city-sweets', 'Banana Pudding Cup'],
    ['carolina-coastal-kitchen', 'Calabash Shrimp Basket'],
    ['mama-jos-soul-kitchen', 'Smothered Turkey Wings'],
    ['kingston-jerk-stop', 'Oxtail Stew'],
    ['athena-street-eats', 'Lamb Gyro Platter'],
    ['seoul-on-wheels', 'Korean BBQ Beef Bowl'],
    ['cupcake-caravan', 'Salted Caramel Cupcake'],
    ['scoop-loop', 'Hot Fudge Brownie Sundae'],
    ['bull-city-burgers', 'Bull City Double'],
    ['smokehouse-919', 'Prime Brisket Plate'],
    ['green-route-vegan', 'Rainbow Buddha Bowl'],
    ['pie-and-pudding', 'Chocolate Chess Pie'],
    ['bayou-bites', 'Chicken and Sausage Gumbo'],
    ['pasta-passeggiata', 'Cacio e Pepe'],
    ['curry-in-a-hurry', 'Butter Chicken Bowl'],
    ['breakfast-bus', 'Chicken and Waffles']
  ];
  const menuSignatures = [];

  for (const [truckId, expectedItem] of expectedMenus) {
    await emit(element('customerAccountContent'), 'click', { target: actionTarget({ nearbyOrder: truckId }) });
    const menuMarkup = element('customerAccountContent').innerHTML;
    assert.match(menuMarkup, new RegExp(expectedItem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.match(menuMarkup, /data-menu-section="Entrees"/);
    assert.match(menuMarkup, /data-menu-section="Snacks"/);
    assert.match(menuMarkup, /data-menu-section="Drinks"/);
    const entreeSection = menuMarkup.match(/data-menu-section="Entrees"[\s\S]*?<\/section>/)?.[0] || '';
    const entreeItemIds = [...entreeSection.matchAll(/data-add-menu-item="([^"]+)"/g)].map(match => match[1]);
    assert.ok(entreeItemIds.length >= 5, `${truckId} should provide at least five entrées`);
    const drinkSection = menuMarkup.match(/data-menu-section="Drinks"[\s\S]*?<\/section>/)?.[0] || '';
    const drinkItemIds = [...drinkSection.matchAll(/data-add-menu-item="([^"]+)"/g)].map(match => match[1]);
    assert.ok(drinkItemIds.length >= 5, `${truckId} should provide at least five drinks`);
    const menuItemIds = [...menuMarkup.matchAll(/data-add-menu-item="([^"]+)"/g)].map(match => match[1]).sort();
    assert.ok(menuItemIds.length >= 13, `${truckId} should provide a full menu with at least thirteen selections`);
    menuSignatures.push(menuItemIds.join('|'));
  }

  assert.equal(expectedMenus.length, 20);
  assert.equal(new Set(menuSignatures).size, 20, 'each truck should have a distinct menu item set');

  await emit(element('openCustomerPortalButton'), 'click');
  element('customerHomeSearchInput').value = 'Oxtail';
  await emit(element('customerAccountContent'), 'submit', {
    preventDefault() {},
    target: { id: 'customerHomeSearch' }
  });
  assert.match(element('customerHomeSearchResults').innerHTML, /Kingston Jerk Stop/);
});

test('customer ordering journey persists cart, places an order, and opens live tracking', async () => {
  let account = await window.FoodTrekNowCustomerAuth.signIn('avery@example.com', 'new-password');
  localStorage.setItem('ftnCustomerSessionV1', JSON.stringify({ accountId: account.id }));
  await emit(element('openCustomerPortalButton'), 'click');

  await emit(element('customerAccountContent'), 'click', { target: actionTarget({ nearbyOrder: 'capital-city-eats' }) });
  assert.match(element('customerAccountContent').innerHTML, /Capital City Eats Menu/);
  assert.doesNotMatch(element('customerAccountContent').innerHTML, /Featured Items|Today’s Specials|Popular Items/);
  ['Appetizers', 'Entrees', 'Sides', 'Desserts', 'Drinks'].forEach(category => assert.match(element('customerAccountContent').innerHTML, new RegExp(category)));
  assert.match(element('customerAccountContent').innerHTML, /Sold Out/);

  assert.match(element('customerAccountContent').innerHTML, /floating-cart-summary/);
  assert.match(element('customerAccountContent').innerHTML, /data-menu-item-decrease="capital-smash-burger"/);
  assert.match(element('customerAccountContent').innerHTML, /data-menu-item-quantity="capital-smash-burger">0/);
  await emit(element('customerAccountContent'), 'click', { target: actionTarget({ addMenuItem: 'capital-smash-burger' }) });
  await emit(element('customerAccountContent'), 'click', { target: actionTarget({ addMenuItem: 'capital-smash-burger' }) });

  account = await window.FoodTrekNowCustomerAuth.signIn('avery@example.com', 'new-password');
  assert.equal(account.cart.items.length, 1);
  assert.equal(account.cart.items[0].quantity, 2);
  await emit(element('customerAccountContent'), 'click', { target: actionTarget({ menuItemDecrease: 'capital-smash-burger' }) });
  account = await window.FoodTrekNowCustomerAuth.signIn('avery@example.com', 'new-password');
  assert.equal(account.cart.items[0].quantity, 1);
  await emit(element('customerAccountContent'), 'click', { target: actionTarget({ addMenuItem: 'capital-smash-burger' }) });
  account = await window.FoodTrekNowCustomerAuth.signIn('avery@example.com', 'new-password');
  assert.equal(account.cart.items[0].quantity, 2);
  assert.equal(account.cart.items.some(item => item.menuItemId === 'fresh-lemonade'), false);
  assert.equal(account.cart.items[0].instructions, '');
  assert.match(element('customerAccountContent').innerHTML, /Capital City Eats Menu/);
  assert.doesNotMatch(element('customerAccountContent').innerHTML, /Shopping Cart/);

  await emit(element('customerAccountContent'), 'click', { target: actionTarget({ addMenuItem: 'fresh-lemonade' }) });

  account = await window.FoodTrekNowCustomerAuth.signIn('avery@example.com', 'new-password');
  assert.equal(account.cart.items.length, 2);
  assert.deepEqual(account.cart.items.find(item => item.menuItemId === 'fresh-lemonade').modifiers, []);
  assert.doesNotMatch(element('customerAccountModalContent').innerHTML, /Choose a size/);

  const storedAccounts = JSON.parse(localStorage.getItem('ftnCustomerAccountsV1'));
  const storedAccount = storedAccounts.find(item => item.id === account.id);
  storedAccount.cart.items.find(item => item.menuItemId === 'fresh-lemonade').modifiers = [{ group: 'Choose a size', name: 'Regular', price: 0 }];
  localStorage.setItem('ftnCustomerAccountsV1', JSON.stringify(storedAccounts));
  await emit(element('openCustomerPortalButton'), 'click');
  account = await window.FoodTrekNowCustomerAuth.signIn('avery@example.com', 'new-password');
  assert.deepEqual(account.cart.items.find(item => item.menuItemId === 'fresh-lemonade').modifiers, []);
  assert.ok(Number.isInteger(account.cart.orderNumber));
  const cartOrderNumber = account.cart.orderNumber;

  await emit(element('customerAccountContent'), 'click', { target: actionTarget({ orderingAction: 'open-cart' }) });
  assert.match(element('customerAccountContent').innerHTML, new RegExp(`Order #${account.cart.orderNumber}`));
  assert.match(element('customerAccountContent').innerHTML, /Proceed to Checkout/);
  const burger = account.cart.items.find(item => item.menuItemId === 'capital-smash-burger');
  await emit(element('customerAccountContent'), 'click', { target: actionTarget({ cartNote: burger.id }) });
  element('cartNoteItemId').value = burger.id;
  element('cartItemNote').value = 'No onions, cut in half';
  await emit(element('customerAccountModalContent'), 'submit', { preventDefault() {}, target: { id: 'customerCartItemNoteForm' } });
  account = await window.FoodTrekNowCustomerAuth.signIn('avery@example.com', 'new-password');
  assert.equal(account.cart.items.find(item => item.id === burger.id).instructions, 'No onions, cut in half');
  const lemonade = account.cart.items.find(item => item.menuItemId === 'fresh-lemonade');
  await emit(element('customerAccountContent'), 'click', { target: actionTarget({ cartQuantity: lemonade.id, quantityChange: '-1' }) });
  account = await window.FoodTrekNowCustomerAuth.signIn('avery@example.com', 'new-password');
  assert.equal(account.cart.items.length, 1);
  assert.equal(account.cart.items.some(item => item.menuItemId === 'fresh-lemonade'), false);

  await emit(element('customerAccountContent'), 'click', { target: actionTarget({ orderingAction: 'checkout' }) });
  assert.match(element('customerAccountContent').innerHTML, /Review and Place Your Order/);
  element('checkoutPromoCode').value = 'BETA10';
  element('checkoutOrderNotes').value = 'Please include napkins';
  await emit(element('customerAccountContent'), 'submit', { preventDefault() {}, target: { id: 'customerCheckoutForm' } });

  account = await window.FoodTrekNowCustomerAuth.signIn('avery@example.com', 'new-password');
  const placedOrder = account.orders[0];
  const permanentOrderNumber = placedOrder.id;
  assert.equal(permanentOrderNumber, cartOrderNumber);
  assert.equal(account.cart.items.length, 0);
  assert.equal(placedOrder.status, 'received');
  assert.equal(Object.hasOwn(placedOrder, 'pickupNumber'), false);
  assert.equal(placedOrder.promoCode, 'BETA10');
  assert.equal(placedOrder.orderNotes, 'Please include napkins');
  assert.match(element('customerAccountContent').innerHTML, /Order Successfully Placed/);
  assert.match(element('customerAccountContent').innerHTML, new RegExp(`Order #${permanentOrderNumber}`));
  assert.equal(JSON.parse(localStorage.getItem('ftnVendorOrdersV0231'))[0].id, permanentOrderNumber);
  assert.equal(JSON.parse(localStorage.getItem('ftnVendorOrdersV0231'))[0].truckName, 'Capital City Eats');

  localStorage.setItem('ftnVendorOrdersV0231', JSON.stringify(
    JSON.parse(localStorage.getItem('ftnVendorOrdersV0231')).filter(order => order.id !== permanentOrderNumber)
  ));
  element('email').value = 'vendor@foodtreknow.com';
  element('password').value = 'demo123';
  await emit(element('loginForm'), 'submit', { preventDefault() {} });
  assert.match(element('newOrders').innerHTML, new RegExp(`Order #${permanentOrderNumber}`));
  assert.ok(JSON.parse(localStorage.getItem('ftnVendorOrdersV0231')).some(order => order.id === permanentOrderNumber));

  await emit(element('customerAccountContent'), 'click', { target: actionTarget({ orderingAction: 'track-order' }) });
  assert.match(element('customerAccountContent').innerHTML, /Live Order Tracking/);
  assert.match(element('customerAccountContent').innerHTML, /Order Received/);
  assert.match(element('customerAccountContent').innerHTML, /Ready for Pickup/);
  assert.match(element('customerAccountContent').innerHTML, new RegExp(`Order #${permanentOrderNumber}`));
  assert.doesNotMatch(element('customerAccountContent').innerHTML, /Pickup Number/i);
  assert.doesNotMatch(source, /const pickupNumber\s*=/);

  await emit(element('customerAccountContent'), 'click', { target: actionTarget({ cancelOrder: permanentOrderNumber }) });
  assert.match(element('customerAccountModalContent').innerHTML, /Cancel this order/);
  assert.match(element('customerAccountModalContent').innerHTML, /Full refund/);
  await emit(element('customerAccountModalContent'), 'click', { target: actionTarget({ confirmCancelOrder: permanentOrderNumber }) });
  account = await window.FoodTrekNowCustomerAuth.signIn('avery@example.com', 'new-password');
  const cancelledOrder = account.orders.find(order => order.id === permanentOrderNumber);
  assert.equal(cancelledOrder.status, 'cancelled');
  assert.equal(cancelledOrder.refund.status, 'refunded');
  assert.equal(cancelledOrder.refund.amount, cancelledOrder.total);
  const vendorOrder = JSON.parse(localStorage.getItem('ftnVendorOrdersV0231')).find(order => order.id === permanentOrderNumber);
  assert.equal(vendorOrder.status, 'cancelled');
  assert.equal(vendorOrder.refundStatus, 'refunded');
  assert.match(element('customerAccountContent').innerHTML, /Cancelled · Full Refund/);
});

test('vendor saved availability controls the signed-in customer menu and checkout', async () => {
  let account = await window.FoodTrekNowCustomerAuth.signIn('avery@example.com', 'new-password');
  localStorage.setItem('ftnCustomerSessionV1', JSON.stringify({ accountId: account.id }));
  const vendorMenu = [{ id: 1, name: 'Classic Cheeseburger', category: 'Burgers', price: 11.5, description: 'Vendor-managed burger.', available: false, image: '' }];
  const burger = vendorMenu[0];
  localStorage.setItem('ftnVendorMenuV0400', JSON.stringify(vendorMenu));

  await emit(element('openCustomerPortalButton'), 'click');
  await emit(element('customerAccountContent'), 'click', { target: actionTarget({ nearbyOrder: 'capital-city-eats' }) });
  await emit(element('customerAccountContent'), 'click', { target: actionTarget({ orderingAction: 'open-menu' }) });
  assert.match(element('customerAccountContent').innerHTML, /Classic Cheeseburger/);
  assert.match(element('customerAccountContent').innerHTML, /data-add-menu-item="capital-smash-burger"[^>]*disabled/);

  burger.available = true;
  localStorage.setItem('ftnVendorMenuV0400', JSON.stringify(vendorMenu));
  await emit(element('customerAccountContent'), 'click', { target: actionTarget({ orderingAction: 'open-menu' }) });
  await emit(element('customerAccountContent'), 'click', { target: actionTarget({ addMenuItem: 'capital-smash-burger' }) });
  account = await window.FoodTrekNowCustomerAuth.signIn('avery@example.com', 'new-password');
  assert.equal(account.cart.items.length, 1);

  burger.available = false;
  localStorage.setItem('ftnVendorMenuV0400', JSON.stringify(vendorMenu));
  await emit(element('customerAccountContent'), 'click', { target: actionTarget({ orderingAction: 'open-cart' }) });
  assert.match(element('customerAccountContent').innerHTML, /Your cart changed/);
  assert.match(element('customerAccountContent').innerHTML, /Sold Out/);
  assert.match(element('customerAccountContent').innerHTML, /Remove Sold-Out Items/);

  await emit(element('customerAccountContent'), 'click', { target: actionTarget({ orderingAction: 'checkout' }) });
  assert.match(element('customerAccountContent').innerHTML, /Shopping Cart/);
  assert.doesNotMatch(element('customerAccountContent').innerHTML, /Review and Place Your Order/);

  await emit(element('customerAccountContent'), 'click', { target: actionTarget({ orderingAction: 'empty-cart' }) });
  localStorage.removeItem('ftnVendorMenuV0400');
});

test('guest checkout browses nearby trucks, orders from a distinct menu, and persists the order', async () => {
  localStorage.removeItem('ftnGuestCustomerV1');
  await emit(element('guestCheckoutButton'), 'click');
  assert.match(element('customerAccountContent').innerHTML, /Find Food Trucks Near Your Location/);
  assert.equal(sessionStorage.getItem('ftnGuestSessionActiveV1'), 'true');

  await emit(element('customerAccountContent'), 'click', { target: actionTarget({ nearbyOrder: 'taco-luna' }) });
  assert.match(element('customerAccountContent').innerHTML, /Taco Luna/);
  await emit(element('customerAccountContent'), 'click', { target: actionTarget({ orderingAction: 'open-menu' }) });
  assert.match(element('customerAccountContent').innerHTML, /Birria Tacos/);
  await emit(element('customerAccountContent'), 'click', { target: actionTarget({ addMenuItem: 'taco-luna-birria-tacos' }) });

  let guest = JSON.parse(localStorage.getItem('ftnGuestCustomerV1'));
  assert.equal(guest.isGuest, true);
  assert.equal(guest.cart.items.length, 1);
  assert.equal(guest.cart.items[0].name, 'Birria Tacos');

  await emit(element('customerAccountContent'), 'click', { target: actionTarget({ orderingAction: 'open-cart' }) });
  assert.match(element('customerAccountContent').innerHTML, /Shopping Cart/);
  await emit(element('customerAccountContent'), 'click', { target: actionTarget({ orderingAction: 'checkout' }) });
  assert.match(element('customerAccountContent').innerHTML, /Review and Place Your Order/);
  assert.match(element('customerAccountContent').innerHTML, /guestCheckoutName/);

  element('guestCheckoutName').value = 'Taylor Guest';
  element('guestCheckoutMobile').value = '(919) 555-0188';
  element('guestCheckoutEmail').value = 'taylor@example.com';
  element('checkoutPromoCode').value = '';
  element('checkoutOrderNotes').value = 'Guest order';
  await emit(element('customerAccountContent'), 'submit', { preventDefault() {}, target: { id: 'customerCheckoutForm' } });

  guest = JSON.parse(localStorage.getItem('ftnGuestCustomerV1'));
  assert.equal(guest.cart.items.length, 0);
  assert.equal(guest.orders[0].guestCheckout, true);
  assert.equal(guest.orders[0].customerName, 'Taylor Guest');
  assert.equal(guest.orders[0].truckName, 'Taco Luna');
  assert.match(element('customerAccountContent').innerHTML, /Order Successfully Placed/);
  const vendorGuestOrder = JSON.parse(localStorage.getItem('ftnVendorOrdersV0231')).find(order => order.id === guest.orders[0].id);
  assert.equal(vendorGuestOrder.guestCheckout, true);
  assert.equal(vendorGuestOrder.customer, 'Taylor');
  assert.equal(JSON.parse(localStorage.getItem('ftnCustomerAccountsV1')).some(account => account.id === 'guest-local'), false);
});

test('vendor actions update customer tracking and picked-up orders can be ordered again', async () => {
  let account = await window.FoodTrekNowCustomerAuth.signIn('avery@example.com', 'new-password');
  const connectedOrderId = 9876;
  const connectedOrder = {
    id: connectedOrderId,
    truckId: 'capital-city-eats',
    truckName: 'Capital City Eats',
    status: 'received',
    statusLabel: 'Order Received',
    createdAt: Date.now(),
    items: [{ name: 'Classic Cheeseburger', qty: 1, price: 11.5 }],
    subtotal: 11.5,
    tax: 0.69,
    total: 12.19
  };
  account.orders.unshift(connectedOrder);
  const accounts = JSON.parse(localStorage.getItem('ftnCustomerAccountsV1'));
  const accountIndex = accounts.findIndex(item => item.id === account.id);
  accounts[accountIndex] = account;
  localStorage.setItem('ftnCustomerAccountsV1', JSON.stringify(accounts));
  localStorage.setItem('ftnCustomerSessionV1', JSON.stringify({ accountId: account.id }));
  localStorage.setItem('ftnVendorOrdersV0231', JSON.stringify([{
    id: connectedOrderId,
    customer: 'Avery',
    items: connectedOrder.items,
    subtotal: connectedOrder.subtotal,
    tax: connectedOrder.tax,
    total: connectedOrder.total,
    status: 'new',
    time: '1:00 PM',
    payment: 'Credit Card',
    paid: true,
    createdAt: connectedOrder.createdAt
  }]));

  element('email').value = 'vendor@foodtreknow.com';
  element('password').value = 'demo123';
  await emit(element('loginForm'), 'submit', { preventDefault() {} });

  window.moveOrder(connectedOrderId, 'preparing');
  account = JSON.parse(localStorage.getItem('ftnCustomerAccountsV1')).find(item => item.id === account.id);
  assert.equal(account.orders.find(order => order.id === connectedOrderId).statusLabel, 'Preparing');

  window.moveOrder(connectedOrderId, 'ready');
  account = JSON.parse(localStorage.getItem('ftnCustomerAccountsV1')).find(item => item.id === account.id);
  assert.equal(account.orders.find(order => order.id === connectedOrderId).statusLabel, 'Ready for Pickup');

  window.moveOrder(connectedOrderId, 'pickedup');
  account = JSON.parse(localStorage.getItem('ftnCustomerAccountsV1')).find(item => item.id === account.id);
  const pickedUpOrder = account.orders.find(order => order.id === connectedOrderId);
  assert.equal(pickedUpOrder.status, 'completed');
  assert.equal(pickedUpOrder.statusLabel, 'Picked Up');
  assert.ok(pickedUpOrder.completedAt);

  await emit(element('openCustomerPortalButton'), 'click');
  const orderCount = account.orders.length;
  await emit(element('customerAccountContent'), 'click', { target: actionTarget({ reorder: String(connectedOrderId) }) });
  account = JSON.parse(localStorage.getItem('ftnCustomerAccountsV1')).find(item => item.id === account.id);
  assert.equal(account.orders.length, orderCount + 1);
  assert.equal(account.orders[0].statusLabel, 'Order Received');
  assert.ok(JSON.parse(localStorage.getItem('ftnVendorOrdersV0231')).some(order => String(order.id) === String(account.orders[0].id)));
});

test('roadmap marks Phase 3.2 complete and names live communication as Phase 4', () => {
  const roadmap = fs.readFileSync(new URL('../PROJECT_ROADMAP.md', import.meta.url), 'utf8');
  assert.match(roadmap, /\[x\] Phase 3 – Customer Account System/);
  assert.match(roadmap, /\[x\] Phase 3\.1 – Customer Home Experience Polish/);
  assert.match(roadmap, /\[x\] Phase 3\.2 – Complete Customer Ordering Experience/);
  assert.match(roadmap, /Phase 4 – Live Vendor & Customer Communication/);
});

test('account deletion removes the local account', async () => {
  const account = await window.FoodTrekNowCustomerAuth.signIn('avery@example.com', 'new-password');
  await window.FoodTrekNowCustomerAuth.deleteAccount(account.id);
  await assert.rejects(() => window.FoodTrekNowCustomerAuth.signIn('avery@example.com', 'new-password'), /incorrect/);
});
