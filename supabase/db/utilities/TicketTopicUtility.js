const BaseUtility = require("./BaseUtility");

class TicketTopicUtility extends BaseUtility {
  constructor() {
    super("ticket_topic"); // Supabase table name
  }
}

module.exports = TicketTopicUtility;
