const BaseUtility = require("./BaseUtility");

class WorkflowActionUtility extends BaseUtility {
  constructor() {
    super("workflow_action"); // Supabase table name
  }
}

module.exports = WorkflowActionUtility;
