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
    const publisher = new ConversationEventPublisher();
    await publisher.created(text, updatedTicket, false);
  }



  ticketChannel.subscribe('message', (msg) => handleMessage(msg, 'ticket'));
}

// create a function to handle the message from the widget:contactevent:sessionId
async function handleWidgetContactEvent(sessionId, clientId, workspaceId) {
  console.log('✅ Handling widget contact event', sessionId, clientId, workspaceId);
  const contactEventChannel = ably.channels.get(`widget:contactevent:${sessionId}`);
  contactEventChannel.subscribe('new_ticket', (msg) => handleMessage(msg, 'contact'));
  const handleMessage = async (msg) => {
    const msgData = typeof msg.data === 'string' ? JSON.parse(msg.data) : msg.data;
    const {
      text,
      sender,
      sessionId,
    } = msgData;
    //get customerId from sessionId
    const { data: sessionData, error: sessionError } = await supabase
      .from('widgetsessions')
      .eq('id', sessionId);
    if (sessionError) throw sessionError;
    const customerId = sessionData[0].contactId;
    //also get the welcomeMessage from the widgettheme table
    const { data: widgetThemeData, error: widgetThemeError } = await supabase
      .from('widgetthemes')
      // you need to get the widgetId from the sessionData[0].widgetId, and then map the
      .eq('widgetId', sessionData[0].widgetId);
    if (widgetThemeError) throw widgetThemeError;
    const welcomeMessage = widgetThemeData[0].labels.welcomeMessage;
    // and now also save this welcomeMessage to the conversations table
    const { data: welcomeMessageData, error: welcomeMessageError } = await supabase
      .from('conversations')
      .insert({
        message: welcomeMessage,
        createdBy: customerId || null,
        type: 'chat',
        ticketId: null,
        userType: 'agent',
        clientId: sessionData[0].clientId,
        workspaceId: sessionData[0].workspaceId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    if (welcomeMessageError) throw welcomeMessageError;
    console.log('✅ Welcome message saved to conversations table', welcomeMessageData);
    //save this msg to conversations table
    const { data, error } = await supabase
      .from('conversations')
      .insert({
        message: text,
        createdBy: customerId || null,
        type: 'chat',
        ticketId: null,
        userType: 'customer',
        clientId: customerData[0].clientId,
        workspaceId: customerData[0].workspaceId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    if (error) throw error;
    console.log('✅ Message saved to conversations table', data);
    //publish this message to the customer queue event rabbit
    const publisher = new ConversationEventPublisher();
    await publisher.created(text, updatedTicket, true);
    // get a teamId from the teamChannels table in which using the channelId to map to channel name that is chat
    const { data: channelData, error: channelError } = await supabase
      .from('channels')
      .select('id')
      .eq('name', 'chat');
    if (channelError) throw channelError;
    const channelId = channelData[0].id;
    const { data: teamData, error: teamError } = await supabase
      .from('teamChannels')
      .select('teamId')
      .eq('channelId', channelId);
    if (teamError) throw teamError;
    const teamId = teamData[0].teamId;
    //     // craete a new ticket in the database
    const { data: newTicket, error: newTicketError } = await supabase
      .from('tickets')
      .insert({
        customerId: customerId,
        clientId: sessionData[0].clientId,
        workspaceId: sessionData[0].workspaceId,
        lastMessage: text,
        teamId: teamId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),

      });
    if (newTicketError) throw newTicketError;
    console.log('✅ New ticket created', newTicket);
    // now end ticket id to the same channel with new_ticket_reply event
    contactEventChannel.publish('new_ticket_reply', {
      ticketId: newTicket[0].id,
    });
  }
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

module.exports = { startAblyListener, setAblyTicketChatListener, handleWidgetContactEvent };
