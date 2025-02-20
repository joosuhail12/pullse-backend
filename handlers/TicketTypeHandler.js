const BaseHandler = require('./BaseHandler');
const TicketTypeService = require('../services/TicketTypeService');


class TicketTypeHandler extends BaseHandler {

  constructor() {
    super();
  }

  async createTicketType(req, reply) {
    let inst = new TicketTypeService();
    req.body.createdBy = req.authUser.id;
    req.body.clientId = req.authUser.clientId;
    req.body.workspaceId = req.query.workspace_id;

    return this.responder(req, reply, inst.createTicketType(req.body));
  }

  async listTicketType(req, reply) {
    let inst = new TicketTypeService();
    let workspaceId = req.query.workspace_id;
    let clientId = req.authUser.clientId;
    let filters = {
      name: req.query.name,
      createdFrom: req.query.createdFrom,
      createdTo: req.query.createdTo,
      skip: req.query.skip,
      limit: req.query.limit,
      page: req.query.page,
      sort_by: req.query.sort_by,
      sort_order: req.query.sort_order,
      workspaceId,
      clientId
    };
    return this.responder(req, reply, inst.paginate(filters));
  }

  async showTicketTypeDetail(req, reply) {
    let id = req.params.ticket_type_id;
    let workspaceId = req.query.workspace_id;
    let clientId = req.authUser.clientId;

    let inst = new TicketTypeService();
    return this.responder(req, reply, inst.getDetails({ id, workspaceId, clientId }));
  }

  async updateTicketType(req, reply) {
    let id = req.params.ticket_type_id;
    let workspaceId = req.query.workspace_id;
    let clientId = req.authUser.clientId;

    let toUpdate = req.body;
    let inst = new TicketTypeService();
    return this.responder(req, reply, inst.updateTicketType({ id, workspaceId, clientId }, toUpdate));
  }

  async deleteTicketType(req, reply) {
    let ticket_type_id = req.params.ticket_type_id;
    let workspaceId = req.query.workspace_id;
    let clientId = req.authUser.clientId;

    let inst = new TicketTypeService();
    return this.responder(req, reply, inst.deleteTicketType(ticket_type_id, workspaceId, clientId));
  }

}

module.exports = TicketTypeHandler;
