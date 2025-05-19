// listeners.js
const { handleNewTicket, initTicket } = require('./ticket.js');
const { handleAgentConversationEvent, handleWidgetConversationEvent } = require('./routing.js');
const Ably = require('ably');
const { createClient } = require('@supabase/supabase-js');

const ABLY_API_KEY = process.env.ABLY_API_KEY;// service role key for full DB access

// Initialize Ably and Supabase clients
const ably = new Ably.Realtime(ABLY_API_KEY);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const widgetSessionSubscriptions = new Set();

// export const init = (depAbly, depSupabase, depInternalService) => {
//   console.log("init")
//   // wire up shared instances
//   // routing.init(supabase, ably, depInternalService);
//   // initTicket(supabase, ably, routing, depInternalService);

//   // channel for completely new tickets (optional)
//   const newTicketCh = ably.channels.get('widget-conversation:new');
//   newTicketCh.subscribe(async (msg) => {
//     const data = msg.data;
//     try {
//       // const ticket = await handleNewTicket({
//       //   workspaceId: data.workspaceId,
//       //   sessionId: data.sessionId,
//       //   firstMessage: data.firstMessage || data.text,
//       //   userType: 'customer',
//       // });

//       // start listening on widget+agent channels for this ticket
//       // subscribeToConversationChannels(ticket.id);
//       console.log('New ticket created & listeners attached:', ticket.id);
//     } catch (err) {
//       console.error('Failed to create ticket:', err);
//     }
//   });

//   console.log('Ably listeners initialised.');
// }

export const initializeWidgetSession = (sessionId, clientId, workspaceId) => {
    try {
  if (widgetSessionSubscriptions.has(sessionId)) return;
  widgetSessionSubscriptions.add(sessionId);

  const contactCh = ably.channels.get(`widget:contactevent:${sessionId}`);

  contactCh.subscribe('new_ticket', async (msg) => {
    try {
      const d = typeof msg.data === 'string' ? JSON.parse(msg.data) : msg.data;
      await handleNewTicket({
        workspaceId,
        sessionId,
        firstMessage: d.text || d.message,
        userType: 'customer',
      });

    } catch (err) {
      console.error('handleNewTicket error:', err);
    }
  });

  console.log(`Listening for new_ticket on session ${sessionId}`);
  } catch (err) {
    console.error(`❌ Error initializing widget session ${sessionId}:`, err);
  }
}

export const subscribeToConversationChannels = (ticketId, sessionId) => {
  const widgetCh = ably.channels.get(`widget:conversation:ticket-${ticketId}`);
  widgetCh.subscribe("message", (msg) =>
    handleWidgetConversationEvent(ticketId, msg.data, sessionId)
  );

  const agentCh = ably.channels.get(`agent-conversation:${ticketId}`);
  agentCh.subscribe((msg) =>
    handleAgentConversationEvent(ticketId, msg.data)
  );

  console.log(`Subscribed to widget & agent channels for ticket ${ticketId}`);
}

// export const setAblyTicketChatListener = (ticketId, clientId, workspaceId, sessionId, userId) => {
//   ticketSubscriptions[ticketId].agent = { sessionId, clientId, workspaceId, userId };
//   console.log('✅ Agent subscribed for ticket', ticketId);

//   const ticketChannel = ably.channels.get(`ticket:${ticketId}`);
//   ticketChannel.subscribe('message', async (msg) => {
//     await handleAgentConversationEvent(ticketId, msg, 'agent');
//   });
// }