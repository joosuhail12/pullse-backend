const { events: EVENTS, queue } = require('./config');
const { EventConsumer } = require('../Event');
const EventConstants = require("../../Socket/EventConstants");;


class CustomerEventConsumer extends EventConsumer {
  constructor() {
    this.queue = queue;
  }

}

module.exports = CustomerEventConsumer;
