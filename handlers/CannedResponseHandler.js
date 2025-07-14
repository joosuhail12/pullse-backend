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
    let userId = req.authUser.id;
    // console.log('userId', userId);

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
    return this.responder(req, reply, inst.paginateWithUser(filters, userId));
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

  async updateCannedResponseTeams(req, reply) {
    const id = req.params.canned_response_id;
    const workspaceId = req.query.workspace_id;
    const clientId = req.authUser.clientId;
    const { teamIds, typeOfSharing } = req.body;
    let inst = new CannedResponseService();
    return this.responder(req, reply, inst.updateCannedResponseTeams(id, workspaceId, clientId, teamIds, typeOfSharing));
  }

  async getCannedResponseTeams(req, reply) {
    const id = req.params.canned_response_id;
    const workspaceId = req.query.workspace_id;
    const clientId = req.authUser.clientId;
    let inst = new CannedResponseService();
    return this.responder(req, reply, inst.getCannedResponseTeams(id, workspaceId, clientId));
  }

  async listTeamAccessibleCannedResponses(req, reply) {
    const userId = req.authUser.id;
    const workspaceId = req.query.workspace_id;
    const clientId = req.authUser.clientId;
    let inst = new CannedResponseService();
    return this.responder(req, reply, inst.listTeamAccessibleCannedResponses(userId, workspaceId, clientId));
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
