const BaseUtility = require("./BaseUtility");

class DemoRequestUtility extends BaseUtility {
  constructor() {
    super("demo_request"); // Supabase table name
  }
}

module.exports = DemoRequestUtility;
