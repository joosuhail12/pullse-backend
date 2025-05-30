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
    preHandler: authorize('read','Notifications'),
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
}

module.exports = { activate };