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
      required: ['name', 'workspace_id'],
      body: {
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
          message:  {
            type: 'string',
          },
        }
      },
      query: {
        workspace_id:  {
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
        name:  {
          type: 'string',
          minLength: 2
        },
        workspace_id:  {
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
        workspace_id:  {
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
    method: 'PUT',
    name: "UpdateCannedResponse",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      operationId: "UpdateCannedResponse",
      tags: ['CannedResponse'],
      summary: 'Update CannedResponse',
      description: 'API to update a CannedResponse.',
      required: ['workspace_id'],
      body: {
        name:  {
          type: 'string',
          minLength: 2
        },
        description:  {
          type: 'string',
        },
        message:  {
          type: 'string',
        },
      },
      query: {
        workspace_id:  {
          type: 'string',
        },
      }
    },
    handler: async (req, reply) => {
      return handler.updateCannedResponse(req, reply);
    }
  });

  app.route({
    url: base_url+ "/:canned_response_id",
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
        workspace_id:  {
          type: 'string',
        },
      }
    },
    handler: async (req, reply) => {
      return handler.deleteCannedResponse(req, reply);
    }
  });

}

module.exports = {
  activate
};