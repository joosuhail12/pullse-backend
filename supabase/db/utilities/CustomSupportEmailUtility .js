const BaseUtility = require("./BaseUtility");

class CustomSupportEmailUtility extends BaseUtility {
  constructor() {
    super("custom_support_email"); // Supabase table name
  }
}

module.exports = CustomSupportEmailUtility;
