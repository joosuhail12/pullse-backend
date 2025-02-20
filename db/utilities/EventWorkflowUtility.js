const BaseUtility = require("./BaseUtility");
const WorkflowUtility = require("./WorkflowUtility");
const WorkspaceUtility = require("./WorkspaceUtility");
const ClientUtility = require("./ClientUtility");

class EventWorkflowUtility extends BaseUtility {
  constructor() {
    super("eventWorkflows"); // Supabase table name

    this.populateFields = {
      workflow: {
        utility: new WorkflowUtility(),
        field: "workflowId",
      },
      workspace: {
        utility: new WorkspaceUtility(),
        field: "workspaceId",
      },
      client: {
        utility: new ClientUtility(),
        field: "clientId",
      },
    };
  }
}

module.exports = EventWorkflowUtility;
