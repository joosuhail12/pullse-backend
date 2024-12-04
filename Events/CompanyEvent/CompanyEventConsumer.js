const { events: EVENTS, queue } = require('./config');
const { EventConsumer } = require('../Event');
const EventConstants = require("../../Socket/EventConstants");;


class CompanyEventConsumer extends EventConsumer {
  constructor() {
    this.queue = queue;
  }

}


module.exports = CompanyEventConsumer;
