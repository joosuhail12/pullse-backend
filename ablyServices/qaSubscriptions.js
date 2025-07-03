const Ably = require('ably');
const { createClient } = require('@supabase/supabase-js');
const InternalService = require('./internalService.js');
const channelManager = require('./channelManager');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const ably = new Ably.Realtime(process.env.ABLY_API_KEY);
const qaResultSubscriptionsTime = {};

const ensureQaSubscription = async (ticketId, sessionId) => {
  try {
    const internalService = new InternalService();
    
    // Check if subscription already exists
    const existingSubscription = await channelManager.getSubscription(
      'document-qa-results',
      `qa-${ticketId}`,
      'qa_service'
    );
    
    if (existingSubscription) {
      return; // Already subscribed
    }

    // Get bot user details
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, fName, lName, clientId, defaultWorkspaceId')
      .eq('bot_enabled', true)
      .single();

    if (usersError) {
      console.error('Error fetching bot user:', usersError);
      return;
    }

    // Get ticket details for context
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select('clientId, workspaceId')
      .eq('id', ticketId)
      .single();

    if (ticketError) {
      console.error('Error fetching ticket details:', ticketError);
      return;
    }

    // Add subscription to channel manager
    await channelManager.addSubscription({
      channelName: 'document-qa-results',
      channelType: 'qa_results',
      subscriberId: `qa-${ticketId}`,
      subscriberType: 'qa_service',
      ticketId,
      sessionId,
      workspaceId: ticket.workspaceId,
      clientId: ticket.clientId,
      userId: users.id,
      metadata: {
        botUserId: users.id,
        botName: `${users.fName} ${users.lName}`,
        qaService: true
      }
    });

  } catch (error) {
    console.error('Error ensuring QA subscription:', error);
  }
};

module.exports = {
  ensureQaSubscription,
};
