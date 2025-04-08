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
    url: base_url+ "/login",
    method: 'POST',
    name: "UserLogin",
    schema: {
      operationId: "UserLogin",
      tags: ['Auth'],
      summary: 'User Login',
      description: 'Api for User login.',
      required: ['username', 'password'],
      body: {
        username: {
          type: 'string',
          format: "email",
          minLength: 4,
          description: "User email",
        },
        password: {
          type: 'string',
          minLength: 8,
          description: "User password",
        }
      }
    },
    response: {
      200: {
        type: 'object',
        properties: {
          status: "string",
          message: "string",
          data: {
            type: 'object',
            properties: {
              "id": { type: 'string', format: 'uuid' },
              "role":  { type: 'string', format: 'uuid' },
              "accessToken": {
                type: 'object',
                properties: {
                  "token": { type: 'string', format: 'uuid' },
                  "expiry": { type: 'number', format: 'uuid' },
                  "issuedAt": { type: 'string' }
                }
              },
            }
          }
        }
      },
      400: Error_400_schema
    },
    handler: async (req, reply) => {
      return handler.checkCredentials(req, reply);
    }
  });


  app.route({
    url: base_url + "/logout",
    method: 'post',
    name: "Logout",
    schema: {
      operationId: "Logout",
      tags: ['Auth'],
      summary: 'To logout the user',
      description: 'API to logout the user.',
      required: ["token"],
      body: {
        token: {
          type: 'string',
        }
      }
    },
    handler: async (req, reply) => {
      return handler.logoutUser(req, reply);
    }
  });

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