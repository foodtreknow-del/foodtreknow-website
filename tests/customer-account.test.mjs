import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const vendorSource = fs.readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const source = fs.readFileSync(new URL('../js/customer-account.js', import.meta.url), 'utf8');

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

test('vendor and customer modules initialize together without a startup error', () => {
  assert.ok(window.FoodTrekNowCustomerAuth);
  assert.ok(elements.get('loginForm').listeners.has('submit'));
  assert.ok(elements.get('openCustomerPortalButton').listeners.has('click'));
});

test('customer account UI includes every required area and has unique static IDs', () => {
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(ids).size, ids.length, 'HTML IDs must be unique');

  const requiredText = [
    'Sign In', 'Create Account', 'Guest Checkout', 'First Name', 'Last Name',
    'Mobile Number', 'Email Address', 'Confirm Password', 'Remember me',
    'Forgot Password', 'Profile', 'Preferred Name', 'Addresses', 'Favorites',
    'Order History', 'Payment Methods', 'Notifications', 'Privacy Settings',
    'Delete Account'
  ];
  const completeUiSource = `${html}\n${source}`;
  requiredText.forEach(text => assert.ok(completeUiSource.includes(text), `Missing UI contract: ${text}`));
  assert.doesNotMatch(completeUiSource, /loyalty points|rewards program/i);
  assert.match(fs.readFileSync(new URL('../css/customer-account.css', import.meta.url), 'utf8'), /@media\(max-width:760px\)/);
  assert.match(source, /PERSISTENT_SESSION_KEY/);
  assert.match(source, /TEMP_SESSION_KEY/);
  assert.match(source, /LocalCustomerAuthAdapter/);
  assert.match(source, /setAdapter\(adapter\)/);
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
  assert.equal(account.preferences.notifications.orderUpdates, true);
  assert.equal(account.preferences.privacy.activityHistory, true);
});

test('customers can sign in by email or mobile and invalid credentials are rejected', async () => {
  const byEmail = await window.FoodTrekNowCustomerAuth.signIn('AVERY@example.com', 'safe-password');
  const byMobile = await window.FoodTrekNowCustomerAuth.signIn('5555550198', 'safe-password');
  assert.equal(byEmail.id, byMobile.id);
  await assert.rejects(() => window.FoodTrekNowCustomerAuth.signIn('avery@example.com', 'wrong-password'), /incorrect/);
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

test('account deletion removes the local account', async () => {
  const account = await window.FoodTrekNowCustomerAuth.signIn('avery@example.com', 'new-password');
  await window.FoodTrekNowCustomerAuth.deleteAccount(account.id);
  await assert.rejects(() => window.FoodTrekNowCustomerAuth.signIn('avery@example.com', 'new-password'), /incorrect/);
});
