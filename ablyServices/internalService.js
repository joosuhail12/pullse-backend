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

  async ticketRouting(ticketId) {
    const { data: ticketData, error: ticketError } = await supabase
      .from('tickets')
      .select('teams(*)')
      .eq('id', ticketId)
      .limit(1);
    const ticket = ticketData ? ticketData[0] : null;
    if (ticket.teams.routingStrategy === "manual") {
        await supabase
        .from('tickets')
        .update({ assigneeId: null, assignedTo: null, aiEnabled: false })
        .eq("id", ticketId)
        return null;
    } else if (ticket.teams.routingStrategy === "load-balanced") {
      const { data: tickets, error: ticketsError } = await supabase
      .from('tickets')
      .select(`
        id,
        assignedTo:users!tickets_assignedTo_fkey (
          id,
          bot_enabled
        )
      `)
      .eq('teamId', ticket.teams.id)
      .eq('assignedTo.bot_enabled', false)
      .not('assignedTo', 'is', null)
      .limit(100);             // ensure join present

        const ticketCounts = {};
        if (ticketsError) throw ticketsError;         // bail early on error
        if (!tickets)      throw new Error('No tickets returned');
        tickets.forEach((t) => {
          const agent = t.assignedTo;
          if (agent && agent.id) {
            if (!ticketCounts[agent.id]) {
              ticketCounts[agent.id] = { agent, count: 0 };
            }
            ticketCounts[agent.id].count += 1;
          }
        });
  
        const agentList = Object.values(ticketCounts).sort((a, b) => a.count - b.count);
        const leastLoadedAgent = agentList.length > 0 ? agentList[0].agent : null;
  
        if (leastLoadedAgent) {
           supabase
            .from("tickets")
            .update({ aiEnabled: false, assignedTo: leastLoadedAgent.id })
            .eq("id", ticketId)
        }
        return leastLoadedAgent.id ;
    } else if (ticket.teams.routingStrategy === "round-robin") {
      const {data:tickets, error:ticketsError} = await supabase
        .from("tickets")
        .select("id, teamId")
        .eq("id", ticketId)
        .limit(1);
      const ticket = tickets[0];
      const teamId = ticket.teamId;
      const {data:teamMembers, error:teamMembersError} = await supabase
        .from("teamMembers")
        .select("user_id, users(*)")
        .eq("team_id", teamId)
      const agents = teamMembers
        .map((tm) => tm.users)
        .filter((u) => u && !u.bot_enabled)
        .sort((a, b) => a.id.localeCompare(b.id));
      const agentIds = agents.map((a) => a.id);
      if (agentIds.length === 0) {
        console.error("No valid agents found in team.");
        throw new Error("No human agents available in this team.");
      }
      const {data:latestTickets, error:latestTicketsError} = await supabase
        .from("tickets")
        .select("*, assignedTo(*)")
        .eq("teamId", teamId)
        .is("assigneeId", null)
        .not("assignedTo", "is", null)
        .eq("assignedTo.bot_enabled", false)
        .order("createdAt", { ascending: false })
        .limit(1)
      let lastAssignedUserId = null;
      if (latestTickets.length > 0 && latestTickets[0].assignedTo) {
        lastAssignedUserId = latestTickets[0].assignedTo.id;
      }
      let nextIndex = 0;
      if (lastAssignedUserId && agentIds.includes(lastAssignedUserId)) {
        const lastIndex = agentIds.indexOf(lastAssignedUserId);
        nextIndex = (lastIndex + 1) % agentIds.length;
      }
      const nextAssigneeId = agentIds[nextIndex];
      const {data: updateResponse, error: updateError} = await supabase
        .from("tickets")
        .update({
          assignedTo: nextAssigneeId,
          aiEnabled: false
        })
        .eq("id", ticketId)
      if (updateError) throw updateError;
      return nextAssigneeId;
    }
  }

  async getAssignedAgentByTeamId(teamId) {
    const { data: agentData, error: agentError } = await supabase
      .from('users')
      .select('*, assignedTo(*), teams(*)')
      .eq('teamId', teamId)
      .eq('bot_enabled', false)
      .limit(1);
    const agent = agentData ? agentData[0] : null;
    return agent?.id || null;
  }


  async doManualAssignment(ticketId, agentId) {
    const { data: ticketData, error: ticketError } = await supabase
      .from('tickets')
      .update({ assignedTo: agentId })
      .eq('id', ticketId)
      .limit(1);
    if (ticketError) {
      console.error('Error updating ticket:', ticketError);
    }
    return ticketData ? ticketData[0] : null;
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
