const ChatBotDocumentSchema = require("../schemas/ChatBotDocumentSchema");
const BaseUtility = require("./BaseUtility");
const ChatBotUtility = require("./ChatBotUtility");
class ChatBotDocumentUtility extends BaseUtility {
	constructor() {
		super(ChatBotDocumentSchema);
		this.populateFields = {
			chatBots: {
				multiple: true,
				utility: new ChatBotUtility(),
				field: 'chatbotIds',
				getFields: {'id': 1, 'name': 1, "_id": 0 }
			},
		};
	}

}

module.exports = ChatBotDocumentUtility;
