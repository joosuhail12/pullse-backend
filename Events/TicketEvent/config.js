module.exports = {
  events: {
    newTicket: 'ticket_created',
    ticketUpdated: 'ticket_updated',
    ticketClosed: 'ticket_closed',
    summarizeConversation: 'conversation_summarized',
    ticketTeamAssigned: 'ticket_team_assigned',
    ticketReassigned: 'ticket_reassigned',
  },
  queue: 'events_queue'
};