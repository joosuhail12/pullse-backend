const Ably = require('ably');
const ticketAssociationService = require('../services/ticketAssociationService');
const ConversationEventPublisher = require('../Events/ConversationEvent/ConversationEventPublisher');
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const { ABLY_API_KEY } = process.env;

const ably = new Ably.Realtime({ key: ABLY_API_KEY });

// Object to map ticketId -> { agent: {...}, customer: {...} }
const ticketSubscriptions = {};
const widgetEventSubscribedChannels = new Set();

const safeUUID = (val) => typeof val === 'string' && /^[0-9a-f-]{36}$/i.test(val) ? val : null;
console.log("ably", ticketSubscriptions, widgetEventSubscribedChannels);
// 🔄 Handles routing logic
async function handleMessageRouting(ticketId, msg, senderType) {
  // const msgData = typeof msg.data === 'string' ? JSON.parse(msg.data) : msg.data;
  // const { text } = msgData;

  // const ticketInfo = ticketSubscriptions[ticketId];
  // if (!ticketInfo || !ticketInfo[senderType]) return;
  // console.log("ticketInfo", ticketInfo, senderType, ticketSubscriptions);
  // const sender = ticketInfo[senderType];
  // const receiverType = senderType === 'agent' ? 'customer' : 'agent';
  // const receiver = ticketInfo[receiverType];
  // console.log("sender", sender, "receiver", receiver);
  // // Get proper sender name from msgData if available
  // const senderName = msgData.senderName || sender.clientId;

  // // Save to conversations with senderName
  // await supabase.from('conversations').insert({
  //   message: text,
  //   createdBy: sender.clientId,
  //   type: 'chat',
  //   ticketId,
  //   userType: senderType,
  //   senderName: senderName, // Add this!
  //   clientId: sender.clientId,
  //   workspaceId: sender.workspaceId,
  //   createdAt: new Date().toISOString(),
  //   updatedAt: new Date().toISOString(),
  // });

  // console.log("🔄 Saved conversation:", {
  //   message: text,
  //   createdBy: sender.clientId,
  //   type: 'chat',
  //   ticketId,
  //   userType: senderType,
  //   senderName: senderName,
  //   clientId: sender.clientId,
  //   workspaceId: sender.workspaceId,
  //   createdAt: new Date().toISOString(),
  //   updatedAt: new Date().toISOString(),
  // });

  // // Update ticket
  // const { data, error } = await supabase
  //   .from('tickets')
  //   .update({
  //     lastMessage: text,
  //     lastMessageAt: new Date().toISOString(),
  //     updatedAt: new Date().toISOString(),
  //   })
  //   .eq('id', ticketId)
  //   .select();

  // let targetEvent = 'message';
  // let channelName = `ticket:${ticketId}`;
  // if (!receiver) {
  //   targetEvent = 'notification';
  //   console.log("senderType", senderType);
  //   if (senderType === 'customer') {
  //     // Agent is not subscribed
  //     // Notify the agent tool
  //     const channelName = `agent:notifications:${data[0].teamId}`;
  //     const channel = ably.channels.get(channelName);
  //     await channel.publish('notification', {
  //       ticketId,
  //       text,
  //       from: 'customer',
  //       to: 'agent',
  //       sessionId: sender.sessionId,
  //     });

  //     console.log(`📨 Sent agent notification for agent:notifications:${data[0].teamId}`);

  //   } else {
  //     // Customer is not subscribed
  //     const customerSessionId = ticketInfo.customer?.sessionId;
  //     if (!customerSessionId) {
  //       console.warn(`⚠️ No customer session found to send notification`);
  //       return;
  //     }

  //     channelName = `widget:notifications:${customerSessionId}`;
  //   }
  // }

  // if (receiverType === 'customer') {
  //   channelName = `widget:conversation:ticket-${ticketId}`;
  //   targetEvent = 'message_reply';
  //   const channel = ably.channels.get(channelName);
  //   await channel.publish(targetEvent, {
  //     ticketId,
  //     text,
  //     from: senderType,
  //     to: receiverType,
  //     sessionId: sender.sessionId,
  //   });
  // }
  // else {
  //   const channel = ably.channels.get(channelName);
  //   await channel.publish(targetEvent, {
  //     // ticketId,
  //     // text,
  //     // extras: {
  //     //   sender: "Customer",
  //     //   type: targetEvent,
  //     //   isCustomer: senderType === 'customer'
  //     // },
  //     // new changes for introducing senderName
  //     ticketId,
  //     text,
  //     extras: {
  //       sender: senderType === 'customer' ? "Customer" : sender.clientId,
  //       senderName: msgData.senderName || sender.clientId, // Add actual name
  //       type: targetEvent,
  //       isCustomer: senderType === 'customer'
  //     },
  //     to: receiverType,
  //     sessionId: sender.sessionId,
  //   });
  // }

  // console.log(`📨 Sent ${targetEvent} to ${channelName}`);
}

