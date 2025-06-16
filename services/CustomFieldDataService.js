const errors = require("../errors");
const BaseService = require("./BaseService");
const CustomFieldService = require("./CustomFieldService");
const TicketService = require("./TicketService");
const CustomerService = require("./CustomerService");
const CompanyService = require("./CompanyService");
const _ = require("lodash");

class CustomFieldDataService extends BaseService {
    constructor() {
        super();
        this.entityName = "customfielddata";
        this.listingFields = ["id", "customfieldId", "data", "entityType", "ticketId", "contactId", "companyId", "createdAt", "updatedAt"];
        this.updatableFields = ["data", "contactId", "companyId", "ticketId", "updatedAt", "deletedAt", "customfieldId", "entityType"];

        this.EntityInstances = {
            ticket: new TicketService(),
            contact: new CustomerService(),
            company: new CompanyService(),
        };

        this.customFieldService = new CustomFieldService();
    }

    async createCustomFieldData(customFieldDataObj) {
        try {
            const { customfieldId, data, entityType, entityId, createdBy } = customFieldDataObj;

            // Verify custom field exists
            let customField;
            try {
                // Directly fetch the custom field from the database instead of using the service
                this.log({ level: "info", message: "Directly fetching custom field from database", data: { customfieldId: customfieldId } });
                let { data: cfData, error } = await this.supabase
                    .from("customfields")
                    .select("*")
                    .eq("id", customfieldId)
                    .single();

                if (error) {
                    this.log({ level: "error", message: "Error fetching custom field from database", data: { error } });
                    throw error;
                }

                if (!cfData) {
                    this.log({ level: "error", message: "Custom field not found in database", data: { customfieldId: customfieldId } });
                    return Promise.reject(new errors.NotFound("Custom field not found."));
                }

                customField = cfData;
                this.log({ level: "info", message: "Found related custom field", data: { customFieldId: customField.id } });
            } catch (err) {
                this.log({ level: "error", message: "Failed to find related custom field", data: { err, customfieldId: customfieldId } });
                throw err;
            }

            // Validate data based on custom field type
            await this.customFieldService.validateCustomFieldValue(customField, data);

            // Create payload
            const customFieldData = {
                customfieldId,
                data,
                entityType,
                createdBy,
            };

            // Set the appropriate entity ID field
            if (entityType === 'ticket') {
                customFieldData.ticketId = entityId;
            } else if (entityType === 'contact' || entityType === 'customer') {
                customFieldData.contactId = entityId;
            } else if (entityType === 'company') {
                customFieldData.companyId = entityId;
            }

            // Insert custom field data
            let { data: newData, error } = await this.supabase
                .from("customfielddata")
                .insert(customFieldData)
                .select()
                .single();

            if (error) throw error;
            return newData;
        } catch (err) {
            return this.handleError(err);
        }
    }

    async getCustomFieldData(id) {
        try {
            this.log({ level: "info", message: `Fetching custom field data with id: ${id}`, data: {} });

            let { data: customFieldData, error } = await this.supabase
                .from("customfielddata")
                .select("*, customfields(*)")
                .eq("id", id)
                .is("deletedAt", null)
                .single();

            if (error) {
                this.log({ level: "error", message: "Error fetching custom field data", data: { error, id } });
                throw error;
            }

            if (!customFieldData) {
                this.log({ level: "error", message: "Custom field data not found", data: { id } });
                return Promise.reject(new errors.NotFound(`${this.entityName} not found.`));
            }

            this.log({ level: "info", message: "Successfully fetched custom field data", data: { id } });
            return customFieldData;
        } catch (err) {
            this.log({ level: "error", message: "Exception in getCustomFieldData", data: { err, id } });
            return this.handleError(err);
        }
    }

