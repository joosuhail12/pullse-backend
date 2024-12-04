const Handler = require('../../handlers/ProfileHandler');

const authMiddlewares = require('../../middlewares/auth');
const AuthType = require('../../constants/AuthType');
const authorize = require('../../ability/authorize');

async function activate(app) {

  let handler = new Handler();

  let base_url = '/api/profile'

  app.route({
    url: base_url,
    method: 'GET',
    name: "ShowUserProfile",
    preHandler: authorize('read','Profile'),
    schema: {
      tags: ['Profile'],
      summary: 'Show User Profile',
      description: 'API to show user profile.',
      required: [],
    },

    handler: async (req, reply) => {
      return handler.showUserProfile(req, reply);
    }
  });




  app.route({
    url: base_url + '/abilities',
    method: 'GET',
    name: "Abilities",
    preHandler: authorize('read','Profile'),
    schema: {
      tags: ['Profile'],
      summary: 'Read abilities',
      description: 'API to Read abilities.',
      required: [],
    },

    handler: async (req, reply) => {
      return handler.getAbilities(req, reply);
    }
  });

  app.route({
    url: base_url + "/update",
    method: 'PUT',
    name: "UpdateUserProfile",
    preHandler: authorize('update','Profile'),
    schema: {
      tags: ['Profile'],
      summary: 'Update User Profile',
      additionalProperties: false,
      description: 'API to update a User Profile.',
      required: [ "first_name", "last_name", ],
      body: {
        first_name: {
          type: 'string',
          minLength: 2
        },
        last_name: {
          type: 'string',
          minLength: 2
        },
      }
    },
    handler: async (req, reply) => {
      return handler.updateUserProfile(req, reply);
    }
  });


  app.route({
    url: base_url + "/workspace",
    method: 'PUT',
    name: "UpdateWorkspaceUserProfile",
    preHandler: authorize('update','Profile'),
    schema: {
      tags: ['Profile'],
      summary: 'Update Default Workspace ',
      additionalProperties: false,
      description: 'API to update default workspace.',
      required: [ "workspaceId", ],
      body: {
        workspaceId:{
          type: 'string',
        },
      }
    },
    handler: async (req, reply) => {
      return handler.setDefaultWorkspace(req, reply);
    }
  });




  app.route({
    url: base_url + "/change-password",
    method: 'PATCH',
    name: "ChangePassword",
    preHandler: authorize('update','Profile'),
    schema: {
      tags: ['Profile', "Change Password"],
      summary: 'Change User Password',
      description: 'API to Change User Password.',
      required: [ "password", "new_password", "logout_all"],
      body: {
        password: {
          type: 'string',
          minLength: 8
        },
        new_password: {
          type: 'string',
          minLength: 8
        },
        logout_all: {
          type: 'boolean',
        },
      }
    },
    handler: async (req, reply) => {
      return handler.changePassword(req, reply);
    }
  });
}

module.exports = {
  activate
};