const BaseUtility = require("./BaseUtility");

class EmailDomainUtility extends BaseUtility {
  constructor() {
    super("emailDomains"); // Supabase table name
  }
}

module.exports = EmailDomainUtility;
