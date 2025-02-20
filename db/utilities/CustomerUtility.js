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
        field: "clientId",
      },
      client: {
        multiple: false,
        utility: new ClientUtility(),
        field: "clientId",
      },
      addedBy: {
        multiple: false,
        utility: new UserUtility(),
        field: "createdBy",
      },
      tags: {
        multiple: true,
        utility: new TagUtility(),
        field: "tagIds",
      },
    };
  }
}

module.exports = CustomerUtility;
