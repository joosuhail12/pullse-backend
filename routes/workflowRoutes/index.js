const Handler = require('../../handlers/WorkflowHandler');

const authMiddlewares = require('../../middlewares/auth');
const AuthType = require('../../constants/AuthType');

async function activate(app) {

  let handler = new Handler();

  let base_url = '/api/workflow';

  app.route({
    url: base_url + '/folder',
    method: 'POST',
    name: "CreateWorkflowFolder",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      tags: ['Workflow'],
      summary: 'Create Workflow Folder',
      description: 'API to create workflow folder.',
      body: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string', minLength: 2 },
          description: { type: 'string', minLength: 2 },
        },
      },
      query: {
        type: 'object',
        required: ['workspace_id'],
        properties: {
          workspace_id: { type: 'string' },
        },
      },
    },
    handler: async (req, reply) => {
      return handler.createWorkflowFolder(req, reply);
    }
  });


  app.route({
    url: base_url + '/folder',
    method: 'GET',
    name: "GetWorkflowFolders",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      tags: ['Workflow'],
      summary: 'Get Workflow Folders',
      description: 'API to get workflow folders.',
      query: {
        type: 'object',
        required: ['workspace_id'],
        properties: {
          workspace_id: { type: 'string' },
        },
      },
    },
    handler: async (req, reply) => {
      return handler.getWorkflowFolders(req, reply);
    }
  });


  app.route({
    url: base_url + '/folder/:id',
    method: 'DELETE',
    name: "DeleteWorkflowFolder",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      tags: ['Workflow'],
      summary: 'Delete Workflow Folder',
      description: 'API to delete workflow folder.',
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
        },
      },
    },
    handler: async (req, reply) => {
      return handler.deleteWorkflowFolder(req, reply);
    }
  });

  app.route({
    url: base_url + '/folder/:id',
    method: 'PATCH',
    name: "UpdateWorkflowFolder",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      tags: ['Workflow'],
      summary: 'Update Workflow Folder',
      description: 'API to update workflow folder.',
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
        },
      },
      body: {
        type: 'object',
        minProperties: 1,
        properties: {
          name: { type: 'string', minLength: 2 },
          description: { type: 'string', minLength: 2 },
        },
      },
    },
    handler: async (req, reply) => {
      return handler.updateWorkflowFolder(req, reply);
    }
  });

  app.route({
    url: base_url,
    method: 'POST',
    name: "CreateWorkflow",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      tags: ['Workflow'],
      summary: 'Create Workflow',
      description: 'API to create workflow.',
      query: {
        type: 'object',
        required: ['workspace_id'],
        properties: {
          workspace_id: { type: 'string' },
        },
      },
      body: {
        type: 'object',
        required: ['triggerType', 'triggerPosition', 'nodeId'],
        properties: {
          triggerType: { type: 'string', minLength: 2 },
          triggerPosition: {
            type: 'object',
            required: ['positionX', 'positionY'],
            properties: {
              positionX: { type: 'number' },
              positionY: { type: 'number' },
            },
          },
          nodeId: { type: 'string' },
        },
      },
    },
    handler: async (req, reply) => {
      return handler.createWorkflow(req, reply);
    }
  });

  app.route({
    url: base_url,
    method: 'GET',
    name: "GetAllWorkflows",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      tags: ['Workflow'],
      summary: 'Get All Workflows',
      description: 'API to get all workflows.',
      query: {
        type: 'object',
        required: ['workspace_id'],
        properties: {
          workspace_id: { type: 'string' },
        },
      },
    },
    handler: async (req, reply) => {
      return handler.getAllWorkflows(req, reply);
    }
  });

  app.route({
    url: base_url + '/:id',
    method: 'GET',
    name: "GetWorkflowById",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      tags: ['Workflow'],
      summary: 'Get Workflow By Id',
      description: 'API to get workflow by id.',
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
        },
      },
      query: {
        type: 'object',
        required: ['workspace_id'],
        properties: {
          workspace_id: { type: 'string' },
        },
      },
    },
    handler: async (req, reply) => {
      return handler.getWorkflowById(req, reply);
    }
  });

  app.route({
    url: base_url + '/:id',
    method: 'DELETE',
    name: "DeleteWorkflow",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      tags: ['Workflow'],
      summary: 'Delete Workflow',
      description: 'API to delete workflow.',
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
        },
      },
      query: {
        type: 'object',
        required: ['workspace_id'],
        properties: {
          workspace_id: { type: 'string' },
        },
      },
    },
    handler: async (req, reply) => {
      return handler.deleteWorkflow(req, reply);
    }
  });


  app.route({
    url: base_url + '/tags/:id',
    method: 'PATCH',
    name: "UpdateWorkflowTags",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      tags: ['Workflow'],
      summary: 'Update Workflow Tags',
      description: 'API to update workflow tags.',
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
        },
      },
      body: {
        type: 'object',
        required: ['tags'],
        properties: {
          tags: { type: 'array', items: { type: 'string' } },
        },
      },
    },
    handler: async (req, reply) => {
      return handler.updateWorkflowTags(req, reply);
    }
  });

  app.route({
    url: base_url + '/:id',
    method: 'POST',
    name: "UpdateWorkflow",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      tags: ['Workflow'],
      summary: 'Update Workflow',
      description: 'API to update workflow.',
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
        },
      },
      query: {
        type: 'object',
        required: ['workspace_id'],
        properties: {
          workspace_id: { type: 'string' },
        },
      },
      body: {
        type: 'object',
        required: ['nodes', 'edges', 'workflowConfig'],
        properties: {
          workflowConfig: {
            type: 'object',
            required: ['name'],
            properties: {
              name: { type: 'string' },
            },
          },
          nodes: {
            type: 'array', items: {
              type: 'object', required: ['type', 'position', 'data', 'id'], properties: {
                id: { type: 'string' },
                dbId: { type: 'string' },
                type: { type: 'string' },
                position: { type: 'object', required: ['x', 'y'] },
                data: {
                  type: 'object',
                  additionalProperties: true,
                },
              }
            }
          },
          edges: {
            type: 'array', items: {
              type: 'object', required: ['source', 'sourceHandle', 'target', 'targetHandle', 'id'], properties: {
                source: { type: 'string' },
                sourceHandle: { type: 'string' },
                target: { type: 'string' },
                targetHandle: { type: 'string' },
                id: { type: 'string' },
                dbId: { type: 'string' },
              }
            }
          },
        },
      },
    },
    handler: async (req, reply) => {
      return handler.updateWorkflow(req, reply);
    }
  });

  app.route({
    url: base_url + '/:id/activate',
    method: 'POST',
    name: "ActivateWorkflow",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      query: {
        type: 'object',
        required: ['workspace_id'],
        properties: {
          workspace_id: { type: 'string' },
        },
      },
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
        },
      },
    },
    handler: async (req, reply) => {
      return handler.activateWorkflow(req, reply);
    }
  });

  app.route({
    url: base_url + '/:id/update-configuration',
    method: 'POST',
    name: "UpdateWorkflowConfiguration",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      query: {
        type: 'object',
        required: ['workspace_id'],
        properties: {
          workspace_id: { type: 'string' },
        },
      },
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string' } },
      },
      body: {
        type: 'object',
        required: ['workflowChannels', 'workflowRuleParentGroup'],
        properties: {
          workflowChannels: {
            oneOf: [
              {
                type: 'object',
                required: ['emailChannels', 'chatWidgetChannel'],
                properties: {
                  emailChannels: {
                    type: 'array',
                    items: {
                      type: 'object',
                      required: ['emailChannelId'],
                      additionalProperties: false,
                      properties: {
                        id: { type: 'string' }, // id if the email channel already exists
                        emailChannelId: { type: 'string' }
                      }
                    }
                  },
                  chatWidgetChannel: {
                    type: 'boolean'
                  }
                }
              },
              { type: 'null' }
            ]
          },
          workflowRuleParentGroup: {
            oneOf: [
              {
                type: 'object',
                required: ['operator', 'workflowRules', 'workflowChildGroups'],
                properties: {
                  id: { type: 'string' }, // id if the parent group already exists
                  operator: { type: 'string', enum: ['and', 'or'] },
                  workflowRules: {
                    type: 'array',
                    items: {
                      type: 'object',
                      required: ['entityType', 'operator', 'value'],
                      properties: {
                        id: { type: 'string' }, // id if the rule already exists
                        entityType: {
                          type: 'string',
                          enum: ['contact', 'company', 'ticket', 'custom_field', 'custom_object_field']
                        },
                        standardFieldName: {
                          type: 'string'
                        },
                        customFieldId: {
                          type: 'string'
                        },
                        customObjectFieldId: {
                          type: 'string'
                        },
                        operator: {
                          type: 'string',
                          enum: [
                            'equals',
                            'not_equals',
                            'is_empty',
                            'is_not_empty',
                            'contains',
                            'not_contains',
                            'starts_with',
                            'ends_with'
                          ]
                        },
                        value: {
                          oneOf: [
                            { type: 'string' },
                            { type: 'number' },
                            { type: 'boolean' }
                          ]
                        }
                      }
                    }
                  },
                  workflowChildGroups: {
                    type: 'array',
                    items: {
                      type: 'object',
                      required: ['operator', 'rules'],
                      properties: {
                        id: { type: 'string' }, // id if the child group already exists
                        operator: {
                          type: 'string',
                          enum: ['and', 'or']
                        },
                        rules: {
                          type: 'array',
                          items: {
                            type: 'object',
                            required: ['entityType', 'operator', 'value'],
                            properties: {
                              id: { type: 'string' }, // id if the rule already exists
                              entityType: {
                                type: 'string',
                                enum: ['contact', 'company', 'ticket', 'custom_object_field']
                              },
                              standardFieldName: {
                                type: 'string'
                              },
                              customFieldId: {
                                type: 'string'
                              },
                              customObjectFieldId: {
                                type: 'string'
                              },
                              operator: {
                                type: 'string',
                                enum: [
                                  'equals',
                                  'not_equals',
                                  'is_empty',
                                  'is_not_empty',
                                  'contains',
                                  'not_contains',
                                  'starts_with',
                                  'ends_with'
                                ]
                              },
                              value: {
                                oneOf: [
                                  { type: 'string' },
                                  { type: 'number' },
                                  { type: 'boolean' }
                                ]
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                },
              },
              { type: 'null' }
            ]
          }
        },
      },
    },
    handler: async (req, reply) => {
      return handler.updateWorkflowConfiguration(req, reply);
    }
  });

  // Fetch the workflow configuration
  app.route({
    url: base_url + '/:id/workflow-configuration',
    method: 'GET',
    name: "GetWorkflowConfiguration",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      query: {
        type: 'object',
        required: ['workspace_id'],
        properties: {
          workspace_id: { type: 'string' },
        },
      },
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string' } },
      },
    },
    handler: async (req, reply) => {
      return handler.getWorkflowConfiguration(req, reply);
    }
  });

  app.route({
    url: base_url + '/getWorkflowRuleFields',
    method: 'GET',
    name: "GetWorkflowRuleFields",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      query: {
        type: 'object',
        required: ['workspace_id'],
        properties: {
          workspace_id: { type: 'string' },
        },
      },
    },
    handler: async (req, reply) => {
      return handler.getWorkflowRuleFields(req, reply);
    }
  });

  app.route({
    url: base_url + '/getWorkflowReusableNodes',
    method: 'GET',
    name: "GetWorkflowReusableNodes",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      query: {
        type: 'object',
        required: ['workspace_id'],
        properties: {
          workspace_id: { type: 'string' },
        },
      },
    },
    handler: async (req, reply) => {
      return handler.getWorkflowReusableNodes(req, reply);
    }
  });
}

module.exports = { activate };