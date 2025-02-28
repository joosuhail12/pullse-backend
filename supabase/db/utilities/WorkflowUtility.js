const WorkflowRuleUtility = require("./WorkflowRuleUtility");
const WorkflowActionUtility = require("./WorkflowActionUtility");
const BaseUtility = require("./BaseUtility");

class WorkflowUtility extends BaseUtility {
  constructor() {
    super("workflow"); // Supabase table name
    this.populateFields = {
      rules: {
        multiple: true,
        utility: new WorkflowRuleUtility(),
        field: "rule_ids",
      },
      actions: {
        multiple: true,
        utility: new WorkflowActionUtility(),
        field: "action_ids",
      },
    };
  }
}

module.exports = WorkflowUtility;
