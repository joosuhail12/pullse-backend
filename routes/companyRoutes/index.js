const Handler = require('../../handlers/CompanyHandler');

const authMiddlewares = require('../../middlewares/auth');
const AuthType = require('../../constants/AuthType');

async function activate(app) {

  let handler = new Handler();

  let base_url = '/api/company'
  app.route({
    url: base_url,
    method: 'POST',
    name: "CreateCompany",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      tags: ['Company'],
      summary: 'Create Company',
      description: 'API to create company.',
      required: ['name', 'workspace_id'],
      body: {
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
          phone: {
            type: 'string',
          },
          numberOfEmployees: {
            type: 'number',
          },
          annualRevenue: {
            type: 'number',
          },
          websites: {
            type: 'array',
            items: {
              type: 'string',
            }
          },
          notes: {
            type: 'string',
          },
          tagIds: {
            type: 'array',
            items: {
              type: 'string',
            }
          },
          accountTier: {
            type: 'string',
          },
          industry: {
            type: 'string',
          },
          address: {
            type: 'string',
          },
          city: {
            type: 'string',
          },
          state: {
            type: 'string',
          },
          zipcode: {
            type: 'string',
          },
          country: {
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
      return handler.createCompany(req, reply);
    }
  });

  app.route({
    url: base_url,
    method: 'GET',
    name: "ListCompanies",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      tags: ['Company'],
      summary: 'List Companies',
      description: 'API to list all Companies.',
      required: ['workspace_id'],
      query: {
        name:  {
          type: 'string',
        },
        tagId: {
          type: 'string',
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
      return handler.listCompany(req, reply);
    }
  });

  app.route({
    url: base_url + "/:company_id",
    method: 'GET',
    name: "ShowCompanyDetail",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      tags: ['Company'],
      summary: 'Show Company Detail',
      description: 'API to show detail of a Company.',
      required: ['workspace_id'],
      query: {
        workspace_id:  {
          type: 'string',
        },
      }
    },
    handler: async (req, reply) => {
      return handler.showCompanyDetail(req, reply);
    }
  });

  app.route({
    url: base_url + "/:company_id",
    method: 'PUT',
    name: "UpdateCompany",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      tags: ['Company'],
      summary: 'Update Company',
      description: 'API to update a Company.',
      required: ['workspace_id'],
      body: {
        name:  {
          type: 'string',
          minLength: 2
        },
        description: {
          type: 'string',
        },
        phone: {
          type: 'string',
        },
        numberOfEmployees: {
          type: 'number',
        },
        annualRevenue: {
          type: 'number',
        },
        websites: {
          type: 'array',
          items: {
            type: 'string',
          }
        },
        notes: {
          type: 'string',
        },
        tagIds: {
          type: 'array',
          items: {
            type: 'string',
          }
        },
        accountTier: {
          type: 'string',
        },
        industry: {
          type: 'string',
        },
        address: {
          type: 'string',
        },
        city: {
          type: 'string',
        },
        state: {
          type: 'string',
        },
        zipcode: {
          type: 'string',
        },
        country: {
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
      return handler.updateCompany(req, reply);
    }
  });

  app.route({
    url: base_url+ "/:company_id",
    method: 'DELETE',
    name: "DeleteCompany",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      tags: ['Company'],
      summary: 'Delete Company',
      description: 'API to delete a Company.',
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
      return handler.deleteCompany(req, reply);
    }
  });

}

module.exports = {
  activate
};