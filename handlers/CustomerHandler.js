const _ = require("lodash");
const BaseHandler = require("./BaseHandler");
const CustomerService = require("../services/CustomerService");
const TagService = require("../services/TagService");
const errors = require("../errors");

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
    let fileSrc = req.raw.files["customers"].tempFilePath;
    return this.responder(req, reply, inst.importCustomerData({ createdBy, clientId, workspaceId, fileSrc }));
  }

  async createCustomer(req, reply) {
    let inst = this.customerServiceInst;
    req.body.createdBy = req.authUser.id;
    req.body.clientId = req.authUser.clientId;
    req.body.workspaceId = req.query.workspace_id;
    let customer = await inst.findOrCreateCustomer(req.body);
    if (customer.message === 'Customer already exists') {
      // dont reject the request, send message "Customer already exists"
      return this.responder(req, reply, Promise.reject(new errors.Conflict(customer.message)));
    }
    return this.responder(req, reply, Promise.resolve(customer));
  }

  async listCustomers(req, reply) {
    let clientId = req.authUser.clientId;
    let inst = this.customerServiceInst;

    let filters = {
      firstname: req.query.firstname,
      lastname: req.query.lastname,
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

    // Ensure the result of paginate() is awaited
    let customers = await inst.paginate(filters);

    // Transform data format
    let formattedCustomers = customers.map(customer => ({
      id: customer.id,
      firstname: customer.firstname,
      lastname: customer.lastname,
      email: customer.email,
      phone: customer.phone || null,
      company: customer.companies ? customer.companies.name : null, // Replace with actual company name if needed
      status: customer.status || 'active',
      type: customer.type,
      title: customer.title,
      department: customer.department,
      timezone: customer.timezone,
      linkedinUrl: customer.linkedin,
      twitterUrl: customer.twitter,
      language: customer.language || 'English',
      source: customer.source || 'website',
      assignedTo: customer.assignedTo || null,
      accountValue: customer.accountValue || 0,
      tags: customer.tagIds ? customer.tagIds : [],
      notes: customer.notes || '',
      lastContacted: customer.lastContacted ? new Date(customer.lastContacted).toISOString() : null,
      createdAt: new Date(customer.created_at).toISOString(),
      updatedAt: new Date(customer.updated_at).toISOString(),
      street: customer.street || '',
      city: customer.city || '',
      state: customer.state || '',
      postalCode: customer.postalCode || '',
      country: customer.country || ''
    }));

    // Return formatted response
    return this.responder(req, reply, Promise.resolve(formattedCustomers));
  }

  async listVisitors(req, reply) {
    let clientId = req.authUser.clientId;
    let inst = this.customerServiceInst;

    let filters = {
      firstname: req.query.firstname,
      lastname: req.query.lastname,
      email: req.query.email,
      type: 'visitor',
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

    // Ensure the result of paginate() is awaited
    let customers = await inst.paginate(filters);

    // Transform data format
    let formattedCustomers = customers.map(customer => ({
      id: customer.id,
      firstname: customer.firstname,
      lastname: customer.lastname,
      email: customer.email,
      phone: customer.phone || null,
      company: customer.companies ? customer.companies.name : null, // Replace with actual company name if needed
      status: customer.status || 'active',
      type: customer.type,
      title: customer.title,
      department: customer.department,
      timezone: customer.timezone,
      linkedinUrl: customer.linkedin,
      twitterUrl: customer.twitter,
      language: customer.language || 'English',
      source: customer.source || 'website',
      assignedTo: customer.assignedTo || null,
      accountValue: customer.accountValue || 0,
      tags: customer.tagIds ? customer.tagIds : [],
      notes: customer.notes || '',
      lastContacted: customer.lastContacted ? new Date(customer.lastContacted).toISOString() : null,
      createdAt: new Date(customer.created_at).toISOString(),
      updatedAt: new Date(customer.updated_at).toISOString(),
      street: customer.street || '',
      city: customer.city || '',
      state: customer.state || '',
      postalCode: customer.postalCode || '',
      country: customer.country || ''
    }));

    // Return formatted response
    return this.responder(req, reply, Promise.resolve(formattedCustomers));
  }

  async updateCustomer(req, reply) {
    let workspaceId = req.query.workspace_id;
    let clientId = req.authUser.clientId;
    let id = req.params.customer_id;
    let toUpdate = req.body;
    let inst = this.customerServiceInst;

    return this.responder(req, reply, inst.updateCustomer({ id, workspaceId, clientId }, toUpdate));
  }


  async showCustomerDetail(req, reply) {
    let clientId = req.authUser.clientId;
    let customer_id = req.params.customer_id;
    let workspaceId = req.query.workspace_id;
    let inst = this.customerServiceInst;
    return this.responder(req, reply, this.customerServiceInst.getCustomerDetails(customer_id, workspaceId, clientId));
  }

  async getCustomerProfile(req, reply) {
    if (!req.headers["session-id"] || !req.authUser?.email) {
      return this.responder(req, reply, Promise.reject(new errors.Unauthorized()));
    }
    let profile = _.pick(req.authUser, ["id", "firstname", "lastname", "email", "type"]);
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
