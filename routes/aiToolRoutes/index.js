const Handler = require('../../handlers/AIToolHandler');

const authMiddlewares = require('../../middlewares/auth');
const AuthType = require('../../constants/AuthType');

async function activate(app) {

  let handler = new Handler();

  let base_url = '/api/ai-tool';

  app.route({
    url: base_url + '/text/summarize',
    method: 'POST',
    name: "SummarizeText",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      tags: ['AI Tool', "Summarize Text"],
      summary: 'Summarize Text',
      description: 'API to Summarize Text.',
      body: {
        required: ['text'],
        additionalProperties: false,
        type: 'object',
        properties: {
          text:  {
            type: 'string',
            minLength: 25
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
      return handler.summarizeText(req, reply);
    }
  });


  app.route({
    url: base_url + '/text/expand',
    method: 'POST',
    name: "ExpandText",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      tags: ['AI Tool', "Expand Text"],
      summary: 'Expand Text',
      description: 'API to Expand Text.',
      body: {
        required: ['text'],
        additionalProperties: false,
        type: 'object',
        properties: {
          text:  {
            type: 'string',
            minLength: 15
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
      return handler.expandText(req, reply);
    }
  });


  app.route({
    url: base_url + '/text/rephrase',
    method: 'POST',
    name: "RephraseText",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      tags: ['AI Tool', "Rephrase Text"],
      summary: 'Rephrase Text',
      description: 'API to rephrase text.',
      body: {
        required: ['text'],
        additionalProperties: false,
        type: 'object',
        properties: {
          text:  {
            type: 'string',
            minLength: 15
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
      return handler.rephraseText(req, reply);
    }
  });


  app.route({
    url: base_url + '/query',
    method: 'POST',
    name: "AskQuery",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      tags: ['AI Tool', "Ask Query"],
      summary: 'Ask Query',
      description: 'API to ask Query.',
      body: {
        required: ['query'],
        additionalProperties: false,
        type: 'object',
        properties: {
          query:  {
            type: 'string',
            minLength: 15
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
      return handler.askQuery(req, reply);
    }
  });

  app.route({
    url: base_url + '/summarize/ticket-conversation',
    method: 'POST',
    name: "SummarizeTicketConversation",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      tags: ['AI Tool', "Summarize Ticket Conversation"],
      summary: 'Summarize Ticket Conversation',
      description: 'API to Summarize Ticket Conversation.',
      body: {
        required: ['ticket_sno'],
        additionalProperties: false,
        type: 'object',
        properties: {
          ticket_sno:  {
            type: 'number',
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
      return handler.summarizeConversation(req, reply);
    }
  });

}

module.exports = {
  activate
};