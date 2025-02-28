const BaseUtility = require("./BaseUtility");

class WorkflowRuleUtility extends BaseUtility {
  constructor() {
    super("workflow_rule"); // Supabase table name
  }
}

module.exports = WorkflowRuleUtility;
