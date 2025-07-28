const Handler = require('../../handlers/TicketTopicHandler');

const authMiddlewares = require('../../middlewares/auth');
const AuthType = require('../../constants/AuthType');

async function activate(app) {

  let handler = new Handler();

  let base_url = '/api/ticket-topic'
  app.route({
    url: base_url,
    method: 'POST',
    name: "CreateTicketTopic",
    preHandler: authMiddlewares.checkClerkToken(AuthType.user),
    schema: {
      operationId: "CreateTicketTopic",
      tags: ['TicketTopic'],
      summary: 'Create User TicketTopic',
      description: 'API to create user ticketTopic.',
      body: {
        required: ['name'],
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
          workspaceId: {
            type: 'string',
          },
        }
      },
    },
    handler: async (req, reply) => {
      return handler.createTicketTopic(req, reply);
    }
  });

  app.route({
    url: base_url,
    method: 'GET',
    name: "ListTicketTopics",
    preHandler: authMiddlewares.checkClerkToken(AuthType.user),
    schema: {
      operationId: "ListTicketTopics",
      tags: ['TicketTopic'],
      summary: 'List TicketTopics',
      description: 'API to list all TicketTopics.',
      required: [],
      query: {
        archived: {
          type: "boolean",
          default: false,
          description: "To fetch archived records."
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
      return handler.listTicketTopic(req, reply);
    }
  });

  app.route({
    url: base_url + "/:ticket_topic_id",
    method: 'GET',
    name: "ShowTicketTopicDetail",
    preHandler: authMiddlewares.checkClerkToken(AuthType.user),
    schema: {
      operationId: "ShowTicketTopicDetail",
      tags: ['TicketTopic'],
      summary: 'Show TicketTopic Detail',
      description: 'API to show detail of a TicketTopic.',
      required: [],
    },
    handler: async (req, reply) => {
      return handler.showTicketTopicDetail(req, reply);
    }
  });

  app.route({
    url: base_url + "/:ticket_topic_id",
    method: 'PUT',
    name: "UpdateTicketTopic",
    preHandler: authMiddlewares.checkClerkToken(AuthType.user),
    schema: {
      operationId: "UpdateTicketTopic",
      tags: ['TicketTopic'],
      summary: 'Update TicketTopic',
      description: 'API to update a TicketTopic.',
      required: [],
      body: {
        name: {
          type: 'string',
          minLength: 2
        },
        description: {
          type: 'string',
        },
      }
    },
    handler: async (req, reply) => {
      return handler.updateTicketTopic(req, reply);
    }
  });

  app.route({
    url: base_url + "/:ticket_topic_id",
    method: 'DELETE',
    name: "DeleteTicketTopic",
    preHandler: authMiddlewares.checkClerkToken(AuthType.user),
    schema: {
      operationId: "DeleteTicketTopic",
      tags: ['TicketTopic'],
      summary: 'Delete TicketTopic',
      description: 'API to delete a TicketTopic.',
      required: [],
      body: {
      }
    },
    handler: async (req, reply) => {
      return handler.deleteTicketTopic(req, reply);
    }
  });

}

module.exports = {
  activate
};