const BaseUtility = require("./BaseUtility");

class UserRoleUtility extends BaseUtility {
    constructor() {
        super("user_role"); // Supabase table name
    }
}

module.exports = UserRoleUtility;
