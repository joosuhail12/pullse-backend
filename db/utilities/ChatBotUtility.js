const BaseUtility = require("./BaseUtility");
const WorkflowRuleUtility = require("./WorkflowRuleUtility");

class ChatBotUtility extends BaseUtility {
  constructor() {
    super("chatbots"); // Supabase table name
    this.populateFields = {
      rules: {
        multiple: true,
        utility: new WorkflowRuleUtility(),
        field: "ruleIds",
      },
    };
  }
}

module.exports = ChatBotUtility;
