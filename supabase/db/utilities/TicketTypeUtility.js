const BaseUtility = require("./BaseUtility");

class TicketTypeUtility extends BaseUtility {
  constructor() {
    super("ticket_type"); // Supabase table name
  }
}

module.exports = TicketTypeUtility;
