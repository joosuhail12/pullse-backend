const { createClient } = require('@supabase/supabase-js');
const AblyRest = require('ably').Rest;
const InternalService = require('./internalService');
const Notifications = require('./notificationsService');
const { safeUUID } = require('./utils');
const { ensureQaSubscription } = require('./qaSubscriptions');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const ablyRest = new AblyRest(process.env.ABLY_API_KEY);

exports.handleNewTicket = async function handleNewTicket({ workspaceId, sessionId, firstMessage, userType }) {
  // parallel fetches
  const [sessionRow, chatChannelRow] = await Promise.all([
    supabase
      .from('widgetsessions')
      .select(`customers:contactId(id, firstname, lastname, email),
               contactDeviceId,
               clients:clientId(id, ticket_ai_enabled),
               widgetId`)
      .eq('id', sessionId)
      .single(),
    supabase.from('channels').select('id').eq('name', 'chat').single()
  ]);
  if (sessionRow.error) throw sessionRow.error;
  if (chatChannelRow.error) throw chatChannelRow.error;

  const session = sessionRow.data;
  const chatChannelId = chatChannelRow.data.id;

  // team from channel mapping
  const { data: teamRow, error: teamErr } = await supabase
    .from('teamChannels')
    .select('teams:teamId(id, routingStrategy)')
    .eq('chatChannelId', chatChannelId)
    .single();
  if (teamErr) throw teamErr;
  const {
    contactDeviceId: deviceId,
    clients: { id: clientId, ticket_ai_enabled: aiEnabled },
    customers: { id: customerId, firstname, lastname, email },
    widgetId
  } = session;
  const teamId = safeUUID(teamRow?.teams?.id);
  const routingType = teamRow?.teams?.routingStrategy;
  // insert ticket
  const { data: ticket, error: tErr } = await supabase
    .from('tickets')
    .insert({
      customerId,
      clientId,
      workspaceId,
      lastMessage: firstMessage,
      teamId,
      title: firstMessage,
      deviceId,
      aiEnabled,
      status: 'open'
    })
    .select()
    .single();
  if (tErr) throw tErr;
  const ticketId = ticket.id;

  // routing decision
  const IS = new InternalService();
  let assigneeId;
  if (aiEnabled) {
    assigneeId = await IS.getAssignedAgent(clientId);
  } else {
    assigneeId = await IS.ticketRouting(ticketId, teamId);
  }
  // prepare welcome / save conv parallel
  const agentNamePromise = assigneeId
    ? supabase.from('users').select('firstname, lastname').eq('id', assigneeId).single()
    : Promise.resolve({ data: null });
  const themePromise = supabase.from('widgettheme').select('labels').eq('widgetId', widgetId).single();
  const [agentRow, themeRow] = await Promise.all([agentNamePromise, themePromise]);

  const welcome = themeRow.data?.labels?.welcomeMessage || 'Hello!';
  const agentName = agentRow.data ? `${agentRow.data.firstname} ${agentRow.data.lastname}` : null;

  await IS.saveConversation(ticketId, welcome, assigneeId, 'agent', agentName, clientId, workspaceId);
  await IS.saveConversation(ticketId, firstMessage, customerId, userType, `${firstname} ${lastname}`, clientId, workspaceId);

  // notify widget
  ablyRest.channels.get(`widget:contactevent:${sessionId}`)
    .publish('new_ticket_reply', { ticketId });

  // notifications for humans (skip if goes to bot inbox)
  if (!aiEnabled) {
    let recipients = [];
    if (routingType === 'manual' || routingType === 'unassigned') {
      const { data } = await supabase.from('teamMembers').select('user_id').eq('team_id', teamId);
      recipients = data.map(r => r.user_id);
    } else if (assigneeId) {
      recipients = [assigneeId];
    }

    // decide broadcast channel
    const broadcast = routingType === 'manual' ? [`notifications:org:${clientId}:unassigned`] : [];

    await Notifications.createAndBroadcast({
      type: 'NEW_TICKET',
      entityId: ticketId,
      actorId: customerId,
      recipientIds: recipients,
      payload: { title: firstMessage.slice(0, 120), routingType },
      broadcastChannels: broadcast
    });
  } else {
    ensureQaSubscription(ticketId, sessionId);
    const qaCh = ablyRest.channels.get(`document-qa`);
    qaCh.publish('message', { query: firstMessage, id: ticketId, clientId: clientId });
  }

  return { id: ticketId };
};