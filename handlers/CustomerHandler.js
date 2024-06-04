const _ = require("lodash");
const BaseHandler = require('./BaseHandler');
const CustomerService = require('../services/CustomerService');
const TagService = require('../services/TagService');
const errors = require('../errors');
class CustomerHandler extends BaseHandler {

  constructor() {
    super();
    this.customerServiceInst = new CustomerService(null, { TagService });
  }

  async importCustomer(req, reply) {
    let inst = this.customerServiceInst;
    let createdBy = req.authUser.id;
    let clientId = req.authUser.clientId;
    let workspaceId = req.query.workspace_id;
    let fileSrc = req.raw.files['customers'].tempFilePath
    return this.responder(req, reply, inst.importCustomerData({ createdBy, clientId, workspaceId, fileSrc }));
  }

  async createCustomer(req, reply) {
    let inst = this.customerServiceInst;
    req.body.createdBy = req.authUser.id;
    req.body.clientId = req.authUser.clientId;
    req.body.workspaceId = req.query.workspace_id;
    return this.responder(req, reply, inst.findOrCreateCustomer(req.body));
  }

  async listCustomers(req, reply) {
    let clientId = req.authUser.clientId;
    let inst = this.customerServiceInst;
    let filters = {
      name: req.query.name,
      email: req.query.email,
      type: req.query.customer_type,
      companyId: req.query.company_id,
      lastActiveFrom: req.query.last_active_from,
      lastActiveTo: req.query.last_active_to,
      workspaceId: req.query.workspace_id,
      archived: req.query.archived,
      skip: req.query.skip,
      limit: req.query.limit,
      page: req.query.page,
      sort_by: req.query.sort_by,
      sort_order: req.query.sort_order,
      clientId: clientId,
    };
    return this.responder(req, reply, inst.paginate(filters));
  }

  async showCustomerDetail(req, reply) {
    let clientId = req.authUser.clientId;
    let customer_id = req.params.customer_id;
    let workspaceId = req.query.workspace_id;

    let inst = this.customerServiceInst;
    return this.responder(req, reply, inst.getDetails(customer_id, workspaceId, clientId));
  }

  async getCustomerProfile(req, reply) {
    if (!req.headers['session-id'] || !req.authUser?.email) {
      return this.responder(req, reply, Promise.reject(new errors.Unauthorized()));
    }

    let profile = _.pick(req.authUser, [ "id","name", "email", "type",]);
    return this.responder(req, reply, Promise.resolve(profile));
  }

  async updateCustomer(req, reply) {
    let workspaceId = req.query.workspace_id;
    let clientId = req.authUser.clientId;
    let id = req.params.customer_id;

    let toUpdate = req.body;
    let inst = this.customerServiceInst;
    return this.responder(req, reply, inst.updateCustomer({ id, workspaceId, clientId }, toUpdate));
  }

  async bulkAction(req, reply) {
    let action = req.body.action;
    let ids = req.body.ids;
    let tagIds = req.body.tag_ids;
    let workspaceId = req.query.workspace_id;
    let clientId = req.authUser.clientId;
    let inst = this.customerServiceInst;
    return this.responder(req, reply, inst.bulkAction({ action, tagIds, ids, workspaceId, clientId }));
  }

  async deleteCustomer(req, reply) {
    let workspaceId = req.query.workspace_id;
    let clientId = req.authUser.clientId;
    let id = req.params.customer_id;

    let inst = this.customerServiceInst;
    return this.responder(req, reply, inst.deleteCustomer({ id, workspaceId, clientId }));
  }

}

module.exports = CustomerHandler;
