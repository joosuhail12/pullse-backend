// plugins/casl.js
const fp = require('fastify-plugin');
const { defineAbilityFor } = require('./defineAbility');
const { ForbiddenError } = require('@casl/ability');
const authMiddlewares = require('../middlewares/auth');

async function caslPlugin(fastify) {
  fastify.decorateRequest('ability', null);

  fastify.addHook('preHandler', async (request, reply) => {
    console.log('request.url', request.url)
    if (request.url.includes('/auth/login')) return
    if (request.url.includes('/auth/logout')) return
    if (request.url.includes('/api/email-domain/email-webhook')) return
    if (request.url.includes('/api/widgets/getWidgetConfig')) return
    if (request.url.includes('/api/widgets/createContactDevice')) return
    if (request.url.includes('/api/widgets/getContactDeviceTickets')) return
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

  fastify.decorateRequest('checkPermission', function (action, subject) {
    if (!this.ability.can(action, subject)) {
      throw ForbiddenError.from(this.ability).setMessage('Access denied');
    }
  });
}

module.exports = fp(caslPlugin);
