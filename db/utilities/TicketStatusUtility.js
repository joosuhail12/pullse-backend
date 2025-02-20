const BaseUtility = require("./BaseUtility");

class TicketStatusUtility extends BaseUtility {
  constructor() {
    super("ticketStatuses"); // Supabase table name
  }
}

module.exports = TicketStatusUtility;
