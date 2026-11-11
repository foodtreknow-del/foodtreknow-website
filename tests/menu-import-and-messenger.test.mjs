import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const customer = fs.readFileSync(new URL('../js/customer-account.js', import.meta.url), 'utf8');
const importerSource = fs.readFileSync(new URL('../js/menu-import.js', import.meta.url), 'utf8');

function importer() {
  const context = {};
  vm.runInNewContext(importerSource, context);
  return context.FoodTrekNowMenuImport;
}

test('customer home places a working Messenger card below Favorites', () => {
  const favorites = customer.indexOf('home-action-card favorites');
  const hostRequest = customer.indexOf('home-action-card host-request');
  const messenger = customer.indexOf('home-action-card messenger');
  assert.ok(favorites >= 0 && hostRequest > favorites && messenger > hostRequest);
  assert.match(customer, /messages: renderMessages/);
  assert.match(customer, /'view-messages': \(\) => renderCustomerPage\('messages'\)/);
  assert.match(customer, /data-order-details/);
  assert.match(html, /data-customer-page="messages"/);
});

test('menu importer handles quoted CSV text, categories, sizes, and paid add-ons', () => {
  const api = importer();
  const csv = 'Category,Item Name,Description,Base Price,Available,Featured,Size Options,Add-on Label,Add-ons,Image URL\nDrinks,Milkshake,"Creamy, hand-spun",6,Yes,No,Small:6|Large:9,Choose a flavor,Vanilla:0|Chocolate:0,';
  const result = api.importMenuCsv(csv, [], [], 'merge');
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].description, 'Creamy, hand-spun');
  assert.deepEqual(Array.from(result.items[0].sizeOptions, option => ({ ...option })), [{ name: 'Small', price: 6 }, { name: 'Large', price: 9 }]);
  assert.equal(result.items[0].addOnLabel, 'Choose a flavor');
  assert.equal(result.items[0].addOns.length, 2);
  assert.deepEqual(Array.from(result.categories), ['Drinks']);
});

test('menu merge updates matching items while preserving unrelated menu items', () => {
  const api = importer();
  const existing = [{ id: 7, name: 'Fries', category: 'Sides', description: '', price: 5, available: true, featured: false, image: 'fries.jpg', sizeOptions: [], addOns: [], addOnLabel: 'Add-ons', order: 1 }, { id: 8, name: 'Water', category: 'Drinks', price: 2, order: 2 }];
  const csv = 'Category,Item Name,Description,Base Price,Available,Featured,Size Options,Add-on Label,Add-ons,Image URL\nSides,Fries,Crispy fries,6,Yes,Yes,,Sauces,Ketchup:0|Cheese:1,';
  const result = api.importMenuCsv(csv, existing, ['Sides', 'Drinks'], 'merge');
  assert.equal(result.summary.updated, 1);
  assert.equal(result.items.length, 2);
  assert.equal(result.items[0].id, 7);
  assert.equal(result.items[0].price, 6);
  assert.equal(result.items[0].image, 'fries.jpg');
});

test('vendor menu exposes template download, CSV upload, preview, and merge or replace choices', () => {
  for (const expected of ['importMenuButton', 'downloadMenuTemplateButton', 'menuImportFile', 'menuImportPreview', 'menuImportMode']) assert.match(html, new RegExp(`id="${expected}"`));
  assert.match(html, /js\/menu-import\.js/);
});
