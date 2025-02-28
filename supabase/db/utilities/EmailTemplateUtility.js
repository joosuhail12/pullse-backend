const BaseUtility = require("./BaseUtility");

class EmailTemplateUtility extends BaseUtility {
  constructor() {
    super("email_template"); // Supabase table name
  }
}

module.exports = EmailTemplateUtility;
