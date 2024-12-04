let entities = require('./entities');
let attributes = require('./attributes');
let operators = require('./fieldOperators');
let actions = require('./actions');
let events = require('./events');
let getAttributeOptions = require('../commonUtils').getAttributeOptions;
let CustomFieldService = require('../../services/CustomFieldService');


async function getEntities(workspaceId, clientId) {
  let customFieldServiceInst = new CustomFieldService();
  for (let entity of entities) {
    let customAttributes = await customFieldServiceInst.paginate({ entityType: entity.id, workspaceId, clientId }, false);
    customAttributes = customAttributes.map(customAttribute => {
      if (customAttribute.fieldType == "multiselect") {
        customAttribute.fieldType = "multi-select";
      }
      if (customAttribute.fieldType == "select") {
        customAttribute.fieldType = "list";
      }
      return customAttribute;
    });
    for (let attribute of attributes[entity.id]) {
      if (['list', 'multi-select'].includes(attribute.fieldType)) {
        attribute.options = await getAttributeOptions(attribute.id, { workspaceId, clientId });
        console.log("Got options for attribute: ", attribute.options);
      }
    }
    entity.attributes = attributes[entity.id].concat(customAttributes);
    // entity.customAttributes = customAttributes;
    // entity.attributes = [...attributes[entity.id], ...customAttributes];

  }
  return  { entities, operators, actions };
}

async function getWorkflowEvents(workspaceId, clientId) {
  return  { events };
}


module.exports = {
  getEntities,
  getWorkflowEvents
};
