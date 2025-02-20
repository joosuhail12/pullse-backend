const EmailDomainSchema = require("../schemas/EmailDomainSchema");
const BaseUtility = require("./BaseUtility");

class EmailDomainUtility extends BaseUtility {
  constructor() {
    super(EmailDomainSchema);
  }
}

module.exports = EmailDomainUtility;
