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

    let filters = {
      name: req.query.name,
      type: req.query.type,
      archived: req.query.archived,
      createdFrom: req.query.created_from,
      createdTo: req.query.created_to,
      skip: req.query.skip,
      limit: req.query.limit,
      page: req.query.page,
      sort_by: req.query.sort_by,
      sort_order: req.query.sort_order,
      workspaceId,
      clientId
    };
    let inst = new TicketStatusService();
    return this.responder(req, reply, inst.paginate(filters));
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
