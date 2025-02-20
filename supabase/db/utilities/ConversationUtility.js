const BaseUtility = require("./BaseUtility");

class ConversationUtility extends BaseUtility {
  constructor() {
    super("conversation"); // Supabase table name
  }
}

module.exports = ConversationUtility;
