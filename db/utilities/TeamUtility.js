const BaseUtility = require("./BaseUtility");

class TeamUtility extends BaseUtility {
  constructor() {
    super("teams"); // Supabase table name
  }
}

module.exports = TeamUtility;
