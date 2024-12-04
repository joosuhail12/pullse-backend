const BaseHandler = require('./BaseHandler');
const CustomSupportEmailService = require('../services/CustomSupportEmailService');


class CustomSupportEmailHandler extends BaseHandler {

  constructor() {
    super();
  }

  async createCustomSupportEmail(req, reply) {
    req.body.createdBy = req.authUser.id;
    req.body.clientId = req.authUser.clientId;
    req.body.workspaceId = req.query.workspace_id;

    let inst = new CustomSupportEmailService();
    return this.responder(req, reply, inst.createCustomSupportEmail(req.body));
  }

  async listCustomSupportEmail(req, reply) {
    let workspaceId = req.query.workspace_id;
    let clientId = req.authUser.clientId;

    let filters = {
      name: req.query.name,
      email: req.query.email,
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
    let inst = new CustomSupportEmailService();
    return this.responder(req, reply, inst.paginate(filters));
  }

  async showCustomSupportEmailDetail(req, reply) {
    let workspaceId = req.query.workspace_id;
    let clientId = req.authUser.clientId;

    let inst = new CustomSupportEmailService();
    return this.responder(req, reply, inst.getDetails(req.params.custom_support_email_id, workspaceId, clientId));
  }

  async updateCustomSupportEmail(req, reply) {
    let workspaceId = req.query.workspace_id;
    let clientId = req.authUser.clientId;

    let id = req.params.custom_support_email_id;
    let toUpdate = req.body;
    let inst = new CustomSupportEmailService();
    return this.responder(req, reply, inst.updateCustomSupportEmail({ id, workspaceId, clientId }, toUpdate));
  }

  async deleteCustomSupportEmail(req, reply) {
    let id = req.params.custom_support_email_id;
    let workspaceId = req.query.workspace_id;
    let clientId = req.authUser.clientId;


    let inst = new CustomSupportEmailService();
    return this.responder(req, reply, inst.deleteCustomSupportEmail({ id, workspaceId, clientId }));
  }

}

module.exports = CustomSupportEmailHandler;
