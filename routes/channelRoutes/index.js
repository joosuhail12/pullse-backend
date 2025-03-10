const Handler = require('../../handlers/channelHandler');
const authMiddlewares = require('../../middlewares/auth');
const AuthType = require('../../constants/AuthType');
const authorize = require('../../ability/authorize');

async function activate(app) {

  let handler = new Handler();

  let base_url = '/api/channels';

  // Create Channel
  app.route({
    url: base_url,
    method: 'POST',
    name: "CreateChannel",
    preHandler: authorize('create', 'Channel'),
    schema: {
      operationId: "CreateChannel",
      tags: ['channels'],
      summary: 'Create Channel',
      description: 'API to create a communication channel.',
      body: {
        required: ['name', 'type', 'config'],
        additionalProperties: false,
        type: 'object',
        properties: {
          clientId: { type: 'string' },
          workspaceId: { type: 'string' },
          name: { type: 'string', minLength: 2 },
          type: {
            type: 'string',
            enum: ['email', 'chat_widget', 'whatsapp', 'social_media']
          },
          config: { type: 'object' }
        }
      },
    },
    handler: async (req, reply) => {
      return handler.createChannel(req, reply);
    }
  });

  // List Channels
  app.route({
    url: base_url,
    method: 'GET',
    name: "ListChannels",
    preHandler: authorize('read', 'Channel'),
    schema: {
      operationId: "ListChannels",
      tags: ['channels'],
      summary: 'List Channels',
      description: 'API to list all channels.',
    },
    handler: async (req, reply) => {
      return handler.getAllChannels(req, reply);
    }
  });

  // Add Email to Channel
  app.route({
    url: base_url + '/:channelId/emails',
    method: 'POST',
    name: "AddEmailToChannel",
    preHandler: authorize('update', 'Channel'),
    schema: {
      operationId: "AddEmailToChannel",
      tags: ['channels'],
      summary: 'Add Email to Channel',
      description: 'API to add an email address to an email channel.',
      body: {
        required: ['emailAddress', 'domain'],
        additionalProperties: false,
        type: 'object',
        properties: {
          emailAddress: { type: 'string', format: 'email' },
          domain: { type: 'string' },
          protocolConfig: { type: 'object' }
        }
      }
    },
    handler: async (req, reply) => {
      return handler.addEmailToChannel(req, reply);
    }
  });

  // Assign Channel to Team
  app.route({
    url: '/api/team/:teamId/channels/:channelId',
    method: 'POST',
    name: "AssignChannelToTeam",
    preHandler: authorize('update', 'Channel'),
    schema: {
      operationId: "AssignChannelToTeam",
      tags: ['channels', 'teams'],
      summary: 'Assign Channel to Team',
      description: 'API to assign a channel to a team.',
    },
    handler: async (req, reply) => {
      return handler.assignChannelToTeam(req, reply);
    }
  });

  // List Team's Channels
  app.route({
    url: '/api/team/:teamId/channels',
    method: 'GET',
    name: "ListTeamChannels",
    preHandler: authorize('read', 'Channel'),
    schema: {
      operationId: "ListTeamChannels",
      tags: ['channels', 'teams'],
      summary: 'List Team Channels',
      description: 'API to list all channels assigned to a team.',
    },
    handler: async (req, reply) => {
      return handler.getTeamChannels(req, reply);
    }
  });

  // Delete Channel
  app.route({
    url: base_url + '/:channelId',
    method: 'DELETE',
    name: "DeleteChannel",
    preHandler: authorize('delete', 'Channel'),
    schema: {
      operationId: "DeleteChannel",
      tags: ['channels'],
      summary: 'Delete Channel',
      description: 'API to delete a channel.',
    },
    handler: async (req, reply) => {
      return handler.deleteChannel(req, reply);
    }
  });

}

module.exports = {
  activate
};
