const BaseUtility = require("./BaseUtility");

class TicketTypeUtility extends BaseUtility {
  constructor() {
    super("ticketTypes"); // Supabase table name
  }
}

module.exports = TicketTypeUtility;
