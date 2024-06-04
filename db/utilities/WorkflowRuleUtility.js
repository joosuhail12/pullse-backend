const WorkflowRuleSchema = require("../schemas/WorkflowRuleSchema");
const BaseUtility = require("./BaseUtility");

class WorkflowRuleUtility extends BaseUtility {
  constructor() {
    super(WorkflowRuleSchema);
  }
}

module.exports = WorkflowRuleUtility;
