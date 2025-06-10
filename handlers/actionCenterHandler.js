// handlers/ActionCenterHandler.js
const BaseHandler          = require('./BaseHandler');
const ActionCenterService  = require('../services/actionCenterServices');

class ActionCenterHandler extends BaseHandler {
  constructor() {
    super();
  }

  /* ──────────────────────────────────────────
     POST /api/action-center
     ────────────────────────────────────────── */
  async createAction(req, reply) {
    const inst        = new ActionCenterService();

    const createdBy   = req.authUser.id;
    const clientId    = req.authUser.clientId;
    const workspaceId = req.query.workspace_id;

    const payload = {
      name:               req.body.name,
      toolName:           req.body.toolName,
      endpoint:           req.body.endpoint,
      method:             req.body.method?.toUpperCase() || 'GET',
      description:        req.body.description,
      headers:            req.body.headers,          // raw string or JSON
      parameters:         req.body.parameters || [],
      connectedChatbots:  req.body.connectedChatbots || [],
      category:           req.body.category ?? 'Custom',
      folderId:           req.body.folderId ?? null,
      workspaceId,
      clientId,
      createdBy
    };

    return this.responder(req, reply, inst.createAction(payload));
  }

  /* ──────────────────────────────────────────
     GET /api/action-center
     ────────────────────────────────────────── */
  async listActions(req, reply) {
    const inst        = new ActionCenterService();
    const workspaceId = req.query.workspace_id;
    const clientId    = req.authUser.clientId;

    return this.responder(
      req,
      reply,
      inst.fetchActionGrid({ workspaceId, clientId })
    );
  }

  /* ──────────────────────────────────────────
     GET /api/action-center/:action_id
     ────────────────────────────────────────── */
  async showActionDetail(req, reply) {
    const inst      = new ActionCenterService();
    const actionId  = req.params.action_id;

    return this.responder(req, reply, inst.fetchActionById(actionId));
  }

  /* ──────────────────────────────────────────
     PATCH /api/action-center/:action_id
     ────────────────────────────────────────── */
  async updateAction(req, reply) {
    const inst        = new ActionCenterService();
    const id          = req.params.action_id;
    const workspaceId = req.query.workspace_id;
    const clientId    = req.authUser.clientId;
    const toUpdate    = req.body;

    return this.responder(
      req,
      reply,
      inst.updateAction({ id, workspaceId, clientId }, toUpdate)
    );
  }

  /* ──────────────────────────────────────────
     DELETE /api/action-center/:action_id
     ────────────────────────────────────────── */
  async deleteAction(req, reply) {
    const inst        = new ActionCenterService();
    const id          = req.params.action_id;
    const workspaceId = req.query.workspace_id;
    const clientId    = req.authUser.clientId;

    return this.responder(
      req,
      reply,
      inst.deleteAction({ id, workspaceId, clientId })
    );
  }
}

module.exports = ActionCenterHandler;
