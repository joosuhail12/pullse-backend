const Handler = require('../../handlers/TeamHandler');

const authMiddlewares = require('../../middlewares/auth');
const AuthType = require('../../constants/AuthType');

async function activate(app) {

  let handler = new Handler();

  let base_url = '/api/team'
  app.route({
    url: base_url,
    method: 'POST',
    name: "CreateTeam",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      tags: ['Team'],
      summary: 'Create User Team',
      description: 'API to create user team.',
      body: {
        required: ['name'],
        additionalProperties: false,
        type: 'object',
        properties: {
          name:  {
            type: 'string',
            minLength: 2
          },
          description:  {
            type: 'string',
          },
          workspaceId:  {
            type: 'string',
          },
        }
      },
    },
    handler: async (req, reply) => {
      return handler.createTeam(req, reply);
    }
  });

  app.route({
    url: base_url,
    method: 'GET',
    name: "ListTeams",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      tags: ['Team'],
      summary: 'List Teams',
      description: 'API to list all Teams.',
      required: [],
      query: {
        page: {
          type: 'string',
        },
        skip: {
          type: 'number'
        },
        limit: {
          type: 'number'
        },
        sort_by: {
          type: 'string',
        },
        sort_order: {
          type: 'string',
        }
      }
    },
    handler: async (req, reply) => {
      return handler.listTeam(req, reply);
    }
  });

  app.route({
    url: base_url + "/:team_id",
    method: 'GET',
    name: "ShowTeamDetail",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      tags: ['Team'],
      summary: 'Show Team Detail',
      description: 'API to show detail of a Team.',
      required: [],
    },
    handler: async (req, reply) => {
      return handler.showTeamDetail(req, reply);
    }
  });

  app.route({
    url: base_url + "/:team_id",
    method: 'PUT',
    name: "UpdateTeam",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      tags: ['Team'],
      summary: 'Update Team',
      description: 'API to update a Team.',
      required: [],
      body: {
        name:  {
          type: 'string',
          minLength: 2
        },
        description:  {
          type: 'string',
        },
      }
    },
    handler: async (req, reply) => {
      return handler.updateTeam(req, reply);
    }
  });

  app.route({
    url: base_url+ "/:team_id",
    method: 'DELETE',
    name: "DeleteTeam",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      tags: ['Team'],
      summary: 'Delete Team',
      description: 'API to delete a Team.',
      required: [],
      body: {
      }
    },
    handler: async (req, reply) => {
      return handler.deleteTeam(req, reply);
    }
  });

}

module.exports = {
  activate
};