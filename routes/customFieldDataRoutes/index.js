const Handler = require("../../handlers/CustomFieldDataHandler");

const authMiddlewares = require("../../middlewares/auth");
const AuthType = require("../../constants/AuthType");

async function activate(app) {
    let handler = new Handler();

    let base_url = "/api/custom-field-data";

    // Create custom field data
    app.route({
        url: base_url,
        method: "POST",
        name: "CreateCustomFieldData",
        preHandler: authMiddlewares.checkToken(AuthType.user),
        schema: {
            tags: ["CustomFieldData"],
            summary: "Create Custom Field Data",
            description: "API to create custom field data.",
            required: [
                "customfieldId",
                "data",
                "entityType",
                "entityId"
            ],
            body: {
                additionalProperties: false,
                type: "object",
                properties: {
                    customfieldId: {
                        type: "string",
                    },
                    data: {
                        type: "string",
                    },
                    entityType: {
                        type: "string",
                        enum: ["contact", "company", "ticket", "customer"]
                    },
                    entityId: {
                        type: "string",
                    }
                },
            }
        },
        handler: async (req, reply) => {
            return handler.createCustomFieldData(req, reply);
        },
    });

    // List custom field data
    app.route({
        url: base_url,
        method: "GET",
        name: "ListCustomFieldData",
        preHandler: authMiddlewares.checkToken(AuthType.user),
        schema: {
            tags: ["CustomFieldData"],
            summary: "List Custom Field Data",
            description: "API to list all Custom Field Data.",
            query: {
                custom_field_id: {
                    type: "string",
                },
                entity_type: {
                    type: "string",
                    enum: ["contact", "company", "ticket", "customer"]
                },
                entity_id: {
                    type: "string",
                },
                created_from: {
                    type: "string",
                },
                created_to: {
                    type: "string",
                },
                page: {
                    type: "string",
                },
                skip: {
                    type: "number",
                },
                limit: {
                    type: "number",
                },
                sort_by: {
                    type: "string",
                },
                sort_order: {
                    type: "string",
                },
            },
        },
        handler: async (req, reply) => {
            return handler.listCustomFieldData(req, reply);
        },
    });

    // Get custom field data for a specific entity
    app.route({
        url: base_url + "/entity/:entity_type/:entity_id",
        method: "GET",
        name: "GetCustomFieldDataByEntity",
        preHandler: authMiddlewares.checkToken(AuthType.user),
        schema: {
            tags: ["CustomFieldData"],
            summary: "Get Custom Field Data By Entity",
            description: "API to get all custom field data for a specific entity.",
            params: {
                entity_type: {
                    type: "string",
                    enum: ["contact", "company", "ticket"]
                },
                entity_id: {
                    type: "string",
                },
            }
        },
        handler: async (req, reply) => {
            return handler.getCustomFieldDataByEntity(req, reply);
        },
    });

    // Get custom field data detail
    app.route({
        url: base_url + "/:custom_field_data_id",
        method: "GET",
        name: "ShowCustomFieldDataDetail",
        preHandler: authMiddlewares.checkToken(AuthType.user),
        schema: {
            tags: ["CustomFieldData"],
            summary: "Show Custom Field Data Detail",
            description: "API to show detail of a Custom Field Data."
        },
        handler: async (req, reply) => {
            return handler.showCustomFieldDataDetail(req, reply);
        },
    });

    // Update custom field data
    app.route({
        url: base_url + "/:custom_field_data_id",
        method: "PUT",
        name: "UpdateCustomFieldData",
        preHandler: authMiddlewares.checkToken(AuthType.user),
        schema: {
            tags: ["CustomFieldData"],
            summary: "Update Custom Field Data",
            description: "API to update a Custom Field Data.",
            required: ["data"],
            body: {
                additionalProperties: false,
                type: "object",
                properties: {
                    data: {
                        type: "string",
                    },
                    contactId: {
                        type: "string",
                    },
                    companyId: {
                        type: "string",
                    },
                    ticketId: {
                        type: "string",
                    },
                    customfieldId: {
                        type: "string",
                    },
                    entityType: {
                        type: "string",
                    },
                },
            }
        },
        handler: async (req, reply) => {
            return handler.updateCustomFieldData(req, reply);
        },
    });

    // Delete custom field data
    app.route({
        url: base_url + "/:custom_field_data_id",
        method: "DELETE",
        name: "DeleteCustomFieldData",
        preHandler: authMiddlewares.checkToken(AuthType.user),
        schema: {
            tags: ["CustomFieldData"],
            summary: "Delete Custom Field Data",
            description: "API to delete a Custom Field Data."
        },
        handler: async (req, reply) => {
            return handler.deleteCustomFieldData(req, reply);
        },
    });

    // Delete all custom field data for a specific entity
    app.route({
        url: base_url + "/entity/:entity_type/:entity_id",
        method: "DELETE",
        name: "DeleteCustomFieldDataByEntity",
        preHandler: authMiddlewares.checkToken(AuthType.user),
        schema: {
            tags: ["CustomFieldData"],
            summary: "Delete Custom Field Data By Entity",
            description: "API to delete all custom field data for a specific entity.",
            params: {
                entity_type: {
                    type: "string",
                    enum: ["contact", "company", "ticket"]
                },
                entity_id: {
                    type: "string",
                },
            }
        },
        handler: async (req, reply) => {
            return handler.deleteCustomFieldDataByEntity(req, reply);
        },
    });

    // Get custom field data by array of IDs
    app.route({
        url: base_url + "/batch",
        method: "POST",
        name: "GetCustomFieldDataByIds",
        preHandler: authMiddlewares.checkToken(AuthType.user),
        schema: {
            tags: ["CustomFieldData"],
            summary: "Get Custom Field Data By IDs",
            description: "API to get custom field data for an array of IDs",
            required: ["customFieldIds"],
            body: {
                additionalProperties: false,
                type: "object",
                properties: {
                    customFieldIds: {
                        type: "array",
                        items: {
                            type: "string"
                        },
                        minItems: 1
                    }
                }
            }
        },
        handler: async (req, reply) => {
            return handler.getCustomFieldDataByIds(req, reply);
        },
    });
}

module.exports = {
    activate,
}; 