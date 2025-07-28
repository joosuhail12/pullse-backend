const Handler = require('../../handlers/AuthHandler');

let Error_400_schema = {
  type: 'object',
  properties: {
    statusCode: 'number',
    code: 'string',
    error: 'string',
    message: 'string',
  }
};


async function activate(app) {
  let handler = new Handler();
  let base_url = '/api/auth'


  app.route({
    url: base_url + "/forget-password",
    method: 'PUT',
    name: "ForgetPassword",
    schema: {
      operationId: "ForgetPassword",
      tags: ['Auth'],
      summary: 'Forget Password',
      description: 'API to send reset password email.',
      required: ["email"],
      body: {
        email: {
          type: 'string',
          format: 'email'
        }
      }
    },
    handler: async (req, reply) => {
      return handler.forgetPassword(req, reply);
    }
  });

  app.route({
    url: base_url + "/reset-password",
    method: 'PUT',
    name: "ResetPassword",
    schema: {
      operationId: "ResetPassword",
      tags: ['Auth'],
      summary: 'Reset Password',
      description: 'API to send reset password.',
      required: ["token", "password"],
      body: {
        password: {
          type: 'string',
          minLength: 8,
          description: "New password",
        },
        token: {
          type: 'string',
          minLength: 10,
          description: "Reset token sent on email.",
        }
      }
    },
    handler: async (req, reply) => {
      return handler.resetPassword(req, reply);
    }
  });

  app.route({
    url: base_url + "/check-token",
    method: 'GET',
    name: "CheckToken",
    schema: {
      operationId: "CheckToken",
      tags: ['Authorization'],
      summary: 'Check Token',
      description: 'API to check token.',
      required: ["token"],
    },
    handler: async (req, reply) => {
      return handler.checkToken(req, reply);
    }
  });

}

module.exports = {
  activate
};