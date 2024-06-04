const EventWorkflowSchema = require("../schemas/EventWorkflowSchema");
const BaseUtility = require("./BaseUtility");
const WorkflowUtility = require("./WorkflowUtility");
const WorkspaceUtility = require("./WorkspaceUtility");
const ClientUtility = require("./ClientUtility");

class EventWorkflowUtility extends BaseUtility {
  constructor() {
    super(EventWorkflowSchema);
      this.populateFields = {
        workflow: {
          utility: new WorkflowUtility(),
          field: 'workflowId',
          // getFields: {'id': 1, 'name': 1, "_id": 0 }
        },
        workspace: {
          utility: new WorkspaceUtility(),
          field: 'workspaceId',
          // getFields: {'id': 1, 'name': 1, "_id": 0 }
        },
        client: {
          utility: new ClientUtility(),
          field: 'clientId',
          // getFields: {'id': 1, 'name': 1, "_id": 0 }
        },
    };
  }
}

module.exports = EventWorkflowUtility;
