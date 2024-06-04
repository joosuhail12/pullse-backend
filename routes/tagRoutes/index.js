const Handler = require('../../handlers/TagHandler');

const authMiddlewares = require('../../middlewares/auth');
const AuthType = require('../../constants/AuthType');

async function activate(app) {

  let handler = new Handler();

  let base_url = '/api/tag'
  app.route({
    url: base_url,
    method: 'POST',
    name: "CreateTag",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      operationId: "CreateTag",
      tags: ['Tag'],
      summary: 'Create User Tag',
      description: 'API to create user tag.',
      body: {
        required: ['name'],
        additionalProperties: false,
        type: 'object',
        properties: {
          name:  {
            type: 'string',
            minLength: 2
          },
          description:  {
            type: 'string',
          },
        }
      },
    },
    handler: async (req, reply) => {
      return handler.createTag(req, reply);
    }
  });

  app.route({
    url: base_url,
    method: 'GET',
    name: "ListTags",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      operationId: "ListTags",
      tags: ['Tag'],
      summary: 'List Tags',
      description: 'API to list all Tags.',
      required: [],
      query: {
        name: {
          type: 'string',
        },
        archived: {
          type: "boolean",
          default: false,
          description: "To fetch archived records."
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
      return handler.listTag(req, reply);
    }
  });

  app.route({
    url: base_url + "/:tag_id",
    method: 'GET',
    name: "ShowTagDetail",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      operationId: "ShowTagDetail",
      tags: ['Tag'],
      summary: 'Show Tag Detail',
      description: 'API to show detail of a Tag.',
      required: [],
    },
    handler: async (req, reply) => {
      return handler.showTagDetail(req, reply);
    }
  });

  app.route({
    url: base_url + "/:tag_id",
    method: 'PUT',
    name: "UpdateTag",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      operationId: "UpdateTag",
      tags: ['Tag'],
      summary: 'Update Tag',
      description: 'API to update a Tag.',
      required: [],
      body: {
        name:  {
          type: 'string',
          minLength: 2
        },
        description:  {
          type: 'string',
        },
      }
    },
    handler: async (req, reply) => {
      return handler.updateTag(req, reply);
    }
  });

  app.route({
    url: base_url+ "/:tag_id",
    method: 'DELETE',
    name: "DeleteTag",
    preHandler: authMiddlewares.checkToken(AuthType.user),
    schema: {
      operationId: "DeleteTag",
      tags: ['Tag'],
      summary: 'Delete Tag',
      description: 'API to delete a Tag.',
      required: [],
      body: {}
    },
    handler: async (req, reply) => {
      return handler.deleteTag(req, reply);
    }
  });

}

module.exports = {
  activate
};