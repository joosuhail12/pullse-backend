const BaseUtility = require("./BaseUtility");

class UserRoleUtility extends BaseUtility {
    constructor() {
        super("userRoles"); // Supabase table name
    }
}

module.exports = UserRoleUtility;
