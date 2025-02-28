const TeamSchema = require("../schemas/TeamSchema");
const BaseUtility = require("./BaseUtility");

class TeamUtility extends BaseUtility {
  constructor() {
    super(TeamSchema);
  }
}

module.exports = TeamUtility;
