const Promise = require("bluebird");
const errors = require("../errors");
const CustomFieldUtility = require("../db/utilities/CustomFieldUtility");
const BaseService = require("./BaseService");
const TicketService = require("./TicketService");
const CustomerService = require("./CustomerService");
const TagService = require("./TagService");
const CompanyService = require("./CompanyService");
const TicketTypeService = require("./TicketTypeService");
const _ = require("lodash");

class CustomFieldService extends BaseService {
  constructor() {
    super();
    this.utilityInst = new CustomFieldUtility();
    this.EntityInstances = {
      ticket: new TicketService(),
      customer: new CustomerService(null, { TagService }),
      company: new CompanyService(),
      ticketType: new TicketTypeService(),
    };
    this.entityName = "Custom Field";
    this.listingFields = [
      "id",
      "name",
      "fieldType",
      "placeholder",
      "defaultValue",
      "options",
      "isRequired",
      "-_id",
    ];
    this.updatableFields = [
      "name",
      "description",
      "fieldType",
      "placeholder",
      "defaultValue",
      "options",
      "isRequired",
      "visibleTo",
      "entityType",
      "entityId",
    ];
  }

  async createCustomField(customFieldData) {
    try {
      let { name, entityType, clientId, workspaceId } = customFieldData;
      let filters = {
        name: name,
        entityType,
        clientId,
        workspaceId,
      };
      if (customFieldData.entityId) {
        filters.entityId = customFieldData.entityId;
      }
      let customField = await this.findOne(filters);
      if (!_.isEmpty(customField)) {
        return Promise.reject(new errors.AlreadyExist(this.entityName + " already exists."));
      }
      return this.create(customFieldData);
    } catch (err) {
      return this.handleError(err);
    }
  }

  async getDetails(id, workspaceId, clientId) {
    try {
      let customField = await this.findOne({ id, workspaceId, clientId });
      if (_.isEmpty(customField)) {
        return Promise.reject(new errors.NotFound(this.entityName + " not found."));
      }
      return customField;
    } catch (err) {
      return this.handleError(err);
    }
  }

  async updateCustomField({ id, workspaceId, clientId }, updateValues) {
    try {
      let customField = await this.getDetails(id, workspaceId, clientId);
      await this.update({ id: customField.id }, updateValues);
      return Promise.resolve();
    } catch (e) {
      return Promise.reject(e);
    }
  }

  async deleteCustomField({ id, workspaceId, clientId }) {
    try {
      let customField = await this.getDetails(id, workspaceId, clientId);
      let res = await this.softDelete(customField.id);
      return res;
    } catch (err) {
      return this.handleError(err);
    }
  }

  parseFilters({ name, entityType, entityId, fieldType, createdFrom, createdTo, workspaceId, clientId }) {
    let filters = {};
    filters.workspaceId = workspaceId;
    filters.clientId = clientId;

    if (name) {
      filters.name = name;
    }
    if (fieldType) {
      filters.fieldType = fieldType;
    }
    if (entityType) {
      filters.entityType = entityType;
    }
    if (entityId) {
      filters.entityId = entityId;
    }
    if (createdFrom) {
      if (!filters.createdAt) {
        filters.createdAt = {};
      }
      filters.createdAt["gte"] = createdFrom;
    }
    if (createdTo) {
      if (!filters.createdAt) {
        filters.createdAt = {};
      }
      filters.createdAt["lt"] = createdTo;
    }
    return filters;
  }
}

module.exports = CustomFieldService;
