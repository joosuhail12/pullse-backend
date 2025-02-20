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
        field: "roleIds",
        getFields: { id: 1, name: 1 },
      },
      client: {
        multiple: false,
        utility: new ClientUtility(),
        field: "clientId",
        getFields: { id: 1, name: 1 },
      },
      defaultWorkspace: {
        multiple: false,
        utility: new WorkspaceUtility(),
        field: "defaultWorkspaceId",
        getFields: { id: 1, name: 1 },
      },
      team: {
        multiple: false,
        utility: new TeamUtility(),
        field: "teamId",
        getFields: { id: 1, name: 1 },
      },
    };
  }
}

module.exports = UserUtility;
