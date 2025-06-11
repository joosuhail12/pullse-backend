// routes/CopilotProfileRoutes.js
const Handler = require('../../handlers/CopilotProfileHandler');
const authorize = require('../../ability/authorize');

async function activate(app) {
  const handler = new Handler();
  const base_url = '/api/copilot-profiles';

  app.route({
    url: base_url,
    method: 'POST',
    name: 'CreateCopilotProfile',
    preHandler: authorize('create', 'CopilotProfile'),
    schema: {
      operationId: 'CreateCopilotProfile',
      tags: ['copilot-profiles'],
      summary: 'Create Copilot Profile',
      description: 'API to create a Copilot profile with image and metadata.',
      consumes: ['multipart/form-data'],
      body: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          persona_name: { type: 'string' },
          team_id: { type: 'string' },
          system_actions: { type: 'array', items: { type: 'string' } },
          custom_actions: { type: 'array', items: { type: 'string' } },
          content_ids: { type: 'array', items: { type: 'string' } },
          avatar: { type: 'string', format: 'binary' }
        },
        required: ['name', 'persona_name', 'team_id']
      }
    },
    handler: async (req, reply) => {
      return handler.createProfile(req, reply);
    }
  });
  app.route({
    url: `${base_url}`,
    method: 'GET',
    name: 'ListCopilotProfiles',
    preHandler: authorize('read', 'CopilotProfile'),
    schema: {
      operationId: 'ListCopilotProfiles',
      tags: ['copilot-profiles'],
      summary: 'List Copilot Profiles',
      description: 'API to list all Copilot profiles.',
      query: {},
    },
    handler: async (req, reply) => {
      return handler.listProfiles(req, reply);
    }
  });
}

module.exports = { activate };
