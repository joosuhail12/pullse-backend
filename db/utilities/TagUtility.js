const BaseUtility = require("./BaseUtility");

class TagUtility extends BaseUtility {
  constructor() {
    super("tags"); // Supabase table name
  }
}

module.exports = TagUtility;
