const Handler = require('../../handlers/EmailTemplateHandler');

const authMiddlewares = require('../../middlewares/auth');
const AuthType = require('../../constants/AuthType');

async function activate(app) {

  let handler = new Handler();

  let base_url = '/api/email-template'
  app.route({
    url: base_url,
    method: 'POST',
    name: "CreateEmailTemplate",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      tags: ['EmailTemplate'],
      summary: 'Create EmailTemplate',
      description: 'API to create emailTemplate.',
      required: ['event', 'subject', 'body', 'workspace_id'],
      body: {
        additionalProperties: false,
        type: 'object',
        properties: {
          name:  {
            type: 'string',
            minLength: 2
          },
          event:  {
            type: 'string',
            minLength: 2
          },
          subject:  {
            type: 'string',
            minLength: 2
          },
          body:  {
            type: 'string',
            minLength: 2
          },
          description:  {
            type: 'string',
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
      return handler.createEmailTemplate(req, reply);
    }
  });

  app.route({
    url: base_url,
    method: 'GET',
    name: "ListEmailTemplates",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      tags: ['EmailTemplate'],
      summary: 'List EmailTemplates',
      description: 'API to list all EmailTemplates.',
      required: ['workspace_id'],
      query: {
        name:  {
          type: 'string',
          minLength: 2
        },
        event:  {
          type: 'string',
          minLength: 2
        },
        subject:  {
          type: 'string',
          minLength: 2
        },
        workspace_id:  {
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
      return handler.listEmailTemplate(req, reply);
    }
  });

  app.route({
    url: base_url + "/:email_template_id",
    method: 'GET',
    name: "ShowEmailTemplateDetail",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      tags: ['EmailTemplate'],
      summary: 'Show EmailTemplate Detail',
      description: 'API to show detail of a EmailTemplate.',
      required: ['workspace_id'],
      query: {
        workspace_id:  {
          type: 'string',
        },
      }
    },
    handler: async (req, reply) => {
      return handler.showEmailTemplateDetail(req, reply);
    }
  });

  app.route({
    url: base_url + "/:email_template_id",
    method: 'PUT',
    name: "UpdateEmailTemplate",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      tags: ['EmailTemplate'],
      summary: 'Update EmailTemplate',
      description: 'API to update a EmailTemplate.',
      required: ['workspace_id'],
      body: {
        name:  {
          type: 'string',
          minLength: 2
        },
        event:  {
          type: 'string',
          minLength: 2
        },
        subject:  {
          type: 'string',
          minLength: 2
        },
        body:  {
          type: 'string',
          minLength: 2
        },
        description:  {
          type: 'string',
        },
      },
      query: {
        workspace_id:  {
          type: 'string',
        },
      }
    },
    handler: async (req, reply) => {
      return handler.updateEmailTemplate(req, reply);
    }
  });

  app.route({
    url: base_url+ "/:email_template_id",
    method: 'DELETE',
    name: "DeleteEmailTemplate",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      tags: ['EmailTemplate'],
      summary: 'Delete EmailTemplate',
      description: 'API to delete a EmailTemplate.',
      required: ['workspace_id'],
      body: {
      },
      query: {
        workspace_id:  {
          type: 'string',
        },
      }
    },
    handler: async (req, reply) => {
      return handler.deleteEmailTemplate(req, reply);
    }
  });

}

module.exports = {
  activate
};