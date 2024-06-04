const ConversationSchema = require("../schemas/ConversationSchema");
const BaseUtility = require("./BaseUtility");

class ConversationUtility extends BaseUtility {
	constructor() {
		super(ConversationSchema);
	}
}

module.exports = ConversationUtility;
