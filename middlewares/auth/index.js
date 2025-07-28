const errors = require('../../errors');
const { verifyUserToken } = require('../clerkAuth');
const Handler = require('../../handlers/BaseHandler');

function extractToken(req) {
  const header = req.headers.authorization || req.headers.Authorization;
  if (!header) throw new errors.Unauthorized();
  const parts = header.split(' ');
  if (parts.length < 2) throw new errors.Unauthorized();
  return parts[1];
}

const authMiddlewares = {
  verifyUserToken,
  verifyCustomerToken: verifyUserToken,
  verifyClientToken: verifyUserToken,
  checkToken() {
    return async (req, reply, next) => {
      try {
        const token = extractToken(req);
        req.authUser = await verifyUserToken(token);
        next();
      } catch (err) {
        const handler = new Handler();
        return handler.responder(req, reply, Promise.reject(err));
      }
    };
  },
  verifyAuthToken() {
    return async (req, reply, next) => {
      try {
        const token = extractToken(req);
        req.authUser = await verifyUserToken(token);
        next();
      } catch (err) {
        reply.status(401).send({
          statusCode: 401,
          error: 'Unauthorized',
          message: err.message || 'Invalid token'
        });
      }
    };
  },
  checkRole(roles) {
    roles = Array.isArray(roles) ? roles : [roles];
    return (req, res, next) => {
      if (!req.authUser || !roles.includes(req.authUser.role)) {
        return next(new errors.Unauthorized());
      }
      return next();
    };
  }
};

module.exports = authMiddlewares;
