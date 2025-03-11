const errors = require("../errors");
const BaseService = require("./BaseService");
const TicketService = require("./TicketService");
const CustomerService = require("./CustomerService");
const CompanyService = require("./CompanyService");
const TicketTypeService = require("./TicketTypeService");
const _ = require("lodash");

class CustomFieldService extends BaseService {
    constructor() {
        super();
        this.entityName = "customfields";
        this.listingFields = ["id", "name", "fieldType", "placeholder", "defaultValue", "options", "isRequired", "description", "entityType"];
        this.updatableFields = ["name", "description", "fieldType", "placeholder", "defaultValue", "options", "isRequired", "visibleTo", "entityType", "entityId"];

        this.EntityInstances = {
            ticket: new TicketService(),
            customer: new CustomerService(),
            company: new CompanyService(),
            ticketType: new TicketTypeService(),
        };
    }

    async createCustomField(customFieldData) {
        try {
            let { name, entityType, clientId, workspaceId, entityId, fieldType, placeholder, description, defaultValue, options, isRequired, visibleTo } = customFieldData;

            let existingField = await this.findOne({ entityType, name, clientId, archiveAt: null });

            if (existingField) {
                return Promise.reject(new errors.Conflict(this.entityName + " already exist."));
            }

            const customField = {
                name,
                entityType,
                clientId,
                workspaceId,
                entityId,
                fieldType,
                options,
                placeholder,
                defaultValue,
                isRequired,
                description,
                visibleTo: visibleTo ? visibleTo : ["customer", "agent", "admin"],
            };

            // 🔹 Insert new custom field
            let { data: newField, error: insertError } = await this.supabase
                .from("customfields")
                .insert(customField)
                .select()
                .single()

            if (insertError) throw insertError;
            return newField;
        } catch (err) {
            return this.handleError(err);
        }
    }

    async getDetails(id, workspaceId, clientId) {
        try {
            let { data: customField, error } = await this.supabase
                .from("customfields")
                .select("*")
                .eq("id", id)
                .eq("workspaceId", workspaceId)
                .eq("clientId", clientId)
                .single();

            if (error || !customField) {
                return Promise.reject(new errors.NotFound(`${this.entityName} not found.`));
            }

            return customField;
        } catch (err) {
            return this.handleError(err);
        }
    }

    async updateCustomField({ id, workspaceId, clientId }, updateValues) {
        try {
            let customField = await this.getDetails(id, workspaceId, clientId);

            let { error } = await this.supabase
                .from("customfields")
                .update(updateValues)
                .eq("id", customField.id);

            if (error) throw error;

            return { success: true };
        } catch (err) {
            return this.handleError(err);
        }
    }

    async deleteCustomField({ id, workspaceId, clientId }) {
        try {
            let customField = await this.getDetails(id, workspaceId, clientId);

            let { error } = await this.supabase
                .from("customfields")
                .delete()
                .eq("id", customField.id);

            if (error) throw error;

            return { success: true };
        } catch (err) {
            return this.handleError(err);
        }
    }

    async validateCustomFieldValue(field, fieldValue) {
        if (field.fieldType === "number") {
            if (isNaN(parseInt(fieldValue))) {
                return Promise.reject(new errors.BadRequest("Invalid field value."));
            }
        }
        if (field.fieldType === "boolean") {
            if (fieldValue !== true && fieldValue !== false) {
                return Promise.reject(new errors.BadRequest("Invalid field value."));
            }
        }
        if (field.fieldType === "date") {
            if (isNaN(new Date(fieldValue).getTime())) {
                return Promise.reject(new errors.BadRequest("Invalid field value."));
            }
        }
        if (field.fieldType === "select" || field.fieldType === "multiselect" || field.fieldType === "checkbox") {
            if (!field.options.includes(fieldValue)) {
                return Promise.reject(new errors.BadRequest("Invalid field value."));
            }
        }
        if (field.fieldType === "text" || field.fieldType === "textarea") {
            if (!_.isString(fieldValue)) {
                return Promise.reject(new errors.BadRequest("Invalid field value."));
            }
        }
        return Promise.resolve();
    }

    async setCustomFieldValue({ id, workspaceId, clientId }, entityId, fieldValue) {
        try {
            let customField = await this.getDetails(id, workspaceId, clientId);

            await this.validateCustomFieldValue(customField, fieldValue);

            let entityType = customField.entityType;
            let inst = this.EntityInstances[entityType];

            if (!inst) {
                return Promise.reject(new errors.BadRequest("Invalid field type."));
            }

            let entity = await inst.getDetails(entityId, workspaceId, clientId);

            if (_.isEmpty(entity)) {
                return Promise.reject(new errors.NotFound(`${entityType} not found.`));
            }

            let { error } = await this.supabase
                .from(entityType)
                .update({ [`customfields.${customField.id}`]: fieldValue })
                .eq("id", entity.id);

            if (error) throw error;

            return { success: true };
        } catch (err) {
            return this.handleError(err);
        }
    }

    parseFilters({ name, entityType, entityId, fieldType, createdFrom, createdTo, workspaceId, clientId }) {
        let filters = { workspaceId, clientId };

        if (name) filters.name = name;
        if (entityType) filters.entityType = entityType;
        if (entityId) filters.entityId = entityId;
        if (fieldType) filters.fieldType = fieldType;
        if (createdFrom) filters.createdAt = { gte: createdFrom };
        if (createdTo) filters.createdAt = { lte: createdTo };

        return filters;
    }
}

module.exports = CustomFieldService;
