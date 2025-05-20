const Handler = require("../../handlers/CustomObjectFieldDataHandler");

const authMiddlewares = require("../../middlewares/auth");
const AuthType = require("../../constants/AuthType");

async function activate(app) {
    let handler = new Handler();

    let base_url = "/api/custom-object-field-data";

    // Create custom object field data
    app.route({
        url: base_url,
        method: "POST",
        name: "CreateCustomObjectFieldData",
        preHandler: authMiddlewares.checkToken(AuthType.user),
        schema: {
            tags: ["CustomObjectFieldData"],
            summary: "Create Custom Object Field Data",
            description: "API to create custom object field data.",
            required: [
                "customObjectFieldId",
                "data",
                "entityType",
                "entityId"
            ],
            body: {
                additionalProperties: false,
                type: "object",
                properties: {
                    customObjectFieldId: {
                        type: "string",
                    },
                    data: {
                        type: "string",
                    },
                    entityType: {
                        type: "string",
                        enum: ["contact", "company", "ticket"]
                    },
                    entityId: {
                        type: "string",
                    }
                },
            }
        },
        handler: async (req, reply) => {
            return handler.createCustomObjectFieldData(req, reply);
        },
    });

    // List custom object field data
    app.route({
        url: base_url,
        method: "GET",
        name: "ListCustomObjectFieldData",
        preHandler: authMiddlewares.checkToken(AuthType.user),
        schema: {
            tags: ["CustomObjectFieldData"],
            summary: "List Custom Object Field Data",
            description: "API to list all Custom Object Field Data.",
            query: {
                custom_object_field_id: {
                    type: "string",
                },
                entity_type: {
                    type: "string",
                    enum: ["contact", "company", "ticket"]
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
            return handler.listCustomObjectFieldData(req, reply);
        },
    });

    // Get custom object field data for a specific entity
    app.route({
        url: base_url + "/entity/:entity_type/:entity_id",
        method: "GET",
        name: "GetCustomObjectFieldDataByEntity",
        preHandler: authMiddlewares.checkToken(AuthType.user),
        schema: {
            tags: ["CustomObjectFieldData"],
            summary: "Get Custom Object Field Data By Entity",
            description: "API to get all custom object field data for a specific entity.",
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
            return handler.getCustomObjectFieldDataByEntity(req, reply);
        },
    });

    // Get custom object field data detail
    app.route({
        url: base_url + "/:custom_object_field_data_id",
        method: "GET",
        name: "ShowCustomObjectFieldDataDetail",
        preHandler: authMiddlewares.checkToken(AuthType.user),
        schema: {
            tags: ["CustomObjectFieldData"],
            summary: "Show Custom Object Field Data Detail",
            description: "API to show detail of a Custom Object Field Data."
        },
        handler: async (req, reply) => {
            return handler.showCustomObjectFieldDataDetail(req, reply);
        },
    });

    // Update custom object field data
    app.route({
        url: base_url + "/:custom_object_field_data_id",
        method: "PUT",
        name: "UpdateCustomObjectFieldData",
        preHandler: authMiddlewares.checkToken(AuthType.user),
        schema: {
            tags: ["CustomObjectFieldData"],
            summary: "Update Custom Object Field Data",
            description: "API to update a Custom Object Field Data.",
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
                    customObjectFieldId: {
                        type: "string",
                    },
                    entityType: {
                        type: "string",
                    },
                },
            }
        },
        handler: async (req, reply) => {
            return handler.updateCustomObjectFieldData(req, reply);
        },
    });

    // Delete custom object field data
    app.route({
        url: base_url + "/:custom_object_field_data_id",
        method: "DELETE",
        name: "DeleteCustomObjectFieldData",
        preHandler: authMiddlewares.checkToken(AuthType.user),
        schema: {
            tags: ["CustomObjectFieldData"],
            summary: "Delete Custom Object Field Data",
            description: "API to delete a Custom Object Field Data."
        },
        handler: async (req, reply) => {
            return handler.deleteCustomObjectFieldData(req, reply);
        },
    });

    // Delete all custom object field data for a specific entity
    app.route({
        url: base_url + "/entity/:entity_type/:entity_id",
        method: "DELETE",
        name: "DeleteCustomObjectFieldDataByEntity",
        preHandler: authMiddlewares.checkToken(AuthType.user),
        schema: {
            tags: ["CustomObjectFieldData"],
            summary: "Delete Custom Object Field Data By Entity",
            description: "API to delete all custom object field data for a specific entity.",
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
            return handler.deleteCustomObjectFieldDataByEntity(req, reply);
        },
    });

    // Get custom object field data by array of IDs
    app.route({
        url: base_url + "/batch",
        method: "POST",
        name: "GetCustomObjectFieldDataByIds",
        preHandler: authMiddlewares.checkToken(AuthType.user),
        schema: {
            tags: ["CustomObjectFieldData"],
            summary: "Get Custom Object Field Data By IDs",
            description: "API to get custom object field data for an array of IDs",
            required: ["customObjectFieldIds"],
            body: {
                additionalProperties: false,
                type: "object",
                properties: {
                    customObjectFieldIds: {
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
            return handler.getCustomObjectFieldDataByIds(req, reply);
        },
    });

    // Get custom object field data by array of IDs with filtering
    app.route({
        url: base_url + "/batch/filter",
        method: "POST",
        name: "GetCustomObjectFieldDataBatch",
        preHandler: authMiddlewares.checkToken(AuthType.user),
        schema: {
            tags: ["CustomObjectFieldData"],
            summary: "Get Custom Object Field Data By IDs with Filtering",
            description: "API to get custom object field data for an array of IDs with optional entity type and ID filtering",
            required: ["customObjectFieldIds"],
            body: {
                additionalProperties: false,
                type: "object",
                properties: {
                    customObjectFieldIds: {
                        type: "array",
                        items: {
                            type: "string"
                        },
                        minItems: 1
                    }
                }
            },
            query: {
                entity_type: {
                    type: "string",
                    enum: ["contact", "company", "ticket"],
                    description: "Filter by entity type"
                },
                entity_id: {
                    type: "string",
                    description: "Filter by entity ID (requires entity_type to be set)"
                }
            }
        },
        handler: async (req, reply) => {
            return handler.getCustomObjectFieldDataBatch(req, reply);
        },
    });
}

module.exports = {
    activate,
}; 