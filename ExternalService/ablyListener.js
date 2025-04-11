// ablyListener.js
const Ably = require('ably');
const ticketAssociationService = require('../services/ticketAssociationService');
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
async function setAblyTicketChatListener(ticketId) {
  if (subscribedChannels.has(ticketId)) return; // already subscribed
  subscribedChannels.add(ticketId);
  console.log('✅ Setting Ably ticket chat listener for ticket', ticketId);
  const ticketChannel = ably.channels.get(`ticket:${ticketId}`);
  const handleMessage = async (msg) => {
    console.log(msg);
    const msgData = typeof msg.data === 'string' ? JSON.parse(msg.data) : msg.data;
    /*
    this is the incomming message format
    text: newMessage,
                extras: {
                    sender: currentUserRef.current,
                    senderName: displayName,
                    senderId: currentUserRef.current,
                    isCustomer: false,
                    type: isInternalNote ? "internal_note" : "message",
                    // Initialize readBy with just the sender and timestamp
                    readBy: [{
                        userId: currentUserRef.current,
                        name: displayName,
                        readAt: new Date().toISOString()
                    }],
                    timestamp: new Date().toISOString()
                }
                    */

    const {
      sessionId: msgSessionId,
      customerId,
      ticketId,
      text,
    } = msgData;
    const {
      sender,
      senderName,
      senderId,
      isCustomer,
      type,
    } = msgData.extras;
    console.log('✅ Handling incoming chat message', msgSessionId, customerId, text, source, ticketId);
  }
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
