const fp = require('fastify-plugin');
const defineAbilityFor = require("./defineAbility");


const caslPlugin = async (fastify) => {
  fastify.decorateRequest('ability', null);
  
  fastify.addHook('preHandler', async (request, reply) => {
    const user = request.authUser;
    if(user) {
      request.ability = defineAbilityFor(user);
    }
  })
}

module.exports = fp(caslPlugin);
