const BaseUtility = require("./BaseUtility");

class TicketTopicUtility extends BaseUtility {
  constructor() {
    super("ticketTopics"); // Supabase table name
  }
}

module.exports = TicketTopicUtility;
