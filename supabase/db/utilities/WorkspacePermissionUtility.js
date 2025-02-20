const BaseUtility = require("./BaseUtility");
const ClientUtility = require("./ClientUtility");
const UserUtility = require("./UserUtility");

class WorkspacePermissionUtility extends BaseUtility {
  constructor() {
    super("workspace_permission"); // Supabase table name
    this.populateFields = {
      client: {
        multiple: false,
        utility: new ClientUtility(),
        field: "client_id",
      },
      user: {
        multiple: false,
        utility: new UserUtility(),
        field: "user_id",
      },
    };
  }
}

module.exports = WorkspacePermissionUtility;
