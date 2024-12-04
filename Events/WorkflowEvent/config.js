module.exports = {
  events: {
    created: 'new_workflow_created',
    updated: 'new_workflow_updated',
    newTicket: 'new_ticket',
    ticketUpdated: 'ticket_updated',
    newCompany: 'new_company',
    companyUpdated: 'company_updated',
    newMessage: 'new_message',
    ticketClosed: 'ticket_closed',
  },
  queue: 'workflow_events'
};