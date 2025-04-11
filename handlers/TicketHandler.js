const BaseHandler = require('./BaseHandler');
const TicketService = require('../services/TicketService');
const ConversationService = require('../services/ConversationService');


class TicketHandler extends BaseHandler {

  constructor() {
    super();
    this.ticketServiceInst = new TicketService(null, { ConversationService });
  }

  async createTicket(req, reply) {
    let inst = this.ticketServiceInst;
    req.body.createdBy = req.authUser.id;
    req.body.clientId = req.authUser.clientId;
    req.body.workspaceId = req.query.workspace_id;
    req.body.createdBy = req.authUser.id;
    return this.responder(req, reply, inst.createTicket(req.body));
  }


  async listCustomerTickets(req, reply) {
    if (!req.authUser?.email || !req.authUser?.sessionId || !req.authUser?.id) {
      return this.responder(req, reply, Promise.resolve([]));
    }
    req.query.workspace_id = req.authUser.workspaceId;
    req.query.customer_id = req.authUser.id;
    req.query.session_id = req.authUser.sessionId;
    return this.listTickets(req, reply);
  }

  async listTickets(req, reply) {
    let inst = this.ticketServiceInst;
    let filters = {
      status: req.query.status,
      teamId: req.query.team_id,
      typeId: req.query.type_id,
      companyId: req.query.company_id,
      customerId: req.query.customer_id,
      assigneeId: req.query.assignee_id,
      createdFrom: req.query.created_from,
      createdTo: req.query.created_to,
      priority: req.query.priority,
      workspaceId: req.query.workspace_id,
      externalId: req.query.external_id,
      tagId: req.query.tag_id,
      mentionId: req.query.mention_id,
      sessionId: req.query.session_id,
      topicId: req.query.topic_id,
      language: req.query.language,
      skip: req.query.skip,
      limit: req.query.limit,
      page: req.query.page,
      sort_by: req.query.sort_by,
      sort_order: req.query.sort_order,
      clientId: req.authUser.clientId
    };
    return this.responder(req, reply, inst.listTickets(filters));
  }

  async showTicketDetail(req, reply) {
    let workspaceId = req.query.workspace_id;
    let clientId = req.authUser.clientId;
    let sno = req.params.ticket_sno;

    let inst = this.ticketServiceInst;
    return this.responder(req, reply, inst.getDetails(sno, workspaceId, clientId, true));
  }

  async updateTicket(req, reply) {
    let workspaceId = req.query.workspace_id;
    let clientId = req.authUser.clientId;
    let sno = req.params.ticket_sno;

    let toUpdate = req.body;
    let inst = this.ticketServiceInst;
    return this.responder(req, reply, inst.updateTicket({ sno, workspaceId, clientId }, toUpdate));
  }

  async updateTag(req, reply) {
    let workspaceId = req.query.workspace_id;
    let clientId = req.authUser.clientId;
    let sno = req.params.ticket_sno;
    let entityType = req.params.entity_type;


    let entityId = req.body.entity_id;
    let action = req.body.action;

    let inst = this.ticketServiceInst;
    return this.responder(req, reply, inst.attachTagOrTopic({ sno, workspaceId, clientId }, entityType, entityId, action));
  }

  async deleteTicket(req, reply) {
    let workspaceId = req.query.workspace_id;
    let clientId = req.authUser.clientId;
    let sno = req.params.ticket_sno;

    let inst = this.ticketServiceInst;
    return this.responder(req, reply, inst.deleteTicket({ sno, workspaceId, clientId }));
  }

  async assignTicket(req, reply) {
    const workspaceId = req.query.workspace_id;
    const clientId = req.authUser.clientId;
    const sno = req.params.ticket_sno;
    const userId = req.body.userId;

    let inst = this.ticketServiceInst;
    return this.responder(req, reply, inst.assignTicketToUser(sno, userId, workspaceId, clientId));
  }

}

module.exports = TicketHandler;
