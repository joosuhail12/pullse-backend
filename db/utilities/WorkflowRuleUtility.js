const BaseUtility = require("./BaseUtility");

class WorkflowRuleUtility extends BaseUtility {
  constructor() {
    super("workflowRules"); // Supabase table name
  }
}

module.exports = WorkflowRuleUtility;
