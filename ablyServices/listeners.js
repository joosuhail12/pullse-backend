const { handleNewTicket } = require('./ticket');
const Ably = require('ably');
const { createClient } = require('@supabase/supabase-js');
const ably = new Ably.Realtime(process.env.ABLY_API_KEY);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const widgetSessionSubscriptions = new Set();


const ticketChannelSubscriptions = new Set();
const conversationChannelSubscriptions = new Set();

exports.initializeWidgetSession = function initializeWidgetSession(sessionId, clientId, workspaceId) {
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
    } catch (e) {
      console.error('[listeners] ticket create failed', e);
    }
  });
};

exports.subscribeToConversationChannels = function subscribeToConversationChannels(ticketId, sessionId) {
  const key = `conversation:${ticketId}`;
  if (conversationChannelSubscriptions.has(key)) return;
  conversationChannelSubscriptions.add(key);

  const widgetCh = ably.channels.get(`widget:conversation:ticket-${ticketId}`);
  widgetCh.subscribe('message', m =>
    require('./routing').handleWidgetConversationEvent(ticketId, m.data, sessionId, ticketChannelSubscriptions)
  );
  widgetCh.subscribe('user_action', async msg => {
    require('./routing').handleUserAction(ticketId, msg.data, sessionId);
  });

  const agentCh = ably.channels.get(`agent-conversation:${ticketId}`);
  agentCh.subscribe(m =>
    require('./routing').handleAgentConversationEvent(ticketId, m.data)
  );
};


exports.subscribeToTicketChannels = function subscribeToTicketChannels(ticketId, clientId, workspaceId, sessionId, userId) {
  const key = `ticket:${ticketId}`;
  if (ticketChannelSubscriptions.has(key)) return;
  ticketChannelSubscriptions.add(key);

  const ticketCh = ably.channels.get(`ticket:${ticketId}`);
  ticketCh.subscribe('message', m =>
    require('./routing').handleTicketMessage(ticketId, m.data, clientId, workspaceId, sessionId, userId)
  );
};
