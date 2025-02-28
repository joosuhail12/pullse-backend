const BaseUtility = require("./BaseUtility");

class DemoRequestUtility extends BaseUtility {
  constructor() {
    super("demoRequests"); // Supabase table name
  }
}

module.exports = DemoRequestUtility;
