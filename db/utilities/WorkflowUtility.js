const WorkflowSchema = require("../schemas/WorkflowSchema");
const WorkflowRuleUtility = require("./WorkflowRuleUtility");
const WorkflowActionUtility = require("./WorkflowActionUtility");
const BaseUtility = require("./BaseUtility");

class WorkflowUtility extends BaseUtility {
  constructor() {
    super(WorkflowSchema);
    this.populateFields = {
        rules: {
          multiple: true,
          utility: new WorkflowRuleUtility(),
          field: 'ruleIds',
          // getFields: {'id': 1, 'name': 1, "_id": 0 }
        },
        actions: {
          multiple: true,
          utility: new WorkflowActionUtility(),
          field: 'actionIds',
          // getFields: {'id': 1, 'name': 1, "_id": 0 }
        },
    };
  }
}

module.exports = WorkflowUtility;
