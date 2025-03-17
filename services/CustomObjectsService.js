const errors = require("../errors");
const BaseService = require("./BaseService");
const TicketService = require("./TicketService");
const CustomerService = require("./CustomerService");
const CompanyService = require("./CompanyService");
const TicketTypeService = require("./TicketTypeService");
const _ = require("lodash");

class CustomObjectService extends BaseService {
    constructor() {
        super();
        this.entityName = "customobjects";
        this.listingFields = ["id", "name", "slug", "description", "showInCustomerContext", "showInCustomerDetail", "showInCompanyDetail", "connectiontype", "createdAt", "updatedAt"];
        this.updatableFields = ["name", "description", "showInCustomerContext", "showInCustomerDetail", "showInCompanyDetail"];

        this.EntityInstances = {
            ticket: new TicketService(),
            customer: new CustomerService(),
            company: new CompanyService(),
            ticketType: new TicketTypeService(),
        };
    }

    async getAllCustomObjects(workspaceId, clientId) {
        try {
            console.log(workspaceId, clientId);
            let { data: customFields, error } = await this.supabase
                .from("customobjects")
                .select(`
                    id,
                    name,
                    description,
                    showInCustomerContext,
                    showInCustomerDetail,
                    showInCompanyDetail,
                    fields_count:customobjectfields(count)
                `)
                .eq("workspaceId", workspaceId)
                .eq("clientId", clientId)
                .is("deletedAt", null)
                .is("customobjectfields.deletedAt", null)
                .order("createdAt", { ascending: false });

            if (error) throw error;

            return customFields;
        } catch (err) {
            console.error(err);
            return this.handleError(err);
        }
    }

    async createCustomObject(customFieldData) {
        try {
            let { name, description, slug, showInCustomerContext, showInCustomerDetail, showInCompanyDetail, clientId, workspaceId, createdBy } = customFieldData;

            // 🔹 Check if a similar custom field already exists
            let { data: existingField, error: findError } = await this.supabase
                .from("customobjects")
                .select("*")
                .eq("clientId", clientId)
                .eq("workspaceId", workspaceId)
                .ilike("name", name)
                .maybeSingle();

            if (findError) throw findError;

            if (existingField) {
                return Promise.reject(new errors.AlreadyExist(`${this.entityName} already exists.`));
            }

            const customObject = {
                name,
                description,
                slug,
                showInCustomerContext,
                showInCustomerDetail,
                showInCompanyDetail,
                clientId,
                workspaceId,
                createdBy
            }

            // 🔹 Insert new custom field
            let { data: newField, error: insertError } = await this.supabase
                .from("customobjects")
                .insert(customObject)
                .select()

            if (insertError) throw insertError;
            return newField;
        } catch (err) {
            console.error(err);
            return this.handleError(err);
        }
    }

    async getDetails(id, workspaceId, clientId) {
        try {
            let { data: customField, error } = await this.supabase
                .from("customobjects")
                .select("*, customobjectfields(*)")
                .eq("id", id)
                .eq("workspaceId", workspaceId)
                .eq("clientId", clientId)
                .is("deletedAt", null)
                .is("customobjectfields.deletedAt", null)
                .single();

            if (error || !customField) {
                return Promise.reject(new errors.NotFound(`${this.entityName} not found.`));
            }

            return customField;
        } catch (err) {
            return this.handleError(err);
        }
    }

    async updateCustomObject({ id, workspaceId, clientId }, updateValues) {
        try {
            let customField = await this.getDetails(id, workspaceId, clientId);

            let { error } = await this.supabase
                .from("customobjects")
                .update({ ...updateValues, updatedAt: `now()` })
                .eq("id", customField.id);

            if (error) throw error;

            return { success: true };
        } catch (err) {
            return this.handleError(err);
        }
    }

    async deleteCustomObject({ id, workspaceId, clientId }) {
        try {
            let customField = await this.getDetails(id, workspaceId, clientId);

            let { error } = await this.supabase
                .from("customobjects")
                .update({ deletedAt: `now()` })
                .eq("id", customField.id)
                .eq("workspaceId", workspaceId)
                .eq("clientId", clientId);

            if (error) throw error;

            return { success: true };
        } catch (err) {
            return this.handleError(err);
        }
    }

    async deleteCustomObjectField({ id, workspaceId, clientId }) {
        try {
            let customField = await this.getDetails(id, workspaceId, clientId);

            let { error } = await this.supabase
                .from("customobjectfields")
                .update({ deletedAt: `now()` })
                .eq("id", customField.id)
                .eq("customObjectId", id)
                .eq("workspaceId", workspaceId)
                .eq("clientId", clientId);

            if (error) throw error;

            return { success: true };
        } catch (err) {
            return this.handleError(err);
        }
    }

    async validateCustomObjectValue(field, fieldValue) {
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

    async setCustomObjectValue({ id, workspaceId, clientId }, entityId, fieldValue) {
        try {
            let customField = await this.getDetails(id, workspaceId, clientId);

            await this.validateCustomObjectValue(customField, fieldValue);

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
                .update({ [`customobjects.${customField.id}`]: fieldValue })
                .eq("id", entity.id);

            if (error) throw error;

            return { success: true };
        } catch (err) {
            return this.handleError(err);
        }
    }

    async createCustomObjectField({ id, workspaceId, clientId, createdBy }, toCreate) {
        try {
            const customObject = await this.getDetails(id, workspaceId, clientId);

            if (_.isEmpty(customObject)) {
                return Promise.reject(new errors.NotFound(`${this.entityName} not found.`));
            }

            let { name, description, fieldType, placeholder, defaultValue, options, isRequired } = toCreate;

            let { data: newField, error } = await this.supabase
                .from("customobjectfields")
                .insert({
                    name,
                    description,
                    fieldType,
                    placeholder,
                    defaultValue,
                    options,
                    isRequired,
                    clientId,
                    workspaceId,
                    createdBy,
                    customObjectId: id,
                })
                .select();

            if (error) throw error;

            return { success: true, data: newField };
        } catch (err) {
            return this.handleError(err);
        }
    }

    async updateCustomObjectField({ id, workspaceId, clientId }, toUpdate) {
        try {
            const customObject = await this.getDetails(id, workspaceId, clientId);

            if (_.isEmpty(customObject)) {
                return Promise.reject(new errors.NotFound(`${this.entityName} not found.`));
            }

            const field = customObject.customobjectfields.find(field => field.id === toUpdate.fieldId);

            if (_.isEmpty(field)) {
                return Promise.reject(new errors.NotFound(`Custom Object Field not found.`));
            }

            let { name, description, fieldType, placeholder, defaultValue, options, isRequired } = toUpdate;

            let { error } = await this.supabase
                .from("customobjectfields")
                .update({
                    name,
                    description,
                    isRequired,
                    updatedAt: `now()`
                })
                .eq("id", toUpdate.fieldId);

            if (error) throw error;

            return { success: true };
        } catch (err) {
            console.error(err);
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

module.exports = CustomObjectService;
