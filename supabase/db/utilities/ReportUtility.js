const BaseUtility = require("./BaseUtility");

class ReportUtility extends BaseUtility {
  constructor() {
    super("report"); // Supabase table name
  }
}

module.exports = ReportUtility;
