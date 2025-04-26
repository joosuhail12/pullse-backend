const Handler = require("../../handlers/CustomerHandler");
const authMiddlewares = require("../../middlewares/auth");
const AuthType = require("../../constants/AuthType");

async function activate(app) {
  let handler = new Handler();
  let base_url = "/api/customer";

  app.route({
    url: base_url + "/import",
    method: "POST",
    name: "ImportCustomer",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      operationId: "ImportCustomer",
      tags: ["Customer"],
      summary: "Import Customer",
      description: "API to Import customers using a csv file.",
      body: {
        additionalProperties: false,
        type: "object",
        properties: {},
      },
    },
    handler: async (req, reply) => {
      return handler.importCustomer(req, reply);
    },
  });

  app.route({
    url: base_url,
    method: "POST",
    name: "CreateCustomer",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      operationId: "CreateCustomer",
      tags: ["Customer"],
      summary: "Create Customer",
      description: "API to create customer.",
      required: ["email", "workspace_id"],
      body: {
        additionalProperties: false,
        type: "object",
        properties: {
          firstname: {
            type: "string",
            minLength: 2,
          },
          lastname: {
            type: "string",
            minLength: 2,
          },
          email: {
            type: "string",
            format: "email",
          },
          type: {
            type: "string",
          },
          phone: {
            type: "string",
            minLength: 10,
          },
          phoneCountry: {
            type: "string",
            minLength: 2,
          },
          companyId: {
            type: "string",
            minLength: 2,
          },
        },
      },
      query: {
        workspace_id: {
          type: "string",
          minLength: 2,
        },
      },
    },
    handler: async (req, reply) => {
      return handler.createCustomer(req, reply);
    },
  });

  app.route({
    url: base_url,
    method: "GET",
    name: "ListCustomers",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      operationId: "ListCustomers",
      tags: ["Customer"],
      summary: "List Customers",
      description: "API to list all customers.",
      required: ["workspace_id"],
      query: {
        firstname: {
          type: "string",
        },
        lastname: {
          type: "string",
        },
        email: {
          type: "string",
          format: "email",
        },
        customer_type: {
          type: "string",
        },
        company_id: {
          type: "string",
        },
        archived: {
          type: "boolean",
          default: false,
          description: "To fetch archived records.",
        },
        last_active_from: {
          type: "string",
        },
        last_active_to: {
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
      },
    },
    handler: async (req, reply) => {
      return handler.listCustomers(req, reply);
    },
  });

  app.route({
    url: base_url + "/visitors",
    method: "GET",
    name: "ListVisitors",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      operationId: "ListVisitors",
      tags: ["Customer"],
      summary: "List Visitors",
      description: "API to list all visitors.",
      required: ["workspace_id"],
      query: {
        firstname: {
          type: "string",
        },
        lastname: {
          type: "string",
        },
        email: {
          type: "string",
          format: "email",
        },
        customer_type: {
          type: "string",
        },
        company_id: {
          type: "string",
        },
        archived: {
          type: "boolean",
          default: false,
          description: "To fetch archived records.",
        },
        last_active_from: {
          type: "string",
        },
        last_active_to: {
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
      },
    },
    handler: async (req, reply) => {
      return handler.listVisitors(req, reply);
    },
  });

  app.route({
    url: base_url + "/customers",
    method: "GET",
    name: "ListCustomers",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      operationId: "ListContacts",
      tags: ["Customer"],
      summary: "List Contacts",
      description: "API to list all contacts.",
      required: ["workspace_id"],
      query: {
        firstname: {
          type: "string",
        },
        lastname: {
          type: "string",
        },
        email: {
          type: "string",
          format: "email",
        },
        customer_type: {
          type: "string",
        },
        company_id: {
          type: "string",
        },
        archived: {
          type: "boolean",
          default: false,
          description: "To fetch archived records.",
        },
        last_active_from: {
          type: "string",
        },
        last_active_to: {
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
      },
    },
    handler: async (req, reply) => {
      return handler.listContacts(req, reply);
    },
  });

  app.route({
    url: base_url + "/:customer_id",
    method: "GET",
    name: "ShowCustomerDetail",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      operationId: "ShowCustomerDetail",
      tags: ["Customer"],
      summary: "Show Customer Detail",
      description: "API to show details of a specific customer.",
      params: {
        type: "object",
        properties: {
          customer_id: { type: "string" },
        },
        required: ["customer_id"],
      },
    },
    handler: async (req, reply) => {
      return handler.showCustomerDetail(req, reply);
    },
  });

  app.route({
    url: base_url + "/:customer_id",
    method: "PUT",
    name: "UpdateCustomer",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      operationId: "UpdateCustomer",
      tags: ["Customer"],
      summary: "Update Customer",
      description: "API to update customer details.",
      params: {
        type: "object",
        properties: {
          customer_id: { type: "string" },
        },
        required: ["customer_id"],
      },
      query: {
        type: "object",
        properties: {
          workspace_id: { type: "string" },
        },
        required: ["workspace_id"],
      },
      body: {
        type: "object",
        additionalProperties: false,
        properties: {
          phone: { type: "string", minLength: 10 },
          firstname: { type: "string", minLength: 2 },
          lastname: { type: "string", minLength: 2 },
          email: { type: "string", format: "email" },
          type: { type: "string" },
          title: { type: "string" },
          companyId: { type: "string" },
          department: { type: "string" },
          timezone: { type: "string" },
          linkedinUrl: { type: "string", format: "uri" },
          twitterUrl: { type: "string", format: "uri" },
          preferredLanguage: { type: "string" },
          source: { type: "string" },
          assignedTo: { type: "string" },
          accountValue: { type: "number" },
          tags: { type: "array", items: { type: "object", properties: { id: { type: "string" }, name: { type: "string" } } } },
          notes: { type: "string" },
          lastContacted: { type: "string", format: "date-time" },
          street: { type: "string" },
          city: { type: "string" },
          state: { type: "string" },
          postalCode: { type: "string" },
          country: { type: "string" },
          address: { type: "string" },
        },
      },
    },
    handler: async (req, reply) => {
      return handler.updateCustomer(req, reply);
    },
  });

  app.route({
    url: base_url + "/:customer_id/related-data",
    method: 'GET',
    name: "GetCustomerRelatedData",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      tags: ['Customer'],
      summary: 'Get Customer Related Tickets',
      description: 'API to get tickets associated with a customer.',
      params: {
        type: 'object',
        properties: {
          customer_id: { type: 'string' }
        },
        required: ['customer_id']
      },
      query: {
        type: 'object',
        properties: {
          workspace_id: { type: 'string' }
        },
        required: ['workspace_id']
      }
    },
    handler: async (req, reply) => handler.getCustomerRelatedData(req, reply)
  });

}

module.exports = {
  activate,
};
