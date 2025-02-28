const WorkflowActionSchema = require("../schemas/WorkflowActionSchema");
const BaseUtility = require("./BaseUtility");

class WorkflowActionUtility extends BaseUtility {
  constructor() {
    super(WorkflowActionSchema);
  }
}

module.exports = WorkflowActionUtility;
