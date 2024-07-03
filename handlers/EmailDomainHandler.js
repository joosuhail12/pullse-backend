const BaseHandler = require('./BaseHandler');
const EmailDomainService = require('../services/EmailDomainService');

class EmailDomainHandler extends BaseHandler {

  constructor() {
    super();
  }

  async createEmailDomain(req, reply) {
    req.body.createdBy = req.authUser.id;
    req.body.clientId = req.authUser.clientId;
    req.body.workspaceId = req.query.workspace_id;

    let inst = new EmailDomainService();
    return this.responder(req, reply, inst.createEmailDomain(req.body));
  }

  async listEmailDomain(req, reply) {
    let workspaceId = req.query.workspace_id;
    let clientId = req.authUser.clientId;

    let filters = {
      EmailDomain: req.query.EmailDomain,
      senderName: req.query.senderName,
      fromEmail: req.query.fromEmail,
      checkboxDefault: req.query.checkboxDefault,
      ReplytoEmail: req.query.ReplytoEmail,
      DKIM: req.query.DKIM,
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
    let inst = new EmailDomainService();
    return this.responder(req, reply, inst.paginate(filters));
  }

  async showEmailDomainDetail(req, reply) {
    let workspaceId = req.query.workspace_id;
    let clientId = req.authUser.clientId;

    let inst = new EmailDomainService();
    return this.responder(req, reply, inst.getDetails(req.params.email_domain_id, workspaceId, clientId));
  }

  async updateEmailDomain(req, reply) {
    let workspaceId = req.query.workspace_id;
    let clientId = req.authUser.clientId;

    let id = req.params.email_domain_id;
    let toUpdate = req.body;
    let inst = new EmailDomainService();
    return this.responder(req, reply, inst.updateEmailDomain({ id, workspaceId, clientId }, toUpdate));
  }

  async deleteEmailDomain(req, reply) {
    let id = req.params.email_domain_id;
    let workspaceId = req.query.workspace_id;
    let clientId = req.authUser.clientId;

    
    let inst = new EmailDomainService();
    return this.responder(req, reply, inst.deleteEmailDomain({ id, workspaceId, clientId }));
  }

}

module.exports = EmailDomainHandler;
