const BaseUtility = require("./BaseUtility");
const ClientUtility = require("./ClientUtility");
const UserUtility = require("./UserUtility");
const TagUtility = require("./TagUtility");

class CustomerUtility extends BaseUtility {
  constructor() {
    super("customers"); // Supabase table name
    this.populateFields = {
      company: {
        multiple: false,
        utility: new ClientUtility(),
        field: "client_id",
      },
      client: {
        multiple: false,
        utility: new ClientUtility(),
        field: "client_id",
      },
      addedBy: {
        multiple: false,
        utility: new UserUtility(),
        field: "created_by",
      },
      tags: {
        multiple: true,
        utility: new TagUtility(),
        field: "tag_ids",
      },
    };
  }
}

module.exports = CustomerUtility;
