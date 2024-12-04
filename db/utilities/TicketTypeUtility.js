const TicketTypeSchema = require("../schemas/TicketTypeSchema");
const BaseUtility = require("./BaseUtility");

class TicketTypeUtility extends BaseUtility {
  constructor() {
    super(TicketTypeSchema);
  }
}

module.exports = TicketTypeUtility;
