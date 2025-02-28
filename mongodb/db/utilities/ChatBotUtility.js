const ChatBotSchema = require("../schemas/ChatBotSchema");
const BaseUtility = require("./BaseUtility");
const WorkflowRuleUtility = require("./WorkflowRuleUtility");

class ChatBotUtility extends BaseUtility {
	constructor() {
		super(ChatBotSchema);
		this.populateFields = {
			rules: {
				multiple: true,
				utility: new WorkflowRuleUtility(),
				field: 'ruleIds',
				// getFields: {'id': 1, 'name': 1, "_id": 0 }
			},
		}
	}
}

module.exports = ChatBotUtility;
