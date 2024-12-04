const UserRoleSchema = require("../schemas/UserRoleSchema");
const BaseUtility = require("./BaseUtility");

class UserRoleUtility extends BaseUtility {
    constructor() {
        super(UserRoleSchema);
    }
}

module.exports = UserRoleUtility;
