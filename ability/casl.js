// plugins/casl.js
const fp = require('fastify-plugin');
const { defineAbilityFor } = require('./defineAbility');
const { ForbiddenError } = require('@casl/ability');
const authMiddlewares = require('../middlewares/auth');

async function caslPlugin(fastify) {
  fastify.decorateRequest('ability', null);

  fastify.addHook('preHandler', async (request, reply) => {
    console.log(request.url, "request.urlrequest.url")
    if (request.url.includes('/auth/login')) return
    if (request.url.includes('/auth/logout')) return
    if (request.url.includes('webhook')) return // TODO: This should be controllable from the routes not here -- Dev
    if (request.url.includes("api-docs")) return
    let token = request?.headers?.authorization?.split("Bearer ")[1]
    let user = await authMiddlewares.verifyUserToken(token);
    console.log(user, 'tokensssss')
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
