const WorkspacePermissionSchema = require("../schemas/WorkspacePermission");
const BaseUtility = require("./BaseUtility");
const ClientUtility = require("./ClientUtility");
const UserUtility = require("./UserUtility");


class WorkspacePermissionUtility extends BaseUtility {
  constructor() {
    super(WorkspacePermissionSchema);
    this.populateFields = {
      client: {
        multiple: false,
        utility: new ClientUtility(),
        field: 'clientId',
        getFields: {'id': 1, 'name': 1, "_id": 0 }
      },
      user: {
        multiple: false,
        utility: new UserUtility(),
        field: 'userId',
        getFields: {'id': 1, 'name': 1, "_id": 0 }
      },
    };
  }
}

module.exports = WorkspacePermissionUtility;
