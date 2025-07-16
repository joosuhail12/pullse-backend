const { handleNewTicket } = require('./ticket');
const Ably = require('ably');
const { createClient } = require('@supabase/supabase-js');
const channelManager = require('./channelManager');
const ably = new Ably.Realtime(process.env.ABLY_API_KEY);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

exports.initializeWidgetSession = async function initializeWidgetSession(sessionId, clientId, workspaceId) {
  try {
    await channelManager.addSubscription({
      channelName: `widget:contactevent:${sessionId}`,
      channelType: 'widget_session',
      subscriberId: sessionId,
      subscriberType: 'session',
      workspaceId,
      sessionId,
      clientId,
      metadata: { sessionType: 'widget' }
    });
  } catch (error) {
    console.error('Error initializing widget session:', error);
  }
};

exports.subscribeToConversationChannels = async function subscribeToConversationChannels(ticketId, sessionId) {
  try {
    // Get ticket details for additional context
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select('clientId, workspaceId, customerId')
      .eq('id', ticketId)
      .single();

    if (ticketError) {
      console.error('Error fetching ticket details:', ticketError);
      return;
    }

    // Subscribe to widget conversation channel
    await channelManager.addSubscription({
      channelName: `widget:conversation:ticket-${ticketId}`,
      channelType: 'conversation',
      subscriberId: sessionId,
      subscriberType: 'session',
      ticketId,
      sessionId,
      workspaceId: ticket.workspaceId,
      clientId: ticket.clientId,
      metadata: { conversationType: 'widget' }
    });
  } catch (error) {
    console.error('Error subscribing to conversation channels:', error);
  }
};

exports.subscribeToTicketChannels = async function subscribeToTicketChannels(ticketId, clientId, workspaceId, sessionId, userId) {
  try {
    // Remove any existing subscriptions for this user on different tickets
    await channelManager.removeSubscriberSubscriptions(userId, `agent`, ticketId);

    // Subscribe to ticket channel
    await channelManager.addSubscription({
      channelName: `ticket:${ticketId}`,
      channelType: 'ticket',
      subscriberId: userId,
      subscriberType: 'agent',
      ticketId,
      sessionId,
      workspaceId,
      clientId,
      userId,
      metadata: { ticketAccess: 'agent' }
    });
  } catch (error) {
    console.error('Error subscribing to ticket channels:', error);
  }
};

// Updated to use new chatbot channel pattern
exports.subscribeToChatbotPrimary = async function subscribeToChatbotPrimary(chatbotProfileId, ticket_id) {
  try {
    // Get ticket details for context
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select('clientId, workspaceId')
      .eq('id', ticket_id)
      .single();

    if (ticketError) {
      console.error('Error fetching ticket details for chatbot:', ticketError);
      return;
    }

    await channelManager.addSubscription({
      channelName: `chatbot:${chatbotProfileId}:${ticket_id}`,
      channelType: 'chatbot',
      subscriberId: `chatbot-${chatbotProfileId}-${ticket_id}`,
      subscriberType: 'chatbot',
      ticketId: ticket_id,
      workspaceId: ticket.workspaceId,
      clientId: ticket.clientId,
      chatbotProfileId,
      metadata: { chatbotProfile: chatbotProfileId }
    });
  } catch (error) {
    console.error('Error subscribing to chatbot channel:', error);
  }
};

// Simplified function to publish to chatbot channels
exports.publishToChatbotConversation = async function publishToChatbotConversation(message, chatbotProfileId, ticket_id) {
  try {
    const chatbotCh = ably.channels.get(`chatbot:${chatbotProfileId}:${ticket_id}`);
    chatbotCh.publish('user-message', { content: message }, err => {
      if (err) console.error('Failed to publish message to chatbot channel:', err);
    });
    return true;
  } catch (error) {
    console.error('Error publishing to chatbot conversation:', error);
    return false;
  }
};

// Function to forward widget message to chatbot
exports.forwardWidgetMessageToChatbot = async function forwardWidgetMessageToChatbot(messageData, chatbotProfileId, ticket_id, session_id) {
  try {
    const chatbotCh = ably.channels.get(`chatbot:${chatbotProfileId}:${ticket_id}`);
    
    const payload = {
      content: messageData.text || messageData.content || messageData.message,
      ticketId: ticket_id,
      sessionId: session_id
    };
    
    console.log(`[Listeners] Forwarding widget message to chatbot for ticket ${ticket_id}:`, payload);
    
    chatbotCh.publish('user-message', payload, err => {
      if (err) {
        console.error(`[Listeners] Failed to forward widget message to chatbot for ticket ${ticket_id}:`, err);
      } else {
        console.log(`[Listeners] Successfully forwarded widget message to chatbot for ticket ${ticket_id}`);
      }
    });
    
    return true;
  } catch (error) {
    console.error('Error forwarding widget message to chatbot:', error);
    return false;
  }
};

// Legacy function for backward compatibility - now redirects to new pattern
exports.publishToCopilotConversationChannels = async function publishToCopilotConversationChannels(message, conversationId) {
  console.warn('publishToCopilotConversationChannels is deprecated. Use publishToChatbotConversation instead.');
  // Extract chatbotProfileId and ticket_id from conversationId or use defaults
  const chatbotProfileId = 'default'; // You may need to extract this from conversationId
  const ticket_id = conversationId; // Assuming conversationId is the ticket_id for now
  
  return await exports.publishToChatbotConversation(message, chatbotProfileId, ticket_id);
};

// Additional utility functions for channel management

exports.removeTicketSubscriptions = async function removeTicketSubscriptions(ticketId) {
  try {
    const subscriptions = await channelManager.getTicketSubscriptions(ticketId);
    
    for (const subscription of subscriptions) {
      await channelManager.removeSubscription(
        subscription.channel_name,
        subscription.subscriber_id,
        subscription.subscriber_type
      );
    }
    
  } catch (error) {
    console.error('Error removing ticket subscriptions:', error);
  }
};

exports.removeSessionSubscriptions = async function removeSessionSubscriptions(sessionId) {
  try {
    const subscriptions = await channelManager.getSubscriberSubscriptions(sessionId, 'session');
    
    for (const subscription of subscriptions) {
      await channelManager.removeSubscription(
        subscription.channel_name,
        subscription.subscriber_id,
        subscription.subscriber_type
      );
    }
    
  } catch (error) {
    console.error('Error removing session subscriptions:', error);
  }
};

exports.getChannelStats = async function getChannelStats() {
  return await channelManager.getStats();
};

exports.cleanupInactiveSubscriptions = async function cleanupInactiveSubscriptions() {
  return await channelManager.cleanupInactiveSubscriptions();
};