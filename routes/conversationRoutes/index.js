const Handler = require('../../handlers/ConversationHandler');

const authMiddlewares = require('../../middlewares/auth');
const AuthType = require('../../constants/AuthType');

async function activate(app) {

  let handler = new Handler();

  let base_url = '/api/conversation'

  app.route({
    url: base_url + '/message/new-ticket',
    method: 'POST',
    name: "AddMessage",
    preHandler: authMiddlewares.checkToken(AuthType.customer),
    schema: {
      operationIds: "AddMessage",
      tags: ['Conversation'],
      summary: 'Add message in a new conversation',
      description: 'API to add message in conversation.',
      body: {
        required: [ "message_type", "message", ],
        additionalProperties: false,
        type: 'object',
        properties: {
          message: {
            type: 'string',
            minLength: 2
          },
          customer: {
            type: 'object',
            properties: {
              firstname: {
                type: 'string',
              },
              email: {
                type: 'string',
                format: "email"
              }
            }
          },
          message_type: {
            type: 'string',
            minLength: 2
          },
        }
      },
    },
    handler: async (req, reply) => {
      return handler.createCustomerTicket(req, reply, app.io);
    }
  });

  app.route({
    url: base_url + '/message',
    method: 'POST',
    name: "AddMessage",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      tags: ['Conversation'],
      summary: 'Add message in conversation',
      description: 'API to add message in conversation.',
      body: {
        required: [ "ticketId", "message", ],
        additionalProperties: false,
        type: 'object',
        properties: {
          ticketId: {
            type: 'string',
            minLength: 2
          },
          message: {
            type: 'string',
            minLength: 2
          },
          type: {
            type: 'string',
            minLength: 2
          },
          userType: {
            type: 'string',
            minLength: 2
          },
          workspace_id: {
            type: 'string',
            minLength: 2
          },
        }
      },
    },
    handler: async (req, reply) => {
      return handler.addMessage(req, reply);
    }
  });

  let listTicketConversationRouteConfig = {
    url: base_url + '/:ticket_sno',
    method: 'GET',
    name: "TicketConversation",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      tags: ['Conversation'],
      summary: 'Get Ticket Conversation',
      description: 'API to get ticket conversation.',
      required: [],
      params: {
        ticket_sno: {
          type: 'string',
        },
      },
      query: {
        page: {
          type: 'string',
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
      return handler.getConversation(req, reply);
    }
  }
  app.route(listTicketConversationRouteConfig);

  listTicketConversationRouteConfig.url = base_url + "/:ticket_sno/customer";
  listTicketConversationRouteConfig.preHandler = authMiddlewares.checkToken(AuthType.customer);
  listTicketConversationRouteConfig.schema.required = [];
  listTicketConversationRouteConfig.handler = async (req, reply) => {
    req.query.workspace_id = req.authUser.workspaceId;
    return handler.getConversation(req, reply);
  };

  app.route(listTicketConversationRouteConfig); // customer can also list tickets

  app.route({
    url: base_url + '/:ticket_id/:message_id',
    method: 'GET',
    name: "GetTicketMessage",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      tags: ['Conversation'],
      summary: 'Get Ticket Individual Message',
      description: 'API to get individual message.',
      required: [],
    },
    handler: async (req, reply) => {
      return handler.getMessage(req, reply);
    }
  });

  // app.route({
  //   url: base_url + "/:ticket_id/:message_id",
  //   method: 'PUT',
  //   name: "UpdateTicketMessage",
  //   preHandler: authMiddlewares.checkToken(AuthType.user),
  //   schema: {
  //     tags: ['Conversation'],
  //     summary: 'Update Message',
  //     description: 'API to update a message.',
  //     required: [],
  //     body: {
  //       message: {
  //         type: 'string',
  //       },
  //     }
  //   },
  //   handler: async (req, reply) => {
  //     return handler.updateMessage(req, reply);
  //   }
  // });

  // app.route({
  //   url: base_url + "/:ticket_id/:message_id",
  //   method: 'DELETE',
  //   name: "DeleteTicketMessage",
  //   preHandler: authMiddlewares.checkToken(AuthType.user),
  //   schema: {
  //     tags: ['Conversation'],
  //     summary: 'Delete Ticket Message',
  //     description: 'API to delete a message from a ticket.',
  //     required: [],
  //     body: {
  //     }
  //   },
  //   handler: async (req, reply) => {
  //     return handler.deleteMessage(req, reply);
  //   }
  // });

}

module.exports = {
  activate
};