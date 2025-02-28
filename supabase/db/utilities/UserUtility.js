const BaseUtility = require("./BaseUtility");
const TeamUtility = require("./TeamUtility");
const ClientUtility = require("./ClientUtility");
const WorkspaceUtility = require("./WorkspaceUtility");
const UserRoleUtility = require("./UserRoleUtility");

class UserUtility extends BaseUtility {
  constructor() {
    super("users"); // Supabase table name
    this.populateFields = {
      roles: {
        multiple: true,
        utility: new UserRoleUtility(),
        field: "role_ids",
        getFields: { id: 1, name: 1 },
      },
      client: {
        multiple: false,
        utility: new ClientUtility(),
        field: "client_id",
        getFields: { id: 1, name: 1 },
      },
      defaultWorkspace: {
        multiple: false,
        utility: new WorkspaceUtility(),
        field: "default_workspace_id",
        getFields: { id: 1, name: 1 },
      },
      team: {
        multiple: false,
        utility: new TeamUtility(),
        field: "team_id",
        getFields: { id: 1, name: 1 },
      },
    };
  }
}

module.exports = UserUtility;
