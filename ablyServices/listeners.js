const { handleNewTicket } = require('./ticket');
const Ably = require('ably');
const { createClient } = require('@supabase/supabase-js');
const ably = new Ably.Realtime(process.env.ABLY_API_KEY);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const widgetSessionSubscriptions = new Set();

exports.initializeWidgetSession = function initializeWidgetSession (sessionId, clientId, workspaceId) {
  if (widgetSessionSubscriptions.has(sessionId)) return;
  widgetSessionSubscriptions.add(sessionId);

  const ch = ably.channels.get(`widget:contactevent:${sessionId}`);
  ch.subscribe('new_ticket', async msg => {
    const d = typeof msg.data === 'string' ? JSON.parse(msg.data) : msg.data;
    try {
      const ticket = await handleNewTicket({
        workspaceId,
        sessionId,
        firstMessage: d.text || d.message,
        userType: 'customer'
      });
      console.log('[listeners] ticket created', ticket.id);
    } catch (e) {
      console.error('[listeners] ticket create failed', e);
    }
  });
  console.log(`[Ably] subscribed widget session ${sessionId}`);
};

exports.subscribeToConversationChannels = function subscribeToConversationChannels (ticketId, sessionId) {
  const widgetCh = ably.channels.get(`widget:conversation:ticket-${ticketId}`);
  widgetCh.subscribe('message', m =>
    require('./routing').handleWidgetConversationEvent(ticketId, m.data, sessionId)
  );

  const agentCh = ably.channels.get(`agent-conversation:${ticketId}`);
  agentCh.subscribe(m =>
    require('./routing').handleAgentConversationEvent(ticketId, m.data)
  );
};