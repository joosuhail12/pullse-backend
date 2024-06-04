const Handler = require('../../handlers/WorkspaceHandler');

const authMiddlewares = require('../../middlewares/auth');
const AuthType = require('../../constants/AuthType');

async function activate(app) {

  let handler = new Handler();

  let base_url = '/api/workspace'
  app.route({
    url: base_url,
    method: 'POST',
    name: "CreateWorkspace",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      tags: ['Workspace'],
      summary: 'Create Workspace',
      description: 'API to create workspace.',
      required: ['name',],
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
        }
      },
    },
    handler: async (req, reply) => {
      return handler.createWorkspace(req, reply);
    }
  });

  app.route({
    url: base_url,
    method: 'GET',
    name: "ListWorkspaces",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      tags: ['Workspace'],
      summary: 'List Workspaces',
      description: 'API to list all Workspaces.',
      required: [],
      query: {
        name:  {
          type: 'string',
          minLength: 2
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
      return handler.listWorkspace(req, reply);
    }
  });

  app.route({
    url: base_url + "/:workspace_id",
    method: 'GET',
    name: "ShowWorkspaceDetail",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      tags: ['Workspace'],
      summary: 'Show Workspace Detail',
      description: 'API to show detail of a Workspace.',
      required: [],
    },
    handler: async (req, reply) => {
      return handler.showWorkspaceDetail(req, reply);
    }
  });

  app.route({
    url: base_url + "/:workspace_id",
    method: 'PUT',
    name: "UpdateWorkspace",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      tags: ['Workspace'],
      summary: 'Update Workspace',
      description: 'API to update a Workspace.',
      required: [],
      body: {
        name:  {
          type: 'string',
          minLength: 2
        },
        description:  {
          type: 'string',
        },
      },
    },
    handler: async (req, reply) => {
      return handler.updateWorkspace(req, reply);
    }
  });

  app.route({
    url: base_url+ "/:workspace_id",
    method: 'DELETE',
    name: "DeleteWorkspace",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      tags: ['Workspace'],
      summary: 'Delete Workspace',
      description: 'API to delete a Workspace.',
      required: [],
      body: {
      },
    },
    handler: async (req, reply) => {
      return handler.deleteWorkspace(req, reply);
    }
  });

}

module.exports = {
  activate
};