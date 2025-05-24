const errors = require("../errors");
const BaseService = require("./BaseService");
const CustomObjectFieldService = require("./CustomObjectFieldService");
const TicketService = require("./TicketService");
const CustomerService = require("./CustomerService");
const CompanyService = require("./CompanyService");
const _ = require("lodash");

class CustomObjectFieldDataService extends BaseService {
    constructor() {
        super();
        this.entityName = "customobjectfielddata";
        this.listingFields = ["id", "customObjectFieldId", "data", "entityType", "ticketId", "contactId", "companyId", "createdAt", "updatedAt"];
        this.updatableFields = ["data", "contactId", "companyId", "ticketId", "updatedAt", "deletedAt", "customObjectFieldId", "entityType"];

        this.EntityInstances = {
            ticket: new TicketService(),
            contact: new CustomerService(),
            company: new CompanyService(),
        };

        this.customObjectFieldService = new CustomObjectFieldService();
    }

    async createCustomObjectFieldData(customObjectFieldDataObj) {
        try {
            const { customObjectFieldId, data, entityType, entityId, createdBy } = customObjectFieldDataObj;

            // Verify custom object field exists
            let customObjectField;
            try {
                // Directly fetch the custom object field from the database
                this.log({ level: "info", message: "Directly fetching custom object field from database", data: { customObjectFieldId } });
                let { data: cofData, error } = await this.supabase
                    .from("customobjectfields")
                    .select("*")
                    .eq("id", customObjectFieldId)
                    .single();

                if (error) {
                    this.log({ level: "error", message: "Error fetching custom object field from database", data: { error } });
                    throw error;
                }

                if (!cofData) {
                    this.log({ level: "error", message: "Custom object field not found in database", data: { customObjectFieldId } });
                    return Promise.reject(new errors.NotFound("Custom object field not found."));
                }

                customObjectField = cofData;
                this.log({ level: "info", message: "Found related custom object field", data: { customObjectFieldId: customObjectField.id } });
            } catch (err) {
                this.log({ level: "error", message: "Failed to find related custom object field", data: { err, customObjectFieldId } });
                throw err;
            }

            // Validate data based on custom object field type
            await this.customObjectFieldService.validateCustomObjectFieldValue(customObjectField, data);

            // Create payload
            const customObjectFieldData = {
                customObjectFieldId,
                data,
                entityType,
            };

            // Set the appropriate entity ID field
            if (entityType === 'ticket') {
                customObjectFieldData.ticketId = entityId;
            } else if (entityType === 'contact' || entityType === 'customer') {
                customObjectFieldData.contactId = entityId;
            } else if (entityType === 'company') {
                customObjectFieldData.companyId = entityId;
            }

            // Insert custom object field data
            let { data: newData, error } = await this.supabase
                .from("customobjectfielddata")
                .insert(customObjectFieldData)
                .select()
                .single();

            if (error) throw error;
            return newData;
        } catch (err) {
            return this.handleError(err);
        }
    }

    async getCustomObjectFieldData(id) {
        try {
            this.log({ level: "info", message: `Fetching custom object field data with id: ${id}`, data: {} });

            let { data: customObjectFieldData, error } = await this.supabase
                .from("customobjectfielddata")
                .select("*, customobjectfields(*)")
                .eq("id", id)
                .is("deletedAt", null)
                .single();

            if (error) {
                this.log({ level: "error", message: "Error fetching custom object field data", data: { error, id } });
                throw error;
            }

            if (!customObjectFieldData) {
                this.log({ level: "error", message: "Custom object field data not found", data: { id } });
                return Promise.reject(new errors.NotFound(`${this.entityName} not found.`));
            }

            this.log({ level: "info", message: "Successfully fetched custom object field data", data: { id } });
            return customObjectFieldData;
        } catch (err) {
            this.log({ level: "error", message: "Exception in getCustomObjectFieldData", data: { err, id } });
            return this.handleError(err);
        }
    }

    async getCustomObjectFieldDataByEntity(entityType, entityId) {
        try {
            const queryBuilder = this.supabase
                .from("customobjectfielddata")
                .select("*, customobjectfields(*)")
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

            let { data: customObjectFieldDataList, error } = await queryBuilder;

            if (error) throw error;
            return customObjectFieldDataList || [];
        } catch (err) {
            return this.handleError(err);
        }
    }

