const BaseUtility = require("./BaseUtility");

class UserTokenUtility extends BaseUtility {
  constructor() {
    super("user_token"); // Supabase table name
  }
}

module.exports = UserTokenUtility;
