// internalService.js

// Example: in-memory or Redis-like online user tracking (replace with actual Redis or DB checks)
const onlineAgents = new Set();    // Set of userIds
const onlineCustomers = new Set(); // Set of ticketIds
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
/** Check if AI is enabled for a given workspace */
class InternalService {
  constructor() {
    this.onlineAgents = new Set();
    this.onlineCustomers = new Set();
  }

  async isWorkspaceAIEnabled(clientId) {
    // TODO: Replace this with actual DB or config check
    // You can query Supabase, Redis, or a feature flag service
    const { data: clientData, error: clientError } = await supabase
      .from('clients')
      .select('ticket_ai_enabled')
      .eq('id', clientId)
      .limit(1);
    const client = clientData ? clientData[0] : null;
    return client?.ticket_ai_enabled || false;
  }

  async getAssignedAgent(clientId) {
    const { data: agentData, error: agentError } = await supabase
      .from('users')
      .select('id')
      .eq('clientId', clientId)
      .eq('bot_enabled', true)
      .limit(1);
    const agent = agentData ? agentData[0] : null;
    return agent?.id || null;
  }

  /** Check if a given agent is online */
  isAgentOnline(agentId) {
    return this.onlineAgents.has(agentId);
  }

  /** Check if *any* agent is online for the workspace/team/ticket */
  isAnyAgentOnline(ticketId) {
    // TODO: Enhance with team-based online agent tracking
    return this.onlineAgents.size > 0;
  }

  /** Check if the customer is still online for a ticket */
  isCustomerOnline(ticketId) {
    return this.onlineCustomers.has(ticketId);
  }

  /** Notify the support team that a new ticket has arrived */
   notifyNewTicket(ticketId, firstMessage, customerId) {

    console.log(`[🛎️] New ticket created: ${ticketId}`);
    // TODO: Trigger Slack/email notifications here
  }

  async saveConversation(ticketId, firstMessage, customerId, senderType, senderName, clientId, workspaceId) {
    const { data: conversation, error: conversationError } = await supabase.from('conversations').insert({
        message: firstMessage,
        createdBy: customerId,
        type: 'chat',
        ticketId,
        userType: senderType,
        senderName: senderName, // Add this!
        clientId: clientId,
        workspaceId: workspaceId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    if (conversationError) {
      console.error('Error saving conversation:', conversationError);
    }
    return conversation;
  }

  /** Notify a specific agent that their customer is waiting */
  notifyAgentOffline(agentId, ticketId, message) {
    console.log(`[📨] Agent ${agentId} is offline. Message from customer on ticket ${ticketId}: "${message}"`);
    // TODO: Email, push notification, or in-app alert
  }

  /** Notify support team if no agent is assigned */
notifyAgentTeam(ticketId, message) {
    console.log(`[📨] No assigned agent. Notifying support team. Ticket ${ticketId}, message: "${message}"`);
    // TODO: Broadcast to support team Slack/email/etc.
  }

  /** Notify the customer that agent has replied while they're offline */
  notifyCustomerOffline(email, replyText, ticketId) {
    console.log(`[📧] Sent agent reply to customer via email (${email}): "${replyText}"`);
    // TODO: Send email via SendGrid, SES, etc.
  }

  /** Fallback when customer email isn't available */
  notifyCustomerOfflineGeneric(ticketId, replyText) {
    console.log(`[📧] Tried notifying customer for ticket ${ticketId} but no email found. Message: "${replyText}"`);
    // TODO: Could queue for manual follow-up
  }
}

module.exports = InternalService;