    async updateCustomObjectFieldData(id, updateData) {
        try {
            this.log({ level: "info", message: "Starting updateCustomObjectFieldData", data: { id, updateData } });

            // First try to get the existing data
            let customObjectFieldData;
            try {
                customObjectFieldData = await this.getCustomObjectFieldData(id);
                this.log({ level: "info", message: "Found custom object field data to update", data: { customObjectFieldDataId: customObjectFieldData.id } });
            } catch (err) {
                this.log({ level: "error", message: "Failed to find custom object field data for update", data: { err, id } });
                throw err;
            }

            // Verify custom object field exists
            let customObjectField;
            try {
                // Directly fetch the custom object field from the database
                this.log({ level: "info", message: "Directly fetching custom object field from database", data: { customObjectFieldId: customObjectFieldData.customObjectFieldId } });
                let { data: cofData, error } = await this.supabase
                    .from("customobjectfields")
                    .select("*")
                    .eq("id", customObjectFieldData.customObjectFieldId)
                    .single();

                if (error) {
                    this.log({ level: "error", message: "Error fetching custom object field from database", data: { error } });
                    throw error;
                }

                if (!cofData) {
                    this.log({ level: "error", message: "Custom object field not found in database", data: { customObjectFieldId: customObjectFieldData.customObjectFieldId } });
                    return Promise.reject(new errors.NotFound("Custom object field not found."));
                }

                customObjectField = cofData;
                this.log({ level: "info", message: "Found related custom object field", data: { customObjectFieldId: customObjectField.id } });
            } catch (err) {
                this.log({ level: "error", message: "Failed to find related custom object field", data: { err, customObjectFieldId: customObjectFieldData.customObjectFieldId } });
                throw err;
            }

            // Validate the new data
            if (updateData.data) {
                try {
                    await this.customObjectFieldService.validateCustomObjectFieldValue(customObjectField, updateData.data);
                    this.log({ level: "info", message: "Validated custom object field data", data: { validatedData: updateData.data } });
                } catch (err) {
                    this.log({ level: "error", message: "Data validation failed", data: { err, data: updateData.data } });
                    throw err;
                }
            }

            // Perform the update
            this.log({ level: "info", message: "Updating custom object field data in database", data: { id, ...updateData } });
            let { data: updatedData, error } = await this.supabase
                .from("customobjectfielddata")
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

            this.log({ level: "info", message: "Custom object field data updated successfully", data: { id: updatedData.id } });
            return updatedData;
        } catch (err) {
            this.log({ level: "error", message: "Exception in updateCustomObjectFieldData", data: { err, id } });
            return this.handleError(err);
        }
    }

    async deleteCustomObjectFieldData(id) {
        try {
            const customObjectFieldData = await this.getCustomObjectFieldData(id);

            let { error } = await this.supabase
                .from("customobjectfielddata")
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

    async deleteCustomObjectFieldDataByEntity(entityType, entityId) {
        try {
            const queryBuilder = this.supabase
                .from("customobjectfielddata")
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

    parseFilters({ customObjectFieldId, entityType, entityId, createdFrom, createdTo }) {
        let filters = {};

        if (customObjectFieldId) filters.customObjectFieldId = customObjectFieldId;
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

    async getCustomObjectFieldDataByIds(customObjectFieldIds) {
        try {
            this.log({ level: "info", message: "Fetching custom object field data for multiple IDs", data: { customObjectFieldIds } });

            if (!Array.isArray(customObjectFieldIds) || customObjectFieldIds.length === 0) {
                return Promise.reject(new errors.BadRequest("Valid array of custom object field IDs is required"));
            }

            let { data: customObjectFieldDataList, error } = await this.supabase
                .from("customobjectfielddata")
                .select("*, customobjectfields(*)")
                .in("customObjectFieldId", customObjectFieldIds)
                .is("deletedAt", null);

            if (error) {
                this.log({ level: "error", message: "Error fetching custom object field data by IDs", data: { error, customObjectFieldIds } });
                throw error;
            }

            // Format the results as an array of objects with custom object field data and nested custom object field
            const formattedResults = customObjectFieldDataList?.map(item => {
                // Extract the custom object field object
                const customObjectField = item.customObjectFields;
                delete item.customObjectFields;

                // Return the structured object
                return {
                    ...item,
                    customObjectField
                };
            }) || [];

            this.log({ level: "info", message: "Successfully fetched custom object field data for multiple IDs", data: { count: formattedResults.length } });
            return formattedResults;
        } catch (err) {
            this.log({ level: "error", message: "Exception in getCustomObjectFieldDataByIds", data: { err, customObjectFieldIds } });
            return this.handleError(err);
        }
    }

    async getCustomObjectFieldDataBatch(customObjectFieldIds, entityType, entityId) {
        try {
            this.log({ level: "info", message: "Fetching batch custom object field data with filters", data: { customObjectFieldIds, entityType, entityId } });

            if (!Array.isArray(customObjectFieldIds) || customObjectFieldIds.length === 0) {
                return Promise.reject(new errors.BadRequest("Valid array of custom object field IDs is required"));
            }

            let query = this.supabase
                .from("customobjectfielddata")
                .select("*, customobjectfields(*)")
                .in("customObjectFieldId", customObjectFieldIds)
                .is("deletedAt", null);

            // Apply entity type and ID filters if provided
            if (entityType) {
                query = query.eq("entityType", entityType);

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

            let { data: customObjectFieldDataList, error } = await query;

            if (error) {
                this.log({ level: "error", message: "Error fetching batch custom object field data", data: { error, customObjectFieldIds, entityType, entityId } });
                throw error;
            }

            // Format the results as an array of objects with custom object field data and nested custom object field
            const formattedResults = customObjectFieldDataList?.map(item => {
                // Extract the custom object field object
                const customObjectField = item.customObjectFields;
                delete item.customObjectFields;

                // Return the structured object
                return {
                    ...item,
                    customObjectField
                };
            }) || [];

            this.log({ level: "info", message: "Successfully fetched batch custom object field data", data: { count: formattedResults.length } });
            return formattedResults;
        } catch (err) {
            this.log({ level: "error", message: "Exception in getCustomObjectFieldDataBatch", data: { err, customObjectFieldIds, entityType, entityId } });
            return this.handleError(err);
        }
    }
}

module.exports = CustomObjectFieldDataService; 