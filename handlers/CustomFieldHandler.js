const BaseHandler = require('./BaseHandler');
const CustomFieldService = require('../services/CustomFieldService');


class CustomFieldHandler extends BaseHandler {

  constructor() {
    super();
  }

  async createCustomField(req, reply) {
    req.body.createdBy = req.authUser.id;
    req.body.clientId = req.authUser.clientId;
    req.body.workspaceId = req.query.workspace_id;

    let inst = new CustomFieldService();
    return this.responder(req, reply, inst.createCustomField(req.body));
  }

  async listCustomField(req, reply) {
    let workspaceId = req.query.workspace_id;
    let clientId = req.authUser.clientId;

    let filters = {
      name: req.query.name,
      fieldType: req.query.field_type,
      entityType: req.query.entity_type,
      entityId: req.query.entity_id,
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
    let inst = new CustomFieldService();
    return this.responder(req, reply, inst.paginate(filters));
  }

  async showCustomFieldDetail(req, reply) {
    let workspaceId = req.query.workspace_id;
    let clientId = req.authUser.clientId;

    let inst = new CustomFieldService();
    return this.responder(req, reply, inst.getDetails(req.params.custom_field_id, workspaceId, clientId));
  }

  async updateCustomField(req, reply) {
    let workspaceId = req.query.workspace_id;
    let clientId = req.authUser.clientId;

    let id = req.params.custom_field_id;
    let toUpdate = req.body;
    let inst = new CustomFieldService();
    return this.responder(req, reply, inst.updateCustomField({ id, workspaceId, clientId }, toUpdate));
  }

  async setCustomFieldValue(req, reply) {
    let workspaceId = req.query.workspace_id;
    let clientId = req.authUser.clientId;

    let id = req.params.custom_field_id;
    let entityId = req.body.entityId;
    let fieldValue = req.body.fieldValue;
    let inst = new CustomFieldService();
    return this.responder(req, reply, inst.setCustomFieldValue({ id, workspaceId, clientId }, entityId, fieldValue));
  }

  async deleteCustomField(req, reply) {
    let id = req.params.custom_field_id;
    let workspaceId = req.query.workspace_id;
    let clientId = req.authUser.clientId;


    let inst = new CustomFieldService();
    return this.responder(req, reply, inst.deleteCustomField({ id, workspaceId, clientId }));
  }

}

module.exports = CustomFieldHandler;
