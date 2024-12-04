const Handler = require('../../handlers/TicketStatusHandler');

const authMiddlewares = require('../../middlewares/auth');
const AuthType = require('../../constants/AuthType');
const { Status } = require('../../constants/TicketConstants');

async function activate(app) {

  let handler = new Handler();

  let base_url = '/api/ticket-status'
  app.route({
    url: base_url,
    method: 'POST',
    name: "CreateTicketStatus",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      operationId: "CreateTicketStatus",
      tags: ['TicketStatus'],
      summary: 'Create TicketStatus',
      description: 'API to create ticketStatus.',
      required: ['name', 'type', 'workspace_id'],
      body: {
        additionalProperties: false,
        type: 'object',
        properties: {
          name: {
            type: 'string',
            minLength: 2
          },
          type: {
            type: 'string',
            enum:[ Status.open, Status.inProgress, Status.closed, ]
          },
          description:  {
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
      return handler.createTicketStatus(req, reply);
    }
  });

  app.route({
    url: base_url,
    method: 'GET',
    name: "ListTicketStatuses",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      operationId: "ListTicketStatuses",
      tags: ['TicketStatus'],
      summary: 'List TicketStatuses',
      description: 'API to list all TicketStatuses.',
      required: ['workspace_id'],
      query: {
        type: 'object',
        properties: {
          name:  {
            type: 'string',
            minLength: 2
          },
          type: {
            type: 'string',
            enum:[ Status.open, Status.inProgress, Status.closed, ]
          },
          archived: {
            type: "boolean",
            default: false,
            description: "To fetch archived records."
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
      }
    },
    handler: async (req, reply) => {
      return handler.listTicketStatus(req, reply);
    }
  });

  app.route({
    url: base_url + "/:ticket_status_id",
    method: 'GET',
    name: "ShowTicketStatusDetail",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      operationId: "ShowTicketStatusDetail",
      tags: ['TicketStatus'],
      summary: 'Show TicketStatus Detail',
      description: 'API to show detail of a TicketStatus.',
      required: ['workspace_id'],
      query: {
        workspace_id:  {
          type: 'string',
        },
      }
    },
    handler: async (req, reply) => {
      return handler.showTicketStatusDetail(req, reply);
    }
  });

  app.route({
    url: base_url + "/:ticket_status_id",
    method: 'PUT',
    name: "UpdateTicketStatus",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      operationId: "UpdateTicketStatus",
      tags: ['TicketStatus'],
      summary: 'Update TicketStatus',
      description: 'API to update a TicketStatus.',
      required: ['workspace_id'],
      body: {
        type: 'object',
        properties: {
          name:  {
            type: 'string',
            minLength: 2
          },
          type: {
            type: 'string',
            enum:[ Status.open, Status.inProgress, Status.closed, ]
          },
          description:  {
            type: 'string',
          },
        },
      },
      query: {
        workspace_id:  {
          type: 'string',
        },
      }
    },
    handler: async (req, reply) => {
      return handler.updateTicketStatus(req, reply);
    }
  });

  app.route({
    url: base_url+ "/:ticket_status_id",
    method: 'DELETE',
    name: "DeleteTicketStatus",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      operationId: "DeleteTicketStatus",
      tags: ['TicketStatus'],
      summary: 'Delete TicketStatus',
      description: 'API to delete a TicketStatus.',
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
      return handler.deleteTicketStatus(req, reply);
    }
  });

}

module.exports = {
  activate
};