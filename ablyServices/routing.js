// routing.js
const { safeUUID } = require('./utils.js');
const { createClient } = require('@supabase/supabase-js');
const Ably = require('ably');
const InternalService = require('./internalService.js');
const { ensureQaSubscription } = require('./qaSubscriptions.js');
const { createAndBroadcast } = require('./notificationsService.js');
const channelManager = require('./channelManager');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const ably = new Ably.Realtime(process.env.ABLY_API_KEY);
/** Initialize dependencies for routing module */
let internalService;
function init(depInternalService) {
  internalService = depInternalService;
}

/**
 * Handle incoming message from the user widget.
 * This will persist the message, forward it to agents, and trigger AI if enabled.
 */
const handleWidgetConversationEvent = async (ticketId, messageData, sessionId, channelManagerInstance) => {
  const internalService = new InternalService();
  try {
    // Validate ticketId format
    if (!safeUUID(ticketId)) {
      console.warn(`Received message for invalid ticketId: ${ticketId}`);
      return;
    }

    const userText = messageData.text || messageData.content;  // assuming messageData carries the text under .text or .content
    if (!userText) return;  // ignore empty message

    // Fetch ticket info from DB (to get aiEnabled flag, assigned agent, etc.)
    const { data: tickets, error: ticketErr } = await supabase
      .from('tickets')
      .select('id, aiEnabled, assigneeId, customers: customerId(id, firstname, lastname, email), clientId, workspaceId, users: assigneeId(id, fName, lName, clientId, defaultWorkspaceId)')
      .eq('id', ticketId)
      .limit(1);
    const ticket = tickets ? tickets[0] : null;
    const assignee = ticket.users ? ticket.users[0] : null;
    if (ticketErr || !ticket) {
      console.error('Ticket lookup failed or ticket not found:', ticketErr || ticketId);
      return;
    }

    // 1. Persist the user's message in Supabase
    // const messageRecord = {
    //   ticketId: ticketId,
    //   senderType: 'customer',
    //   content: userText,
    //   timestamp: new Date().toISOString()
    // };
    // await supabase.from('messages').insert(messageRecord);
    internalService.saveConversation(ticketId, userText, ticket.customers.id, 'customer', ticket.customers.firstname + " " + ticket.customers.lastname, ticket.clientId, ticket.workspaceId, "chat", messageData.attachmentType ? messageData.attachmentType : null, messageData.attachmentUrl ? messageData.attachmentUrl : null);

    // if (conversationId) {
    //   internalService.updateConversationMessage(conversationId, userText);
    // }

    // 2. Forward the message to the agent's channel so any online agent clients receive it
    const agentChannel = ably.channels.get(`agent-conversation:${ticketId}`);
    // agentChannel.publish('message', { content: userText, ticketId }, err => {
    //   if (err) console.error('Failed to forward message to agent channel:', err);
    // });

    // 3. If the ticket is AI-enabled, also forward the message to the AI (document-qa) service.
    if (ticket.aiEnabled && userText?.trim()) {

      ensureQaSubscription(ticketId, sessionId);
      const qaCh = ably.channels.get(`document-qa`);
      qaCh.publish('message', { query: userText, id: ticketId, clientId: ticket.clientId });
    } else {
      // Check if there are active ticket channel subscriptions using channel manager
      const ticketSubscriptions = await channelManagerInstance.getChannelSubscriptions(`ticket:${ticketId}`);

      if (ticketSubscriptions && ticketSubscriptions.length > 0) {
        const ticketChannel = ably.channels.get(`ticket:${ticketId}`);
        const message = {
          id: ticketId,
          content: userText,
          sender: {
            avatar: "",
            name: ticket.customers.firstname + " " + ticket.customers.lastname,
          },
          timestamp: new Date().toISOString(),
          isCustomer: true,
          type: 'customer',
          readBy: []
        }
        ticketChannel.publish('message', message, err => {
          if (err) console.error('Failed to publish agent message to widget channel:', err);
        });
      } else {
        const { data: tickets, error: ticketErr } = await supabase
          .from('tickets')
          .select('id, aiEnabled, assigneeId, customers: customerId(id, firstname, lastname, email), clientId, workspaceId, users: assigneeId(id, fName, lName, clientId, defaultWorkspaceId), teamId')
          .eq('id', ticketId)
          .limit(1);
        const { data: teamMembers, error: teamMembersError } = await supabase
          .from('teamMembers')
          .select('user_id')
          .eq('team_id', tickets[0].teamId);
        const ticket = tickets ? tickets[0] : null;
        const assignee = teamMembers ? teamMembers.map(member => member.user_id) : null;
        // await createAndBroadcast({
        //   type: 'NEW_MESSAGE',
        //   entityId: ticketId,
        //   actorId: ticket.customers.id,
        //   recipientIds: assignee,
        //   payload: { title: userText, routingType: 'new_response' },
        // });
      }
    }

    // 4. Offline agent notification: if no agent is currently online for this ticket, notify via internal service.
    // (For example, send an email or push notification to the support team or assigned agent.)
    const agentId = ticket.assigneeId;
    const agentOnline = agentId ? internalService.isAgentOnline(agentId) : internalService.isAnyAgentOnline(ticketId);
    // if (!agentOnline) {
    //   if (agentId) {
    //     internalService.notifyAgentOffline(agentId, ticketId, userText);
    //   } else {
    //     internalService.notifyAgentTeam(ticketId, userText);
    //   }
    //   // The internalService could handle sending an email/SMS to the assigned agent or on-call team.
    // }
  } catch (err) {
    console.error('Error in handleWidgetConversationEvent:', err);
  }
}

