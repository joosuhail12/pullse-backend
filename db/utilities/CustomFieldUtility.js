const CustomFieldSchema = require("../schemas/CustomFieldSchema");
const BaseUtility = require("./BaseUtility");

class CustomFieldUtility extends BaseUtility {
  constructor() {
    super(CustomFieldSchema);
  }
}

module.exports = CustomFieldUtility;