// ✅ AGENT-SIDE: Ticket chat listener
async function setAblyTicketChatListener(ticketId, clientId, workspaceId, sessionId, userId) {
  // save user id in ticketSubscriptions, 
  // if the same user is subscribed to the same ticket
  // if (ticketSubscriptions[ticketId] && ticketSubscriptions[ticketId].userId === userId) {
  //   delete ticketSubscriptions[ticketId];
  // }
  // // if the same user is subscribed to any other ticket, then delete the previous subscription
  // if (ticketSubscriptions[ticketId]) {
  //   delete ticketSubscriptions[ticketId];
  // }
  // if (!ticketSubscriptions[ticketId]) ticketSubscriptions[ticketId] = {};
  // if (ticketSubscriptions[ticketId].agent) return;
  // ticketSubscriptions[ticketId].agent = { sessionId, clientId, workspaceId, userId };
  // console.log('✅ Agent subscribed for ticket', ticketId);

  // const ticketChannel = ably.channels.get(`ticket:${ticketId}`);
  // ticketChannel.subscribe('message', async (msg) => {
  //   await handleMessageRouting(ticketId, msg, 'agent');
  // });
}

// ✅ CUSTOMER-SIDE: Widget conversation listener
async function handleWidgetConversationEvent(ticketId, clientId, workspaceId, sessionId) {
  // if (!ticketSubscriptions[ticketId]) ticketSubscriptions[ticketId] = {};
  // if (ticketSubscriptions[ticketId].customer) return;

  // ticketSubscriptions[ticketId].customer = { sessionId, clientId, workspaceId };
  // console.log('✅ Customer subscribed for ticket', ticketId);

  // const channel = ably.channels.get(`widget:conversation:ticket-${ticketId}`);
  // channel.subscribe('message', async (msg) => {
  //   //handle message using ai
  //   // push this message to document-qa channel
  //   // and subscribe to the document-qa-results channel to get the response
  //   // send the response back to the widget
  //   const { text } = msg.data;
  //   const { data, error } = await supabase
  //     .from('conversations')
  //     .insert({
  //       message: text,
  //       createdBy: 'customer',  
  //       type: 'chat',
  //       ticketId,
  //       userType: 'customer',
  //       clientId,
  //       workspaceId,
  //       createdAt: new Date().toISOString(),
  //       updatedAt: new Date().toISOString(),
  //     });
  //   console.log("ticketId", data, text);
  //   const documentQaChannel = ably.channels.get(`document-qa`);
  //   // send this message to document-qa channel
  //   documentQaChannel.publish('message', {
  //     "id":ticketId,
  //     "query":text,
  //   });
  //   console.log("message sent to document-qa channel", ticketId, text);
  //   // subscribe to the document-qa-results channel to get the response
  //   const documentQaResultsChannel = ably.channels.get(`document-qa-results`);
  //   documentQaResultsChannel.subscribe('message', async (msg) => {
  //     const { text } = msg.data;
  //     console.log("message received from document-qa-results channel", msg);
  //     // send this response back to the widget  
  //     // await handleMessageRouting(ticketId, msg, 'customer');
  //     const channel = ably.channels.get(`widget:conversation:ticket-${ticketId}`);
  //     channel.publish('message_reply', {
  //       ticketId,
  //       text,
  //       from: 'customer',
  //       to: 'agent',
  //       sessionId: sender.sessionId,
  //     });
  //   });
  // });
}

// ✅ CUSTOMER-SIDE: Widget contact event listener
async function handleWidgetContactEvent(sessionId, clientId, workspaceId) {
  // if (widgetEventSubscribedChannels.has(sessionId)) return;
  // widgetEventSubscribedChannels.add(sessionId);

  // console.log('✅ Handling widget contact event', sessionId, clientId, workspaceId);
  // const contactEventChannel = ably.channels.get(`widget:contactevent:${sessionId}`);

  // contactEventChannel.subscribe('new_ticket', (msg) => {
  //   handleNewTicket(msg, sessionId).catch(err => {
  //     console.error('❌ Error in new_ticket:', err);
  //   });
  // });
}

