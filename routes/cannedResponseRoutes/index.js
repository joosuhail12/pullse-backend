const Handler = require('../../handlers/CannedResponseHandler');

const authMiddlewares = require('../../middlewares/auth');
const AuthType = require('../../constants/AuthType');

async function activate(app) {

  let handler = new Handler();

  let base_url = '/api/canned-response'
  app.route({
    url: base_url,
    method: 'POST',
    name: "CreateCannedResponse",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      operationId: "CreateCannedResponse",
      tags: ['CannedResponse'],
      summary: 'Create CannedResponse',
      description: 'API to create cannedResponse.',
      required: ['name', 'message', 'shortcut', 'category', 'isShared'],
      body: {
        additionalProperties: false,
        type: 'object',
        properties: {
          name: {
            type: 'string',
            minLength: 2
          },
          message: {
            type: 'string',
          },
          shortcut: {
            type: 'string',
          },
          category: {
            type: 'string',
          },
          isShared: {
            type: 'boolean',
          },
          sharedTeams: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                teamId: { type: 'string' },
                typeOfSharing: { type: 'string' }
              },
              required: ['teamId', 'typeOfSharing']
            }
          }

        }
      },
      query: {
        workspace_id: {
          type: 'string',
        },
      }
    },
    handler: async (req, reply) => {
      return handler.createCannedResponse(req, reply);
    }
  });

  app.route({
    url: base_url,
    method: 'GET',
    name: "ListCannedResponses",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      operationId: "ListCannedResponses",
      tags: ['CannedResponse'],
      summary: 'List CannedResponses',
      description: 'API to list all CannedResponses.',
      required: ['workspace_id'],
      query: {
        name: {
          type: 'string',
          minLength: 2
        },
        workspace_id: {
          type: 'string',
        },
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
      return handler.listCannedResponse(req, reply);
    }
  });

  app.route({
    url: base_url + "/:canned_response_id",
    method: 'GET',
    name: "ShowCannedResponseDetail",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      operationId: "ShowCannedResponseDetail",
      tags: ['CannedResponse'],
      summary: 'Show CannedResponse Detail',
      description: 'API to show detail of a CannedResponse.',
      required: ['workspace_id'],
      query: {
        workspace_id: {
          type: 'string',
        },
      }
    },
    handler: async (req, reply) => {
      return handler.showCannedResponseDetail(req, reply);
    }
  });

  app.route({
    url: base_url + "/:canned_response_id",
    method: 'PATCH',
    name: "UpdateCannedResponse",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      operationId: "UpdateCannedResponse",
      tags: ['CannedResponse'],
      summary: 'Update CannedResponse',
      description: 'API to update a CannedResponse.',
      required: ['workspace_id'],
      body: {
        name: {
          type: 'string',
          minLength: 2
        },
        description: {
          type: 'string',
        },
        message: {
          type: 'string',
        },
      },
      query: {
        workspace_id: {
          type: 'string',
        },
      }
    },
    handler: async (req, reply) => {
      return handler.updateCannedResponse(req, reply);
    }
  });

  app.route({
    url: base_url + "/:canned_response_id",
    method: 'DELETE',
    name: "DeleteCannedResponse",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      operationId: "DeleteCannedResponse",
      tags: ['CannedResponse'],
      summary: 'Delete CannedResponse',
      description: 'API to delete a CannedResponse.',
      required: ['workspace_id'],
      body: {
      },
      query: {
        workspace_id: {
          type: 'string',
        },
      }
    },
    handler: async (req, reply) => {
      return handler.deleteCannedResponse(req, reply);
    }
  });

  // Add: Update all teams for a canned response (delete all, then insert new)
  app.route({
    url: base_url + "/:canned_response_id/teams",
    method: 'PUT',
    name: "UpdateCannedResponseTeams",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      tags: ['CannedResponse'],
      summary: 'Update Canned Response Teams',
      description: 'Replace all teams for a canned response (deletes existing rows then inserts provided list).',
      body: {
        type: 'object',
        required: ['teamIds'],
        properties: {
          teamIds: {
            type: 'array',
            items: { type: 'string' },
            description: 'Array of team UUIDs to associate with the canned response'
          },
          typeOfSharing: {
            type: 'string',
            enum: ['view', 'edit'],
            description: 'Type of sharing for all teams (optional, default view)'
          }
        }
      },
      query: {
        workspace_id: { type: 'string' }
      }
    },
    handler: async (req, reply) => handler.updateCannedResponseTeams(req, reply)
  });

  // Add: Get all teams for a canned response
  app.route({
    url: base_url + "/:canned_response_id/teams",
    method: 'GET',
    name: "GetCannedResponseTeams",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      tags: ['CannedResponse'],
      summary: 'Get Canned Response Teams',
      description: 'Fetch all teams associated with a canned response.',
      query: {
        workspace_id: { type: 'string' }
      }
    },
    handler: async (req, reply) => handler.getCannedResponseTeams(req, reply)
  });

  // Add: List all canned responses accessible to the current user based on their team memberships
  app.route({
    url: base_url + "/team-accessible",
    method: 'GET',
    name: "ListTeamAccessibleCannedResponses",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      tags: ['CannedResponse'],
      summary: 'List Team Accessible Canned Responses',
      description: 'List all canned responses accessible to the current user based on their team memberships.',
      query: {
        workspace_id: { type: 'string' }
      }
    },
    handler: async (req, reply) => handler.listTeamAccessibleCannedResponses(req, reply)
  });

}

module.exports = {
  activate
};