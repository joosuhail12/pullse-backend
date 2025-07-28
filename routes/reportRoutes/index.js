const Handler = require('../../handlers/ReportHandler');

const authMiddlewares = require('../../middlewares/auth');
const AuthType = require('../../constants/AuthType');

async function activate(app) {

  let handler = new Handler();

  let base_url = '/api/report'
  app.route({
    url: base_url,
    method: 'POST',
    name: "CreateReport",
    preHandler: authMiddlewares.checkClerkToken(AuthType.user),
    schema: {
      operationId: "CreateReport",
      tags: ['Report'],
      summary: 'Create Report',
      description: 'API to create report.',
      required: ['name', 'workspace_id'],
      body: {
        additionalProperties: false,
        type: 'object',
        properties: {
          name: {
            type: 'string',
            minLength: 2
          },
          description: {
            type: 'string',
          },
        }
      },
      query: {
        workspace_id: {
          type: 'string',
        },
      }
    },
    handler: async (req, reply) => {
      return handler.createReport(req, reply);
    }
  });

  app.route({
    url: base_url,
    method: 'GET',
    name: "ListReports",
    preHandler: authMiddlewares.checkClerkToken(AuthType.user),
    schema: {
      operationId: "ListReports",
      tags: ['Report'],
      summary: 'List Reports',
      description: 'API to list all Reports.',
      required: ['workspace_id'],
      query: {
        name: {
          type: 'string',
          minLength: 2
        },
        workspace_id: {
          type: 'string',
        },
        page: {
          type: 'string',
        },
        skip: {
          type: 'number'
        },
        limit: {
          type: 'number'
        },
        sort_by: {
          type: 'string',
        },
        sort_order: {
          type: 'string',
        }
      }
    },
    handler: async (req, reply) => {
      return handler.listReport(req, reply);
    }
  });

  app.route({
    url: base_url + "/retrieved/:report_id",
    method: 'GET',
    name: "RenderReport",
    preHandler: authMiddlewares.checkClerkToken(AuthType.user),
    schema: {
      operationId: "RenderReport",
      tags: ['Report'],
      summary: 'Render Report Data',
      description: 'API to Render Report Data.',
      required: ['workspace_id'],
      query: {
        workspace_id: {
          type: 'string',
        },
      }
    },
    handler: async (req, reply) => {
      return handler.retrieveReportChartData(req, reply);
    }
  });

  app.route({
    url: base_url + "/:report_id",
    method: 'GET',
    name: "ShowReportDetail",
    preHandler: authMiddlewares.checkClerkToken(AuthType.user),
    schema: {
      operationId: "ShowReportDetail",
      tags: ['Report'],
      summary: 'Show Report Detail',
      description: 'API to show detail of a Report.',
      required: ['workspace_id'],
      query: {
        workspace_id: {
          type: 'string',
        },
      }
    },
    handler: async (req, reply) => {
      return handler.showReportDetail(req, reply);
    }
  });

  app.route({
    url: base_url + "/:report_id",
    method: 'PUT',
    name: "UpdateReport",
    preHandler: authMiddlewares.checkClerkToken(AuthType.user),
    schema: {
      operationId: "UpdateReport",
      tags: ['Report'],
      summary: 'Update Report',
      description: 'API to update a Report.',
      required: ['workspace_id'],
      body: {
        name: {
          type: 'string',
          minLength: 2
        },
        description: {
          type: 'string',
        },
      },
      query: {
        workspace_id: {
          type: 'string',
        },
      }
    },
    handler: async (req, reply) => {
      return handler.updateReport(req, reply);
    }
  });

  app.route({
    url: base_url + "/:report_id",
    method: 'DELETE',
    name: "DeleteReport",
    preHandler: authMiddlewares.checkClerkToken(AuthType.user),
    schema: {
      operationId: "DeleteReport",
      tags: ['Report'],
      summary: 'Delete Report',
      description: 'API to delete a Report.',
      required: ['workspace_id'],
      body: {
      },
      query: {
        workspace_id: {
          type: 'string',
        },
      }
    },
    handler: async (req, reply) => {
      return handler.deleteReport(req, reply);
    }
  });

}

module.exports = {
  activate
};