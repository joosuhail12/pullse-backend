const TagSchema = require("../schemas/TagSchema");
const BaseUtility = require("./BaseUtility");

class TagUtility extends BaseUtility {
  constructor() {
    super(TagSchema);
  }
}

module.exports = TagUtility;
