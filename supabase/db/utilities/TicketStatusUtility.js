const BaseUtility = require("./BaseUtility");

class TicketStatusUtility extends BaseUtility {
  constructor() {
    super("ticket_status"); // Supabase table name
  }
}

module.exports = TicketStatusUtility;
