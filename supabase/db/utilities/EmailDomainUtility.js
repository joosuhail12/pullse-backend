const BaseUtility = require("./BaseUtility");

class EmailDomainUtility extends BaseUtility {
  constructor() {
    super("email_domain"); // Supabase table name
  }
}

module.exports = EmailDomainUtility;
