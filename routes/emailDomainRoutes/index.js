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
    preHandler: authMiddlewares.checkClerkToken(AuthType.user),
    schema: {
      operationId: "CreateEmailDomain",
      tags: ['EmailDomain'],
      summary: 'Create EmailDomain',
      description: 'API to create emailDomain.',
      required: ['domain'],
      body: {
        additionalProperties: false,
        type: 'object',
        properties: {
          name: {
            type: 'string',
            minLength: 2
          },
          domain: {
            type: 'string',
            // minLength: 2,
            // pattern: '^(?!-)[A-Za-z0-9-]{1,63}(?<!-)\.(?!-)[A-Za-z0-9-]{1,63}(?<!-)(\.[A-Za-z]{2,})+$'
          },
          description: {
            type: 'string',
          },
        }
      },
      query: {
        workspace_id: {
          type: 'string',
          // required: true
        },
      }
    },
    handler: async (req, reply) => {
      return handler.createEmailDomain(req, reply);
    }
  });

  app.route({
    url: base_url,
    method: 'GET',
    name: "ListEmailDomains",
    preHandler: authMiddlewares.checkClerkToken(AuthType.user),
    schema: {
      operationId: "ListEmailDomains",
      tags: ['EmailDomain'],
      summary: 'List EmailDomains',
      description: 'API to list all EmailDomains.',
      required: ['workspace_id'],
      query: {
        name: {
          type: 'string',
          minLength: 2
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
      return handler.listEmailDomain(req, reply);
    }
  });

  app.route({
    url: base_url + "/:email_domain_id",
    method: 'GET',
    name: "ShowEmailDomainDetail",
    preHandler: authMiddlewares.checkClerkToken(AuthType.user),
    schema: {
      operationId: "ShowEmailDomainDetail",
      tags: ['EmailDomain'],
      summary: 'Show EmailDomain Detail',
      description: 'API to show detail of a EmailDomain.',
      required: [''],
      query: {
        workspace_id: {
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
    preHandler: authMiddlewares.checkClerkToken(AuthType.user),
    schema: {
      operationId: "UpdateEmailDomain",
      tags: ['EmailDomain'],
      summary: 'Update EmailDomain',
      description: 'API to update a EmailDomain.',
      required: ['workspace_id', 'domain'],
      body: {
        name: {
          type: 'string',
          minLength: 2
        },
        domain: {
          type: 'string',
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
      return handler.updateEmailDomain(req, reply);
    }
  });

  app.route({
    url: base_url + "/:email_domain_id",
    method: 'DELETE',
    name: "DeleteEmailDomain",
    preHandler: authMiddlewares.checkClerkToken(AuthType.user),
    schema: {
      operationId: "DeleteEmailDomain",
      tags: ['EmailDomain'],
      summary: 'Delete EmailDomain',
      description: 'API to delete a EmailDomain.',
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
      return handler.deleteEmailDomain(req, reply);
    }
  });

  app.route({
    url: base_url + "/:email_domain_id/keys",
    method: 'GET',
    name: "GetEmailDomainKeys",
    preHandler: authMiddlewares.checkClerkToken(AuthType.user),
    schema: {
      operationId: "GetEmailDomainKeys",
      tags: ['EmailDomain'],
      summary: 'Get EmailDomain DNS Keys',
      description: 'API to get EmailDomain DNS Keys.',
      required: ['email_domain_id'],
    },
    handler: async (req, reply) => {
      return handler.listDomainKeys(req, reply);
    }
  })
  app.route({
    url: base_url + "/send-email",
    method: 'POST',
    name: "SendEmail",
    preHandler: authMiddlewares.checkClerkToken(AuthType.user),
    schema: {
      operationId: "SendEmail",
      tags: ['EmailDomain'],
      summary: 'Send Email',
      description: 'API to send email.',
      required: ['ticketId', 'message'],
      body: {
        type: 'object',
        properties: {
          ticketId: {
            type: 'string',
          },
          message: {
            type: 'string',
          },
        }
      },
    },
    handler: async (req, reply) => {
      return handler.sendEmail(req, reply);
    }
  })


  app.route({
    url: base_url + "/email-webhook",
    method: 'POST',
    name: "EmailWebhook",
    schema: {
      operationId: "EmailWebhook",
      tags: ['EmailDomain'],
      summary: 'Email Webhook',
      description: 'API to receive email webhook.',
      required: [''],
    },
    handler: async (req, reply) => {
      return handler.emailWebhook(req, reply);
    }
  })

  app.route({
    url: base_url + "/:email_domain_id",
    method: 'POST',
    name: "VerifyEmailDomainKeys",
    preHandler: authMiddlewares.checkClerkToken(AuthType.user),
    schema: {
      operationId: "VerifyEmailDomainKeys",
      tags: ['EmailDomain'],
      summary: 'Verify EmailDomain DNS Keys',
      description: 'API to Verify EmailDomain DNS Keys.',
      required: ['email_domain_id'],
    },
    handler: async (req, reply) => {
      return handler.verifyDomainKeys(req, reply);
    }
  })
}

module.exports = {
  activate
};