    async getCustomFieldDataByEntity(entityType, entityId) {
        try {
            const queryBuilder = this.supabase
                .from("customfielddata")
                .select("*, customfields(*)")
                .eq("entityType", entityType)
                .is("deletedAt", null);

            // Add the appropriate entity ID condition
            if (entityType === 'ticket') {
                queryBuilder.eq("ticketId", entityId);
            } else if (entityType === 'contact') {
                queryBuilder.eq("contactId", entityId);
            } else if (entityType === 'company') {
                queryBuilder.eq("companyId", entityId);
            }

            let { data: customFieldDataList, error } = await queryBuilder;

            if (error) throw error;
            return customFieldDataList || [];
        } catch (err) {
            return this.handleError(err);
        }
    }

    async updateCustomFieldData(id, updateData) {
        try {
            this.log({ level: "info", message: "Starting updateCustomFieldData", data: { id, updateData } });

            // First try to get the existing data
            let customFieldData;
            try {
                customFieldData = await this.getCustomFieldData(id);
                this.log({ level: "info", message: "Found custom field data to update", data: { customFieldDataId: customFieldData.id } });
            } catch (err) {
                this.log({ level: "error", message: "Failed to find custom field data for update", data: { err, id } });
                throw err;
            }

            // Verify custom field exists
            let customField;
            try {
                // Directly fetch the custom field from the database instead of using the service
                this.log({ level: "info", message: "Directly fetching custom field from database", data: { customfieldId: customFieldData.customfieldId } });
                let { data: cfData, error } = await this.supabase
                    .from("customfields")
                    .select("*")
                    .eq("id", customFieldData.customfieldId)
                    .single();

                if (error) {
                    this.log({ level: "error", message: "Error fetching custom field from database", data: { error } });
                    throw error;
                }

                if (!cfData) {
                    this.log({ level: "error", message: "Custom field not found in database", data: { customfieldId: customFieldData.customfieldId } });
                    return Promise.reject(new errors.NotFound("Custom field not found."));
                }

                customField = cfData;
                this.log({ level: "info", message: "Found related custom field", data: { customFieldId: customField.id } });
            } catch (err) {
                this.log({ level: "error", message: "Failed to find related custom field", data: { err, customfieldId: customFieldData.customfieldId } });
                throw err;
            }

            // Validate the new data
            if (updateData.data) {
                try {
                    await this.customFieldService.validateCustomFieldValue(customField, updateData.data);
                    this.log({ level: "info", message: "Validated custom field data", data: { validatedData: updateData.data } });
                } catch (err) {
                    this.log({ level: "error", message: "Data validation failed", data: { err, data: updateData.data } });
                    throw err;
                }
            }

            // Perform the update
            this.log({ level: "info", message: "Updating custom field data in database", data: { id, ...updateData } });
            let { data: updatedData, error } = await this.supabase
                .from("customfielddata")
                .update({
                    ...updateData,
                    updatedAt: new Date().toISOString()
                })
                .eq("id", id)
                .select()
                .single();

            if (error) {
                this.log({ level: "error", message: "Error in supabase update", data: { error } });
                throw error;
            }

            this.log({ level: "info", message: "Custom field data updated successfully", data: { id: updatedData.id } });
            return updatedData;
        } catch (err) {
            this.log({ level: "error", message: "Exception in updateCustomFieldData", data: { err, id } });
            return this.handleError(err);
        }
    }

    async deleteCustomFieldData(id) {
        try {
            const customFieldData = await this.getCustomFieldData(id);

            let { error } = await this.supabase
                .from("customfielddata")
                .update({
                    deletedAt: new Date().toISOString()
                })
                .eq("id", id);

            if (error) throw error;
            return { success: true };
        } catch (err) {
            return this.handleError(err);
        }
    }

    async deleteCustomFieldDataByEntity(entityType, entityId) {
        try {
            const queryBuilder = this.supabase
                .from("customfielddata")
                .update({
                    deletedAt: new Date().toISOString()
                })
                .eq("entityType", entityType);

            // Add the appropriate entity ID condition
            if (entityType === 'ticket') {
                queryBuilder.eq("ticketId", entityId);
            } else if (entityType === 'contact') {
                queryBuilder.eq("contactId", entityId);
            } else if (entityType === 'company') {
                queryBuilder.eq("companyId", entityId);
            }

            let { error } = await queryBuilder;

            if (error) throw error;
            return { success: true };
        } catch (err) {
            return this.handleError(err);
        }
    }

