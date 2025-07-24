const Handler = require('../../handlers/NotificationsHandler');

const authMiddlewares = require('../../middlewares/auth');
const AuthType = require('../../constants/AuthType');
const authorize = require('../../ability/authorize');

async function activate(app) {

  let handler = new Handler();

  let base_url = '/api/profile/notifications'

  app.route({
    url: base_url,
    method: 'GET',
    name: "GetNotifications",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      tags: ['Notifications'],
      summary: 'Get Notifications',
      description: 'API to get notifications.',
      required: [],
    },

    handler: async (req, reply) => {
      return handler.getNotifications(req, reply);
    }
  });


  app.route({
    url: base_url + '/courier/authenticate',
    method: 'GET',
    name: "AuthenticateCourier",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      tags: ['Notifications'],
      summary: 'Authenticate Courier',
      description: 'API to authenticate courier.',
      query: {
        type: 'object',
        properties: {
          workspaceId: { type: 'string' }
        }
      }
    },
    handler: async (req, reply) => {
      return handler.authenticateCourier(req, reply);
    }
  });
}

module.exports = { activate };