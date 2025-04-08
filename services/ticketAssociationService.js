// ticketAssociationService.js
const { v4: uuidv4 } = require('uuid');
const Ably = require('ably');
const { ABLY_API_KEY } = process.env;
const ably = new Ably.Realtime({ key: ABLY_API_KEY });
const { createClient } = require("@supabase/supabase-js");



function isTicketReusable(ticket) {
  return ticket.status === 'open';
}

async function getOrCreateVisitor(sessionId, widgetKey) {
  console.log('✅ Getting or creating visitor', sessionId, widgetKey);
  const { data: visitor, error } = await supabase
    .from('visitors')
    .select('*')
    .eq('sessionId', sessionId)
    .eq('widgetKey', widgetKey)
    .maybeSingle();

  if (visitor) return visitor;

  const newVisitor = {
    id: uuidv4(),
    sessionId,
    widgetKey,
  };
  console.log('✅ New visitor', newVisitor);
  const { data: insertedVisitor, error: insertError } = await supabase
    .from('visitors')
    .insert([newVisitor])
    .select()
    .single();

  if (insertError) throw insertError;

  return insertedVisitor;
}
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);


const CHAT_CHANNEL_KEY = 'chat';

async function handleIncomingChatMessage({ sessionId, customerId, text, source, ticketId = null, widgetKey = CHAT_CHANNEL_KEY, }) {
  try {
    if (ticketId) {
      console.log('✅ Handling incoming chat message for existing ticket', ticketId);
      // Fast path: use ticket directly
      await supabase
        .from('tickets')
        .update({ createdAt: new Date().toISOString() })
        .eq('id', ticketId);

      // Store the message
      const { data: message, error: messageError } = await supabase.from('conversations').insert([
        {
          ticketId,
          userType: source === 'agent' ? 'agent' : 'customer',
          message: text,
          type: 'chat',
          userType: source
        },
      ]).select('*').single();

      if (messageError) throw messageError;


      return { ticketId };
    }

    // 1. Lookup the predefined chat channel
    const { data: chatChannel, error: channelError } = await supabase
      .from('channels')
      .select('*')
      .eq('name', widgetKey)
      .single();

    if (channelError || !chatChannel) throw new Error('Chat channel not found', channelError);
    // 2. Try to find an open or recent ticket for this customer
    let existingTicket = null;
    console.log('✅ customerId', customerId);
    if (customerId) {
      // Search ticket by customerId
      const { data } = await supabase
        .from('tickets')
        .select('*')
        .eq('customerId', customerId)
        .or(`status.eq.open,createdAt.gte.${new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()}`)
        .order('createdAt', { ascending: false })
        .limit(1)
        .maybeSingle();
      existingTicket = data;
    } else {
      // Use sessionId + widgetKey to find visitor
      const visitor = await getOrCreateVisitor(sessionId, widgetKey);
      // {   "sessionId": "session_abc123", "text": "Hello from the dev console!", "source": "customer" }
      // {   "sessionId": "session_abc123",   "text": "This is an agent test message",   "source": "agent", "ticketId": "abf2a78f-c6f7-4624-9cb8-d9de82eb351b" }
      // Search ticket by visitorId
      const { data: recentTickets } = await supabase
        .from('tickets')
        .select('*')
        .eq('visitorId', visitor.id)
        .order('createdAt', { ascending: false })
        .limit(1);
      console.log('✅ recentTickets', recentTickets[0]);
      if (recentTickets && isTicketReusable(recentTickets[0])) {
        existingTicket = recentTickets[0];
      }
    }
    if (existingTicket) {
      ticketId = existingTicket.id;

      await supabase
        .from('tickets')
        .update({ createdAt: new Date().toISOString() })
        .eq('id', ticketId);
    } else {
      const { data: mapping } = await supabase
        .from('team_channel_mappings')
        .select('team_id')
        .eq('channel_id', chatChannel.id)
        .maybeSingle();

      const visitor = customerId ? null : await getOrCreateVisitor(sessionId, widgetKey);

      const newTicket = {
        id: uuidv4(),
        customerId: null,
        visitorId: visitor?.id || null,
        status: 'open',
        sourceChannelId: chatChannel.id,
        assignedTeamId: mapping?.team_id ?? null,
        createdAt: new Date().toISOString(),
        aiEnabled: true,
        title: 'New Ticket',
      };
      console.log('✅ newTicket', newTicket);
      const { data: createdTicket, error: ticketError } = await supabase
        .from('tickets')
        .insert([newTicket])
        .select('*')
        .single();

      if (ticketError) throw ticketError;
      ticketId = createdTicket.id;
    }

    // 4. Store the message
    const { data: message, error: messageError } = await supabase.from('conversations').insert([
      {
        ticketId,
        userType: source === 'agent' ? 'agent' : 'customer',
        message: text,
        type: 'chat',
        userType: source
        // workspaceId: workspaceId,
        // clientId: clientId,
      },
    ]).select('*').single();

    if (messageError) throw messageError;
    // 5. Publish to agent-facing channel
    const agentChannel = ably.channels.get(`ticket:${ticketId}`);
    await agentChannel.publish('new_message', {
      ticketId,
      text,
      senderType: source,
      timestamp: new Date().toISOString(),
    });
    // 6. Optional: hook for future AI response logic
    if (source === 'customer') {
      // triggerAutoResponder(ticket_id, text); // Future: Crew AI hook
    }

    return { ticketId };
  } catch (error) {
    console.error('❌ Error handling incoming chat message:', error);
    throw error;
  }
}

module.exports = { handleIncomingChatMessage };
