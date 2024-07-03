const Handler = require('../../handlers/EmailDomainHandler');

const authMiddlewares = require('../../middlewares/auth');
const AuthType = require('../../constants/AuthType');

async function activate(app) {

  let handler = new Handler();

  let base_url = '/api/email-domain'
  app.route({
    url: base_url,
    method: 'POST',
    name: "CreateEmailDomain",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      operationId: "CreateEmailDomain",
      tags: ['EmailDomain'],
      summary: 'Create EmailDomain',
      description: 'API to create emailDomain.',
      required: ['name', 'domain', 'workspace_id'],
      body: {
        additionalProperties: false,
        type: 'object',
        properties: {
          EmailDomain:{
            type: 'string',
            minLength: 2
          },
          senderName:{
            type: 'string',
            minLength: 2
          },
          fromEmail:{
            type: 'string',
            // pattern: '/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;'
          },
          checkboxDefault:{
            type: 'boolean',
          },
          ReplytoEmail:{
            type: 'string',
            // pattern: '/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;'
          },
          DKIM:{
            type: 'boolean',
          },
          description:  {
            type: 'string',
          },
        }
      },
      query: {
        workspace_id:  {
          type: 'string',
          // required: true
        },
      }
    },
    handler: async (req, reply) => {
      // return null;
      return handler.createEmailDomain(req, reply);
    }
  });

  app.route({
    url: base_url,
    method: 'GET',
    name: "ListEmailDomains",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      operationId: "ListEmailDomains",
      tags: ['EmailDomain'],
      summary: 'List EmailDomains',
      description: 'API to list all EmailDomains.',
      required: ['workspace_id'],
      query: {
        name:  {
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
      return handler.listEmailDomain(req, reply);
    }
  });

  app.route({
    url: base_url + "/:email_domain_id",
    method: 'GET',
    name: "ShowEmailDomainDetail",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      operationId: "ShowEmailDomainDetail",
      tags: ['EmailDomain'],
      summary: 'Show EmailDomain Detail',
      description: 'API to show detail of a EmailDomain.',
      required: ['workspace_id'],
      query: {
        workspace_id:  {
          type: 'string',
        },
      }
    },
    handler: async (req, reply) => {
      return handler.showEmailDomainDetail(req, reply);
    }
  });

  app.route({
    url: base_url + "/:email_domain_id",
    method: 'PUT',
    name: "UpdateEmailDomain",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      operationId: "UpdateEmailDomain",
      tags: ['EmailDomain'],
      summary: 'Update EmailDomain',
      description: 'API to update a EmailDomain.',
      required: ['workspace_id', 'domain'],
      body: {
        name:  {
          type: 'string',
          minLength: 2
        },
        domain:  {
          type: 'string',
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
      return handler.updateEmailDomain(req, reply);
    }
  });

  app.route({
    url: base_url+ "/:email_domain_id",
    method: 'DELETE',
    name: "DeleteEmailDomain",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      operationId: "DeleteEmailDomain",
      tags: ['EmailDomain'],
      summary: 'Delete EmailDomain',
      description: 'API to delete a EmailDomain.',
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
      return handler.deleteEmailDomain(req, reply);
    }
  });

}

module.exports = {
  activate
};