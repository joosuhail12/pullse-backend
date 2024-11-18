const Handler = require('../../handlers/WorkspacePermissionHandler');

const authMiddlewares = require('../../middlewares/auth');
const AuthType = require('../../constants/AuthType');
const authorize = require('../../ability/authorize');

async function activate(app) {

  let handler = new Handler();

  let base_url = '/api/workspace/permission'
  app.route({
    url: base_url,
    method: 'POST',
    name: "CreateWorkspacePermission",
    preHandler: authorize('create','WorkspacePermission'),
    schema: {
      tags: ['WorkspacePermission'],
      summary: 'Create Workspace Permissions',
      description: 'API to create workspace. Permissions',
      required: ['role','userId','workspaceId'],
      body: {
        additionalProperties: false,
        type: 'object',
        properties: {
          role:  {
            type: 'string',
            minLength: 2
          },
          userId:{
            type: 'string',
            minLength: 2
          },
          workspaceId:{
            type: 'string',
            minLength: 2
          }
        }
      },
    },
    handler: async (req, reply) => {
      return handler.createWorkspacePermission(req, reply);
    }
  });

  app.route({
    url: base_url,
    method: 'GET',
    name: "ListWorkspaces",
    preHandler: authorize('read','WorkspacePermission'),
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
      return handler.listWorkspacePermission(req, reply);
    }
  });

  app.route({
    url: base_url + "/:workspace_id",
    method: 'GET',
    name: "ShowWorkspaceDetail",
    preHandler: authorize('read','WorkspacePermission'),
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
    preHandler: authorize('update','Workspace'),
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
    url: base_url+ "/:id",
    method: 'DELETE',
    name: "DeleteWorkspace",
    preHandler: authorize('update','Workspace'),
    schema: {
      tags: ['Workspace'],
      summary: 'Delete Workspace',
      description: 'API to delete a Workspace.',
      required: [],
      body: {
      },
    },
    handler: async (req, reply) => {
      return handler.deleteWorkspacePermisison(req, reply);
    }
  });



  app.route({
    url: base_url+ "/:workspace_id",
    method: 'PATCH',
    name: "DeleteWorkspace",
    preHandler: authorize('update','Workspace'),
    schema: {
      tags: ['Workspace'],
      summary: 'Delete Workspace',
      description: 'API to delete a Workspace.',
      required: ['access'],
      body: {
        access:{
            type:'boolean'
        }
      },
    },
    handler: async (req, reply) => {
      return handler.updateWorksapcePermissionAccess(req, reply);
    }
  });

}

module.exports = {
  activate
};