// ablyListener.js
const Ably = require('ably');
const ticketAssociationService = require('../services/ticketAssociationService');
const ConversationEventConsumer = require('../Events/ConversationEvent/ConversationEventConsumer');
const ConversationEventPublisher = require('../Events/ConversationEvent/ConversationEventPublisher');
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
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
const safeUUID = (val) => typeof val === 'string' && /^[0-9a-f-]{36}$/i.test(val) ? val : null;


const handleMessage = async (msg, ticketId = null) => {
  try {
    const msgData = typeof msg.data === 'string' ? JSON.parse(msg.data) : msg.data;
    const { text, sender, sessionId } = msgData;


    // Get session info

    console.log('👤 Session:', sessionId);
    const { data: sessionData, error: sessionError } = await supabase
      .from('widgetsessions')
      .select('*')
      .eq('id', sessionId);
    console.log('👤 Session data:', sessionData);
    if (sessionError) throw sessionError;
    if (!sessionData || !sessionData[0]) throw new Error('No session data found');

    const session = sessionData[0];
    const customerId = safeUUID(session.contactId);
    const clientId = safeUUID(session.clientId);
    const workspaceId = safeUUID(session.workspaceId);

    // Get welcome message
    const { data: widgetThemeData, error: widgetThemeError } = await supabase
      .from('widgettheme')
      .select('*')
      .eq('widgetId', session.widgetId)
      .single();
    console.log('👤 Widget theme data:', widgetThemeData);
    if (widgetThemeError) throw widgetThemeError;
    if (!widgetThemeData) throw new Error('No widget theme found');

    const welcomeMessage = widgetThemeData.labels?.welcomeMessage || 'Hello!';

    // Get channel -> team
    const { data: channelData, error: channelError } = await supabase
      .from('channels')
      .select('id')
      .eq('name', 'chat')
      .single();
    if (channelError) throw channelError;
    if (!channelData?.id) throw new Error('Channel ID not found');
    console.log('👤 Channel data:', channelData);
    const channelId = channelData.id;

    const { data: teamData, error: teamError } = await supabase
      .from('teamChannels')
      .select('teamId')
      .eq('channelId', channelId);
    if (teamError) throw teamError;
    if (!teamData?.[0]?.teamId) throw new Error('Team ID not found');
    console.log('👤 Team data:', teamData);
    const teamId = safeUUID(teamData[0].teamId);

    // Create new ticket
    const { data: newTicket, error: newTicketError } = await supabase
      .from('tickets')
      .insert({
        customerId,
        clientId,
        workspaceId,
        lastMessage: text,
        teamId,
        title: text,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .select();

    if (newTicketError) throw newTicketError;
    if (!newTicket?.[0]?.id) throw new Error('Ticket insert failed');
    console.log('🎟 New ticket created:', newTicket);
    const newTicketId = newTicket[0].id;

    // Save welcome message
    const { error: welcomeMessageError } = await supabase
      .from('conversations')
      .insert({
        message: welcomeMessage,
        createdBy: customerId,
        type: 'chat',
        ticketId: newTicketId,
        userType: 'agent',
        clientId,
        workspaceId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    if (welcomeMessageError) throw welcomeMessageError;
    console.log('👤 Welcome message saved:', welcomeMessage);
    // Save user message
    const { error: msgInsertError } = await supabase
      .from('conversations')
      .insert({
        message: text,
        createdBy: customerId,
        type: 'chat',
        ticketId: newTicketId,
        userType: 'customer',
        clientId,
        workspaceId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    if (msgInsertError) throw msgInsertError;
    console.log('👤 User message saved:', text);
    // SAFELY get contactEventChannel again based on sessionId
    const contactEventChannel = ably.channels.get(`widget:contactevent:${sessionId}`);
    await contactEventChannel.publish('new_ticket_reply', {
      ticketId: newTicketId,
    });

    console.log('✅ Contact event reply sent for ticket:', newTicketId);
  } catch (err) {
    console.error('❌ Error inside handleMessage:', err);
  }
};


// create a function to handle the message from the widget:contactevent:sessionId
async function handleWidgetContactEvent(sessionId, clientId, workspaceId) {
  try {
    console.log('✅ Handling widget contact event', sessionId, clientId, workspaceId);

    const contactEventChannel = ably.channels.get(`widget:contactevent:${sessionId}`);

    // Move handleMessage here so it's defined BEFORE usage


    contactEventChannel.subscribe('new_ticket', (msg) => {
      handleMessage(msg).catch(err => {
        console.error('❌ Unhandled async error in new_ticket subscription:', err);
      });
    });
  } catch (error) {
    console.error('❌ Error handling widget contact event', error);
  }
}


// add a customer object to check the already subscribed channels
const customerSubscribedChannels = new Set();
async function handleWidgetConversationEvent(ticketId, clientId, workspaceId) {
  if (customerSubscribedChannels.has(ticketId)) return; // already subscribed
  customerSubscribedChannels.add(ticketId);
  console.log('✅ Handling widget conversation event', ticketId, clientId, workspaceId);
  //widget:conversation:ticket-<ticketId>
  const conversationEventChannel = ably.channels.get(`widget:conversation:ticket-${ticketId}`);
  conversationEventChannel.subscribe('message', (msg) => handleMessage(msg, 'conversation'));
  handleMessage = async (msg) => {
    /*
    Message Body: {
  text: 'Mynameisdev',
  sessionId: 'f09c12e1-6965-4bec-b773-66dd53844ed3',
  ticketId: '28e414e9-11db-446c-93c1-9df968a1dfb2'
} */
    const msgData = typeof msg.data === 'string' ? JSON.parse(msg.data) : msg.data;
    const {
      text,
      sessionId,
      ticketId,
    } = msgData;
    //save this msg to conversations table
    const { data, error } = await supabase
      .from('conversations')
      .insert({
        message: text,
        createdBy: customerId || null,
        type: 'chat',
        ticketId: ticketId,
        userType: 'customer',
        clientId: clientId,
        workspaceId: workspaceId,
        createdAt: new Date().toISOString(),
      });
    if (error) throw error;
    console.log('✅ Message saved to conversations table', data);
    //publish this message to the customer queue event rabbit
    const publisher = new ConversationEventPublisher();
    await publisher.created(text, updatedTicket, false);
    //uppdate the ticket with the lastMessage, lastMessageAt, updatedAt
    const { data: updatedTicket, error: updatedTicketError } = await supabase
      .from('tickets')
      .update({ lastMessage: text, lastMessageAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
      .eq('id', ticketId);
    if (updatedTicketError) throw updatedTicketError;
    console.log('✅ Ticket updated with lastMessage, lastMessageAt, updatedAt', updatedTicket);
    // send this message to the 
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

module.exports = { startAblyListener, setAblyTicketChatListener, handleWidgetContactEvent, handleWidgetConversationEvent };
