const fastifySwagger = require('@fastify/swagger');
const fastifySwaggerUI = require('@fastify/swagger-ui');
const config = require('../../config');
const tags = require('./tags');

module.exports = async (app) => {
  await app.register(fastifySwagger, {
    swagger: {
      info: {
        title: config.app.name,
        description: config.app.description,
        version: config.app.version
      },
      // externalDocs: {
      //   url: config.app.base_url,
      //   description: config.server.info
      // },
      host: config.app.base_url,
      schemes: [config.app.protocol],
      hide: true,
      consumes: ['application/json'],
      produces: ['application/json'],
      tags: tags,
      definitions: {
        User: {
          type: 'object',
          required: ['id', 'email'],
          properties: {
            id: { type: 'string', format: 'uuid' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            email: {type: 'string', format: 'email' }
          }
        }
      },
      securityDefinitions: {
        "Bearer <token>": {
          type: 'apiKey',
          name: 'authorization',
          in: 'header'
        }
      }
    },
  })
  return await app.register(fastifySwaggerUI, {
    routePrefix: '/api-docs',
    uiConfig: {
      docExpansion: 'full',
      deepLinking: false
    },
    uiHooks: {
      onRequest: function (request, reply, next) { next() },
      preHandler: function (request, reply, next) { next() }
    },
    staticCSP: true,
    transformStaticCSP: (header) => header,
    exposeRoute: true
  });
};