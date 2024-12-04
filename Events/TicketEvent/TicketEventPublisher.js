const { events: EVENTS, queue } = require('./config');
const { EventPublisher } = require('../Event');

class TicketEventPublisher extends EventPublisher {

  constructor() {
    super();
    this.queue = queue;
  }

  async created(ticket) {
    return this.publish(EVENTS.newTicket, { ticket });
  }

  async updated(ticket, updateValues) {
    return this.publish(EVENTS.ticketUpdated, { ticket, updateValues });
  }

  async closed(ticket) {
    return this.publish(EVENTS.ticketClosed, { ticket });
  }

  async summarizeConversation(ticket, user) {
    return this.publish(EVENTS.summarizeConversation, { ticket, user });
  }

}

module.exports = TicketEventPublisher;
