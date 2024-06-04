const { events: EVENTS, queue } = require('./config');
const { EventPublisher } = require('../Event');


class WorkflowEventPublisher extends EventPublisher {

  constructor() {
    super();
    this.queue = queue;
  }

  async created(company) {
    return this.publish(EVENTS.created, { company });
  }

  async updated(company, updateValues) {
    return this.publish(EVENTS.companyUpdated, { company, updateValues });
  }

  async newTicket(data) {
    return this.publish(EVENTS.newTicket, data);
  }

  async ticketUpdated(data) {
    return this.publish(EVENTS.ticketUpdated, data);
  }

  async newMessage(data) {
    return this.publish(EVENTS.newMessage, data);
  }

  async ticketClosed(data) {
    return this.publish(EVENTS.ticketClosed, data);
  }

}


module.exports = WorkflowEventPublisher;
