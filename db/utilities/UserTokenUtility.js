const BaseUtility = require("./BaseUtility");

class UserTokenUtility extends BaseUtility {
  constructor() {
    super("userTokens"); // Supabase table name
  }
}

module.exports = UserTokenUtility;
