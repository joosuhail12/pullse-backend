const Handler = require('../../handlers/UserHandler');

const authMiddlewares = require('../../middlewares/auth');
const AuthType = require('../../constants/AuthType');
const authorize = require('../../ability/authorize');

async function activate(app) {

  let handler = new Handler();

  let base_url = '/api/user'
  let CreateUserRouteConfig = {
    url: base_url,
    method: 'POST',
    name: "CreateUser",
    preHandler: authorize('create', 'User'),
    schema: {
      tags: ['User'],
      summary: 'Create User',
      description: 'API to create user.',
      body: {
        required: ["first_name", "last_name", "email", "password", "confirm_password"],
        additionalProperties: false,
        type: 'object',
        properties: {
          first_name: {
            type: 'string',
            description: "User first_name",
            minLength: 2
          },
          last_name: {
            type: 'string',
            description: "User last_name",
            minLength: 2
          },
          email: {
            type: 'string',
            description: "User email",
            format: 'email'
          },
          roleIds: {
            type: 'array',
            items: {
              type: 'string',
            },
            description: "Array of role IDs to assign to the user"
          },

          password: {
            type: 'string',
            description: "User password",
            minLength: 8
          },
          confirm_password: {
            type: 'string',
            description: "confirm password(same password)",
            minLength: 8
          },
          teamId: {
            type: 'string',
            description: "Id of user's team",
          },
        }
      },
    },
    handler: async (req, reply) => {
      return handler.createUser(req, reply);
    }
  };
  app.route(CreateUserRouteConfig);
  // CreateUserRouteConfig.url = base_url+'/internal';
  // CreateUserRouteConfig.preHandler

  app.route({
    url: base_url,
    method: 'GET',
    name: "ListUsers",
    preHandler: authorize('read', 'User'),
    schema: {
      tags: ['User'],
      summary: 'List Users',
      description: 'API to list all users.',
      required: [],
      query: {
        name: {
          type: 'string',
        },
        email: {
          type: 'string'
        },
        roleId: {
          type: 'string'
        },
        teamId: {
          type: 'string',
          description: "Id of user's team",
        },
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
      return handler.listUsers(req, reply);
    }
  });

  app.route({
    url: base_url + "/profile",
    method: 'GET',
    name: "ShowUserProfile",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      tags: ['User'],
      summary: 'Show User Profile',
      description: 'API to show user profile.',
      required: [],
    },
    handler: async (req, reply) => {
      return handler.showUserProfile(req, reply);
    }
  });

  app.route({
    url: base_url + "/overview",
    method: 'GET',
    name: "GetUserTeamsAndRoles",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      tags: ['User'],
      summary: 'Get User Teams and Roles Overview',
      description: 'API to get current user\'s teams and roles overview.',
      query: {
        workspace_id: {
          type: 'string',
          description: 'ID of the workspace'
        }
      }
    },
    handler: async (req, reply) => {
      return handler.getUserTeamsAndRoles(req, reply);
    }
  });

  app.route({
    url: base_url + "/:user_id",
    method: 'GET',
    name: "ShowUserDetail",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      tags: ['User'],
      summary: 'Show User Detail',
      description: 'API to show detail of a User.',
      required: [],
    },
    handler: async (req, reply) => {
      return handler.showUserDetail(req, reply);
    }
  });

  app.route({
    url: base_url + "/:user_id",
    method: 'PUT',
    name: "UpdateUser",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      tags: ['User'],
      summary: 'Update User',
      description: 'API to update a User.',
      required: ["first_name", "last_name", "email", "role", "password",],
      body: {
        first_name: {
          type: 'string',
          minLength: 2
        },
        last_name: {
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
        status: {
          type: 'string',
        },
        roleIds: {
          type: 'array',
          items: {
            type: 'string',
          }
        },
        teamId: {
          type: 'string',
          description: "Id of user's team",
        },
      }
    },
    handler: async (req, reply) => {
      return handler.updateUser(req, reply);
    }
  });

  app.route({
    url: base_url + "/:user_id",
    method: 'DELETE',
    name: "DeleteUser",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      tags: ['User'],
      summary: 'Delete User',
      description: 'API to delete a User.',
      required: [],
      body: {
      }
    },
    handler: async (req, reply) => {
      return handler.deleteUser(req, reply);
    }
  });

}

module.exports = {
  activate
};