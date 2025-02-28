const BaseUtility = require("./BaseUtility");
const ChatBotUtility = require("./ChatBotUtility");

class ChatBotDocumentUtility extends BaseUtility {
  constructor() {
    super("chatbotDocuments"); // Supabase table name
    this.populateFields = {
      chatBots: {
        multiple: true,
        utility: new ChatBotUtility(),
        field: "chatbotsIds",
        getFields: ["id", "name"],
      },
    };
  }
}

module.exports = ChatBotDocumentUtility;
