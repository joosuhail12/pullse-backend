// ticket.js
const { safeUUID } = require('./utils.js');
const InternalService = require('./internalService.js');
const {createClient} = require('@supabase/supabase-js');
const { ensureQaSubscription } = require('./qaSubscriptions.js');
const Ably = require('ably');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const ably = new Ably.Realtime(process.env.ABLY_API_KEY);
let routing, internalService;

/**
 * Inject shared singletons (called once from listeners.init).
 */
const initTicket = (depSupabase, depAbly, depRouting, depInternalService) => {
  routing = depRouting;
  internalService = depInternalService;
}

/**
 * Create a new ticket and (optionally) forward first question to the LLM.
 * The caller (listeners.js) is responsible for
 *   subscribeToConversationChannels(ticketId)
 *   once this resolves.
 */
const handleNewTicket = async ({ workspaceId, sessionId, firstMessage, userType }) => {
  const internalService = new InternalService();

    // 1. insert ticket
    const { data: sessionData, error: sessionError } = await supabase
      .from('widgetsessions')
      .select('customers: contactId(id, firstname, lastname, email), contactDeviceId, clients: clientId(id, ticket_ai_enabled), widgetId')
      .eq('id', sessionId);

    if (sessionError || !sessionData[0]) throw sessionError || new Error('No session found');
    const session = sessionData[0];
    const customerId = safeUUID(session.customers.id);
    const clientId = safeUUID(session.clients.id);
    const deviceId = safeUUID(session.contactDeviceId);

    const { data: channelData } = await supabase
      .from('channels')
      .select('id')
      .eq('name', 'chat')
      .single();
    console.log(channelData,"channelData")
    const { data: teamData } = await supabase
      .from('teamChannels')
      .select('teamId')
      .eq('chatChannelId', channelData.id);
    console.log(teamData,"teamData")
    const teamId = safeUUID(teamData?.[0]?.teamId);
    const ticketAiEnabled = session.clients.ticket_ai_enabled;
    const aiEnabled = ticketAiEnabled ? true : false;
    let assignedAgentId = null;
    if (aiEnabled) {
      assignedAgentId = await internalService.getAssignedAgent(clientId);
    }
    const { data: ticketResult, error: ticketError } = await supabase
    .from('tickets')
    .insert({
        customerId,
        clientId,
        workspaceId,
        lastMessage: firstMessage,
        teamId,
        title: firstMessage,
        deviceId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        assignedTo: assignedAgentId,
        assigneeId: assignedAgentId,
        aiEnabled: aiEnabled,
        status: 'open'
    })
    .select();
    const newTicketId = ticketResult?.[0]?.id;
    if (!newTicketId) throw new Error('Ticket creation failed');
    const { data: widgetTheme } = await supabase
    .from('widgettheme')
    .select('*')
    .eq('widgetId', session.widgetId)
    .single();
    const welcomeMessage = widgetTheme.labels?.welcomeMessage || 'Hello!';
    const assignedAgent = await supabase
    .from('users')
    .select('id, firstname, lastname')
    .eq('id', assignedAgentId)
    .single();
    await internalService.saveConversation(newTicketId, welcomeMessage, assignedAgent?.id, 'agent', assignedAgent?.firstname + " " + assignedAgent?.lastname, clientId, workspaceId);
    await internalService.saveConversation(newTicketId, firstMessage, customerId, userType, session.customers.firstname + " " + session.customers.lastname, clientId, workspaceId);

  // 3. send welcome message
//   const welcomeText = aiEnabled
//     ? 'Hello! Our AI assistant is reviewing your question and will reply shortly.'
//     : 'Hello! Thank you for contacting support. An agent will be with you soon.';



  // 4. If AI is enabled, forward first question
  const contactCh = ably.channels.get(`widget:contactevent:${sessionId}`);

  await contactCh.publish('new_ticket_reply', { ticketId: newTicketId });
  
  if (aiEnabled && firstMessage?.trim()) {
    const qaCh = ably.channels.get(`document-qa`);
    ensureQaSubscription(newTicketId, sessionId, clientId);
    qaCh.publish('message', { query:firstMessage, id:newTicketId });
  }

//   // 5. notify team (offline alert, etc.)
//   internalService.notifyNewTicket(newTicketId, firstMessage, customerId);

  return { id: newTicketId };
}

module.exports = {
  handleNewTicket,
  initTicket,
};
