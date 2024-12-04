const Handler = require('../../handlers/DemoRequestHandler');


async function activate(app) {
  let handler = new Handler();
  let base_url = '/api/demo-request'

  app.route({
    url: base_url,
    method: 'POST',
    name: "CreateDemoRequest",
    schema: {
      operationId: "CreateDemoRequest",
      tags: ['DemoRequest'],
      summary: 'Create User Demo Request',
      description: 'API to create user permission.',
      body: {
        required: ["email", "name"],
        additionalProperties: false,
        type: 'object',
        properties: {
          email: {
            type: 'string',
            format: 'email'
          },
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
      return handler.createDemoRequest(req, reply);
    }
  });

}

module.exports = {
  activate
};