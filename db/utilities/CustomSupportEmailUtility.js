const BaseUtility = require("./BaseUtility");

class CustomSupportEmailUtility extends BaseUtility {
  constructor() {
    super("customSupportEmails"); // Supabase table name
  }
}

module.exports = CustomSupportEmailUtility;

