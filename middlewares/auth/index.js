const _ = require("lodash");

const errors = require("../../errors");
const logger = require("../../logger");

const AuthType = require("../../constants/AuthType");

const ClientService = require("../../services/ClientService");
const AuthService = require("../../services/AuthService");
const CustomerService = require("../../services/CustomerService");
const TagService = require("../../services/TagService");

const Handler = require("../../handlers/BaseHandler");

const config = require("../../config");
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
var _checkRole = (req, roles) => {
  if (!req.authUser || !req.authUser.roleIds) {
    return false;
  }
  for (let role of roles) {
    if (req.authUser.roleIds.includes(role)) {
      return true;
    }
  }
  return false;
};

var _getToken = (req) => {
  let _token = req.headers.authorization || req.headers.Authorization;
  if (!_token) {
    return Promise.reject(new errors.Unauthorized());
  }
  let tokenParts = _token.split(" ");
  if (!tokenParts || tokenParts.length < 2) {
    return Promise.reject(new errors.Unauthorized());
  }
  _token = tokenParts[1];
  if (!_token) {
    _token = req.cookies.customerToken;
  }
  return Promise.resolve(_token);
};

var _getSessionId = (req) => {
  let sessionId;
  if (!sessionId) {
    // sessionId = req.cookies['sessionid'];
    sessionId = req.headers["session-id"];
  }
  return Promise.resolve(sessionId);
};

var _verifyCustomer = async (token, sessionId = null) => {
  let tokenData;
  let userServiceInst = new AuthService();
  let customerServiceInst = new CustomerService(null, { TagService });
  try {
    tokenData = await userServiceInst.verifyJWTToken(token);
    let clientDataStr = new Buffer.from(tokenData.client, "base64").toString();
    let parts = clientDataStr.split(":");
    let workspaceId = parts[0];
    let clientId = parts[1];
    if (!sessionId) {
      return { clientId, workspaceId, email: null };
    }
    let customer = await customerServiceInst.findOne({
      "sessions.id": sessionId,
      workspaceId,
      clientId,
    });
    if (!customer) {
      return Promise.reject(new errors.Unauthorized());
    }
    return customer;
  } catch (err) {
    logger.error("Customer verification failed", err);
    return Promise.reject(new errors.Unauthorized());
  }
};

var _verifyClient = async (tokenString) => {
  let clientData;
  let userServiceInst = new AuthService();
  let customerServiceInst = new CustomerService(null, { TagService });
  try {
    clientData = await userServiceInst.verifyJWTToken(token);
  } catch (err) {
    logger.error("Client verification failed", err);
    return Promise.reject(new errors.Unauthorized());
  }
  // verify clientData ie workspace id
  return clientData;
};
var _verifyUserTokenData = async (token) => {
  let userServiceInst = new AuthService();
  let user = await userServiceInst.aggregate([
    {
      $match: {
        "accessTokens.token": token, // Match the user by the provided token
      },
    },
    {
      $unwind: "$accessTokens", // Unwind the accessTokens array to check each token individually
    },
    {
      $match: {
        "accessTokens.token": token, // Ensure the token matches
        "accessTokens.expiry": { $gt: Date.now() }, // Check if the expiry is greater than the current time (not expired)
      },
    },
    {
      $project: {
        _id: 1,
        accessTokens: 1,
        // Include any other fields you need from the user document
      },
    },
  ]);

  // return userServiceInst
  //   .findOne({ "accessTokens.token": token })
  //   .then((user) => {
  //     if (user?.expiry || user.expiry < Date.now()) {
  //       return Promise.reject(
  //         new errors.Unauthorized("Session expired, please login again.")
  //       );
  //     }
  //     return user;
  //   })
  //   .catch((err) => {
  //     logger.error("User verification failed", err);
  //     return Promise.reject(new errors.Unauthorized());
  //   });
};
const _verifyUser = async (token) => {
  let userServiceInst = new AuthService();

  // Fetch user based on the token
  let { data: session, error: sessionError } = await supabase
      .from('userAccessTokens') // Assuming userSessions table stores access tokens
      .select('user_id, expiry')
      .eq('token', token)
      .single();
  if (sessionError || !session) {
      return Promise.reject(new errors.Unauthorized());
  }

  // Check if session expired
  if (session.expiry < Date.now()) {
      return Promise.reject(new errors.Unauthorized("Session expired, please login again."));
  }

  // Fetch full user details
  let { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, fName, lName, defaultWorkspaceId, clientId')
      .eq('id', session.user_id)
      .single();

  if (userError || !user) {
      return Promise.reject(new errors.Unauthorized());
  }

  // Fetch user role from workspacePermissions
  let { data: permission, error: permissionError } = await supabase
      .from('workspacePermissions')
      .select('role')
      .eq('userId', user.id)
      .eq('workspaceId', user.defaultWorkspaceId)
      .single();

  return {
      ...user,
      role: permission?.role || null, // Add role if available
  };
};


var _verifyService = (token) => {
  if (config.app.static_token != token) {
    return Promise.reject(new errors.Unauthorized("Invalid token."));
  }
  return Promise.resolve({});
};

var _checkToken = async (authUserType, req) => {
  req.authUserType = authUserType;
  let token, sessionId;
  try {
    token = await _getToken(req);
    sessionId = await _getSessionId(req);
    let authUser;
    switch (
      req.authUserType // authUserType is not user role, it's user table name
    ) {
      case AuthType.client:
        let tokenString = new Buffer.from(token, "base64").toString();
        authUser = await _verifyClient(tokenString);
        break;

      case AuthType.user:
        authUser = await _verifyUser(token);
        break;

      case AuthType.service:
        authUser = await _verifyService(token);
        break;

      case AuthType.customer:
        authUser = await _verifyCustomer(token, sessionId);
        authUser.sessionId = sessionId;
        break;

      default:
        logger.error("Unknown user type", authUser);
        return Promise.reject(new errors.Internal("Unknown user type."));
    }
    if (!authUser) {
      return Promise.reject(new errors.Unauthorized());
    }
    return Promise.resolve(authUser);
  } catch (err) {
    logger.error("Error token not found", err);
    return Promise.reject(err);
  }
};

const authMiddlewares = {
  verifyUserToken(token) {
    return _verifyUser(token);
  },

  verifyCustomerToken(token, sessionId) {
    return _verifyCustomer(token, sessionId);
  },

  verifyClientToken(token) {
    return _verifyClient(token);
  },

  checkToken(authUserType = null) {
    return (req, reply, next) => {
      _checkToken(authUserType, req)
        .then((authUser) => {
          req.authUser = authUser;
          next();
        })
        .catch((error) => {
          console.error(error);
          let handler = new Handler();
          return handler.responder(req, reply, Promise.reject(error));
        });
    };
  },

  checkRole(roles) {
    roles = Array.isArray(roles) ? roles : [roles];
    return (req, res, next) => {
      if (!_checkRole(req, roles)) {
        return next(new errors.Unauthorized());
      }
      return next();
    };
  },
};

module.exports = authMiddlewares;
