const BaseHandler = require('./BaseHandler');
const CannedResponseService = require('../services/CannedResponseService');


class CannedResponseHandler extends BaseHandler {

  constructor() {
    super();
  }

  async createCannedResponse(req, reply) {
    req.body.createdBy = req.authUser.id;
    req.body.clientId = req.authUser.clientId;
    req.body.workspaceId = req.query.workspace_id;

    let inst = new CannedResponseService();
    return this.responder(req, reply, inst.createCannedResponse(req.body));
  }

  async listCannedResponse(req, reply) {
    let workspaceId = req.query.workspace_id;
    let clientId = req.authUser.clientId;

    let filters = {
      name: req.query.name,
      createdFrom: req.query.created_from,
      createdTo: req.query.created_to,
      skip: req.query.skip,
      limit: req.query.limit,
      page: req.query.page,
      sort_by: req.query.sort_by,
      sort_order: req.query.sort_order,
      workspaceId,
      clientId,
      archiveAt: null
    };
    let inst = new CannedResponseService();
    return this.responder(req, reply, inst.paginate(filters));
  }

  async showCannedResponseDetail(req, reply) {
    let workspaceId = req.query.workspace_id;
    let clientId = req.authUser.clientId;

    let inst = new CannedResponseService();
    return this.responder(req, reply, inst.getDetails(req.params.canned_response_id, workspaceId, clientId));
  }

  async updateCannedResponse(req, reply) {
    let workspaceId = req.query.workspace_id;
    let clientId = req.authUser.clientId;

    let id = req.params.canned_response_id;
    let toUpdate = req.body;
    let inst = new CannedResponseService();
    return this.responder(req, reply, inst.updateCannedResponse({ id, workspaceId, clientId }, toUpdate));
  }

  async deleteCannedResponse(req, reply) {
    let id = req.params.canned_response_id;
    let workspaceId = req.query.workspace_id;
    let clientId = req.authUser.clientId;


    let inst = new CannedResponseService();
    return this.responder(req, reply, inst.deleteCannedResponse({ id, workspaceId, clientId }));
  }

}

module.exports = CannedResponseHandler;
