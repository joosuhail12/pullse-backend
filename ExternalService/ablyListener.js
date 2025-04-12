// ablyListener.js
const Ably = require('ably');
const ticketAssociationService = require('../services/ticketAssociationService');
const ConversationEventConsumer = require('../Events/ConversationEvent/ConversationEventConsumer');
const ConversationEventPublisher = require('../Events/ConversationEvent/ConversationEventPublisher');
const { ABLY_API_KEY } = process.env;

const ably = new Ably.Realtime({ key: ABLY_API_KEY });

/**
 * Starts Ably listeners for:
 * 1. Visitor channel
 * 2. Customer channel
 * 3. Specific ticket channel (agent-facing)
 */

const subscribedChannels = new Set();
// set ably ticket chat listener
async function setAblyTicketChatListener(ticketId, clientId, workspaceId) {
  if (subscribedChannels.has(ticketId)) return; // already subscribed
  subscribedChannels.add(ticketId);
  console.log('✅ Setting Ably ticket chat listener for ticket', ticketId);
  const ticketChannel = ably.channels.get(`ticket:${ticketId}`);
  const handleMessage = async (msg) => {
    console.log(msg);
    const msgData = typeof msg.data === 'string' ? JSON.parse(msg.data) : msg.data;

    const {
      text,
      senderId,
      type,
    } = msgData;

    console.log('✅ Handling incoming chat message', text, senderId, isCustomer, type, ticketId);
    //save this msg to conversations table
    const { data, error } = await supabase
      .from('conversations')
      .insert({
        message: text,
        createdBy: senderId,
        type: 'chat',
        ticketId: ticketId,
        userType: type === 'agent' ? 'agent' : 'internal-note',
        clientId: clientId,
        workspaceId: workspaceId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    if (error) throw error;
    console.log('✅ Message saved to conversations table', data);
  }
  const publisher = new ConversationEventPublisher();
  await publisher.created(text, updatedTicket, false);
  


  ticketChannel.subscribe('message', (msg) => handleMessage(msg, 'ticket'));
}

async function startAblyListener() {
  console.log('✅ Ably listener started for chat widget + ticket channel');

  const sessionId = 'session_abc123'; // replace with actual session tracking
  const ticketId = 'da74508d-1e54-4e15-87fa-5808b5596894'; // test ticket ID

  const visitorChannel = ably.channels.get(`visitor:${sessionId}`);
  const customerChannel = ably.channels.get(`customer:${sessionId}`);
  const ticketChannel = ably.channels.get(`ticket:${ticketId}`);

  const handleMessage = async (msg, channelType = 'visitor') => {
    try {
      const msgData = typeof msg.data === 'string' ? JSON.parse(msg.data) : msg.data;

      const {
        sessionId: msgSessionId,
        customerId,
        ticketId,
        text,
        source = channelType === 'ticket' ? 'agent' : channelType
      } = msgData;
      console.log('✅ Handling incoming chat message', msgSessionId, customerId, text, source, ticketId);
      const result = await ticketAssociationService.handleIncomingChatMessage({
        sessionId: msgSessionId,
        customerId,
        text,
        source,
        ticketId,
        widgetKey: 'chat',
      });


      console.log(`✅ Message handled for ticket ${result.ticketId}`);
    } catch (err) {
      console.error('❌ Error handling Ably message:', err);
    }
  };

  // Subscribe to visitor messages
  visitorChannel.subscribe('new_message', (msg) => handleMessage(msg, 'visitor'));

  // Subscribe to customer messages
  customerChannel.subscribe('new_message', (msg) => handleMessage(msg, 'customer'));

  // Subscribe to ticket messages (agent panel)
  ticketChannel.subscribe('new_message', (msg) => handleMessage(msg, 'ticket'));
}

module.exports = { startAblyListener, setAblyTicketChatListener };
