const CannedResponseSchema = require("../schemas/CannedResponseSchema");
const BaseUtility = require("./BaseUtility");

class CannedResponseUtility extends BaseUtility {
  constructor() {
    super(CannedResponseSchema);
  }
}

module.exports = CannedResponseUtility;
