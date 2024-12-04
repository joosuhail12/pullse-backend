const CustomerSchema = require("../schemas/CustomerSchema");
const BaseUtility = require("./BaseUtility");
const TagUtility = require("./TagUtility");
const ClientUtility = require("./ClientUtility");
const UserUtility = require("./UserUtility");

class CustomerUtility extends BaseUtility {
  constructor() {
    super(CustomerSchema);
    this.populateFields = {
      companyId: {
        multiple: false,
        utility: new ClientUtility(),
        field: 'clientId',
        getFields: {'id': 1, 'name': 1, "_id": 0 }
      },
      client: {
          multiple: false,
          utility: new ClientUtility(),
          field: 'clientId',
          getFields: {'id': 1, 'name': 1, "_id": 0 }
      },
      addedBy: {
          multiple: false,
          utility: new UserUtility(),
          field: 'createdBy',
          getFields: {'id': 1, 'name': 1, "_id": 0 }
      },
      tags: {
          multiple: true,
          utility: new TagUtility(),
          field: 'tagIds',
          getFields: {'id': 1, 'name': 1, "_id": 0 }
      },
    };
  }
}

module.exports = CustomerUtility;
