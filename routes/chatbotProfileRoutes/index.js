const Handler = require('../../handlers/ChatBotProfileHandler');

const authMiddlewares = require('../../middlewares/auth');
const AuthType = require('../../constants/AuthType');

async function activate(app) {

  let handler = new Handler();

  let base_url = '/api/chatbot-profile';
  app.route({
    url: base_url,
    method: 'POST',
    name: "CreateBotProfile",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      tags: ['Chatbot'],
      summary: 'Create User Chatbot',
      description: 'API to create user chatbot.',
      body: {
        required: [ "name", "status", "channels", "audience" ],
        additionalProperties: false,
        type: 'object',
        properties: {
          name: {
            type: 'string',
            minLength: 2
          },
          status: {
            type: 'string',
          },
          channels: {
            type: 'array',
            items: {
              type: 'string',
            }
          },
          audience: {
            type: 'array',
            items: {
              type: 'string',
            }
          },
          rules: {
            type: 'array',
            items: {
              type: 'object'
            }
          },
          introMessages: {
            type: 'array',
            items: {
              type: 'string'
            }
          },
          handoverMessages: {
            type: 'array',
            items: {
              type: 'string'
            }
          },
          answerMode: {
            type: 'string',
            enum: ["once", "loop"]
          },
          afterAnswer: {
            type: 'string',
            enum: ["close", "route"]
          },
          ifCantAnswer: {
            type: 'string',
            enum: ["close", "route"]
          },
        }
      },
      query: {
        required: ['workspace_id'],
        additionalProperties: false,
        type: 'object',
        properties: {
          workspace_id:  {
            type: 'string',
          },
        }
      }
    },
    handler: async (req, reply) => {
      return handler.createBotProfile(req, reply);
    }
  });

  app.route({
    url: base_url,
    method: 'GET',
    name: "ListChatbotProfiles",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      tags: ['Chatbot'],
      summary: 'List Chatbot Profiles',
      description: 'API to list all Chatbot Profiles.',
      required: ["workspace_id"],
      query: {
        name: {
          type: 'string',
        },
        status: {
          type: 'string',
        },
        channel: {
          type: 'string',
        },
        audience: {
          type: 'string',
        },
        answer_mode: {
          type: 'string',
        },
        after_answer: {
          type: 'string',
        },
        if_cant_answer: {
          type: 'string',
        },
        workspace_id: {
          type: 'string',
        },
        created_from: {
          type: 'string',
        },
        created_to: {
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
      return handler.listChatbotProfiles(req, reply);
    }
  });

  app.route({
    url: base_url + "/:profile_id",
    method: 'GET',
    name: "ShowChatbotProfileDetail",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      tags: ['Chatbot'],
      summary: 'Show Chatbot Profile Detail',
      description: 'API to show detail of a Chatbot Profile.',
      required: [],
    },
    handler: async (req, reply) => {
      return handler.showChatbotProfileDetail(req, reply);
    }
  });

  app.route({
    url: base_url + "/:profile_id",
    method: 'PUT',
    name: "UpdateChatbotProfile",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      tags: ['Chatbot'],
      summary: 'Update Chatbot Profile',
      description: 'API to update a Chatbot Profile.',
      required: [],
      body: {
        name: {
          type: 'string',
        },
        status: {
          type: 'string',
        },
        channels: {
          type: 'array',
          items: {
            type: 'string',
          }
        },
        audience: {
          type: 'array',
          items: {
            type: 'string',
          }
        },
        rules: {
          type: 'array',
          items: {
            type: 'object'
          }
        },
        introMessages: {
          type: 'array',
          items: {
            type: 'string'
          }
        },
        handoverMessages: {
          type: 'array',
          items: {
            type: 'string'
          }
        },
        answerMode: {
          type: 'string',
          enum: ["once", "loop"]
        },
        afterAnswer: {
          type: 'string',
          enum: ["close", "route"]
        },
        if_cant_answer: {
          type: 'string',
          enum: ["close", "route"]
        },
      }
    },
    handler: async (req, reply) => {
      return handler.updateChatbotProfile(req, reply);
    }
  });

  app.route({
    url: base_url+ "/:profile_id",
    method: 'DELETE',
    name: "DeleteChatbotProfile",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      tags: ['Chatbot'],
      summary: 'Delete Chatbot Profile',
      description: 'API to delete a Chatbot Profile.',
      required: [],
      body: {
      }
    },
    handler: async (req, reply) => {
      return handler.deleteChatbotProfile(req, reply);
    }
  });

  app.route({
    url: base_url + '/:profile_id/query',
    method: 'POST',
    name: "AskQueryToChatbotProfile",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      tags: [ 'Chatbot' ],
      summary: 'Ask Query to Chatbot Profile',
      description: 'API to Ask Query to Chatbot Profile.',
      body: {
        required: [ "query" ],
        additionalProperties: false,
        type: 'object',
        properties: {
          query: {
            type: 'string',
            minLength: 2
          },
        }
      },
    },
    handler: async (req, reply) => {
      return handler.getAnswerFromBot(req, reply);
    }
  });

}

module.exports = {
  activate
};