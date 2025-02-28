const ReportSchema = require("../schemas/ReportSchema");
const BaseUtility = require("./BaseUtility");

class ReportUtility extends BaseUtility {
  constructor() {
    super(ReportSchema);
  }
}

module.exports = ReportUtility;
