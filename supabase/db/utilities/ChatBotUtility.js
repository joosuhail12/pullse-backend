const BaseUtility = require("./BaseUtility");
const WorkflowRuleUtility = require("./WorkflowRuleUtility");

class ChatBotUtility extends BaseUtility {
  constructor() {
    super("chatbot"); // Supabase table name
    this.populateFields = {
      rules: {
        multiple: true,
        utility: new WorkflowRuleUtility(),
        field: "rule_ids",
      },
    };
  }
}

module.exports = ChatBotUtility;