    parseFilters({ customfieldId, entityType, entityId, createdFrom, createdTo }) {
        let filters = {};

        if (customfieldId) filters.customfieldId = customfieldId;
        if (entityType) filters.entityType = entityType;

        if (entityType && entityId) {
            if (entityType === 'ticket') {
                filters.ticketId = entityId;
            } else if (entityType === 'contact') {
                filters.contactId = entityId;
            } else if (entityType === 'company') {
                filters.companyId = entityId;
            }
        }

        if (createdFrom) filters.createdAt = { gte: createdFrom };
        if (createdTo) filters.createdAt = { lte: createdTo };

        return filters;
    }

    async getCustomFieldDataByIds(customFieldIds) {
        try {
            this.log({ level: "info", message: "Fetching custom field data for multiple IDs", data: { customFieldIds } });

            if (!Array.isArray(customFieldIds) || customFieldIds.length === 0) {
                return Promise.reject(new errors.BadRequest("Valid array of custom field IDs is required"));
            }

            let { data: customFieldDataList, error } = await this.supabase
                .from("customfielddata")
                .select("*, customfields(*)")
                .in("customfieldId", customFieldIds)
                .is("deletedAt", null);

            if (error) {
                this.log({ level: "error", message: "Error fetching custom field data by IDs", data: { error, customFieldIds } });
                throw error;
            }

            // Format the results as an array of objects with custom field data and nested custom field
            const formattedResults = customFieldDataList?.map(item => {
                // Extract the custom field object
                const customField = item.customfields;
                delete item.customfields;

                // Return the structured object
                return {
                    ...item,
                    customField
                };
            }) || [];

            this.log({ level: "info", message: "Successfully fetched custom field data for multiple IDs", data: { count: formattedResults.length } });
            return formattedResults;
        } catch (err) {
            this.log({ level: "error", message: "Exception in getCustomFieldDataByIds", data: { err, customFieldIds } });
            return this.handleError(err);
        }
    }

    async getCustomFieldDataBatch(customFieldIds, entityType, entityId) {
        try {
            this.log({ level: "info", message: "Fetching batch custom field data with filters", data: { customFieldIds, entityType, entityId } });

            if (!Array.isArray(customFieldIds) || customFieldIds.length === 0) {
                return Promise.reject(new errors.BadRequest("Valid array of custom field IDs is required"));
            }

            let query = this.supabase
                .from("customfielddata")
                .select("*, customfields(*)")
                .in("customfieldId", customFieldIds)
                .is("deletedAt", null);

            // Apply entity type and ID filters if provided
            if (entityType) {
                // query = query.eq("entityType", entityType);

                if (entityId) {
                    if (entityType === 'ticket') {
                        query = query.eq("ticketId", entityId);
                    } else if (entityType === 'contact' || entityType === 'customer') {
                        query = query.eq("contactId", entityId);
                    } else if (entityType === 'company') {
                        query = query.eq("companyId", entityId);
                    }
                }
            }

            let { data: customFieldDataList, error } = await query;

            if (error) {
                this.log({ level: "error", message: "Error fetching batch custom field data", data: { error, customFieldIds, entityType, entityId } });
                throw error;
            }

            // Format the results as an array of objects with custom field data and nested custom field
            const formattedResults = customFieldDataList?.map(item => {
                // Extract the custom field object
                const customField = item.customfields;
                delete item.customfields;

                // Return the structured object
                return {
                    ...item,
                    customField
                };
            }) || [];

            this.log({ level: "info", message: "Successfully fetched batch custom field data", data: { count: formattedResults.length } });
            return formattedResults;
        } catch (err) {
            this.log({ level: "error", message: "Exception in getCustomFieldDataBatch", data: { err, customFieldIds, entityType, entityId } });
            return this.handleError(err);
        }
    }
}

module.exports = CustomFieldDataService; 