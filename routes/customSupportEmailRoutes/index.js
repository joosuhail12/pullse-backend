const Handler = require('../../handlers/CustomSupportEmailHandler');

const authMiddlewares = require('../../middlewares/auth');
const AuthType = require('../../constants/AuthType');

async function activate(app) {

  let handler = new Handler();

  let base_url = '/api/custom-support-email'
  app.route({
    url: base_url,
    method: 'POST',
    name: "CreateCustomSupportEmail",
    preHandler: authMiddlewares.checkClerkToken(AuthType.user),
    schema: {
      operationId: "CreateCustomSupportEmail",
      tags: ['CustomSupportEmail'],
      summary: 'Create CustomSupportEmail',
      description: 'API to create customSupportEmail.',
      required: ['name', 'workspace_id'],
      body: {
        additionalProperties: false,
        type: 'object',
        properties: {
          name: {
            type: 'string',
            minLength: 2
          },
          email: {
            type: 'string',
            format: "email"
          },
          description: {
            type: 'string',
          },
        }
      },
      query: {
        workspace_id: {
          type: 'string',
        },
      }
    },
    handler: async (req, reply) => {
      return handler.createCustomSupportEmail(req, reply);
    }
  });

  app.route({
    url: base_url,
    method: 'GET',
    name: "ListCustomSupportEmails",
    preHandler: authMiddlewares.checkClerkToken(AuthType.user),
    schema: {
      operationId: "ListCustomSupportEmails",
      tags: ['CustomSupportEmail'],
      summary: 'List CustomSupportEmails',
      description: 'API to list all CustomSupportEmails.',
      required: ['workspace_id'],
      query: {
        name: {
          type: 'string',
          minLength: 2
        },
        email: {
          type: 'string',
          format: "email"
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
    },
    handler: async (req, reply) => {
      return handler.listCustomSupportEmail(req, reply);
    }
  });

  app.route({
    url: base_url + "/:custom_support_email_id",
    method: 'GET',
    name: "ShowCustomSupportEmailDetail",
    preHandler: authMiddlewares.checkClerkToken(AuthType.user),
    schema: {
      operationId: "ShowCustomSupportEmailDetail",
      tags: ['CustomSupportEmail'],
      summary: 'Show CustomSupportEmail Detail',
      description: 'API to show detail of a CustomSupportEmail.',
      required: ['workspace_id'],
      query: {
        workspace_id: {
          type: 'string',
        },
      }
    },
    handler: async (req, reply) => {
      return handler.showCustomSupportEmailDetail(req, reply);
    }
  });

  app.route({
    url: base_url + "/:custom_support_email_id",
    method: 'PUT',
    name: "UpdateCustomSupportEmail",
    preHandler: authMiddlewares.checkClerkToken(AuthType.user),
    schema: {
      operationId: "UpdateCustomSupportEmail",
      tags: ['CustomSupportEmail'],
      summary: 'Update CustomSupportEmail',
      description: 'API to update a CustomSupportEmail.',
      required: ['workspace_id'],
      body: {
        name: {
          type: 'string',
          minLength: 2
        },
        email: {
          type: 'string',
          format: "email"
        },
        description: {
          type: 'string',
        },
      },
      query: {
        workspace_id: {
          type: 'string',
        },
      }
    },
    handler: async (req, reply) => {
      return handler.updateCustomSupportEmail(req, reply);
    }
  });

  app.route({
    url: base_url + "/:custom_support_email_id",
    method: 'DELETE',
    name: "DeleteCustomSupportEmail",
    preHandler: authMiddlewares.checkClerkToken(AuthType.user),
    schema: {
      operationId: "DeleteCustomSupportEmail",
      tags: ['CustomSupportEmail'],
      summary: 'Delete CustomSupportEmail',
      description: 'API to delete a CustomSupportEmail.',
      required: ['workspace_id'],
      body: {
      },
      query: {
        workspace_id: {
          type: 'string',
        },
      }
    },
    handler: async (req, reply) => {
      return handler.deleteCustomSupportEmail(req, reply);
    }
  });

}

module.exports = {
  activate
};