const BaseUtility = require("./BaseUtility");

class RolePermissionUtility extends BaseUtility {
  constructor() {
    super("role_permission"); // Supabase table name
  }
}

module.exports = RolePermissionUtility;
