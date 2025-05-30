// routes/actionCenter.js
const ActionCenterHandler  = require('../../handlers/actionCenterHandler');
const authMiddlewares      = require('../../middlewares/auth');
const AuthType             = require('../../constants/AuthType');

async function activate(app) {
  const handler  = new ActionCenterHandler();
  const base_url = '/api/action-center';

  /* ─────────────────────────────────────────────
     POST  /api/action-center     (create)
     ──────────────────────────────────────────── */
  app.route({
    url: base_url,
    method: 'POST',
    name: 'CreateAction',
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      operationId: 'CreateAction',
      tags: ['ActionCenter'],
      summary: 'Create a new API-Action',
      body: {
        required: ['name', 'endpoint', 'method'],
        additionalProperties: false,
        type: 'object',
        properties: {
          name:   { type: 'string', minLength: 2 },
          toolName:        { type: 'string' },
          endpoint:        { type: 'string', format: 'uri' },
          method:          { type: 'string', enum: ['GET','POST','PUT','PATCH','DELETE','HEAD','OPTIONS'] },
          description:     { type: 'string' },
          headers:         { type: 'string' },         // raw JSON/string from UI
          parameters: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                name:        { type: 'string' },
                description: { type: 'string' },
                type:        { type: 'string' },
                required:    { type: 'boolean' },
                default:     { type: ['string','number','boolean','null'] },
                options:     { type: 'array', items: { type: 'string' } }
              }
            }
          },
          connectedChatbots: {
            type: 'array',
            items: { 
              type: 'object',
              required: ['id'],
              additionalProperties: false,
              properties: {
                id:   { type: 'string' },
                name: { type: 'string' }
              }
            }
          },
          category:  { type: 'string' },
          folderId:  { type: ['string','null'] }
        }
      },
      query: {
        workspace_id: { type: 'string' }
      }
    },
    handler: (req, reply) => handler.createAction(req, reply)
  });

  /* ─────────────────────────────────────────────
     GET /api/action-center        (grid/list)
     ──────────────────────────────────────────── */
  app.route({
    url: base_url,
    method: 'GET',
    name: 'ListActions',
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      operationId: 'ListActions',
      tags: ['ActionCenter'],
      summary: 'List all API-Actions',
      query: {
        required: ['workspace_id'],
        type: 'object',
        properties: {
          workspace_id: { type: 'string' }
        }
      }
    },
    handler: (req, reply) => handler.listActions(req, reply)
  });

  /* ─────────────────────────────────────────────
     GET /api/action-center/:action_id  (detail)
     ──────────────────────────────────────────── */
  app.route({
    url: `${base_url}/:action_id`,
    method: 'GET',
    name: 'ShowActionDetail',
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      operationId: 'ShowActionDetail',
      tags: ['ActionCenter'],
      summary: 'Show API-Action detail'
    },
    handler: (req, reply) => handler.showActionDetail(req, reply)
  });

  /* ─────────────────────────────────────────────
     PATCH /api/action-center/:action_id (update)
     ──────────────────────────────────────────── */
  app.route({
    url: `${base_url}/:action_id`,
    method: 'PATCH',
    name: 'UpdateAction',
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      operationId: 'UpdateAction',
      tags: ['ActionCenter'],
      summary: 'Update an existing API-Action',
      body: { type: 'object' },   // (define exact props as needed)
      query: {
        workspace_id: { type: 'string' }
      }
    },
    handler: (req, reply) => handler.updateAction(req, reply)
  });

  /* ─────────────────────────────────────────────
     DELETE /api/action-center/:action_id
     ──────────────────────────────────────────── */
  app.route({
    url: `${base_url}/:action_id`,
    method: 'DELETE',
    name: 'DeleteAction',
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      operationId: 'DeleteAction',
      tags: ['ActionCenter'],
      summary: 'Delete an API-Action',
      query: { workspace_id: { type: 'string' } }
    },
    handler: (req, reply) => handler.deleteAction(req, reply)
  });
}

module.exports = { activate };
