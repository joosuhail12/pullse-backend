const TicketStatusSchema = require("../schemas/TicketStatusSchema");
const BaseUtility = require("./BaseUtility");

class TicketStatusUtility extends BaseUtility {
  constructor() {
    super(TicketStatusSchema);
  }
}

module.exports = TicketStatusUtility;