/**
 * Handle incoming message from an agent.
 * Persists the message, forwards it to the user's widget, and handles ticket updates and offline user notification.
 */
const handleAgentConversationEvent = async (ticketId, messageData) => {

  const internalService = new InternalService();
  try {
    if (!safeUUID(ticketId)) {
      console.warn(`Received agent message for invalid ticketId: ${ticketId}`);
      return;
    }
    const agentText = messageData.text || messageData.content;
    if (!agentText) return;

    // Optionally determine agent identity (if provided via message or Ably clientId)
    const agentId = messageData.agentId || messageData.senderId || messageData.agent_id || null;
    // (Alternatively, if the Ably client publishing had a clientId set to agent's ID, we could get it from messageData.clientId if available.)

    // Persist agent's message in Supabase
    const messageRecord = {
      ticket_id: ticketId,
      sender_type: 'agent',
      content: agentText,
      timestamp: new Date().toISOString()
    };
    if (agentId) messageRecord.agent_id = agentId;
    await supabase.from('messages').insert(messageRecord);
    await internalService.saveConversation(ticketId, agentText, agentId, 'agent', agentId, ticket.clientId, ticket.workspaceId);

    // Forward the message to the user's widget channel
    const widgetChannel = ably.channels.get(`widget-conversation:${ticketId}`);
    widgetChannel.publish('message', { content: agentText, ticketId }, err => {
      if (err) console.error('Failed to publish agent message to widget channel:', err);
    });

    // If the ticket was not yet assigned to an agent, mark it as assigned now
    if (agentId) {
      const { data: ticketData, error: ticketErr } = await supabase
        .from('tickets')
        .select('assigned_agent_id')
        .eq('id', ticketId)
        .single();
      if (!ticketErr && ticketData && !ticketData.assigned_agent_id) {
        // Update ticket assignment
        await supabase.from('tickets').update({ assigned_agent_id: agentId }).eq('id', ticketId);
      }
    }

    // Offline customer notification: if the user is not currently online (e.g., has left the chat),
    // use internal service to notify them (for example, via email).
    const userOnline = internalService.isCustomerOnline(ticketId);
    if (!userOnline) {
      // Retrieve customer contact (email/phone) from ticket if not already in messageData
      const { data: tickets, error } = await supabase
        .from('tickets')
        .select('customers: customerId(email)')
        .eq('id', ticketId)
        .limit(1);
      const userEmail = (error || !tickets.length) ? null : tickets[0].customers.email;
      if (userEmail) {
        internalService.notifyCustomerOffline(userEmail, agentText, ticketId);
      } else {
        internalService.notifyCustomerOfflineGeneric(ticketId, agentText);
      }
      // e.g., send an email: "Our support agent has responded to your ticket."
    }
  } catch (err) {
    console.error('Error in handleAgentConversationEvent:', err);
  }
}

