const CustomSupportEmailSchema = require("../schemas/CustomSupportEmailSchema");
const BaseUtility = require("./BaseUtility");

class CustomSupportEmailUtility extends BaseUtility {
  constructor() {
    super(CustomSupportEmailSchema);
  }
}

module.exports = CustomSupportEmailUtility;
