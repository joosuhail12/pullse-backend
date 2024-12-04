const EmailTemplateSchema = require("../schemas/EmailTemplateSchema");
const BaseUtility = require("./BaseUtility");

class EmailTemplateUtility extends BaseUtility {
  constructor() {
    super(EmailTemplateSchema);
  }
}

module.exports = EmailTemplateUtility;
