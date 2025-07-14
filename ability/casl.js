// plugins/casl.js
const fp = require('fastify-plugin');
const { defineAbilityFor } = require('./defineAbility');
const { ForbiddenError } = require('@casl/ability');
const authMiddlewares = require('../middlewares/auth');

async function caslPlugin(fastify) {
  fastify.decorateRequest('ability', null);

  // =====================================================================
  // TEMPORARY CODE: REMOVE BEFORE COMMITTING
  // Modify authentication hook to allow Swagger UI access without token
  fastify.addHook('preHandler', async (request, reply) => {
    const skipAuthPaths = [
      '/auth/login',
      '/auth/logout',
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
      // has seperate auth token for these routes
      '/api/user/set-password',
      '/api/user/verify-magic-link',
      // TEMP: Remove this line when done with Swagger documentation
      // '/api-docs'
    ];

    if (skipAuthPaths.some(path => request.url.includes(path))) return;

    // Original authentication logic below
    let token = request?.headers?.authorization?.split("Bearer ")[1]
    let user = await authMiddlewares.verifyUserToken(token);
    // console.log('workspaceUser',user)
    request.user = user;
    request.authUser = user;
    if (!request.user) {
      reply.code(401).send({ error: 'Unauthorized' });
      return;
    }
    request.ability = defineAbilityFor(request.user);
  });
  // END TEMPORARY CODE
  // =====================================================================

  fastify.decorateRequest('checkPermission', function (action, subject) {
    if (!this.ability.can(action, subject)) {
      throw ForbiddenError.from(this.ability).setMessage('Access denied');
    }
  });
}

module.exports = fp(caslPlugin);
