(function exposeLiveOrders() {
  'use strict';

  const client = window.FoodTrekNowSupabaseClient;
  let customerChannel = null;
  let vendorChannel = null;
  let customerCommunicationChannel = null;
  let vendorCommunicationChannel = null;
  let customerChannelKey = '';
  let vendorChannelKey = '';
  let customerOrderCallback = null;
  let vendorOrderCallback = null;
  const orderSelection = '*, order_items(*), trucks(name,estimated_prep_minutes,pickup_instructions)';

  async function placeOrder(payload) {
    if (!client) throw new Error('Secure ordering is unavailable.');
    const { data, error } = await client.rpc('place_order', {
      p_truck_id: payload.truckId,
      p_items: payload.items.map(item => ({
        menu_item_id: item.menuItemId,
        quantity: Number(item.quantity),
        modifiers: item.modifiers || [],
        special_instructions: item.instructions || ''
      })),
      p_customer_name: payload.customerName,
      p_customer_mobile: payload.customerMobile || null,
      p_customer_email: payload.customerEmail || null,
      p_order_notes: payload.orderNotes || null,
      p_payment_label: payload.paymentLabel || 'Pay at Pickup'
    });
    if (error) throw error;
    const placed = Array.isArray(data) ? data[0] : data;
    if (!placed?.order_id) throw new Error('The order was not returned by the server.');
    return placed;
  }

  async function placeVendorCashSale(payload) {
    if (!client) throw new Error('Secure vendor sales are unavailable.');
    const { data, error } = await client.rpc('place_vendor_cash_sale', {
      p_truck_id: payload.truckId,
      p_items: payload.items.map(item => ({
        menu_item_id: item.menuItemId,
        quantity: Number(item.quantity),
        modifiers: item.modifiers || [],
        special_instructions: item.instructions || ''
      })),
      p_customer_name: payload.customerName || 'Walk-up Customer',
      p_customer_mobile: payload.customerMobile || null,
      p_order_notes: payload.orderNotes || null,
      p_cash_received: Number(payload.cashReceived)
    });
    if (error) throw error;
    const placed = Array.isArray(data) ? data[0] : data;
    if (!placed?.order_id) throw new Error('The cash sale was not returned by the server.');
    return placed;
  }

  async function loadCustomerOrders() {
    if (!client) return [];
    const { data, error } = await client.from('orders').select(orderSelection).order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async function loadVendorOrders(truckId) {
    if (!client || !truckId) return [];
    const { data, error } = await client.from('orders').select(orderSelection).eq('truck_id', truckId).order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async function updateVendorStatus(orderId, status) {
    if (!client || !orderId) throw new Error('The secure order could not be identified.');
    const { data, error } = await client.from('orders').update({ status }).eq('id', orderId).select().single();
    if (error) throw error;
    return data;
  }

  async function setVendorOrderArchived(orderId, archived) {
    if (!client || !orderId) throw new Error('The secure order could not be identified.');
    const { data, error } = await client.rpc('set_vendor_order_archived', { p_order_id: orderId, p_archived: Boolean(archived) });
    if (error) throw error;
    return data;
  }

  async function cancelCustomerOrder(orderId) {
    if (!client || !orderId) throw new Error('The secure order could not be identified.');
    const { data, error } = await client.rpc('cancel_my_order', { p_order_id: orderId });
    if (error) throw error;
    return data;
  }

  async function loadOrderConversation(orderId) {
    if (!client || !orderId) return [];
    const { data, error } = await client.from('order_messages').select('*').eq('order_id', orderId).order('created_at', { ascending: true });
    if (error) throw error;
    return data || [];
  }

  async function loadVendorMessages(truckId) {
    if (!client || !truckId) return [];
    const { data, error } = await client.from('order_messages').select('*, orders!inner(truck_id,order_number)').eq('orders.truck_id', truckId).order('created_at', { ascending: true });
    if (error) throw error;
    return data || [];
  }

  async function sendOrderMessage(orderId, body, senderRole) {
    if (!client || !orderId) throw new Error('The secure order could not be identified.');
    const message = String(body || '').trim();
    if (!message || message.length > 500) throw new Error('Messages must be between 1 and 500 characters.');
    if (!['customer', 'vendor'].includes(senderRole)) throw new Error('A valid message sender role is required.');
    const { data, error } = await client.rpc('send_order_message', { p_order_id: orderId, p_body: message, p_sender_role: senderRole });
    if (error) throw error;
    return data;
  }

  async function markOrderMessagesRead(orderId, readerRole) {
    if (!client || !orderId) return 0;
    if (!['customer', 'vendor'].includes(readerRole)) throw new Error('A valid message reader role is required.');
    const { data, error } = await client.rpc('mark_order_messages_read', { p_order_id: orderId, p_reader_role: readerRole });
    if (error) throw error;
    return Number(data || 0);
  }

  async function reportContent(contentType, contentId, reason, details = '') {
    if (!client || !contentId) throw new Error('The content could not be identified.');
    const allowedTypes = ['order_message', 'opportunity_message', 'opportunity_review'];
    const allowedReasons = ['harassment', 'hate', 'spam', 'unsafe', 'false_information', 'other'];
    if (!allowedTypes.includes(contentType)) throw new Error('Select valid content to report.');
    if (!allowedReasons.includes(reason)) throw new Error('Select a reason for the report.');
    const note = String(details || '').trim();
    if (note.length > 500) throw new Error('Report details must be 500 characters or fewer.');
    const { data, error } = await client.rpc('report_content', {
      p_content_type: contentType,
      p_content_id: contentId,
      p_reason: reason,
      p_details: note
    });
    if (error) throw error;
    return data;
  }

  async function setUserBlocked(userId, blocked = true, reason = '') {
    if (!client || !userId) throw new Error('The account could not be identified.');
    const note = String(reason || '').trim();
    if (note.length > 300) throw new Error('Block details must be 300 characters or fewer.');
    const { data, error } = await client.rpc('set_user_block', {
      p_blocked_user_id: userId,
      p_blocked: Boolean(blocked),
      p_reason: note
    });
    if (error) throw error;
    return Boolean(data);
  }

  function closeSafetyDialog() {
    document.getElementById('contentSafetyDialog')?.remove();
  }

  function dispatchSafetyUpdate(detail) {
    document.dispatchEvent(new CustomEvent('foodtreknow:content-safety-updated', { detail }));
  }

  function openReportDialog(trigger) {
    closeSafetyDialog();
    const contentType = trigger.dataset.reportContent;
    const contentId = trigger.dataset.contentId;
    const reportedUserId = trigger.dataset.reportedUserId;
    const label = trigger.dataset.contentLabel || 'this content';
    const dialog = document.createElement('div');
    dialog.id = 'contentSafetyDialog';
    dialog.className = 'content-safety-overlay';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', 'contentSafetyTitle');
    dialog.innerHTML = `<div class="content-safety-card"><button class="content-safety-close" data-close-content-safety type="button" aria-label="Close">×</button><p class="eyebrow">Community Safety</p><h2 id="contentSafetyTitle">Report ${label}</h2><p>Your report is private and will be reviewed by the FoodTrekNow administrator.</p><form id="contentSafetyReportForm"><label for="contentSafetyReason">Reason</label><select id="contentSafetyReason" required><option value="">Choose a reason</option><option value="harassment">Harassment or bullying</option><option value="hate">Hate or discrimination</option><option value="spam">Spam or scam</option><option value="unsafe">Unsafe or threatening content</option><option value="false_information">False or misleading information</option><option value="other">Other</option></select><label for="contentSafetyDetails">Additional details (optional)</label><textarea id="contentSafetyDetails" maxlength="500" rows="4" placeholder="Tell us what happened."></textarea>${reportedUserId ? '<label class="content-safety-block-choice"><input id="contentSafetyAlsoBlock" type="checkbox"> Also block this account</label>' : ''}<p class="form-message" data-content-safety-message></p><div class="content-safety-actions"><button class="secondary-button" data-close-content-safety type="button">Cancel</button><button class="danger-button" type="submit">Submit Report</button></div></form></div>`;
    document.body.appendChild(dialog);
    dialog.querySelector('select')?.focus();
    dialog.addEventListener('click', event => {
      if (event.target === dialog || event.target.closest('[data-close-content-safety]')) closeSafetyDialog();
    });
    dialog.querySelector('form').addEventListener('submit', async event => {
      event.preventDefault();
      const submit = event.target.querySelector('button[type="submit"]');
      const message = event.target.querySelector('[data-content-safety-message]');
      submit.disabled = true;
      message.textContent = 'Submitting your report…';
      try {
        const reason = dialog.querySelector('#contentSafetyReason').value;
        const details = dialog.querySelector('#contentSafetyDetails').value;
        await reportContent(contentType, contentId, reason, details);
        const alsoBlock = Boolean(dialog.querySelector('#contentSafetyAlsoBlock')?.checked);
        if (alsoBlock && reportedUserId) await setUserBlocked(reportedUserId, true, reason);
        message.classList.add('success-message');
        message.textContent = alsoBlock ? 'Report submitted and account blocked.' : 'Report submitted. Thank you for helping keep FoodTrekNow safe.';
        trigger.closest('[data-content-author]')?.remove();
        dispatchSafetyUpdate({ action: 'reported', contentType, contentId, reportedUserId, blocked: alsoBlock });
        window.setTimeout(closeSafetyDialog, 900);
      } catch (error) {
        message.textContent = error.message || 'The report could not be submitted.';
        submit.disabled = false;
      }
    });
  }

  async function blockFromTrigger(trigger) {
    const userId = trigger.dataset.blockUser;
    const label = trigger.dataset.blockLabel || 'this account';
    if (!userId || !window.confirm(`Block ${label}? You will no longer see their messages or reviews, and they will not be able to message you.`)) return;
    trigger.disabled = true;
    try {
      await setUserBlocked(userId, true, 'Blocked from user-generated content controls');
      document.querySelectorAll(`[data-content-author="${CSS.escape(userId)}"]`).forEach(element => element.remove());
      dispatchSafetyUpdate({ action: 'blocked', reportedUserId: userId, blocked: true });
      window.alert(`${label} has been blocked.`);
    } catch (error) {
      window.alert(error.message || 'The account could not be blocked.');
      trigger.disabled = false;
    }
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('click', event => {
      const report = event.target.closest('[data-report-content]');
      if (report) { event.preventDefault(); openReportDialog(report); return; }
      const block = event.target.closest('[data-block-user]');
      if (block) { event.preventDefault(); blockFromTrigger(block); }
    });
  }

  async function loadCustomerNotifications() {
    if (!client) return [];
    const { data, error } = await client.from('customer_notifications').select('*').order('created_at', { ascending: false }).limit(100);
    if (error) throw error;
    return data || [];
  }

  async function markCustomerNotificationsRead(notificationIds = null) {
    if (!client) return 0;
    const { data, error } = await client.rpc('mark_customer_notifications_read', { p_notification_ids: notificationIds });
    if (error) throw error;
    return Number(data || 0);
  }

  function subscribeCustomer(customerId, callback) {
    if (!client || !customerId || typeof client.channel !== 'function') return null;
    customerOrderCallback = callback;
    if (customerChannel && customerChannelKey === customerId) return customerChannel;
    if (customerChannel) client.removeChannel(customerChannel);
    customerChannelKey = customerId;
    customerChannel = client.channel(`customer-orders-${customerId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `customer_id=eq.${customerId}` }, payload => customerOrderCallback?.(payload))
      .subscribe(status => { if (status === 'SUBSCRIBED') customerOrderCallback?.({ eventType: 'SYNC' }); });
    return customerChannel;
  }

  function subscribeVendor(truckId, callback) {
    if (!client || !truckId || typeof client.channel !== 'function') return null;
    vendorOrderCallback = callback;
    if (vendorChannel && vendorChannelKey === truckId) return vendorChannel;
    if (vendorChannel) client.removeChannel(vendorChannel);
    vendorChannelKey = truckId;
    vendorChannel = client.channel(`vendor-orders-${truckId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `truck_id=eq.${truckId}` }, payload => vendorOrderCallback?.(payload))
      .subscribe(status => { if (status === 'SUBSCRIBED') vendorOrderCallback?.({ eventType: 'SYNC' }); });
    return vendorChannel;
  }

  function subscribeCustomerCommunications(customerId, callback) {
    if (!client || !customerId || typeof client.channel !== 'function') return null;
    if (customerCommunicationChannel) client.removeChannel(customerCommunicationChannel);
    customerCommunicationChannel = client.channel(`customer-communications-${customerId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customer_notifications', filter: `customer_id=eq.${customerId}` }, callback)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_messages' }, callback)
      .subscribe();
    return customerCommunicationChannel;
  }

  function subscribeVendorCommunications(truckId, callback) {
    if (!client || !truckId || typeof client.channel !== 'function') return null;
    if (vendorCommunicationChannel) client.removeChannel(vendorCommunicationChannel);
    vendorCommunicationChannel = client.channel(`vendor-communications-${truckId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_messages' }, callback)
      .subscribe();
    return vendorCommunicationChannel;
  }

  window.FoodTrekNowLiveOrders = Object.freeze({
    available: Boolean(client),
    placeOrder,
    placeVendorCashSale,
    loadCustomerOrders,
    loadVendorOrders,
    updateVendorStatus,
    setVendorOrderArchived,
    cancelCustomerOrder,
    loadOrderConversation,
    loadVendorMessages,
    sendOrderMessage,
    markOrderMessagesRead,
    reportContent,
    setUserBlocked,
    openReportDialog,
    loadCustomerNotifications,
    markCustomerNotificationsRead,
    subscribeCustomer,
    subscribeVendor,
    subscribeCustomerCommunications,
    subscribeVendorCommunications
  });
})();
