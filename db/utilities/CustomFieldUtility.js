const BaseUtility = require("./BaseUtility");

class CustomFieldUtility extends BaseUtility {
  constructor() {
    super("customFields"); // Supabase table name
  }
}

module.exports = CustomFieldUtility;
