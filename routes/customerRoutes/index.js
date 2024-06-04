const Handler = require('../../handlers/CustomerHandler');

const authMiddlewares = require('../../middlewares/auth');
const AuthType = require('../../constants/AuthType');

async function activate(app) {

  let handler = new Handler();
  let base_url = '/api/customer'


  app.route({
    url: base_url + "/import",
    method: 'POST',
    name: "ImportCustomer",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      operationId: "ImportCustomer",
      tags: ['Customer'],
      summary: 'Import Customer',
      description: 'API to Import customers using a csv file.',
      body: {
        // required: [],
        additionalProperties: false,
        type: 'object',
        properties: {
        }
      }
    },
    handler: async (req, reply) => {
      return handler.importCustomer(req, reply);
    }
  });

  app.route({
    url: base_url,
    method: 'POST',
    name: "CreateCustomer",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      operationId: "CreateCustomer",
      tags: ['Customer'],
      summary: 'Create Customer',
      description: 'API to create customer.',
      required: [ "email", "workspace_id" ],
      body: {
        additionalProperties: false,
        type: 'object',
        properties: {
          name: {
            type: 'string',
            minLength: 2
          },
          email: {
            type: 'string',
            format: 'email'
          },
          type: {
            type: 'string',
          },
          phone: {
            type: 'string',
            minLength: 10
          },
          phoneCountry: {
            type: 'string',
            minLength: 2
          },
          companyId: {
            type: 'string',
            minLength: 2
          },
        }
      },
      query: {
        workspace_id: {
          type: 'string',
          minLength: 2
        },
      }
    },
    handler: async (req, reply) => {
      return handler.createCustomer(req, reply);
    }
  });

  app.route({
    url: base_url,
    method: 'GET',
    name: "ListCustomers",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      operationId: "ListCustomers",
      tags: ['Customer'],
      summary: 'List Customers',
      description: 'API to list all customers.',
      required: ["workspace_id"],
      query: {
        name: {
          type: 'string',
        },
        email: {
          type: 'string',
          format: 'email'
        },
        customer_type: {
          type: 'string',
        },
        company_id: {
          type: 'string',
        },
        archived: {
          type: "boolean",
          default: false,
          description: "To fetch archived records."
        },
        last_active_from: {
          type: 'string',
        },
        last_active_to: {
          type: 'string',
        },
        workspace_id: {
          type: 'string',
        },
        page: {
          type: 'string',
        },
        skip: {
          type: 'number',
        },
        limit: {
          type: 'number',
        }
      }
    },
    handler: async (req, reply) => {
      return handler.listCustomers(req, reply);
    }
  });

  app.route({
    url: base_url + "/:customer_id",
    method: 'GET',
    name: "ShowCustomerDetail",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      operationId: "ShowCustomerDetail",
      tags: ['Customer'],
      summary: 'Show Customer Detail',
      description: 'API to show detail of a Customer.',
      // required: [],
    },
    handler: async (req, reply) => {
      return handler.showCustomerDetail(req, reply);
    }
  });


  app.route({
    url: base_url + "/profile",
    method: 'GET',
    name: "GetCustomerProfile",
    preHandler: authMiddlewares.checkToken(AuthType.customer),
    schema: {
      operationId: "GetCustomerProfile",
      tags: ['Customer', 'Profile'],
      summary: 'Get Customer Profile',
      description: 'API to fetch Customer Profile.',
      // required: [],
    },
    handler: async (req, reply) => {
      return handler.getCustomerProfile(req, reply);
    }
  });

  app.route({
    url: base_url + "/:customer_id",
    method: 'PUT',
    name: "UpdateCustomer",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      operationId: "UpdateCustomer",
      tags: ['Customer'],
      summary: 'Update Customer',
      description: 'API to update a Customer.',
      body: {
        // required: [],
        additionalProperties: false,
        type: 'object',
        properties: {
          name: {
            type: 'string',
            minLength: 2
          },
          email: {
            type: 'string',
            format: 'email'
          },
          type: {
            type: 'string',
            minLength: 4,
          },
          title: {
            type: 'string',
          },
          workPhone: {
            type: 'string',
          },
          phone: {
            type: 'string',
            minLength: 10
          },
          phoneCountry: {
            type: 'string',
            minLength: 2
          },
          externalId: {
            type: 'string',
          },
          twitter: {
            type: 'string',
          },
          linkedin: {
            type: 'string',
          },
          timezone: {
            type: 'string',
          },
          language: {
            type: 'string',
          },
          address: {
            type: 'string',
          },
          about: {
            type: 'string',
          },
          notes: {
            type: 'string',
          },
          companyId: {
            type: 'string',
          },
          tagIds: {
            type: 'array',
            items: {
              type: 'string',
            }
          },
        }
      },
    },
    handler: async (req, reply) => {
      return handler.updateCustomer(req, reply);
    }
  });

  app.route({
    url: base_url + "/bulk-action",
    method: 'PUT',
    name: "CustomerBulkAction",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      operationId: "CustomerBulkAction",
      tags: ['Customer'],
      summary: 'Bulk Action on Customers',
      description: 'API to bulk action on Customers.',
      body: {
        required: ['action', 'ids'],
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ["archive", "restore", "removeTags", "addTags"]
          },
          ids: {
            type: 'array',
            items: {
              type: 'string',
            }
          },
          tag_ids: {
            type: 'array',
            items: {
              type: 'string',
              description: "ID of Tag."
            },
            description: "Array of Tag Ids."
          }
        }
      },
    },
    handler: async (req, reply) => {
      return handler.bulkAction(req, reply);
    }
  });

  app.route({
    url: base_url+ "/:customer_id",
    method: 'DELETE',
    name: "DeleteCustomer",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      operationId: "DeleteCustomer",
      tags: ['Customer'],
      summary: 'Delete Customer',
      description: 'API to delete a Customer.',
      // required: [],
      body: {
      }
    },
    handler: async (req, reply) => {
      return handler.deleteCustomer(req, reply);
    }
  });

}

module.exports = {
  activate
};