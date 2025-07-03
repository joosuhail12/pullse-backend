// routes/CopilotProfileRoutes.js
const Handler = require('../../handlers/PreBuildActionHandler');
const authorize = require('../../ability/authorize');

async function activate(app) {
  const handler = new Handler();
  const base_url = '/api/pre-build-actions';

//   app.route({
//     url: base_url,
//     method: 'POST',
//     name: 'CreatePreBuildAction',
//     preHandler: authorize('create', 'PreBuildAction'),
//     schema: {
//       operationId: 'CreatePreBuildAction',
//       tags: ['pre-build-actions'],
//       summary: 'Create Pre Build Action',
//       description: 'API to create a Pre Build Action.',
//       consumes: ['multipart/form-data'],
//       body: {
//         type: 'object',
//         properties: {
//             name: { type: 'string' },
//             description: { type: 'string' },
//             type: { type: 'string' },
//             parameters: { type: 'object' },
//             action: { type: 'string' },
//             action_id: { type: 'string' },
//             action_type: { type: 'string' },
//         },
//         required: []
//       }
//     },
//     handler: async (req, reply) => {
//       return handler.createConversation(req, reply);
//     }
//   });
app.route({
    url: `${base_url}/:id`,
    method: 'GET',
    name: 'GetPreBuildActionById',
    preHandler: authorize('read', 'PreBuildAction'),
    schema: {
      operationId: 'GetPreBuildActionById',
      tags: ['pre-build-actions'],
      summary: 'Get Pre Build Action by ID',
      description: 'API to get a single Pre Build Action.',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        },
        required: ['id']
      }
    },
    handler: async (req, reply) => {
      return handler.getPreBuildActionById(req, reply);
    }
  });
  
  app.route({
    url: `${base_url}`,
    method: 'GET',
    name: 'GetPreBuildAction',
    preHandler: authorize('read', 'PreBuildAction'),
    schema: {
      operationId: 'GetPreBuildAction',
      tags: ['pre-build-actions'],
      summary: 'Get Pre Build Action',
      description: 'API to get a Pre Build Action.',
      
    //   body: {
    //     type: 'object',
    //     properties: {
    //       content: { type: 'string' },
    //       type: { type: 'string' },
    //     },
    //     required: []
    //   }
    },
    handler: async (req, reply) => {
      return handler.getPreBuildActionByClientId(req, reply);
    }
  });
}

module.exports = { activate };
