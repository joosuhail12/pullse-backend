const BaseUtility = require("./BaseUtility");

class ReportUtility extends BaseUtility {
  constructor() {
    super("reports"); // Supabase table name
  }
}

module.exports = ReportUtility;
