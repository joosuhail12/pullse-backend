const { events: EVENTS, queue } = require('./config');
const { EventPublisher } = require('../Event');
const EventConstants = require("../../Socket/EventConstants");;


class CustomerEventPublisher extends EventPublisher {

  constructor() {
    super();
    this.queue = queue;
  }

  async created(customer) {
    return this.publish(EVENTS.newCustomer , { customer });
  }

  async updated(customer, updateValues) {
    return this.publish(EVENTS.customerUpdated, { customer, updateValues });
  }

}

module.exports = CustomerEventPublisher;
