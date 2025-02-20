const BaseUtility = require("./BaseUtility");
const WorkflowUtility = require("./WorkflowUtility");
const WorkspaceUtility = require("./WorkspaceUtility");
const ClientUtility = require("./ClientUtility");

class EventWorkflowUtility extends BaseUtility {
  constructor() {
    super("event_workflow"); // Supabase table name

    this.populateFields = {
      workflow: {
        utility: new WorkflowUtility(),
        field: "workflow_id",
      },
      workspace: {
        utility: new WorkspaceUtility(),
        field: "workspace_id",
      },
      client: {
        utility: new ClientUtility(),
        field: "client_id",
      },
    };
  }
}

module.exports = EventWorkflowUtility;
