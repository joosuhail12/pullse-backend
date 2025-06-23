// routes/CopilotProfileRoutes.js
const Handler = require('../../handlers/CopilotChatHandler');
const authorize = require('../../ability/authorize');

async function activate(app) {
  const handler = new Handler();
  const base_url = '/api/copilot-conversations';

  app.route({
    url: base_url,
    method: 'POST',
    name: 'CreateCopilotConversation',
    preHandler: authorize('create', 'CopilotChat'),
    schema: {
      operationId: 'CreateCopilotConversation',
      tags: ['copilot-profiles'],
      summary: 'Create Copilot Profile',
      description: 'API to create a Copilot profile with image and metadata.',
      consumes: ['multipart/form-data'],
      body: {
        type: 'object',
        properties: {
            title: { type: 'string' },
            userId: { type: 'string' },
            copilotProfileId: { type: 'string' },
            initialMessage: { type: 'object', properties: {
                type: { type: 'string' },
                content: { type: 'string' },
                sender: { type: 'object', properties: {
                    id: { type: 'string' },
                    name: { type: 'string' }
                }
            }},
            }
        },
        required: []
      }
    },
    handler: async (req, reply) => {
      return handler.createConversation(req, reply);
    }
  });
  app.route({
    url: `${base_url}/:id`,
    method: 'GET',
    name: 'GetCopilotConversation',
    preHandler: authorize('read', 'CopilotChat'),
    schema: {
      operationId: 'GetCopilotConversation',
      tags: ['copilot-profiles'],
      summary: 'Get Copilot Conversation',
      description: 'API to get a Copilot conversation.',
      query: {
        id: { type: 'string' }
      },
    },
    handler: async (req, reply) => {
      return handler.getConversation(req, reply);
    }
  });
  app.route({
    url: `${base_url}/:id/messages`,
    method: 'POST',
    name: 'CreateCopilotConversationMessage',
    preHandler: authorize('create', 'CopilotChat'),
    schema: {
      operationId: 'CreateCopilotConversationMessage',
      tags: ['copilot-profiles'],
      summary: 'Create Copilot Conversation Message',
      description: 'API to create a Copilot conversation message.',
      body: {
        type: 'object',
        properties: {
          content: { type: 'string' },
          type: { type: 'string' },
        },
        required: []
      }
    },
    handler: async (req, reply) => {
      return handler.createMessage(req, reply);
    }
  });
}

module.exports = { activate };
