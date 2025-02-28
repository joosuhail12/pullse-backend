const BaseUtility = require("./BaseUtility");
const ChatBotUtility = require("./ChatBotUtility");

class ChatBotDocumentUtility extends BaseUtility {
  constructor() {
    super("chatbot_document"); // Supabase table name
    this.populateFields = {
      chatBots: {
        multiple: true,
        utility: new ChatBotUtility(),
        field: "chatbot_ids",
        getFields: ["id", "name"],
      },
    };
  }
}

module.exports = ChatBotDocumentUtility;
