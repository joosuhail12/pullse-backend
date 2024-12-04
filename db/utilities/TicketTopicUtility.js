const TicketTopicSchema = require("../schemas/TicketTopicSchema");
const BaseUtility = require("./BaseUtility");

class TicketTopicUtility extends BaseUtility {
  constructor() {
    super(TicketTopicSchema);
  }
}

module.exports = TicketTopicUtility;
