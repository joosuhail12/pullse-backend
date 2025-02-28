const BaseUtility = require("./BaseUtility");

class ConversationUtility extends BaseUtility {
  constructor() {
    super("conversations"); // Supabase table name
  }
}

module.exports = ConversationUtility;
