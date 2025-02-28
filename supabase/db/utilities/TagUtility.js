const BaseUtility = require("./BaseUtility");

class TagUtility extends BaseUtility {
  constructor() {
    super("tag"); // Supabase table name
  }
}

module.exports = TagUtility;
