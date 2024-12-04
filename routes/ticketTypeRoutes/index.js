const Handler = require('../../handlers/TicketTypeHandler');

const authMiddlewares = require('../../middlewares/auth');
const AuthType = require('../../constants/AuthType');

async function activate(app) {

  let handler = new Handler();

  let base_url = '/api/ticket-type'
  app.route({
    url: base_url,
    method: 'POST',
    name: "CreateTicketType",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      tags: ['TicketType'],
      summary: 'Create User TicketType',
      description: 'API to create user ticketType.',
      body: {
        required: ['name', 'type'],
        additionalProperties: false,
        type: 'object',
        properties: {
          name: {
            type: 'string',
            minLength: 2
          },
          description: {
            type: 'string',
          },
          type: {
            type: 'string',
            enum: ["customer", "back-office", "tracker"]
          },
          customerSharing: {
            type: 'string',
            default: "NA"
          },
        }
      },
    },
    handler: async (req, reply) => {
      return handler.createTicketType(req, reply);
    }
  });

  app.route({
    url: base_url,
    method: 'GET',
    name: "ListTicketTypes",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      tags: ['TicketType'],
      summary: 'List TicketTypes',
      description: 'API to list all TicketTypes.',
      required: ['workspace_id'],
      query: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
          },
          archived: {
            type: "boolean",
            default: false,
            description: "To fetch archived records."
          },
          type: {
            type: 'string',
            enum: ["customer", "back-office", "tracker"]
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
      }
    },
    handler: async (req, reply) => {
      return handler.listTicketType(req, reply);
    }
  });

  app.route({
    url: base_url + "/:ticket_type_id",
    method: 'GET',
    name: "ShowTicketTypeDetail",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      tags: ['TicketType'],
      summary: 'Show TicketType Detail',
      description: 'API to show detail of a TicketType.',
      required: [],
    },
    handler: async (req, reply) => {
      return handler.showTicketTypeDetail(req, reply);
    }
  });

  app.route({
    url: base_url + "/:ticket_type_id",
    method: 'PUT',
    name: "UpdateTicketType",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      tags: ['TicketType'],
      summary: 'Update TicketType',
      description: 'API to update a TicketType.',
      required: [],
      body: {
        type: 'object',
        properties: {
          name:  {
            type: 'string',
            minLength: 2
          },
          description:  {
            type: 'string',
          },
          type: {
            type: 'string',
            enum: ["customer", "back-office", "tracker"]
          },
        }
      }
    },
    handler: async (req, reply) => {
      return handler.updateTicketType(req, reply);
    }
  });

  app.route({
    url: base_url+ "/:ticket_type_id",
    method: 'DELETE',
    name: "DeleteTicketType",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      tags: ['TicketType'],
      summary: 'Delete TicketType',
      description: 'API to delete a TicketType.',
      required: [],
      body: {
      }
    },
    handler: async (req, reply) => {
      return handler.deleteTicketType(req, reply);
    }
  });

}

module.exports = {
  activate
};