// plugins/casl.js
const fp = require('fastify-plugin');
const { defineAbilityFor } = require('./defineAbility');
const { ForbiddenError } = require('@casl/ability');
const { verifyUserToken } = require('../middlewares/clerkAuth');

async function caslPlugin(fastify) {
  fastify.decorateRequest('ability', null);

  // Global authentication hook
  fastify.addHook('preHandler', async (request, reply) => {
    const skipAuthPaths = [
      '/api/clerk-auth/login',
      '/api/email-domain/email-webhook',
      '/api/widgets/getWidgetConfig',
      '/api/widgets/createContactDevice',
      '/api/widgets/getContactDeviceTickets',
      '/api/ably/widgetToken',
      '/api/widgets/getConversationWithTicketId',
      '/api/widgets/uploadWidgetFileAttachment',
      '/api/widgets/updateTicketRating',
      '/api/workflow/notify',
      '/api/pullse/create-new-user',
      '/api/workflow/cron/check-unresponsiveness',
      '/api/clerk-sync/create-user-org', // Clerk user creation endpoint - public access
      // has seperate auth token for these routes
      '/api/user/set-password',
      '/api/user/verify-magic-link',
      '/api/clerk-sync/membership-webhook', // Clerk org membership webhook - public
      // '/api-docs'
    ];

    if (skipAuthPaths.some(path => request.url.includes(path))) return;

    const token = request?.headers?.authorization?.split('Bearer ')[1];
    const user = await verifyUserToken(token);
    request.user = user;
    request.authUser = user;
    if (!request.user) {
      reply.code(401).send({ error: 'Unauthorized' });
      return;
    }
    request.ability = defineAbilityFor(request.user);
  });

  fastify.decorateRequest('checkPermission', function (action, subject) {
    if (!this.ability.can(action, subject)) {
      throw ForbiddenError.from(this.ability).setMessage('Access denied');
    }
  });
}

module.exports = fp(caslPlugin);
