const Handler = require('../../handlers/UserRoleHandler');

const authMiddlewares = require('../../middlewares/auth');
const AuthType = require('../../constants/AuthType');

async function activate(app) {

  let handler = new Handler();

  let base_url = '/api/role'
  app.route({
    url: base_url,
    method: 'POST',
    name: "CreateRole",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      tags: ['Role'],
      summary: 'Create User Role',
      description: 'API to create user role.',
      body: {
        required: ['name'],
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
          permissions: {
            type: 'string',
          },
        }
      },
    },
    handler: async (req, reply) => {
      return handler.createRole(req, reply);
    }
  });

  app.route({
    url: base_url,
    method: 'GET',
    name: "ListRoles",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      tags: ['Role'],
      summary: 'List Roles',
      description: 'API to list all Roles.',
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
      return handler.listRoles(req, reply);
    }
  });

  app.route({
    url: base_url + "/:role_id",
    method: 'GET',
    name: "ShowRoleDetail",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      tags: ['Role'],
      summary: 'Show Role Detail',
      description: 'API to show detail of a Role.',
      required: [],
    },
    handler: async (req, reply) => {
      return handler.showRoleDetail(req, reply);
    }
  });

  app.route({
    url: base_url + "/:role_id",
    method: 'PUT',
    name: "UpdateRole",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      tags: ['Role'],
      summary: 'Update Role',
      description: 'API to update a Role.',
      required: [],
      body: {
        name: {
          type: 'string',
          minLength: 2
        },
        description: {
          type: 'string',
        },
        permissions: {
          type: 'string',
        },
      }
    },
    handler: async (req, reply) => {
      return handler.updateRole(req, reply);
    }
  });

  app.route({
    url: base_url + "/:role_id",
    method: 'DELETE',
    name: "DeleteRole",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      tags: ['Role'],
      summary: 'Delete Role',
      description: 'API to delete a Role.',
      required: [],
      body: {
      }
    },
    handler: async (req, reply) => {
      return handler.deleteRole(req, reply);
    }
  });

}

module.exports = {
  activate
};