const Handler = require("../../handlers/CustomObjectsHandler");

const authMiddlewares = require("../../middlewares/auth");
const AuthType = require("../../constants/AuthType");

async function activate(app) {
    let handler = new Handler();

    let base_url = "/api/custom-object";

    app.route({
        url: base_url,
        method: "POST",
        name: "CreateCustomObject",
        preHandler: authMiddlewares.checkToken(AuthType.user),
        schema: {
            tags: ["CustomObject"],
            summary: "Create CustomObject",
            description: "API to create Custom Object.",
            required: [
                "name",
                "connectiontype",
            ],
            body: {
                additionalProperties: false,
                type: "object",
                required: [
                    "name",
                    "connectiontype",
                ],
                properties: {
                    name: {
                        type: "string",
                        minLength: 2,
                    },
                    description: {
                        type: "string",
                    },
                    connectiontype: {
                        type: "string",
                    }
                },
            },
            query: {
                workspace_id: {
                    type: "string",
                },
            },
        },
        handler: async (req, reply) => {
            return handler.createCustomObject(req, reply);
        },
    });

    app.route({
        url: base_url,
        method: "GET",
        name: "ListCustomObjects",
        preHandler: authMiddlewares.checkToken(AuthType.user),
        schema: {
            tags: ["CustomObject"],
            summary: "List CustomObjects",
            description: "API to list all CustomObjects.",
            required: ["workspace_id", "entity_type"],
            query: {
                name: {
                    type: "string",
                    minLength: 2,
                },
                field_type: {
                    type: "string",
                },
                entity_type: {
                    type: "string",
                },
                entity_id: {
                    type: "string",
                },
                workspace_id: {
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
            return handler.listCustomObject(req, reply);
        },
    });

    app.route({
        url: base_url + "/:custom_object_id",
        method: "GET",
        name: "ShowCustomObjectDetail",
        preHandler: authMiddlewares.checkToken(AuthType.user),
        schema: {
            tags: ["CustomObject"],
            summary: "Show CustomObject Detail",
            description: "API to show detail of a CustomObject.",
            required: ["workspace_id"],
            query: {
                workspace_id: {
                    type: "string",
                },
            },
        },
        handler: async (req, reply) => {
            return handler.showCustomObjectDetail(req, reply);
        },
    });

    app.route({
        url: base_url + "/:custom_object_id",
        method: "PATCH",
        name: "UpdateCustomObject",
        preHandler: authMiddlewares.checkToken(AuthType.user),
        schema: {
            tags: ["CustomObject"],
            summary: "Update CustomObject",
            description: "API to update a CustomObject.",
            body: {
                type: "object",
                minProperties: 1,
                additionalProperties: false,
                properties: {
                    name: {
                        type: "string",
                        minLength: 2,
                    },
                    description: {
                        type: "string",
                    },
                    connectiontype: {
                        type: "string",
                    },
                    showInCustomerContext: {
                        type: "boolean",
                    },
                    showInCustomerDetail: {
                        type: "boolean",
                    },
                    showInCompanyDetail: {
                        type: "boolean",
                    },
                },
            },
            query: {
                type: "object",
                required: ["workspace_id"],
                properties: {
                    workspace_id: {
                        type: "string",
                    },
                },
            },
            params: {
                type: "object",
                required: ["custom_object_id"],
                properties: {
                    custom_object_id: {
                        type: "string"
                    }
                }
            }
        },
        handler: async (req, reply) => {
            return handler.updateCustomObject(req, reply);
        },
    });

    app.route({
        url: base_url + "/:custom_object_id",
        method: "DELETE",
        name: "DeleteCustomObject",
        preHandler: authMiddlewares.checkToken(AuthType.user),
        schema: {
            tags: ["CustomObject"],
            summary: "Delete CustomObject",
            description: "API to delete a CustomObject.",
            required: ["workspace_id"],
            body: {},
            query: {
                workspace_id: {
                    type: "string",
                },
            },
        },
        handler: async (req, reply) => {
            return handler.deleteCustomObject(req, reply);
        },
    });

    app.route({
        url: base_url + "/:custom_object_id/add-new-field",
        method: "PUT",
        name: "AddNewField",
        preHandler: authMiddlewares.checkToken(AuthType.user),
        schema: {
            tags: ["CustomObject"],
            summary: "Add New Field",
            description: "API to add new field to a CustomObject.",
            body: {
                type: "object",
                required: ["name", "fieldType", "isRequired", "description"],
                additionalProperties: false,
                properties: {
                    name: {
                        type: "string",
                    },
                    description: {
                        type: "string",
                    },
                    fieldType: {
                        type: "string",
                    },
                    placeholder: {
                        type: "string",
                    },
                    defaultValue: {
                        type: "string",
                    },
                    options: {
                        type: "array",
                    },
                    isRequired: {
                        type: "boolean",
                    }
                }
            },
            query: {
                type: "object",
                required: ["workspace_id"],
                properties: {
                    workspace_id: {
                        type: "string",
                    },
                },
            },
        },
        handler: async (req, reply) => {
            return handler.createCustomObjectField(req, reply);
        },
    });

    app.route({
        url: base_url + "/:custom_object_id/update-field",
        method: "PATCH",
        name: "UpdataNewField",
        preHandler: authMiddlewares.checkToken(AuthType.user),
        schema: {
            tags: ["CustomObject"],
            summary: "Update Field",
            description: "API to update a field of a CustomObject.",
            body: {
                type: "object",
                minProperties: 1,
                required: ["fieldId"],
                additionalProperties: false,
                properties: {
                    fieldId: {
                        type: "string",
                    },
                    name: {
                        type: "string",
                    },
                    description: {
                        type: "string",
                    },
                    isRequired: {
                        type: "boolean",
                    }
                }
            },
            query: {
                type: "object",
                required: ["workspace_id"],
                properties: {
                    workspace_id: {
                        type: "string",
                    },
                },
            },
        },
        handler: async (req, reply) => {
            return handler.updateCustomObjectField(req, reply);
        },
    });

    app.route({
        url: base_url + "/:custom_object_id/delete-field",
        method: "DELETE",
        name: "DeleteField",
        preHandler: authMiddlewares.checkToken(AuthType.user),
        schema: {
            tags: ["CustomObject"],
            summary: "Delete Field",
            description: "API to delete a field of a CustomObject.",
            body: {
                type: "object",
                required: ["fieldId"],
                additionalProperties: false,
                properties: {
                    fieldId: {
                        type: "string",
                    },
                },
            },
            query: {
                type: "object",
                required: ["workspace_id"],
                properties: {
                    workspace_id: {
                        type: "string",
                    },
                },
            },
        },
        handler: async (req, reply) => {
            return handler.deleteCustomObjectField(req, reply);
        },
    });

}

module.exports = {
    activate,
};
