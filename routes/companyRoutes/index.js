const Handler = require('../../handlers/CompanyHandler');
const authMiddlewares = require('../../middlewares/auth');
const AuthType = require('../../constants/AuthType');

async function activate(app) {
  let handler = new Handler();
  let base_url = '/api/company';

  app.route({
    url: base_url,
    method: 'POST',
    name: "CreateCompany",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      tags: ['Company'],
      summary: 'Create Company',
      description: 'API to create a company.',
      required: ['name', 'workspace_id'],
      body: {
        additionalProperties: false,
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 2 },
          description: { type: 'string' },
          phone: { type: 'string' },
          numberOfEmployees: { type: 'number' },
          annualRevenue: { type: 'number' },
          website: { type: 'string' },
          notes: { type: 'string' },
          tagIds: { type: 'array', items: { type: 'string' } },
          tierLevel: { type: 'string' },
          industry: { type: 'string' },
          type: { type: 'string' },
          status: { type: 'string' },
          email: { type: 'string', format: 'email' },
          foundedYear: { type: 'number' },
          mainContact: { type: 'string' },
          marketSegment: { type: 'string' },
          businessModel: { type: 'string' },
          preferredLanguage: { type: 'string' },
          timezone: { type: 'string' },
          socialMedia: { type: 'object', additionalProperties: { type: 'string' } },
          location: {
            type: 'object',
            properties: {
              street: { type: 'string' },
              city: { type: 'string' },
              state: { type: 'string' },
              country: { type: 'string' },
              zipcode: { type: 'string' }
            }
          }
        }
      },
      query: {
        workspace_id: { type: 'string' }
      }
    },
    handler: async (req, reply) => handler.createCompany(req, reply)
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
      querystring: {  // Ensure "querystring" is used instead of "query"
        type: 'object',
        properties: {
          name: { type: 'string' },
          tagId: { type: 'string' },
          workspace_id: { type: 'string' },
          city: { type: 'string' },
          state: { type: 'string' },
          country: { type: 'string' },
          type: { type: 'string' },
          status: { type: 'string' },
          page: { type: 'integer', minimum: 1 },  // Correct type
          skip: { type: 'integer', minimum: 0 },  // Ensure integer type
          limit: { type: 'integer', minimum: 1 },
          sort_by: { type: 'string', enum: ['name', 'createdAt', 'industry'] }, // Allowed sorting fields
          sort_order: { type: 'string', enum: ['asc', 'desc'] }
        },
        additionalProperties: false // Prevents unwanted query parameters
      }
    },
    handler: async (req, reply) => handler.listCompany(req, reply)
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
        workspace_id: { type: 'string' }
      }
    },
    handler: async (req, reply) => handler.showCompanyDetail(req, reply)
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
        type: 'object',
        additionalProperties: false,
        properties: {
          name: { type: 'string', minLength: 2 },
          description: { type: 'string' },
          phone: { type: 'string' },
          numberOfEmployees: { type: 'number' },
          annualRevenue: { type: 'number' },
          website: { type: 'string' },
          notes: { type: 'string' },
          tagIds: { type: 'array', items: { type: 'string' } },
          tierLevel: { type: 'string' },
          industry: { type: 'string' },
          type: { type: 'string' },
          status: { type: 'string' },
          email: { type: 'string', format: 'email' },
          foundedYear: { type: 'number' },
          mainContact: { type: 'string' },
          marketSegment: { type: 'string' },
          businessModel: { type: 'string' },
          preferredLanguage: { type: 'string' },
          timezone: { type: 'string' },
          socialMedia: { type: 'object', additionalProperties: { type: 'string' } },
          location: {
            type: 'object',
            properties: {
              street: { type: 'string' },
              city: { type: 'string' },
              state: { type: 'string' },
              country: { type: 'string' },
              zipcode: { type: 'string' }
            }
          }
        }
      },
      query: {
        workspace_id: { type: 'string' }
      }
    },
    handler: async (req, reply) => handler.updateCompany(req, reply)
  });

  app.route({
    url: base_url + "/:company_id",
    method: 'DELETE',
    name: "DeleteCompany",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      tags: ['Company'],
      summary: 'Delete Company',
      description: 'API to delete a Company.',
      required: ['workspace_id'],
      query: {
        workspace_id: { type: 'string' }
      }
    },
    handler: async (req, reply) => handler.deleteCompany(req, reply)
  });
}

module.exports = {
  activate
};
