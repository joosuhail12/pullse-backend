const { Engine } = require('json-rules-engine');
const WorkflowEngine = require('./WorkflowEngine');
const { v4: uuid, validate: uuidValidate } = require('uuid');

// Custom between operator
function betweenOperator(factValue, jsonValue) {
  const minimum = jsonValue[0];
  const maximum = jsonValue[1];
  return factValue >= minimum && factValue <= maximum;
}

// Custom startsWith operator
function startsWithOperator(factValue, jsonValue) {
  const substring = jsonValue;
  return factValue.startsWith(substring);
}

// Custom endsWith operator
function endsWithOperator(factValue, jsonValue) {
  const substring = jsonValue;
  return factValue.endsWith(substring);
}

class RulesEngine {

  constructor() {
    this.Engine = new Engine();
  }

  addWorkflow(workflow) {
    // Register custom operators
    this.Engine.addOperator('between', betweenOperator);
    this.Engine.addOperator('startsWith', startsWithOperator);
    this.Engine.addOperator('endsWith', endsWithOperator);

    let rules = workflow.rules;
    let conditions = {};
    for (let rule of rules) {
      rule.properties.forEach((property) => {
        let path = `$.${property.field}`;
        if (uuidValidate(property.resource)) {
          path = `$.customFields.${property.field}`;
        }
        let condition = {
          id: property._id,
          fact: property.resource,
          operator: property.operator,
          value: property.value[0] ? property.value[0]: property.value,
          path
        };
        if (!conditions[rule.matchType]) {
          conditions[rule.matchType] = [];
        }
        conditions[rule.matchType].push(condition);
      });
    }
    return this.Engine.addRule({
      name: workflow.id,
      conditions,
      event: {
        type: 'workflow',
        params: {
          workflow_id: workflow.id,
        },
      },
      onSuccess: async (event, almanac) => {
        let data = {
          ticket: await almanac.factValue('ticket'),
          customer: await almanac.factValue('customer'),
          company: await almanac.factValue('company'),
        };
        let workflowEnginInst = new WorkflowEngine()
        await workflowEnginInst.executeWorkflow(workflow, data);
        console.log("Execute workflow", event, almanac, workflow);
        return Promise.resolve();
      }
    });
  }

  run(data) {
    return this.Engine.run(data).then((results) => {
      console.log("Executed workflow result:", JSON.stringify(results));
      return Promise.resolve(results);
    });
  }
}

module.exports = RulesEngine;
