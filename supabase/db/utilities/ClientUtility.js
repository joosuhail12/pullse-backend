const BaseUtility = require("./BaseUtility");

class ClientUtility extends BaseUtility {
  constructor() {
    super("clients"); // Supabase table name
  }
}

module.exports = ClientUtility;