const handleTicketMessage = async (ticketId, messageData, clientId, workspaceId, sessionId, userId) => {
  try {
    // console.log('Message data', messageData);
    // Validate ticketId format
    if (!safeUUID(ticketId)) {
      console.warn(`Received message for invalid ticketId: ${ticketId}`);
      return;
    }

    // Extract senderId and senderName directly from messageData (sent from frontend)
    const senderId = messageData.senderId || userId;
    const userName = messageData.senderName || messageData.extras?.senderName || null;
    const type = messageData.type || 'chat';

    const internalService = new InternalService();

    // Send message back to widget
    const widgetChannel = ably.channels.get(`widget:conversation:ticket-${ticketId}`);

    // Save conversation with proper error handling
    try {
      await internalService.saveConversation(ticketId, messageData.text, senderId, 'agent', userName, clientId, workspaceId, type);
    } catch (saveErr) {
      console.error('Error saving conversation:', saveErr);
      // Continue with message publishing even if save fails
    }

    const message = {
      ticketId,
      message: messageData.text,
      from: 'agent',
      to: 'customer',
      sessionId: sessionId
    };

    widgetChannel.publish('message_reply', message, err => {
      if (err) console.error('Failed to publish agent message to widget channel:', err);
    });

  } catch (err) {
    console.error('Error in handleTicketMessage:', err);
  }
}

/**
 * Handle AI assistant's reply from the document-qa-results channel.
 * Forwards the AI's reply to the customer's widget and stores it in the conversation history.
 */
const handleDocumentQAResult = async (ticketId, resultData, users, sessionId) => {
  const internalService = new InternalService();
  try {
    const answerText = resultData.text || resultData.answer || resultData.content;
    if (!answerText) return;

    // 1. Persist the AI's reply as a message in Supabase (mark as from 'bot' or similar).
    // const messageRecord = {
    //   ticket_id: ticketId,
    //   sender_type: 'bot',           // indicate this is from the AI assistant
    //   content: answerText,
    //   timestamp: new Date().toISOString()
    // };
    // await supabase.from('messages').insert(messageRecord);
    await internalService.saveConversation(ticketId, answerText, users.id, 'bot', users.firstname + " " + users.lastname, users.clientId, users.workspaceId);

    // 2. Publish the AI reply to the widget channel so the customer sees the bot's message.
    const widgetChannel = ably.channels.get(`widget:conversation:ticket-${ticketId}`);

    const message = {
      ticketId,
      message: answerText,
      from: 'agent',
      to: 'customer',
      sessionId: sessionId
    }
    widgetChannel.publish('message_reply', message, err => {
      if (err) console.error('Failed to publish AI reply to widget:', err);
    });

    // (Optional) Notify agents of the AI response if needed. 
    // For example, if an agent is viewing the conversation, they might also see the AI's message via the agent channel:
    // const agentChannel = ably.channels.get(`agent-conversation:${ticketId}`);
    // agentChannel.publish('message', { content: answerText, ticketId, sender: 'bot' }, err => {
    //   if (err) console.error('Failed to publish AI reply to agent channel:', err);
    // });
    // (The above is optional and depends on whether agents should see the AI's messages in real-time. 
    // It could help the agent to take over the conversation with context.)
  } catch (err) {
    console.error('Error in handleDocumentQAResult:', err);
  }
}

const handleUserAction = async (ticketId, messageData, sessionId) => {
  const internalService = new InternalService();
  switch (messageData.action) {
    case 'data_collection':
      internalService.handleDataColletionForm(ticketId, messageData);
      break;
    case 'action_button':
      internalService.handleActionButtonClick(ticketId, messageData);
      break;
    case 'csat':
      internalService.updateCsatRating(ticketId, messageData);
      break;
    default:
      console.log('Unknown action:', messageData.action);
  }
}

module.exports = {
  handleWidgetConversationEvent,
  handleAgentConversationEvent,
  handleDocumentQAResult,
  handleTicketMessage,
  handleUserAction
};