// 🛠️ Ticket creation handler
async function handleNewTicket(msg, sessionId) {
  // try {
  //   const msgData = typeof msg.data === 'string' ? JSON.parse(msg.data) : msg.data;
  //   const { text, sender } = msgData;

  //   const { data: sessionData, error: sessionError } = await supabase
  //     .from('widgetsessions')
  //     .select('*')
  //     .eq('id', sessionId);

  //   if (sessionError || !sessionData[0]) throw sessionError || new Error('No session found');

  //   const session = sessionData[0];
  //   const customerId = safeUUID(session.contactId);
  //   const clientId = safeUUID(session.clientId);
  //   const workspaceId = safeUUID(session.workspaceId);
  //   const deviceId = safeUUID(session.contactDeviceId);

  //   const { data: channelData } = await supabase
  //     .from('channels')
  //     .select('id')
  //     .eq('name', 'chat')
  //     .single();

  //   const { data: teamData } = await supabase
  //     .from('teamChannels')
  //     .select('teamId')
  //     .eq('channelId', channelData.id);

  //   const teamId = safeUUID(teamData?.[0]?.teamId);

  //   const { data: ticketResult } = await supabase
  //     .from('tickets')
  //     .insert({
  //       customerId,
  //       clientId,
  //       workspaceId,
  //       lastMessage: text,
  //       teamId,
  //       title: text,
  //       deviceId,
  //       createdAt: new Date().toISOString(),
  //       updatedAt: new Date().toISOString(),
  //     })
  //     .select();

  //   const newTicketId = ticketResult?.[0]?.id;
  //   if (!newTicketId) throw new Error('Ticket creation failed');

  //   const { data: widgetTheme } = await supabase
  //     .from('widgettheme')
  //     .select('*')
  //     .eq('widgetId', session.widgetId)
  //     .single();

  //   const welcomeMessage = widgetTheme.labels?.welcomeMessage || 'Hello!';

  //   await supabase.from('conversations').insert([
  //     {
  //       message: welcomeMessage,
  //       createdBy: customerId,
  //       type: 'chat',
  //       ticketId: newTicketId,
  //       userType: 'agent',
  //       clientId,
  //       workspaceId,
  //       createdAt: new Date().toISOString(),
  //       updatedAt: new Date().toISOString(),
  //     },
  //     {
  //       message: text,
  //       createdBy: customerId,
  //       type: 'chat',
  //       ticketId: newTicketId,
  //       userType: 'customer',
  //       clientId,
  //       workspaceId,
  //       createdAt: new Date().toISOString(),
  //       updatedAt: new Date().toISOString(),
  //     }
  //   ]);

  //   const channel = ably.channels.get(`widget:contactevent:${sessionId}`);
  //   await channel.publish('new_ticket_reply', { ticketId: newTicketId });
  //   sendNewTicketNotification(newTicketId, teamId);
  //   console.log('✅ New ticket created and messages published:', newTicketId);
  // } catch (err) {
  //   console.error('❌ Error inside handleNewTicket:', err);
  // }
}
// 🛠️ Send new ticket notification to agent 
async function sendNewTicketNotification(ticketId, teamId) {
  try {
    const channel = ably.channels.get(`agent:notifications:${teamId}`);
    await channel.publish('new_ticket', { ticketId: ticketId });
    console.log('✅ New ticket notification sent to agent:', ticketId);
  } catch (err) {
    console.error('❌ Error inside sendNewTicketNotification:', err);
  }
}
// ✅ Optional: test listener for demo/dev
async function startAblyListener() {
  console.log('🟢 Ably listener started');

  const sessionId = 'test_session';
  const ticketId = 'test_ticket_id';

  const visitorChannel = ably.channels.get(`visitor:${sessionId}`);
  const customerChannel = ably.channels.get(`customer:${sessionId}`);
  const ticketChannel = ably.channels.get(`ticket:${ticketId}`);

  const logHandler = async (msg, type = 'visitor') => {
    const msgData = typeof msg.data === 'string' ? JSON.parse(msg.data) : msg.data;
    const {
      sessionId: msgSessionId,
      customerId,
      ticketId,
      text,
      source = type === 'ticket' ? 'agent' : type
    } = msgData;

    const result = await ticketAssociationService.handleIncomingChatMessage({
      sessionId: msgSessionId,
      customerId,
      text,
      source,
      ticketId,
      widgetKey: 'chat',
    });

    console.log(`✅ Message handled for ticket ${result.ticketId}`);
  };

  visitorChannel.subscribe('new_message', (msg) => logHandler(msg, 'visitor'));
  customerChannel.subscribe('new_message', (msg) => logHandler(msg, 'customer'));
  ticketChannel.subscribe('new_message', (msg) => logHandler(msg, 'ticket'));
}

module.exports = {
  startAblyListener,
  setAblyTicketChatListener,
  handleWidgetContactEvent,
  handleWidgetConversationEvent,
};
