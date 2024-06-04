const Handler = require("../../handlers/CustomFieldHandler");

const authMiddlewares = require("../../middlewares/auth");
const AuthType = require("../../constants/AuthType");

async function activate(app) {
  let handler = new Handler();

  let base_url = "/api/custom-field";
  app.route({
    url: base_url,
    method: "POST",
    name: "CreateCustomField",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      tags: ["CustomField"],
      summary: "Create CustomField",
      description: "API to create customField.",
      required: [
        "name",
        "fieldType",
        "workspace_id",
        "visibleTo",
        "entityType",
      ],
      body: {
        additionalProperties: false,
        type: "object",
        properties: {
          name: {
            type: "string",
            minLength: 2,
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
            items: {
              type: "string",
            },
          },
          isRequired: {
            type: "boolean",
          },
          visibleTo: {
            type: "array",
            items: {
              type: "string",
            },
          },
          entityType: {
            type: "string",
          },
          entityId: {
            type: "string",
          },
        },
      },
      query: {
        workspace_id: {
          type: "string",
        },
      },
    },
    handler: async (req, reply) => {
      return handler.createCustomField(req, reply);
    },
  });

  app.route({
    url: base_url,
    method: "GET",
    name: "ListCustomFields",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      tags: ["CustomField"],
      summary: "List CustomFields",
      description: "API to list all CustomFields.",
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
      return handler.listCustomField(req, reply);
    },
  });

  app.route({
    url: base_url + "/:custom_field_id",
    method: "GET",
    name: "ShowCustomFieldDetail",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      tags: ["CustomField"],
      summary: "Show CustomField Detail",
      description: "API to show detail of a CustomField.",
      required: ["workspace_id"],
      query: {
        workspace_id: {
          type: "string",
        },
      },
    },
    handler: async (req, reply) => {
      return handler.showCustomFieldDetail(req, reply);
    },
  });

  app.route({
    url: base_url + "/:custom_field_id",
    method: "PUT",
    name: "UpdateCustomField",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      tags: ["CustomField"],
      summary: "Update CustomField",
      description: "API to update a CustomField.",
      required: ["workspace_id"],
      body: {
        name: {
          type: "string",
          minLength: 2,
        },
        description: {
          type: "string",
        },
        fieldType: {
          type: "string",
          enum: ["text", "number", "date", "select", "checkbox", "radio", "textarea", "multiselect", "file"]
        },
        placeholder: {
          type: "string",
        },
        defaultValue: {
          type: "string",
        },
        options: {
          type: "array",
          items: {
            type: "string",
          },
        },
        isRequired: {
          type: "boolean",
        },
        visibleTo: {
          type: "array",
          items: {
            type: "string",
          },
        },
        entityType: {
          type: "string",
        },
        entityId: {
          type: "string",
        },
      },
      query: {
        workspace_id: {
          type: "string",
        },
      },
    },
    handler: async (req, reply) => {
      return handler.updateCustomField(req, reply);
    },
  });

  app.route({
    url: base_url + "/:custom_field_id/set-value",
    method: "PATCH",
    name: "SetCustomFieldValue",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      tags: ["CustomField"],
      summary: "Set CustomField Value",
      description: "API to set value of a CustomField.",
      required: ["workspace_id", "entityId", "fieldValue"],
      body: {
        entityId: {
          type: "string",
        },
        fieldValue: {
        },
      },
      query: {
        workspace_id: {
          type: "string",
        },
      },
    },
    handler: async (req, reply) => {
      return handler.setCustomFieldValue(req, reply);
    },
  });

  app.route({
    url: base_url + "/:custom_field_id",
    method: "DELETE",
    name: "DeleteCustomField",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      tags: ["CustomField"],
      summary: "Delete CustomField",
      description: "API to delete a CustomField.",
      required: ["workspace_id"],
      body: {},
      query: {
        workspace_id: {
          type: "string",
        },
      },
    },
    handler: async (req, reply) => {
      return handler.deleteCustomField(req, reply);
    },
  });
}

module.exports = {
  activate,
};
