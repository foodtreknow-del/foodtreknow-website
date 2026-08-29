import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const source = fs.readFileSync(new URL('../js/vendor-reports.js', import.meta.url), 'utf8');
const styles = fs.readFileSync(new URL('../css/vendor-reports.css', import.meta.url), 'utf8');

class ElementMock {
  constructor() { this.listeners = new Map(); this.classList = { contains: () => true }; this.value = 'today'; this.innerHTML = ''; this.textContent = ''; }
  addEventListener(type, callback) { const callbacks = this.listeners.get(type) || []; callbacks.push(callback); this.listeners.set(type, callbacks); }
}
const elements = new Map();
const element = id => { if (!elements.has(id)) elements.set(id, new ElementMock()); return elements.get(id); };

globalThis.window = globalThis;
globalThis.localStorage = { getItem: () => null };
globalThis.document = { getElementById: element, querySelector: () => new ElementMock(), createElement: () => ({ click() {} }) };
globalThis.addEventListener = () => {};
globalThis.print = () => {};
vm.runInThisContext(source, { filename: 'vendor-reports.js' });

const now = new Date('2026-08-15T16:00:00-04:00').getTime();
const sampleOrders = [
  { id: 1, customer: 'A', createdAt: now - 60_000, status: 'pickedup', paid: true, payment: 'Credit Card', items: [{ name: 'Tacos', qty: 2, price: 5 }, { name: 'Lemonade', qty: 1, price: 4 }], subtotal: 14, tax: .84, total: 14.84 },
  { id: 2, customer: 'B', createdAt: now - 2 * 86_400_000, status: 'pickedup', paid: true, payment: 'Apple Pay', items: [{ name: 'Burger', qty: 1, price: 12 }], subtotal: 12, tax: .72, total: 12.72 },
  { id: 3, customer: 'C', createdAt: now - 120_000, status: 'cancelled', paid: false, payment: 'Credit Card', items: [{ name: 'Tacos', qty: 1, price: 5 }], subtotal: 5, tax: .3, total: 5.3 }
];

test('sales report UI replaces the placeholder and includes responsive controls', () => {
  ['Sales Reports', 'Reporting period', 'Net Sales', 'Gross Sales', 'Average Order', 'Items Sold', 'Refunds', 'Revenue Trend', 'Top-Selling Items', 'Payment Methods', 'Sales Detail', 'Export CSV', 'Print Report'].forEach(text => assert.ok(html.includes(text), `Missing report UI: ${text}`));
  assert.doesNotMatch(html, /Basic report totals will be expanded/);
  assert.match(html, /js\/vendor-reports\.js/);
  assert.match(styles, /@media\(max-width:600px\)/);
  assert.match(styles, /@media print/);
  assert.match(styles, /body\.printing-vendor-report/);
  assert.doesNotMatch(styles, /@media print\{body>\*:not\(#dashboardView\)/);
  assert.match(source, /classList\.add\('printing-vendor-report'\)/);
  assert.match(source, /classList\.remove\('printing-vendor-report'\)/);
  assert.match(html, /vendor-reports\.css\?v=print-fix-1/);
  assert.match(html, /vendor-reports\.js\?v=print-fix-1/);
});

test('report calculations handle ranges, refunds, averages, items, status, and payments', () => {
  const report = window.FoodTrekNowVendorReports.calculateSalesReport(sampleOrders, '7', now);
  assert.equal(report.orders.length, 3);
  assert.equal(report.orderCount, 2);
  assert.equal(report.grossSales, 32.86);
  assert.equal(report.refunds, 5.3);
  assert.equal(report.netSales, 27.56);
  assert.equal(report.averageOrder, 13.78);
  assert.equal(report.itemsSold, 4);
  assert.equal(report.refundCount, 1);
  assert.equal(report.topItems[0].name, 'Tacos');
  assert.equal(report.topItems[0].quantity, 2);
  assert.equal(report.payments.reduce((sum, payment) => sum + payment.count, 0), 2);
});

test('today filter excludes older transactions', () => {
  const report = window.FoodTrekNowVendorReports.calculateSalesReport(sampleOrders, 'today', now);
  assert.deepEqual(report.orders.map(order => order.id), [1, 3]);
  assert.equal(report.netSales, 14.84);
});

test('CSV export contains transaction details and negative cancelled totals', () => {
  const report = window.FoodTrekNowVendorReports.calculateSalesReport(sampleOrders, '7', now);
  const csv = window.FoodTrekNowVendorReports.buildSalesCsv(report);
  assert.match(csv, /^Order,Date,Customer,Status,Payment,Items,Subtotal,Tax,Total/m);
  assert.match(csv, /1,.*A,Picked Up,Credit Card,3,14\.00,0\.84,14\.84/);
  assert.match(csv, /3,.*C,Cancelled,Credit Card,1,5\.00,0\.30,-5\.30/);
});
