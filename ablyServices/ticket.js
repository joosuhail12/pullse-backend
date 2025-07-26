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
               widget:widgetId(id, name)`)
      .eq('id', sessionId)
      .single(),
  ]);
  if (sessionRow.error) throw sessionRow.error;
  //get the widhet
  const session = sessionRow.data;
  //get the widget
  const widget = session.widget.id;
  // insert ticket
  const { data: ticket, error: tErr } = await supabase
    .from('tickets')
    .insert({
      customerId: session.customers.id,
      clientId: session.clients.id,
      workspaceId,
      lastMessage: firstMessage,
      title: firstMessage,
      deviceId: session.contactDeviceId,
      status: 'Open',
      priority: 'Low',
      channel: "chat",
      chatWidgetId: widget,
    })
    .select()
    .single();
  if (tErr) throw tErr;
  const ticketId = ticket.id;
  const IS = new InternalService();
  let assigneeId = "";
  const agentNamePromise = assigneeId
    ? supabase.from('users').select('firstname, lastname').eq('id', assigneeId).single()
    : Promise.resolve({ data: null });
  const themePromise = supabase.from('widgettheme').select('labels').eq('widgetId', widget).single();
  const [agentRow, themeRow] = await Promise.all([agentNamePromise, themePromise]);

  const welcome = themeRow.data?.labels?.welcomeMessage || 'Hello!';
  const agentName = session.widget.name;

  await IS.saveConversation(ticketId, welcome, widget, 'agent', agentName, session.clients.id, workspaceId);
  await IS.saveConversation(ticketId, firstMessage, session.customers.id, userType, `${session.customers.firstname} ${session.customers.lastname}`, session.clients.id, workspaceId);

  // notify widget
  ablyRest.channels.get(`widget:contactevent:${sessionId}`)
    .publish('new_ticket_reply', { ticketId });
    
  const newTicketPayload = {
    id: ticketId,
    ticket_sno: ticketId,
    sno: ticket.sno ?? ticketId,
    subject: firstMessage,
    description: null,
    customer: {
      id: session.customers.id,
      name: `${session.customers.firstname} ${session.customers.lastname}`,
      email: session.customers.email,
      phone: session.customers.phone,
    },
    customerId: session.customers.id,
    status:"Open",
    priority:"Low",
    assignee:null,
    assignedTo:null,
    assignedToUser:null,
    teamId:null,
    team:[],
    teams: [],
    tags: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isUnread: false,
    hasNotification: false,
    notificationType: null,
    recipients: [],
    customFields: [],
    topicIds: [],
    mentionIds: [],
    messages: [],
  }
  ablyRest.channels.get(`notifications:client:${session.clients.id}`)
  .publish('new_ticket', newTicketPayload);
  // notifications for humans (skip if goes to bot inbox)
  // if (!aiEnabled) {
  //   let recipients = [];
  //   if (routingType === 'manual' || routingType === 'unassigned') {
  //     const { data } = await supabase.from('teamMembers').select('user_id').eq('team_id', teamId);
  //     recipients = data.map(r => r.user_id);
  //   } else if (assigneeId) {
  //     recipients = [assigneeId];
  //   }

  //   // decide broadcast channel
  //   const broadcast = routingType === 'manual' ? [`notifications:org:${clientId}:unassigned`] : [];

  //   await Notifications.createAndBroadcast({
  //     type: 'NEW_TICKET',
  //     entityId: ticketId,
  //     actorId: customerId,
  //     recipientIds: recipients,
  //     payload: { title: firstMessage.slice(0, 120), routingType },
  //     broadcastChannels: broadcast
  //   });
  // } else {
  //   ensureQaSubscription(ticketId, sessionId);
  //   const qaCh = ablyRest.channels.get(`document-qa`);
  //   qaCh.publish('message', { query: firstMessage, id: ticketId, clientId: clientId });
  // }

  return { id: ticketId };
};