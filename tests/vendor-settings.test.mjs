import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const source = fs.readFileSync(new URL('../js/vendor-settings.js', import.meta.url), 'utf8');
const styles = fs.readFileSync(new URL('../css/vendor-settings.css', import.meta.url), 'utf8');

class StorageMock {
  constructor() { this.values = new Map(); }
  getItem(key) { return this.values.has(key) ? this.values.get(key) : null; }
  setItem(key, value) { this.values.set(key, String(value)); }
}
class ElementMock {
  constructor() { this.value = ''; this.checked = false; this.disabled = false; this.innerHTML = ''; this.textContent = ''; this.className = ''; this.files = []; this.listeners = new Map(); this.classList = { contains: () => false, toggle() {} }; }
  addEventListener(type, callback) { const callbacks = this.listeners.get(type) || []; callbacks.push(callback); this.listeners.set(type, callbacks); }
  dispatchEvent() {}
}
const elements = new Map();
const element = id => { if (!elements.has(id)) elements.set(id, new ElementMock()); return elements.get(id); };

globalThis.window = globalThis;
globalThis.localStorage = new StorageMock();
globalThis.document = { getElementById: element, querySelector: () => new ElementMock() };
globalThis.confirm = () => true;
globalThis.Event = class { constructor(type) { this.type = type; } };
vm.runInThisContext(source, { filename: 'vendor-settings.js' });

test('vendor settings UI replaces the placeholder with complete responsive options', () => {
  ['Vendor Settings', 'Truck Profile', 'Truck Logo or Photo', 'Order Operations', 'Accepting Orders', 'Estimated Prep Time', 'Business Hours', 'Accepted Payments', 'Vendor Notifications', 'New Order Sound', 'Daily Sales Summary', 'Save All Settings', 'Restore Defaults'].forEach(text => assert.ok(html.includes(text), `Missing settings UI: ${text}`));
  assert.doesNotMatch(html, /Truck profile and notification settings will be added/);
  assert.match(html, /js\/vendor-settings\.js/);
  assert.match(styles, /@media\(max-width:700px\)/);
  assert.match(styles, /@media\(max-width:480px\)/);
});

test('default settings include profile, operations, weekly hours, payments, and notifications', () => {
  const settings = window.FoodTrekNowVendorSettings.defaults();
  assert.equal(settings.profile.truckName, 'Capital City Eats');
  assert.equal(settings.operations.acceptingOrders, true);
  assert.equal(settings.operations.prepTime, 20);
  assert.equal(Object.keys(settings.hours).length, 7);
  assert.equal(settings.hours.sunday.enabled, false);
  assert.equal(settings.payments.creditCard, true);
  assert.equal(settings.notifications.dailySummary, true);
});

test('partial persisted settings merge safely with future defaults', () => {
  const settings = window.FoodTrekNowVendorSettings.normalizeSettings({ profile: { truckName: 'Test Truck' }, operations: { prepTime: 35 }, hours: { monday: { close: '22:00' } } });
  assert.equal(settings.profile.truckName, 'Test Truck');
  assert.equal(settings.profile.email, 'vendor@foodtreknow.com');
  assert.equal(settings.operations.prepTime, 35);
  assert.equal(settings.hours.monday.open, '11:00');
  assert.equal(settings.hours.monday.close, '22:00');
  assert.equal(settings.payments.applePay, true);
});

test('settings validation covers required profile, operations, hours, and payments', () => {
  const valid = window.FoodTrekNowVendorSettings.defaults();
  assert.deepEqual(window.FoodTrekNowVendorSettings.validateSettings(valid), []);
  const invalid = window.FoodTrekNowVendorSettings.defaults();
  invalid.profile.truckName = '';
  invalid.profile.email = 'not-an-email';
  invalid.operations.prepTime = 2;
  invalid.operations.taxRate = 35;
  invalid.hours.monday.open = '20:00';
  invalid.hours.monday.close = '10:00';
  Object.keys(invalid.payments).forEach(key => { invalid.payments[key] = false; });
  const errors = window.FoodTrekNowVendorSettings.validateSettings(invalid);
  assert.equal(errors.length, 6);
  assert.match(errors.join(' '), /Truck name/);
  assert.match(errors.join(' '), /business email/);
  assert.match(errors.join(' '), /Prep time/);
  assert.match(errors.join(' '), /Sales tax/);
  assert.match(errors.join(' '), /Monday hours/);
  assert.match(errors.join(' '), /payment method/);
});

test('settings save and load round trip through the current local persistence model', () => {
  const settings = window.FoodTrekNowVendorSettings.defaults();
  settings.profile.truckName = 'Oak City Kitchen';
  settings.operations.acceptingOrders = false;
  settings.payments.payAtPickup = true;
  window.FoodTrekNowVendorSettings.saveSettings(settings);
  const loaded = window.FoodTrekNowVendorSettings.loadSettings();
  assert.equal(loaded.profile.truckName, 'Oak City Kitchen');
  assert.equal(loaded.operations.acceptingOrders, false);
  assert.equal(loaded.payments.payAtPickup, true);
});

test('first-time settings preserve the existing vendor sound preference', () => {
  localStorage.values.delete('ftnVendorSettingsV1');
  localStorage.setItem('ftnVendorSound', 'off');
  const loaded = window.FoodTrekNowVendorSettings.loadSettings();
  assert.equal(loaded.notifications.orderSound, false);
});
