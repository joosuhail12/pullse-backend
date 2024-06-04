const { events: EVENTS, queue } = require('./config');
const { EventPublisher } = require('../Event');
const EventConstants = require("../../Socket/EventConstants");;


class CompanyEventPublisher extends EventPublisher {

  constructor() {
    super();
    this.queue = queue;
  }

  async created(company) {
    return this.publish(EVENTS.newCompany, { company });
  }

  async updated(company, updateValues) {
    return this.publish(EVENTS.companyUpdated, { company, updateValues });
  }

}


module.exports = CompanyEventPublisher;
