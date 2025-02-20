const BaseUtility = require("./BaseUtility");

class TeamUtility extends BaseUtility {
  constructor() {
    super("team"); // Supabase table name
  }
}

module.exports = TeamUtility;
