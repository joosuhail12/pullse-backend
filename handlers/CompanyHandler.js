const BaseHandler = require('./BaseHandler');
const CompanyService = require('../services/CompanyService');
const errors = require('../errors');

class CompanyHandler extends BaseHandler {

  constructor() {
    super();
  }

  async createCompany(req, reply) {
    req.body.createdBy = req.authUser.id;
    req.body.clientId = req.authUser.clientId;
    req.body.workspaceId = req.query.workspace_id;

    let inst = new CompanyService();
    return this.responder(req, reply, inst.createCompany(req.body));
  }

  async listCompany(req, reply) {
    let workspaceId = req.query.workspace_id;
    let clientId = req.authUser.clientId;

    let filters = {
      name: req.query.name,
      tagId: req.query.tagId,
      industry: req.query.industry,
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
    let inst = new CompanyService();
    return this.responder(req, reply, inst.paginate(filters));
  }

  async showCompanyDetail(req, reply) {
    let workspaceId = req.query.workspace_id;
    let clientId = req.authUser.clientId;

    let inst = new CompanyService();
    return this.responder(req, reply, inst.getDetails(req.params.company_id, workspaceId, clientId));
  }

  async updateCompany(req, reply) {
    let workspaceId = req.query.workspace_id;
    let clientId = req.authUser.clientId;

    let id = req.params.company_id;
    let toUpdate = req.body;
    let inst = new CompanyService();
    return this.responder(req, reply, inst.updateCompany({ id, workspaceId, clientId }, toUpdate));
  }

  async deleteCompany(req, reply) {
    let id = req.params.company_id;
    let workspaceId = req.query.workspace_id;
    let clientId = req.authUser.clientId;

    let inst = new CompanyService();
    return this.responder(req, reply, inst.deleteCompany({ id, workspaceId, clientId }));
  }

  async getCompanyRelatedData(req, reply) {
    // Log inputs for debugging
    console.log("GetCompanyRelatedData request:", {
      company_id: req.params.company_id,
      workspace_id: req.query.workspace_id,
      clientId: req.authUser.clientId
    });

    let workspaceId = req.query.workspace_id;
    let clientId = req.authUser.clientId;
    let id = req.params.company_id;

    if (!id) {
      return this.responder(
        req,
        reply,
        Promise.reject(new errors.BadRequest("Company ID is required"))
      );
    }

    let inst = new CompanyService();
    return this.responder(req, reply, inst.getCompanyRelatedData({ id, workspaceId, clientId }));
  }

}

module.exports = CompanyHandler;
