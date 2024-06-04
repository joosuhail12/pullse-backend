const Promise = require("bluebird");
const errors = require("../errors");
const CustomFieldUtility = require('../db/utilities/CustomFieldUtility');
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
        }
        this.entityName = 'Custom Field';
        this.listingFields = ["id", "name", "fieldType", "placeholder", "defaultValue", "options", "isRequired", "-_id"];
        this.updatableFields = [ "name", "description", "fieldType", "placeholder", "defaultValue", "options", "isRequired", "visibleTo", "entityType", "entityId" ];
    }

    async createCustomField(customFieldData) {
        try {
            let { name, entityType, clientId, workspaceId  } = customFieldData;
            let filters = { name: { $regex : `^${name}$`, $options: "i" }, entityType, clientId, workspaceId };
            if (customFieldData.entityId) {
                filters.entityId = customFieldData.entityId;
            }
            let customField = await this.findOne(filters);
            if (!_.isEmpty(customField)) {
                return Promise.reject(new errors.AlreadyExist(this.entityName + " already exist."));
            }
            return this.create(customFieldData);
        } catch(err) {
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
        }  catch(err) {
            return this.handleError(err);
        }
    }

    async updateCustomField({ id, workspaceId, clientId }, updateValues) {
        try {
            let customField = await this.getDetails(id, workspaceId, clientId);
            await this.update({ id: customField.id}, updateValues);
            return Promise.resolve();
        } catch(e) {
            return Promise.reject(e);
        }
    }

    async validateCustomFieldValue(field, fieldValue) {
        if (field.fieldType === "number") {
            fieldValue = parseInt(fieldValue);
            if (isNaN(fieldValue)) {
                return Promise.reject(new errors.BadRequest("Invalid field value."));
            }
        }
        if (field.fieldType === "boolean") {
            if (fieldValue !== true && fieldValue !== false) {
                return Promise.reject(new errors.BadRequest("Invalid field value."));
            }
        }
        if (field.fieldType === "date") {
            fieldValue = new Date(fieldValue);
            if (isNaN(fieldValue)) {
                return Promise.reject(new errors.BadRequest("Invalid field value."));
            }
        }
        if (field.fieldType === "select") {
            if (!_.includes(field.options, fieldValue)) {
                return Promise.reject(new errors.BadRequest("Invalid field value."));
            }
        }
        if (field.fieldType === "multiselect") {
            if (!_.isArray(fieldValue)) {
                return Promise.reject(new errors.BadRequest("Invalid field value."));
            }
            if (!_.isEmpty(_.difference(fieldValue, field.options))) {
                return Promise.reject(new errors.BadRequest("Invalid field value."));
            }
        }
        if (field.fieldType === "radio") {
            if (!_.includes([true, false], fieldValue)) {
                return Promise.reject(new errors.BadRequest("Invalid field value."));
            }
        }
        if (field.fieldType === "checkbox") {
            if (!_.isArray(fieldValue)) {
                return Promise.reject(new errors.BadRequest("Invalid field value."));
            }
            if (!_.isEmpty(_.difference(fieldValue, field.options))) {
                return Promise.reject(new errors.BadRequest("Invalid field value."));
            }
        }
        if (field.fieldType === "text") {
            if (!_.isString(fieldValue)) {
                return Promise.reject(new errors.BadRequest("Invalid field value."));
            }
        }
        if (field.fieldType === "textarea") {
            if (!_.isString(fieldValue)) {
                return Promise.reject(new errors.BadRequest("Invalid field value."));
            }
        }
        return Promise.resolve();
    }

    async setCustomFieldValue({ id, workspaceId, clientId }, entityId, fieldValue) {
        let customField = await this.getDetails(id, workspaceId, clientId);

        await this.validateCustomFieldValue(customField, fieldValue); //validate field value is as per field type

        let entityType = customField.entityType;
        let inst = this.EntityInstances[entityType];
        if (!inst) {
            return Promise.reject(new errors.BadRequest("Invalid field type."));
        }
        let entity = await inst.getDetails(entityId, workspaceId, clientId);
        if (_.isEmpty(entity)) {
            return Promise.reject(new errors.NotFound(`${entityType} not found.`));
        }
        let toUpdate = {};
        toUpdate[`customFields.${customField.id}`] = fieldValue
        await inst.updateOne({ id: entity.id }, toUpdate);
        return Promise.resolve();
    }

    async deleteCustomField({ id, workspaceId, clientId }) {
        try {
            let customField = await this.getDetails(id, workspaceId, clientId);
            let res = await this.softDelete(customField.id);
            return res;
        } catch(err) {
            return this.handleError(err);
        }
    }

    parseFilters({ name, entityType, entityId, fieldType, createdFrom, createdTo, workspaceId, clientId }) {
        let filters = {};
        filters.workspaceId = workspaceId;
        filters.clientId = clientId;

        if (name) {
            filters.name = { $regex : `^${name}`, $options: "i" };
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
                filters.createdAt = {}
            }
            filters.createdAt['$gte'] = createdFrom;
        }
        if (createdTo) {
            if (!filters.createdAt) {
                filters.createdAt = {}
            }
            filters.createdAt['$lt'] = createdTo;
        }

        return filters;
    }
}

module.exports = CustomFieldService;
