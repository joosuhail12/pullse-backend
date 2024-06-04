const BaseHandler = require('./BaseHandler');
const EmailTemplateService = require('../services/EmailTemplateService');


class EmailTemplateHandler extends BaseHandler {

  constructor() {
    super();
  }

  async createEmailTemplate(req, reply) {
    req.body.createdBy = req.authUser.id;
    req.body.clientId = req.authUser.clientId;
    req.body.workspaceId = req.query.workspace_id;

    let inst = new EmailTemplateService();
    return this.responder(req, reply, inst.createEmailTemplate(req.body));
  }

  async listEmailTemplate(req, reply) {
    let workspaceId = req.query.workspace_id;
    let clientId = req.authUser.clientId;

    let filters = {
      name: req.query.name,
      event: req.query.event,
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
    let inst = new EmailTemplateService();
    return this.responder(req, reply, inst.paginate(filters));
  }

  async showEmailTemplateDetail(req, reply) {
    let workspaceId = req.query.workspace_id;
    let clientId = req.authUser.clientId;

    let inst = new EmailTemplateService();
    return this.responder(req, reply, inst.getDetails(req.params.email_template_id, workspaceId, clientId));
  }

  async updateEmailTemplate(req, reply) {
    let workspaceId = req.query.workspace_id;
    let clientId = req.authUser.clientId;

    let id = req.params.email_template_id;
    let toUpdate = req.body;
    let inst = new EmailTemplateService();
    return this.responder(req, reply, inst.updateEmailTemplate({ id, workspaceId, clientId }, toUpdate));
  }

  async deleteEmailTemplate(req, reply) {
    let id = req.params.email_template_id;
    let workspaceId = req.query.workspace_id;
    let clientId = req.authUser.clientId;


    let inst = new EmailTemplateService();
    return this.responder(req, reply, inst.deleteEmailTemplate({ id, workspaceId, clientId }));
  }

}

module.exports = EmailTemplateHandler;
