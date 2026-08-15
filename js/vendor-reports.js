(() => {
  'use strict';

  const ORDER_STORAGE_KEY = 'ftnVendorOrdersV0231';
  const rangeLabels = { today: 'Today', 7: 'Last 7 Days', 30: 'Last 30 Days', all: 'All Time' };
  let activeRange = 'today';

  const amount = value => Number(value) || 0;
  const reportMoney = value => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount(value));
  const reportText = value => String(value ?? '').replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
  const dateValue = order => {
    const value = Number(order.createdAt);
    return Number.isFinite(value) ? value : new Date(order.createdAt || 0).getTime();
  };

  function getRangeStart(range, now = Date.now()) {
    if (range === 'all') return 0;
    if (range === 'today') {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      return start.getTime();
    }
    return now - Number(range) * 24 * 60 * 60 * 1000;
  }

  function filterOrdersByRange(source, range = activeRange, now = Date.now()) {
    const start = getRangeStart(range, now);
    return (Array.isArray(source) ? source : []).filter(order => dateValue(order) >= start).sort((a, b) => dateValue(b) - dateValue(a));
  }

  function calculateSalesReport(source, range = activeRange, now = Date.now()) {
    const filteredOrders = filterOrdersByRange(source, range, now);
    const cancelledOrders = filteredOrders.filter(order => order.status === 'cancelled');
    const salesOrders = filteredOrders.filter(order => order.status !== 'cancelled' && order.paid !== false);
    const grossSales = [...salesOrders, ...cancelledOrders].reduce((sum, order) => sum + amount(order.total), 0);
    const refunds = cancelledOrders.reduce((sum, order) => sum + amount(order.total), 0);
    const netSales = grossSales - refunds;
    const itemsSold = salesOrders.reduce((sum, order) => sum + (order.items || []).reduce((itemSum, item) => itemSum + amount(item.qty || item.quantity || 1), 0), 0);
    const topItems = new Map();
    const payments = new Map();
    const statuses = new Map();

    salesOrders.forEach(order => {
      const payment = order.payment || 'Other';
      const paymentValue = payments.get(payment) || { count: 0, total: 0 };
      paymentValue.count += 1;
      paymentValue.total += amount(order.total);
      payments.set(payment, paymentValue);
      (order.items || []).forEach(item => {
        const name = item.name || 'Unnamed Item';
        const itemValue = topItems.get(name) || { name, quantity: 0, sales: 0 };
        const quantity = amount(item.qty || item.quantity || 1);
        itemValue.quantity += quantity;
        itemValue.sales += quantity * amount(item.price);
        topItems.set(name, itemValue);
      });
    });
    filteredOrders.forEach(order => statuses.set(order.status || 'unknown', (statuses.get(order.status || 'unknown') || 0) + 1));

    return {
      range,
      label: rangeLabels[range] || rangeLabels.today,
      orders: filteredOrders,
      salesOrders,
      grossSales,
      refunds,
      netSales,
      orderCount: salesOrders.length,
      averageOrder: salesOrders.length ? netSales / salesOrders.length : 0,
      itemsSold,
      refundCount: cancelledOrders.length,
      topItems: [...topItems.values()].sort((a, b) => b.quantity - a.quantity || b.sales - a.sales),
      payments: [...payments.entries()].map(([name, data]) => ({ name, ...data })).sort((a, b) => b.total - a.total),
      statuses: [...statuses.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count)
    };
  }

  function getVendorOrders() {
    try {
      const saved = JSON.parse(localStorage.getItem(ORDER_STORAGE_KEY));
      if (Array.isArray(saved)) return saved;
    } catch {}
    try {
      if (typeof loadOrders === 'function') return loadOrders();
    } catch {}
    return [];
  }

  function trendData(report, now = Date.now()) {
    const days = report.range === 'today' ? 1 : report.range === 'all' ? 14 : Number(report.range);
    const count = Math.min(Math.max(days, 1), 30);
    const points = [];
    for (let offset = count - 1; offset >= 0; offset -= 1) {
      const day = new Date(now - offset * 24 * 60 * 60 * 1000);
      const start = new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime();
      const end = start + 24 * 60 * 60 * 1000;
      const total = report.salesOrders.filter(order => dateValue(order) >= start && dateValue(order) < end).reduce((sum, order) => sum + amount(order.total), 0);
      points.push({ label: day.toLocaleDateString([], { month: 'short', day: 'numeric' }), total });
    }
    return points;
  }

  function statusName(status) {
    return status === 'new' ? 'New' : status === 'preparing' ? 'Preparing' : status === 'ready' ? 'Ready' : status === 'pickedup' || status === 'completed' ? 'Picked Up' : status === 'cancelled' ? 'Cancelled' : 'Other';
  }

  function renderBreakdown(container, rows, total, type = 'default') {
    if (!rows.length) {
      container.innerHTML = '<div class="empty-state">No data in this reporting period.</div>';
      return;
    }
    container.innerHTML = rows.map(row => {
      const value = type === 'payment' ? row.total : row.count;
      const display = type === 'payment' ? `${reportMoney(row.total)} · ${row.count} order${row.count === 1 ? '' : 's'}` : `${row.count}`;
      const percent = total ? Math.max(4, Math.round(value / total * 100)) : 0;
      const className = type === 'status' ? ` report-status-${reportText(row.name)}` : '';
      return `<div class="report-breakdown-row${className}"><strong>${reportText(type === 'status' ? statusName(row.name) : row.name)}</strong><span>${display}</span><div class="report-meter"><span style="width:${percent}%"></span></div></div>`;
    }).join('');
  }

  function renderSalesReport(range = activeRange) {
    activeRange = range;
    const report = calculateSalesReport(getVendorOrders(), range);
    const setText = (id, value) => { const node = document.getElementById(id); if (node) node.textContent = value; };
    setText('reportNetSales', reportMoney(report.netSales));
    setText('reportGrossSales', reportMoney(report.grossSales));
    setText('reportOrderCount', String(report.orderCount));
    setText('reportAverageOrder', reportMoney(report.averageOrder));
    setText('reportItemsSold', String(report.itemsSold));
    setText('reportRefunds', reportMoney(report.refunds));
    setText('reportRefundCount', `${report.refundCount} cancelled order${report.refundCount === 1 ? '' : 's'}`);
    setText('reportPeriodLabel', report.label);
    setText('reportTrendTotal', reportMoney(report.netSales));
    setText('reportOrderSummary', `${report.orders.length} transaction${report.orders.length === 1 ? '' : 's'} in ${report.label.toLowerCase()}`);

    const points = trendData(report);
    const maximum = Math.max(...points.map(point => point.total), 1);
    document.getElementById('salesTrendChart').innerHTML = points.map(point => `<div class="trend-column"><span class="trend-value">${point.total ? reportMoney(point.total) : '$0'}</span><div class="trend-bar-track"><span class="trend-bar" style="height:${Math.max(point.total ? 5 : 0, Math.round(point.total / maximum * 100))}%"></span></div><span class="trend-label">${reportText(point.label)}</span></div>`).join('');

    const statusTotal = report.statuses.reduce((sum, row) => sum + row.count, 0);
    renderBreakdown(document.getElementById('reportStatusBreakdown'), report.statuses, statusTotal, 'status');
    renderBreakdown(document.getElementById('reportPaymentBreakdown'), report.payments, report.netSales, 'payment');

    document.getElementById('topSellingItemsBody').innerHTML = report.topItems.length ? report.topItems.slice(0, 8).map((item, index) => `<tr><td><span class="report-rank">${index + 1}</span>${reportText(item.name)}</td><td>${item.quantity}</td><td>${reportMoney(item.sales)}</td></tr>`).join('') : '<tr><td class="report-empty" colspan="3">No item sales in this reporting period.</td></tr>';
    document.getElementById('reportOrdersBody').innerHTML = report.orders.length ? report.orders.map(order => `<tr><td><strong>#${reportText(order.id)}</strong></td><td>${new Date(dateValue(order)).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</td><td>${reportText(order.customer || 'Customer')}</td><td><span class="report-status-badge ${reportText(order.status)}">${reportText(statusName(order.status))}</span></td><td>${reportText(order.payment || 'Other')}</td><td>${(order.items || []).reduce((sum, item) => sum + amount(item.qty || item.quantity || 1), 0)}</td><td><strong>${reportMoney(order.status === 'cancelled' ? -amount(order.total) : order.total)}</strong></td></tr>`).join('') : '<tr><td class="report-empty" colspan="7">No transactions in this reporting period.</td></tr>';
    return report;
  }

  function csvCell(value) {
    const text = String(value ?? '');
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }

  function buildSalesCsv(report) {
    const header = ['Order', 'Date', 'Customer', 'Status', 'Payment', 'Items', 'Subtotal', 'Tax', 'Total'];
    const rows = report.orders.map(order => [order.id, new Date(dateValue(order)).toISOString(), order.customer || 'Customer', statusName(order.status), order.payment || 'Other', (order.items || []).reduce((sum, item) => sum + amount(item.qty || item.quantity || 1), 0), amount(order.subtotal).toFixed(2), amount(order.tax).toFixed(2), (order.status === 'cancelled' ? -amount(order.total) : amount(order.total)).toFixed(2)]);
    return [header, ...rows].map(row => row.map(csvCell).join(',')).join('\n');
  }

  function exportSalesReport() {
    const report = calculateSalesReport(getVendorOrders(), activeRange);
    const blob = new Blob([buildSalesCsv(report)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `foodtreknow-sales-${activeRange}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    if (typeof notify === 'function') notify('Sales report exported');
  }

  const rangeSelect = document.getElementById('reportRange');
  rangeSelect?.addEventListener('change', event => renderSalesReport(event.target.value));
  document.getElementById('refreshSalesReportButton')?.addEventListener('click', () => renderSalesReport(rangeSelect?.value || activeRange));
  document.getElementById('exportSalesReportButton')?.addEventListener('click', exportSalesReport);
  document.getElementById('printSalesReportButton')?.addEventListener('click', () => window.print());
  document.querySelector('[data-page="reports"]')?.addEventListener('click', () => renderSalesReport(rangeSelect?.value || activeRange));
  if (window.addEventListener) {
    window.addEventListener('ftn:vendor-orders-updated', () => { if (!document.getElementById('reportsPage')?.classList.contains('hidden-view')) renderSalesReport(activeRange); });
    window.addEventListener('storage', event => { if (event.key === ORDER_STORAGE_KEY && !document.getElementById('reportsPage')?.classList.contains('hidden-view')) renderSalesReport(activeRange); });
  }

  window.FoodTrekNowVendorReports = { calculateSalesReport, filterOrdersByRange, buildSalesCsv, renderSalesReport, getRangeStart };
})();
