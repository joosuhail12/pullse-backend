const Handler = require('../../handlers/WorkflowHandler');

const authMiddlewares = require('../../middlewares/auth');
const AuthType = require('../../constants/AuthType');

async function activate(app) {

  let handler = new Handler();

  let base_url = '/api/workflow';

  app.route({
    url: base_url + '/folder',
    method: 'POST',
    name: "CreateWorkflowFolder",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      tags: ['Workflow'],
      summary: 'Create Workflow Folder',
      description: 'API to create workflow folder.',
      body: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string', minLength: 2 },
          description: { type: 'string', minLength: 2 },
        },
      },
      query: {
        type: 'object',
        required: ['workspace_id'],
        properties: {
          workspace_id: { type: 'string' },
        },
      },
    },
    handler: async (req, reply) => {
      return handler.createWorkflowFolder(req, reply);
    }
  });


  app.route({
    url: base_url + '/folder',
    method: 'GET',
    name: "GetWorkflowFolders",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      tags: ['Workflow'],
      summary: 'Get Workflow Folders',
      description: 'API to get workflow folders.',
      query: {
        type: 'object',
        required: ['workspace_id'],
        properties: {
          workspace_id: { type: 'string' },
        },
      },
    },
    handler: async (req, reply) => {
      return handler.getWorkflowFolders(req, reply);
    }
  });


  app.route({
    url: base_url + '/folder/:id',
    method: 'DELETE',
    name: "DeleteWorkflowFolder",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      tags: ['Workflow'],
      summary: 'Delete Workflow Folder',
      description: 'API to delete workflow folder.',
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
        },
      },
    },
    handler: async (req, reply) => {
      return handler.deleteWorkflowFolder(req, reply);
    }
  });

  app.route({
    url: base_url + '/folder/:id',
    method: 'PATCH',
    name: "UpdateWorkflowFolder",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      tags: ['Workflow'],
      summary: 'Update Workflow Folder',
      description: 'API to update workflow folder.',
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
        },
      },
      body: {
        type: 'object',
        minProperties: 1,
        properties: {
          name: { type: 'string', minLength: 2 },
          description: { type: 'string', minLength: 2 },
        },
      },
    },
    handler: async (req, reply) => {
      return handler.updateWorkflowFolder(req, reply);
    }
  });

  app.route({
    url: base_url,
    method: 'POST',
    name: "CreateWorkflow",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      tags: ['Workflow'],
      summary: 'Create Workflow',
      description: 'API to create workflow.',
      params: {
        type: 'object',
        required: ['workspace_id'],
        properties: {
          workspace_id: { type: 'string' },
        },
      },
    },
    handler: async (req, reply) => {
      return handler.createWorkflow(req, reply);
    }
  });
}

module.exports = { activate };