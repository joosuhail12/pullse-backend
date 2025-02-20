const BaseUtility = require("./BaseUtility");
const ClientUtility = require("./ClientUtility");
const UserUtility = require("./UserUtility");

class WorkspacePermissionUtility extends BaseUtility {
  constructor() {
    super("workspacePermissions"); // Supabase table name
    this.populateFields = {
      client: {
        multiple: false,
        utility: new ClientUtility(),
        field: "clientId",
      },
      user: {
        multiple: false,
        utility: new UserUtility(),
        field: "userId",
      },
    };
  }
}

module.exports = WorkspacePermissionUtility;
