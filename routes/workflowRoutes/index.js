const Handler = require('../../handlers/WorkflowHandler');

const authMiddlewares = require('../../middlewares/auth');
const AuthType = require('../../constants/AuthType');

async function activate(app) {

  let handler = new Handler();

  let base_url = '/api/workflow'
  app.route({
    url: base_url,
    method: 'POST',
    name: "CreateWorkflow",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      tags: ['Workflow'],
      summary: 'Create Workflow',
      description: 'API to create workflow.',
      required: ['name', 'workspace_id'],
      body: {
        additionalProperties: false,
        type: 'object',
        properties: {
          name:  {
            type: 'string',
            minLength: 2
          },
          summary:  {
            type: 'string',
          },
          description:  {
            type: 'string',
          },
          rules: {
            type: 'array',
            items: {
              type: 'object'
            }
          },
          actions: {
            type: 'array',
            items: {
              type: 'object'
            }
          },
          position: {
            type: 'number',
          },
          status: {
            type: 'string',
          },
        }
      },
      query: {
        workspace_id:  {
          type: 'string',
        },
      }
    },
    handler: async (req, reply) => {
      return handler.createWorkflow(req, reply);
    }
  });

  app.route({
    url: base_url,
    method: 'GET',
    name: "ListWorkflows",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      tags: ['Workflow'],
      summary: 'List Workflows',
      description: 'API to list all Workflows.',
      required: ['workspace_id'],
      query: {
        name:  {
          type: 'string',
          minLength: 2
        },
        status:  {
          type: 'string',
        },
        workspace_id:  {
          type: 'string',
        },
        page: {
          type: 'string',
        },
        skip: {
          type: 'number'
        },
        limit: {
          type: 'number'
        },
        sort_by: {
          type: 'string',
        },
        sort_order: {
          type: 'string',
        }
      }
    },
    handler: async (req, reply) => {
      return handler.listWorkflow(req, reply);
    }
  });

  app.route({
    url: base_url + "/entity",
    method: 'GET',
    name: "GetWorkflowEntities",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      tags: ['Workflow'],
      summary: 'Get Workflow Entities',
      description: 'API to Get Workflow Entities.',
      required: ['workspace_id'],
      query: {
      }
    },
    handler: async (req, reply) => {
      return handler.getWorkflowEntities(req, reply);
    }
  });


  app.route({
    url: base_url + "/events",
    method: 'GET',
    name: "ListWorkflowEvents",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      tags: ['Workflow', 'Event'],
      summary: 'List Workflow Events',
      description: 'API to list workflow events.',
      required: ['workspace_id'],
      query: {
        workspace_id:  {
          type: 'string',
        },
      }
    },
    handler: async (req, reply) => {
      return handler.getWorkflowEvents(req, reply);
    }
  });

  app.route({
    url: base_url + "/:workflow_id",
    method: 'GET',
    name: "ShowWorkflowDetail",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      tags: ['Workflow'],
      summary: 'Show Workflow Detail',
      description: 'API to show detail of a Workflow.',
      required: ['workspace_id'],
      query: {
        workspace_id:  {
          type: 'string',
        },
      }
    },
    handler: async (req, reply) => {
      return handler.showWorkflowDetail(req, reply);
    }
  });

  app.route({
    url: base_url + "/:workflow_id",
    method: 'PUT',
    name: "UpdateWorkflow",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      tags: ['Workflow'],
      summary: 'Update Workflow',
      description: 'API to update a Workflow.',
      required: ['workspace_id'],
      body: {
        name:  {
          type: 'string',
          minLength: 2
        },
        description:  {
          type: 'string',
        },
        status:  {
          type: 'string',
        },
      },
      query: {
        workspace_id:  {
          type: 'string',
        },
      }
    },
    handler: async (req, reply) => {
      return handler.updateWorkflow(req, reply);
    }
  });

  app.route({
    url: base_url+ "/:workflow_id",
    method: 'DELETE',
    name: "DeleteWorkflow",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      tags: ['Workflow'],
      summary: 'Delete Workflow',
      description: 'API to delete a Workflow.',
      required: ['workspace_id'],
      body: {
      },
      query: {
        workspace_id:  {
          type: 'string',
        },
      }
    },
    handler: async (req, reply) => {
      return handler.deleteWorkflow(req, reply);
    }
  });

}

module.exports = {
  activate
};