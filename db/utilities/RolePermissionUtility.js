const BaseUtility = require("./BaseUtility");

class RolePermissionUtility extends BaseUtility {
  constructor() {
    super("rolepermissions"); // Supabase table name
  }
}

module.exports = RolePermissionUtility;
