const RolePermissionSchema = require("../schemas/RolePermissionSchema");
const BaseUtility = require("./BaseUtility");

class RolePermissionUtility extends BaseUtility {
  constructor() {
    super(RolePermissionSchema);
  }
}

module.exports = RolePermissionUtility;
