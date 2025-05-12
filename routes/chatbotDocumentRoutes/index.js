const Handler = require('../../handlers/ChatbotDocumentHandler');

const authMiddlewares = require('../../middlewares/auth');
const AuthType = require('../../constants/AuthType');

async function activate(app) {

  let handler = new Handler();

  let base_url = '/api/chatbot-document'

  app.route({
    url: base_url,
    method: 'POST',
    name: "UploadChatbotDocument",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      operationId: "UploadChatbotDocument",
      tags: [ 'ChatbotDocument' ],
      summary: 'Upload Chatbot Document',
      description: 'API to Upload Chatbot Document.',
      consumes: ['multipart/form-data'],
      body: {
        required: ['title', 'doc_type'],
        additionalProperties: false,
        type: 'object',
        properties: {
          title: {
            type: 'string',
            minLength: 2
          },
          doc_type: {
            type: 'string',
            enum: ["link", "content", "file",]
          },
          content: {
            type: 'string',
          },
          link: {
            type: 'string',
            format: 'uri'
          },
          chatbot_ids: {
            type: 'array',
            items: {
              type: 'string',
            }
          },
          // "data_file": {
          //   // type: 'file',
          //   format: 'binary'
          // }
        }
      },
      formData: {
        "data_file": {
          type: 'file',
        }
      },
      query: {
        workspace_id:  {
          type: 'string',
        },
      }
    },
    handler: async (req, reply) => {
      return handler.createChatbotDocument(req, reply);
    }
  });

  app.route({
    url: base_url + "/snippet",
    method: 'POST',
    name: "CreateSnippet",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    handler: async (req, reply) => {
      return handler.createSnippet(req, reply);
    }
  });

  app.route({
    url: base_url + "/link",
    method: 'POST',
    name: "CreateLink",
    preHandler: authMiddlewares.checkToken(AuthType.user),  
    handler: async (req, reply) => {
      return handler.createLink(req, reply);
    }
  });

  app.route({
    url: base_url + "/document",
    method: 'POST',
    name: "CreateDocument",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    handler: async (req, reply) => {
      return handler.createDocument(req, reply);
    }
  });

  app.route({
    url: base_url,
    method: 'GET',
    name: "ListChatbotDocuments",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      operationId: "ListChatbotDocuments",
      tags: ['ChatbotDocument'],
      summary: 'List ChatbotDocuments',
      description: 'API to list all ChatbotDocuments.',
      required: ['workspace_id'],
      query: {
        workspace_id:  {
          type: 'string',
        },
        title:  {
          type: 'string',
          minLength: 2
        },
        doc_type:  {
          type: 'string',
        },
        chatbot_id:  {
          type: 'string',
        },
        exclude_chatbot_id:  {
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
      return handler.listChatbotDocument(req, reply);
    }
  });

  app.route({
    url: base_url + "/:chatbot_document_id",
    method: 'GET',
    name: "ShowChatbotDocumentDetail",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      operationId: "ShowChatbotDocumentDetail",
      tags: ['ChatbotDocument'],
      summary: 'Show ChatbotDocument Detail',
      description: 'API to show detail of a ChatbotDocument.',
      required: [],
    },
    handler: async (req, reply) => {
      return handler.showChatbotDocumentDetail(req, reply);
    }
  });

  app.route({
    url: base_url + "/:chatbot_document_id",
    method: 'PUT',
    name: "UpdateChatbotDocument",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      operationId: "UpdateChatbotDocument",
      tags: ['ChatbotDocument'],
      summary: 'Update ChatbotDocument',
      description: 'API to update a ChatbotDocument.',
      required: [],
      body: {
        name:  {
          type: 'string',
          minLength: 2
        },
        description:  {
          type: 'string',
        },
      }
    },
    handler: async (req, reply) => {
      return handler.updateChatbotDocument(req, reply);
    }
  });


  app.route({
    url: base_url + "/bulk-action",
    method: 'PUT',
    name: "BulkActionChatbotDocument",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      operationId: "BulkActionChatbotDocument",
      tags: ['ChatbotDocument'],
      summary: 'Bulk Action ChatbotDocument',
      description: 'API to bulk action on ChatbotDocument.',
      body: {
        required: ['action', 'ids'],
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ["archive", "restore", "removeChatBots", "addChatBots"]
          },
          ids: {
            type: 'array',
            items: {
              type: 'string',
            }
          },
          chatbot_ids: {
            type: 'array',
            items: {
              type: 'string',
            }
          }
        }
      },
    },
    handler: async (req, reply) => {
      return handler.bulkAction(req, reply);
    }
  });


  app.route({
    url: base_url+ "/:chatbot_document_id",
    method: 'DELETE',
    name: "DeleteChatbotDocument",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      operationId: "DeleteChatbotDocument",
      tags: ['ChatbotDocument'],
      summary: 'Delete ChatbotDocument',
      description: 'API to delete a ChatbotDocument.',
      required: [],
      body: {
      }
    },
    handler: async (req, reply) => {
      return handler.deleteChatbotDocument(req, reply);
    }
  });

  app.route({
    url: base_url+ "/status/:chatbot_document_id",
    method: 'POST',
    name: "ChatbotDocumentCallBack",
    // preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      operationId: "ChatbotDocumentCallBack",
      tags: ['ChatbotDocument'],
      summary: 'ChatbotDocument CallBack to update the status',
      description: 'API to update the status of ChatbotDocument.',
      required: [],
      body: {
      }
    },
    handler: async (req, reply) => {
      console.log(req.body);
      return { "status": "success", };
      // return handler.deleteChatbotDocument(req, reply);
    }
  });

}

module.exports = {
  activate
};