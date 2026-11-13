(function exposeAdminDirectMessaging() {
  'use strict';

  const client = window.FoodTrekNowSupabaseClient;
  const clean = value => String(value || '').trim();
  const fail = (error, fallback) => new Error(clean(error?.message) || fallback);

  window.FoodTrekNowAdminDirectMessaging = Object.freeze({
    available: Boolean(client),
    async loadAdminThread(participantId, audienceRole) {
      if (!client) throw new Error('Direct messaging is unavailable.');
      const { data, error } = await client.rpc('admin_direct_message_thread', {
        p_participant_id: participantId,
        p_audience_role: audienceRole
      });
      if (error) throw fail(error, 'The conversation could not be loaded.');
      return data || { threadId: null, audienceRole, messages: [] };
    },
    async sendFromAdmin(participantId, audienceRole, body) {
      const message = clean(body);
      if (!message || message.length > 2000) throw new Error('Enter a message between 1 and 2,000 characters.');
      const { data, error } = await client.rpc('admin_send_direct_message', {
        p_participant_id: participantId,
        p_audience_role: audienceRole,
        p_body: message
      });
      if (error) throw fail(error, 'The direct message could not be sent.');
      return data;
    },
    async loadMine() {
      if (!client) return [];
      const { data, error } = await client.rpc('my_admin_direct_threads');
      if (error) throw fail(error, 'FoodTrekNow messages could not be loaded.');
      return Array.isArray(data) ? data : [];
    },
    async reply(threadId, body) {
      const message = clean(body);
      if (!message || message.length > 2000) throw new Error('Enter a message between 1 and 2,000 characters.');
      const { data, error } = await client.rpc('account_reply_to_admin', { p_thread_id: threadId, p_body: message });
      if (error) throw fail(error, 'Your reply could not be sent.');
      return data;
    },
    async markRead(threadId) {
      const { error } = await client.rpc('mark_admin_direct_thread_read', { p_thread_id: threadId });
      if (error) throw fail(error, 'The conversation could not be marked as read.');
    }
  });
})();
