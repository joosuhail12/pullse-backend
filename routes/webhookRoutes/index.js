const Handler = require('../../handlers/WebhookHandler');

// const authMiddlewares = require('../../middlewares/auth');
// const AuthType = require('../../constants/AuthType');

async function activate(app) {

  let handler = new Handler();

  let base_url = '/api/webhook'

  app.route({
    url: base_url + '/email/send-grid',
    method: 'POST',
    name: "WebhookSendGridEmail",
    // preHandler: authMiddlewares.checkClerkToken(AuthType.user),
    schema: {
      tags: ['Webhook', "SendGrid", "Email"],
      summary: 'API to receive Emails from SendGrid',
      description: 'API to show user profile.',
      required: [],
    },
    handler: async (req, reply) => {
      return handler.processEmail(req, reply, "send-grid");
    }
  });

}

module.exports = {
  activate
};