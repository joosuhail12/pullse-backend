const Handler = require('../../handlers/RolePermissionHandler');

const authMiddlewares = require('../../middlewares/auth');
const AuthType = require('../../constants/AuthType');

async function activate(app) {

  let handler = new Handler();

  let base_url = '/api/permission'
  app.route({
    url: base_url,
    method: 'POST',
    name: "CreatePermission",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      tags: ['Permission'],
      summary: 'Create User Permission',
      description: 'API to create user permission.',
      body: {
        required: ["id", "name"],
        additionalProperties: false,
        type: 'object',
        properties: {
          id: {
            type: 'string',
          },
          name:  {
            type: 'string',
            minLength: 2
          },
          description:  {
            type: 'string',
          },
        }
      },
    },
    handler: async (req, reply) => {
      return handler.createPermission(req, reply);
    }
  });

  app.route({
    url: base_url,
    method: 'GET',
    name: "ListPermissions",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      tags: ['Permission'],
      summary: 'List Permissions',
      description: 'API to list all Permissions.',
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
      return handler.listPermission(req, reply);
    }
  });

  app.route({
    url: base_url + "/:permission_id",
    method: 'GET',
    name: "ShowPermissionDetail",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      tags: ['Permission'],
      summary: 'Show Permission Detail',
      description: 'API to show detail of a Permission.',
      required: [],
    },
    handler: async (req, reply) => {
      return handler.showPermissionDetail(req, reply);
    }
  });

  app.route({
    url: base_url + "/:permission_id",
    method: 'PUT',
    name: "UpdatePermission",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      tags: ['Permission'],
      summary: 'Update Permission',
      description: 'API to update a Permission.',
      required: [],
      body: {
        id: {
          type: 'string',
        },
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
      return handler.updatePermission(req, reply);
    }
  });

  app.route({
    url: base_url+ "/:permission_id",
    method: 'DELETE',
    name: "DeletePermission",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      tags: ['Permission'],
      summary: 'Delete Permission',
      description: 'API to delete a Permission.',
      required: [],
      body: {
      }
    },
    handler: async (req, reply) => {
      return handler.deletePermission(req, reply);
    }
  });

}

module.exports = {
  activate
};