const BaseHandler = require('./BaseHandler');
const TicketTopicService = require('../services/TicketTopicService');


class TicketTopicHandler extends BaseHandler {

  constructor() {
    super();
  }

  async createTicketTopic(req, reply) {
    let inst = new TicketTopicService();
    req.body.createdBy = req.authUser.id;
    req.body.clientId = req.authUser.clientId;
    req.body.workspaceId = req.query.workspace_id;

    console.log(req.body);
    return this.responder(req, reply, inst.createTicketTopic(req.body));
  }

  async listTicketTopic(req, reply) {
    let workspaceId = req.query.workspace_id;
    let clientId = req.authUser.clientId;
    let filters = {
      name: req.query.name,
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

    let inst = new TicketTopicService();
    return this.responder(req, reply, inst.paginate(filters));
  }

  async showTicketTopicDetail(req, reply) {
    let inst = new TicketTopicService();
    return this.responder(req, reply, inst.findOrFail(req.params.ticket_topic_id));
  }

  async updateTicketTopic(req, reply) {
    let ticket_topic_id = req.params.ticket_topic_id;
    let toUpdate = req.body;
    let inst = new TicketTopicService();
    return this.responder(req, reply, inst.updateTicketTopic(ticket_topic_id, toUpdate));
  }

  async deleteTicketTopic(req, reply) {
    let ticket_topic_id = req.params.ticket_topic_id;
    let inst = new TicketTopicService();
    return this.responder(req, reply, inst.deleteTicketTopic(ticket_topic_id));
  }

}

module.exports = TicketTopicHandler;
