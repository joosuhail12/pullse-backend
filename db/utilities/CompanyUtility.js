const CompanySchema = require("../schemas/CompanySchema");
const BaseUtility = require("./BaseUtility");
const TagUtility = require("./TagUtility");
const ClientUtility = require("./ClientUtility");
const UserUtility = require("./UserUtility");


class CompanyUtility extends BaseUtility {
  constructor() {
    super(CompanySchema);
    this.populateFields = {
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

module.exports = CompanyUtility;
