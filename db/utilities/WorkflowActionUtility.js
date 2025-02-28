const BaseUtility = require("./BaseUtility");

class WorkflowActionUtility extends BaseUtility {
  constructor() {
    super("workflowActions"); // Supabase table name
  }
}

module.exports = WorkflowActionUtility;
