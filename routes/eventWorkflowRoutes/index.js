const Handler = require('../../handlers/EventWorkflowHandler');

const authMiddlewares = require('../../middlewares/auth');
const AuthType = require('../../constants/AuthType');

async function activate(app) {

  let handler = new Handler();

  let base_url = '/api/event-workflow'
  app.route({
    url: base_url,
    method: 'POST',
    name: "AddEventWorkflow",
    preHandler: authMiddlewares.checkClerkToken(AuthType.user),
    schema: {
      operationId: "AddEventWorkflow",
      tags: ['EventWorkflow'],
      summary: 'Add/Set Workflow for an Event',
      description: 'API to set Workflow for an Event.',
      required: ['eventId', 'workflowId', 'workspace_id'],
      body: {
        additionalProperties: false,
        type: 'object',
        properties: {
          eventId: {
            type: 'string',
          },
          workflowId: {
            type: 'string',
          },
          name: {
            type: 'string',
            minLength: 2
          },
          description: {
            type: 'string',
          },
        }
      },
      query: {
        workspace_id: {
          type: 'string',
        },
      }
    },
    handler: async (req, reply) => {
      return handler.createEventWorkflow(req, reply);
    }
  });

  app.route({
    url: base_url,
    method: 'GET',
    name: "ListEventWorkflows",
    preHandler: authMiddlewares.checkClerkToken(AuthType.user),
    schema: {
      operationId: "ListEventWorkflows",
      tags: ['EventWorkflow'],
      summary: 'List EventWorkflows',
      description: 'API to list all EventWorkflows.',
      required: ['workspace_id'],
      query: {
        name: {
          type: 'string',
          minLength: 2
        },
        event_id: {
          type: 'string',
        },
        workflow_id: {
          type: 'string',
        },
        archived: {
          type: "boolean",
          default: false,
          description: "To fetch archived records."
        },
        workspace_id: {
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
      return handler.listEventWorkflow(req, reply);
    }
  });

  app.route({
    url: base_url + "/:event_workflow_id",
    method: 'GET',
    name: "ShowEventWorkflowDetail",
    preHandler: authMiddlewares.checkClerkToken(AuthType.user),
    schema: {
      operationId: "ShowEventWorkflowDetail",
      tags: ['EventWorkflow'],
      summary: 'Show EventWorkflow Detail',
      description: 'API to show detail of a EventWorkflow.',
      required: ['workspace_id'],
      query: {
        workspace_id: {
          type: 'string',
        },
      }
    },
    handler: async (req, reply) => {
      return handler.showEventWorkflowDetail(req, reply);
    }
  });

  app.route({
    url: base_url + "/:event_workflow_id",
    method: 'PUT',
    name: "UpdateEventWorkflow",
    preHandler: authMiddlewares.checkClerkToken(AuthType.user),
    schema: {
      operationId: "UpdateEventWorkflow",
      tags: ['EventWorkflow'],
      summary: 'Update EventWorkflow',
      description: 'API to update a EventWorkflow.',
      required: ['workspace_id'],
      body: {
        name: {
          type: 'string',
          minLength: 2
        },
        description: {
          type: 'string',
        },
      },
      query: {
        workspace_id: {
          type: 'string',
        },
      }
    },
    handler: async (req, reply) => {
      return handler.updateEventWorkflow(req, reply);
    }
  });

  app.route({
    url: base_url + "/:event_workflow_id",
    method: 'DELETE',
    name: "DeleteEventWorkflow",
    preHandler: authMiddlewares.checkClerkToken(AuthType.user),
    schema: {
      operationId: "DeleteEventWorkflow",
      tags: ['EventWorkflow'],
      summary: 'Delete EventWorkflow',
      description: 'API to delete a EventWorkflow.',
      required: ['workspace_id'],
      body: {
      },
      query: {
        workspace_id: {
          type: 'string',
        },
      }
    },
    handler: async (req, reply) => {
      return handler.deleteEventWorkflow(req, reply);
    }
  });

}

module.exports = {
  activate
};