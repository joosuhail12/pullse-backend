// internalService.js

// Example: in-memory or Redis-like online user tracking (replace with actual Redis or DB checks)
const onlineAgents = new Set();    // Set of userIds
const onlineCustomers = new Set(); // Set of ticketIds
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const Ably = require('ably');
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
      if (!tickets) throw new Error('No tickets returned');
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
      return leastLoadedAgent.id;
    } else if (ticket.teams.routingStrategy === "round-robin") {
      const { data: tickets, error: ticketsError } = await supabase
        .from("tickets")
        .select("id, teamId")
        .eq("id", ticketId)
        .limit(1);
      const ticket = tickets[0];
      const teamId = ticket.teamId;
      const { data: teamMembers, error: teamMembersError } = await supabase
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
      const { data: latestTickets, error: latestTicketsError } = await supabase
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
      const { data: updateResponse, error: updateError } = await supabase
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

  async saveConversation(ticketId, firstMessage, customerId, senderType, senderName, clientId, workspaceId, type = 'chat', attachmentType = null, attachmentUrl = null) {
    console.log("XXXXXXXXXXXXXXXX", ticketId, firstMessage, customerId, senderType, senderName, clientId, workspaceId, type, attachmentType, attachmentUrl)
    const { data: conversation, error: conversationError } = await supabase.from('conversations').insert({
      message: firstMessage,
      createdBy: customerId,
      type: type,
      ticketId,
      userType: senderType,
      senderName: senderName, // Add this!
      clientId: clientId,
      workspaceId: workspaceId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      attachmentType: attachmentType ? attachmentType : null,
      attachmentUrl: attachmentUrl ? attachmentUrl : null
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

  async updateConversationMessage(conversationId, message) {
    const { data: conversation, error: conversationError } = await supabase.from('conversations').update({
      message: message,
    }).eq('id', conversationId);
    if (conversationError) {
      console.error('Error updating conversation:', conversationError);
    }
    return conversation;
  }

  async updateCsatRating(ticketId, messageData) {
    const { data, conversationId } = messageData;
    const ratingScale = data["csat"]["ratingScale"];
    const ratingValue = data["csat"]["value"];
    const { data: ticketData, error: ticketError } = await supabase
      .from('tickets')
      .update({ ratingScale: ratingScale, rating: ratingValue })
      .eq('id', ticketId)
      .select().single();
    if (ticketError) {
      console.error('Error updating ticket:', ticketError);
    }
    // Update previous conversation with userAllowAction to false
    const { data: conversationData, error: conversationErrorUpdate } = await supabase
      .from('conversations')
      .update({ allowUserAction: false })
      .eq('id', conversationId)
      .select().single();
    if (conversationErrorUpdate) {
      console.error('Error updating conversation:', conversationErrorUpdate);
    }
    return ticketData;
  }

  async handleDataColletionForm(ticketId, messageData) {
    const { data, conversationId } = messageData;
    const fields = data["data_collection"]["fields"];
    console.log('Fields:', fields);

    // Get ticket information first
    const { data: ticketData, error: ticketError } = await supabase
      .from('tickets')
      .select('clientId, workspaceId, customerId')
      .eq('id', ticketId)
      .single();

    if (ticketError) {
      console.error('Error getting ticket:', ticketError);
      return;
    }

    // Get customer details to get companyId
    const { data: customerData, error: customerError } = await supabase
      .from('customers')
      .select('companyId')
      .eq('id', ticketData.customerId)
      .single();

    if (customerError) {
      console.error('Error getting customer:', customerError);
    }

    const customerId = customerData.id;
    const companyId = customerData.companyId;

    // Filter fields by type
    const customFields = fields.filter(field => field.customFieldId && field.customFieldId.length > 0);
    const customObjectFields = fields.filter(field => field.customObjectFieldId && field.customObjectFieldId.length > 0);
    const companyFields = fields.filter(field => field.table === "company" && (!field.customFieldId || field.customFieldId.length === 0));
    const contactFields = fields.filter(field => field.table === "contact" && (!field.customFieldId || field.customFieldId.length === 0));
    const ticketFields = fields.filter(field => field.table === "tickets" && (!field.customFieldId || field.customFieldId.length === 0));

    try {
      // Handle contact fields
      if (contactFields.length > 0) {
        const contactUpdateData = {};
        contactFields.forEach(field => {
          if (field.value && field.field) {
            contactUpdateData[field.field] = field.value;
          }
        });

        if (Object.keys(contactUpdateData).length > 0) {
          const { data: contactData, error: contactError } = await supabase
            .from('customers')
            .update(contactUpdateData)
            .eq('id', ticketData.customerId)
            .select()
            .single();

          if (contactError) {
            console.error('Error updating contact:', contactError);
          }
        }
      }

      // Handle company fields
      if (companyFields.length > 0) {
        const companyUpdateData = {};
        companyFields.forEach(field => {
          if (field.value && field.field) {
            companyUpdateData[field.field] = field.value;
          }
        });

        if (Object.keys(companyUpdateData).length > 0) {
          if (companyId) {
            // Update existing company
            const { data: companyData, error: companyError } = await supabase
              .from('companies')
              .update(companyUpdateData)
              .eq('id', companyId)
              .select()
              .single();

            if (companyError) {
              console.error('Error updating company:', companyError);
            }
          } else {
            // Create new company
            const { data: newCompany, error: companyError } = await supabase
              .from('companies')
              .insert({
                ...companyUpdateData,
                workspaceId: ticketData.workspaceId,
                clientId: ticketData.clientId
              })
              .select()
              .single();

            if (companyError) {
              console.error('Error creating company:', companyError);
            } else {
              // Update ticket with new company ID
              const { error: ticketUpdateError } = await supabase
                .from('tickets')
                .update({ companyId: newCompany.id })
                .eq('id', ticketId);

              if (ticketUpdateError) {
                console.error('Error updating ticket with company ID:', ticketUpdateError);
              }
            }
          }
        }
      }

      // Handle ticket fields
      if (ticketFields.length > 0) {
        const ticketUpdateData = {};
        ticketFields.forEach(field => {
          if (field.value && field.field) {
            ticketUpdateData[field.field] = field.value;
          }
        });

        if (Object.keys(ticketUpdateData).length > 0) {
          const { data: updatedTicket, error: ticketUpdateError } = await supabase
            .from('tickets')
            .update(ticketUpdateData)
            .eq('id', ticketId)
            .select()
            .single();

          if (ticketUpdateError) {
            console.error('Error updating ticket:', ticketUpdateError);
          }
        }
      }

      // Handle custom fields
      if (customFields.length > 0) {
        for (const field of customFields) {
          if (field.value && field.customFieldId) {
            // Build query conditions based on entity type
            let query = supabase
              .from('customfielddata')
              .select('id')
              .eq('customfieldId', field.customFieldId)
              .eq('entityType', field.table);

            // Add entity-specific conditions
            if (field.table === "ticket") {
              query = query.eq('ticketId', ticketId).is('companyId', null).is('contactId', null);
            } else if (field.table === "company") {
              query = query.eq('companyId', companyId).is('ticketId', null).is('contactId', null);
            } else if (field.table === "contact") {
              query = query.eq('contactId', customerId).is('ticketId', null).is('companyId', null);
            }

            const { data: existingData, error: selectError } = await query.single();

            if (selectError && selectError.code !== 'PGRST116') {
              console.error('Error checking existing custom field data:', selectError);
              continue;
            }

            if (existingData) {
              // Update existing record
              const { error: updateError } = await supabase
                .from('customfielddata')
                .update({ data: field.value })
                .eq('id', existingData.id);

              if (updateError) {
                console.error('Error updating custom field data:', updateError);
              }
            } else {
              // Insert new record
              const insertData = {
                customfieldId: field.customFieldId,
                data: field.value,
                entityType: field.table,
              };

              // Add entity-specific ID based on table type
              if (field.table === "ticket") {
                insertData.ticketId = ticketId;
              } else if (field.table === "company") {
                insertData.companyId = companyId;
              } else if (field.table === "contact") {
                insertData.contactId = customerId;
              }

              const { error: insertError } = await supabase
                .from('customfielddata')
                .insert(insertData);

              if (insertError) {
                console.error('Error inserting custom field data:', insertError);
              }
            }
          }
        }
      }

      // Handle custom object fields
      if (customObjectFields.length > 0) {
        for (const field of customObjectFields) {
          if (field.value && field.customObjectFieldId) {
            // Build query conditions based on entity type
            let query = supabase
              .from('customobjectfielddata')
              .select('id')
              .eq('customObjectFieldId', field.customObjectFieldId);

            // Add entity-specific conditions
            if (field.table === "ticket") {
              query = query.eq('ticketId', ticketId).is('companyId', null).is('contactId', null);
            } else if (field.table === "company") {
              query = query.eq('companyId', companyId).is('ticketId', null).is('contactId', null);
            } else if (field.table === "contact") {
              query = query.eq('contactId', customerId).is('ticketId', null).is('companyId', null);
            }

            const { data: existingData, error: selectError } = await query.single();

            if (selectError && selectError.code !== 'PGRST116') {
              console.error('Error checking existing custom object field data:', selectError);
              continue;
            }

            if (existingData) {
              // Update existing record
              const { error: updateError } = await supabase
                .from('customobjectfielddata')
                .update({ data: field.value })
                .eq('id', existingData.id);

              if (updateError) {
                console.error('Error updating custom object field data:', updateError);
              }
            } else {
              // Insert new record
              const insertData = {
                customObjectFieldId: field.customObjectFieldId,
                data: field.value,
              };

              // Add entity-specific ID based on table type
              if (field.table === "ticket") {
                insertData.ticketId = ticketId;
              } else if (field.table === "company") {
                insertData.companyId = companyId;
              } else if (field.table === "contact") {
                insertData.contactId = customerId;
              }

              const { error: insertError } = await supabase
                .from('customobjectfielddata')
                .insert(insertData);

              if (insertError) {
                console.error('Error inserting custom object field data:', insertError);
              }
            }
          }
        }
      }

      // Update previous conversation with userAllowAction to false
      const { data: conversationData, error: conversationErrorUpdate } = await supabase
        .from('conversations')
        .update({ allowUserAction: false })
        .eq('id', conversationId)
        .select()
        .single();

      if (conversationErrorUpdate) {
        console.error('Error updating conversation:', conversationErrorUpdate);
      }

      const { data: conversationDataInsert, error: conversationErrorInsert } = await supabase
        .from('conversations').insert({
          message: "Data submitted",
          type: 'chat',
          ticketId,
          senderName: "Customer",
          clientId: ticketData.clientId,
          userType: "customer",
          workspaceId: ticketData.workspaceId,
          messageType: "text",
          senderType: "user",
          workflowActionId: conversationId,
          allowUserAction: false
        }).select('id').single();

      if (conversationErrorInsert) {
        console.error('Error saving conversation:', conversationErrorInsert);
      }
      const ably = new Ably.Rest(process.env.ABLY_API_KEY);
      const ch = ably.channels.get(`widget:conversation:ticket-${ticketId}`);
      await ch.publish('message_reply', {
        ticketId: ticketId,
        id: conversationDataInsert && conversationDataInsert.id,
        message: "Data submitted",
        type: "user",
        senderType: "user",
        messageType: "text"
      });

      console.log('Data collection form processed successfully for ticket:', ticketId);
      return { success: true, ticketId };

    } catch (error) {
      console.error('Error processing data collection form:', error);
      throw error;
    }
  }

  async handleActionButtonClick(ticketId, actionButtonData) {
    const ably = new Ably.Rest(process.env.ABLY_API_KEY);
    const { data, action, conversationId } = actionButtonData;
    const label = data["action_button"]["label"];

    const { data: ticketData, error: ticketError } = await supabase
      .from('tickets')
      .select('clientId, workspaceId')
      .eq('id', ticketId)
      .single();

    if (ticketError) {
      console.error('Error getting ticket:', ticketError);
      return;
    }

    const { data: conversation, error: conversationError } = await supabase
      .from('conversations').insert({
        message: label,
        type: 'chat',
        ticketId,
        senderName: "Customer",
        clientId: ticketData.clientId,
        userType: "customer",
        workspaceId: ticketData.workspaceId,
        messageType: "text",
        senderType: "user",
        workflowActionId: conversationId
      }).select('id').single();

    if (conversationError) {
      console.error('Error saving conversation:', conversationError);
      return;
    }

    // Update previous conversation with userAllowAction to false
    const { data: conversationData, error: conversationErrorUpdate } = await supabase
      .from('conversations')
      .update({ allowUserAction: false })
      .eq('id', conversationId)
      .select().single();
    if (conversationErrorUpdate) {
      console.error('Error updating conversation:', conversationErrorUpdate);
    }

    const ch = ably.channels.get(`widget:conversation:ticket-${ticketId}`);
    await ch.publish('message_reply', {
      ticketId: ticketId,
      id: conversation && conversation.id,
      message: label,
      type: "user",
      senderType: "user",
      messageType: "text"
    });
  }
}

module.exports = InternalService;
