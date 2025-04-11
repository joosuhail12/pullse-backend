const Handler = require('../../handlers/TicketHandler');

const authMiddlewares = require('../../middlewares/auth');
const AuthType = require('../../constants/AuthType');

async function activate(app) {

  const handler = new Handler();
  const base_url = '/api/ticket';

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
        required: ['subject'],
        additionalProperties: false,
        type: 'object',
        properties: {
          subject: { type: 'string', minLength: 2 },
          message: { type: 'string' },
          priority: { type: 'string', enum: ['low', 'medium', 'high'] },
          status: { type: 'string' },
          recipients: { type: 'array', items: { type: 'object' } },
          assignee: { type: 'object' },
          emailChannel: { type: 'object' },
          workspaceId: { type: 'string' },
          clientId: { type: 'string' },
        },
      },
    },
    handler: async (req, reply) => {
      return handler.createTicket(req, reply);
    }
  });

  const ticketListRouteConfig = {
    url: base_url,
    method: 'GET',
    name: "ListTickets",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      tags: ['Ticket'],
      summary: 'List Tickets',
      description: 'API to list all tickets.',
      required: ['workspace_id'],
      query: {
        status: { type: 'string' },
        typeId: { type: 'string' },
        teamId: { type: 'string' },
        companyId: { type: 'string' },
        customerId: { type: 'string' },
        assigneeId: { type: 'string' },
        createdFrom: { type: 'string' },
        createdTo: { type: 'string' },
        priority: { type: 'number' },
        externalId: { type: 'string' },
        tagId: { type: 'string' },
        topicId: { type: 'string' },
        mentionId: { type: 'string' },
        language: { type: 'string' },
        page: { type: 'string' },
        skip: { type: 'number' },
        limit: { type: 'number' },
        sortBy: { type: 'string' },
        sortOrder: { type: 'string' },
      },
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
  app.route(ticketListRouteConfig);

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
      body: {
        subject: { type: 'string' },
        description: { type: 'string' },
        status: { type: 'string' },
        externalId: { type: 'string' },
        priority: { type: 'string' },
        language: { type: 'string' },
        teamId: { type: 'string' },
        assigneeId: { type: 'string' },
        typeId: { type: 'string' },
        summary: { type: 'string' },
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
      required: ['entity_id'],
      body: {
        action: { type: 'string', enum: ['add', 'remove'] },
        entity_id: { type: 'string', minLength: 2 },
      }
    },
    handler: async (req, reply) => {
      return handler.updateTag(req, reply);
    }
  });

  app.route({
    url: base_url + "/:ticket_sno",
    method: 'DELETE',
    name: "DeleteTicket",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      tags: ['Ticket'],
      summary: 'Delete Ticket',
      description: 'API to delete a Ticket.',
    },
    handler: async (req, reply) => {
      return handler.deleteTicket(req, reply);
    }
  });

  // Dedicated API for assigning tickets
  app.route({
    url: base_url + "/:ticket_sno/assign",
    method: 'POST',
    name: "AssignTicket",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      tags: ['Ticket'],
      summary: 'Assign Ticket to User',
      description: 'API to assign a ticket to a user without updating other ticket fields.',
      body: {
        required: ['userId'],
        properties: {
          userId: {
            type: 'string',
            description: 'ID of the user to assign the ticket to'
          }
        }
      }
    },
    handler: async (req, reply) => {
      return handler.assignTicket(req, reply);
    }
  });
<<<<<<< HEAD

  // Get tickets assigned to a specific user
  app.route({
    url: base_url + "/user/:user_id/assigned",
    method: 'GET',
    name: "GetAssignedTickets",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      tags: ['Ticket'],
      summary: 'Get User Assigned Tickets',
      description: 'API to fetch all tickets assigned to a specific user.',
      params: {
        type: 'object',
        properties: {
          user_id: {
            type: 'string',
            description: 'ID of the user whose assigned tickets you want to retrieve'
          }
        }
      },
      query: {
        workspace_id: {
          type: 'string',
        },
        status: {
          type: 'string',
        },
        priority: {
          type: 'number',
        },
        skip: {
          type: 'number'
        },
        limit: {
          type: 'number'
        }
      }
    },
    handler: async (req, reply) => {
      return handler.getAssignedTickets(req, reply);
=======
  app.route({
    url: base_url + "/:ticket_sno/conversation",
    method: 'GET',
    name: "GetConversationByTicketId",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      tags: ['Ticket'],
      summary: 'Get Conversation by Ticket ID',
      description: 'API to get conversation by ticket ID.',
      required: ['ticket_sno'],
    },
    handler: async (req, reply) => {
      return handler.getConversationByTicketId(req, reply);
>>>>>>> 754b6f7bcf579aca14aa8e3d38d678a68558f0a2
    }
  });
}

// get conversation by ticket id

module.exports = {
  activate
};