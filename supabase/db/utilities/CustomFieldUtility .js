const BaseUtility = require("./BaseUtility");

class CustomFieldUtility extends BaseUtility {
  constructor() {
    super("custom_field"); // Supabase table name
  }
}

module.exports = CustomFieldUtility;
