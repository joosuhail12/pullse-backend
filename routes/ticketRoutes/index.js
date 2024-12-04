const Handler = require('../../handlers/TicketHandler');

const authMiddlewares = require('../../middlewares/auth');
const AuthType = require('../../constants/AuthType');

async function activate(app) {

  let handler = new Handler();

  let base_url = '/api/ticket'
  app.route({
    url: base_url,
    method: 'POST',
    name: "CreateTicket",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      tags: ['Ticket'],
      summary: 'Create Ticket',
      description: 'API to create ticket.',
      body: {
        required: ['title'],
        additionalProperties: false,
        type: 'object',
        properties: {
          title: {
            type: 'string',
            minLength: 2
          },
          customerId: {
            type: 'string',
          },
          description: {
            type: 'string',
          },
          priority: {
            type: 'number',
          },
        }
      },
    },
    handler: async (req, reply) => {
      return handler.createTicket(req, reply);
    }
  });

  let ticketListRouteConfig = {
    url: base_url,
    method: 'GET',
    name: "ListTickets",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      tags: ['Ticket'],
      summary: 'List Tickets',
      description: 'API to list all tickets.',
      required: [ "workspace_id", ],
      query: {
        status: {
          type: 'string',
        },
        type_id: {
          type: 'string',
        },
        team_id: {
          type: 'string',
        },
        company_id: {
          type: 'string',
        },
        customer_id: {
          type: 'string',
        },
        assignee_id: {
          type: 'string',
        },
        created_from: {
          type: 'string',
        },
        created_to: {
          type: 'string',
        },
        priority: {
          type: 'number'
        },
        external_id: {
          type: 'string',
        },
        tag_id: {
          type: 'string',
        },
        topic_id: {
          type: 'string',
        },
        mention_id: {
          type: 'string',
        },
        language: {
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
      return handler.listTickets(req, reply);
    }
  };

  app.route(ticketListRouteConfig);
  ticketListRouteConfig.url = base_url + "/customer";
  ticketListRouteConfig.preHandler = authMiddlewares.checkToken(AuthType.customer);
  ticketListRouteConfig.schema.required = [];
  ticketListRouteConfig.handler = async (req, reply) => {
    return handler.listCustomerTickets(req, reply);
  };

  app.route(ticketListRouteConfig); // customer can also list tickets

  app.route({
    url: base_url + "/:ticket_sno",
    method: 'GET',
    name: "ShowTicketDetail",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      tags: ['Ticket'],
      summary: 'Show Ticket Detail',
      description: 'API to show detail of a Ticket.',
      required: [],
    },
    handler: async (req, reply) => {
      return handler.showTicketDetail(req, reply);
    }
  });

  app.route({
    url: base_url + "/:ticket_sno",
    method: 'PUT',
    name: "UpdateTicket",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      tags: ['Ticket'],
      summary: 'Update Ticket',
      description: 'API to update a Ticket.',
      required: [],
      body: {
        title: {
          type: 'string',
        },
        status: {
          type: 'string',
        },
        externalId: {
          type: 'string',
        },
        priority: {
          type: 'number',
        },
        language: {
          type: 'string',
        },
        teamId: {
          type: 'string',
        },
        assigneeId: {
          type: 'string',
        },
        type_id: {
          type: 'string',
        },
      }
    },
    handler: async (req, reply) => {
      return handler.updateTicket(req, reply);
    }
  });


  app.route({
    url: base_url + "/:ticket_sno/:entity_type",
    method: 'PUT',
    name: "UpdateTicketTag",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      tags: ['Ticket'],
      summary: 'Update Ticket Tag',
      description: 'API to update a Ticket Tag.',
      required: [ 'entity_id'],
      body: {
        action: {
          type: 'string',
          enum: ['add', 'remove']
        },
        entity_id: {
          type: 'string',
          minLength: 2
        },
      }
    },
    handler: async (req, reply) => {
      return handler.updateTag(req, reply);
    }
  });


  app.route({
    url: base_url+ "/:ticket_sno",
    method: 'DELETE',
    name: "DeleteTicket",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      tags: ['Ticket'],
      summary: 'Delete Ticket',
      description: 'API to delete a Ticket.',
      required: [],
      body: {
      }
    },
    handler: async (req, reply) => {
      return handler.deleteTicket(req, reply);
    }
  });

}

module.exports = {
  activate
};