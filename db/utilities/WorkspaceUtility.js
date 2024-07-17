const WorkspaceSchema = require("../schemas/WorkspaceSchema");
const BaseUtility = require("./BaseUtility");
const ClientUtility = require("./ClientUtility");

class WorkspaceUtility extends BaseUtility {
  constructor() {
    super(WorkspaceSchema);
    this.populateFields = {
      client: {
        multiple: false,
        utility: new ClientUtility(),
        field: "clientId",
        getFields: { id: 1, workspace_alternate_id: 1, name: 1, _id: 0 },
        field: 'clientId',
        getFields: {'id': 1,'workspace_alternate_id': 1, 'name': 1, "_id": 0 }
      },
    };
  }
}

module.exports = WorkspaceUtility;
