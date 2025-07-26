const BaseHandler = require('./BaseHandler');
const TicketStatusService = require('../services/TicketStatusService');


class TicketStatusHandler extends BaseHandler {

  constructor() {
    super();
  }

  async createTicketStatus(req, reply) {
    req.body.createdBy = req.authUser.id;
    req.body.clientId = req.authUser.clientId;
    req.body.workspaceId = req.query.workspace_id;

    let inst = new TicketStatusService();
    return this.responder(req, reply, inst.createTicketStatus(req.body));
  }

  async listTicketStatus(req, reply) {
    let workspaceId = req.query.workspace_id;
    let clientId = req.authUser.clientId;
    let inst = new TicketStatusService();
    return this.responder(req, reply, inst.listAllType(workspaceId, clientId));
  }

  async listTicketStatusSecondary(req, reply) {
    let workspaceId = req.query.workspace_id;
    let clientId = req.authUser.clientId;
    let inst = new TicketStatusService();
    return this.responder(req, reply, inst.listAllSecondary(workspaceId, clientId));
  }

  async listTicketPriority(req, reply) {
    let workspaceId = req.query.workspace_id;
    let clientId = req.authUser.clientId;
    let inst = new TicketStatusService();
    return this.responder(req, reply, inst.listAllTicketPriority(workspaceId, clientId));
  }

  async getTicketVisibilitySettings(req, reply) {
    let workspaceId = req.query.workspace_id;
    let clientId = req.authUser.clientId;
    let inst = new TicketStatusService();
    return this.responder(req, reply, inst.getTicketVisibilitySettings(workspaceId, clientId));
  }

  async showTicketStatusDetail(req, reply) {
    let workspaceId = req.query.workspace_id;
    let clientId = req.authUser.clientId;

    let inst = new TicketStatusService();
    return this.responder(req, reply, inst.getDetails(req.params.ticket_status_id, workspaceId, clientId));
  }

  async updateTicketStatus(req, reply) {
    let workspaceId = req.query.workspace_id;
    let clientId = req.authUser.clientId;

    let id = req.params.ticket_status_id;
    let toUpdate = req.body;
    let inst = new TicketStatusService();
    return this.responder(req, reply, inst.updateTicketStatus({ id, workspaceId, clientId }, toUpdate));
  }

  async deleteTicketStatus(req, reply) {
    let id = req.params.ticket_status_id;
    let workspaceId = req.query.workspace_id;
    let clientId = req.authUser.clientId;


    let inst = new TicketStatusService();
    return this.responder(req, reply, inst.deleteTicketStatus({ id, workspaceId, clientId }));
  }

}

module.exports = TicketStatusHandler;
