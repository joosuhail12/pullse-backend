const Handler = require('../../handlers/ClientHandler');

const authMiddlewares = require('../../middlewares/auth');
const AuthType = require('../../constants/AuthType');

async function activate(app) {

  let handler = new Handler();

  let base_url = '/api/client'
  app.route({
    url: base_url,
    method: 'POST',
    name: "CreateClient",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      tags: ['Client'],
      summary: 'Create Client',
      description: 'API to create a client.',
      body: {
        required: ['name', 'owner'],
        additionalProperties: false,
        type: 'object',
        properties: {
          name: {
            type: 'string',
            minLength: 2
          },
          status: {
            type: 'string'
          },
          owner: {
            type: 'object',
            properties: {
              fName: {
                type: 'string',
                minLength: 2
              },
              lName: {
                type: 'string',
                minLength: 2
              },
              email: {
                type: 'string',
                format: 'email'
              },
              password: {
                type: 'string',
                minLength: 2
              },
            }
          }
        }
      },
    },
    handler: async (req, reply) => {
      return handler.createClient(req, reply);
    }
  });

  app.route({
    url: base_url,
    method: 'GET',
    name: "ListClients",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      tags: ['Client'],
      summary: 'List Clients',
      description: 'API to list all clients.',
      required: [],
      query: {
        page: {
          type: 'string',
        },
        skip: {
          type: 'number'
        },
        limit: {
          type: 'number'
        }
      }
    },
    handler: async (req, reply) => {
      return handler.listClients(req, reply);
    }
  });

  app.route({
    url: base_url + "/:client_id",
    method: 'GET',
    name: "ShowClientDetail",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      tags: ['Client'],
      summary: 'Show Client Detail',
      description: 'API to show detail of a client.',
      required: [],
    },
    handler: async (req, reply) => {
      return handler.showClientDetail(req, reply);
    }
  });

  app.route({
    url: base_url + "/:client_id",
    method: 'PUT',
    name: "UpdateClient",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      tags: ['Client'],
      summary: 'Update Client',
      description: 'API to update a client.',
      required: [],
      body: {
        name: { type: 'string' },
        status: { type: 'string' },
        auth: { type: 'object' },
      }
    },
    handler: async (req, reply) => {
      return handler.updateClient(req, reply);
    }
  });



  app.route({
    url: base_url+ "/:client_id",
    method: 'DELETE',
    name: "DeleteClient",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      tags: ['Client'],
      summary: 'Delete Client',
      description: 'API to delete a client.',
      required: [],
      body: {
      }
    },
    handler: async (req, reply) => {
      return handler.deleteClient(req, reply);
    }
  });

}

module.exports = {
  activate
};