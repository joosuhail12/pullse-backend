const WorkflowRuleUtility = require("./WorkflowRuleUtility");
const WorkflowActionUtility = require("./WorkflowActionUtility");
const BaseUtility = require("./BaseUtility");

class WorkflowUtility extends BaseUtility {
  constructor() {
    super("workflows"); // Supabase table name
    this.populateFields = {
      rules: {
        multiple: true,
        utility: new WorkflowRuleUtility(),
        field: "ruleIds",
      },
      actions: {
        multiple: true,
        utility: new WorkflowActionUtility(),
        field: "actionIds",
      },
    };
  }
}

module.exports = WorkflowUtility;
