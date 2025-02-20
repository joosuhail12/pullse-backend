const BaseUtility = require("./BaseUtility");

class EmailTemplateUtility extends BaseUtility {
  constructor() {
    super("emailTemplates"); // Supabase table name
  }
}

module.exports = EmailTemplateUtility;
