const BaseUtility = require("./BaseUtility");
const ClientUtility = require("./ClientUtility");

class WorkspaceUtility extends BaseUtility {
  constructor() {
    super("workspace"); // Supabase table name
    this.populateFields = {
      client: {
        multiple: false,
        utility: new ClientUtility(),
        field: "client_id",
        getFields: { id: 1, name: 1 },
      },
    };
  }
}

module.exports = WorkspaceUtility;
