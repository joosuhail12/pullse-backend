const BaseUtility = require("./BaseUtility");
const ClientUtility = require("./ClientUtility");
const UserUtility = require("./UserUtility");
const TagUtility = require("./TagUtility");

class CompanyUtility extends BaseUtility {
  constructor() {
    super("company"); // Supabase table name

    this.populateFields = {
      client: {
        multiple: false,
        utility: new ClientUtility(),
        field: "client_id",
        getFields: { id: 1, name: 1 }
      },
      addedBy: {
        multiple: false,
        utility: new UserUtility(),
        field: "created_by",
        getFields: { id: 1, name: 1 }
      },
      tags: {
        multiple: true,
        utility: new TagUtility(),
        field: "tag_ids",
        getFields: { id: 1, name: 1 }
      }
    };
  }
}

module.exports = CompanyUtility;
